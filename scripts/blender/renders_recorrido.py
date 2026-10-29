"""
Recorrido 360 de una unidad: una panorámica equirectangular por cámara Pano_<recorrido>_<punto>, el plano de la
unidad visto desde arriba (cortado a la altura de los ojos) con la posición de cada punto, y qué puntos se ven entre
sí, que son los saltos del recorrido. En la web lo muestra VisorRecorrido (Photo Sphere Viewer): se gira, se hace
zoom y se pasa de un punto a otro con las flechas del piso, como en Street View.

Spec: docs/renders-recorrido.md

Uso:
  - Blender abierto: pestaña Scripting → abrir este archivo → Run Script (Alt+P).
  - Consola:  blender -b archivo.blend --python scripts/blender/renders_recorrido.py -- [opciones]
      --recorridos unidad-a   sólo esos recorridos
      --puntos living,bano    sólo esas panorámicas (recorrido.json sale igual con todos los puntos)
      --solo-datos            no renderiza: sólo recorrido.json (segundos, para revisar posiciones y enlaces)
      --sin-plano             no renderiza el plano
      --prueba                al 25 % y con pocas muestras

Salida (junto al .blend):  //web/recorridos/<recorrido>/<punto>.webp, plano.webp y recorrido.json.

Las cámaras se nivelan al renderizar: una panorámica inclinada siempre está mal. Lo único que importa de su giro es
hacia dónde mira, que es el centro de la imagen y la vista con la que arranca el punto en la web.
El .blend no se modifica: se restauran cámaras, visibilidad y ajustes de render.
"""

import json
import math
import os
import sys

import bpy
import bmesh
from mathutils import Color, Euler, Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

# ---------------------------------------------------------------- configuración
PREFIJO = "Pano"                   # cámaras Pano_<recorrido>_<punto> (fuera de la colección WEB)
ESCALA = 1.0                       # metros por unidad de Blender (igual que en el admin); propiedad "escala"
ANCHO = 6144                       # px de la panorámica (el alto es la mitad)
MUESTRAS = 384                     # Cycles: máximo por píxel (el muestreo adaptativo corta antes donde ya no hay ruido;
                                   # con denoise, 1024 no se distingue y tarda 3 veces más: ~40 min por panorámica)
UMBRAL_RUIDO = 0.02
MUESTRAS_PRUEBA = 64
EXPOSICION = 1.0                   # exposición del interior (la de la escena suele estar ajustada para el exterior)
LOOK = "AgX - Base Contrast"       # transformación de color de estos renders ("" deja la de la escena)
DISTANCIA_MAXIMA = 9.0             # metros: dos puntos más lejos que esto no se enlazan aunque se vean
ALTURA_CORTE = 0.1                 # metros por debajo de las cámaras donde se corta el plano
MATERIAL_CORTE = "WEB_Corte"       # color de la cara cortada de las paredes en el plano (si existe el material)
LADO_PLANO = 1600                  # px del plano (cuadrado: la web calcula el rumbo de las flechas con x/y en %)
MARGEN_PLANO = 1.08                # aire alrededor de la unidad en el plano
OCULTAR = ("Bruma",)               # prefijos de objetos que no van en estos renders
OCULTAR_COLECCIONES = ()           # colecciones que no van (p. ej. la copia del entorno para el visor web y los
                                   # edificios vecinos modelados: de lejos los reemplaza el HDRI)
OCULTAR_PLANO = ()                 # colecciones (o prefijos de objetos) que se ven por las ventanas pero no van en el
                                   # plano: los techos vecinos quedan por debajo del corte y lo ensuciarían
# ambiente interior: lo que se ve desde adentro no es lo que se ve desde afuera
HDRI = ""                          # foto 360 de cielo y ciudad (.hdr/.exr) que ilumina y se ve por las ventanas
HDRI_GIRO = 0.0                    # grados: gira el HDRI alrededor del eje vertical
HDRI_FUERZA = 1.0
# el sol va aparte del HDRI: el del HDRI se recorta (LIMITE_HDRI) y lo reemplaza el sol de la escena, que da
# sombras nítidas y se puede poner donde entre mejor por las ventanas sin cambiar lo que se ve afuera
SOL = 3.0                          # fuerza del sol de la escena en estos renders (None = la de la escena)
SOL_RUMBO = None                   # grados desde el norte hacia el este; None = donde está el sol del HDRI
SOL_ALTURA = None                  # grados sobre el horizonte; None = la del HDRI
SOL_ANGULO = 1.5                   # tamaño aparente en grados: sombras un poco blandas, como un día con algo de bruma
LIMITE_HDRI = 30.0                 # brillo máximo del HDRI al iluminar (lo de arriba es el sol); se ve entero igual
VIDRIOS = ("WEB_Vidrio",)          # vidrios de fachada (oscuros, pensados para verse de afuera) → vidrio real
INVISIBLES = ("WEB_Luz_Interior",)  # tiras que iluminan la fachada de noche: desde adentro son bloques de luz
FACHADAS = ("WEB_Fachada",)        # muros de fachada: del lado de adentro de los vidrios se pintan como las paredes
PARED = "WEB_Pared_Interior"
FACHADA_ESPESOR = 0.15             # metros hacia adentro de los vidrios que todavía son fachada (antepechos, dinteles)
# aire con luz: una bruma muy tenue en la unidad hace visibles los haces de sol que entran por las ventanas, y las
# motas de polvo sólo brillan adentro del haz (como el polvo de verdad). Sólo en las panorámicas, no en el plano
HACES = 0.0                        # densidad del aire por metro (0 = sin haces; 0,02–0,05 se nota sin velar)
ANISOTROPIA = 0.85
POLVO = 0.0                        # motas por m³ (0 = sin polvo)
MOTA = 0.0015                      # metros de radio de cada mota (a 1–2 m de la cámara, uno o dos píxeles)
OPACIDAD_MOTA = 0.25
AIRE_CAJA = None                   # (x0, y0, x1, y1) en metros: dónde hay aire; None = las cámaras ± AIRE_MARGEN
AIRE_MARGEN = 1.0
SALIDA = "//web/recorridos"
CALIDAD = 88


