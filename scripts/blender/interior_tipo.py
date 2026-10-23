"""
Interior del piso tipo: genera paredes, solados, muebles y núcleo (escalera + ascensores) en todos los pisos del
modelo, para los renders de plantas (docs/renders-plantas.md). Es una propuesta base para arrancar un proyecto:
la distribución está como datos (en metros) y se reemplaza por la del arquitecto cuando llegue.

Uso: Blender abierto → Scripting → abrir este archivo → Run Script. Se puede correr las veces que haga falta:
borra y rehace la colección INTERIORES. No toca la fachada; con ACTUALIZAR_UNIDADES rehace las cajas Unidad_*
con la huella de la distribución (en L, sin el núcleo) para que la máscara SVG calce con el interior. Con RECORRIDO
crea además las cámaras Pano_* del recorrido 360 en esa unidad (docs/renders-recorrido.md).

Distribución de la plantilla (Torre Cityh, 4 unidades por piso de 2 dormitorios, ~48 m² propios):
  - núcleo central 5,2 × 6 m: palier, escalera de dos tramos y dos ascensores;
  - la unidad se define una vez (cuadrante A: x ≥ 0, y ≥ 0) y se espeja para B, C y D.
Coordenadas en metros desde el centro de la torre, x hacia el este (+X de Blender), y hacia el norte (+Y).
"""

import math

import bpy
import bmesh
from mathutils import Vector

# ---------------------------------------------------------------- configuración
ESCALA = 8.0              # metros por unidad de Blender (igual que en el admin)
CENTRO = (0.0, 0.0)       # centro de la torre en coordenadas de Blender
LOSA = 0.20               # espesor de losa: el piso terminado queda a z_min(objeto piso) + LOSA
ALTO_LIBRE = 2.42         # de piso terminado a cielorraso
CABEZAL_VENTANAS = 2.27   # cabeza de las ventanas de la fachada: de ahí al cielorraso la fachada tipo no tiene muro
DINTEL = 2.05             # altura de puertas
INTERIORES = "Interiores"  # colección que se crea (fuera de WEB: no va al .glb)
ACTUALIZAR_UNIDADES = True
RECORRIDO = "5A"          # unidad donde van las cámaras Pano_* del recorrido 360 (renders_recorrido.py); "" = ninguna
VESTIR = RECORRIDO        # unidad que va sin los muebles en cajas: la amuebla vestir_interior.py; "" = ninguna
ALTURA_OJO = 1.60         # metros sobre el piso terminado
COLECCION_RECORRIDOS = "Recorridos"

# cuadrante de cada letra de unidad (signo de x, signo de y)
CUADRANTES = {"A": (1, 1), "B": (1, -1), "C": (-1, -1), "D": (-1, 1)}

MATERIALES = {
    "WEB_Pared_Interior": (0.92, 0.91, 0.89),
    "WEB_Solado_Madera": (0.74, 0.62, 0.48),
    "WEB_Solado_Ceramico": (0.84, 0.84, 0.82),
    "WEB_Solado_Nucleo": (0.62, 0.62, 0.61),
    "WEB_Hueco": (0.01, 0.01, 0.012),
    "WEB_Mueble": (0.96, 0.95, 0.93),
    "WEB_Mueble_Tela": (0.46, 0.48, 0.52),
    "WEB_Mueble_Madera": (0.55, 0.40, 0.27),
    "WEB_Textil": (0.86, 0.81, 0.73),
    "WEB_Planta": (0.24, 0.42, 0.20),
    "WEB_Metal_Cocina": (0.18, 0.18, 0.19),
    "WEB_Vidrio_Interior": (0.72, 0.82, 0.86),
    "WEB_Sanitario": (0.98, 0.98, 0.98),
    "WEB_Corte": (0.20, 0.20, 0.22),
    "WEB_Cielorraso": (0.90, 0.90, 0.88),
}

# ---------------------------------------------------------------- distribución (metros)
X_INT, Y_INT = 7.68, 6.84           # cara interior de la fachada
NX, NY = 2.6, 3.0                   # medio núcleo
PARED, MEDIANERA, MURO_NUCLEO = 0.10, 0.20, 0.25


