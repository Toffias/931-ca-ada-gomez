"""
Renders fotorrealistas de fachada de Cañada de Gómez 931 (Cycles), de día y al atardecer, desde las cámaras calzadas
sobre las fotos del cliente y una aérea. Fase C de docs/plan-renders-931.md.

Mientras renderiza, y sólo entonces, cambia los materiales WEB_* (simples, para el .glb) por PBR (revoque con
textura, roble, piedra, baldosas, asfalto y vidrio real: se ven los interiores vestidos de vestir_ca931.py), pone
plantas de Poly Haven en balcones y jardinera, oculta los árboles de cajas y, al atardecer, agrega una luz real
por spot, luz cálida en cada unidad y en el hall, y cielo de atardecer. Al terminar restaura todo: el .blend y el
.glb que exporta exportar_web.py quedan como estaban.

Uso (Blender abierto, después de modelar_ca931.py; con el MCP, cargarlo como módulo para no correr main):
    ns = {"__name__": "renders_ca931", "__file__": ruta}; exec(open(ruta).read(), ns)
    ns["renderizar"]("Ref_Izquierda", "frente-dia", "dia")      # → //web/renders/frente-dia.webp
Texturas: public/texturas del repo (las mismas del visor) y los assets de bajar_assets_interior.py.
"""

import math
import os

import bpy
from mathutils import Matrix, Vector

AQUI = os.path.dirname(os.path.abspath(globals().get("__file__", "C:/931-ca-ada-gomez/scripts/blender/x.py")))
REPO = os.path.abspath(os.path.join(AQUI, "..", ".."))
TEX_WEB = os.path.join(REPO, "public", "texturas")
SALIDA = "//web/renders"
MUESTRAS = 256

vi = {"__name__": "vestir_interior", "__file__": os.path.join(AQUI, "vestir_interior.py")}
exec(open(vi["__file__"], encoding="utf-8").read(), vi)


