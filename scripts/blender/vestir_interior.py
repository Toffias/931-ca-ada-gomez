"""
Viste la unidad del recorrido 360 para que las panorámicas sean hiperrealistas (docs/renders-recorrido.md):
materiales con texturas reales, muebles de Poly Haven, cocina y baño modelados, puertas con marco, zócalos, cortinas
de voile y los detalles que en un render delatan una maqueta si faltan.

Va después de interior_tipo.py, que deja la unidad VESTIR sin los muebles en cajas. La distribución (tabiques,
puertas) sale de ahí; acá sólo se amuebla. Coordenadas en metros como en interior_tipo.py (cuadrante A) y se espejan
para B, C y D.

Uso:
  - Assets una vez:  python scripts/blender/bajar_assets_interior.py   (Poly Haven, CC0, fuera del repo)
  - Blender abierto: Scripting → abrir este archivo → Run Script. Se puede correr las veces que haga falta: borra y
    rehace la colección VESTIDO (dentro de Interiores, así las plantas la cortan como al resto del interior).

Los materiales WEB_* del interior (piso, paredes, cerámico, madera…) se rearman con texturas: mejoran también las
plantas y las tomas de fachada. interior_tipo.py les vuelve a poner el color plano si se corre de nuevo: después
hay que correr este.
"""

import math
import os

import bpy
import bmesh
from mathutils import Matrix, Vector

# ---------------------------------------------------------------- configuración
ASSETS = "C:/Renders/_assets/polyhaven"   # lo que baja bajar_assets_interior.py
UNIDAD_VESTIR = ""                       # "" = la de interior_tipo.py (VESTIR)
VESTIDO = "Vestido"
AQUI = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else ""

# el resto de las medidas sale de interior_tipo.py
it = {"__name__": "interior_tipo"}
exec(open(os.path.join(AQUI, "interior_tipo.py"), encoding="utf-8").read(), it)
E, CENTRO, LOSA, ALTO, DINTEL = it["ESCALA"], it["CENTRO"], it["LOSA"], it["ALTO_LIBRE"], it["DINTEL"]
NX, NY, X_INT, Y_INT = it["NX"], it["NY"], it["X_INT"], it["Y_INT"]
PARED, MEDIANERA, MURO_NUCLEO = it["PARED"], it["MEDIANERA"], it["MURO_NUCLEO"]
XD, XP, XB, YB, YE = it["X_DORMITORIO"], it["X_PASILLO"], it["X_BANO"], it["Y_BANO"], it["Y_ESTAR"]
ESP = 0.015  # espesor del solado (interior_tipo.piso_tipo): los muebles apoyan arriba

# caras de los muros (el tabique va centrado en su línea)
M0 = MEDIANERA           # cara de las medianeras (y = 0 y x = 0)
N_X = NX + MURO_NUCLEO / 2   # cara este del núcleo
N_Y = NY + MURO_NUCLEO / 2   # cara norte del núcleo
T = PARED / 2

# ventanas de la fachada tipo (cuadrante A): (eje, desde, hasta). "x": en la fachada norte, "y": en la este
VENTANAS = [("x", 0.42, 2.09), ("x", 2.89, 4.57), ("x", 5.20, 6.87),
            ("y", 0.73, 2.13), ("y", 2.69, 4.09), ("y", 4.69, 6.09)]

# texturas de Poly Haven: slug, lado real en metros
TEX = {
    "madera_piso": ("wood_floor", 1.7),
    "pared": ("beige_wall_001", 3.0),
    "marmol": ("marble_01", 1.5),
    "roble": ("oak_veneer_02", 1.0),
    "nogal": ("american_walnut_veneer", 1.0),
    "lino": ("rough_linen", 0.27),
    "algodon": ("cotton_jersey", 0.26),
    "boucle": ("wool_boucle", 0.35),
    "alfombra": ("poly_wool_herringbone", 0.27),
}


# ---------------------------------------------------------------- materiales
def ruta_tex(slug, mapa):
    carpeta = os.path.join(ASSETS, "texturas", slug)
    for ext in (".jpg", ".png"):
        r = os.path.join(carpeta, mapa + ext)
        if os.path.exists(r):
            return r
    raise RuntimeError(f"Falta {carpeta}/{mapa}: correr scripts/blender/bajar_assets_interior.py")


def arbol_limpio(nombre):
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    salida = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], salida.inputs["Surface"])
    return m, nt, bsdf


def socket(nodo, nombre, tipo=None, salida=False):
    lista = nodo.outputs if salida else nodo.inputs
    return next(s for s in lista if s.name == nombre and (tipo is None or s.type == tipo))


def pbr(nombre, clave, tinte=None, cuanto_tinte=1.0, rugosidad=(0.0, 1.0), normal=1.0, girar=False, color_fijo=None,
        caja=False, **extra):
    """
    material con color, normal y rugosidad de una textura, en UV en metros (uv_en_metros de interior_tipo.py).
    color_fijo: usa sólo el relieve y la rugosidad de la textura (una pared pintada es de un color parejo).
    caja: proyección de caja en coordenadas del objeto (en metros para los modelos de Poly Haven), con relieve por
    bump: sirve para cambiar la tela de un modelo sin depender de cómo está desplegada su UV
    """
    slug, lado = TEX[clave]
    m, nt, bsdf = arbol_limpio(nombre)
    coords = nt.nodes.new("ShaderNodeTexCoord")
    mapeo = nt.nodes.new("ShaderNodeMapping")
    mapeo.inputs["Scale"].default_value = (1 / lado, 1 / lado, 1)
    if girar:
        mapeo.inputs["Rotation"].default_value[2] = math.pi / 2
    nt.links.new(coords.outputs["Object" if caja else "UV"], mapeo.inputs["Vector"])

    def imagen(mapa, color):
        n = nt.nodes.new("ShaderNodeTexImage")
        if caja:
            n.projection, n.projection_blend = "BOX", 0.3
        n.image = bpy.data.images.load(ruta_tex(slug, mapa), check_existing=True)
        n.image.colorspace_settings.name = "sRGB" if color else "Non-Color"
        n.interpolation = "Cubic" if color else "Linear"
        nt.links.new(mapeo.outputs["Vector"], n.inputs["Vector"])
        return n

    color = imagen("color", True).outputs["Color"] if color_fijo is None else None
    if color is None:
        bsdf.inputs["Base Color"].default_value = (*color_fijo, 1)
    elif tinte is not None:
        mezcla = nt.nodes.new("ShaderNodeMix")
        mezcla.data_type = "RGBA"
        mezcla.blend_type = "MULTIPLY"
        mezcla.inputs["Factor"].default_value = cuanto_tinte
        nt.links.new(color, socket(mezcla, "A", "RGBA"))
        socket(mezcla, "B", "RGBA").default_value = (*tinte, 1)
        color = socket(mezcla, "Result", "RGBA", salida=True)
    if color is not None:
        nt.links.new(color, bsdf.inputs["Base Color"])
    rango = nt.nodes.new("ShaderNodeMapRange")
    rango.inputs["To Min"].default_value, rango.inputs["To Max"].default_value = rugosidad
    rug = imagen("rugosidad", False).outputs["Color"]
    nt.links.new(rug, rango.inputs["Value"])
    nt.links.new(rango.outputs["Result"], bsdf.inputs["Roughness"])
    if caja:
        relieve = nt.nodes.new("ShaderNodeBump")
        relieve.inputs["Strength"].default_value = 0.3 * normal
        relieve.inputs["Distance"].default_value = 0.002
        nt.links.new(rug, relieve.inputs["Height"])
        nt.links.new(relieve.outputs["Normal"], bsdf.inputs["Normal"])
    else:
        mapa_normal = nt.nodes.new("ShaderNodeNormalMap")
        mapa_normal.inputs["Strength"].default_value = normal
        nt.links.new(imagen("normal", False).outputs["Color"], mapa_normal.inputs["Color"])
        nt.links.new(mapa_normal.outputs["Normal"], bsdf.inputs["Normal"])
    for k, v in extra.items():
        bsdf.inputs[k].default_value = v
    m.diffuse_color = (*(color_fijo or tinte or (0.8, 0.8, 0.8)), 1)
    return m


