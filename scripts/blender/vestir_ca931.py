"""
Vestido fotorrealista de los interiores de Cañada de Gómez 931 para los renders de plantas: materiales con texturas
reales (parquet, pared pintada, mármol, roble, lino, algodón), muebles de detalle (sillones con almohadones, camas
con acolchado y almohadas, sillas de roble, mesas de luz con lámpara, alfombras), modelos de Poly Haven (plantas,
mesa ratona, floreros) y HDRI. Reusa materiales, piezas y cargador de vestir_interior.py (el del recorrido 360).

No se corre solo: lo ejecuta modelar_ca931.py al final (comparte Malla, medidas y colecciones) si VESTIR = True y
están los assets (python scripts/blender/bajar_assets_interior.py, CC0, fuera del repo). Reemplaza la capa
Interior_*_Sueltos (los muebles en cajas de interior_ca931.py) por la de detalle; los materiales INT_* se rearman
con texturas. Nada de esto va a la web: está fuera de WEB.

Coordenadas de plano como en interior_ca931.py: a desde la medianera izquierda (x = X0 + a), d desde la línea
municipal (y = d), en metros. En las piezas de vestir_interior.py el frente de un mueble mira a -Y local.
"""

AQUI_VESTIR = os.path.dirname(globals().get("__file__", REPO + "/scripts/blender/x.py"))
vi = {"__name__": "vestir_interior", "__file__": os.path.join(AQUI_VESTIR, "vestir_interior.py")}
exec(open(vi["__file__"], encoding="utf-8").read(), vi)
ASSETS = vi["ASSETS"]
HDRI = os.path.join(ASSETS, "hdris", "portland_landing_pad_8k.hdr")


def materiales_vestidos():
    """los INT_* de interior_ca931.py con texturas, más los de las piezas de vestir_interior.py"""
    pbr, liso = vi["pbr"], vi["liso"]
    pbr("INT_Muro", "pared", color_fijo=(0.8, 0.795, 0.78), rugosidad=(0.6, 0.85), normal=0.12)
    pbr("INT_Madera", "madera_piso", rugosidad=(0.25, 0.55), normal=0.5)
    pbr("INT_Ceramica", "marmol", color_fijo=(0.7, 0.69, 0.66), rugosidad=(0.04, 0.3), normal=1.4)
    pbr("INT_Comun", "marmol", tinte=(0.6, 0.6, 0.59), rugosidad=(0.1, 0.35))
    pbr("INT_Ducha", "marmol", color_fijo=(0.32, 0.32, 0.31), rugosidad=(0.05, 0.3), normal=1.6)
    pbr("INT_Madera_Mueble", "roble", rugosidad=(0.35, 0.6), normal=0.3)
    pbr("INT_Tela", "lino", color_fijo=(0.47, 0.45, 0.42), rugosidad=(0.85, 1.0), normal=0.8)
    pbr("INT_Cama", "algodon", color_fijo=(0.86, 0.85, 0.83), rugosidad=(0.85, 1.0), normal=0.6)
    liso("INT_Mueble", (0.83, 0.83, 0.81), 0.3, **{"Coat Weight": 0.3, "Coat Roughness": 0.15})
    liso("INT_Mesada", (0.035, 0.035, 0.037), 0.12, **{"Coat Weight": 0.6, "Coat Roughness": 0.05})
    liso("INT_Sanitario", (0.9, 0.9, 0.89), 0.05, **{"Coat Weight": 0.6})
    liso("INT_Pozo", (0.02, 0.02, 0.02), 0.9)
    liso("WEB_Corte", (0.16, 0.16, 0.17), 0.9)
    mats = vi["materiales"]()
    # vestir_interior.materiales() rearma WEB_Cielorraso, que acá es el de los balcones y va al .glb: vuelve a su color
    d = MATERIALES["WEB_Cielorraso"]
    liso("WEB_Cielorraso", d["color"], d.get("rug", 0.5))
    return mats


class Pieza(vi["Pieza"]):
    """la de vestir_interior.py, pero en coordenadas de plano de este edificio (sin cuadrantes ni escala)"""

    def crear(self, col, z, piso):
        vi["it"]["uv_en_metros"](self.bm)
        self.bm.transform(Matrix.Translation((X0, 0, 0)))  # la altura va en el objeto: la malla se comparte
        me = bpy.data.meshes.new(self.nombre)
        self.bm.to_mesh(me)
        self.bm.free()
        for mat in self.mats:
            me.materials.append(mat)
        o = bpy.data.objects.new(self.nombre, me)
        o.location.z = z
        o["piso"] = piso
        col.objects.link(o)
        return o


# ---------------------------------------------------------------- modelos de Poly Haven
_modelos = {}