# ---------------------------------------------------------------- materiales de render
def textura_web(nombre, carpeta, lado, tinte=(1, 1, 1), rugosidad=(0.5, 0.95), relieve=1.0):
    """PBR con las texturas del visor (public/texturas/<carpeta>), en UV en metros (las mallas las traen)"""
    m, nt, bsdf = vi["arbol_limpio"](nombre)
    uv = nt.nodes.new("ShaderNodeTexCoord")
    mapeo = nt.nodes.new("ShaderNodeMapping")
    mapeo.inputs["Scale"].default_value = (1 / lado, 1 / lado, 1)
    nt.links.new(uv.outputs["UV"], mapeo.inputs["Vector"])

    def imagen(archivo, color):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(os.path.join(TEX_WEB, carpeta, archivo), check_existing=True)
        n.image.colorspace_settings.name = "sRGB" if color else "Non-Color"
        nt.links.new(mapeo.outputs["Vector"], n.inputs["Vector"])
        return n.outputs["Color"]

    mezcla = nt.nodes.new("ShaderNodeMix")
    mezcla.data_type, mezcla.blend_type = "RGBA", "MULTIPLY"
    mezcla.inputs["Factor"].default_value = 1.0
    nt.links.new(imagen("color.jpg", True), vi["socket"](mezcla, "A", "RGBA"))
    vi["socket"](mezcla, "B", "RGBA").default_value = (*tinte, 1)
    nt.links.new(vi["socket"](mezcla, "Result", "RGBA", salida=True), bsdf.inputs["Base Color"])
    rango = nt.nodes.new("ShaderNodeMapRange")
    rango.inputs["To Min"].default_value, rango.inputs["To Max"].default_value = rugosidad
    nt.links.new(imagen("rugosidad.jpg", False), rango.inputs["Value"])
    nt.links.new(rango.outputs["Result"], bsdf.inputs["Roughness"])
    normal = nt.nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = relieve
    nt.links.new(imagen("normal.jpg", False), normal.inputs["Color"])
    nt.links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def teja(nombre):
    """tejas esmaltadas negras: hiladas con relieve y brillo (procedural; sólo Cycles)"""
    m, nt, bsdf = vi["arbol_limpio"](nombre)
    uv = nt.nodes.new("ShaderNodeTexCoord")
    ladrillo = nt.nodes.new("ShaderNodeTexBrick")
    ladrillo.offset, ladrillo.squash = 0.5, 1.0
    ladrillo.inputs["Scale"].default_value = 1.0       # UV en metros: tejas de 25 × 30 cm
    ladrillo.inputs["Mortar Size"].default_value = 0.012
    ladrillo.inputs["Brick Width"].default_value = 0.25
    ladrillo.inputs["Row Height"].default_value = 0.3
    ladrillo.inputs["Color1"].default_value = (0.02, 0.025, 0.028, 1)
    ladrillo.inputs["Color2"].default_value = (0.035, 0.045, 0.05, 1)
    ladrillo.inputs["Mortar"].default_value = (0.01, 0.01, 0.01, 1)
    nt.links.new(uv.outputs["UV"], ladrillo.inputs["Vector"])
    nt.links.new(ladrillo.outputs["Color"], bsdf.inputs["Base Color"])
    relieve = nt.nodes.new("ShaderNodeBump")
    relieve.inputs["Strength"].default_value = 1.0
    nt.links.new(ladrillo.outputs["Fac"], relieve.inputs["Height"])
    nt.links.new(relieve.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.5
    bsdf.inputs["Coat Weight"].default_value = 0.15
    return m


def invisible(nombre):
    m, nt, bsdf = vi["arbol_limpio"](nombre)
    salida = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    nt.nodes.remove(bsdf)
    nt.links.new(nt.nodes.new("ShaderNodeBsdfTransparent").outputs[0], salida.inputs["Surface"])
    return m


def materiales_render():
    """WEB_* → material de render. Lo que no está acá se renderiza con su material de siempre"""
    tw, liso = textura_web, vi["liso"]
    return {
        "WEB_Revoque_Gris": tw("R_Revoque_Gris", "revoque", 2.0, (0.3, 0.285, 0.265), (0.7, 0.95), 1.6),
        "WEB_Revoque_Muro": tw("R_Revoque_Muro", "revoque", 2.0, (0.62, 0.59, 0.55), (0.7, 0.95), 1.4),
        "WEB_Revoque_Claro": tw("R_Revoque_Claro", "revoque", 2.0, (0.62, 0.6, 0.56), (0.7, 0.95), 1.2),
        "WEB_Fachada_Crema": tw("R_Revoque_Crema", "revoque", 2.0, (0.95, 0.86, 0.68), (0.7, 0.95), 1.4),
        "WEB_Fachada_Vecinos": tw("R_Vecinos", "revoque", 2.5, (0.92, 0.84, 0.7), (0.75, 0.95), 1.4),
        "WEB_Vecinos_Claro": tw("R_Vecinos_Claro", "revoque", 2.0, (1.0, 0.97, 0.9), (0.7, 0.95), 1.0),
        "WEB_Balaustrada": tw("R_Balaustrada", "revoque", 1.5, (1.05, 1.03, 1.0), (0.6, 0.9), 0.8),
        "WEB_Teja": teja("R_Teja"),
        "WEB_Madera_Oscura": vi["pbr"]("R_Madera_Oscura", "nogal", tinte=(0.45, 0.25, 0.12), rugosidad=(0.4, 0.7),
                                       normal=0.5),
        "WEB_Porton_Madera": vi["pbr"]("R_Porton_Madera", "nogal", tinte=(0.75, 0.42, 0.22), rugosidad=(0.35, 0.6),
                                       normal=0.6),
        "WEB_Porton_Negro": vi["liso"]("R_Porton_Negro", (0.015, 0.015, 0.016), 0.35, **{"Coat Weight": 0.3}),
        "WEB_Reja": vi["liso"]("R_Reja", (0.01, 0.01, 0.01), 0.4, Metallic=0.7),
        "WEB_Vidrio_Vecinos": vi["liso"]("R_Vidrio_Vecinos", (0.02, 0.025, 0.03), 0.04, **{"Coat Weight": 1.0}),
        "WEB_Jardin": vi["pbr"]("R_Jardin", "alfombra", color_fijo=(0.06, 0.13, 0.03), rugosidad=(0.8, 1.0), normal=1.5),
        "WEB_Tierra": vi["liso"]("R_Tierra", (0.08, 0.055, 0.035), 0.95),
        "WEB_Madera_Listones": vi["pbr"]("R_Madera", "roble", tinte=(0.55, 0.36, 0.2), rugosidad=(0.45, 0.7),
                                         normal=0.6),
        "WEB_Piedra_Negra": vi["pbr"]("R_Piedra_Negra", "marmol", color_fijo=(0.03, 0.03, 0.03),
                                      rugosidad=(0.25, 0.6), normal=1.5),
        # adoquín gris claro de la foto: el hormigón a escala chica lee como piezas, la baldosa grande quedaba oscura
        "WEB_Vereda": tw("R_Vereda", "hormigon", 0.6, (1.0, 0.98, 0.95), (0.7, 0.95), 1.2),
        "WEB_Cordon": tw("R_Cordon", "hormigon", 2.7, (0.85, 0.85, 0.83), (0.7, 0.95), 1.0),
        "WEB_Asfalto": tw("R_Asfalto", "asfalto", 3.0, (0.55, 0.55, 0.55), (0.85, 1.0), 1.0),
        "WEB_Piso_Balcon": tw("R_Piso_Balcon", "hormigon", 0.6, (0.8, 0.79, 0.76), (0.6, 0.9), 1.0),
        "WEB_Vidrio": vi["vidrio"]("R_Vidrio", (0.92, 0.96, 0.96)),
        "WEB_Vidrio_Local": vi["vidrio"]("R_Vidrio_Local", (0.92, 0.96, 0.96)),
        "WEB_Vidrio_Baranda": vi["vidrio"]("R_Vidrio_Baranda", (0.9, 0.95, 0.95)),
        "WEB_Metal_Negro": liso("R_Metal_Negro", (0.02, 0.02, 0.022), 0.35, Metallic=0.8),
        "WEB_Cielorraso": liso("R_Cielorraso", (0.78, 0.76, 0.72), 0.9),
        "WEB_Farol_LED": vi["emisor"]("R_LED", (1.0, 0.6, 0.3), 12.0),
        "WEB_Farol_Spot": vi["emisor"]("R_Spot", (1.0, 0.82, 0.6), 30.0),
        # las esferas de los balcones: se reemplazan por plantas de Poly Haven
        "WEB_Planta": invisible("R_Invisible"),
        "WEB_Arbusto": invisible("R_Invisible_Arbusto"),  # en su lugar, los arbustos de la plantilla
    }


# ---------------------------------------------------------------- plantas
_modelos = {}


def medidas():
    """las de modelar_ca931.py (las deja en driver_namespace al correr)"""
    return bpy.app.driver_namespace["ca931_medidas"]


def colocar(slug, col, x, y, giro, z):
    """copia de un modelo de Poly Haven en coordenadas de mundo (frente hacia -Y), compartiendo mallas"""
    if slug not in _modelos:
        carpeta = os.path.join(vi["ASSETS"], "modelos", slug)
        archivo = next(os.path.join(carpeta, f) for f in os.listdir(carpeta) if f.endswith(".blend"))
        with bpy.data.libraries.load(archivo, link=False) as (src, dst):
            dst.objects = list(src.objects)
        objs = [o for o in dst.objects if o and o.type == "MESH"]
        for o in objs:
            for mat in o.data.materials:
                for n in (mat.node_tree.nodes if mat and mat.node_tree else []):
                    if n.type == "TEX_IMAGE" and n.image and n.image.source == "FILE":
                        buena = os.path.join(carpeta, "textures", os.path.basename(n.image.filepath))
                        if os.path.exists(buena):
                            n.image.filepath = buena
                            n.image.reload()
        _modelos[slug] = [(o, o.matrix_world.copy()) for o in objs]
    m = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(giro), 4, "Z")
    for o, base in _modelos[slug]:
        c = o.copy()
        c.matrix_world = m @ base
        col.objects.link(c)


