"""
Renders de disponibilidad: tomas fijas del edificio desde varios ángulos, más una máscara SVG con un polígono por
unidad visible (data-unidad="5B") en el mismo encuadre. En la web cada polígono se pinta según el estado de la
unidad (pantalla Disponibilidad), como en el modo 3D pero sobre imágenes: carga en un instante y se ve como el render.

Spec: docs/renders-fachadas.md

Uso:
  - Blender abierto: pestaña Scripting → abrir este archivo → Run Script (Alt+P).
  - Consola:  blender -b archivo.blend --python scripts/blender/renders_fachadas.py -- [opciones]
      --crear-camaras 4   crea (en memoria) N cámaras Render_Fachada_* alrededor de la torre, en las diagonales
      --camaras 1,3       sólo esas cámaras (sufijo del nombre)
      --solo-mascaras     no renderiza, sólo escribe los SVG (rápido, para validar)
      --prueba            render al 25 %

Salida (junto al .blend):  //web/fachadas/<camara>.webp  +  <camara>.svg  por cámara,  y fachadas.json.

Cómo sale la máscara: por cada píxel (en una grilla de PASO px) se tira un rayo desde la cámara contra lo que se
renderiza y otro contra las cajas Unidad_*. El píxel es de la unidad si su caja aparece antes que lo opaco, o
apenas detrás (TOLERANCIA: el vidrio y la carpintería de la fachada están por delante de la caja). Así la máscara ya
viene recortada por lo que tapa (otra torre, el núcleo, un balcón) y no hace falta dibujar nada a mano.
El .blend no se modifica: se restauran visibilidad y cámara; las cámaras creadas con --crear-camaras quedan en la
escena para ajustarlas (se guardan sólo si el usuario guarda).
"""

import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

# ---------------------------------------------------------------- configuración
PREFIJO = "Render_Fachada"         # cámaras a renderizar (fuera de la colección WEB: no son vistas del visor 3D)
ESCALA = 1.0                       # metros por unidad de Blender (igual que en el admin)
TOLERANCIA = 1.2                   # metros: cuánto detrás de lo opaco puede estar la caja de la unidad
TOLERANCIA_LOSA = 0.15             # lo mismo contra superficies horizontales (techo, losas)
PASO = 3                           # px de la grilla de rayos (a resolución completa); 2 = más fino y más lento
AREA_MINIMA = 0.0004               # fracción de la imagen: una unidad que se ve menos que esto no va en la máscara
OCULTAR = ("Bruma",)               # prefijos de objetos que no van en estos renders
OCULTAR_COLECCIONES = ()           # colecciones que no van (p. ej. la copia del entorno para el visor web)
TORRE = ""                         # slug de la torre; si se completa, va como data-torre en la máscara
COLECCION_EDIFICIO = "Edificio"    # la torre (o una lista): nunca se despeja. Propiedad "colecciones" de la cámara
DESPEJAR = 20.0                    # metros alrededor de la torre: lo que sobresale del suelo ahí (edificios vecinos,
                                   # árboles) se oculta en estas tomas para que no tape unidades. 0 = no despejar
SALIDA = "//web/fachadas"
FORMATO = "WEBP"
CALIDAD = 88
# --crear-camaras
ELEVACION = 30.0                   # grados sobre el horizonte (vista aérea, como la cámara Aérea del 3D)
LENTE = 35.0
MARGEN = 2.0                       # cuánto aire alrededor de la torre (1 = justo; 2 = la torre en ~la mitad del alto)
COLECCION_CAMARAS = "Camaras"

RUMBOS = ["Norte", "Noreste", "Este", "Sudeste", "Sur", "Sudoeste", "Oeste", "Noroeste"]


# ---------------------------------------------------------------- utilidades
def objetos_de(col):
    yield from col.objects
    for c in col.children:
        yield from objetos_de(c)


def leer_argumentos():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    crear = int(a[a.index("--crear-camaras") + 1]) if "--crear-camaras" in a else 0
    camaras = set(a[a.index("--camaras") + 1].split(",")) if "--camaras" in a else None
    return crear, camaras, "--solo-mascaras" in a, "--prueba" in a


def config_de_camara(cam):
    """lo propio del proyecto va como propiedades de las cámaras (escala, ocultar, torre, tolerancia), como en plantas"""
    global ESCALA, TORRE, TOLERANCIA, OCULTAR_COLECCIONES, COLECCION_EDIFICIO, DESPEJAR
    ESCALA = float(cam.get("escala", ESCALA))
    TORRE = str(cam.get("torre", TORRE))
    TOLERANCIA = float(cam.get("tolerancia", TOLERANCIA))
    DESPEJAR = float(cam.get("despejar", DESPEJAR))
    if cam.get("colecciones"):
        COLECCION_EDIFICIO = [c.strip() for c in str(cam["colecciones"]).split(",") if c.strip()]
    if cam.get("ocultar"):
        OCULTAR_COLECCIONES = tuple(c.strip() for c in str(cam["ocultar"]).split(",") if c.strip())


