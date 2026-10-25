"""
Arranque de una sesión de trabajo de Cañada de Gómez 931 en el Blender abierto (por el MCP o Scripting → Run):
abre blender/ca931_web.blend, rearma la escena con modelar_ca931.py y deja en bpy.app.driver_namespace["ca931"]
las funciones de siempre, para no repetirlas cada vez que Blender se reinicia (cortar un render obliga a cerrarlo).

    d = bpy.app.driver_namespace["ca931"]
    d["correr"]()                                   # rearma el modelo
    d["mascaras"]()                                 # máscaras de Disponibilidad (renders_fachadas.py)
    d["exportar"]()                                 # .glb de la web (exportar_web.py)
    d["plantas"](["--pisos", "0-4"], "CYCLES")      # renders_plantas.py
    d["renders"]["renderizar"]("Ref_Izquierda", "frente-dia", "dia")   # renders_ca931.py
    d["previa"]("estar", "Pano_3-ambientes_estar", giro=0)          # vista rápida del recorrido 360
    d["tanda"](["--recorridos", "3-ambientes"], fin)                 # renders_recorrido.py encolado

Los renders largos van con bpy.app.timers.register(...) para que la llamada del MCP vuelva enseguida.
"""

import contextlib
import io
import os
import sys

import bpy

AQUI = os.path.dirname(os.path.abspath(globals().get("__file__", "C:/931-ca-ada-gomez/scripts/blender/x.py")))
REPO = os.path.abspath(os.path.join(AQUI, "..", ".."))
BLEND = os.path.join(REPO, "blender", "ca931_web.blend")


def _correr_script(nombre, argv=None, como_main=True):
    ruta = os.path.join(AQUI, nombre)
    ns = {"__file__": ruta, "__name__": "__main__" if como_main else nombre[:-3]}
    antes = list(sys.argv)
    if argv is not None:
        sys.argv = ["blender", "--"] + argv
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(open(ruta, encoding="utf-8").read(), ns)
            if not como_main and "main" in ns:
                ns["main"]()
    finally:
        sys.argv = antes
    return buf.getvalue(), ns


def correr():
    for m in list(bpy.data.materials):
        if m.name.startswith("WEB_"):
            bpy.data.materials.remove(m)
    _correr_script("modelar_ca931.py")


def mascaras():
    esc = bpy.context.scene
    logs = []
    for n in (1, 2):
        cam = bpy.data.objects[f"Render_Fachada_{n}"]
        esc.render.resolution_x, esc.render.resolution_y = cam["resolucion"]
        esc.render.resolution_percentage = 100
        log, _ = _correr_script("renders_fachadas.py", ["--camaras", str(n), "--solo-mascaras"])
        logs += [l.strip() for l in log.splitlines() if "unidad" in l]
    return logs


def exportar():
    esc = bpy.context.scene
    esc.camera = bpy.data.objects["Ref_Izquierda"]
    esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage = 1600, 1563, 100
    log, _ = _correr_script("exportar_web.py")
    return [l for l in log.splitlines() if "Listo" in l or "ERROR" in l or "AVISO" in l]


def plantas(args, motor=None):
    esc = bpy.context.scene
    antes = esc.render.engine, esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage
    if motor:
        esc.render.engine = motor
    # las de la web son 2560×1440 (la resolución de la escena queda en la de las fotos del cliente)
    esc.render.resolution_x, esc.render.resolution_y, esc.render.resolution_percentage = 2560, 1440, 100
    try:
        log, _ = _correr_script("renders_plantas.py", args, como_main=False)
    finally:
        (esc.render.engine, esc.render.resolution_x, esc.render.resolution_y,
         esc.render.resolution_percentage) = antes
    return log


# ---------------------------------------------------------------- recorrido 360 (recorrido_ca931.py)
PREVIAS = os.path.join(REPO, "blender", "web", "previas")
# los vidrios que renders_recorrido.py cambia por vidrio real (transparente para el sol y la luz difusa)
VIDRIOS = ("WEB_Vidrio", "WEB_Vidrio_Local", "WEB_Vidrio_Baranda")


def _recorrido_ns():
    ruta = os.path.join(AQUI, "renders_recorrido.py")
    rr = {"__name__": "renders_recorrido", "__file__": ruta}
    exec(open(ruta, encoding="utf-8").read(), rr)
    rr["VIDRIOS"] = VIDRIOS
    # en el plano, sólo el edificio (con las plantas de los balcones): sin vecinos, vereda ni árboles
    rr["OCULTAR_PLANO"] = ("WEB_Entorno", "Render", "Recorrido_Enfrente", "Arboles")
    return rr