def muro(x1, y1, x2, y2, e, huecos=()):
    """muro recto entre dos puntos (horizontal o vertical), espesor e, con huecos de puerta (desde, hasta)"""
    return {"de": (x1, y1), "a": (x2, y2), "e": e, "huecos": list(huecos)}


NUCLEO = {
    "solados": [("WEB_Solado_Nucleo", (-NX, -NY, NX, NY))],
    "muros": [
        muro(-NX, -NY, NX, -NY, MURO_NUCLEO),
        muro(-NX, NY, NX, NY, MURO_NUCLEO),
        muro(NX, -NY, NX, NY, MURO_NUCLEO, [(-0.85, -0.05), (0.05, 0.85)]),     # puertas de B y A
        muro(-NX, -NY, -NX, NY, MURO_NUCLEO, [(-0.85, -0.05), (0.05, 0.85)]),   # puertas de C y D
        muro(-NX, 0.9, NX, 0.9, PARED * 1.5, [(-0.5, 0.5)]),                    # palier | escalera
        muro(-NX, -0.9, NX, -0.9, PARED * 1.5, [(-1.9, -1.0), (1.0, 1.9)]),     # palier | ascensores
        muro(0, -NY, 0, -0.9, PARED * 1.5),
        muro(-2.3, 1.95, 1.2, 1.95, PARED),                                     # entre tramos
    ],
    "huecos": [(-NX + 0.15, -NY + 0.15, -0.1, -1.0), (0.1, -NY + 0.15, NX - 0.15, -1.0)],  # pasadizos
}

# Tabiques contra la fachada sólo sobre los machones (entre ventanas): la fachada tipo tiene ventanas al norte en
# x 0,42–2,09 / 2,89–4,57 / 5,20–6,87 y al este en y 0,73–2,13 / 2,69–4,09 / 4,69–6,09. Un tabique que cae en medio
# de un ventanal se nota enseguida en un render interior.
X_DORMITORIO = 2.49   # dormitorio 2 | pasillo y principal (machón norte 2,09–2,89)
X_PASILLO = 3.3       # pasillo | baño
X_BANO = 4.88         # baño | estar (machón norte 4,57–5,20)
Y_BANO = 5.0          # pasillo y baño | principal
Y_ESTAR = 4.39        # estar | principal, del baño a la fachada (machón este 4,09–4,69)