def liso(nombre, color, rugosidad=0.5, **extra):
    m, nt, bsdf = arbol_limpio(nombre)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rugosidad
    for k, v in extra.items():
        bsdf.inputs[k].default_value = v
    m.diffuse_color = (*color, 1)
    return m


def vidrio(nombre, tinte=(0.95, 0.98, 0.97)):
    """vidrio que refracta para la cámara y es transparente para sombras y luz difusa (ver renders_recorrido.py)"""
    m, nt, bsdf = arbol_limpio(nombre)
    salida = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    bsdf.inputs["Base Color"].default_value = (*tinte, 1)
    bsdf.inputs["Roughness"].default_value = 0.0
    bsdf.inputs["Transmission Weight"].default_value = 1.0
    transparente = nt.nodes.new("ShaderNodeBsdfTransparent")
    camino = nt.nodes.new("ShaderNodeLightPath")
    cual = nt.nodes.new("ShaderNodeMath")
    cual.operation = "MAXIMUM"
    nt.links.new(camino.outputs["Is Shadow Ray"], cual.inputs[0])
    nt.links.new(camino.outputs["Is Diffuse Ray"], cual.inputs[1])
    mezcla = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(cual.outputs[0], mezcla.inputs["Fac"])
    nt.links.new(bsdf.outputs[0], mezcla.inputs[1])
    nt.links.new(transparente.outputs[0], mezcla.inputs[2])
    nt.links.new(mezcla.outputs[0], salida.inputs["Surface"])
    return m


def voile(nombre):
    """cortina de voile: deja pasar casi toda la luz, difusa, y se ve blanca contra el ventanal"""
    m, nt, bsdf = arbol_limpio(nombre)
    salida = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    nt.nodes.remove(bsdf)
    tela = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tela.inputs["Color"].default_value = (0.92, 0.91, 0.88, 1)
    difusa = nt.nodes.new("ShaderNodeBsdfDiffuse")
    difusa.inputs["Color"].default_value = (0.9, 0.89, 0.86, 1)
    suma = nt.nodes.new("ShaderNodeMixShader")
    suma.inputs["Fac"].default_value = 0.35
    nt.links.new(tela.outputs[0], suma.inputs[1])
    nt.links.new(difusa.outputs[0], suma.inputs[2])
    transparente = nt.nodes.new("ShaderNodeBsdfTransparent")
    mezcla = nt.nodes.new("ShaderNodeMixShader")
    mezcla.inputs["Fac"].default_value = 0.6  # cuánto tapa
    nt.links.new(transparente.outputs[0], mezcla.inputs[1])
    nt.links.new(suma.outputs[0], mezcla.inputs[2])
    nt.links.new(mezcla.outputs[0], salida.inputs["Surface"])
    m.diffuse_color = (0.92, 0.91, 0.88, 1)
    return m


def pantalla(nombre):
    """pantalla de tela: la luz de adentro la atraviesa y la hace brillar"""
    m, nt, bsdf = arbol_limpio(nombre)
    salida = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    bsdf.inputs["Base Color"].default_value = (0.88, 0.84, 0.76, 1)
    bsdf.inputs["Roughness"].default_value = 0.9
    tras = nt.nodes.new("ShaderNodeBsdfTranslucent")
    tras.inputs["Color"].default_value = (0.95, 0.85, 0.7, 1)
    mezcla = nt.nodes.new("ShaderNodeMixShader")
    mezcla.inputs["Fac"].default_value = 0.5
    nt.links.new(bsdf.outputs[0], mezcla.inputs[1])
    nt.links.new(tras.outputs[0], mezcla.inputs[2])
    nt.links.new(mezcla.outputs[0], salida.inputs["Surface"])
    m.diffuse_color = (0.88, 0.84, 0.76, 1)
    return m


def emisor(nombre, color, fuerza):
    m, nt, bsdf = arbol_limpio(nombre)
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Color"].default_value = (*color, 1)
    bsdf.inputs["Emission Strength"].default_value = fuerza
    m.diffuse_color = (*color, 1)
    return m


def materiales():
    """rearma los materiales del interior (los de interior_tipo.py, por nombre) y crea los de este script (VI_*)"""
    blanco_pared = (0.8, 0.795, 0.78)  # látex blanco: nunca es 1 (en una foto se ve gris claro, no blanco puro)
    mats = {
        # los de interior_tipo.py: cambian en toda la torre
        "WEB_Solado_Madera": pbr("WEB_Solado_Madera", "madera_piso", rugosidad=(0.25, 0.55), normal=0.5),
        "WEB_Pared_Interior": pbr("WEB_Pared_Interior", "pared", color_fijo=blanco_pared, rugosidad=(0.6, 0.85),
                                  normal=0.12),
        "WEB_Cielorraso": liso("WEB_Cielorraso", (0.82, 0.82, 0.81), 0.85),
        "WEB_Solado_Ceramico": pbr("WEB_Solado_Ceramico", "marmol", color_fijo=(0.22, 0.215, 0.21),
                                   rugosidad=(0.1, 0.35), normal=1.4),
        "WEB_Solado_Nucleo": pbr("WEB_Solado_Nucleo", "marmol", tinte=(0.55, 0.55, 0.55), rugosidad=(0.1, 0.35)),
        "WEB_Mueble": liso("WEB_Mueble", (0.85, 0.85, 0.83), 0.35),
        "WEB_Mueble_Madera": pbr("WEB_Mueble_Madera", "roble", rugosidad=(0.35, 0.6), normal=0.3),
        "WEB_Mueble_Tela": pbr("WEB_Mueble_Tela", "algodon", tinte=(0.45, 0.45, 0.43), rugosidad=(0.8, 1.0)),
        "WEB_Textil": pbr("WEB_Textil", "lino", tinte=(0.85, 0.83, 0.79), rugosidad=(0.8, 1.0)),
        "WEB_Sanitario": liso("WEB_Sanitario", (0.9, 0.9, 0.89), 0.05, **{"Coat Weight": 0.6}),
        "WEB_Metal_Cocina": liso("WEB_Metal_Cocina", (0.02, 0.02, 0.022), 0.15),
        "WEB_Vidrio_Interior": vidrio("WEB_Vidrio_Interior"),
        # propios
        "laca": liso("VI_Laca_Blanca", (0.83, 0.83, 0.81), 0.3, **{"Coat Weight": 0.3, "Coat Roughness": 0.15}),
        "laca_gris": liso("VI_Laca_Gris", (0.36, 0.37, 0.37), 0.35, **{"Coat Weight": 0.3}),
        "mesada": liso("VI_Mesada", (0.8, 0.79, 0.76), 0.18, **{"Coat Weight": 0.5, "Coat Roughness": 0.05}),
        "acero": liso("VI_Acero", (0.62, 0.62, 0.62), 0.28, Metallic=1.0),
        "cromo": liso("VI_Cromo", (0.8, 0.8, 0.8), 0.04, Metallic=1.0),
        "negro": liso("VI_Negro_Mate", (0.02, 0.02, 0.02), 0.45, Metallic=0.6),
        "vitro": liso("VI_Vitroceramica", (0.005, 0.005, 0.006), 0.03, **{"Coat Weight": 1.0}),
        "serigrafia": liso("VI_Serigrafia", (0.45, 0.45, 0.45), 0.5),
        # un baño todo blanco y con luz artificial sale sin contraste: paredes gris cálido claro, piso oscuro
        "porcelanato": pbr("VI_Porcelanato", "marmol", color_fijo=(0.7, 0.69, 0.66), rugosidad=(0.04, 0.3),
                           normal=1.6),
        "espejo": liso("VI_Espejo", (0.9, 0.9, 0.9), 0.0, Metallic=1.0),
        "vidrio": vidrio("VI_Vidrio"),
        "voile": voile("VI_Voile"),
        "aluminio": liso("VI_Aluminio", (0.75, 0.75, 0.76), 0.3, Metallic=1.0),
        "nogal": pbr("VI_Nogal", "nogal", rugosidad=(0.3, 0.55), normal=0.3),
        "roble": pbr("VI_Roble", "roble", rugosidad=(0.3, 0.5), normal=0.3),
        "sabana": pbr("VI_Sabana", "algodon", color_fijo=(0.86, 0.85, 0.83), rugosidad=(0.85, 1.0), normal=0.6),
        "acolchado": pbr("VI_Acolchado", "lino", color_fijo=(0.74, 0.71, 0.66), rugosidad=(0.85, 1.0), normal=0.9),
        "manta": pbr("VI_Manta", "boucle", color_fijo=(0.5, 0.45, 0.38), rugosidad=(0.9, 1.0), normal=1.2),
        "luz": emisor("VI_Luz_Encendida", (1.0, 0.86, 0.7), 12.0),
        "tapizado": pbr("VI_Tapizado", "lino", color_fijo=(0.47, 0.45, 0.42), rugosidad=(0.85, 1.0), normal=0.8),
        "alfombra": pbr("VI_Alfombra", "alfombra", tinte=(0.75, 0.73, 0.69), rugosidad=(0.9, 1.0), normal=1.0),
        "libro1": liso("VI_Libro_1", (0.55, 0.22, 0.12), 0.6),
        "libro2": liso("VI_Libro_2", (0.12, 0.2, 0.3), 0.6),
        "libro3": liso("VI_Libro_3", (0.78, 0.72, 0.6), 0.6),
        "pantalla": pantalla("VI_Pantalla_Lampara"),
        "tela_sillon": pbr("VI_Tela_Sillon", "lino", color_fijo=(0.66, 0.63, 0.58), rugosidad=(0.88, 1.0), normal=1.0),
        "terracota": pbr("VI_Tela_Terracota", "lino", color_fijo=(0.5, 0.22, 0.13), rugosidad=(0.85, 1.0), normal=0.9),
        "salvia": pbr("VI_Tela_Salvia", "algodon", color_fijo=(0.36, 0.41, 0.32), rugosidad=(0.85, 1.0), normal=0.9),
        "salvia_modelo": pbr("VI_Tela_Salvia_Modelo", "algodon", color_fijo=(0.36, 0.41, 0.32),
                             rugosidad=(0.85, 1.0), normal=0.9, caja=True),
    }
    return mats