# ---------------------------------------------------------------- utilidades
def objetos_de(col):
    yield from col.objects
    for c in col.children:
        yield from objetos_de(c)


def caja(o):
    p = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (min(v.x for v in p), min(v.y for v in p), min(v.z for v in p),
            max(v.x for v in p), max(v.y for v in p), max(v.z for v in p))


def leer_argumentos():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

    def lista(op):
        return set(a[a.index(op) + 1].split(",")) if op in a else None

    return lista("--recorridos"), lista("--puntos"), "--solo-datos" in a, "--sin-plano" in a, "--prueba" in a


class Cambios:
    """recuerda el primer valor de cada atributo que se toca, para dejar el .blend como estaba"""

    def __init__(self):
        self.antes = {}
        self.deshacer = []  # funciones para lo que no es un atributo (materiales de un slot, datos temporales)

    def fijar(self, obj, attr, valor):
        clave = (obj.as_pointer(), attr)
        if clave not in self.antes:
            antes = getattr(obj, attr)
            # una matriz o un vector de bpy es una vista del objeto: sin la copia se "restauraría" el valor nuevo.
            # Sólo esos: un dato de Blender (un mundo, un material) también tiene copy(), pero duplicaría el dato
            vista = isinstance(antes, (Matrix, Vector, Euler, Color, Quaternion))
            self.antes[clave] = (obj, attr, antes.copy() if vista else antes)
        setattr(obj, attr, valor)

    def restaurar(self):
        for obj, attr, valor in reversed(list(self.antes.values())):
            try:
                setattr(obj, attr, valor)
            except ReferenceError:
                pass  # el objeto ya no existe
        self.antes.clear()
        for f in reversed(self.deshacer):
            f()
        self.deshacer.clear()


# ---------------------------------------------------------------- puntos
def puntos_de_escena(pedidos):
    """{recorrido: [cámaras]} de las Pano_<recorrido>_<punto>, por la propiedad "orden" y el nombre (el primero es
    donde arranca el recorrido)"""
    recorridos = {}
    for o in sorted((o for o in bpy.data.objects if o.type == "CAMERA" and o.name.startswith(PREFIJO + "_")),
                    key=lambda o: (float(o.get("orden", 1e9)), o.name)):
        resto = o.name[len(PREFIJO) + 1:]
        recorrido, _, clave = resto.partition("_")
        recorrido = str(o.get("recorrido", recorrido))
        clave = str(o.get("clave", clave or resto)).replace(".", "-").lower()
        if pedidos and recorrido not in pedidos:
            continue
        recorridos.setdefault(recorrido, []).append((clave, o))
    return recorridos


def rumbo_de(cam):
    """grados desde el norte (+Y) hacia el este (+X) de hacia dónde mira la cámara"""
    f = cam.matrix_world.to_3x3() @ Vector((0, 0, -1))
    return round(math.degrees(math.atan2(f.x, f.y)) % 360, 1)


def enlaces_de(puntos, opacos):
    """
    Dos puntos se enlazan si se ven a la altura de la cámara (a través de una puerta, no de una pared) y están a menos
    de DISTANCIA_MAXIMA. La propiedad "enlaces" de la cámara ("living,cocina") pisa el cálculo.
    """
    maximo = DISTANCIA_MAXIMA / ESCALA
    enlaces = {}
    for clave, cam in puntos:
        manual = cam.get("enlaces")
        if manual:
            enlaces[clave] = [e.strip() for e in str(manual).split(",") if e.strip()]
            continue
        a = cam.matrix_world.translation
        enlaces[clave] = []
        for otra, cam2 in puntos:
            b = cam2.matrix_world.translation
            d = (b - a).length
            if otra == clave or d > maximo or abs(b.z - a.z) > 1.0 / ESCALA:
                continue
            if opacos is None or opacos.ray_cast(a, (b - a).normalized(), d)[0] is None:
                enlaces[clave].append(otra)
    # un punto aislado (la puerta queda en diagonal) se enlaza con el más cercano, para que no sea un callejón
    for clave, cam in puntos:
        if enlaces[clave] or len(puntos) < 2:
            continue
        a = cam.matrix_world.translation
        otra = min((p for p in puntos if p[0] != clave), key=lambda p: (p[1].matrix_world.translation - a).length)[0]
        enlaces[clave].append(otra)
        if clave not in enlaces[otra]:
            enlaces[otra].append(clave)
        print(f"    AVISO: {clave} no ve a ningún punto; se enlaza con {otra} (mové la cámara frente a la puerta)")
    return enlaces


