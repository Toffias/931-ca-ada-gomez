# Encola renders_recorrido.py dentro del Blender abierto con bpy.app.timers, así la llamada al MCP vuelve enseguida
# (si no, corta por tiempo a los ~60 s aunque Blender siga renderizando). Al terminar escribe FIN con los segundos y
# "ok" o el traceback. Mientras tanto Blender queda ocupado: no mandarle nada más por el MCP; seguir el avance
# mirando la fecha de los .webp en //web/recorridos/<recorrido>/ y esperar FIN (bucle `until` en Bash, de a 10 min).
#
# Namespace: REPO, FIN (ruta del archivo de fin, en una carpeta que Blender pueda escribir), ARGS (lista de opciones
# de renders_recorrido.py, p. ej. ["--puntos", "bano,pasillo"]; [] = todo). Guarda el .blend antes de arrancar.
import os
import sys
import time
import traceback

import bpy

bpy.ops.wm.save_mainfile()
if os.path.exists(FIN):
    os.remove(FIN)
_t0 = time.time()
_script = os.path.join(REPO, "scripts", "blender", "renders_recorrido.py")
_args = list(globals().get("ARGS", []))
_fin = FIN


def _correr():
    argv = sys.argv
    sys.argv = ["blender", "--", *_args]
    msg = "ok"
    try:
        exec(open(_script, encoding="utf-8").read(), {"__name__": "__main__"})
    except Exception:
        msg = traceback.format_exc()
    finally:
        sys.argv = argv
        with open(_fin, "w", encoding="utf-8") as f:
            f.write(f"{round(time.time() - _t0)} s\n{msg}")
    return None


bpy.app.timers.register(_correr, first_interval=0.5)