UNIDAD = {
    # huella: lo que abarca la unidad (para la caja Unidad_* y la máscara)
    "huella": [(0.0, NY, X_INT, Y_INT), (NX, 0.0, X_INT, NY)],
    # estar-comedor-cocina en L con dos ventanales al este; pasillo corto al dormitorio 2 (noroeste), al baño
    # (interior) y al principal (esquina noreste, ventanas al norte y al este)
    "solados": [
        ("WEB_Solado_Madera", (NX, 0.0, X_INT, NY)),                        # estar-comedor-cocina
        ("WEB_Solado_Madera", (X_BANO, NY, X_INT, Y_ESTAR)),
        ("WEB_Solado_Madera", (X_DORMITORIO, NY, X_PASILLO, Y_BANO)),       # pasillo
        ("WEB_Solado_Ceramico", (X_PASILLO, NY, X_BANO, Y_BANO)),           # baño
        ("WEB_Solado_Madera", (0.0, NY, X_DORMITORIO, Y_INT)),              # dormitorio 2
        ("WEB_Solado_Madera", (X_DORMITORIO, Y_BANO, X_INT, Y_INT)),        # principal
        ("WEB_Solado_Madera", (X_BANO, Y_ESTAR, X_INT, Y_BANO)),
    ],
    "muros": [
        muro(NX, MEDIANERA / 2, X_INT, MEDIANERA / 2, MEDIANERA),         # medianera con la unidad vecina (y = 0)
        muro(MEDIANERA / 2, NY, MEDIANERA / 2, Y_INT, MEDIANERA),         # medianera (x = 0)
        muro(X_PASILLO, NY, X_BANO, NY, PARED),                           # estar | baño
        muro(X_PASILLO, NY, X_PASILLO, Y_BANO, PARED, [(3.6, 4.3)]),      # pasillo | baño
        muro(X_DORMITORIO, NY, X_DORMITORIO, Y_INT, PARED, [(3.25, 4.0)]),  # dormitorio 2 | pasillo y principal
        muro(X_DORMITORIO, Y_BANO, X_BANO, Y_BANO, PARED, [(2.55, 3.25)]),  # pasillo y baño | principal
        muro(X_BANO, NY, X_BANO, Y_BANO, PARED),                          # baño | estar y principal
        muro(X_BANO, Y_ESTAR, X_INT, Y_ESTAR, PARED),                     # estar | principal
    ],
    # (x1, y1, x2, y2, z1, z2, material): la versión en cajas, para las plantas y las tomas de fachada. En la unidad
    # del recorrido los reemplaza vestir_interior.py por muebles de verdad
    "muebles": [
        # cocina sobre la medianera: heladera junto a la entrada, mesada con bacha y anafe
        (3.6, 0.05, 4.25, 0.7, 0, 1.9, "WEB_Mueble"),            # heladera
        (4.25, 0.05, 6.2, 0.65, 0, 0.9, "WEB_Mueble"),           # mesada
        (4.5, 0.15, 5.0, 0.55, 0.9, 0.905, "WEB_Metal_Cocina"),  # bacha
        (5.4, 0.12, 6.0, 0.58, 0.9, 0.91, "WEB_Metal_Cocina"),   # anafe
        (2.68, 0.2, 2.72, 0.85, 0, DINTEL, "WEB_Mueble_Madera"),  # hoja de la puerta de entrada, cerrada
        # comedor: mesa redonda de 0,8 m con cuatro sillas
        (3.7, 1.55, 4.5, 2.35, 0.72, 0.76, "WEB_Mueble_Madera"),
        (3.45, 1.75, 3.85, 2.15, 0, 0.46, "WEB_Mueble_Madera"), (4.35, 1.75, 4.75, 2.15, 0, 0.46, "WEB_Mueble_Madera"),
        (3.9, 1.2, 4.3, 1.6, 0, 0.46, "WEB_Mueble_Madera"), (3.9, 2.3, 4.3, 2.7, 0, 0.46, "WEB_Mueble_Madera"),
        # estar: sillón contra el principal mirando al sur, mesa ratona, sillón individual junto al ventanal
        (5.5, 2.3, 7.1, 3.5, 0, 0.01, "WEB_Textil"),             # alfombra
        (5.7, 2.6, 6.9, 3.2, 0, 0.39, "WEB_Mueble_Madera"),      # mesa ratona
        (5.35, 3.57, 7.15, 4.34, 0, 0.42, "WEB_Mueble_Tela"),    # sillón
        (5.35, 4.1, 7.15, 4.34, 0.42, 0.72, "WEB_Mueble_Tela"),
        (6.95, 1.2, 7.6, 1.95, 0, 0.45, "WEB_Mueble_Tela"),      # sillón individual
        (7.3, 0.2, 7.6, 0.5, 0, 1.2, "WEB_Planta"),
        # dormitorio 2
        (0.2, 3.13, 1.65, 3.73, 0, 2.2, "WEB_Mueble_Madera"),    # placard (al lado abre la puerta)
        (0.1, 4.3, 2.0, 5.7, 0, 0.45, "WEB_Mueble"),             # cama de 1,4
        (0.5, 4.35, 1.95, 5.65, 0.45, 0.52, "WEB_Textil"),
        (0.12, 4.4, 0.5, 5.6, 0.45, 0.6, "WEB_Mueble"),
        (1.95, 5.3, 2.44, 6.5, 0.72, 0.76, "WEB_Mueble_Madera"),  # escritorio contra el tabique
        (1.45, 5.7, 1.85, 6.1, 0, 0.46, "WEB_Mueble_Tela"),      # silla
        (1.74, 3.26, 2.44, 3.3, 0, DINTEL, "WEB_Mueble_Madera"),  # hoja de puerta
        # baño
        (3.7, 3.05, 4.5, 3.5, 0, 0.85, "WEB_Sanitario"),         # vanitory
        (3.45, 4.55, 3.85, 4.95, 0, 0.4, "WEB_Sanitario"),       # inodoro
        (3.98, 4.1, 4.83, 4.95, 0, 0.05, "WEB_Sanitario"),       # plato de ducha
        (3.98, 4.06, 4.5, 4.1, 0.05, 2.0, "WEB_Vidrio_Interior"),  # mampara
        (3.21, 4.2, 3.25, 5.0, 0, DINTEL, "WEB_Mueble_Madera"),   # hoja corrediza, abierta del lado del pasillo
        # dormitorio principal
        (3.35, 5.05, 4.85, 5.65, 0, 2.2, "WEB_Mueble_Madera"),   # placard
        (5.4, 4.44, 7.0, 6.44, 0, 0.45, "WEB_Mueble"),           # cama de 1,6
        (5.45, 4.9, 6.95, 6.4, 0.45, 0.52, "WEB_Textil"),        # acolchado
        (5.5, 4.47, 6.9, 4.85, 0.45, 0.6, "WEB_Mueble"),         # almohadas
        (4.95, 4.45, 5.35, 4.85, 0, 0.5, "WEB_Mueble_Madera"),   # mesas de luz
        (7.05, 4.45, 7.45, 4.85, 0, 0.5, "WEB_Mueble_Madera"),
        (2.55, 5.05, 2.59, 5.75, 0, DINTEL, "WEB_Mueble_Madera"),  # hoja de puerta
    ],
    # puntos del recorrido 360 (arranca en el primero): (clave, título, dónde, hacia dónde mira al entrar). Cada uno
    # queda en línea con una puerta y otro punto, así se ven entre sí y renders_recorrido.py los enlaza
    "recorrido": [
        ("ingreso", "Ingreso", (3.0, 1.0), (7.6, 2.8)),
        ("cocina", "Cocina", (4.95, 1.05), (5.2, 0.0)),
        ("living", "Living", (5.25, 1.7), (7.6, 3.4)),
        ("pasillo", "Pasillo", (2.9, 3.8), (2.9, 6.8)),
        ("dormitorio", "Dormitorio", (1.6, 4.15), (0.3, 6.2)),
        ("bano", "Baño", (4.1, 3.75), (4.1, 3.0)),
        ("principal-entrada", "Dormitorio principal", (3.0, 5.9), (6.2, 6.0)),
        ("principal", "Dormitorio principal", (5.05, 6.0), (6.6, 4.6)),
    ],
}