def _preparar_recorrido(rr, cambios):
    """lo propio del 931 antes del ambiente de renders_recorrido.py: prende las terminaciones de la colección
    Recorrido, oculta los muebles en cajas que reemplazan, pone los materiales de render a lo que se ve por las
    ventanas (balcón, vecinos, vereda) y las plantas de los balcones"""
    esc = bpy.context.scene
    for o in list(bpy.data.collections["Recorrido"].all_objects):
        if o is None:  # recién borrado (Blender actualiza la lista después)
            continue
        if o.type == "MESH":
            cambios.fijar(o, "hide_render", False)
        if o.get("reemplaza") and o["reemplaza"] in bpy.data.objects:
            cambios.fijar(bpy.data.objects[o["reemplaza"]], "hide_render", True)
    rn = bpy.app.driver_namespace["ca931"]["renders"]
    mats = rn["materiales_render"]()
    for o in bpy.data.objects:
        if o.type == "MESH":
            for i, m in enumerate(o.data.materials):
                if m and m.name in mats and m.name not in VIDRIOS:
                    o.data.materials[i] = mats[m.name]
                    cambios.deshacer.append(lambda d=o.data, i=i, m=m: d.materials.__setitem__(i, m))
        if o.name.startswith("Arboles") and not o.hide_render:
            cambios.fijar(o, "hide_render", True)  # los de caja: en su lugar, los de la plantilla
    col = bpy.data.collections.new("R_Recorrido")
    esc.collection.children.link(col)
    rn["plantas"](col)

    def sacar():
        for o in list(col.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(col)
    cambios.deshacer.append(sacar)
    cambios.fijar(esc.cycles, "device", "GPU")


def previa(nombre, camara, giro=0.0, muestras=128, lente=14, ancho=960, alto=540, extra=None):
    """
    perspectiva rápida desde la cámara Pano_* `camara` (girada `giro` grados a la derecha) con el mismo ambiente
    que la panorámica: para revisar antes de la tanda (~10 s). PNG en blender/web/previas/<nombre>.png
    """
    import math
    import time
    from mathutils import Vector
    rr = _recorrido_ns()
    pano = bpy.data.objects[camara]
    primera = min((o for o in bpy.data.objects if o.name.startswith("Pano_" + camara.split("_")[1] + "_")),
                  key=lambda o: (float(o.get("orden", 1e9)), o.name))
    rr["configurar"](primera)
    for k, v in (extra or {}).items():
        rr[k] = v
    esc = bpy.context.scene
    todos = list(bpy.data.objects)
    cambios = rr["Cambios"]()
    datos = bpy.data.cameras.new("_Previa")
    datos.lens, datos.sensor_width, datos.clip_start = lente, 36, 0.02
    cam = bpy.data.objects.new("_Previa", datos)
    esc.collection.objects.link(cam)
    f = pano.matrix_world.to_3x3() @ Vector((0, 0, -1))
    cam.location = pano.matrix_world.translation
    cam.rotation_euler = (math.radians(90), 0, math.atan2(-f.x, f.y) - math.radians(giro))
    antes = esc.camera, esc.render.filepath
    os.makedirs(PREVIAS, exist_ok=True)
    try:
        rr["ocultar_sobrantes"](cambios, todos)
        _preparar_recorrido(rr, cambios)
        rr["preparar_render"](cambios, esc, True)
        rr["preparar_ambiente"](cambios, esc, todos)
        cambios.fijar(esc.cycles, "samples", muestras)
        cambios.fijar(esc.render, "resolution_x", ancho)
        cambios.fijar(esc.render, "resolution_y", alto)
        cambios.fijar(esc.render, "resolution_percentage", 100)
        cambios.fijar(esc.render, "film_transparent", False)
        cambios.fijar(esc.render.image_settings, "file_format", "PNG")
        esc.camera = cam
        esc.render.filepath = os.path.join(PREVIAS, nombre + ".png")
        t = time.time()
        bpy.ops.render.render(write_still=True)
        return round(time.time() - t, 1)
    finally:
        cambios.restaurar()
        esc.camera, esc.render.filepath = antes
        bpy.data.objects.remove(cam)
        bpy.data.cameras.remove(datos)


def tanda(args, fin):
    """renders_recorrido.py encolado con un timer (la llamada del MCP vuelve enseguida); al terminar escribe `fin`
    con los segundos y "ok" o el error. Blender queda ocupado: no mandarle nada hasta que exista `fin`"""
    import time
    import traceback
    if os.path.exists(fin):
        os.remove(fin)
    t0 = time.time()

    def correr_tanda():
        rr = _recorrido_ns()
        cambios = rr["Cambios"]()
        argv, msg = list(sys.argv), "ok"
        try:
            _preparar_recorrido(rr, cambios)
            sys.argv = ["blender", "--"] + list(args)
            rr["main"]()
        except Exception:
            msg = traceback.format_exc()
        finally:
            sys.argv = argv
            cambios.restaurar()
            with open(fin, "w", encoding="utf-8") as f:
                f.write(f"{round(time.time() - t0)} s\n{msg}")
        return None
    bpy.app.timers.register(correr_tanda, first_interval=0.5)


def arrancar():
    if os.path.normcase(bpy.data.filepath) != os.path.normcase(BLEND):
        bpy.ops.wm.open_mainfile(filepath=BLEND)
    correr()
    _, renders = _correr_script("renders_ca931.py", como_main=False)
    bpy.app.driver_namespace["ca931"] = {"correr": correr, "mascaras": mascaras, "exportar": exportar,
                                         "plantas": plantas, "renders": renders, "previa": previa,
                                         "tanda": tanda}


arrancar()