def encuadre(puntos, unidades):
    """centro y lado (unidades de Blender) del plano: la caja Unidad_* que contiene al primer punto, o los puntos"""
    p = puntos[0][1].matrix_world.translation
    for u in unidades:
        x0, y0, z0, x1, y1, z1 = caja(u)
        if x0 <= p.x <= x1 and y0 <= p.y <= y1 and z0 <= p.z <= z1:
            return Vector(((x0 + x1) / 2, (y0 + y1) / 2)), max(x1 - x0, y1 - y0) * MARGEN_PLANO, u
    xs = [c.matrix_world.translation.x for _, c in puntos]
    ys = [c.matrix_world.translation.y for _, c in puntos]
    lado = max(max(xs) - min(xs), max(ys) - min(ys), 4 / ESCALA) * 1.4
    return Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)), lado, None


def bvh_de(objetos):
    dg = bpy.context.evaluated_depsgraph_get()
    verts, caras = [], []
    for o in objetos:
        ev = o.evaluated_get(dg)
        try:
            m = ev.to_mesh()
        except RuntimeError:
            continue
        if m is None:
            continue
        base = len(verts)
        verts.extend(ev.matrix_world @ v.co for v in m.vertices)
        caras.extend([base + i for i in pol.vertices] for pol in m.polygons)
        ev.to_mesh_clear()
    return BVHTree.FromPolygons(verts, caras, all_triangles=False) if caras else None


# ---------------------------------------------------------------- render
def preparar_render(cambios, escena, prueba):
    c = escena.cycles
    cambios.fijar(escena.render, "engine", "CYCLES")  # EEVEE no tiene cámara panorámica
    cambios.fijar(c, "samples", MUESTRAS_PRUEBA if prueba else MUESTRAS)
    # un interior vive de la luz rebotada: más rebotes que en una toma de fachada, sin cáusticas (ruido) y con
    # el indirecto recortado para que no queden "luciérnagas"
    for attr, valor in (("use_adaptive_sampling", True), ("adaptive_threshold", UMBRAL_RUIDO),
                        ("max_bounces", 16), ("diffuse_bounces", 8), ("glossy_bounces", 8),
                        ("transmission_bounces", 12), ("transparent_max_bounces", 32),
                        ("volume_bounces", 1 if HACES > 0 else 0),  # con 0 el aire no recibe ni el sol directo
                        ("caustics_reflective", False), ("caustics_refractive", False), ("blur_glossy", 1.0),
                        ("sample_clamp_direct", 0.0), ("sample_clamp_indirect", 10.0),
                        ("use_denoising", True), ("denoiser", "OPENIMAGEDENOISE"),
                        ("denoising_input_passes", "RGB_ALBEDO_NORMAL"), ("denoising_prefilter", "ACCURATE"),
                        ("denoising_quality", "HIGH")):
        if hasattr(c, attr):
            cambios.fijar(c, attr, valor)
    if LOOK:
        cambios.fijar(escena.view_settings, "view_transform", "AgX")
        cambios.fijar(escena.view_settings, "look", LOOK)
    cambios.fijar(escena.render, "resolution_percentage", 100)
    cambios.fijar(escena.render.image_settings, "file_format", "WEBP")
    cambios.fijar(escena.render.image_settings, "quality", CALIDAD)
    cambios.fijar(escena.view_settings, "exposure", EXPOSICION)