# ---------------------------------------------------------------- geometría
class Pieza:
    """
    acumula cajas (con chaflán) y cilindros en metros del cuadrante A; al crear, se espejan al cuadrante de la unidad
    y se pasan a unidades de Blender sobre el piso terminado
    """

    def __init__(self, nombre):
        self.nombre = nombre
        self.bm = bmesh.new()
        self.mats = []
        self.xf = Matrix.Identity(4)  # lo que se dibuja se mueve con esto (ver en())

    def en(self, x, y, giro=0.0, z=0.0, inclinar=0.0):
        """dibujar en coordenadas propias de un mueble: origen en (x, y, z), girado `giro` grados (el frente de un
        mueble mira a -Y) e inclinado `inclinar` grados hacia atrás. Se usa con `with`"""
        pieza = self

        class Contexto:
            def __enter__(self):
                self.antes = pieza.xf.copy()
                pieza.xf = (pieza.xf @ Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(giro), 4, "Z")
                            @ Matrix.Rotation(math.radians(-inclinar), 4, "X"))

            def __exit__(self, *_):
                pieza.xf = self.antes
        return Contexto()

    def _mat(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def caja(self, x1, y1, x2, y2, z1, z2, mat, chaflan=0.003, segmentos=2):
        x1, x2, y1, y2, z1, z2 = min(x1, x2), max(x1, x2), min(y1, y2), max(y1, y2), min(z1, z2), max(z1, z2)
        tmp = bmesh.new()
        v = [tmp.verts.new((x, y, z)) for z in (z1, z2) for y in (y1, y2) for x in (x1, x2)]
        for cara in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
            tmp.faces.new([v[i] for i in cara])
        bmesh.ops.recalc_face_normals(tmp, faces=tmp.faces)
        minimo = min(x2 - x1, y2 - y1, z2 - z1)
        if chaflan > 0 and minimo > 2.5 * chaflan:
            bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=chaflan, segments=segmentos, profile=0.5,
                            affect="EDGES", clamp_overlap=True)
        self._sumar(tmp, mat)

    def cilindro(self, x, y, z1, z2, r, mat, lados=24, chaflan=0.0):
        tmp = bmesh.new()
        bmesh.ops.create_cone(tmp, cap_ends=True, cap_tris=False, segments=lados, radius1=r, radius2=r,
                              depth=z2 - z1, matrix=Matrix.Translation((x, y, (z1 + z2) / 2)))
        if chaflan:
            bordes = [e for e in tmp.edges if len(e.link_faces) == 2
                      and abs(e.link_faces[0].normal.z - e.link_faces[1].normal.z) > 0.5]
            bmesh.ops.bevel(tmp, geom=bordes, offset=chaflan, segments=2, profile=0.5, affect="EDGES",
                            clamp_overlap=True)
        self._sumar(tmp, mat)

    def tubo(self, a, b, r, mat, lados=16):
        """cilindro entre dos puntos (x, y, z)"""
        a, b = Vector(a), Vector(b)
        d = b - a
        tmp = bmesh.new()
        rot = d.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
        bmesh.ops.create_cone(tmp, cap_ends=True, segments=lados, radius1=r, radius2=r, depth=d.length,
                              matrix=Matrix.Translation((a + b) / 2) @ rot)
        self._sumar(tmp, mat)

    def almohadon(self, ancho, alto, grosor, mat, n=14):
        """almohadón mullido parado en el plano XZ (centro en el origen, espesor en Y): lleno al medio, fino en los
        bordes y con las esquinas un poco hundidas, como uno de verdad"""
        tmp = bmesh.new()
        caras = []
        for lado in (1, -1):
            grilla = []
            for j in range(n + 1):
                fila = []
                for i in range(n + 1):
                    u, v = 2 * i / n - 1, 2 * j / n - 1
                    f = (1 - u ** 4) * (1 - v ** 4)
                    x = u * ancho / 2 * (1 - 0.06 * (1 - v * v))   # los bordes tiran hacia adentro
                    z = v * alto / 2 * (1 - 0.06 * (1 - u * u))
                    fila.append(tmp.verts.new((x, lado * grosor / 2 * f ** 0.6, z)))
                grilla.append(fila)
            for j in range(n):
                for i in range(n):
                    q = (grilla[j][i], grilla[j][i + 1], grilla[j + 1][i + 1], grilla[j + 1][i])
                    caras.append(tmp.faces.new(q if lado > 0 else q[::-1]))
        bmesh.ops.remove_doubles(tmp, verts=tmp.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(tmp, faces=tmp.faces)
        self._sumar(tmp, mat, suave=True)

    def superficie(self, puntos, mat):
        """malla de filas × columnas a partir de una grilla de puntos [[(x, y, z)…]…] (cortinas)"""
        tmp = bmesh.new()
        vs = [[tmp.verts.new(p) for p in fila] for fila in puntos]
        for j in range(len(vs) - 1):
            for i in range(len(vs[j]) - 1):
                tmp.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
        self._sumar(tmp, mat, suave=True)

    def _sumar(self, tmp, mat, suave=False):
        if self.xf != Matrix.Identity(4):
            bmesh.ops.transform(tmp, matrix=self.xf, verts=tmp.verts)
        idx = self._mat(mat)
        for f in tmp.faces:
            f.material_index = idx
            f.smooth = suave
        malla = bpy.data.meshes.new("_tmp")
        tmp.to_mesh(malla)
        tmp.free()
        self.bm.from_mesh(malla)
        bpy.data.meshes.remove(malla)

    def crear(self, coleccion, unidad):
        letra, z_piso = unidad
        sx, sy = it["CUADRANTES"][letra]
        it["uv_en_metros"](self.bm)
        m = (Matrix.Translation((CENTRO[0], CENTRO[1], z_piso)) @ Matrix.Scale(1 / E, 4)
             @ Matrix.Diagonal((sx, sy, 1, 1)) @ Matrix.Translation((0, 0, ESP)))
        self.bm.transform(m)
        if sx * sy < 0:
            bmesh.ops.reverse_faces(self.bm, faces=self.bm.faces)
        malla = bpy.data.meshes.new(self.nombre)
        self.bm.to_mesh(malla)
        self.bm.free()
        for mat in self.mats:
            malla.materials.append(mat)
        o = bpy.data.objects.new(self.nombre, malla)
        o["vestido"] = True
        coleccion.objects.link(o)
        return o


# ---------------------------------------------------------------- modelos de Poly Haven
_cargados = {}


def modelo(slug, coleccion, unidad, x, y, giro=0.0, z=0.0, escala=1.0):
    """
    agrega un modelo de Poly Haven (en metros, el frente hacia -Y) en (x, y) del cuadrante A, girado `giro` grados.
    La primera vez se carga del .blend; las siguientes comparten las mallas (como Alt+D)
    """
    if slug not in _cargados:
        carpeta = os.path.join(ASSETS, "modelos", slug)
        archivo = next((os.path.join(carpeta, f) for f in os.listdir(carpeta) if f.endswith(".blend")), None)
        if not archivo:
            raise RuntimeError(f"Falta el modelo {slug}: correr scripts/blender/bajar_assets_interior.py")
        with bpy.data.libraries.load(archivo, link=False) as (src, dst):
            dst.objects = [n for n in src.objects]
        objs = [o for o in dst.objects if o and o.type in ("MESH", "EMPTY")]
        # las texturas vienen con ruta relativa al .blend de Poly Haven (Blender la reescribe según dónde esté el
        # archivo abierto): se apuntan a mano a la carpeta del modelo, por nombre
        for o in objs:
            if o.type != "MESH":
                continue
            for mat in o.data.materials:
                if mat and mat.node_tree:
                    for n in mat.node_tree.nodes:
                        if n.type == "TEX_IMAGE" and n.image and n.image.source == "FILE":
                            buena = os.path.join(carpeta, "textures", os.path.basename(n.image.filepath))
                            if os.path.exists(buena):
                                n.image.filepath = buena
                                n.image.reload()
        _cargados[slug] = [(o, o.matrix_world.copy()) for o in objs]
        primera = True
    else:
        primera = False
    letra, z_piso = unidad
    sx, sy = it["CUADRANTES"][letra]
    m = (Matrix.Translation((CENTRO[0], CENTRO[1], z_piso)) @ Matrix.Scale(1 / E, 4) @ Matrix.Diagonal((sx, sy, 1, 1))
         @ Matrix.Translation((x, y, ESP + z)) @ Matrix.Rotation(math.radians(giro), 4, "Z") @ Matrix.Scale(escala, 4))
    nuevos = []
    for o, base in _cargados[slug]:
        copia = o if primera else o.copy()
        copia.matrix_world = m @ base
        copia["vestido"] = True
        for c in list(copia.users_collection):
            c.objects.unlink(copia)
        coleccion.objects.link(copia)
        nuevos.append(copia)
    return nuevos


# ---------------------------------------------------------------- partes de la unidad
def puerta(p, mats, eje, c, a, b, espesor, bisagra, lado, corrediza=False, cerrada=False):
    """
    marco (jambas y cabezal) en el vano (a, b) del muro de eje `eje` ("x": muro vertical en x = c; "y": horizontal
    en y = c) y la hoja abierta 90° hacia `lado` (+1/-1), colgada del lado `bisagra` ("a" o "b").
    corrediza: la hoja corre por la cara `lado` del muro y queda abierta del lado `bisagra` (en un baño chico una
    hoja abierta hacia adentro lo parte al medio)
    """
    ancho_marco, sobre = 0.06, 0.012
    e1, e2 = c - espesor / 2 - sobre, c + espesor / 2 + sobre

    def caja(u1, u2, w1, w2, z1, z2, mat, chaflan=0.002):
        if eje == "x":
            p.caja(w1, u1, w2, u2, z1, z2, mat, chaflan)
        else:
            p.caja(u1, w1, u2, w2, z1, z2, mat, chaflan)

    caja(a - ancho_marco, a + 0.015, e1, e2, 0, DINTEL + ancho_marco, mats["laca"])
    caja(b - 0.015, b + ancho_marco, e1, e2, 0, DINTEL + ancho_marco, mats["laca"])
    caja(a - ancho_marco, b + ancho_marco, e1, e2, DINTEL - 0.01, DINTEL + ancho_marco, mats["laca"])
    if cerrada:
        # hoja en el plano del muro, al ras de la cara del lado `lado`, con picaporte del lado opuesto a la bisagra
        w1, w2 = sorted((c + lado * (espesor / 2 - 0.045), c + lado * (espesor / 2 - 0.005)))
        caja(a + 0.018, b - 0.018, w1, w2, 0.008, DINTEL - 0.012, mats["laca"], 0.003)
        up = b - 0.09 if bisagra == "a" else a + 0.09
        for w, sale in ((w2, 0.05), (w1, -0.05)):
            caja(up - 0.012, up + 0.012, min(w, w + sale), max(w, w + sale), 0.97, 1.03, mats["acero"], 0.003)
            ul = (up - 0.13, up) if bisagra == "a" else (up, up + 0.13)
            caja(ul[0], ul[1], min(w + sale * 0.7, w + sale), max(w + sale * 0.7, w + sale), 0.99, 1.01, mats["acero"],
                 0.003)
        return
    if corrediza:
        ancho = b - a + 0.04
        w1, w2 = sorted((c + lado * (espesor / 2 + 0.015), c + lado * (espesor / 2 + 0.055)))
        u1 = b - 0.1 if bisagra == "b" else a - ancho + 0.1
        caja(u1, u1 + ancho, w1, w2, 0.008, DINTEL + 0.02, mats["laca"], 0.003)
        wr1, wr2 = sorted((c + lado * (espesor / 2), c + lado * (espesor / 2 + 0.07)))
        caja(min(a, u1) - 0.05, max(b, u1 + ancho) + 0.05, wr1, wr2, DINTEL + 0.02, DINTEL + 0.1, mats["laca"], 0.003)
        # tirador embutido del lado del vano
        ut = u1 + 0.06 if bisagra == "b" else u1 + ancho - 0.08
        for w in (w1 - 0.003, w2):
            caja(ut, ut + 0.02, w, w + 0.003, 0.9, 1.1, mats["acero"], 0.001)
        return
    # hoja abierta: perpendicular al muro, a partir de la bisagra
    hoja = b - a - 0.03
    u = a + 0.015 if bisagra == "a" else b - 0.015
    w0 = c + lado * (espesor / 2)
    w1, w2 = sorted((w0, w0 + lado * hoja))
    g = 0.04  # espesor de la hoja
    uu = (u, u + g) if bisagra == "a" else (u - g, u)
    caja(uu[0], uu[1], w1, w2, 0.008, DINTEL - 0.012, mats["laca"], 0.003)
    # picaporte de palanca a 1 m en las dos caras, cerca del borde libre, apuntando hacia la bisagra
    wp = w0 + lado * (hoja - 0.07)
    for cara in (uu[0] - 0.05, uu[1]):
        caja(cara, cara + 0.05, min(wp, wp - lado * 0.012), max(wp, wp - lado * 0.012), 0.97, 1.03, mats["acero"],
             0.003)
        caja(cara if cara < uu[0] else cara + 0.035, cara + 0.015 if cara < uu[0] else cara + 0.05,
             min(wp, wp - lado * 0.13), max(wp, wp - lado * 0.13), 0.99, 1.01, mats["acero"], 0.003)


def zocalos(p, mats):
    """zócalo de 7 cm en todas las caras de muro de la unidad (tabiques, medianeras, núcleo y fachada)"""
    h, g = 0.07, 0.012
    for m in it["UNIDAD"]["muros"]:
        for x1, y1, x2, y2, z1, z2 in it["piezas_muro"](m, ALTO):
            if z1 > 0:
                continue  # dintel
            if x2 - x1 > y2 - y1:
                p.caja(x1, y1 - g, x2, y1, 0, h, mats["laca"], 0.002)
                p.caja(x1, y2, x2, y2 + g, 0, h, mats["laca"], 0.002)
            else:
                p.caja(x1 - g, y1, x1, y2, 0, h, mats["laca"], 0.002)
                p.caja(x2, y1, x2 + g, y2, 0, h, mats["laca"], 0.002)
    # núcleo hacia el estar (con la puerta de entrada) y hacia el dormitorio 2 y el pasillo
    p.caja(N_X, 0.85, N_X + g, N_Y, 0, h, mats["laca"], 0.002)
    p.caja(M0, N_Y, XD - T, N_Y + g, 0, h, mats["laca"], 0.002)
    # fachada (el antepecho de las ventanas también lleva)
    p.caja(X_INT - g, M0, X_INT, Y_INT, 0, h, mats["laca"], 0.002)
    p.caja(M0, Y_INT - g, X_INT, Y_INT, 0, h, mats["laca"], 0.002)


def cortinas(p, mats):
    """voile a los costados de cada ventana (recogido, deja ver afuera) con su riel de aluminio en el cielorraso"""
    sep, amplitud, onda, lado = 0.13, 0.06, 0.15, 0.5
    for eje, a, b in VENTANAS:
        for u0, u1 in ((a - 0.15, a - 0.15 + lado), (b + 0.15 - lado, b + 0.15)):
            n = max(8, int((u1 - u0) / onda * 8))
            filas = []
            alturas = [0.02 + (ALTO - 0.07) * k / 24 for k in range(25)]
            for z in alturas:
                fila = []
                for i in range(n + 1):
                    u = u0 + (u1 - u0) * i / n
                    w = sep + amplitud * math.sin(2 * math.pi * (u - u0) / onda)
                    fila.append((X_INT - w, u, z) if eje == "y" else (u, Y_INT - w, z))
                filas.append(fila)
            p.superficie(filas, mats["voile"])
        if eje == "y":
            p.caja(X_INT - sep - 0.015, a - 0.2, X_INT - sep + 0.015, b + 0.2, ALTO - 0.03, ALTO, mats["aluminio"],
                   0.002)
        else:
            p.caja(a - 0.2, Y_INT - sep - 0.015, b + 0.2, Y_INT - sep + 0.015, ALTO - 0.03, ALTO, mats["aluminio"],
                   0.002)


def cocina(p, mats):
    y0 = M0                      # cara de la medianera
    # heladera de acero, dos puertas, junto a la entrada
    p.caja(3.62, y0, 4.23, y0 + 0.64, 0.0, 1.24, mats["acero"], 0.008)
    p.caja(3.62, y0, 4.23, y0 + 0.64, 1.25, 2.0, mats["acero"], 0.008)
    for z1, z2 in ((0.75, 1.15), (1.35, 1.75)):
        p.caja(4.16, y0 + 0.64, 4.18, y0 + 0.67, z1, z2, mats["acero"], 0.004)
    # bajo mesada: zócalo retirado, módulos laqueados con luz de 3 mm y tiradores de barra
    x0, x1, prof = 4.25, 6.2, 0.58
    p.caja(x0, y0, x1, y0 + prof - 0.06, 0, 0.1, mats["negro"], 0.001)
    frentes = [(4.25, 4.9), (4.9, 5.55), (5.55, 6.2)]
    for a, b in frentes:
        p.caja(a + 0.0015, y0 + prof - 0.02, b - 0.0015, y0 + prof, 0.1, 0.868, mats["laca_gris"], 0.002)
        p.caja((a + b) / 2 - 0.16, y0 + prof + 0.012, (a + b) / 2 + 0.16, y0 + prof + 0.024, 0.8, 0.812, mats["acero"])
        p.caja((a + b) / 2 - 0.14, y0 + prof, (a + b) / 2 - 0.13, y0 + prof + 0.012, 0.8, 0.812, mats["acero"], 0)
        p.caja((a + b) / 2 + 0.13, y0 + prof, (a + b) / 2 + 0.14, y0 + prof + 0.012, 0.8, 0.812, mats["acero"], 0)
    p.caja(x0, y0, x1, y0 + prof - 0.02, 0.1, 0.868, mats["laca_gris"], 0.001)
    # mesada de 3 cm con el hueco de la bacha
    zt, zm = 0.87, 0.9
    b1, b2, c1, c2 = 4.5, 5.0, y0 + 0.1, y0 + 0.5
    p.caja(x0, y0, b1, y0 + 0.62, zt, zm, mats["mesada"], 0.004)
    p.caja(b2, y0, x1, y0 + 0.62, zt, zm, mats["mesada"], 0.004)
    p.caja(b1, y0, b2, c1, zt, zm, mats["mesada"], 0.002)
    p.caja(b1, c2, b2, y0 + 0.62, zt, zm, mats["mesada"], 0.002)
    # bacha de acero bajo mesada
    p.caja(b1 + 0.005, c1 + 0.005, b2 - 0.005, c2 - 0.005, 0.7, 0.705, mats["acero"], 0.002)
    for u1, v1, u2, v2 in ((b1, c1, b2, c1 + 0.005), (b1, c2 - 0.005, b2, c2), (b1, c1, b1 + 0.005, c2),
                           (b2 - 0.005, c1, b2, c2)):
        p.caja(u1, v1, u2, v2, 0.7, zt, mats["acero"], 0.001)
    p.cilindro((b1 + b2) / 2, (c1 + c2) / 2, 0.705, 0.708, 0.03, mats["acero"])
    # grifería monocomando con pico alto
    gx, gy = (b1 + b2) / 2, y0 + 0.06
    p.cilindro(gx, gy, zm, zm + 0.03, 0.028, mats["cromo"], chaflan=0.004)
    p.tubo((gx, gy, zm + 0.02), (gx, gy, zm + 0.34), 0.014, mats["cromo"])
    p.tubo((gx, gy, zm + 0.34), (gx, gy + 0.2, zm + 0.34), 0.012, mats["cromo"])
    p.tubo((gx, gy + 0.2, zm + 0.34), (gx, gy + 0.2, zm + 0.28), 0.012, mats["cromo"])
    p.caja(gx + 0.02, gy - 0.01, gx + 0.1, gy + 0.01, zm + 0.1, zm + 0.115, mats["cromo"], 0.004)
    # anafe vitrocerámico al ras
    p.caja(5.45, y0 + 0.07, 6.03, y0 + 0.57, zm, zm + 0.006, mats["vitro"], 0.003)
    # serigrafía de las hornallas: sin ella el vidrio negro refleja las alacenas y se lee como acero
    for hx, hy, hr in ((5.6, y0 + 0.2, 0.09), (5.88, y0 + 0.2, 0.07), (5.6, y0 + 0.44, 0.07), (5.88, y0 + 0.44, 0.09)):
        tmp = bmesh.new()
        bmesh.ops.create_circle(tmp, cap_ends=False, segments=48, radius=hr,
                                matrix=Matrix.Translation((hx, hy, zm + 0.0062)))
        borde = bmesh.ops.extrude_edge_only(tmp, edges=tmp.edges[:])
        adentro = [e for e in borde["geom"] if isinstance(e, bmesh.types.BMVert)]
        k = 1 - 0.012 / hr  # anillo de 12 mm
        bmesh.ops.scale(tmp, vec=(k, k, 1), space=Matrix.Translation((-hx, -hy, 0)), verts=adentro)
        p._sumar(tmp, mats["serigrafia"])
    # revestimiento entre mesada y alacenas
    p.caja(x0, y0, x1, y0 + 0.01, zm, 1.45, mats["porcelanato"], 0.001)
    # alacenas con campana integrada sobre el anafe
    p.caja(x0, y0, x1, y0 + 0.33, 1.45, 2.25, mats["laca"], 0.001)
    for a, b in ((4.25, 4.74), (4.74, 5.22), (5.22, 5.71), (5.71, 6.2)):
        p.caja(a + 0.0015, y0 + 0.33, b - 0.0015, y0 + 0.35, 1.45, 2.25, mats["laca"], 0.002)
    p.caja(5.45, y0 + 0.02, 6.03, y0 + 0.36, 1.43, 1.45, mats["acero"], 0.002)


def bano(p, mats):
    x1, x2, y1, y2 = XP + T, XB - T, NY + T, YB - T
    # revestimiento de porcelanato hasta el cielorraso (el vano de la puerta queda libre)
    g = 0.01
    p.caja(x1, y1, x2, y1 + g, 0, ALTO, mats["porcelanato"], 0.001)
    p.caja(x1, y2 - g, x2, y2, 0, ALTO, mats["porcelanato"], 0.001)
    p.caja(x2 - g, y1, x2, y2, 0, ALTO, mats["porcelanato"], 0.001)
    p.caja(x1, y1, x1 + g, 3.6, 0, ALTO, mats["porcelanato"], 0.001)
    p.caja(x1, 4.3, x1 + g, y2, 0, ALTO, mats["porcelanato"], 0.001)
    p.caja(x1, 3.6, x1 + g, 4.3, DINTEL + 0.06, ALTO, mats["porcelanato"], 0.001)
    # vanitory suspendido de nogal con bacha de apoyo y espejo
    yv = y1 + g
    p.caja(3.7, yv, 4.5, yv + 0.45, 0.45, 0.82, mats["nogal"], 0.004)
    p.caja(3.7, yv, 4.5, yv + 0.47, 0.82, 0.85, mats["mesada"], 0.003)
    p.caja(3.88, yv + 0.08, 4.32, yv + 0.4, 0.85, 0.97, mats["WEB_Sanitario"], 0.05, 4)
    p.caja(3.92, yv + 0.12, 4.28, yv + 0.36, 0.9, 0.972, mats["WEB_Sanitario"], 0.03, 3)
    p.cilindro(4.1, yv + 0.04, 0.85, 0.87, 0.025, mats["cromo"])
    p.tubo((4.1, yv + 0.04, 0.86), (4.1, yv + 0.04, 1.12), 0.012, mats["cromo"])
    p.tubo((4.1, yv + 0.04, 1.12), (4.1, yv + 0.18, 1.12), 0.011, mats["cromo"])
    p.caja(3.7, yv, 4.5, yv + 0.006, 1.02, 1.82, mats["espejo"], 0.002)
    p.caja(3.69, yv - 0.001, 4.51, yv + 0.004, 1.01, 1.83, mats["negro"], 0.002)
    # inodoro suspendido y pulsador
    p.caja(3.47, y2 - 0.55, 3.83, y2 - g, 0.2, 0.42, mats["WEB_Sanitario"], 0.07, 4)
    p.caja(3.48, y2 - 0.54, 3.82, y2 - 0.06, 0.42, 0.44, mats["WEB_Sanitario"], 0.015, 3)
    p.caja(3.57, y2 - g - 0.008, 3.73, y2 - g, 1.0, 1.12, mats["cromo"], 0.004)
    # ducha: plato, mampara fija, flor y monocomando
    p.caja(3.99, 4.1, x2 - g, y2 - g, 0, 0.03, mats["WEB_Sanitario"], 0.006)
    p.caja(3.99, 4.075, 4.52, 4.085, 0.03, 2.0, mats["vidrio"], 0.002)
    p.caja(3.99, 4.07, 4.0, 4.09, 0.03, 2.0, mats["cromo"], 0.001)
    p.tubo((4.42, y2 - g, 2.1), (4.42, y2 - 0.3, 2.1), 0.01, mats["cromo"])
    p.cilindro(4.42, y2 - 0.35, 2.08, 2.095, 0.11, mats["cromo"], 32)
    p.cilindro(x2 - g - 0.01, 4.55, 1.05, 1.15, 0.04, mats["cromo"])
    # toallero con toalla
    p.caja(x2 - g - 0.06, 3.35, x2 - g - 0.02, 3.95, 1.25, 1.27, mats["cromo"], 0.005)
    p.caja(x2 - g - 0.075, 3.4, x2 - g - 0.005, 3.9, 0.75, 1.27, mats["sabana"], 0.02, 3)


def dormitorios(p, mats, coleccion, unidad):
    # dormitorio 2: placard de tres hojas, cama de una plaza bajo la ventana, escritorio contra el tabique
    x1, y1 = M0, N_Y
    p.caja(x1, y1, 1.65, y1 + 0.6, 0, 2.3, mats["laca"], 0.001)  # hasta 1,65: al lado abre la puerta
    for a, b in ((x1, 0.68), (0.68, 1.165), (1.165, 1.65)):
        p.caja(a + 0.0015, y1 + 0.6, b - 0.0015, y1 + 0.62, 0.005, 2.3, mats["laca"], 0.002)
        p.caja(b - 0.05, y1 + 0.62, b - 0.04, y1 + 0.64, 0.95, 1.35, mats["acero"], 0.002)
    cama(p, mats, x1, 5.75, x1 + 1.95, 6.65, respaldo="x1")
    p.caja(XD - T - 0.55, 4.35, XD - T, 5.45, 0.72, 0.75, mats["roble"], 0.003)
    for yy in (4.4, 5.4):
        p.caja(XD - T - 0.53, yy - 0.02, XD - T - 0.49, yy + 0.02, 0, 0.72, mats["negro"], 0.002)
        p.caja(XD - T - 0.06, yy - 0.02, XD - T - 0.02, yy + 0.02, 0, 0.72, mats["negro"], 0.002)
    mesa_de_luz(p, mats, 0.47, 5.45)
    libros(p, mats, XD - T - 0.45, 4.5, 0.75)
    # principal: respaldo tapizado, cama de dos plazas, mesas de luz con lámparas, placard
    cama(p, mats, 5.4, YE + T, 7.0, YE + T + 1.95, respaldo="y1", doble=True)
    for xx in (5.14, 7.26):
        mesa_de_luz(p, mats, xx, YE + T + 0.21)
    modelo("hanging_picture_frame_01", coleccion, unidad, 6.2, YE + T, 180, z=1.62)
    x2 = XB - T
    p.caja(XP + 0.05, YB + T, x2, YB + T + 0.6, 0, 2.3, mats["laca"], 0.001)
    for a, b in ((XP + 0.05, 3.85), (3.85, 4.35), (4.35, x2)):
        p.caja(a + 0.0015, YB + T + 0.6, b - 0.0015, YB + T + 0.62, 0.005, 2.3, mats["laca"], 0.002)
        p.caja(b - 0.05, YB + T + 0.62, b - 0.04, YB + T + 0.64, 0.95, 1.35, mats["acero"], 0.002)


def cama(p, mats, x1, y1, x2, y2, respaldo, doble=False):
    """base tapizada, colchón, sábana, acolchado caído a los costados, almohadas y manta a los pies"""
    alto_base = 0.3
    if respaldo == "y1":   # cabecera contra el muro en y1
        p.caja(x1 - 0.05, y1, x2 + 0.05, y1 + 0.08, 0.0, 1.1, mats["tapizado"], 0.03, 3)
        y1 += 0.08
    else:                  # cabecera contra el muro en x1
        p.caja(x1, y1 - 0.08, x1 + 0.08, y2 + 0.08, 0.0, 0.95, mats["tapizado"], 0.03, 3)
        x1 += 0.08
    p.caja(x1, y1, x2, y2, 0.05, alto_base, mats["tapizado"], 0.02, 3)
    p.caja(x1 + 0.01, y1 + 0.01, x2 - 0.01, y2 - 0.01, alto_base, alto_base + 0.22, mats["sabana"], 0.05, 4)
    # acolchado: cubre desde el 30 % del largo hasta los pies y cae 20 cm por los costados
    if respaldo == "y1":
        a1, a2 = y1 + (y2 - y1) * 0.28, y2 + 0.03
        p.caja(x1 - 0.03, a1, x2 + 0.03, a2, alto_base + 0.02, alto_base + 0.27, mats["acolchado"], 0.07, 5)
        p.caja(x1 - 0.02, y2 - 0.45, x2 + 0.02, y2 + 0.04, alto_base + 0.25, alto_base + 0.29, mats["manta"], 0.02, 3)
        n = 2 if doble else 1
        ancho = (x2 - x1 - 0.1) / n
        for i in range(n):
            a = x1 + 0.05 + i * ancho
            with p.en(a + ancho / 2, y1 + 0.12, 0, alto_base + 0.5, inclinar=-18):
                p.almohadon(ancho - 0.06, 0.5, 0.18, mats["sabana"])
            with p.en(a + ancho / 2, y1 + 0.34, 0, alto_base + 0.4, inclinar=-60):
                p.almohadon(ancho - 0.16, 0.36, 0.14, mats["sabana"])
    else:
        a1, a2 = x1 + (x2 - x1) * 0.28, x2 + 0.03
        p.caja(a1, y1 - 0.03, a2, y2 + 0.03, alto_base + 0.02, alto_base + 0.27, mats["acolchado"], 0.07, 5)
        p.caja(x2 - 0.4, y1 - 0.02, x2 + 0.04, y2 + 0.02, alto_base + 0.25, alto_base + 0.29, mats["manta"], 0.02, 3)
        with p.en(x1 + 0.12, (y1 + y2) / 2, -90, alto_base + 0.48, inclinar=-18):
            p.almohadon(y2 - y1 - 0.12, 0.48, 0.18, mats["sabana"])


def sillon(p, mats, ancho=1.95, prof=0.92):
    """sillón de tres cuerpos de líneas rectas (en coordenadas del mueble: respaldo en y = 0, frente hacia -Y)"""
    a, t = ancho / 2, mats["tela_sillon"]
    for sx in (-1, 1):
        for y in (-prof + 0.07, -0.07):
            p.caja(sx * (a - 0.1) - 0.015, y - 0.015, sx * (a - 0.1) + 0.015, y + 0.015, 0, 0.09, mats["negro"], 0.003)
    p.caja(-a, -prof, a, 0, 0.09, 0.3, t, 0.025, 3)
    for sx in (-1, 1):
        p.caja(sx * a, -prof, sx * (a - 0.15), 0, 0.09, 0.62, t, 0.045, 4)
    p.caja(-a + 0.15, -0.22, a - 0.15, 0, 0.3, 0.74, t, 0.04, 4)
    n, libre = 3, ancho - 0.3
    w = libre / n
    for i in range(n):
        x1 = -a + 0.15 + i * w
        p.caja(x1 + 0.004, -prof + 0.02, x1 + w - 0.004, -0.2, 0.3, 0.47, t, 0.065, 6)
        with p.en((x1 + x1 + w) / 2, -0.21, 0, 0.44, inclinar=9):
            p.caja(-w / 2 + 0.006, -0.19, w / 2 - 0.006, 0, 0.0, 0.4, t, 0.075, 6)
    for x, giro, mat in ((-a + 0.42, 12, mats["terracota"]), (a - 0.42, -10, mats["salvia"]), (a - 0.72, 6, t)):
        with p.en(x, -0.49, giro, 0.68, inclinar=16):
            p.almohadon(0.46, 0.44, 0.16, mat)


def silla(p, mats):
    """silla de comedor de roble con asiento tapizado (centro del asiento en el origen, frente hacia -Y)"""
    r = mats["roble"]
    for sx in (-1, 1):
        p.caja(sx * 0.19 - 0.017, -0.2, sx * 0.19 + 0.017, -0.166, 0, 0.44, r, 0.004)
        p.caja(sx * 0.19 - 0.017, 0.166, sx * 0.19 + 0.017, 0.2, 0, 0.86, r, 0.004)
    p.caja(-0.21, -0.215, 0.21, 0.215, 0.42, 0.445, r, 0.005)
    p.caja(-0.2, -0.205, 0.2, 0.17, 0.445, 0.475, mats["salvia"], 0.014, 3)
    with p.en(0, 0.18, 0, 0.66, inclinar=6):
        p.caja(-0.21, -0.012, 0.21, 0.012, 0.0, 0.17, r, 0.006)
    for y in (-0.183, 0.183):
        p.caja(-0.19, y - 0.01, 0.19, y + 0.01, 0.16, 0.19, r, 0.003)


def mesa_redonda(p, mats, x, y, radio=0.42):
    p.cilindro(x, y, 0.72, 0.75, radio, mats["roble"], 64, chaflan=0.006)
    p.cilindro(x, y, 0.05, 0.72, 0.04, mats["negro"], 32)
    p.cilindro(x, y, 0.0, 0.03, 0.24, mats["negro"], 48, chaflan=0.008)


def mesa_de_luz(p, mats, x, y, lampara_encima=True):
    p.caja(x - 0.2, y - 0.19, x + 0.2, y + 0.19, 0.2, 0.5, mats["roble"], 0.004)
    p.caja(x - 0.195, y - 0.195, x + 0.195, y - 0.19, 0.36, 0.49, mats["roble"], 0.002)
    for sx in (-1, 1):
        p.caja(x + sx * 0.18 - 0.012, y - 0.17, x + sx * 0.18 + 0.012, y - 0.15, 0, 0.2, mats["negro"], 0.002)
        p.caja(x + sx * 0.18 - 0.012, y + 0.15, x + sx * 0.18 + 0.012, y + 0.17, 0, 0.2, mats["negro"], 0.002)
    if lampara_encima:
        lampara(p, mats, x, y, 0.5)


def lampara(p, mats, x, y, z):
    p.cilindro(x, y, z, z + 0.03, 0.07, mats["negro"], chaflan=0.005)
    p.tubo((x, y, z + 0.03), (x, y, z + 0.33), 0.006, mats["negro"])
    tmp = bmesh.new()
    bmesh.ops.create_cone(tmp, cap_ends=False, segments=32, radius1=0.12, radius2=0.09, depth=0.2,
                          matrix=Matrix.Translation((x, y, z + 0.36)))
    p._sumar(tmp, mats["pantalla"])


def libros(p, mats, x, y, z):
    alturas = (0.24, 0.21, 0.26, 0.2, 0.23)
    for i, h in enumerate(alturas):
        p.caja(x + i * 0.035, y, x + i * 0.035 + 0.032, y + 0.17, z, z + h,
               mats[("libro1", "libro2", "libro3")[i % 3]], 0.003)


def luz(coleccion, unidad, nombre, x, y, z, potencia, tipo="AREA", tamano=0.2, color=(1.0, 0.85, 0.68)):
    """
    luz de las luminarias (potencia en W "reales": se escala a unidades de Blender, que en esta escena son de E
    metros). Queda apagada para plantas y fachadas; renders_recorrido.py la prende
    """
    letra, z_piso = unidad
    sx, sy = it["CUADRANTES"][letra]
    datos = bpy.data.lights.new(nombre, tipo)
    datos.energy = potencia / E ** 2
    datos.color = color
    if tipo == "AREA":
        datos.size = tamano / E
    else:
        datos.shadow_soft_size = tamano / E
    o = bpy.data.objects.new(nombre, datos)
    o.location = (CENTRO[0] + sx * x / E, CENTRO[1] + sy * y / E, z_piso + (ESP + z) / E)
    o.hide_render = True
    o["vestido"] = True
    o["luz_recorrido"] = True
    coleccion.objects.link(o)
    return o


def luces(coleccion, unidad, p, mats):
    # baño: plafón y espejo con LED
    luz(coleccion, unidad, "VI_Luz_Bano", 4.1, 4.0, ALTO - 0.02, 6, tamano=0.25)
    p.cilindro(4.1, 4.0, ALTO - 0.012, ALTO, 0.13, mats["luz"], 40)
    luz(coleccion, unidad, "VI_Luz_Espejo", 4.1, NY + T + 0.1, 1.9, 2, tamano=0.6)
    p.caja(3.72, NY + T + 0.011, 4.48, NY + T + 0.02, 1.83, 1.845, mats["luz"], 0)
    # pasillo: spot
    luz(coleccion, unidad, "VI_Luz_Pasillo", 2.9, 4.4, ALTO - 0.02, 10, tamano=0.08)
    p.cilindro(2.9, 4.4, ALTO - 0.008, ALTO, 0.045, mats["luz"], 24)
    # cocina: tira de LED bajo las alacenas
    luz(coleccion, unidad, "VI_Luz_Cocina", 5.22, M0 + 0.26, 1.43, 20, tamano=1.8)
    p.caja(4.3, M0 + 0.25, 6.15, M0 + 0.27, 1.442, 1.45, mats["luz"], 0)
    # lámparas de noche del principal y del dormitorio 2
    for nombre, x, y in (("VI_Luz_Noche_1", 5.14, YE + T + 0.21), ("VI_Luz_Noche_2", 7.26, YE + T + 0.21),
                         ("VI_Luz_Noche_3", 0.47, 5.45)):
        luz(coleccion, unidad, nombre, x, y, 0.86, 8, "POINT", 0.06)


def social(coleccion, unidad, p, mats):
    """estar-comedor: muebles de Poly Haven donde van las cajas de interior_tipo.py"""
    # comedor: mesa redonda, cuatro sillas mirando a la mesa, colgante encima
    mx, my = 4.1, 1.95
    mesa_redonda(p, mats, mx, my)
    for a in (0, 90, 180, 270):
        r = math.radians(a + 20)
        with p.en(mx + 0.52 * math.cos(r), my + 0.52 * math.sin(r), a + 20 - 90):
            silla(p, mats)
    modelo("modern_ceiling_lamp_01", coleccion, unidad, mx, my, 0, z=ALTO - 1.173 - ESP)
    modelo("ceramic_vase_03", coleccion, unidad, mx + 0.08, my - 0.05, 0, z=0.75)
    # estar: sillón contra el principal, mesa ratona, sillón individual hacia el ventanal, alfombra, planta
    with p.en(6.25, YE - T - 0.01):
        sillon(p, mats)
    modelo("modern_coffee_table_01", coleccion, unidad, 6.25, 2.85, 0)
    for o in modelo("modern_arm_chair_01", coleccion, unidad, 7.1, 1.55, -140):
        for i, m in enumerate(o.data.materials):
            if m and m.name.startswith("modern_arm_chair_01_pillow"):
                o.data.materials[i] = mats["salvia_modelo"]  # el cuero negro apaga el ambiente
    modelo("side_table_01", coleccion, unidad, 7.45, YE - T - 0.3, 90)
    modelo("ceramic_vase_01", coleccion, unidad, 7.45, YE - T - 0.3, 0, z=0.55)
    modelo("potted_plant_01", coleccion, unidad, 7.3, M0 + 0.36, 30)
    modelo("hanging_picture_frame_02", coleccion, unidad, 6.25, YE - T, 0, z=1.45)
    p.caja(5.4, 2.1, 7.1, 3.75, 0, 0.012, mats["alfombra"], 0.004)
    libros(p, mats, 6.5, 2.8, 0.39)
    # cocina y pasillo
    modelo("wooden_bowl_01", coleccion, unidad, 5.2, M0 + 0.42, 0, z=0.9)
    modelo("potted_plant_04", coleccion, unidad, 4.4, M0 + 0.2, 0, z=0.9)
    modelo("hanging_picture_frame_01", coleccion, unidad, XD + T, 4.55, 90, z=1.5)


# ---------------------------------------------------------------- principal
def coleccion_limpia():
    padre = bpy.data.collections.get(it["INTERIORES"])
    col = bpy.data.collections.get(VESTIDO)
    if col:
        for o in list(col.objects):
            datos = o.data
            bpy.data.objects.remove(o)
            if datos is not None and datos.users == 0 and isinstance(datos, bpy.types.Mesh):
                bpy.data.meshes.remove(datos)
            elif datos is not None and datos.users == 0 and isinstance(datos, bpy.types.Light):
                bpy.data.lights.remove(datos)
        # materiales e imágenes de los modelos de la pasada anterior (sólo los que vienen de ASSETS)
        assets = os.path.normcase(os.path.abspath(ASSETS))
        propia = lambda im: im.source == "FILE" and os.path.normcase(bpy.path.abspath(im.filepath)).startswith(assets)
        for m in [m for m in bpy.data.materials if m.users == 0 and m.node_tree and any(
                n.type == "TEX_IMAGE" and n.image and propia(n.image) for n in m.node_tree.nodes)]:
            bpy.data.materials.remove(m)
        for im in [im for im in bpy.data.images if im.users == 0 and propia(im)]:
            bpy.data.images.remove(im)
    else:
        col = bpy.data.collections.new(VESTIDO)
        (padre.children if padre else bpy.context.scene.collection.children).link(col)
    return col


def main():
    codigo = (UNIDAD_VESTIR or it["VESTIR"]).upper()
    letra, piso = codigo[-1:], int(codigo[:-1])
    pisos = {int(o["piso"]): it["z_min"](o) for o in bpy.data.objects if o.get("tipo") == "piso" and "piso" in o}
    if piso not in pisos or letra not in it["CUADRANTES"]:
        raise RuntimeError(f"No hay unidad {codigo} (letra A–D y un piso del modelo)")
    unidad = (letra, pisos[piso] + LOSA / E)
    _cargados.clear()
    col = coleccion_limpia()
    mats = materiales()
    fijo = Pieza(f"VI_Obra_{codigo}")          # puertas, zócalos, revestimientos
    muebles = Pieza(f"VI_Equipamiento_{codigo}")
    telas = Pieza(f"VI_Cortinas_{codigo}")
    puerta(fijo, mats, "x", XD, 3.25, 4.0, PARED, "a", -1)       # dormitorio 2
    puerta(fijo, mats, "x", XP, 3.6, 4.3, PARED, "b", -1, corrediza=True)  # baño: corre hacia el principal
    puerta(fijo, mats, "y", YB, 2.55, 3.25, PARED, "a", 1)       # principal
    puerta(fijo, mats, "x", NX, 0.2, 0.85, MURO_NUCLEO, "a", 1, cerrada=True)  # entrada
    zocalos(fijo, mats)
    cocina(muebles, mats)
    bano(fijo, mats)
    dormitorios(muebles, mats, col, unidad)
    social(col, unidad, muebles, mats)
    luces(col, unidad, muebles, mats)
    cortinas(telas, mats)
    for pz in (fijo, muebles, telas):
        pz.crear(col, unidad)
    print(f"Vestido {codigo}: {len(col.objects)} objeto(s), {len(_cargados)} modelo(s) de Poly Haven")


if __name__ == "__main__":
    main()
