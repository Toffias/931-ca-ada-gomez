# Vista previa en perspectiva con el MISMO ambiente que renders_recorrido.py (luz, HDRI, sol, vidrios, luminarias,
# ajustes de Cycles): sirve para iterar en ~10 s por imagen en vez de ~15 min por panorámica.
#
# Se corre desde el MCP de Blender con exec(), pasando en el namespace:
#   REPO    carpeta del repo (p. ej. r"C:\Renders\plantilla-edificio-3d")
#   CARPETA dónde escribir el PNG (tiene que ser una carpeta que el Blender de la Store pueda escribir)
#   NOMBRE  nombre del PNG, sin extensión
#   PUNTO   (x, y) en metros del cuadrante A (coordenadas de interior_tipo.py)
#   MIRA    (x, y) hacia dónde mira
# Opcionales: LENTE (mm, 16), MUESTRAS (128), ANCHO/ALTO (960×540), PISO (5), ALTURA (ojos, 1.35),
#   INCLINA (grados hacia arriba), EXTRA (dict de globales de renders_recorrido.py a pisar, p. ej.
#   {"EXPOSICION": 3.0, "HDRI_GIRO": 90}). Devuelve SEGUNDOS en el namespace.
# Deja la escena como estaba (usa la clase Cambios del script) y borra su cámara temporal.
import math
import os
import time

import bpy
from mathutils import Vector

g = globals()
rr = {"__name__": "renders_recorrido"}
exec(open(os.path.join(REPO, "scripts", "blender", "renders_recorrido.py"), encoding="utf-8").read(), rr)
primera = min((o for o in bpy.data.objects if o.name.startswith("Pano_")),
              key=lambda o: (float(o.get("orden", 1e9)), o.name))
rr["configurar"](primera)
for k, v in g.get("EXTRA", {}).items():
    rr[k] = v
E = rr["ESCALA"]
piso = g.get("PISO", 5)
zp = min((o.matrix_world @ Vector(c)).z for o in bpy.data.objects if o.get("tipo") == "piso" and int(o["piso"]) == piso
         for c in o.bound_box)
z = zp + (0.20 + 0.015 + g.get("ALTURA", 1.35)) / E   # losa + solado + ojos
s = bpy.context.scene
todos = list(bpy.data.objects)
cambios = rr["Cambios"]()
d = bpy.data.cameras.new("_Previa")
d.lens, d.sensor_width, d.clip_start = g.get("LENTE", 16), 36, 0.02 / E
cam = bpy.data.objects.new("_Previa", d)
s.collection.objects.link(cam)
x, y = PUNTO
mx, my = MIRA
cam.location = (x / E, y / E, z)
cam.rotation_euler = (math.radians(90 + g.get("INCLINA", 0)), 0, math.atan2(-(mx - x), my - y))
camara_antes, ruta_antes = s.camera, s.render.filepath
try:
    rr["ocultar_sobrantes"](cambios, todos)
    rr["preparar_render"](cambios, s, True)
    rr["preparar_ambiente"](cambios, s, todos)
    cambios.fijar(s.cycles, "samples", g.get("MUESTRAS", 128))
    cambios.fijar(s.cycles, "device", "GPU")
    cambios.fijar(s.render, "resolution_x", g.get("ANCHO", 960))
    cambios.fijar(s.render, "resolution_y", g.get("ALTO", 540))
    cambios.fijar(s.render, "film_transparent", False)
    cambios.fijar(s.render.image_settings, "file_format", "PNG")
    s.camera = cam
    s.render.filepath = os.path.join(CARPETA, NOMBRE + ".png")
    t = time.time()
    bpy.ops.render.render(write_still=True)
    SEGUNDOS = round(time.time() - t, 1)
finally:
    cambios.restaurar()
    s.camera, s.render.filepath = camara_antes, ruta_antes
    bpy.data.objects.remove(cam)
    bpy.data.cameras.remove(d)