def plantas(col, jardinera=True):
    """macetas con plantas reales en los balcones del 3 ambientes, colgantes en el 2 ambientes y en la jardinera
    (ésta no en el recorrido: tapaba las ventanas de los dormitorios de planta baja)"""
    g = medidas()
    for n in range(1, g["PISOS"] + 1):
        z = g["ALTO_PB"] + (n - 1) * g["ALTO_PISO"] + g["LOSA"]
        colocar("potted_plant_01", col, g["X0"] + g["ALETA"] + 0.4, -g["BALCON"] + 0.4, -60, z)
        colocar("potted_plant_01", col, g["MAD_I"] - 0.45, -g["BALCON"] + 0.4, 40, z)
        colocar("potted_plant_02", col, g["X1"] - 0.6, -g["BALCON"] + 0.06, 25, z + 1.0)  # sobre el antepecho
    for x in (g["X0"] + 1.5, g["X0"] + 3.0) if jardinera else ():
        colocar("potted_plant_01", col, x, 0.3, 0, 0.4)


# ---------------------------------------------------------------- atardecer
def luz(col, nombre, tipo, ubicacion, energia, color, **extra):
    l = bpy.data.lights.new(nombre, tipo)
    l.energy, l.color = energia, color
    for k, v in extra.items():
        setattr(l, k, v)
    o = bpy.data.objects.new(nombre, l)
    o.location = ubicacion
    o.visible_camera = False  # se ve lo que alumbran, no la lámpara
    col.objects.link(o)
    return o