def preparar_ambiente(cambios, escena, todos):
    """
    Lo que se ve desde adentro: el HDRI como cielo y ciudad, vidrio real en las ventanas, sin las tiras de luz de la
    fachada y con la cara interior de los muros de fachada pintada como las paredes. Todo temporal.
    """
    if HDRI:
        ruta = bpy.path.abspath(HDRI)
        if not os.path.exists(ruta):
            raise RuntimeError(f"No existe el HDRI {ruta} (propiedad 'hdri' de la primera cámara)")
        mundo = bpy.data.worlds.new("_Mundo_Recorrido")
        mundo.use_nodes = True
        nt = mundo.node_tree
        fondo = next((n for n in nt.nodes if n.type == "BACKGROUND"), None) or nt.nodes.new("ShaderNodeBackground")
        salida = next((n for n in nt.nodes if n.type == "OUTPUT_WORLD"), None) or nt.nodes.new("ShaderNodeOutputWorld")
        nt.links.new(fondo.outputs[0], salida.inputs["Surface"])
        fondo.inputs["Strength"].default_value = HDRI_FUERZA
        tex = nt.nodes.new("ShaderNodeTexEnvironment")
        tex.image = bpy.data.images.load(ruta, check_existing=True)
        mapeo = nt.nodes.new("ShaderNodeMapping")
        mapeo.inputs["Rotation"].default_value[2] = math.radians(HDRI_GIRO)
        coords = nt.nodes.new("ShaderNodeTexCoord")
        nt.links.new(coords.outputs["Generated"], mapeo.inputs["Vector"])
        nt.links.new(mapeo.outputs["Vector"], tex.inputs["Vector"])
        recorte = nt.nodes.new("ShaderNodeVectorMath")
        recorte.operation = "MINIMUM"
        recorte.inputs[1].default_value = (LIMITE_HDRI,) * 3
        nt.links.new(tex.outputs["Color"], recorte.inputs[0])
        mezcla = nt.nodes.new("ShaderNodeMix")
        mezcla.data_type = "RGBA"
        nt.links.new(nt.nodes.new("ShaderNodeLightPath").outputs["Is Camera Ray"], mezcla.inputs["Factor"])
        nt.links.new(recorte.outputs[0], next(x for x in mezcla.inputs if x.name == "A" and x.type == "RGBA"))
        nt.links.new(tex.outputs["Color"], next(x for x in mezcla.inputs if x.name == "B" and x.type == "RGBA"))
        color = next(x for x in mezcla.outputs if x.type == "RGBA")
        if HACES > 0:
            # la bruma la ilumina sólo el sol: con el cielo también, vela todo parejo y el haz no se distingue
            sin_cielo = nt.nodes.new("ShaderNodeMix")
            sin_cielo.data_type = "RGBA"
            nt.links.new(nt.nodes.new("ShaderNodeLightPath").outputs["Is Volume Scatter Ray"], sin_cielo.inputs["Factor"])
            nt.links.new(color, next(x for x in sin_cielo.inputs if x.name == "A" and x.type == "RGBA"))
            next(x for x in sin_cielo.inputs if x.name == "B" and x.type == "RGBA").default_value = (0, 0, 0, 1)
            color = next(x for x in sin_cielo.outputs if x.type == "RGBA")
        nt.links.new(color, fondo.inputs["Color"])
        cambios.fijar(escena, "world", mundo)
        imagen = tex.image

        def sacar_mundo():
            bpy.data.worlds.remove(mundo)
            if imagen.users == 0:
                bpy.data.images.remove(imagen)
        cambios.deshacer.append(sacar_mundo)
    if SOL is not None:
        soles = [o for o in todos if o.type == "LIGHT" and o.data.type == "SUN"]
        for o in soles:
            cambios.fijar(o.data, "energy", 0.0)
        if SOL > 0 and soles:
            sol = soles[0]
            rumbo, altura = SOL_RUMBO, SOL_ALTURA
            if HDRI and (rumbo is None or altura is None):
                r_hdri, a_hdri = sol_del_hdri(imagen)
                rumbo = r_hdri if rumbo is None else rumbo
                altura = a_hdri if altura is None else altura
            if rumbo is not None and altura is not None:
                az, el = math.radians(rumbo), math.radians(altura)
                hacia = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), math.sin(el)))
                cambios.fijar(sol, "matrix_world", Matrix.Translation(sol.matrix_world.translation)
                              @ hacia.to_track_quat("Z", "Y").to_matrix().to_4x4())
            cambios.fijar(sol.data, "energy", SOL)
            cambios.fijar(sol.data, "angle", math.radians(SOL_ANGULO))

    # luminarias del interior (vestir_interior.py): apagadas en plantas y fachadas, prendidas acá
    for o in todos:
        if o.type == "LIGHT" and o.get("luz_recorrido"):
            cambios.fijar(o, "hide_render", False)

    temporales = {}
    for n in VIDRIOS:
        if n in bpy.data.materials:
            temporales[n] = material_vidrio()
    for n in INVISIBLES:
        if n in bpy.data.materials:
            temporales[n] = material_invisible()
    for n in FACHADAS:
        if n in bpy.data.materials:
            temporales[n] = fachada_con_interior(bpy.data.materials[n], todos)

    def sacar_materiales():
        for m in set(temporales.values()):
            bpy.data.materials.remove(m)
    cambios.deshacer.append(sacar_materiales)  # deshacer va al revés: esto corre después de devolver los originales
    for o in todos:
        if o.type != "MESH":
            continue
        for i, m in enumerate(o.data.materials):
            if m and m.name in temporales:
                o.data.materials[i] = temporales[m.name]
                cambios.deshacer.append(lambda d=o.data, i=i, m=m: d.materials.__setitem__(i, m))


