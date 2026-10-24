"""
Entorno de Cañada de Gómez 931 calcado de las fotos del cliente (docs/referencias/): las dos casas vecinas con sus
portones, rejas, balaustradas, postigos y techos de tejas, el resto de la cuadra, veredas con tazas de árboles y
calzada. Va en WEB (liviano: también lo dibuja el visor). Los árboles con hojas y los faroles de los renders salen
de las plantillas de la Torre Cityh (ver arboles_render()); en el .glb quedan árboles simples.

No se corre solo: lo ejecuta modelar_ca931.py (comparte Malla, material, MATERIALES y las medidas) y reemplaza su
entorno(). X0/X1 son las medianeras, y = 0 la línea municipal, la calle hacia -Y.
"""

MATERIALES.update({
    "WEB_Fachada_Vecinos": dict(color=(0.62, 0.56, 0.45), rug=0.9),
    "WEB_Vecinos_Claro": dict(color=(0.78, 0.74, 0.66), rug=0.9),       # molduras, pilares, cornisas
    "WEB_Teja": dict(color=(0.04, 0.05, 0.055), rug=0.45),               # tejas negras esmaltadas
    "WEB_Madera_Oscura": dict(color=(0.22, 0.1, 0.04), rug=0.6),         # postigos, aleros, portón
    "WEB_Reja": dict(color=(0.012, 0.012, 0.012), rug=0.4, metal=0.7),
    "WEB_Vidrio_Vecinos": dict(color=(0.05, 0.06, 0.07), rug=0.1),
    "WEB_Jardin": dict(color=(0.08, 0.16, 0.05), rug=0.9),
    "WEB_Arbusto": dict(color=(0.1, 0.2, 0.05), rug=0.9),                # en los renders, arbustos de la plantilla
    "WEB_Tierra": dict(color=(0.12, 0.08, 0.05), rug=0.95),
})

ARBOLES = [(X0 - 6.5, -2.2, 8.0), (X1 + 7.5, -2.2, 6.0), (X0 - 17.0, -2.2, 7.0), (X1 + 20.0, -2.2, 7.5)]
FAROLES = [(X0 - 11.0, -3.0), (X1 + 13.0, -3.0)]
ARBUSTOS = [(X0 - 8.5, 1.6, 0.9), (X0 - 6.6, 1.2, 1.1), (X0 - 5.0, 1.8, 0.8)]   # jardín del vecino izquierdo


def techo_cuatro_aguas(m, mat, x, y, z0, z1, alero=0.5):
    """techo a cuatro aguas con alero: base rectangular y cumbrera a lo largo del lado mayor"""
    bm = m.bm
    x0, x1, y0, y1 = x[0] - alero, x[1] + alero, y[0] - alero, y[1] + alero
    inset = min(x1 - x0, y1 - y0) / 2
    if x1 - x0 >= y1 - y0:
        c0, c1 = (x0 + inset, (y0 + y1) / 2, z1), (x1 - inset, (y0 + y1) / 2, z1)
    else:
        c0, c1 = ((x0 + x1) / 2, y0 + inset, z1), ((x0 + x1) / 2, y1 - inset, z1)
    v = [bm.verts.new(p) for p in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), c0, c1)]
    i = m._indice(mat)
    if x1 - x0 >= y1 - y0:
        caras = [(0, 1, 5, 4), (2, 3, 4, 5), (1, 2, 5), (3, 0, 4), (3, 2, 1, 0)]
    else:
        caras = [(1, 2, 5, 4), (3, 0, 4, 5), (0, 1, 4), (2, 3, 5), (3, 2, 1, 0)]
    for c in caras:
        f = bm.faces.new([v[k] for k in c])
        f.material_index = i


