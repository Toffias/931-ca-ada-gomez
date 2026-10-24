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
    antes = esc.render.engine
    if motor:
        esc.render.engine = motor
    try:
        log, _ = _correr_script("renders_plantas.py", args, como_main=False)
    finally:
        esc.render.engine = antes
    return log


def arrancar():
    if os.path.normcase(bpy.data.filepath) != os.path.normcase(BLEND):
        bpy.ops.wm.open_mainfile(filepath=BLEND)
    correr()
    _, renders = _correr_script("renders_ca931.py", como_main=False)
    bpy.app.driver_namespace["ca931"] = {"correr": correr, "mascaras": mascaras, "exportar": exportar,
                                         "plantas": plantas, "renders": renders}


arrancar()