def unidades_de(todos):
    return [o for o in todos if o.get("tipo") == "unidad" and o.type == "MESH" and o.get("unidad")]


def rumbo(angulo):
    """ángulo en grados desde +Y (norte) hacia +X (este) → "Noreste"…"""
    return RUMBOS[round((angulo % 360) / 45) % 8]


# ---------------------------------------------------------------- cámaras
def crear_camaras(escena, unidades, n):
    """
    N cámaras alrededor de la torre, en las diagonales (cada toma muestra dos fachadas, así toda unidad con ventana
    aparece en alguna). Se encuadran sobre las cajas de unidad, que son lo que importa en la máscara.
    """
    pts = [o.matrix_world @ Vector(c) for o in unidades for c in o.bound_box]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
    y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    z0, z1 = min(p.z for p in pts), max(p.z for p in pts)
    centro = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    radio = math.dist((x0, y0, z0), (x1, y1, z1)) / 2
    col = bpy.data.collections.get(COLECCION_CAMARAS) or escena.collection
    # la configuración del proyecto pasa de las cámaras anteriores a las nuevas (antes de borrarlas)
    ref = next((o for o in bpy.data.objects if o.type == "CAMERA" and o.name.startswith(PREFIJO)), None)
    config = {k: ref[k] for k in ("escala", "ocultar", "torre", "tolerancia", "colecciones", "despejar") if ref and k in ref}
    creadas = []
    for i in range(n):
        angulo = 45 + i * 360 / n          # desde el norte, en sentido horario: NE, SE, SO, NO con n = 4
        nombre = f"{PREFIJO}_{i + 1}"
        vieja = bpy.data.objects.get(nombre)
        if vieja:
            datos_viejos = vieja.data
            bpy.data.objects.remove(vieja)
            if datos_viejos and not datos_viejos.users:
                bpy.data.cameras.remove(datos_viejos)
        datos = bpy.data.cameras.new(nombre)
        datos.lens = LENTE
        cam = bpy.data.objects.new(nombre, datos)
        col.objects.link(cam)
        # distancia para que la esfera que envuelve las unidades entre en el lado corto del cuadro
        mitad = datos.sensor_width / 2 / LENTE
        if escena.render.resolution_x > escena.render.resolution_y:
            mitad *= escena.render.resolution_y / escena.render.resolution_x
        fov = 2 * math.atan(mitad)
        d = radio * MARGEN / math.sin(fov / 2)
        a, e = math.radians(angulo), math.radians(ELEVACION)
        cam.location = centro + Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e))) * d
        cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam["etiqueta"] = rumbo(angulo)
        for k, v in config.items():
            cam[k] = v
        creadas.append(cam)
    return creadas


# ---------------------------------------------------------------- despeje
def caja(o):
    p = [o.matrix_world @ Vector(c) for c in o.bound_box]
    # un Empty que instancia una colección (árboles, faroles) es un punto en el suelo: se mide lo que instancia
    col = o.instance_collection if o.type == "EMPTY" and o.instance_type == "COLLECTION" else None
    if col:
        base = o.matrix_world @ Matrix.Translation(-col.instance_offset)
        p += [base @ m.matrix_world @ Vector(c) for m in objetos_de(col) for c in m.bound_box]
    return (min(v.x for v in p), min(v.y for v in p), min(v.z for v in p),
            max(v.x for v in p), max(v.y for v in p), max(v.z for v in p))