def escalera(alto_piso):
    """dos tramos en la banda norte del núcleo: sube hacia el este, descanso, vuelve hacia el oeste"""
    n = 8
    contra = alto_piso / (2 * n)
    huella = 0.28
    pasos = []
    for i in range(n):  # tramo 1, y 1.0–1.9, de x = -1.2 hacia el este
        x = -1.2 + i * huella
        pasos.append((x, 1.0, x + huella, 1.9, 0, (i + 1) * contra, "WEB_Solado_Nucleo"))
    x0 = -1.2 + n * huella
    pasos.append((x0, 1.0, NX - 0.15, NY - 0.15, 0, n * contra, "WEB_Solado_Nucleo"))  # descanso
    for i in range(n):  # tramo 2, y 2.0–2.85, vuelve hacia el oeste
        x = x0 - (i + 1) * huella
        pasos.append((x, 2.0, x + huella, NY - 0.15, 0, (n + i + 1) * contra, "WEB_Solado_Nucleo"))
    return pasos


# ---------------------------------------------------------------- geometría
def espejar(r, sx, sy):
    x1, y1, x2, y2 = r[0] * sx, r[1] * sy, r[2] * sx, r[3] * sy
    return (min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2))


def piezas_muro(m, z_alto):
    """cajas (x1, y1, x2, y2, z1, z2) de un muro con sus huecos y dinteles"""
    (x1, y1), (x2, y2), e = m["de"], m["a"], m["e"] / 2
    horizontal = abs(y1 - y2) < 1e-6
    a, b = (min(x1, x2), max(x1, x2)) if horizontal else (min(y1, y2), max(y1, y2))
    fijo = y1 if horizontal else x1

    def caja(d, h, z1, z2):
        return (d, fijo - e, h, fijo + e, z1, z2) if horizontal else (fijo - e, d, fijo + e, h, z1, z2)

    cajas, inicio = [], a
    for d, h in sorted(m["huecos"]):
        if d > inicio:
            cajas.append(caja(inicio, d, 0, z_alto))
        cajas.append(caja(d, h, DINTEL, z_alto))
        inicio = h
    if b > inicio:
        cajas.append(caja(inicio, b, 0, z_alto))
    return cajas


