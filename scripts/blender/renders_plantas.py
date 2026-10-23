"""
Renders de plantas por piso: vista aérea con el edificio cortado a la altura del piso elegido,
más una máscara SVG con un polígono por unidad (data-unidad="5B") en el mismo encuadre.

Spec completa: docs/renders-plantas.md

Uso:
  - Blender abierto: pestaña Scripting → abrir este archivo → Run Script (Alt+P).
  - Consola:  blender -b archivo.blend --python scripts/blender/renders_plantas.py -- [opciones]
      --pisos 5          un piso
      --pisos 1-9,12     rango / lista
      --solo-mascaras    no renderiza, sólo escribe los SVG (rápido, para validar el encuadre)
      --prueba           render al 25 % de un solo piso (el de referencia) para revisar el look
      --fondo blanco     pisa la propiedad "fondo" de la cámara (realista | blanco)

Salida (junto al .blend):  //web/plantas/piso-05.webp  +  piso-05.svg  por piso,  y plantas.json.

Idea: la cámara "Render_Planta" se encuadra UNA vez sobre el piso de referencia. Para cada piso N el script
la sube lo mismo que sube el piso, así la planta cae siempre en el mismo lugar de la imagen y sólo cambia
cuánto edificio se ve debajo. Lo que está por encima del corte se oculta; lo que lo atraviesa se reemplaza
por una copia temporal recortada. El .blend no se modifica: al terminar se borran las copias y se restauran
visibilidad y cámara (no hace falta guardar).
"""

import json
import math
import os
import sys

import bpy
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

# ---------------------------------------------------------------- configuración
CAMARA = "Render_Planta"           # fuera de la colección WEB, así no se exporta como vista del visor 3D
PISO_REFERENCIA = None             # piso sobre el que se encuadró la cámara; None = propiedad "piso" de la cámara
COLECCION_EDIFICIO = "Edificio"    # torre + interiores (o una lista de colecciones): lo que se oculta o se corta
ESCALA = 1.0                       # metros por unidad de Blender (igual que en el admin)
ALTURA_CORTE = 1.5                 # metros sobre el nivel del piso donde se cortan paredes y muebles
MATERIAL_CORTE = "WEB_Corte"       # color de la cara cortada de las paredes (si existe el material)
FONDO = "realista"                 # "realista": el edificio en su entorno (el de la escena o FOTO_ENTORNO), con bruma
                                   # "blanco": sólo el edificio sobre fondo transparente; la web pone detrás el color
                                   # de fondo del tema, así calza en claro y en oscuro sin bordes
FOTO_ENTORNO = ""                  # realista: foto aérea (ortofoto) que va de suelo en lugar del entorno modelado
FOTO_ENTORNO_METROS = 400.0        # lado mayor que cubre la foto en el terreno, centrada en el edificio
FOTO_ENTORNO_GIRO = 0.0            # grados: rotación de la foto si su norte no coincide con +Y de la escena
SOMBRA = False                     # blanco: sombra del edificio sobre un suelo invisible (sólo Cycles); con el
                                   # sol de costado cae como un bloque oscuro que distrae, por eso va apagada
ATENUAR_ENTORNO = 0.6              # 0–1: cuánto se aclara lo que no es el edificio (0 = sin bruma)
DESATURAR_ENTORNO = 0.6            # 0–1: cuánto color le saca al entorno
DESENFOCAR_ENTORNO = 0.0           # radio del desenfoque del entorno, en fracción del ancho (0.004 ≈ 10 px a 2560)
COLOR_BRUMA = (0.93, 0.94, 0.95)   # color hacia el que se aclara el entorno
OCULTAR = ("Bruma",)               # prefijos de objetos que no van en estos renders (volúmenes de niebla: en
                                   # Cycles tapan el sol desde arriba; la bruma de las plantas la hace el compositor)
OCULTAR_COLECCIONES = ()           # colecciones enteras que no van (p. ej. la copia del entorno para el visor web,
                                   # que se superpone con la de render); propiedad "ocultar" de la cámara