def balaustrada(m, x0, x1, y, z0, alto=0.9, paso=0.16):
    """baranda de balaustres torneados (cilindros con panza), zócalo y pasamanos blancos"""
    m.caja("WEB_Balaustrada", (x0, x1), (y - 0.12, y + 0.12), (z0, z0 + 0.12))
    m.caja("WEB_Balaustrada", (x0, x1), (y - 0.14, y + 0.14), (z0 + alto - 0.1, z0 + alto))
    x = x0 + paso / 2
    while x < x1 - paso / 3:
        m.cilindro("WEB_Balaustrada", x, y, z0 + 0.12, z0 + alto - 0.1, 0.035, 8)
        m.esfera("WEB_Balaustrada", x, y, z0 + 0.12 + (alto - 0.22) * 0.38, 0.06, 1.6)
        x += paso
    for xp in (x0, x1):
        m.caja("WEB_Balaustrada", (xp - 0.14, xp + 0.14), (y - 0.14, y + 0.14), (z0, z0 + alto + 0.1))


def porton(m, mat, x0, x1, z1, paneles=4, manijas=True):
    """portón de garaje de dos hojas con paneles horizontales en relieve"""
    m.caja(mat, (x0, x1), (-0.04, 0.0), (0.0, z1))
    xm = (x0 + x1) / 2
    m.caja("WEB_Reja", (xm - 0.01, xm + 0.01), (-0.05, -0.04), (0.0, z1))
    for i in range(1, paneles):
        z = z1 * i / paneles
        m.caja(mat, (x0 + 0.08, x1 - 0.08), (-0.06, -0.04), (z - 0.015, z + 0.015))
    if manijas:
        for x in (xm - 0.12, xm + 0.12):
            m.caja("WEB_Metal_Acero", (x - 0.012, x + 0.012), (-0.09, -0.06), (0.7, 1.75))


def ventana_arco(m, x0, x1, z0, z1, postigos=True, y=0.0):
    """ventana con arco de medio punto, marco claro y postigos de madera abiertos, en la fachada y = `y`"""
    r = (x1 - x0) / 2
    xc = (x0 + x1) / 2
    f_ = lambda a, b: (y + a, y + b)
    m.caja("WEB_Vecinos_Claro", (x0 - 0.12, x1 + 0.12), f_(-0.08, 0.0), (z0 - 0.15, z0))     # alféizar
    m.caja("WEB_Vidrio_Vecinos", (x0, x1), f_(-0.02, 0.0), (z0, z1 - r))
    bm = m.bm
    i = m._indice("WEB_Vidrio_Vecinos")
    n = 10
    for k in range(n):  # el arco, en abanico
        a0, a1 = math.pi * k / n, math.pi * (k + 1) / n
        p = [(xc, y - 0.02, z1 - r), (xc + r * math.cos(a0), y - 0.02, z1 - r + r * math.sin(a0)),
             (xc + r * math.cos(a1), y - 0.02, z1 - r + r * math.sin(a1))]
        cara = bm.faces.new([bm.verts.new(q) for q in p])
        cara.material_index = i
    m.caja("WEB_Vecinos_Claro", (x0 - 0.1, x1 + 0.1), f_(-0.06, 0.0), (z1 - 0.05, z1 + 0.08))  # clave del arco
    if postigos:
        for xa, xb in ((x0 - 0.06 - r, x0 - 0.06), (x1 + 0.06, x1 + 0.06 + r)):
            m.caja("WEB_Madera_Oscura", (xa, xb), f_(-0.06, -0.02), (z0, z1 - r * 0.4))
            z = z0 + 0.08
            while z < z1 - r * 0.4 - 0.05:   # tablillas
                m.caja("WEB_Madera_Oscura", (xa + 0.03, xb - 0.03), f_(-0.08, -0.06), (z, z + 0.025))
                z += 0.08


def reja(m, x0, x1, z0, z1, paso=0.13):
    m.caja("WEB_Reja", (x0, x1), (-0.03, 0.03), (z1 - 0.04, z1))
    m.caja("WEB_Reja", (x0, x1), (-0.03, 0.03), (z0, z0 + 0.04))
    x = x0 + paso / 2
    while x < x1:
        m.caja("WEB_Reja", (x - 0.012, x + 0.012), (-0.012, 0.012), (z0, z1 + 0.12))
        m.esfera("WEB_Reja", x, 0, z1 + 0.14, 0.025, 1.4)   # remate en punta de lanza
        x += paso