def aire_con_luz(camaras):
    """
    bruma y polvo dentro de la unidad (HACES, POLVO); devuelve la función que los saca. La caja va de piso a
    techo: por la ventana se sigue viendo la ciudad limpia y el sol sólo se ve como haz adentro
    """
    if HACES <= 0 and POLVO <= 0:
        return lambda: None
    import random
    pos = [c.matrix_world.translation for c in camaras]
    m = AIRE_MARGEN / ESCALA
    x0, y0, x1, y1 = ([v / ESCALA for v in AIRE_CAJA] if AIRE_CAJA else
                      (min(p.x for p in pos) - m, min(p.y for p in pos) - m,
                       max(p.x for p in pos) + m, max(p.y for p in pos) + m))
    ojo = min(p.z for p in pos)
    z0, z1 = ojo - 1.55 / ESCALA, ojo + 0.85 / ESCALA
    col = bpy.data.collections.new("_Aire_Recorrido")
    bpy.context.scene.collection.children.link(col)
    creados = []

    if HACES > 0:
        mat = bpy.data.materials.new("_Aire")
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        vol = nt.nodes.new("ShaderNodeVolumePrincipled")
        vol.inputs["Density"].default_value = HACES * ESCALA  # por unidad de Blender
        # el polvo dispersa casi todo hacia adelante: el haz brilla a contraluz y la luz que rebota del piso (que
        # viene de abajo) casi no vela
        vol.inputs["Anisotropy"].default_value = ANISOTROPIA
        nt.links.new(vol.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Volume"])
        if hasattr(getattr(mat, "cycles", None), "homogeneous_volume"):  # Blender 5 lo detecta solo
            mat.cycles.homogeneous_volume = True
        malla = bpy.data.meshes.new("_Aire")
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bm.to_mesh(malla)
        bm.free()
        malla.materials.append(mat)
        o = bpy.data.objects.new("_Aire", malla)
        o.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        o.scale = (x1 - x0, y1 - y0, z1 - z0)
        col.objects.link(o)
        creados += [o, malla, mat]

    if POLVO > 0:
        volumen = (x1 - x0) * (y1 - y0) * (z1 - z0) * ESCALA ** 3
        azar = random.Random(931)
        lejos = (0.5 / ESCALA) ** 2  # pegada a la cámara, una mota es una mancha
        puntos = []
        for _ in range(int(volumen * POLVO)):
            v = Vector((azar.uniform(x0, x1), azar.uniform(y0, y1), azar.uniform(z0, z1)))
            if all((v - p).length_squared > lejos for p in pos):
                puntos.append(v)
        nube = bpy.data.meshes.new("_Polvo")
        nube.from_pydata(puntos, [], [])
        mota = bpy.data.meshes.new("_Mota")
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=MOTA / ESCALA)
        bm.to_mesh(mota)
        bm.free()
        mat = bpy.data.materials.new("_Mota")
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.inputs["Base Color"].default_value = (0.9, 0.88, 0.85, 1)
        bsdf.inputs["Roughness"].default_value = 1.0
        # casi transparente: en sombra no se distingue del fondo (si no, parecen manchas de suciedad) y en el haz,
        # con el sol diez veces más fuerte que la luz rebotada, brilla
        mezcla = nt.nodes.new("ShaderNodeMixShader")
        mezcla.inputs[0].default_value = OPACIDAD_MOTA
        nt.links.new(nt.nodes.new("ShaderNodeBsdfTransparent").outputs[0], mezcla.inputs[1])
        nt.links.new(bsdf.outputs[0], mezcla.inputs[2])
        nt.links.new(mezcla.outputs[0], nt.nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
        mota.materials.append(mat)
        o_nube = bpy.data.objects.new("_Polvo", nube)
        o_mota = bpy.data.objects.new("_Mota", mota)
        o_mota.parent = o_nube
        o_nube.instance_type = "VERTS"  # una mota en cada vértice, sin duplicar la malla
        col.objects.link(o_nube)
        col.objects.link(o_mota)
        creados += [o_nube, o_mota, nube, mota, mat]

    def sacar():
        for d in creados:
            try:
                if isinstance(d, bpy.types.Object):
                    bpy.data.objects.remove(d, do_unlink=True)
                elif isinstance(d, bpy.types.Mesh):
                    bpy.data.meshes.remove(d)
                else:
                    bpy.data.materials.remove(d)
            except ReferenceError:
                pass  # ya se sacó
        creados.clear()
        try:
            bpy.data.collections.remove(col)
        except ReferenceError:
            pass
    return sacar


def sol_del_hdri(imagen):
    """
    rumbo y altura (grados) del píxel más brillante del cielo del HDRI, ya girado HDRI_GIRO. Convención de Cycles
    para la textura de entorno: u = 0,5 − atan2(y, x) / 2π; con el giro, el rumbo desde el norte es 126° + giro
    para u = 0,6 (comprobado con un render de la escena vacía)
    """
    chica = imagen.copy()
    chica.scale(512, 256)
    px = chica.pixels[:]
    bpy.data.images.remove(chica)
    w, h = 512, 256
    mejor, iu, iv = -1.0, 0, 0
    for v in range(h // 2, h):
        for u in range(w):
            k = (v * w + u) * 4
            luz = px[k] * 0.2126 + px[k + 1] * 0.7152 + px[k + 2] * 0.0722
            if luz > mejor:
                mejor, iu, iv = luz, u, v
    u, v = (iu + 0.5) / w, (iv + 0.5) / h
    fi, tita = (0.5 - u) * 2 * math.pi, (v - 0.5) * math.pi
    d = Matrix.Rotation(-math.radians(HDRI_GIRO), 3, "Z") @ Vector((math.cos(fi) * math.cos(tita),
                                                                    math.sin(fi) * math.cos(tita), math.sin(tita)))
    return math.degrees(math.atan2(d.x, d.y)) % 360, math.degrees(tita)


def nodos_limpios(nombre):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    for n in list(m.node_tree.nodes):
        m.node_tree.nodes.remove(n)
    return m, m.node_tree


def material_vidrio():
    """
    vidrio real: refleja y deja ver afuera. Para las sombras y la luz difusa es transparente, porque sin cáusticas el
    sol y el cielo no atravesarían un vidrio que refracta (el truco de siempre en interiores)
    """
    m, nt = nodos_limpios("_Vidrio_Recorrido")
    salida = nt.nodes.new("ShaderNodeOutputMaterial")
    vidrio = nt.nodes.new("ShaderNodeBsdfPrincipled")
    vidrio.inputs["Base Color"].default_value = (0.97, 0.99, 0.98, 1)
    vidrio.inputs["Roughness"].default_value = 0.0
    vidrio.inputs["IOR"].default_value = 1.5
    vidrio.inputs["Transmission Weight"].default_value = 1.0
    transparente = nt.nodes.new("ShaderNodeBsdfTransparent")
    camino = nt.nodes.new("ShaderNodeLightPath")
    cualquiera = nt.nodes.new("ShaderNodeMath")
    cualquiera.operation = "MAXIMUM"
    nt.links.new(camino.outputs["Is Shadow Ray"], cualquiera.inputs[0])
    nt.links.new(camino.outputs["Is Diffuse Ray"], cualquiera.inputs[1])
    mezcla = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(cualquiera.outputs[0], mezcla.inputs["Fac"])
    nt.links.new(vidrio.outputs[0], mezcla.inputs[1])
    nt.links.new(transparente.outputs[0], mezcla.inputs[2])
    nt.links.new(mezcla.outputs[0], salida.inputs["Surface"])
    return m


def material_invisible():
    m, nt = nodos_limpios("_Invisible_Recorrido")
    nt.links.new(nt.nodes.new("ShaderNodeBsdfTransparent").outputs[0],
                 nt.nodes.new("ShaderNodeOutputMaterial").inputs["Surface"])
    return m


def fachada_con_interior(original, todos):
    """
    copia del material de fachada que, del lado de adentro de los vidrios, se ve como la pared interior. "Adentro" es
    la caja que forman los vidrios de la torre (desde su centro hasta el vidrio más lejano, en x y en y)
    """
    vidrios = []
    for o in todos:
        if o.type != "MESH" or not o.data.materials:
            continue
        idx = {i for i, m in enumerate(o.data.materials) if m and m.name in VIDRIOS}
        if idx:
            vidrios += [o.matrix_world @ o.data.vertices[i].co for p in o.data.polygons if p.material_index in idx
                        for i in p.vertices]
    m = original.copy()
    m.name = "_Fachada_Recorrido"
    if not vidrios:
        return m
    xs, ys = [v.x for v in vidrios], [v.y for v in vidrios]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    hx, hy = max(xs) - cx, max(ys) - cy
    nt = m.node_tree
    salida = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL" and n.is_active_output)
    enlace = salida.inputs["Surface"].links[0] if salida.inputs["Surface"].links else None
    pared = nt.nodes.new("ShaderNodeBsdfPrincipled")
    base = bpy.data.materials.get(PARED)
    if base:
        pared.inputs["Base Color"].default_value = base.diffuse_color
    pared.inputs["Roughness"].default_value = 0.8
    xyz = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(nt.nodes.new("ShaderNodeNewGeometry").outputs["Position"], xyz.inputs[0])

    def operar(op, a, b):
        n = nt.nodes.new("ShaderNodeMath")
        n.operation = op
        for k, v in enumerate((a, b)):
            if isinstance(v, (int, float)):
                n.inputs[k].default_value = v
            elif v is not None:
                nt.links.new(v, n.inputs[k])
        return n.outputs[0]

    def hasta_vidrio(eje, centro, mitad):
        return operar("SUBTRACT", operar("ABSOLUTE", operar("SUBTRACT", eje, centro), None), mitad)

    # distancia (negativa hacia adentro) a la caja de los vidrios
    d = operar("MAXIMUM", hasta_vidrio(xyz.outputs["X"], cx, hx), hasta_vidrio(xyz.outputs["Y"], cy, hy))
    adentro = operar("LESS_THAN", d, -0.02 / ESCALA)
    # lo que queda lejos de los vidrios no es fachada: son las cajas de las tiras que la iluminan de noche, metidas
    # en el cielorraso de las unidades. Desde adentro serían vigas: no se ven
    lejos = operar("LESS_THAN", d, -FACHADA_ESPESOR / ESCALA)
    mezcla = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(adentro, mezcla.inputs["Fac"])
    if enlace:
        nt.links.new(enlace.from_socket, mezcla.inputs[1])
    nt.links.new(pared.outputs[0], mezcla.inputs[2])
    invisible = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lejos, invisible.inputs["Fac"])
    nt.links.new(mezcla.outputs[0], invisible.inputs[1])
    nt.links.new(nt.nodes.new("ShaderNodeBsdfTransparent").outputs[0], invisible.inputs[2])
    nt.links.new(invisible.outputs[0], salida.inputs["Surface"])
    return m


def render_panorama(cambios, escena, cam, ruta, ancho):
    d = cam.data
    for attr, valor in (("type", "PANO"), ("panorama_type", "EQUIRECTANGULAR"), ("clip_start", 0.02 / ESCALA),
                        ("longitude_min", -math.pi), ("longitude_max", math.pi),
                        ("latitude_min", -math.pi / 2), ("latitude_max", math.pi / 2)):
        cambios.fijar(d, attr, valor)
    # nivelada: sólo se conserva hacia dónde mira (con giro (90°, 0, θ) la cámara mira a +Y rotado θ)
    f = cam.matrix_world.to_3x3() @ Vector((0, 0, -1))
    theta = math.atan2(-f.x, f.y)
    cambios.fijar(cam, "matrix_world", Matrix.Translation(cam.matrix_world.translation)
                  @ Matrix.Rotation(theta, 4, "Z") @ Matrix.Rotation(math.pi / 2, 4, "X"))
    cambios.fijar(escena.render, "resolution_x", ancho)
    cambios.fijar(escena.render, "resolution_y", ancho // 2)
    cambios.fijar(escena.render, "film_transparent", False)
    escena.camera = cam
    escena.render.filepath = ruta
    bpy.ops.render.render(write_still=True)


def cortar(o, z_corte):
    """
    copia temporal de la malla sin lo que queda por encima de z_corte, con la cara cortada tapada con MATERIAL_CORTE
    (lo mismo que renders_plantas.py: bisect y no Boolean, que con mallas abiertas devuelve basura)
    """
    dg = bpy.context.evaluated_depsgraph_get()
    malla = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    bm = bmesh.new()
    bm.from_mesh(malla)
    bm.transform(o.matrix_world)
    r = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                               plane_co=(0, 0, z_corte), plane_no=(0, 0, 1), clear_outer=True)
    mat = bpy.data.materials.get(MATERIAL_CORTE)
    if mat:
        bordes = [e for e in r["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        tapas = bmesh.ops.holes_fill(bm, edges=bordes, sides=0)["faces"]
        if tapas:
            malla.materials.append(mat)
            for f in tapas:
                f.material_index = len(malla.materials) - 1
    bm.to_mesh(malla)
    bm.free()
    copia = bpy.data.objects.new(f"_Corte_{o.name}", malla)
    bpy.context.scene.collection.objects.link(copia)
    return copia


def render_plano(cambios, escena, todos, centro, lado, z_corte, ruta, lado_px):
    """
    Vista cenital ortográfica de la unidad cortada a z_corte: lo de arriba se oculta y lo que atraviesa el corte se
    reemplaza por una copia recortada. Lo que está por debajo del piso también se oculta: afuera de la unidad queda
    transparente y la web pone el fondo del tema.
    """
    z_piso = z_corte - 1.6 / ESCALA
    cerca = lado * 1.5  # sólo se corta lo que cae cerca de la unidad; lo lejano está abajo o arriba y se oculta
    copias = []
    fuera = {o for n in OCULTAR_PLANO if n in bpy.data.collections for o in objetos_de(bpy.data.collections[n])}
    for o in todos:
        if o.hide_render or o.type in ("LIGHT", "CAMERA"):
            continue
        if o in fuera or o.name.startswith(tuple(OCULTAR_PLANO)):
            cambios.fijar(o, "hide_render", True)
            continue
        x0, y0, z0, x1, y1, z1 = caja(o)
        if z0 >= z_corte or z1 < z_piso - 0.5 / ESCALA:
            cambios.fijar(o, "hide_render", True)
        elif z1 > z_corte:
            lejos = x1 < centro.x - cerca or x0 > centro.x + cerca or y1 < centro.y - cerca or y0 > centro.y + cerca
            if o.type == "MESH" and not lejos:
                copias.append(cortar(o, z_corte))
            cambios.fijar(o, "hide_render", True)
    datos = bpy.data.cameras.new("_Plano_Recorrido")
    datos.type, datos.ortho_scale = "ORTHO", lado
    datos.clip_start, datos.clip_end = 0.001, 1000 / ESCALA
    cam = bpy.data.objects.new("_Plano_Recorrido", datos)
    escena.collection.objects.link(cam)
    cam.location = (centro.x, centro.y, z_corte + 1 / ESCALA)  # mirando hacia abajo, con el norte arriba
    try:
        cambios.fijar(escena.render, "resolution_x", lado_px)
        cambios.fijar(escena.render, "resolution_y", lado_px)
        cambios.fijar(escena.render, "film_transparent", True)
        escena.camera = cam
        escena.render.filepath = ruta
        bpy.ops.render.render(write_still=True)
    finally:
        for c in copias:
            malla = c.data
            bpy.data.objects.remove(c)
            bpy.data.meshes.remove(malla)
        bpy.data.objects.remove(cam)
        bpy.data.cameras.remove(datos)


# ---------------------------------------------------------------- principal
def configurar(primera):
    """lo propio del proyecto va como propiedades de la primera cámara"""
    global ESCALA, EXPOSICION, OCULTAR_COLECCIONES, HDRI, HDRI_GIRO, HDRI_FUERZA, SOL, SOL_RUMBO, SOL_ALTURA
    ESCALA = float(primera.get("escala", ESCALA))
    EXPOSICION = float(primera.get("exposicion", EXPOSICION))
    if primera.get("ocultar"):
        OCULTAR_COLECCIONES = tuple(c.strip() for c in str(primera["ocultar"]).split(",") if c.strip())
    HDRI = str(primera.get("hdri", HDRI))
    HDRI_GIRO = float(primera.get("hdri_giro", HDRI_GIRO))
    HDRI_FUERZA = float(primera.get("hdri_fuerza", HDRI_FUERZA))
    if "sol" in primera:
        SOL = float(primera["sol"])
    if "sol_rumbo" in primera:
        SOL_RUMBO = float(primera["sol_rumbo"])
    if "sol_altura" in primera:
        SOL_ALTURA = float(primera["sol_altura"])
    global HACES, POLVO, AIRE_CAJA
    HACES = float(primera.get("haces", HACES))
    POLVO = float(primera.get("polvo", POLVO))
    if primera.get("aire_caja"):
        AIRE_CAJA = tuple(float(v) for v in str(primera["aire_caja"]).split(","))


def ocultar_sobrantes(cambios, todos):
    """las cajas de unidad envuelven a la cámara: se ocultan siempre, igual que lo que no va en estos renders"""
    sobran = {o for n in OCULTAR_COLECCIONES if n in bpy.data.collections for o in objetos_de(bpy.data.collections[n])}
    for o in todos:
        if o.get("tipo") == "unidad" or o.name.startswith(tuple(OCULTAR)) or (o in sobran and o.type != "LIGHT"):
            cambios.fijar(o, "hide_render", True)


def main():
    pedidos, puntos_pedidos, solo_datos, sin_plano, prueba = leer_argumentos()
    escena = bpy.context.scene
    recorridos = puntos_de_escena(pedidos)
    if not recorridos:
        raise RuntimeError(f"No hay cámaras '{PREFIJO}_<recorrido>_<punto>'. Crealas a mano o con interior_tipo.py "
                           "(RECORRIDO = '5A'); ver docs/renders-recorrido.md.")
    configurar(next(iter(recorridos.values()))[0][1])

    todos = list(bpy.data.objects)
    unidades = [o for o in todos if o.get("tipo") == "unidad" and o.type == "MESH"]
    ancho = ANCHO // 4 if prueba else ANCHO
    lado_px = LADO_PLANO // 2 if prueba else LADO_PLANO
    camara_antes = escena.camera
    filepath_antes = escena.render.filepath
    cambios = Cambios()
    print(f"\n=== Recorridos 360 · {', '.join(recorridos)} · {ancho}×{ancho // 2} ===")
    try:
        ocultar_sobrantes(cambios, todos)
        opacos = bvh_de([o for o in todos if o.type == "MESH" and not o.hide_render and o.visible_get()])
        if not solo_datos:
            preparar_render(cambios, escena, prueba)
            preparar_ambiente(cambios, escena, todos)

        for recorrido, puntos in recorridos.items():
            carpeta = os.path.join(bpy.path.abspath(SALIDA), recorrido)
            os.makedirs(carpeta, exist_ok=True)
            centro, lado, unidad = encuadre(puntos, unidades)
            enlaces = enlaces_de(puntos, opacos)
            manifest = {
                "recorrido": recorrido,
                "nombre": str(puntos[0][1].get("nombre", recorrido.replace("-", " ").capitalize())),
                "unidad": str(unidad.get("unidad", "")) if unidad else "",
                "plano": "plano.webp" if not sin_plano or os.path.exists(os.path.join(carpeta, "plano.webp")) else None,
                "ancho": ancho,
                "alto": ancho // 2,
                "puntos": [],
            }
            for clave, cam in puntos:
                p = cam.matrix_world.translation
                manifest["puntos"].append({
                    "clave": clave,
                    "titulo": str(cam.get("titulo", clave.replace("-", " ").capitalize())),
                    "rumbo": rumbo_de(cam),
                    "panorama": f"{clave}.webp",
                    # % del plano, con y hacia abajo (norte arriba), como los carga el admin
                    "x": round((p.x - (centro.x - lado / 2)) / lado * 100, 2),
                    "y": round(((centro.y + lado / 2) - p.y) / lado * 100, 2),
                    "enlaces": enlaces[clave],
                })
                print(f"  {recorrido}/{clave}: rumbo {rumbo_de(cam):g}° → {', '.join(enlaces[clave]) or '—'}")
            if not solo_datos:
                sacar_aire = aire_con_luz([c for _, c in puntos])
                cambios.deshacer.append(sacar_aire)  # si se corta a mitad de la tanda
                for clave, cam in puntos:
                    if puntos_pedidos and clave not in puntos_pedidos:
                        continue
                    render_panorama(cambios, escena, cam, os.path.join(carpeta, f"{clave}.webp"), ancho)
                sacar_aire()  # el plano se ve desde arriba: sin bruma
                if not sin_plano:
                    z_corte = min(c.matrix_world.translation.z for _, c in puntos) - ALTURA_CORTE / ESCALA
                    render_plano(cambios, escena, todos, centro, lado, z_corte, os.path.join(carpeta, "plano.webp"),
                                 lado_px)
            with open(os.path.join(carpeta, "recorrido.json"), "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)
            print(f"  → {carpeta}")
    finally:
        cambios.restaurar()
        escena.camera = camara_antes
        escena.render.filepath = filepath_antes
    print("Listo\n")


if __name__ == "__main__":
    main()