def despejar(todos, unidades, ocultar):
    """
    Oculta lo que está pegado a la torre y sobresale del suelo (casas, edificios, árboles vecinos): en una toma de
    disponibilidad importa que se vean todas las unidades. Lo que es más grande que la zona a despejar (un suelo,
    un entorno unido en una sola malla) no se toca: se avisa para separarlo.
    """
    if DESPEJAR <= 0:
        return
    nombres = [COLECCION_EDIFICIO] if isinstance(COLECCION_EDIFICIO, str) else list(COLECCION_EDIFICIO)
    faltan = [n for n in nombres if n not in bpy.data.collections]
    if faltan:
        raise RuntimeError(f"Despejar: no existe la colección {', '.join(faltan)} (propiedad 'colecciones' de la "
                           f"cámara). Colecciones: {', '.join(c.name for c in bpy.data.collections)}")
    edificio = {o for n in nombres for o in objetos_de(bpy.data.collections[n])} | set(unidades)
    # las plantillas de las instancias (copa y tronco de árbol, farol) suelen estar en el origen, al lado de la torre:
    # ocultarlas apagaría todas sus copias en la escena
    plantillas = {x for e in todos if e.instance_type == "COLLECTION" and e.instance_collection
                  for x in objetos_de(e.instance_collection)}
    cajas = [caja(o) for o in unidades]
    x0, y0, z0 = (min(c[i] for c in cajas) for i in range(3))
    x1, y1 = max(c[3] for c in cajas), max(c[4] for c in cajas)
    r = DESPEJAR / ESCALA
    zx0, zy0, zx1, zy1 = x0 - r, y0 - r, x1 + r, y1 + r
    ocultos, grandes = [], []
    for o in todos:
        if o in edificio or o in plantillas or o.hide_render or o.type in ("LIGHT", "CAMERA") or o.parent in edificio:
            continue
        a = caja(o)
        if a[5] <= z0 or a[3] < zx0 or a[0] > zx1 or a[4] < zy0 or a[1] > zy1:
            continue  # al ras del suelo (calles, veredas) o fuera de la zona
        if a[3] - a[0] > zx1 - zx0 or a[4] - a[1] > zy1 - zy0:
            grandes.append(o.name)
            continue
        ocultar(o)
        ocultos.append(o.name)
    print(f"  despeje de {DESPEJAR:g} m: {len(ocultos)} objeto(s) ocultos")
    if grandes:
        print(f"    AVISO: no se ocultan por ser más grandes que la zona (separalos si tapan): {', '.join(grandes[:8])}")


# ---------------------------------------------------------------- máscara
def bvh_de(objetos):
    """un solo árbol en coordenadas de mundo, con modificadores aplicados; devuelve también cara → objeto"""
    dg = bpy.context.evaluated_depsgraph_get()
    verts, caras, duenio = [], [], []
    for o in objetos:
        ev = o.evaluated_get(dg)
        try:
            m = ev.to_mesh()
        except RuntimeError:
            continue
        if m is None:
            continue
        mw = ev.matrix_world
        base = len(verts)
        verts.extend(mw @ v.co for v in m.vertices)
        for p in m.polygons:
            caras.append([base + i for i in p.vertices])
            duenio.append(o)
        ev.to_mesh_clear()
    return (BVHTree.FromPolygons(verts, caras, all_triangles=False) if caras else None), duenio


def etiquetar(escena, cam, opacos, cajas, duenio, ancho, alto, paso):
    """grilla (filas × columnas) con el índice de la unidad de cada celda, o -1"""
    marco = cam.data.view_frame(scene=escena)          # arriba-der, abajo-der, abajo-izq, arriba-izq (local)
    mw = cam.matrix_world
    origen = mw.translation
    ad, _, ai, arr_i = marco[0], marco[1], marco[2], marco[3]
    ortho = cam.data.type == "ORTHO"
    tol = TOLERANCIA / ESCALA
    tol_losa = TOLERANCIA_LOSA / ESCALA
    columnas, filas = math.ceil(ancho / paso), math.ceil(alto / paso)
    indice = {o.name: i for i, o in enumerate(dict.fromkeys(duenio))}
    grilla = []
    for f in range(filas):
        v = 1 - (f + 0.5) * paso / alto
        fila = [-1] * columnas
        for c in range(columnas):
            u = (c + 0.5) * paso / ancho
            # punto del plano de la cámara: bilineal entre las esquinas del marco
            local = arr_i.lerp(ad, u).lerp(ai.lerp(marco[1], u), 1 - v)
            if ortho:
                o = mw @ Vector((local.x, local.y, 0))
                d = (mw.to_3x3() @ Vector((0, 0, -1))).normalized()
            else:
                o = origen
                d = ((mw @ local) - origen).normalized()
            hu = cajas.ray_cast(o, d)
            if hu[0] is None:
                continue
            ho = opacos.ray_cast(o, d) if opacos else (None, None, None, None)
            # la tolerancia es para el vidrio y la carpintería (verticales). Contra un techo o una losa (horizontal) va
            # casi sin margen: si no, desde arriba la unidad del último piso se pinta sobre la azotea
            margen = tol_losa if ho[0] is not None and abs(ho[1].z) > 0.7 else tol
            if ho[0] is None or hu[3] <= ho[3] + margen:
                fila[c] = indice[duenio[hu[2]].name]
        grilla.append(fila)
    return grilla, list(dict.fromkeys(duenio))