def vecino_izquierdo(col):
    """garaje con portón negro bajo un alero de tejas negras, terraza con balaustrada y reja con jardín"""
    m = Malla()
    g0, g1 = X0 - 4.2, X0                   # cuerpo del garaje, pegado a la medianera
    m.caja("WEB_Fachada_Vecinos", (g0, g1), (0.0, 7.0), (0, 3.2))
    m.caja("WEB_Vecinos_Claro", (g0 - 0.15, g0 + 0.15), (-0.1, 0.0), (0, 3.2))              # pilastras
    m.caja("WEB_Vecinos_Claro", (g1 - 0.25, g1), (-0.1, 0.0), (0, 3.2))
    porton(m, "WEB_Porton_Negro", g0 + 0.4, g1 - 0.6, 2.55)
    m.caja("WEB_Vecinos_Claro", (g0 + 0.3, g1 - 0.5), (-0.12, 0.0), (2.55, 2.7))           # dintel
    m.caja("WEB_Reja", (g1 - 0.45, g1 - 0.3), (-0.04, 0.0), (1.35, 1.55))                  # portero eléctrico
    m.caja("WEB_Metal_Acero", (g1 - 0.47, g1 - 0.28), (-0.06, 0.0), (0.9, 1.15))           # buzón
    # alero de tejas negras sobre el garaje, con cornisa clara debajo
    m.caja("WEB_Vecinos_Claro", (g0 - 0.3, g1), (-0.9, 0.0), (3.05, 3.2))
    m.prisma_techo("WEB_Teja", (g0 - 0.35, g1 + 0.02), (-1.0, 1.6), 3.2, 4.2)
    # terraza de arriba: muro crema retirado con balaustrada blanca
    m.caja("WEB_Fachada_Vecinos", (g0, g1), (1.6, 12.0), (3.2, 4.6))
    balaustrada(m, g0 + 0.2, g1 - 0.2, 1.75, 4.6, 0.8)
    # jardín delantero con muro bajo, pilares crema y reja negra
    j0 = X0 - 10.0
    m.caja("WEB_Vecinos_Claro", (j0, g0 - 0.15), (-0.2, 0.2), (0, 0.55))
    x = j0
    while x < g0 - 0.3:
        m.caja("WEB_Vecinos_Claro", (x, x + 0.42), (-0.25, 0.25), (0, 2.0))
        m.caja("WEB_Vecinos_Claro", (x - 0.05, x + 0.47), (-0.3, 0.3), (2.0, 2.1))
        xn = min(x + 2.6, g0 - 0.15)
        if xn - x > 0.6:
            reja(m, x + 0.42, xn, 0.55, 1.75)
        x = xn
    m.caja("WEB_Jardin", (j0, g0), (0.3, 4.5), (0, 0.3))
    for xx, yy, r in ARBUSTOS:
        m.esfera("WEB_Arbusto", xx, yy, 0.6 + r * 0.6, r, 0.9)
    # la casa del fondo del jardín, con techo de tejas a cuatro aguas
    m.caja("WEB_Fachada_Vecinos", (j0, g0), (4.5, 13.0), (0, 5.8))
    for xv in (j0 + 1.0, j0 + 3.6):
        ventana_arco(m, xv, xv + 1.2, 3.4, 5.2, y=4.5)
    techo_cuatro_aguas(m, "WEB_Teja", (j0, g0), (4.5, 13.0), 5.8, 7.4, 0.4)
    m.objeto("Vecinos_Izquierda", col)