def luces_interiores(col, factor):
    """luz cálida en el estar de A y de B y en los dormitorios del fondo, por piso, y en el hall"""
    g = medidas()
    X0, ALTO_PB, ALTO_PISO, LOSA = g["X0"], g["ALTO_PB"], g["ALTO_PISO"], g["LOSA"]
    for n in range(0, g["PISOS"] + 1):
        # a 1,8 m y grandes: pegadas al cielorraso lo quemaban (se veía como un panel blanco a través del vidrio)
        z = (ALTO_PB + (n - 1) * ALTO_PISO + LOSA if n else 0) + 1.8
        for x, y, w in ((X0 + 1.6, 2.5, 90), (X0 + 7.0, 2.8, 75), (X0 + 1.6, 13.5, 30), (X0 + 7.0, 13.5, 30)):
            luz(col, f"R_Interior_{n}_{x:.0f}_{y:.0f}", "AREA", (x, y, z), w * factor, (1.0, 0.78, 0.55), size=2.0)
    luz(col, "R_Hall", "AREA", (1.7, 2.8, ALTO_PB - 0.35), 80 * factor, (1.0, 0.8, 0.6), size=1.0)


def luces_atardecer(col):
    """una luz real por spot (el LED y los spots ya brillan con R_LED / R_Spot)"""
    spots = []
    for o in bpy.data.collections["WEB"].all_objects:
        if o.type != "MESH":
            continue
        idx = [i for i, s in enumerate(o.material_slots) if s.material and s.material.name == "WEB_Farol_Spot"]
        if not idx:
            continue
        centros = {}
        for p in o.data.polygons:
            if p.material_index in idx:
                c = o.matrix_world @ p.center
                centros.setdefault((round(c.x, 1), round(c.y, 1)), []).append(c)
        spots += [sum(v, Vector()) / len(v) for v in centros.values()]
    for i, c in enumerate(spots):
        luz(col, f"R_Spot_{i}", "SPOT", c - Vector((0, 0, 0.03)), 35, (1.0, 0.72, 0.45),
            spot_size=math.radians(110), spot_blend=0.6, shadow_soft_size=0.03)
    return len(spots)


# ---------------------------------------------------------------- cielo
def cielo(modo):
    """
    El HDRI de Poly Haven ilumina (luz y reflejos reales) pero es de una ciudad: la cámara ve en cambio un cielo
    degradado (azul de día; naranja en el horizonte y azul arriba al atardecer), como en las fotos del cliente
    """
    esc = bpy.context.scene
    nt = esc.world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    salida = nt.nodes.new("ShaderNodeOutputWorld")
    luz_hdri = nt.nodes.new("ShaderNodeBackground")
    tex = nt.nodes.new("ShaderNodeTexEnvironment")
    tex.image = bpy.data.images.load(os.path.join(vi["ASSETS"], "hdris", "portland_landing_pad_8k.hdr"),
                                     check_existing=True)
    tinte = nt.nodes.new("ShaderNodeMix")
    tinte.data_type, tinte.blend_type = "RGBA", "MULTIPLY"
    tinte.inputs["Factor"].default_value = 1.0
    nt.links.new(tex.outputs["Color"], vi["socket"](tinte, "A", "RGBA"))
    nt.links.new(vi["socket"](tinte, "Result", "RGBA", salida=True), luz_hdri.inputs["Color"])

    coords = nt.nodes.new("ShaderNodeTexCoord")
    xyz = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(coords.outputs["Generated"], xyz.inputs[0])
    rampa = nt.nodes.new("ShaderNodeValToRGB")
    nt.links.new(xyz.outputs["Z"], rampa.inputs["Fac"])
    cam = nt.nodes.new("ShaderNodeBackground")
    nt.links.new(rampa.outputs["Color"], cam.inputs["Color"])
    els = rampa.color_ramp.elements
    if modo == "dia":
        vi["socket"](tinte, "B", "RGBA").default_value = (1.0, 1.0, 1.0, 1)
        luz_hdri.inputs["Strength"].default_value = 0.8
        els[0].position, els[0].color = 0.0, (0.55, 0.68, 0.85, 1)
        els[1].position, els[1].color = 0.55, (0.03, 0.18, 0.62, 1)
        cam.inputs["Strength"].default_value = 1.0
    else:
        vi["socket"](tinte, "B", "RGBA").default_value = (1.0, 0.88, 0.78, 1)
        luz_hdri.inputs["Strength"].default_value = 0.25
        els[0].position, els[0].color = 0.0, (1.0, 0.45, 0.1, 1)
        e = els.new(0.25)
        e.color = (1.0, 0.62, 0.32, 1)
        els[-1].position, els[-1].color = 0.6, (0.04, 0.06, 0.2, 1)
        cam.inputs["Strength"].default_value = 0.9
    camino = nt.nodes.new("ShaderNodeLightPath")
    mezcla = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(camino.outputs["Is Camera Ray"], mezcla.inputs["Fac"])
    nt.links.new(luz_hdri.outputs[0], mezcla.inputs[1])
    nt.links.new(cam.outputs[0], mezcla.inputs[2])
    nt.links.new(mezcla.outputs[0], salida.inputs["Surface"])