def contornos(grilla, k):
    """lazos exteriores (sentido horario en pantalla) de las celdas con valor k, en coordenadas de celda"""
    h, w = len(grilla), len(grilla[0])

    def es(i, j):
        return 0 <= j < h and 0 <= i < w and grilla[j][i] == k

    siguiente = {}
    for j in range(h):
        for i in range(w):
            if grilla[j][i] != k:
                continue
            if not es(i, j - 1):
                siguiente.setdefault((i, j), []).append((i + 1, j))
            if not es(i + 1, j):
                siguiente.setdefault((i + 1, j), []).append((i + 1, j + 1))
            if not es(i, j + 1):
                siguiente.setdefault((i + 1, j + 1), []).append((i, j + 1))
            if not es(i - 1, j):
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
        if len(lazo) >= 4 and area_con_signo(lazo) > 0:   # los huecos giran al revés: se descartan
            lazos.append(lazo)
    return lazos


def area_con_signo(poli):
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(poli, poli[1:] + poli[:1])) / 2


def simplificar(lazo, tolerancia):
    """Douglas–Peucker sobre un contorno cerrado (el mismo de renders_plantas.py)"""
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

    lejos = max(range(len(lazo)), key=lambda k: (lazo[k][0] - lazo[0][0]) ** 2 + (lazo[k][1] - lazo[0][1]) ** 2)
    return dp(lazo[:lejos + 1])[:-1] + dp(lazo[lejos:] + lazo[:1])[:-1]


def limpiar(grilla):
    """saca celdas sueltas (un parante, un árbol fino): una celda se queda con el valor de la mayoría de sus 8 vecinas"""
    h, w = len(grilla), len(grilla[0])
    r = [fila[:] for fila in grilla]
    for j in range(1, h - 1):
        for i in range(1, w - 1):
            cuenta = {}
            for dj in (-1, 0, 1):
                for di in (-1, 0, 1):
                    if di or dj:
                        v = grilla[j + dj][i + di]
                        cuenta[v] = cuenta.get(v, 0) + 1
            v, n = max(cuenta.items(), key=lambda x: x[1])
            if n >= 5 and v != grilla[j][i]:
                r[j][i] = v
    return r


def formas_de(grilla, objetos, paso, ancho, alto):
    celdas = {}
    for j, fila in enumerate(grilla):
        for i, v in enumerate(fila):
            if v >= 0:
                s = celdas.setdefault(v, [0, 0.0, 0.0])
                s[0] += 1
                s[1] += i + 0.5
                s[2] += j + 0.5
    minimo = AREA_MINIMA * ancho * alto / paso ** 2
    formas = []
    for k, (n, sx, sy) in celdas.items():
        if n < minimo:
            continue
        lazos = [simplificar(l, 1.5) for l in contornos(grilla, k)]
        lazos = [[(round(min(x * paso, ancho), 1), round(min(y * paso, alto), 1)) for x, y in l]
                 for l in lazos if len(l) >= 3 and abs(area_con_signo(l)) * 4 >= minimo]
        if not lazos:
            continue
        o = objetos[k]
        # la etiqueta, en el centro de la pieza más grande (una unidad partida por una columna tiene dos)
        grande = max(lazos, key=lambda l: abs(area_con_signo(l)))
        centro = centroide(grande) if len(lazos) > 1 else (round(sx / n * paso, 1), round(sy / n * paso, 1))
        formas.append((str(o["unidad"]), int(o.get("piso", 0)), lazos, centro))
    return sorted(formas, key=lambda f: (-f[1], f[0]))


def centroide(poli):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(poli, poli[1:] + poli[:1]):
        k = x1 * y2 - x2 * y1
        a += k
        cx += (x1 + x2) * k
        cy += (y1 + y2) * k
    return poli[0] if abs(a) < 1e-9 else (round(cx / (3 * a), 1), round(cy / (3 * a), 1))


def escribir_mascara(ruta, formas, ancho, alto, etiqueta):
    torre = f' data-torre="{TORRE}"' if TORRE else ""
    lineas = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" width="{ancho}" height="{alto}"'
              f' data-vista="{etiqueta}">']
    for codigo, _, lazos, centro in formas:
        cx = f' data-cx="{centro[0]}" data-cy="{centro[1]}"'
        if len(lazos) == 1:
            puntos = " ".join(f"{x},{y}" for x, y in lazos[0])
            lineas.append(f'  <polygon data-unidad="{codigo}"{torre}{cx} points="{puntos}"/>')
        else:
            d = " ".join("M" + " L".join(f"{x} {y}" for x, y in l) + " Z" for l in lazos)
            lineas.append(f'  <path data-unidad="{codigo}"{torre}{cx} d="{d}"/>')
    lineas.append("</svg>")
    with open(ruta, "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")