def vecino_derecho(col):
    """casa crema de dos plantas: portón de madera, ventana con arco, balcón con balaustrada y postigos"""
    m = Malla()
    d0, d1 = X1, X1 + 9.0
    m.caja("WEB_Fachada_Vecinos", (d0, d1), (0.0, 15.0), (0, 3.4))
    m.caja("WEB_Fachada_Vecinos", (d0 + 0.6, d1), (0.0, 15.0), (3.4, 6.6))
    m.caja("WEB_Vecinos_Claro", (d0, d1), (-0.08, 0.0), (0, 0.35))                        # zócalo
    porton(m, "WEB_Porton_Madera", d0 + 0.9, d0 + 3.9, 2.6, paneles=6, manijas=False)
    for xx in (d0 + 1.4, d0 + 1.9, d0 + 2.9, d0 + 3.4):                                      # paneles verticales
        m.caja("WEB_Porton_Madera", (xx - 0.015, xx + 0.015), (-0.06, -0.04), (0.1, 2.5))
    m.caja("WEB_Vecinos_Claro", (d0 + 0.75, d0 + 4.05), (-0.1, 0.0), (2.6, 2.78))
    ventana_arco(m, d0 + 5.0, d0 + 6.2, 1.0, 2.9, postigos=False)
    m.caja("WEB_Madera_Oscura", (d0 + 7.0, d0 + 8.2), (-0.04, 0.0), (0, 2.4))              # puerta de entrada
    # balcón con balaustrada sobre el portón
    m.caja("WEB_Vecinos_Claro", (d0 + 0.6, d0 + 5.0), (-0.9, 0.0), (3.4, 3.6))
    balaustrada(m, d0 + 0.75, d0 + 4.85, -0.78, 3.6, 0.85)
    for xv in (d0 + 1.6, d0 + 3.4, d0 + 6.4):
        ventana_arco(m, xv, xv + 1.0, 3.9, 5.9)
    # cornisa de madera y techo de tejas a cuatro aguas
    m.caja("WEB_Madera_Oscura", (d0 + 0.3, d1 + 0.3), (-0.55, 9.0), (6.6, 6.78))
    techo_cuatro_aguas(m, "WEB_Teja", (d0 + 0.6, d1), (0.0, 9.0), 6.78, 8.6, 0.45)
    m.objeto("Vecinos_Derecha", col)


def entorno(col):
    vecino_izquierdo(col)
    vecino_derecho(col)
    # resto de la cuadra y fondo: volúmenes con cornisa y algunas ventanas, para que no lean como cajas lisas
    m = Malla()
    for x0, x1, h in ((X0 - 22, X0 - 10, 7.5), (X1 + 9, X1 + 19, 4.2), (X1 + 19, X1 + 30, 9.0)):
        m.caja("WEB_Fachada_Vecinos", (x0, x1), (0.0, 16), (0, h))
        m.caja("WEB_Vecinos_Claro", (x0, x1), (-0.25, 0.0), (h - 0.2, h))
        piso = 0
        while piso * 3 + 1.0 < h - 0.8:
            z = piso * 3 + 1.0
            x = x0 + 1.0
            while x + 1.2 < x1:
                m.caja("WEB_Vidrio_Vecinos", (x, x + 1.2), (-0.02, 0.0), (z, z + 1.4))
                x += 2.6
            piso += 1
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
    for x, y, _ in ARBOLES:  # tazas de los árboles: tierra con borde
        m.caja("WEB_Cordon", (x - 0.6, x + 0.6), (y - 0.6, y + 0.6), (0.0, 0.17))
    m.objeto("Cordones", col)
    m = Malla()
    for x, y, _ in ARBOLES:
        m.caja("WEB_Tierra", (x - 0.52, x + 0.52), (y - 0.52, y + 0.52), (0.0, 0.175))
    m.caja("WEB_Asfalto", (X0 - 22, X1 + 30), (-12.65, -3.35), (-0.05, 0))
    m.objeto("Calzada", col)

    # árboles del visor: tronco con ramas y copa de varias masas (los de los renders son los de la plantilla)
    m = Malla()
    for x, y, alto in ARBOLES:
        m.cilindro("WEB_Arbol_Tronco", x, y, 0, alto * 0.55, 0.15, 8)
        for k in range(9):
            a = k * 2.4
            dx, dy = math.cos(a) * (0.4 + 0.25 * (k % 3)) * alto / 6, math.sin(a) * (0.3 + 0.2 * (k % 2)) * alto / 6
            r = (0.9 + 0.25 * ((k * 7) % 3)) * alto / 7
            m.esfera("WEB_Arbol_Copa", x + dx * 2, y + dy * 2, alto * (0.62 + 0.05 * (k % 4)), r, 0.8)
    m.objeto("Arboles_Vereda", col)