def espejar_muro(m, sx, sy):
    (x1, y1), (x2, y2) = m["de"], m["a"]
    return {**m, "de": (x1 * sx, y1 * sy), "a": (x2 * sx, y2 * sy),
            "huecos": [tuple(sorted((d * (sx if abs(y1 - y2) < 1e-6 else sy), h * (sx if abs(y1 - y2) < 1e-6 else sy))))
                       for d, h in m["huecos"]]}


class Malla:
    """acumula cajas por material y arma una malla (coordenadas en metros; se pasan a Blender al final)"""

    def __init__(self, nombre):
        self.nombre = nombre
        self.bm = bmesh.new()
        self.mats = []

    def caja(self, x1, y1, x2, y2, z1, z2, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        idx = self.mats.index(mat)
        v = [self.bm.verts.new((x, y, z)) for z in (z1, z2) for y in (y1, y2) for x in (x1, x2)]
        for cara in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
            self.bm.faces.new([v[i] for i in cara]).material_index = idx

    def crear(self):
        malla = bpy.data.meshes.new(self.nombre)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        uv_en_metros(self.bm)
        k = 1 / ESCALA
        bmesh.ops.scale(self.bm, vec=(k, k, k), verts=self.bm.verts)
        self.bm.to_mesh(malla)
        self.bm.free()
        for m in self.mats:
            malla.materials.append(material(m))
        return malla


def uv_en_metros(bm):
    """UV por proyección de caja, en metros: así una textura con su medida real (vestir_interior.py) calza sin
    estirarse en paredes, pisos y muebles de cualquier tamaño"""
    capa = bm.loops.layers.uv.get("UVMap") or bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        n = f.normal
        eje = max(range(3), key=lambda i: abs(n[i]))
        a, b = [(1, 2), (0, 2), (0, 1)][eje]
        for loop in f.loops:
            loop[capa].uv = (loop.vert.co[a], loop.vert.co[b])


def material(nombre):
    """crea el material o le reaplica el color de MATERIALES (así un cambio de paleta se ve al re-ejecutar)"""
    m = bpy.data.materials.get(nombre) or bpy.data.materials.new(nombre)
    if nombre not in MATERIALES:
        return m
    color = (*MATERIALES[nombre], 1)
    m.diffuse_color = color
    m.use_nodes = True
    for n in m.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            n.inputs["Base Color"].default_value = color
            n.inputs["Roughness"].default_value = 1.0 if nombre == "WEB_Hueco" else 0.7
    return m


def piso_tipo(alto_piso, sin_muebles=""):
    """mallas del piso tipo con z = 0 en el piso terminado: {nombre: malla}. sin_muebles: letra de la unidad que va
    sin los muebles en cajas (la que amuebla vestir_interior.py)"""
    muros, solados, muebles = Malla("Int_Muros"), Malla("Int_Solados"), Malla("Int_Muebles")
    cielorraso = Malla("Int_Cielorraso")
    # losa + cielorraso a la altura de las paredes, con el hueco de la escalera (si no, desde adentro se ve el
    # piso de madera del departamento de arriba). 1 cm más bajo que el piso de arriba del modelo (su fachada apoya
    # justo ahí y, en el mismo plano, se ve una franja negra junto a las ventanas) y 5 mm debajo de su solado
    z1, z2 = ALTO_LIBRE - 0.01, ALTO_LIBRE + LOSA - 0.005
    for r in ((-X_INT, -Y_INT, X_INT, 0.9), (-X_INT, NY, X_INT, Y_INT), (-X_INT, 0.9, -NX, NY), (NX, 0.9, X_INT, NY)):
        cielorraso.caja(*r, z1, z2, "WEB_Cielorraso")
    # dintel interior sobre las ventanas, en todo el perímetro: sin él, desde adentro se ve un hueco negro hacia
    # la parte de abajo de la fachada exterior
    g = 0.02
    for r in ((-X_INT, -Y_INT, X_INT, -Y_INT + g), (-X_INT, Y_INT - g, X_INT, Y_INT),
              (-X_INT, -Y_INT, -X_INT + g, Y_INT), (X_INT - g, -Y_INT, X_INT, Y_INT)):
        muros.caja(*r, CABEZAL_VENTANAS, ALTO_LIBRE, "WEB_Pared_Interior")
    ESP = 0.015
    for mat, r in NUCLEO["solados"]:
        solados.caja(*r, 0, ESP, mat)
    for r in NUCLEO["huecos"]:
        solados.caja(*r, ESP, ESP + 0.005, "WEB_Hueco")
    for m in NUCLEO["muros"]:
        for c in piezas_muro(m, ALTO_LIBRE):
            muros.caja(*c, "WEB_Pared_Interior")
    for c in escalera(alto_piso):
        muebles.caja(*c)
    for letra, (sx, sy) in CUADRANTES.items():
        for mat, r in UNIDAD["solados"]:
            # el cerámico va 2 mm más alto: si una distribución lo superpone con la madera, dos caras en el mismo
            # plano se tapan la luz entre sí y en Cycles salen negras
            solados.caja(*espejar(r, sx, sy), 0, ESP + (0.002 if mat == "WEB_Solado_Ceramico" else 0), mat)
        for m in UNIDAD["muros"]:
            for c in piezas_muro(espejar_muro(m, sx, sy), ALTO_LIBRE):
                muros.caja(*c, "WEB_Pared_Interior")
        if letra == sin_muebles:
            continue
        for x1, y1, x2, y2, z1, z2, mat in UNIDAD["muebles"]:
            muebles.caja(*espejar((x1, y1, x2, y2), sx, sy), ESP + z1, ESP + z2, mat)
    return {m.nombre: m.crear() for m in (muros, solados, muebles, cielorraso)}


# ---------------------------------------------------------------- escena
def z_min(o):
    return min((o.matrix_world @ Vector(c)).z for c in o.bound_box)


def coleccion_limpia(nombre):
    col = bpy.data.collections.get(nombre)
    if col:
        for o in list(col.objects):
            bpy.data.objects.remove(o)
    else:
        col = bpy.data.collections.new(nombre)
        bpy.context.scene.collection.children.link(col)
    for m in [m for m in bpy.data.meshes if m.name.startswith("Int_") and m.users == 0]:
        bpy.data.meshes.remove(m)
    return col


def actualizar_unidad(u, sx, sy):
    """caja de la unidad con la huella de la distribución, pasándose de la fachada como las originales"""
    bb = [u.matrix_world @ Vector(c) for c in u.bound_box]
    z1, z2 = min(v.z for v in bb), max(v.z for v in bb)
    margen = 0.3  # m por fuera de la fachada: la caja envuelve balcones y carpinterías
    bm = bmesh.new()
    for x1, y1, x2, y2 in UNIDAD["huella"]:
        x2 = X_INT + margen if x2 >= X_INT else x2
        y2 = Y_INT + margen if y2 >= Y_INT else y2
        a = espejar((x1, y1, x2, y2), sx, sy)
        v = [bm.verts.new((CENTRO[0] + x / ESCALA, CENTRO[1] + y / ESCALA, z))
             for z in (z1, z2) for y in (a[1], a[3]) for x in (a[0], a[2])]
        for cara in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
            bm.faces.new([v[i] for i in cara])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    malla_vieja = u.data
    malla = bpy.data.meshes.new(u.name)
    bm.to_mesh(malla)
    bm.free()
    for m in malla_vieja.materials:
        malla.materials.append(m)
    u.data = malla
    u.matrix_world = u.matrix_world.Identity(4)
    if malla_vieja.users == 0:
        bpy.data.meshes.remove(malla_vieja)


def camaras_recorrido(codigo, pisos):
    """cámaras panorámicas Pano_unidad-<letra>_<punto> en la unidad elegida, a la altura de los ojos"""
    letra, piso = codigo[-1:].upper(), int(codigo[:-1])
    z = dict(pisos).get(piso)
    if letra not in CUADRANTES or z is None:
        print(f"Recorrido: no hay unidad {codigo} (letra A–D y un piso del modelo)")
        return 0
    sx, sy = CUADRANTES[letra]
    recorrido = f"unidad-{letra.lower()}"
    col = bpy.data.collections.get(COLECCION_RECORRIDOS)
    if not col:
        col = bpy.data.collections.new(COLECCION_RECORRIDOS)
        bpy.context.scene.collection.children.link(col)
    # la configuración del proyecto (HDRI, exposición, qué ocultar) pasa de las cámaras anteriores a las nuevas
    viejas = sorted((o for o in col.objects if o.name.startswith(f"Pano_{recorrido}_")),
                    key=lambda o: (float(o.get("orden", 1e9)), o.name))
    claves = ("hdri", "hdri_giro", "hdri_fuerza", "sol", "sol_rumbo", "sol_altura", "exposicion", "ocultar")
    config = {k: viejas[0][k] for k in claves
              if viejas and k in viejas[0]}
    for o in viejas:
        datos = o.data
        bpy.data.objects.remove(o)
        if datos and not datos.users:
            bpy.data.cameras.remove(datos)
    z_ojo = z + (LOSA + 0.015 + ALTURA_OJO) / ESCALA
    for orden, (clave, titulo, (x, y), (mx, my)) in enumerate(UNIDAD["recorrido"]):
        x, y, mx, my = x * sx, y * sy, mx * sx, my * sy
        nombre = f"Pano_{recorrido}_{clave}"
        datos = bpy.data.cameras.new(nombre)
        datos.type, datos.panorama_type = "PANO", "EQUIRECTANGULAR"
        cam = bpy.data.objects.new(nombre, datos)
        col.objects.link(cam)
        cam.location = (CENTRO[0] + x / ESCALA, CENTRO[1] + y / ESCALA, z_ojo)
        # con giro (90°, 0, θ) la cámara mira a +Y rotado θ en sentido antihorario
        cam.rotation_euler = (math.pi / 2, 0, math.atan2(-(mx - x), my - y))
        cam["titulo"], cam["nombre"], cam["unidad"], cam["escala"] = titulo, f"Unidad {letra}", codigo, ESCALA
        cam["orden"] = orden  # el primero es donde arranca el recorrido
        if orden == 0:
            for k, v in config.items():
                cam[k] = v
    return len(UNIDAD["recorrido"])


def main():
    pisos = sorted(((int(o["piso"]), z_min(o)) for o in bpy.data.objects if o.get("tipo") == "piso" and "piso" in o))
    if not pisos:
        raise RuntimeError("No hay objetos con tipo='piso' y piso=N (ver docs/pipeline-blender.md).")
    alto_piso = (pisos[1][1] - pisos[0][1]) * ESCALA if len(pisos) > 1 else ALTO_LIBRE + LOSA
    col = coleccion_limpia(INTERIORES)
    mallas = piso_tipo(alto_piso)
    vestida = None
    if VESTIR:
        # el piso de la unidad vestida lleva su propia malla de muebles, sin los de esa unidad
        vestida = (int(VESTIR[:-1]), piso_tipo(alto_piso, sin_muebles=VESTIR[-1:].upper()))
        for nombre, malla in list(vestida[1].items()):
            if nombre != "Int_Muebles":
                bpy.data.meshes.remove(malla)
                del vestida[1][nombre]
    for piso, z in pisos:
        propias = dict(mallas, **(vestida[1] if vestida and vestida[0] == piso else {}))
        for nombre, malla in propias.items():
            o = bpy.data.objects.new(f"{nombre}_{piso:02d}", malla)  # todos comparten la malla (como Alt+D)
            o.location = (CENTRO[0], CENTRO[1], z + LOSA / ESCALA)
            o["piso"] = piso
            col.objects.link(o)
    n = 0
    if ACTUALIZAR_UNIDADES:
        for u in bpy.data.objects:
            if u.get("tipo") != "unidad" or u.type != "MESH":
                continue
            letra = str(u.get("unidad", ""))[-1:].upper()
            if letra in CUADRANTES:
                actualizar_unidad(u, *CUADRANTES[letra])
                n += 1
    print(f"Interiores: {len(pisos)} piso(s), alto de piso {alto_piso:.2f} m · unidades actualizadas: {n}")
    if RECORRIDO:
        print(f"Recorrido 360: {camaras_recorrido(RECORRIDO, pisos)} cámara(s) en la unidad {RECORRIDO}")


if __name__ == "__main__":
    main()