# ---------------------------------------------------------------- principal
def main():
    crear, pedidas, solo_mascaras, prueba = leer_argumentos()
    escena = bpy.context.scene
    unidades = unidades_de(bpy.data.objects)
    if not unidades:
        raise RuntimeError("Renders de fachada: no hay cajas Unidad_* con tipo='unidad' y 'unidad'.")
    if crear:
        crear_camaras(escena, unidades, crear)
    todos = list(bpy.data.objects)
    camaras = sorted((o for o in bpy.data.objects if o.type == "CAMERA" and o.name.startswith(PREFIJO)),
                     key=lambda o: o.name)
    if pedidas:
        camaras = [c for c in camaras if c.name[len(PREFIJO):].lstrip("_") in pedidas]
    if not camaras:
        raise RuntimeError(f"No hay cámaras '{PREFIJO}*'. Crealas a mano o con --crear-camaras 4 "
                           "(ver docs/renders-fachadas.md).")
    config_de_camara(camaras[0])

    carpeta = bpy.path.abspath(SALIDA)
    os.makedirs(carpeta, exist_ok=True)
    pct = 25 if prueba else escena.render.resolution_percentage
    ancho = escena.render.resolution_x * pct // 100
    alto = escena.render.resolution_y * pct // 100
    paso = max(1, round(PASO * pct / 100))
    ext = "webp" if FORMATO == "WEBP" else "png"

    antes = (escena.camera, escena.render.filepath, escena.render.resolution_percentage,
             escena.render.image_settings.file_format)
    ocultos = {}

    def ocultar(o):
        ocultos.setdefault(o.name, o.hide_render)
        o.hide_render = True

    manifest = {"ancho": ancho, "alto": alto, "vistas": []}
    print(f"\n=== Renders de fachada · {len(camaras)} cámara(s) · {ancho}×{alto} ===")
    try:
        sobran = {o for n in OCULTAR_COLECCIONES if n in bpy.data.collections
                  for o in objetos_de(bpy.data.collections[n])}
        for o in todos:
            if o.get("tipo") == "unidad" or o.name.startswith(tuple(OCULTAR)) or (o in sobran and o.type != "LIGHT"):
                ocultar(o)
        despejar(todos, unidades, ocultar)
        # lo opaco: lo que se renderiza. Las instancias (hojas de árboles, faroles) no entran: pesan millones de
        # caras y taparían la fachada con huecos; la máscara pasa por detrás de ellas
        visibles = [o for o in todos if o.type == "MESH" and not o.hide_render and o.visible_get()]
        opacos, _ = bvh_de(visibles)
        cajas, duenio = bvh_de(unidades)

        escena.render.resolution_percentage = pct
        escena.render.image_settings.file_format = FORMATO
        if FORMATO == "WEBP":
            escena.render.image_settings.quality = CALIDAD
        for cam in camaras:
            nombre = cam.name[len(PREFIJO):].strip("_").lower() or "vista"
            nombre = f"vista-{nombre}"
            etiqueta = str(cam.get("etiqueta", nombre))
            escena.camera = cam
            bpy.context.view_layer.update()
            grilla, objetos = etiquetar(escena, cam, opacos, cajas, duenio, ancho, alto, paso)
            formas = formas_de(limpiar(grilla), objetos, paso, ancho, alto)
            escribir_mascara(os.path.join(carpeta, f"{nombre}.svg"), formas, ancho, alto, etiqueta)
            if not solo_mascaras:
                escena.render.filepath = os.path.join(carpeta, f"{nombre}.{ext}")
                bpy.ops.render.render(write_still=True)
            manifest["vistas"].append({"camara": cam.name, "etiqueta": etiqueta, "imagen": f"{nombre}.{ext}",
                                       "mascara": f"{nombre}.svg", "unidades": [f[0] for f in formas]})
            print(f"  {cam.name} ({etiqueta}): {len(formas)} unidad(es)")
    finally:
        for n, v in ocultos.items():
            if n in bpy.data.objects:
                bpy.data.objects[n].hide_render = v
        (escena.camera, escena.render.filepath, escena.render.resolution_percentage,
         escena.render.image_settings.file_format) = antes

    with open(os.path.join(carpeta, "fachadas.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Listo: {carpeta}\n")


if __name__ == "__main__":
    main()