# ---------------------------------------------------------------- árboles y faroles de render
PLANTILLAS = os.path.join("C:/Renders/Ejemplos/Edificio 3/File -Blend", "cityh_texturizado_v2.blend")
ESCALA_CITYH = 8.0   # la Torre Cityh está en unidades de 8 m: sus plantillas también


def arboles_render(col):
    """árboles con hojas y faroles de las plantillas de la Torre Cityh, como instancias (sólo para Cycles)"""
    if not os.path.exists(PLANTILLAS):
        return 0
    falta = [n for n in ("_Plantilla_Arbol", "_Plantilla_Farol") if n not in bpy.data.collections]
    if falta:
        with bpy.data.libraries.load(PLANTILLAS, link=False) as (src, dst):
            dst.collections = falta
    # hojas de tamaño real: la plantilla está hecha para la escala de la Cityh y, agrandada, daba hojas de 40 cm
    gn = bpy.data.node_groups.get("GN_Follaje")
    if gn:
        for nd in gn.nodes:
            if nd.type == "DISTRIBUTE_POINTS_ON_FACES":
                nd.inputs["Density"].default_value = 21000
            if nd.type == "RANDOM_VALUE" and nd.data_type == "FLOAT":
                nd.inputs["Min"].default_value, nd.inputs["Max"].default_value = 0.25, 0.5
    for nombre, color in (("ARQ_Hoja", (0.17, 0.25, 0.04)), ("ARQ_Copa_Interior", (0.05, 0.09, 0.02))):
        mat = bpy.data.materials.get(nombre)
        p = next((nd for nd in mat.node_tree.nodes if nd.type == "BSDF_PRINCIPLED"), None) if mat else None
        if p and not p.inputs["Base Color"].is_linked:
            p.inputs["Base Color"].default_value = (*color, 1)
    # arbustos: sólo la copa de la plantilla
    arbusto = bpy.data.collections.get("_Plantilla_Arbusto") or bpy.data.collections.new("_Plantilla_Arbusto")
    if "_Copa" not in arbusto.objects:
        arbusto.objects.link(bpy.data.objects["_Copa"])
    for i, (x, y, r) in enumerate(ARBUSTOS):
        e = bpy.data.objects.new(f"Arbusto_Render_{i}", None)
        e.instance_type, e.instance_collection = "COLLECTION", arbusto
        s = ESCALA_CITYH * r * 2 / 4.7
        e.location, e.scale, e.rotation_euler = (x, y, -0.2), (s, s, s), (0, 0, i * 2.1)
        col.objects.link(e)
    n = 0
    for x, y, alto in ARBOLES:
        e = bpy.data.objects.new(f"Arbol_Render_{n}", None)
        e.instance_type, e.instance_collection = "COLLECTION", bpy.data.collections["_Plantilla_Arbol"]
        s = ESCALA_CITYH * alto / 7.0 / 0.95
        e.location, e.scale, e.rotation_euler = (x, y, 0), (s, s, s), (0, 0, n * 1.3)
        col.objects.link(e)
        n += 1
    for i, (x, y) in enumerate(FAROLES):
        e = bpy.data.objects.new(f"Farol_Render_{i}", None)
        e.instance_type, e.instance_collection = "COLLECTION", bpy.data.collections["_Plantilla_Farol"]
        e.location, e.scale = (x, y, 0), (ESCALA_CITYH,) * 3
        col.objects.link(e)
    return n