TORRE = ""                         # slug de la torre; si se completa, va como data-torre en la máscara
SALIDA = "//web/plantas"
FORMATO = "WEBP"                   # WEBP (liviano, lo que se sube al admin) o PNG
CALIDAD = 88


# ---------------------------------------------------------------- utilidades
def objetos_de(col):
    yield from col.objects
    for c in col.children:
        yield from objetos_de(c)


def caja_mundo(o):
    return [o.matrix_world @ Vector(c) for c in o.bound_box]


def z_min(o):
    return min(v.z for v in caja_mundo(o))


def z_max(o):
    return max(v.z for v in caja_mundo(o))


def casco(puntos):
    """casco convexo 2D (cadena monótona); devuelve los puntos en orden"""
    pts = sorted(set(puntos))
    if len(pts) < 3:
        return pts

    def cruz(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    bajo, alto = [], []
    for p in pts:
        while len(bajo) >= 2 and cruz(bajo[-2], bajo[-1], p) <= 0:
            bajo.pop()
        bajo.append(p)
    for p in reversed(pts):
        while len(alto) >= 2 and cruz(alto[-2], alto[-1], p) <= 0:
            alto.pop()
        alto.append(p)
    return bajo[:-1] + alto[:-1]


def leer_argumentos():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    pisos = None
    if "--pisos" in a:
        pisos = set()
        for parte in a[a.index("--pisos") + 1].split(","):
            if "-" in parte.strip("-"):
                d, h = parte.split("-", 1)
                pisos.update(range(int(d), int(h) + 1))
            else:
                pisos.add(int(parte))
    return pisos, "--solo-mascaras" in a, "--prueba" in a


# ---------------------------------------------------------------- escena
def niveles(todos):
    """{piso: z del nivel de piso}. Sale de los objetos tipo='piso'; si un piso sólo tiene unidades, de ellas."""
    z = {}
    for o in todos:
        if o.get("tipo") == "piso" and "piso" in o or o.get("tipo") == "planta_baja":
            n = int(o.get("piso", 0))
            z[n] = min(z.get(n, float("inf")), z_min(o))
    for o in todos:
        if o.get("tipo") == "unidad" and "piso" in o and int(o["piso"]) not in z:
            z[int(o["piso"])] = z_min(o)
    return dict(sorted(z.items()))


def config_de_camara(cam):
    """
    La cámara puede traer la configuración como propiedades personalizadas (escala, colecciones, altura_corte,
    torre, atenuar_entorno, fondo, foto_entorno…), así cada .blend queda listo para correr el script sin editarlo.
    """
    global ESCALA, COLECCION_EDIFICIO, ALTURA_CORTE, TORRE, ATENUAR_ENTORNO, DESATURAR_ENTORNO, DESENFOCAR_ENTORNO
    global FONDO, FOTO_ENTORNO, FOTO_ENTORNO_METROS, FOTO_ENTORNO_GIRO, SOMBRA, OCULTAR_COLECCIONES
    if not cam:
        return
    if cam.get("ocultar"):
        OCULTAR_COLECCIONES = tuple(c.strip() for c in str(cam["ocultar"]).split(",") if c.strip())
    ESCALA = float(cam.get("escala", ESCALA))
    if cam.get("colecciones"):
        COLECCION_EDIFICIO = [c.strip() for c in str(cam["colecciones"]).split(",") if c.strip()]
    ALTURA_CORTE = float(cam.get("altura_corte", ALTURA_CORTE))
    TORRE = str(cam.get("torre", TORRE))
    ATENUAR_ENTORNO = float(cam.get("atenuar_entorno", ATENUAR_ENTORNO))
    DESATURAR_ENTORNO = float(cam.get("desaturar_entorno", DESATURAR_ENTORNO))
    DESENFOCAR_ENTORNO = float(cam.get("desenfocar_entorno", DESENFOCAR_ENTORNO))
    FONDO = str(cam.get("fondo", FONDO)).strip().lower()
    FOTO_ENTORNO = str(cam.get("foto_entorno", FOTO_ENTORNO))
    FOTO_ENTORNO_METROS = float(cam.get("foto_entorno_metros", FOTO_ENTORNO_METROS))
    FOTO_ENTORNO_GIRO = float(cam.get("foto_entorno_giro", FOTO_ENTORNO_GIRO))
    SOMBRA = bool(cam.get("sombra", SOMBRA))


def validar(escena):
    errores = []
    cam = bpy.data.objects.get(CAMARA)
    config_de_camara(cam)
    if not cam or cam.type != "CAMERA":
        errores.append(f"Falta la cámara '{CAMARA}' (ver docs/renders-plantas.md → Cámara).")
    nombres = [COLECCION_EDIFICIO] if isinstance(COLECCION_EDIFICIO, str) else list(COLECCION_EDIFICIO)
    col = [bpy.data.collections.get(n) for n in nombres]
    for n, c in zip(nombres, col):
        if not c:
            disponibles = ", ".join(x.name for x in bpy.data.collections)
            errores.append(f"No existe la colección '{n}'. Colecciones: {disponibles}")
    ref = PISO_REFERENCIA if PISO_REFERENCIA is not None else (cam.get("piso") if cam else None)
    if ref is None:
        errores.append(f"Indicá PISO_REFERENCIA o cargá la propiedad 'piso' en la cámara '{CAMARA}'.")
    if FONDO not in ("realista", "blanco"):
        errores.append(f"fondo = '{FONDO}': tiene que ser 'realista' o 'blanco'.")
    if FONDO == "realista" and FOTO_ENTORNO and not os.path.isfile(bpy.path.abspath(FOTO_ENTORNO)):
        errores.append(f"No encuentro la foto de entorno '{FOTO_ENTORNO}'.")
    if errores:
        raise RuntimeError("\n  ".join(["Renders de plantas:"] + errores))
    return cam, col, int(ref)


class Estado:
    """guarda lo que se toca para dejar el .blend como estaba"""

    def __init__(self, escena, cam):
        self.escena = escena
        self.cam = cam
        self.cam_z = cam.location.z
        self.render = (escena.camera, escena.render.filepath, escena.render.resolution_percentage,
                       escena.render.image_settings.file_format)
        self.transparencia = (escena.render.film_transparent, escena.render.image_settings.color_mode)
        self.suelos = []      # planos que agrega el script (foto de entorno, suelo de sombra): no cambian por piso
        self.datos = []       # materiales e imágenes de esos planos
        self.ocultos = {}
        self.temporales = []
        vl = bpy.context.view_layer
        self.compositor = (escena.compositing_node_group, escena.render.use_compositing, vl.use_pass_cryptomatte_object)
        self.bruma = None

    def ocultar(self, o, valor):
        self.ocultos.setdefault(o.name, o.hide_render)
        o.hide_render = valor

    def borrar_temporales(self):
        for o in self.temporales:
            malla = o.data
            bpy.data.objects.remove(o)
            bpy.data.meshes.remove(malla)
        self.temporales = []

    def restaurar(self):
        self.borrar_temporales()
        for nombre, valor in self.ocultos.items():
            if nombre in bpy.data.objects:
                bpy.data.objects[nombre].hide_render = valor
        self.ocultos = {}
        for o in self.suelos:
            malla = o.data
            bpy.data.objects.remove(o)
            bpy.data.meshes.remove(malla)
        for d in self.datos:
            (bpy.data.materials if isinstance(d, bpy.types.Material) else bpy.data.images).remove(d)
        self.suelos, self.datos = [], []
        self.cam.location.z = self.cam_z
        e = self.escena
        e.camera, e.render.filepath, e.render.resolution_percentage, e.render.image_settings.file_format = self.render
        e.render.film_transparent, e.render.image_settings.color_mode = self.transparencia
        e.compositing_node_group, e.render.use_compositing, bpy.context.view_layer.use_pass_cryptomatte_object = self.compositor
        if self.bruma:
            bpy.data.node_groups.remove(self.bruma.id_data)
            self.bruma = None


def preparar_bruma(estado, ancho):
    """
    Compositor temporal que desenfoca, aclara y desatura todo lo que no es el edificio (como PH Balcony), para que
    la torre se destaque. Aísla el edificio con Cryptomatte, que anda en EEVEE y en Cycles. Devuelve el nodo
    Cryptomatte: su lista de objetos se actualiza en cada piso (cambian las copias recortadas).
    """
    e = estado.escena
    bpy.context.view_layer.use_pass_cryptomatte_object = True
    ng = bpy.data.node_groups.new("_BrumaPlantas", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    n, l = ng.nodes, ng.links
    capas = n.new("CompositorNodeRLayers")
    cripto = n.new("CompositorNodeCryptomatteV2")
    cripto.source = "RENDER"
    cripto.layer_name = f"{bpy.context.view_layer.name}.CryptoObject"
    desat = n.new("CompositorNodeHueSat")
    desat.inputs["Saturation"].default_value = 1 - DESATURAR_ENTORNO
    blanco = n.new("ShaderNodeMix")
    blanco.data_type = "RGBA"
    blanco.inputs[0].default_value = ATENUAR_ENTORNO
    blanco.inputs[7].default_value = (*COLOR_BRUMA, 1)
    final = n.new("ShaderNodeMix")
    final.data_type = "RGBA"
    salida = n.new("NodeGroupOutput")
    l.new(capas.outputs["Image"], cripto.inputs["Image"])
    entorno = capas.outputs["Image"]
    radio = DESENFOCAR_ENTORNO * ancho
    if radio >= 0.5:
        # desenfoque sólo del entorno: se desenfoca la imagen sin el edificio y se divide por la máscara
        # desenfocada, así el color de la torre no se derrama como un halo sobre lo que la rodea
        fuera = n.new("ShaderNodeMath")
        fuera.operation = "SUBTRACT"
        fuera.inputs[0].default_value = 1.0
        l.new(cripto.outputs["Matte"], fuera.inputs[1])
        sin_torre = n.new("ShaderNodeMix")
        sin_torre.data_type = "RGBA"
        sin_torre.blend_type = "MULTIPLY"
        sin_torre.inputs[0].default_value = 1.0
        l.new(entorno, sin_torre.inputs[6])
        l.new(fuera.outputs[0], sin_torre.inputs[7])
        borrosa, peso = n.new("CompositorNodeBlur"), n.new("CompositorNodeBlur")
        for b in (borrosa, peso):
            b.inputs["Size"].default_value = (radio, radio)
            b.inputs["Extend Bounds"].default_value = False
        l.new(sin_torre.outputs[2], borrosa.inputs["Image"])
        l.new(fuera.outputs[0], peso.inputs["Image"])
        normal = n.new("ShaderNodeMix")
        normal.data_type = "RGBA"
        normal.blend_type = "DIVIDE"
        normal.inputs[0].default_value = 1.0
        l.new(borrosa.outputs["Image"], normal.inputs[6])
        l.new(peso.outputs["Image"], normal.inputs[7])
        entorno = normal.outputs[2]
    l.new(entorno, desat.inputs["Image"])
    l.new(desat.outputs["Image"], blanco.inputs[6])
    l.new(cripto.outputs["Matte"], final.inputs[0])       # 1 = edificio: imagen original
    l.new(blanco.outputs[2], final.inputs[6])
    l.new(capas.outputs["Image"], final.inputs[7])
    l.new(final.outputs[2], salida.inputs[0])
    e.compositing_node_group = ng
    e.render.use_compositing = True
    estado.bruma = cripto
    return cripto


def plano(estado, nombre, centro, ancho, largo, z, giro=0.0):
    """plano horizontal temporal con UV de 0 a 1, fuera de las colecciones del edificio"""
    malla = bpy.data.meshes.new(nombre)
    c, s = math.cos(math.radians(giro)), math.sin(math.radians(giro))
    esquinas = [(-ancho / 2, -largo / 2), (ancho / 2, -largo / 2), (ancho / 2, largo / 2), (-ancho / 2, largo / 2)]
    malla.from_pydata([(centro[0] + x * c - y * s, centro[1] + x * s + y * c, z) for x, y in esquinas], [], [(0, 1, 2, 3)])
    uv = malla.uv_layers.new()
    for bucle, coord in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        bucle.uv = coord
    o = bpy.data.objects.new(nombre, malla)
    bpy.context.scene.collection.objects.link(o)
    estado.suelos.append(o)
    return o


def preparar_fondo(estado, edificio, todos):
    """
    'blanco': se oculta todo lo que no es el edificio y el render sale con transparencia (+ suelo de sombra).
    'realista' con FOTO_ENTORNO: se oculta el entorno modelado y la foto aérea hace de suelo.
    'realista' sin foto: el entorno de la escena queda como está.
    Las luces no se tocan: el sol puede estar en cualquier colección.
    """
    e = estado.escena
    if FONDO == "realista" and not FOTO_ENTORNO:
        return
    propios = set(edificio)
    for o in todos:
        if o not in propios and o.type not in ("LIGHT", "CAMERA", "EMPTY"):
            estado.ocultar(o, True)
    cajas = [v for o in edificio if o.type == "MESH" and o.get("tipo") != "unidad" for v in caja_mundo(o)]
    x0, x1 = min(v.x for v in cajas), max(v.x for v in cajas)
    y0, y1 = min(v.y for v in cajas), max(v.y for v in cajas)
    centro, z_suelo = ((x0 + x1) / 2, (y0 + y1) / 2), min(v.z for v in cajas)

    if FONDO == "blanco":
        e.render.film_transparent = True
        e.render.image_settings.color_mode = "RGBA"
        # EEVEE no tiene shadow catcher: ahí el plano se vería gris, así que va sin sombra
        if SOMBRA and e.render.engine == "CYCLES":
            lado = max(x1 - x0, y1 - y0) * 6
            plano(estado, "_SueloSombra", centro, lado, lado, z_suelo).is_shadow_catcher = True
        return

    img = bpy.data.images.load(bpy.path.abspath(FOTO_ENTORNO))
    ancho_px, alto_px = img.size
    lado = FOTO_ENTORNO_METROS / ESCALA
    ancho, largo = (lado, lado * alto_px / ancho_px) if ancho_px >= alto_px else (lado * ancho_px / alto_px, lado)
    # apenas debajo de la base, para que no parpadee con la losa de planta baja
    suelo = plano(estado, "_FotoEntorno", centro, ancho, largo, z_suelo - 0.02 / ESCALA, FOTO_ENTORNO_GIRO)
    mat = bpy.data.materials.new("_FotoEntorno")
    mat.use_nodes = True
    n = mat.node_tree.nodes
    bsdf = n.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.0   # una foto no brilla
    tex = n.new("ShaderNodeTexImage")
    tex.image = img
    tex.extension = "EXTEND"
    mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    suelo.data.materials.append(mat)
    estado.datos += [mat, img]


def cortar(estado, o, z_corte):
    """
    Copia temporal de la malla (con modificadores aplicados) sin lo que queda por encima de z_corte.
    Se usa bisect y no un Boolean porque el Boolean con mallas abiertas (fachadas de una cara) devuelve basura.
    Donde el corte cierra un anillo (paredes con espesor) se tapa con MATERIAL_CORTE.
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
    estado.temporales.append(copia)
    estado.ocultar(o, True)


def preparar_piso(estado, edificio, piso, z_corte):
    """oculta lo que está arriba del corte y recorta lo que lo atraviesa"""
    estado.borrar_temporales()
    avisos = []
    for o in edificio:
        if o.type == "CAMERA" or o.type == "LIGHT":
            continue
        tipo = o.get("tipo")
        if tipo == "unidad":
            estado.ocultar(o, True)      # las cajas de unidad son ayudas invisibles
            continue
        if tipo == "techo" or ("piso" in o and int(o["piso"]) > piso):
            estado.ocultar(o, True)
            continue
        bajo, alto = z_min(o), z_max(o)
        if bajo >= z_corte:
            estado.ocultar(o, True)
            continue
        estado.ocultar(o, estado.ocultos.get(o.name, o.hide_render))  # vuelve a su visibilidad original
        if alto > z_corte and not o.hide_render:
            if o.type == "MESH":
                cortar(estado, o, z_corte)
            else:
                avisos.append(f"{o.name} ({o.type}) cruza el corte y no se puede recortar: pasalo a malla.")
    return avisos


# ---------------------------------------------------------------- máscara
def poligonos_unidad(escena, cam, o, z_piso, z_corte, ancho, alto):
    """proyección de la huella de la unidad a media altura del corte (un casco por cara inferior, unidos)"""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(dg)
    malla = ev.to_mesh()
    mw = ev.matrix_world
    normal_mw = mw.to_3x3().inverted_safe().transposed()
    caras = [p for p in malla.polygons if (normal_mw @ p.normal).normalized().z < -0.5]
    if not caras:  # un plano o una malla sin cara inferior: se usa todo
        caras = list(malla.polygons)

    def a_px(x, y, z):
        v = world_to_camera_view(escena, cam, Vector((x, y, z)))
        return (round(v.x * ancho, 1), round((1 - v.y) * alto, 1)) if v.z > 0 else None

    # una sola altura, a media altura del corte: proyectar a dos alturas y unir hace que las unidades vecinas
    # se pisen (con la cámara inclinada, el piso y el corte caen en lugares distintos de la imagen)
    z = z_piso + (z_corte - z_piso) / 2
    polis = []
    for p in caras:
        base = [mw @ malla.vertices[i].co for i in p.vertices]
        pts = [a_px(v.x, v.y, z) for v in base]
        if None in pts:
            continue
        h = casco(pts)
        if len(h) >= 3:
            polis.append(h)
    ev.to_mesh_clear()
    if not polis:
        return [], None
    # la etiqueta va en la pieza más grande (en una unidad en L, el cuerpo principal y no el codo)
    centro = centroide(max(polis, key=area))
    if len(polis) > 1:
        polis = [unir(polis)]  # un solo contorno: si no, en la web se ve el borde interno entre piezas
    return polis, centro


def area(poli):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(poli, poli[1:] + poli[:1]))) / 2


def centroide(poli):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(poli, poli[1:] + poli[:1]):
        k = x1 * y2 - x2 * y1
        a += k
        cx += (x1 + x2) * k
        cy += (y1 + y2) * k
    if abs(a) < 1e-9:
        return poli[0]
    return (round(cx / (3 * a), 1), round(cy / (3 * a), 1))


def unir(polis):
    """
    Contorno de la unión de varios polígonos (px). Se rasteriza a 1 px, se recorre el borde y se simplifica:
    la precisión de un píxel alcanza para la máscara y evita implementar una unión exacta.
    """
    x0 = int(min(x for p in polis for x, _ in p)) - 1
    y0 = int(min(y for p in polis for _, y in p)) - 1
    w = int(max(x for p in polis for x, _ in p)) - x0 + 2
    h = int(max(y for p in polis for _, y in p)) - y0 + 2
    grilla = [bytearray(w) for _ in range(h)]
    for p in polis:
        lados = list(zip(p, p[1:] + p[:1]))
        for fila in range(h):
            yc = y0 + fila + 0.5
            cortes = sorted(x1 + (yc - y1) * (x2 - x1) / (y2 - y1)
                            for (x1, y1), (x2, y2) in lados if (y1 <= yc < y2) or (y2 <= yc < y1))
            for a, b in zip(cortes[::2], cortes[1::2]):
                i, j = max(int(round(a - x0)), 0), min(int(round(b - x0)), w)
                if j > i:
                    grilla[fila][i:j] = b"\x01" * (j - i)

    def lleno(i, j):
        return 0 <= j < h and 0 <= i < w and grilla[j][i]

    # bordes orientados (en sentido horario en pantalla) entre celdas llenas y vacías
    siguiente = {}
    for j in range(h):
        for i in range(w):
            if not grilla[j][i]:
                continue
            if not lleno(i, j - 1):
                siguiente.setdefault((i, j), []).append((i + 1, j))
            if not lleno(i + 1, j):
                siguiente.setdefault((i + 1, j), []).append((i + 1, j + 1))
            if not lleno(i, j + 1):
                siguiente.setdefault((i + 1, j + 1), []).append((i, j + 1))
            if not lleno(i - 1, j):
                siguiente.setdefault((i, j + 1), []).append((i, j))
    lazos = []
    while siguiente:
        inicio = next(iter(siguiente))
        lazo, actual = [inicio], inicio
        while True:
            salidas = siguiente.get(actual)
            if not salidas:
                break
            nuevo = salidas.pop()
            if not salidas:
                del siguiente[actual]
            if nuevo == inicio:
                break
            lazo.append(nuevo)
            actual = nuevo
        lazos.append(lazo)
    contorno = max(lazos, key=len)  # el exterior (los huecos, si hubiera, quedan fuera de la máscara)
    return [(round(x0 + i, 1), round(y0 + j, 1)) for i, j in simplificar(contorno, 1.5)]


def simplificar(lazo, tolerancia):
    """Douglas–Peucker sobre un contorno cerrado: saca los escalones de la rasterización"""
    def dp(pts):
        if len(pts) < 3:
            return pts
        (ax, ay), (bx, by) = pts[0], pts[-1]
        largo = math.hypot(bx - ax, by - ay) or 1e-9
        dist = [abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / largo for x, y in pts[1:-1]]
        k = max(range(len(dist)), key=dist.__getitem__)
        if dist[k] <= tolerancia:
            return [pts[0], pts[-1]]
        return dp(pts[:k + 2])[:-1] + dp(pts[k + 1:])

    # se parte en el punto más lejano al primero para que los extremos del DP sean vértices reales
    lejos = max(range(len(lazo)), key=lambda k: (lazo[k][0] - lazo[0][0]) ** 2 + (lazo[k][1] - lazo[0][1]) ** 2)
    a = dp(lazo[:lejos + 1])
    b = dp(lazo[lejos:] + lazo[:1])
    return a[:-1] + b[:-1]


def escribir_mascara(ruta, unidades, ancho, alto, piso):
    torre = f' data-torre="{TORRE}"' if TORRE else ""
    lineas = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" width="{ancho}" height="{alto}" data-piso="{piso}">'
    ]
    for codigo, polis, centro in unidades:
        cx = f' data-cx="{centro[0]}" data-cy="{centro[1]}"' if centro else ""
        if len(polis) == 1:
            puntos = " ".join(f"{x},{y}" for x, y in polis[0])
            lineas.append(f'  <polygon data-unidad="{codigo}"{torre}{cx} points="{puntos}"/>')
        else:
            d = " ".join("M" + " L".join(f"{x} {y}" for x, y in h) + " Z" for h in polis)
            lineas.append(f'  <path data-unidad="{codigo}"{torre}{cx} d="{d}"/>')
    lineas.append("</svg>")
    with open(ruta, "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")


# ---------------------------------------------------------------- principal
def main():
    global FONDO
    pisos_pedidos, solo_mascaras, prueba = leer_argumentos()
    escena = bpy.context.scene
    cam, col, ref = validar(escena)
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if "--fondo" in a:  # pisa la propiedad de la cámara: sirve para sacar las dos versiones sin tocar el .blend
        FONDO = a[a.index("--fondo") + 1].lower()
        if FONDO not in ("realista", "blanco"):
            raise RuntimeError(f"--fondo {FONDO}: tiene que ser 'realista' o 'blanco'.")
    edificio = list(dict.fromkeys(o for c in col for o in objetos_de(c)))
    todos = list(bpy.data.objects)
    z_niveles = niveles(todos)
    if ref not in z_niveles:
        raise RuntimeError(f"El piso de referencia {ref} no existe. Pisos encontrados: {list(z_niveles)}")

    pisos = [ref] if prueba else [p for p in z_niveles if pisos_pedidos is None or p in pisos_pedidos]
    carpeta = bpy.path.abspath(SALIDA)
    os.makedirs(carpeta, exist_ok=True)
    pct = 25 if prueba else escena.render.resolution_percentage
    ancho = escena.render.resolution_x * pct // 100
    alto = escena.render.resolution_y * pct // 100
    ext = "webp" if FORMATO == "WEBP" else "png"

    estado = Estado(escena, cam)
    manifest = {"camara": CAMARA, "pisoReferencia": ref, "ancho": ancho, "alto": alto, "fondo": FONDO, "pisos": []}
    print(f"\n=== Renders de plantas · {len(pisos)} piso(s) · {ancho}×{alto} · fondo {FONDO} ===")
    try:
        escena.camera = cam
        escena.render.resolution_percentage = pct
        escena.render.image_settings.file_format = FORMATO
        if FORMATO == "WEBP":
            escena.render.image_settings.quality = CALIDAD
        sobran = {o for n in OCULTAR_COLECCIONES if n in bpy.data.collections
                  for o in objetos_de(bpy.data.collections[n])}
        for o in todos:
            # las cajas de unidad son ayudas invisibles, estén en la colección que estén
            if o.name.startswith(tuple(OCULTAR)) or o.get("tipo") == "unidad" or (o in sobran and o.type != "LIGHT"):
                estado.ocultar(o, True)
        if not solo_mascaras:
            preparar_fondo(estado, edificio, todos)
        # en blanco no hay entorno que atenuar
        bruma = FONDO == "realista" and max(ATENUAR_ENTORNO, DESATURAR_ENTORNO, DESENFOCAR_ENTORNO) > 0
        cripto = preparar_bruma(estado, ancho) if bruma and not solo_mascaras else None

        for piso in pisos:
            z_piso = z_niveles[piso]
            z_corte = z_piso + ALTURA_CORTE / ESCALA
            cam.location.z = estado.cam_z + (z_piso - z_niveles[ref])
            avisos = preparar_piso(estado, edificio, piso, z_corte)
            bpy.context.view_layer.update()

            unidades = []
            for o in sorted((o for o in todos if o.get("tipo") == "unidad" and int(o.get("piso", -999)) == piso),
                            key=lambda o: str(o.get("unidad"))):
                polis, centro = poligonos_unidad(escena, cam, o, z_piso, z_corte, ancho, alto)
                if polis:
                    unidades.append((str(o["unidad"]), polis, centro))
                else:
                    avisos.append(f"{o.name}: queda fuera de cuadro o detrás de la cámara.")

            nombre = f"piso-{piso:02d}" if piso >= 0 else f"subsuelo-{-piso:02d}"
            escribir_mascara(os.path.join(carpeta, f"{nombre}.svg"), unidades, ancho, alto, piso)
            if cripto:
                visibles = [o.name for o in edificio if not o.hide_render] + [o.name for o in estado.temporales]
                cripto.matte_id = ", ".join(visibles)
            if not solo_mascaras:
                escena.render.filepath = os.path.join(carpeta, f"{nombre}.{ext}")
                bpy.ops.render.render(write_still=True)
            manifest["pisos"].append({"piso": piso, "imagen": f"{nombre}.{ext}", "mascara": f"{nombre}.svg",
                                      "unidades": [u[0] for u in unidades]})
            print(f"  piso {piso}: {len(unidades)} unidad(es)" + ("" if solo_mascaras else f" → {nombre}.{ext}"))
            for a in avisos:
                print("    AVISO:", a)
    finally:
        estado.restaurar()

    with open(os.path.join(carpeta, "plantas.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Listo: {carpeta}\n")


if __name__ == "__main__":
    main()