def suelo(col, mats):
    """las tomas están hechas desde más atrás que la vereda de enfrente: piso hasta la cámara"""
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1)
    me = bpy.data.meshes.new("R_Suelo")
    bm.to_mesh(me)
    bm.free()
    uv = me.uv_layers.new()
    o = bpy.data.objects.new("R_Suelo", me)
    o.scale = (60, 15, 1)
    o.location = (0, -31.0, 0.15)
    for i, loop in enumerate(me.loops):
        v = me.vertices[loop.vertex_index].co
        uv.data[i].uv = (v.x * 60, v.y * 15)
    me.materials.append(mats["WEB_Asfalto"])  # la calle sigue hacia la cámara, como en las fotos
    col.objects.link(o)


# ---------------------------------------------------------------- render
def renderizar(camara, nombre, modo="dia", resolucion=None, porcentaje=100, muestras=MUESTRAS, limite=0):
    esc = bpy.context.scene
    cam = bpy.data.objects[camara]
    res = resolucion or tuple(cam.get("resolucion", (1600, 1563)))
    antes = dict(cam=esc.camera, res=(esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage),
                 fmt=esc.render.image_settings.file_format, ruta=esc.render.filepath, muestras=esc.cycles.samples,
                 motor=esc.render.engine, expo=esc.view_settings.exposure)
    cambios, ocultos = [], []
    mats = materiales_render()
    sol = bpy.data.objects.get("Sol")
    sol_antes = sol.data.energy if sol else None
    col = bpy.data.collections.new("R_Temporal")
    esc.collection.children.link(col)
    try:
        for o in bpy.data.objects:
            if o.type == "MESH":
                for s in o.material_slots:
                    if s.material and s.material.name in mats:
                        cambios.append((s, s.material))
                        s.material = mats[s.material.name]
            if o.name.startswith("Arboles") and not o.hide_render:
                ocultos.append(o)
                o.hide_render = True
        plantas(col)
        suelo(col, mats)
        if modo == "atardecer":
            luces_atardecer(col)
            luces_interiores(col, 1.0)
            if sol:  # último sol, rasante y cálido
                sol.data.energy, sol.data.color = 2.0, (1.0, 0.58, 0.3)
            esc.view_settings.exposure = 0.8
        else:
            luces_interiores(col, 0.5)  # en las fotos de día también hay luces prendidas adentro
        cielo(modo)
        esc.camera = cam
        esc.render.engine = "CYCLES"
        esc.cycles.samples = muestras
        esc.cycles.use_denoising = True
        esc.cycles.use_adaptive_sampling, esc.cycles.adaptive_threshold = True, 0.02
        esc.cycles.time_limit = limite  # con CPU: un tope por imagen para que la tanda no se vaya de horas
        esc.render.resolution_x, esc.render.resolution_y = res
        esc.render.resolution_percentage = porcentaje
        esc.render.image_settings.file_format = "WEBP"
        esc.render.image_settings.quality = 90
        os.makedirs(bpy.path.abspath(SALIDA), exist_ok=True)
        esc.render.filepath = os.path.join(bpy.path.abspath(SALIDA), f"{nombre}.webp")
        bpy.ops.render.render(write_still=True)
        return esc.render.filepath
    finally:
        for s, m in cambios:
            s.material = m
        for o in ocultos:
            o.hide_render = False
        for o in list(col.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(col)
        if sol:
            sol.data.energy, sol.data.color = sol_antes, (1.0, 1.0, 1.0)
        cielo("dia")  # el mundo de siempre (HDRI), el que usan las plantas
        esc.camera = antes["cam"]
        esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage = antes["res"]
        esc.render.image_settings.file_format, esc.render.filepath = antes["fmt"], antes["ruta"]
        esc.cycles.samples, esc.render.engine, esc.view_settings.exposure = antes["muestras"], antes["motor"], antes["expo"]
        esc.cycles.time_limit = 0