def cargar_modelo(slug):
    """objetos del .blend de Poly Haven con las texturas apuntadas a su carpeta (como vestir_interior.modelo)"""
    if slug in _modelos:
        return _modelos[slug]
    carpeta = os.path.join(ASSETS, "modelos", slug)
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
    return _modelos[slug]


def modelo(slug, col, a, d, giro, z, piso, escala=1.0):
    m = Matrix.Translation((X0 + a, d, z)) @ Matrix.Rotation(math.radians(giro), 4, "Z") @ Matrix.Scale(escala, 4)
    for o, base in cargar_modelo(slug):
        copia = o.copy()  # comparte la malla con las demás copias (como Alt+D)
        copia.matrix_world = m @ base
        copia["piso"] = piso
        col.objects.link(copia)


# ---------------------------------------------------------------- muebles de detalle
def mesa_rect(p, mats, a0, a1, d0, d1, sillas_por_lado=3):
    """mesa de roble con patas negras y sillas a los dos lados largos (paralelos a d)"""
    p.caja(a0, d0, a1, d1, 0.72, 0.755, mats["roble"], 0.006, 3)
    for a in (a0 + 0.06, a1 - 0.1):
        for d in (d0 + 0.06, d1 - 0.1):
            p.caja(a, d, a + 0.04, d + 0.04, 0, 0.72, mats["negro"], 0.003)
    for i in range(sillas_por_lado):
        d = d0 + (d1 - d0) * (i + 0.5) / sillas_por_lado
        with p.en(a0 - 0.22, d, 90):    # mirando a +a (hacia la mesa)
            vi["silla"](p, mats)
        with p.en(a1 + 0.22, d, -90):
            vi["silla"](p, mats)


def banquetas(p, mats, puntos):
    for a, d in puntos:
        p.cilindro(a, d, 0.0, 0.03, 0.18, mats["negro"], 32, chaflan=0.006)
        p.cilindro(a, d, 0.03, 0.62, 0.025, mats["negro"], 16)
        p.cilindro(a, d, 0.62, 0.66, 0.17, mats["roble"], 40, chaflan=0.008)


def alfombra(p, mats, a0, a1, d0, d1):
    p.caja(a0, d0, a1, d1, 0.0, 0.012, mats["alfombra"], 0.004)


def cama(p, mats, a, d, giro, ancho, doble):
    """cabecera en (a, d); giro 180 = contra el contrafrente (la cama hacia la calle), 0 = contra el frente"""
    with p.en(a, d, giro):
        vi["cama"](p, mats, -ancho / 2, 0.0, ancho / 2, 2.0, "y1", doble=doble)


def estar(p, mats, a, d, giro, alfombra_):
    with p.en(a, d, giro):
        vi["sillon"](p, mats, ancho=1.95, prof=0.9)
    alfombra(p, mats, *alfombra_)


def sueltos_tipo(p, mats):
    # 3 ambientes (A)
    mesa_rect(p, mats, 0.75, 1.6, 1.0, 2.6)
    estar(p, mats, 0.2, 5.4, 90, (0.95, 2.75, 4.35, 6.45))
    banquetas(p, mats, [(2.75, 0.95), (2.75, 1.5), (2.75, 2.05)])
    # principal y dormitorio 2 con la cabecera contra la medianera y contra el muro con B, como en el plano
    cama(p, mats, 0.15, 14.0, -90, 1.6, True)
    vi["mesa_de_luz"](p, mats, 0.37, 12.95)
    vi["mesa_de_luz"](p, mats, 0.37, 15.05)
    alfombra(p, mats, 0.9, 2.4, 12.8, 15.2)
    cama(p, mats, 5.58, 14.55, 90, 0.9, False)
    vi["mesa_de_luz"](p, mats, 5.3, 15.25)
    # 2 ambientes (B)
    estar(p, mats, 8.5, 1.85, -90, (5.75, 7.75, 0.75, 2.95))  # deja lugar a la cortina del ventanal
    mesa_rect(p, mats, 6.55, 7.35, 3.5, 5.1)
    banquetas(p, mats, [(7.0, 5.78), (7.6, 5.78)])
    cama(p, mats, 8.51, 14.0, 90, 1.6, True)
    vi["mesa_de_luz"](p, mats, 8.25, 12.95, lampara_encima=False)
    vi["mesa_de_luz"](p, mats, 8.25, 15.05)
    alfombra(p, mats, 6.2, 7.7, 12.8, 15.2)


