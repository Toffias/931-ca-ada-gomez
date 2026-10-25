"""
Modelo de Cañada de Gómez 931 armado desde los planos y renders del cliente (docs/referencias/).
Fase B de docs/plan-renders-931.md. Las cámaras Ref_* están calzadas sobre las fotos del cliente.

Uso: en un .blend vacío, Scripting → abrir este archivo → Run Script. Con el MCP:
    exec(open(r"<repo>/scripts/blender/modelar_ca931.py").read(), {"__file__": r"<repo>/scripts/blender/modelar_ca931.py"})
Rehace sus colecciones (WEB, Referencias, Render) cada vez que corre: no toca nada más de la escena.
Después: scripts/blender/exportar_web.py exporta WEB a //web/edificio.glb.

Ejes de Blender: X = este, Y = norte, Z arriba, metros. La línea municipal es y = 0, el edificio va hacia +Y
(contrafrente) y la calle hacia -Y (frente al sur, a confirmar). Desde la vereda, la izquierda es -X: ahí va el
3 ambientes (A) y a la derecha el 2 ambientes (B).
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

REPO = os.path.abspath(os.path.join(os.path.dirname(globals().get("__file__", "C:/931-ca-ada-gomez/scripts/blender/x.py")), "..", ".."))
REFERENCIAS = os.path.join(REPO, "docs", "referencias")

# ---------------------------------------------------------------- medidas del plano (opción 2)
ANCHO = 8.66           # frente
X0, X1 = -ANCHO / 2, ANCHO / 2
FONDO = 15.70          # edificado
PATIO = 4.00
BALCON = 1.40          # vuelo de balcones sobre la vereda
# alturas: no están en el plano; medidas sobre fachada-dia-desde-izquierda con la cámara calzada (a confirmar)
ALTO_PB = 3.30
ALTO_PISO = 2.75
PISOS = 4
PRETIL = 1.35          # remate: del nivel de azotea al borde superior
LOSA = 0.25            # media losa (el canto se ve de ~0,5 m en los renders)
# adentro la losa baja sólo 10 cm de su nivel (cielorraso a 2,40 en los pisos): el canto grueso queda en la fachada
# y en vigas perimetrales sobre el frente y el contrafrente
LOSA_CIELO = 0.10
# franja de listones: en la foto cae a la derecha del centro (x 0,7–1,7 proyectando sus bordes sobre la fachada);
# el plano dice 3,50 + 1,36 + 3,50 simétrico. Se sigue la imagen, a confirmar con el cliente.
MAD_I, MAD_D = 0.70, 1.70
# esquina izquierda: el balcón del 3 ambientes y el voladizo del remate no llegan al borde, dejan 50 cm de pared de
# fachada al ras; esa esquina va en gris oscuro de arriba a abajo, en el frente y en una franja del lateral (fotos)
ALETA = 0.5
ALETA_DER = 0.35   # lo mismo en la esquina derecha: el balcón crema del 2 ambientes y el remate terminan 35 cm antes
ANTEPECHO = 0.12   # espesor del antepecho macizo crema del balcón del 2 ambientes
VIDRIO_Y = 0.40        # retiro de los ventanales detrás de la línea municipal
ESQUINA_FONDO = VIDRIO_Y + 1.2   # hasta dónde llega el gris oscuro de la esquina por el lateral
BANDA_FONDO = 1.2                # lo mismo en la esquina del contrafrente (las fotos lo muestran en los dos laterales)
TECHO = ALTO_PB + PISOS * ALTO_PISO
# interiores fotorrealistas para los renders (vestir_ca931.py: texturas y muebles de Poly Haven, fuera del repo, con
# scripts/blender/bajar_assets_interior.py). Sin los assets queda el interior en cajas
VESTIR = True

# ---------------------------------------------------------------- materiales (colores con cuentagotas de las referencias)
MATERIALES = {
    # gris de losas y balcones del 3 ambientes; el visor no le pone textura (no dice Fachada)
    "WEB_Revoque_Gris": dict(color=(0.17, 0.16, 0.15), rug=0.85),
    # pared del frente detrás de los balcones: queda en la sombra del voladizo, va más clara que los cantos para
    # leerse gris medio como en las fotos (si no se confunde con el vidrio)
    "WEB_Revoque_Muro": dict(color=(0.3, 0.285, 0.265), rug=0.85),
    # laterales y medianeras: gris claro
    "WEB_Revoque_Claro": dict(color=(0.36, 0.34, 0.31), rug=0.9),
    # piso del balcón del 2 ambientes (cerámico gris claro)
    "WEB_Piso_Balcon": dict(color=(0.42, 0.41, 0.39), rug=0.7),
    # antepechos del 2 ambientes y PB: crema (el visor le aplica revoque triplanar)
    "WEB_Fachada_Crema": dict(color=(0.70, 0.62, 0.48), rug=0.85),
    "WEB_Cielorraso": dict(color=(0.66, 0.63, 0.58), rug=0.9),
    "WEB_Madera_Listones": dict(color=(0.42, 0.26, 0.13), rug=0.65),
    "WEB_Piedra_Negra": dict(color=(0.035, 0.035, 0.035), rug=0.55),
    "WEB_Metal_Negro": dict(color=(0.015, 0.015, 0.015), rug=0.35, metal=0.7),
    "WEB_Metal_Acero": dict(color=(0.75, 0.75, 0.74), rug=0.25, metal=1.0),
    "WEB_Vidrio": dict(color=(0.03, 0.04, 0.05), rug=0.05),
    "WEB_Vidrio_Baranda": dict(color=(0.55, 0.65, 0.68), rug=0.03, alfa=0.25),
    # spots y LED: el visor los apaga de día y los prende de noche (regla /Farol/ de convenciones.ts)
    # el visor multiplica la emisión ×6 de noche: con más fuerza el bloom quema los cielorrasos
    "WEB_Farol_Spot": dict(color=(1.0, 0.85, 0.65), emision=(1.0, 0.78, 0.52), fuerza=2),
    "WEB_Farol_LED": dict(color=(1.0, 0.8, 0.55), emision=(1.0, 0.72, 0.42), fuerza=1),
    # vidrios de PB (ventanal detrás de los listones, puerta del hall): brillo cálido de noche (regla /Vidrio_Local/)
    "WEB_Vidrio_Local": dict(color=(0.05, 0.05, 0.05), rug=0.05),
    "WEB_Maceta": dict(color=(0.42, 0.42, 0.42), rug=0.8),
    "WEB_Planta": dict(color=(0.09, 0.2, 0.06), rug=0.8),
    "WEB_Fachada_Vecinos": dict(color=(0.58, 0.52, 0.42), rug=0.9),
    "WEB_Techo_Vecinos": dict(color=(0.07, 0.09, 0.09), rug=0.6),
    "WEB_Porton_Negro": dict(color=(0.03, 0.03, 0.03), rug=0.5),
    "WEB_Porton_Madera": dict(color=(0.35, 0.16, 0.07), rug=0.6),
    "WEB_Balaustrada": dict(color=(0.92, 0.9, 0.85), rug=0.8),
    "WEB_Arbol_Copa": dict(color=(0.12, 0.2, 0.05), rug=0.9),
    "WEB_Arbol_Tronco": dict(color=(0.2, 0.15, 0.1), rug=0.9),
    "WEB_Patio": dict(color=(0.22, 0.3, 0.12), rug=0.95),
    "WEB_Vereda": dict(color=(0.58, 0.57, 0.55), rug=0.9),
    "WEB_Cordon": dict(color=(0.5, 0.5, 0.48), rug=0.9),
    "WEB_Asfalto": dict(color=(0.12, 0.12, 0.12), rug=0.95),
}


def material(nombre):
    m = bpy.data.materials.get(nombre)
    if m:
        return m
    d = MATERIALES[nombre]
    m = bpy.data.materials.new(nombre)
    if bpy.app.version < (5, 0, 0):
        m.use_nodes = True
    nodos = m.node_tree.nodes
    p = next((n for n in nodos if n.type == "BSDF_PRINCIPLED"), None)
    if p is None:  # Blender 5: el material nuevo puede venir sin árbol armado
        nodos.clear()
        p = nodos.new("ShaderNodeBsdfPrincipled")
        salida = nodos.new("ShaderNodeOutputMaterial")
        m.node_tree.links.new(p.outputs[0], salida.inputs["Surface"])
    p.inputs["Base Color"].default_value = (*d["color"], 1)
    p.inputs["Roughness"].default_value = d.get("rug", 0.5)
    p.inputs["Metallic"].default_value = d.get("metal", 0)
    if "emision" in d:
        p.inputs["Emission Color"].default_value = (*d["emision"], 1)
        p.inputs["Emission Strength"].default_value = d["fuerza"]
    if "alfa" in d:
        p.inputs["Alpha"].default_value = d["alfa"]
        m.surface_render_method = "BLENDED"
    m.diffuse_color = (*d["color"], d.get("alfa", 1))
    return m


# ---------------------------------------------------------------- colecciones
def coleccion(nombre, padre=None):
    c = bpy.data.collections.new(nombre)
    (padre or bpy.context.scene.collection).children.link(c)
    return c


def borrar_coleccion(nombre):
    c = bpy.data.collections.get(nombre)
    if not c:
        return
    for h in list(c.children_recursive):
        for o in list(h.objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(h)
    for o in list(c.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(c)


# ---------------------------------------------------------------- geometría
class Malla:
    """Junta cajas, cilindros y esferas en una sola malla con varios materiales (menos objetos y draw calls)."""

    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    def _indice(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _marcar(self, geom, mat):
        i = self._indice(mat)
        for f in {f for v in geom if isinstance(v, bmesh.types.BMVert) for f in v.link_faces}:
            f.material_index = i

    def caja(self, mat, x, y, z):
        centro = Vector(((x[0] + x[1]) / 2, (y[0] + y[1]) / 2, (z[0] + z[1]) / 2))
        escala = Matrix.Diagonal((x[1] - x[0], y[1] - y[0], z[1] - z[0], 1))
        r = bmesh.ops.create_cube(self.bm, size=1, matrix=Matrix.Translation(centro) @ escala)
        self._marcar(r["verts"], mat)

    def cilindro(self, mat, x, y, z0, z1, radio, lados=10):
        m = Matrix.Translation((x, y, (z0 + z1) / 2))
        r = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=lados, radius1=radio, radius2=radio * 0.85,
                                  depth=z1 - z0, matrix=m)
        self._marcar(r["verts"], mat)

    def esfera(self, mat, x, y, z, radio, achatar=1.0):
        m = Matrix.Translation((x, y, z)) @ Matrix.Diagonal((radio, radio, radio * achatar, 1))
        r = bmesh.ops.create_icosphere(self.bm, subdivisions=1, radius=1, matrix=m)
        self._marcar(r["verts"], mat)

    def prisma_techo(self, mat, x, y, z0, z1, hacia=-1):
        """techo a un agua: alto en el fondo (y[1]) y bajo hacia la calle"""
        bm = self.bm
        pts = [(x[0], y[0], z0), (x[1], y[0], z0), (x[1], y[1], z0), (x[0], y[1], z0),
               (x[0], y[1], z1), (x[1], y[1], z1)]
        vs = [bm.verts.new(p) for p in pts]
        caras = [(0, 1, 2, 3), (0, 3, 4), (1, 5, 2), (0, 4, 5, 1), (3, 2, 5, 4)]
        i = self._indice(mat)
        for c in caras:
            f = bm.faces.new([vs[k] for k in c])
            f.material_index = i

    def objeto(self, nombre, col, extras=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        # UV por proyección de caja en metros: las texturas de vestir_ca931.py calzan a escala real
        # en las caras verticales la U va hacia arriba: las vetas del revoque y de la madera quedan verticales
        uv = self.bm.loops.layers.uv.new("UVMap")
        for f in self.bm.faces:
            eje = max(range(3), key=lambda i: abs(f.normal[i]))
            a, b = [(1, 2), (0, 2), (0, 1)][eje]
            for loop in f.loops:
                co = loop.vert.co
                loop[uv].uv = (co[b], co[a]) if eje != 2 else (co[a], co[b])
        me = bpy.data.meshes.new(nombre)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(material(m))
        o = bpy.data.objects.new(nombre, me)
        col.objects.link(o)
        for k, v in (extras or {}).items():
            o[k] = v
        return o


def maceta_con_planta(m, x, y, z):
    m.cilindro("WEB_Maceta", x, y, z, z + 0.45, 0.22)
    m.esfera("WEB_Planta", x, y, z + 0.8, 0.32, 1.3)
    m.esfera("WEB_Planta", x + 0.15, y - 0.05, z + 1.05, 0.22, 1.4)


def listones(m, mat, x0, x1, y0, y1, z0, z1, ancho=0.06, paso=0.11):
    x = x0
    while x + ancho <= x1 + 1e-6:
        m.caja(mat, (x, x + ancho), (y0, y1), (z0, z1))
        x += paso


def carpinteria(m, x0, x1, z0, z1, paños):
    """ventanal con parantes negros cada `paños` y marco"""
    m.caja("WEB_Vidrio", (x0, x1), (VIDRIO_Y - 0.02, VIDRIO_Y + 0.02), (z0, z1))
    for i in range(paños + 1):
        x = x0 + (x1 - x0) * i / paños
        m.caja("WEB_Metal_Negro", (x - 0.03, x + 0.03), (VIDRIO_Y - 0.05, VIDRIO_Y), (z0, z1))
    for z in (z0, z1):
        m.caja("WEB_Metal_Negro", (x0, x1), (VIDRIO_Y - 0.05, VIDRIO_Y), (z - 0.03, z + 0.03))


def frente(m, x0, x1, paños, z0, z1):
    """muro de fachada gris entre x0 y x1 con carpinterías (xa, xb, hojas) de piso a techo"""
    x = x0
    for xa, xb, hojas in paños:
        if xa > x:
            m.caja("WEB_Revoque_Muro", (x, xa), (VIDRIO_Y - 0.05, VIDRIO_Y + 0.2), (z0, z1))
        carpinteria(m, xa, xb, z0, z1, hojas)
        x = xb
    if x1 > x:
        m.caja("WEB_Revoque_Muro", (x, x1), (VIDRIO_Y - 0.05, VIDRIO_Y + 0.2), (z0, z1))


def muro_con_huecos(m, mat, x0, x1, y0, y1, z0, z1, huecos):
    """muro a lo largo de X con ventanas (xa, xb, za, zb): queda hueco, como para verlo cortado desde arriba"""
    x = x0
    for xa, xb, za, zb in sorted(huecos):
        m.caja(mat, (x, xa), (y0, y1), (z0, z1))
        m.caja(mat, (xa, xb), (y0, y1), (z0, za))
        m.caja(mat, (xa, xb), (y0, y1), (zb, z1))
        m.caja("WEB_Vidrio", (xa, xb), ((y0 + y1) / 2 - 0.01, (y0 + y1) / 2 + 0.01), (za, zb))
        x = xb
    m.caja(mat, (x, x1), (y0, y1), (z0, z1))


def esquina(m, z0, z1):
    """frente del tramo sin balcón de la esquina izquierda, en gris oscuro"""
    # arranca en la cara de la medianera: las cajas no se enciman (dos caras coplanares salen manchadas en Cycles)
    m.caja("WEB_Revoque_Gris", (X0 + 0.15, X0 + ALETA), (VIDRIO_Y - 0.05, VIDRIO_Y + 0.2), (z0, z1))
    m.caja("WEB_Revoque_Gris", (X1 - ALETA_DER, X1 - 0.15), (VIDRIO_Y - 0.05, VIDRIO_Y + 0.2), (z0, z1))


def laterales(m, z0, z1):
    """medianeras de piso a piso: gris oscuro en las cuatro esquinas (franjas verticales), gris claro en el medio"""
    for x in ((X0, X0 + 0.15), (X1 - 0.15, X1)):
        m.caja("WEB_Revoque_Gris", x, (VIDRIO_Y - 0.05, ESQUINA_FONDO), (z0, z1))
        m.caja("WEB_Revoque_Claro", x, (ESQUINA_FONDO, FONDO - BANDA_FONDO), (z0, z1))
        m.caja("WEB_Revoque_Gris", x, (FONDO - BANDA_FONDO, FONDO), (z0, z1))


def cascara(m, mat, y_frente, z0, z1, ventanas, con_laterales=True):
    """medianeras y contrafrente con espesor (el interior queda libre para los renders de plantas)"""
    if con_laterales:
        m.caja(mat, (X0, X0 + 0.15), (y_frente, FONDO), (z0, z1))
        m.caja(mat, (X1 - 0.15, X1), (y_frente, FONDO), (z0, z1))
    muro_con_huecos(m, mat, X0 + 0.15, X1 - 0.15, FONDO - 0.2, FONDO, z0, z1, ventanas)


def vigas(m, y_frente, z):
    """vigas perimetrales bajo la losa del nivel z: tapan la junta entre la losa fina de adentro y los muros"""
    for y in ((y_frente, VIDRIO_Y + 0.4), (FONDO - 0.35, FONDO)):
        m.caja("WEB_Revoque_Claro", (X0 + 0.15, X1 - 0.15), y, (z - LOSA, z - LOSA_CIELO))


def spots(m, x0, x1, y, z, n):
    for i in range(n):
        x = x0 + (x1 - x0) * (i + 0.5) / n
        m.caja("WEB_Farol_Spot", (x - 0.06, x + 0.06), (y - 0.06, y + 0.06), (z - 0.01, z))


# ---------------------------------------------------------------- edificio
def planta_baja(col):
    m = Malla()
    # platea bajo el piso terminado: así el nivel más bajo de Piso_00 queda 0,5 m por debajo, como en los pisos
    # (la losa de cada piso baja 0,25 de su nivel nominal y su piso terminado está 0,25 arriba)
    m.caja("WEB_Revoque_Claro", (X0, X1), (0.0, FONDO), (-0.5, 0.0))
    # contrafrente: puerta-ventana del estar al patio y ventana del dormitorio 3
    cascara(m, "WEB_Fachada_Crema", 0.6, 0, ALTO_PB, [(X0 + 0.4, X0 + 3.2, 0.05, 2.4), (X1 - 2.6, X1 - 0.6, 0.9, 2.4)])
    # cierres del frente entre ventanal, columna y acceso
    m.caja("WEB_Fachada_Crema", (0.05, 0.15), (0.45, 0.6), (0, ALTO_PB))
    m.caja("WEB_Fachada_Crema", (0.98, 1.05), (0.6, 2.3), (0, ALTO_PB))
    m.caja("WEB_Fachada_Crema", (2.35, 2.45), (0.6, 2.3), (0, ALTO_PB))
    # izquierda: ventanal de los dormitorios detrás de listones negros, con jardinera baja
    m.caja("WEB_Vidrio_Local", (X0 + 0.25, 0.05), (0.55, 0.6), (0.45, ALTO_PB - 0.3))
    m.caja("WEB_Revoque_Gris", (X0 + 0.15, 0.15), (0.05, 0.6), (0, 0.4))
    for x in (X0 + 1.5, X0 + 3.0):
        m.esfera("WEB_Planta", x, 0.3, 0.55, 0.3, 0.8)
    listones(m, "WEB_Metal_Negro", X0 + 0.2, 0.1, 0.0, 0.08, 0.4, ALTO_PB - 0.2, ancho=0.08, paso=0.19)
    m.caja("WEB_Revoque_Gris", (X0, X0 + 0.2), (0, 0.6), (0, ALTO_PB))
    # columna de piedra negra con el 931 (los números van aparte); posiciones medidas en la foto
    m.caja("WEB_Piedra_Negra", (0.15, 1.05), (-0.1, 0.6), (0, ALTO_PB))
    # acceso retirado con hall cálido
    m.caja("WEB_Fachada_Crema", (1.05, 2.35), (2.2, 2.3), (0, ALTO_PB))
    m.caja("WEB_Cielorraso", (1.05, 2.35), (0, 2.3), (ALTO_PB - 0.3, ALTO_PB - 0.25))
    m.caja("WEB_Farol_Spot", (1.55, 1.85), (1.0, 1.3), (ALTO_PB - 0.31, ALTO_PB - 0.3))
    m.caja("WEB_Metal_Negro", (1.25, 2.15), (2.1, 2.2), (0, 2.3))
    m.caja("WEB_Vidrio_Local", (1.33, 2.07), (2.08, 2.1), (0.05, 2.22))
    # panel de listones de madera y pilar
    m.caja("WEB_Revoque_Gris", (2.35, X1 - 0.4), (0.0, 0.6), (0, ALTO_PB))
    listones(m, "WEB_Madera_Listones", 2.4, X1 - 0.45, -0.05, 0.0, 0.0, ALTO_PB - 0.25)
    m.caja("WEB_Fachada_Crema", (X1 - 0.4, X1), (-0.1, 0.6), (0, ALTO_PB))
    return m.objeto("Piso_00", col, {"tipo": "piso", "piso": 0})


def piso(col, n):
    z0 = ALTO_PB + (n - 1) * ALTO_PISO
    z1 = z0 + ALTO_PISO
    m = Malla()
    # contrafrente: una ventana por dormitorio (principal y 2 del 3 ambientes, el del 2 ambientes)
    cascara(m, "WEB_Revoque_Claro", VIDRIO_Y + 0.02, z0 + LOSA, z1 - LOSA,
            [(X0 + 0.6, X0 + 2.6, z0 + 0.9, z1 - 0.4), (X0 + 3.6, X0 + 5.2, z0 + 0.9, z1 - 0.4),
             (X1 - 2.4, X1 - 0.6, z0 + 0.9, z1 - 0.4)], con_laterales=False)
    # los laterales van de piso a piso (cubren el canto de la losa): así las franjas grises de las esquinas son
    # continuas de arriba a abajo
    laterales(m, z0 - LOSA, z1 - LOSA)
    esquina(m, z0 - LOSA, z1 - LOSA)
    # losa en todo el fondo, entre medianeras (si no, se ve la caja de la unidad por la rendija)
    m.caja("WEB_Revoque_Claro", (X0 + 0.15, X1 - 0.15), (VIDRIO_Y + 0.1, FONDO), (z0 - LOSA_CIELO, z0 + LOSA))
    vigas(m, VIDRIO_Y + 0.1, z0)
    # losa: canto gris del lado del 3 ambientes, con cielorraso claro y spots
    xa = X0 + ALETA
    m.caja("WEB_Revoque_Gris", (xa, MAD_I), (-BALCON, VIDRIO_Y + 0.1), (z0 - LOSA, z0 + LOSA))
    m.caja("WEB_Cielorraso", (xa, MAD_I), (-BALCON + 0.05, VIDRIO_Y), (z0 - LOSA - 0.005, z0 - LOSA))
    m.caja("WEB_Farol_LED", (xa, MAD_I), (-BALCON - 0.005, -BALCON), (z0 - LOSA + 0.02, z0 - LOSA + 0.05))
    # frente del 3 ambientes, medido en las fotos (y coincide con el plano): ventanal corredizo del estar, pared,
    # ventana angosta de la cocina y pared hasta la franja de madera
    # proporciones de la foto sobre el tramo con balcón: ventanal 45 %, pared 22 %, ventana 12 %, pared 19 %
    paños_a = [(xa + 0.1, -1.45, 2), (-0.55, -0.05, 1)]
    frente(m, xa, MAD_I, paños_a, z0 + LOSA, z1 - LOSA)
    # baranda de vidrio con pasamanos y parantes negros, macetas en los extremos
    yb = -BALCON + 0.06
    m.caja("WEB_Vidrio_Baranda", (xa + 0.03, MAD_I - 0.05), (yb - 0.01, yb + 0.01), (z0 + LOSA, z0 + LOSA + 1.0))
    m.caja("WEB_Metal_Negro", (xa, MAD_I - 0.05), (yb - 0.025, yb + 0.025), (z0 + LOSA + 0.98, z0 + LOSA + 1.03))
    for i in range(5):
        x = xa + 0.03 + (MAD_I - 0.08 - xa) * i / 4
        m.caja("WEB_Metal_Negro", (x - 0.02, x + 0.02), (yb - 0.02, yb + 0.02), (z0 + LOSA, z0 + LOSA + 1.0))
    maceta_con_planta(m, xa + 0.4, -BALCON + 0.4, z0 + LOSA)
    maceta_con_planta(m, MAD_I - 0.45, -BALCON + 0.4, z0 + LOSA)
    # franja de listones de madera
    m.caja("WEB_Revoque_Gris", (MAD_I, MAD_D), (0.1, VIDRIO_Y + 0.1), (z0 - LOSA, z1 - LOSA))
    listones(m, "WEB_Madera_Listones", MAD_I + 0.02, MAD_D - 0.02, -0.2, 0.1, z0 - LOSA, z1 - LOSA)
    # 2 ambientes: antepecho macizo crema que vuela sobre la vereda
    # (termina 35 cm antes de la esquina derecha, como en las fotos: ahí sigue la pared gris oscuro)
    xb = X1 - ALETA_DER
    # losa con antepecho de 12 cm al frente y a los costados: el balcón es transitable (desde la calle se ve igual)
    m.caja("WEB_Fachada_Crema", (MAD_D, xb), (-BALCON, VIDRIO_Y + 0.1), (z0 - LOSA, z0 + LOSA - 0.02))
    m.caja("WEB_Piso_Balcon", (MAD_D + ANTEPECHO, xb - ANTEPECHO), (-BALCON + ANTEPECHO, VIDRIO_Y - 0.05),
           (z0 + LOSA - 0.02, z0 + LOSA))
    ante = z0 + LOSA + 1.0
    m.caja("WEB_Fachada_Crema", (MAD_D, xb), (-BALCON, -BALCON + ANTEPECHO), (z0 + LOSA - 0.02, ante))
    for x in ((MAD_D, MAD_D + ANTEPECHO), (xb - ANTEPECHO, xb)):
        m.caja("WEB_Fachada_Crema", x, (-BALCON + ANTEPECHO, VIDRIO_Y - 0.05), (z0 + LOSA - 0.02, ante))
    m.caja("WEB_Cielorraso", (MAD_D + 0.05, xb - 0.05), (-BALCON + 0.05, VIDRIO_Y), (z0 - LOSA - 0.005, z0 - LOSA))
    spots(m, MAD_D + 0.3, xb - 0.3, -BALCON / 2, z0 - LOSA - 0.005, 2)
    # frente del 2 ambientes: pared junto a la madera y ventanal de dos hojas del estar
    frente(m, MAD_D, xb, [(2.45, xb - 0.1, 2)], z0 + LOSA, z1 - LOSA)
    m.esfera("WEB_Planta", X1 - 0.6, -BALCON + ANTEPECHO / 2, z0 + LOSA + 1.05, 0.25, 0.7)
    # spots del cielorraso del 3 ambientes
    spots(m, xa + 0.3, MAD_I - 0.4, -BALCON / 2, z0 - LOSA - 0.005, 3)
    return m.objeto(f"Piso_0{n}", col, {"tipo": "piso", "piso": n})


def remate(col):
    m = Malla()
    xa, z = X0 + ALETA, (TECHO - LOSA, TECHO + PRETIL)
    # voladizo gris (deja libre la esquina, como los balcones), la esquina en gris y el resto del bloque en el gris
    # claro del lateral: si no, arriba del lateral se lee una banda oscura horizontal
    xb = X1 - ALETA_DER
    m.caja("WEB_Revoque_Gris", (xa, xb), (-BALCON - 0.1, VIDRIO_Y - 0.05), z)
    zi = (TECHO - LOSA_CIELO, z[1])
    m.caja("WEB_Revoque_Gris", (X0 + 0.15, X1 - 0.15), (VIDRIO_Y + 0.2, ESQUINA_FONDO), zi)
    esquina(m, *z)
    laterales(m, *z)
    m.caja("WEB_Revoque_Claro", (X0 + 0.15, X1 - 0.15), (ESQUINA_FONDO, FONDO), zi)
    vigas(m, VIDRIO_Y + 0.2, TECHO)
    m.caja("WEB_Revoque_Gris", (xa, xb), (VIDRIO_Y - 0.05, VIDRIO_Y + 0.2), z)
    m.caja("WEB_Cielorraso", (xa, xb), (-BALCON - 0.05, VIDRIO_Y - 0.05), (TECHO - LOSA - 0.005, TECHO - LOSA))
    m.caja("WEB_Farol_LED", (xa, MAD_I), (-BALCON - 0.105, -BALCON - 0.1), (TECHO - LOSA + 0.02, TECHO - LOSA + 0.05))
    spots(m, xa + 0.3, MAD_I - 0.4, -BALCON / 2, TECHO - LOSA - 0.005, 3)
    spots(m, MAD_D + 0.3, xb - 0.3, -BALCON / 2, TECHO - LOSA - 0.005, 2)
    # entre medianeras: los laterales no van como fachadas en Disponibilidad
    # sin bañadores de noche en el visor: alumbrarían de abajo los cielorrasos de los balcones (en las fotos del
    # cliente la fachada se ve por sus spots y tiras LED)
    return m.objeto("Techo", col, {"tipo": "techo", "medianeras": "este,oeste", "banadores": False})


def numero_931(col):
    cu = bpy.data.curves.new("Numero_931", "FONT")
    cu.body = "9\n3\n1"
    cu.align_x = "CENTER"
    cu.size = 0.42
    cu.space_line = 1.1
    cu.extrude = 0.008
    tmp = bpy.data.objects.new("tmp_931", cu)
    col.objects.link(tmp)
    tmp.location = (0.6, -0.11, 2.7)
    tmp.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    me.materials.append(material("WEB_Metal_Acero"))
    o = bpy.data.objects.new("Numero_931", me)
    o.matrix_world = tmp.matrix_world
    col.objects.link(o)
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)
    return o


def unidades(col):
    """
    Cajas invisibles en la web. Siguen la planta del cliente (en L, sin el núcleo común: palier, ascensor,
    escalera, hall y portería), así la máscara de las plantas calza, y llegan hasta el filo del balcón para que la de
    Disponibilidad cubra el frente. Piezas en coordenadas de plano: (d0, d1, a0, a1), d desde la línea municipal y
    a desde la medianera izquierda (ver interior_ca931.py).
    """
    def caja(codigo, n, piezas, z, orientacion):
        m = Malla()
        for d0, d1, a0, a1 in piezas:
            m.caja("WEB_Vidrio", (X0 + a0, X0 + a1), (d0, d1), z)
        extras = {"tipo": "unidad", "unidad": codigo, "piso": n, "orientacion": orientacion, "estado": "Disponible"}
        o = m.objeto(f"Unidad_{codigo}", col, extras)
        o.display_type = "WIRE"
        o.hide_render = True
        return o

    # PB: dormitorios al frente (por delante de los listones, para la máscara de fachada), pasillo y baño, estar,
    # cocina y dormitorio 3 al fondo
    caja("PB", 0, [(-0.15, 3.95, 0.15, 5.33), (3.95, 11.45, 0.15, 3.32), (11.45, 15.55, 0.15, 8.51),
                   (8.75, 11.45, 5.45, 8.51)], (0.05, ALTO_PB - 0.3), "Contrafrente")
    f = FONDO - 0.15
    for n in range(1, PISOS + 1):
        z = (ALTO_PB + (n - 1) * ALTO_PISO + LOSA + 0.02, ALTO_PB + n * ALTO_PISO - LOSA - 0.02)
        caja(f"{n}A", n, [(-BALCON + 0.05, VIDRIO_Y, ALETA + 0.03, 5.33), (VIDRIO_Y, 3.0, 0.15, 5.33),
                          (3.0, 11.2, 0.15, 3.08), (11.2, f, 0.15, 5.62)], z, "Frente")
        caja(f"{n}B", n, [(-BALCON + 0.05, VIDRIO_Y, 5.38, ANCHO - ALETA_DER - 0.03), (VIDRIO_Y, 6.85, 5.38, 8.51),
                          (6.85, f, 5.68, 8.51)], z, "Frente")


# ---------------------------------------------------------------- entorno (como en los renders)
def entorno(col):
    # izquierda: casa de dos plantas con techo de tejas negras a un agua sobre el garaje y portón negro
    m = Malla()
    xi = X0 - 10
    m.caja("WEB_Fachada_Vecinos", (xi, X0), (0.0, 16), (0, 3.3))
    m.caja("WEB_Fachada_Vecinos", (xi, X0), (4.0, 16), (3.3, 6.2))
    m.caja("WEB_Balaustrada", (xi + 1, X0 - 0.5), (3.9, 4.0), (6.2, 7.0))
    m.prisma_techo("WEB_Techo_Vecinos", (X0 - 6.2, X0 - 0.2), (-0.6, 4.0), 3.3, 4.6)
    m.caja("WEB_Porton_Negro", (X0 - 5.6, X0 - 1.4), (-0.03, 0.0), (0, 2.5))
    m.caja("WEB_Metal_Negro", (xi, X0 - 6.3), (-0.05, 0.0), (0.5, 2.0))
    m.objeto("Vecinos_Izquierda", col)
    # derecha: casa crema con balcón de balaustrada, techo de tejas y portón de madera
    m = Malla()
    xd = X1 + 9
    m.caja("WEB_Fachada_Vecinos", (X1, xd), (0.0, 16), (0, 3.4))
    m.caja("WEB_Fachada_Vecinos", (X1 + 1.5, xd), (1.2, 16), (3.4, 6.6))
    m.caja("WEB_Balaustrada", (X1 + 0.2, X1 + 4.5), (-0.4, 1.2), (3.4, 3.55))
    m.caja("WEB_Balaustrada", (X1 + 0.2, X1 + 4.5), (-0.4, -0.3), (3.55, 4.35))
    m.prisma_techo("WEB_Techo_Vecinos", (X1 + 1.3, xd), (0.9, 9.0), 6.6, 8.3)
    m.caja("WEB_Porton_Madera", (X1 + 0.8, X1 + 3.8), (-0.03, 0.0), (0, 2.6))
    m.objeto("Vecinos_Derecha", col)
    # resto de la cuadra y fondo
    m = Malla()
    for x0, x1, h in ((X0 - 22, X0 - 10, 7.5), (X1 + 9, X1 + 19, 4.0), (X1 + 19, X1 + 30, 9.0)):
        m.caja("WEB_Fachada_Vecinos", (x0, x1), (0.0, 16), (0, h))
    m.caja("WEB_Fachada_Vecinos", (X0 - 22, X1 + 30), (FONDO + PATIO, FONDO + PATIO + 14), (0, 6.5))
    m.objeto("Vecinos_Cuadra", col)
    # vereda de enfrente: fuera de los renders, porque las tomas del cliente están hechas desde ahí adentro
    m = Malla()
    m.caja("WEB_Fachada_Vecinos", (X0 - 22, X1 + 30), (-30, -16), (0, 6))
    m.objeto("Vecinos_Enfrente", col).hide_render = True

    m = Malla()
    m.caja("WEB_Patio", (X0, X1), (FONDO, FONDO + PATIO), (0, 0.04))
    m.objeto("Parque_Patio", col)
    m = Malla()
    m.caja("WEB_Vereda", (X0 - 22, X1 + 30), (-3.2, 0), (0, 0.15))
    m.caja("WEB_Vereda", (X0 - 22, X1 + 30), (-16, -12.8), (0, 0.15))
    m.objeto("Veredas", col)
    m = Malla()
    m.caja("WEB_Cordon", (X0 - 22, X1 + 30), (-3.35, -3.2), (-0.02, 0.15))
    m.caja("WEB_Cordon", (X0 - 22, X1 + 30), (-12.8, -12.65), (-0.02, 0.15))
    m.objeto("Cordones", col)
    m = Malla()
    m.caja("WEB_Asfalto", (X0 - 22, X1 + 30), (-12.65, -3.35), (-0.05, 0))
    m.objeto("Calzada", col)

    # árboles de vereda: tronco y copas low-poly (en la web tapan el mouse, como un vecino)
    m = Malla()
    for x, alto in ((X0 - 6.5, 7.5), (X1 + 7.5, 5.5)):
        m.cilindro("WEB_Arbol_Tronco", x, -2.4, 0, alto * 0.6, 0.16, 8)
        for dx, dy, dz, r in ((0, 0, 0.75, 2.3), (-1.3, 0.3, 0.6, 1.6), (1.2, -0.3, 0.68, 1.7), (0.3, 0.5, 0.92, 1.4)):
            m.esfera("WEB_Arbol_Copa", x + dx, -2.4 + dy, alto * dz, r, 0.75)
    m.objeto("Arboles_Vereda", col)


# ---------------------------------------------------------------- cámaras
def mirar(cam, objetivo):
    d = Vector(objetivo) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def camara(nombre, col, desde, hacia=None, lente=24, shift_y=0.0, rumbo=None, etiqueta=None, fondo=None, resolucion=None):
    """`rumbo`: cámara nivelada girada esos grados desde el norte (+ = hacia el oeste), en vez de mirar a `hacia`"""
    data = bpy.data.cameras.new(nombre)
    data.lens = lente
    data.shift_y = shift_y
    data.clip_end = 500
    o = bpy.data.objects.new(nombre, data)
    col.objects.link(o)
    o.location = desde
    if rumbo is None:
        mirar(o, hacia)
    else:
        o.rotation_euler = (math.radians(90), 0, math.radians(rumbo))
    if resolucion:
        o["resolucion"] = list(resolucion)
    if etiqueta:
        o["etiqueta"] = etiqueta
    if fondo:
        ruta = os.path.join(REFERENCIAS, fondo)
        if os.path.exists(ruta):
            bg = data.background_images.new()
            bg.image = bpy.data.images.load(ruta, check_existing=True)
            bg.alpha = 0.5
            bg.display_depth = "FRONT"
            data.show_background_images = True
    return o


def camaras(web, refs):
    # vistas del visor 3D
    camara("Cam_Principal", web, (-9, -14.5, 1.7), (0.5, 0, 7), lente=20)
    camara("Cam_Derecha", web, (9, -14.5, 1.7), (-0.5, 0, 7), lente=20)
    camara("Cam_Aerea", web, (-20, -30, 26), (0, 6, 4), lente=32)
    camara("Cam_Acceso", web, (-2.5, -6, 1.6), (0.5, 0, 1.8), lente=24)
    # calce con los renders del cliente: tomas de arquitectura de dos puntos de fuga (cámara nivelada + shift).
    # Lente, rumbo y alto del horizonte salen de los fugantes de la foto; la posición, de esquinas conocidas.
    # Resueltas por mínimos cuadrados con 8–10 esquinas de cada foto: error medio 1,7 % (izquierda) y 2,1 % (derecha)
    # del ancho; los renders del cliente no son del todo coherentes entre sí y no baja de ahí.
    camara("Ref_Izquierda", refs, (-13.50, -25.30, 0.30), lente=50.3, shift_y=0.364, rumbo=-24.2, etiqueta="Frente",
           fondo="fachada-dia-desde-izquierda.jpg", resolucion=(1600, 1563))
    camara("Ref_Derecha", refs, (12.39, -26.87, 1.80), lente=51.0, shift_y=0.266, rumbo=26.8, etiqueta="Frente derecha",
           fondo="fachada-dia-desde-derecha.jpg", resolucion=(1570, 1600))
    # Disponibilidad (scripts/blender/renders_fachadas.py): las mismas tomas, para calcular la máscara de unidades
    # sobre las fotos del cliente. Se corre una por vez con la resolución de su foto (propiedad "resolucion").
    for n, ref in ((1, "Ref_Izquierda"), (2, "Ref_Derecha")):
        r = bpy.data.objects[ref]
        o = bpy.data.objects.new(f"Render_Fachada_{n}", r.data.copy())
        refs.objects.link(o)
        o.location, o.rotation_euler = r.location.copy(), r.rotation_euler.copy()  # matrix_world aún no está al día
        o.data.background_images.clear()
        for k in ("etiqueta", "resolucion"):
            o[k] = r[k]
        o["colecciones"] = "WEB_Edificio"
        # las cajas van por delante de vidrios y barandas, así que alcanza con poco margen; con el de defecto
        # (1,2 m) se ven a través de las medianeras, que están a 0,15 m. Va en las dos: se corren de a una
        o["escala"] = 1.0
        o["tolerancia"] = 0.1
    # plantas (renders_plantas.py, docs/renders-plantas.md): encuadrada sobre el piso 2, 25° desde la vertical, con el
    # frente abajo; a 60 m con 50 mm la planta (~17 m con el balcón) ocupa ~60 % del alto
    inclinacion, distancia = math.radians(25), 60.0
    objetivo = Vector((0, FONDO / 2 - 0.6, ALTO_PB + ALTO_PISO + LOSA))
    o = camara("Render_Planta", refs, objetivo + distancia * Vector((0, -math.sin(inclinacion), math.cos(inclinacion))),
               lente=50, rumbo=0, resolucion=(2560, 1440))
    o.rotation_euler = (inclinacion, 0, 0)
    # el nivel de cada Piso_NN es su punto más bajo (el fondo de la losa): 2,0 m desde ahí = 1,5 m sobre el piso
    # terminado (en PB, la platea baja lo mismo)
    for k, v in (("piso", 2), ("escala", 1.0), ("colecciones", "WEB_Edificio, Interiores"), ("altura_corte", 2.0),
                 ("fondo", "blanco")):
        o[k] = v
    # el atardecer es casi la misma toma que la izquierda, un poco más abierta (sin calce propio)
    camara("Ref_Atardecer", refs, (-13.50, -25.30, 0.30), lente=46.0, shift_y=0.34, rumbo=-24.2, etiqueta="Atardecer",
           fondo="fachada-atardecer.jpg", resolucion=(1269, 1240))
    camara("Ref_Acceso", refs, (-3.2, -5.2, 1.0), (1.0, 0, 1.6), lente=20, shift_y=0.1, etiqueta="Acceso",
           fondo="acceso-peatonal.jpg")


# ---------------------------------------------------------------- luz para renders (fuera de WEB)
def luz_render(col):
    esc = bpy.context.scene
    esc.render.engine = "CYCLES"
    esc.cycles.samples = 128
    esc.cycles.use_denoising = True
    esc.view_settings.view_transform = "AgX"
    esc.view_settings.look = "AgX - Medium High Contrast"
    esc.view_settings.exposure = 0.0
    esc.unit_settings.system = "METRIC"
    mundo = esc.world or bpy.data.worlds.new("Mundo")
    esc.world = mundo
    mundo.use_nodes = True
    nodos = mundo.node_tree.nodes
    cielo = nodos.get("Cielo") or nodos.new("ShaderNodeTexSky")
    cielo.name = "Cielo"
    for attr, v in (("sky_type", "NISHITA"), ("sun_elevation", math.radians(42)), ("sun_rotation", math.radians(140)), ("sun_disc", False)):
        if hasattr(cielo, attr):
            try:
                setattr(cielo, attr, v)
            except TypeError:
                pass
    fondo = nodos.get("Background")
    if fondo:
        mundo.node_tree.links.new(cielo.outputs[0], fondo.inputs[0])
        fondo.inputs[1].default_value = 0.12
    sol = bpy.data.lights.new("Sol", "SUN")
    sol.energy = 2.6
    sol.angle = math.radians(1.5)
    o = bpy.data.objects.new("Sol", sol)
    col.objects.link(o)
    # sol alto (55° de elevación) desde el sudoeste: ilumina el frente como en las referencias de día y, desde
    # arriba, no llena las plantas de sombras de muros (docs/renders-plantas.md §4)
    o.rotation_euler = (math.radians(35), 0, math.radians(-35))
    esc.render.resolution_x, esc.render.resolution_y = 1600, 1563


def main():
    for n in ("WEB", "Referencias", "Render", "Interiores"):
        borrar_coleccion(n)
    web = coleccion("WEB")
    edificio = coleccion("WEB_Edificio", web)
    col_unidades = coleccion("WEB_Unidades", web)
    col_entorno = coleccion("WEB_Entorno", web)
    col_camaras = coleccion("WEB_Camaras", web)
    refs = coleccion("Referencias")
    render = coleccion("Render")

    planta_baja(edificio)
    for n in range(1, PISOS + 1):
        piso(edificio, n)
    remate(edificio)
    numero_931(edificio)
    unidades(col_unidades)
    # entorno calcado de las fotos (entorno_ca931.py reemplaza a entorno() de acá); árboles con hojas para Cycles
    aqui = os.path.dirname(globals().get("__file__", REPO + "/scripts/blender/x.py"))
    exec(open(os.path.join(aqui, "entorno_ca931.py"), encoding="utf-8").read(), globals())
    entorno(col_entorno)
    camaras(col_camaras, refs)
    luz_render(render)
    arboles_render(render)
    # interiores para los renders de plantas (fuera de WEB): comparten Malla, materiales y medidas
    ruta = os.path.join(os.path.dirname(globals().get("__file__", REPO + "/scripts/blender/x.py")), "interior_ca931.py")
    exec(open(ruta, encoding="utf-8").read(), globals())
    col_interiores = coleccion("Interiores")
    interiores(col_interiores)
    if VESTIR and os.path.isdir("C:/Renders/_assets/polyhaven"):
        exec(open(ruta.replace("interior_ca931.py", "vestir_ca931.py"), encoding="utf-8").read(), globals())
        mats = vestir(col_interiores)
        # terminaciones y cámaras del recorrido 360 (ocultas para plantas y fachadas)
        exec(open(ruta.replace("interior_ca931.py", "recorrido_ca931.py"), encoding="utf-8").read(), globals())
        recorridos(col_interiores, mats)
    # para renders_ca931.py
    bpy.app.driver_namespace["ca931_medidas"] = {k: globals()[k] for k in (
        "X0", "X1", "FONDO", "BALCON", "ALTO_PB", "ALTO_PISO", "PISOS", "LOSA", "MAD_I", "MAD_D", "ALETA")}
    bpy.context.scene.camera = bpy.data.objects["Ref_Izquierda"]
    print(f"Cañada de Gómez 931: {len(bpy.data.collections['WEB'].all_objects)} objetos en WEB")


main()