def modelos_tipo(col, z, piso):
    modelo("modern_coffee_table_01", col, 1.75, 5.4, 90, z, piso)
    modelo("potted_plant_04", col, 0.45, 3.4, 0, z, piso)
    modelo("potted_plant_02", col, 0.45, 6.5, 0, z, piso)
    modelo("ceramic_vase_01", col, 1.15, 1.8, 0, z + 0.755, piso)
    modelo("wooden_bowl_01", col, 3.3, 2.1, 0, z + 0.9, piso)
    modelo("modern_coffee_table_01", col, 6.95, 1.85, 90, z, piso)
    modelo("potted_plant_01", col, 5.75, 0.75, 0, z, piso)
    modelo("ceramic_vase_03", col, 6.95, 4.3, 0, z + 0.755, piso)


def sueltos_pb(p, mats):
    # dormitorios 1 y 2: de una plaza, de costado, con la cabecera contra la medianera y contra el hall (plano)
    cama(p, mats, 0.15, 1.35, -90, 0.9, False)
    vi["mesa_de_luz"](p, mats, 0.37, 2.05)
    cama(p, mats, 5.31, 1.25, 90, 0.9, False)
    vi["mesa_de_luz"](p, mats, 5.09, 1.95)
    # escritorio angosto contra el tabique con el dormitorio 1
    p.caja(2.57, 0.75, 3.02, 1.95, 0.72, 0.75, mats["roble"], 0.003)
    for d in (0.8, 1.9):
        p.caja(2.94, d - 0.02, 2.98, d + 0.02, 0, 0.72, mats["negro"], 0.002)
    vi["libros"](p, mats, 2.62, 1.6, 0.75)
    estar(p, mats, 0.2, 9.2, 90, (0.95, 2.95, 8.2, 10.2))
    mesa_rect(p, mats, 0.6, 1.45, 12.7, 14.5)
    banquetas(p, mats, [(2.75, 13.3), (2.75, 13.95), (2.75, 14.6)])
    cama(p, mats, 8.51, 13.9, 90, 1.6, True)
    vi["mesa_de_luz"](p, mats, 8.25, 12.88)
    vi["mesa_de_luz"](p, mats, 8.25, 14.92)


def modelos_pb(col):
    modelo("modern_coffee_table_01", col, 1.75, 9.2, 90, 0.0, 0)
    # sillones a los lados de la mesita, enfrentados (plano)
    modelo("modern_arm_chair_01", col, 1.5, 7.9, 180, 0.0, 0)
    modelo("modern_arm_chair_01", col, 1.5, 10.75, 0, 0.0, 0)
    modelo("potted_plant_04", col, 0.45, 7.75, 0, 0.0, 0)
    modelo("potted_plant_01", col, 8.1, 0.95, 0, 0.0, 0)        # hall de acceso
    modelo("potted_plant_02", col, 0.45, 15.2, 0, 0.0, 0)       # junto a la puerta-ventana al patio


# ---------------------------------------------------------------- luz
def hdri():
    """cielo real (HDRI de Poly Haven) para la luz ambiente; el sol lo sigue poniendo la lámpara Sol"""
    if not os.path.exists(HDRI):
        return
    mundo = bpy.context.scene.world
    nt = mundo.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    salida = nt.nodes.new("ShaderNodeOutputWorld")
    fondo = nt.nodes.new("ShaderNodeBackground")
    fondo.inputs["Strength"].default_value = 0.7
    tex = nt.nodes.new("ShaderNodeTexEnvironment")
    tex.image = bpy.data.images.load(HDRI, check_existing=True)
    nt.links.new(tex.outputs["Color"], fondo.inputs["Color"])
    nt.links.new(fondo.outputs[0], salida.inputs["Surface"])


def vestir(col_interiores):
    mats = materiales_vestidos()
    for o in [o for o in col_interiores.objects if o.name.endswith("_Sueltos")]:
        bpy.data.objects.remove(o, do_unlink=True)
    col = coleccion("Interiores_Vestido", col_interiores)
    p = Pieza("Vestido_PB")
    sueltos_pb(p, mats)
    p.crear(col, 0.0, 0)
    modelos_pb(col)
    p = Pieza("Vestido_01")
    sueltos_tipo(p, mats)
    base = p.crear(col, ALTO_PB + LOSA, 1)
    for n in range(1, PISOS + 1):
        z = ALTO_PB + (n - 1) * ALTO_PISO + LOSA
        if n > 1:
            o = bpy.data.objects.new(f"Vestido_0{n}", base.data)
            o.location.z, o["piso"] = z, n
            col.objects.link(o)
        modelos_tipo(col, z, n)
    hdri()
    esc = bpy.context.scene
    esc.cycles.samples = 256
    esc.cycles.use_denoising = True
    print(f"Vestido: {len(col.objects)} objetos, {len(_modelos)} modelo(s) de Poly Haven")
    return mats
