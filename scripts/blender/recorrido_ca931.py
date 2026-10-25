"""
Recorrido 360 de Cañada de Gómez 931 (docs/renders-recorrido.md, skill recorrido-360): para la unidad que se recorre
de cada tipología, lo que desde arriba no se ve y desde adentro delata una maqueta (pintura en la cara interior de
fachada, medianera y cielorraso, zócalos, puertas con marco y dintel, cortinas, cocina y baños de detalle, placards,
racks, luminarias) y las cámaras Pano_<recorrido>_<punto>.

No se corre solo: lo ejecuta modelar_ca931.py después de vestir_ca931.py (comparte Malla, Pieza, vi, modelo(),
medidas y materiales). Va en la colección "Recorrido", dentro de Interiores, con todo oculto para el render: plantas
y fachadas no lo ven. sesion_ca931.py lo prende (previa() y tanda()), oculta los muebles en cajas de la unidad
(Recorrido_Muebles_NN los reemplaza sin los de esa unidad) y corre renders_recorrido.py.

Coordenadas de plano como en interior_ca931.py: a desde la medianera izquierda (x = X0 + a), d desde la línea
municipal, z desde el piso terminado. En las piezas de vestir_interior.py el frente de un mueble mira a -Y local.
"""

H_TIPO = ALTO_PISO - LOSA - LOSA_CIELO   # 2,40: de piso terminado a cielorraso
VIGA = LOSA - LOSA_CIELO                 # lo que bajan las vigas del frente y del contrafrente
DINTEL_PUERTAS = vi["DINTEL"]
ALTURA_OJO = 1.55
CARA_FRENTE = VIDRIO_Y + 0.2             # cara interior del muro de fachada
CARA_FONDO = FONDO - 0.2                 # cara interior del contrafrente
CARA_MEDIANERA = 0.15
# ambiente del recorrido (propiedades de la primera cámara, las lee renders_recorrido.py): el sol entra de frente
# y algo de costado por el ventanal del estar; afuera, el HDRI
LUZ = {"escala": 1.0, "hdri": HDRI, "hdri_giro": 180.0, "sol": 3.0, "sol_rumbo": 200.0, "sol_altura": 30.0,
       "exposicion": 2.0}


def z_piso(n):
    return 0.0 if n == 0 else ALTO_PB + (n - 1) * ALTO_PISO + LOSA


# las piezas de interior_ca931.py en su propio espacio: vestir_ca931.py redefine cama() y estar() con otra firma
INTERIOR = dict(globals())
exec(open(os.path.join(AQUI_VESTIR, "interior_ca931.py"), encoding="utf-8").read(), INTERIOR)


class MallaSin(Malla):
    """Malla que descarta lo que cae dentro de `fuera` [(d0, d1, a0, a1)]: los muebles en cajas de la unidad del
    recorrido, que se reemplazan por los de detalle"""

    def __init__(self, fuera):
        super().__init__()
        self.fuera = fuera

    def _dentro(self, x, y):
        a = x - X0
        return any(d0 <= y <= d1 and a0 <= a <= a1 for d0, d1, a0, a1 in self.fuera)

    def caja(self, mat, x, y, z):
        if not self._dentro((x[0] + x[1]) / 2, (y[0] + y[1]) / 2):
            super().caja(mat, x, y, z)

    def cilindro(self, mat, x, y, z0, z1, radio, lados=10):
        if not self._dentro(x, y):
            super().cilindro(mat, x, y, z0, z1, radio, lados)


# ---------------------------------------------------------------- obra: pintura, zócalos, puertas
def _caja_muro(p, mat, eje, cara, lado, u0, u1, w0, w1, z0, z1):
    """caja en coordenadas de un muro: u a lo largo, w hacia el ambiente desde la cara (lado = hacia dónde está)"""
    wa, wb = sorted((cara + lado * w0, cara + lado * w1))
    if eje == "d":  # muro a lo largo de d, con la cara en a = cara
        p.caja(wa, u0, wb, u1, z0, z1, mat, 0.0)
    else:           # a lo largo de a, con la cara en d = cara
        p.caja(u0, wa, u1, wb, z0, z1, mat, 0.0)


def pintar_muro(p, mats, eje, cara, lado, u0, u1, alto, vanos=(), zocalo=True):
    """
    pintura de 1 cm sobre la cara de un muro de la cáscara (fachada, medianera, contrafrente), que por fuera tiene
    los revoques de la fachada. vanos: (v0, v1, z0, z1, fondo) — quedan libres y se pintan sus mochetas, antepecho
    y dintel hasta `fondo` (de la cara al vidrio)
    """
    g, pared = 0.01, mats["pared"]

    def tramo(v0, v1, z0, z1):
        _caja_muro(p, pared, eje, cara, lado, v0, v1, 0, g, z0, z1)
        if zocalo and z0 == 0:
            _caja_muro(p, mats["laca"], eje, cara, lado, v0, v1, g, g + 0.012, 0, 0.07)

    u = u0
    for v0, v1, z0, z1, fondo in sorted(vanos):
        if v0 > u:
            tramo(u, v0, 0, alto)
        if z0 > 0:
            tramo(v0, v1, 0, z0)
            _caja_muro(p, pared, eje, cara, lado, v0, v1, -fondo, g, z0, z0 + g)
        if z1 < alto:
            tramo(v0, v1, z1, alto)
            _caja_muro(p, pared, eje, cara, lado, v0, v1, -fondo, g, z1 - g, z1)
        _caja_muro(p, pared, eje, cara, lado, v0, v0 + g, -fondo, g, z0, z1)
        _caja_muro(p, pared, eje, cara, lado, v1 - g, v1, -fondo, g, z0, z1)
        u = v1
    if u1 > u:
        tramo(u, u1, 0, alto)


def pintar_cielo(p, mats, rectangulos, alto, a0, a1):
    """cielorraso blanco (la cara de abajo de la losa es el revoque de la fachada) y las vigas del perímetro"""
    for d0, d1, ra0, ra1 in rectangulos:
        p.caja(ra0, d0, ra1, d1, alto - 0.008, alto - 0.002, mats["cielorraso"], 0.0)
    # vigas: VIDRIO_Y + 0.1 → + 0.4 sobre el frente y FONDO − 0.35 → FONDO sobre el contrafrente
    p.caja(a0, CARA_FRENTE, a1, VIDRIO_Y + 0.405, alto - VIGA - 0.005, alto - 0.002, mats["cielorraso"], 0.0)
    p.caja(a0, FONDO - 0.355, a1, CARA_FONDO, alto - VIGA - 0.005, alto - 0.002, mats["cielorraso"], 0.0)


def zocalos(p, mats, muros, region):
    """zócalo de 7 cm en las caras largas de los tabiques que tocan la unidad (en los baños lo tapa el revestimiento)"""
    h, g = 0.07, 0.012
    for d0, d1, a0, a1 in muros:
        if not any(d0 < rd1 + 0.2 and d1 > rd0 - 0.2 and a0 < ra1 + 0.2 and a1 > ra0 - 0.2
                   for rd0, rd1, ra0, ra1 in region):
            continue
        if d1 - d0 >= a1 - a0:
            p.caja(a0 - g, d0, a0, d1, 0, h, mats["laca"], 0.002)
            p.caja(a1, d0, a1 + g, d1, 0, h, mats["laca"], 0.002)
        else:
            p.caja(a0, d0 - g, a1, d0, 0, h, mats["laca"], 0.002)
            p.caja(a0, d1, a1, d1 + g, 0, h, mats["laca"], 0.002)


def vano(p, mats, eje, c, u0, u1, espesor, alto, puerta=None, **opciones):
    """dintel de mampostería sobre un vano y, si va, la puerta con marco (vestir_interior.puerta: eje "x" = muro a
    lo largo de d en a = c; "y" = a lo largo de a en d = c)"""
    e = espesor / 2
    if eje == "x":
        p.caja(c - e, u0, c + e, u1, DINTEL_PUERTAS, alto, mats["pared"], 0.0)
    else:
        p.caja(u0, c - e, u1, c + e, DINTEL_PUERTAS, alto, mats["pared"], 0.0)
    if puerta:
        vi["puerta"](p, mats, eje, c, u0, u1, espesor, puerta, **opciones)


def revestir_bano(p, mats, d0, d1, a0, a1, alto, puerta, ducha=None):
    """porcelanato de 1,5 cm hasta el cielorraso en las cuatro caras (la de la ducha, `ducha`, más oscura) y piso
    oscuro: un baño todo blanco y con luz artificial sale sin contraste. puerta = (cara "d0"/"d1"/"a0"/"a1", u0, u1)"""
    g = 0.015
    p.caja(a0, d0, a1, d1, 0.02, 0.026, mats["piso_bano"], 0.0)
    caras = {"d0": ("a", d0, 1), "d1": ("a", d1, -1), "a0": ("d", a0, 1), "a1": ("d", a1, -1)}
    for clave, (eje, cara, lado) in caras.items():
        m = mats["porcelanato_oscuro"] if clave == ducha else mats["porcelanato"]
        u0, u1 = (a0, a1) if eje == "a" else (d0, d1)
        tramos = [(u0, u1, 0, alto)]
        if puerta and puerta[0] == clave:
            v0, v1 = puerta[1], puerta[2]
            tramos = [(u0, v0, 0, alto), (v1, u1, 0, alto), (v0, v1, DINTEL_PUERTAS + 0.06, alto)]
        for t0, t1, z0, z1 in tramos:
            if t1 > t0:
                _caja_muro(p, m, eje, cara, lado, t0, t1, 0, g, z0, z1)


# ---------------------------------------------------------------- muebles de detalle (coordenadas del mueble)
def en_pared(p, a, d, frente):
    """dibujar un mueble con el fondo en (a, d) y el frente hacia "+a", "-a", "+d" o "-d". En coordenadas del
    mueble x va a lo largo (giro 0: +a; 90: +d; 180: -a; -90: -d) y el frente mira a -Y"""
    return p.en(a, d, {"-d": 0, "+a": 90, "+d": 180, "-a": -90}[frente])


def hornallas(p, mats, hx, hy, zm):
    """anafe vitrocerámico con la serigrafía de las hornallas (sin ella se lee como acero)"""
    p.caja(hx - 0.29, hy - 0.25, hx + 0.29, hy + 0.25, zm, zm + 0.006, mats["vitro"], 0.003)
    for dx, dy, r in ((-0.14, -0.12, 0.09), (0.14, -0.12, 0.07), (-0.14, 0.12, 0.07), (0.14, 0.12, 0.09)):
        tmp = bmesh.new()
        bmesh.ops.create_circle(tmp, cap_ends=False, segments=48, radius=r,
                                matrix=Matrix.Translation((hx + dx, hy + dy, zm + 0.0062)))
        borde = bmesh.ops.extrude_edge_only(tmp, edges=tmp.edges[:])
        adentro = [e for e in borde["geom"] if isinstance(e, bmesh.types.BMVert)]
        k = 1 - 0.012 / r
        bmesh.ops.scale(tmp, vec=(k, k, 1), space=Matrix.Translation((-(hx + dx), -(hy + dy), 0)), verts=adentro)
        p._sumar(tmp, mats["serigrafia"])


def bajo_mesada(p, mats, largo, prof=0.6, anafe=None, pileta=None, alacenas=True, vuelo=0.0):
    """bajo mesada laqueado con tiradores, mesada de cuarzo, bacha y grifería, anafe y alacenas con campana.
    Fondo en y = 0, frente en y = -prof; vuelo: lo que la mesada sobresale por atrás (desayunador de una isla)"""
    zt, zm = 0.87, 0.9
    p.caja(0, -prof + 0.06, largo, 0, 0, 0.1, mats["negro"], 0.001)
    p.caja(0, -prof + 0.02, largo, 0, 0.1, 0.868, mats["laca_gris"], 0.001)
    n = max(1, round(largo / 0.6))
    for i in range(n):
        a, b = largo * i / n, largo * (i + 1) / n
        p.caja(a + 0.0015, -prof, b - 0.0015, -prof + 0.02, 0.1, 0.868, mats["laca_gris"], 0.002)
        xm = (a + b) / 2
        p.caja(xm - 0.16, -prof - 0.024, xm + 0.16, -prof - 0.012, 0.8, 0.812, mats["acero"])
        for s in (-1, 1):
            p.caja(xm + s * 0.135 - 0.005, -prof - 0.012, xm + s * 0.135 + 0.005, -prof, 0.8, 0.812, mats["acero"], 0)
    y0, y1 = -prof - 0.02, vuelo
    if pileta is None:
        p.caja(0, y0, largo, y1, zt, zm, mats["mesada"], 0.004)
    else:
        b1, b2, c1, c2 = pileta - 0.25, pileta + 0.25, -prof + 0.1, -0.1
        p.caja(0, y0, b1, y1, zt, zm, mats["mesada"], 0.004)
        p.caja(b2, y0, largo, y1, zt, zm, mats["mesada"], 0.004)
        p.caja(b1, y0, b2, c1, zt, zm, mats["mesada"], 0.002)
        p.caja(b1, c2, b2, y1, zt, zm, mats["mesada"], 0.002)
        p.caja(b1 + 0.005, c1 + 0.005, b2 - 0.005, c2 - 0.005, 0.7, 0.705, mats["acero"], 0.002)
        for u1, v1, u2, v2 in ((b1, c1, b2, c1 + 0.005), (b1, c2 - 0.005, b2, c2), (b1, c1, b1 + 0.005, c2),
                               (b2 - 0.005, c1, b2, c2)):
            p.caja(u1, v1, u2, v2, 0.7, zt, mats["acero"], 0.001)
        gx, gy = pileta, -0.05
        p.cilindro(gx, gy, zm, zm + 0.03, 0.028, mats["cromo"], chaflan=0.004)
        p.tubo((gx, gy, zm + 0.02), (gx, gy, zm + 0.34), 0.014, mats["cromo"])
        p.tubo((gx, gy, zm + 0.34), (gx, gy - 0.2, zm + 0.34), 0.012, mats["cromo"])
        p.tubo((gx, gy - 0.2, zm + 0.34), (gx, gy - 0.2, zm + 0.28), 0.012, mats["cromo"])
    if anafe is not None:
        hornallas(p, mats, anafe, -prof / 2, zm)
    if alacenas:
        p.caja(0, -0.01, largo, 0, zm, 1.45, mats["porcelanato"], 0.001)
        p.caja(0, -0.33, largo, 0, 1.45, 2.25, mats["laca"], 0.001)
        n = max(1, round(largo / 0.5))
        for i in range(n):
            a, b = largo * i / n, largo * (i + 1) / n
            p.caja(a + 0.0015, -0.35, b - 0.0015, -0.33, 1.45, 2.25, mats["laca"], 0.002)
        if anafe is not None:
            p.caja(anafe - 0.29, -0.36, anafe + 0.29, -0.02, 1.43, 1.45, mats["acero"], 0.002)
        p.caja(0.05, -0.27, largo - 0.05, -0.25, 1.442, 1.45, mats["luz"], 0)


def heladera_acero(p, mats, ancho=0.6, prof=0.64):
    p.caja(0, -prof, ancho, 0, 0.0, 1.14, mats["acero"], 0.008)
    p.caja(0, -prof, ancho, 0, 1.15, 1.85, mats["acero"], 0.008)
    for z1, z2 in ((0.65, 1.05), (1.25, 1.65)):
        p.caja(ancho - 0.07, -prof - 0.03, ancho - 0.05, -prof, z1, z2, mats["acero"], 0.004)


def placard(p, mats, largo, prof=0.6, alto=2.3):
    """placard laqueado de hojas batientes con tiradores verticales"""
    p.caja(0, -prof + 0.02, largo, 0, 0, alto, mats["laca"], 0.001)
    n = max(1, round(largo / 0.5))
    for i in range(n):
        a, b = largo * i / n, largo * (i + 1) / n
        p.caja(a + 0.0015, -prof, b - 0.0015, -prof + 0.02, 0.005, alto, mats["laca"], 0.002)
        x = b - 0.05 if i % 2 == 0 else a + 0.04
        p.caja(x, -prof - 0.02, x + 0.01, -prof, 0.95, 1.35, mats["acero"], 0.002)


def estantes(p, mats, largo, prof=0.5, alto=2.2):
    """vestidor abierto: laterales y estantes de roble, barral y ropa doblada"""
    r = mats["roble"]
    for x in (0, largo - 0.02):
        p.caja(x, -prof, x + 0.02, 0, 0, alto, r, 0.002)
    for z in (0.08, 0.45, 1.6, alto - 0.02):
        p.caja(0.02, -prof, largo - 0.02, 0, z, z + 0.02, r, 0.002)
    p.tubo((0.02, -prof / 2, 1.5), (largo - 0.02, -prof / 2, 1.5), 0.012, mats["cromo"])
    telas = (mats["tapizado"], mats["terracota"], mats["salvia"], mats["sabana"])
    x, i = 0.06, 0
    while x + 0.3 < largo - 0.04:
        for k, z in enumerate((0.47, 1.62)):
            p.caja(x, -prof + 0.06, x + 0.28, -0.05, z, z + 0.12 + 0.04 * ((i + k) % 2), telas[(i + k) % 4], 0.015, 2)
        x, i = x + 0.34, i + 1
    # camisas y sacos colgados del barral
    x = 0.08
    while x < largo - 0.1:
        p.caja(x, -prof / 2 - 0.2, x + 0.025, -prof / 2 + 0.2, 0.75, 1.45, telas[int(x * 7) % 4], 0.01, 2)
        x += 0.06


def rack(p, mats, largo, prof=0.42, tele=True):
    """rack de nogal suspendido con la tele colgada encima (fondo contra la pared)"""
    p.caja(0, -prof, largo, 0, 0.2, 0.5, mats["nogal"], 0.004)
    n = 3
    for i in range(n):
        a, b = largo * i / n, largo * (i + 1) / n
        p.caja(a + 0.002, -prof - 0.012, b - 0.002, -prof, 0.21, 0.49, mats["nogal"], 0.002)
    if tele:
        xm = largo / 2
        p.caja(xm - 0.62, -0.04, xm + 0.62, 0, 0.95, 1.66, mats["negro"], 0.004)
        p.caja(xm - 0.605, -0.045, xm + 0.605, -0.04, 0.965, 1.645, mats["vitro"], 0.001)
    vi["libros"](p, mats, largo - 0.35, -0.3, 0.5)


def inodoro(p, mats, bidet=False):
    """suspendido, de 36 × 55 (fondo contra la pared en y = 0)"""
    s = mats["WEB_Sanitario"]
    p.caja(-0.18, -0.55, 0.18, 0, 0.2, 0.42, s, 0.07, 4)
    if bidet:
        p.caja(-0.13, -0.45, 0.13, -0.15, 0.405, 0.43, mats["sombra"], 0.03, 3)
        p.cilindro(0, -0.09, 0.42, 0.45, 0.022, mats["cromo"], chaflan=0.004)
        p.tubo((0, -0.09, 0.45), (0, -0.16, 0.47), 0.01, mats["cromo"])
    else:
        p.caja(-0.17, -0.54, 0.17, -0.06, 0.42, 0.44, s, 0.015, 3)
        p.caja(-0.08, -0.008, 0.08, 0, 1.0, 1.12, mats["cromo"], 0.004)


def vanitory(p, mats, largo, espejo=True):
    """mueble de nogal suspendido con bacha de apoyo, grifería y espejo con LED"""
    s = mats["WEB_Sanitario"]
    p.caja(0, -0.45, largo, 0, 0.45, 0.82, mats["nogal"], 0.004)
    p.caja(0, -0.47, largo, 0, 0.82, 0.85, mats["mesada"], 0.003)
    xm = largo / 2
    p.caja(xm - 0.22, -0.4, xm + 0.22, -0.08, 0.85, 0.97, s, 0.05, 4)
    p.caja(xm - 0.18, -0.36, xm + 0.18, -0.12, 0.9, 0.972, mats["sombra"], 0.03, 3)
    p.cilindro(xm, -0.04, 0.85, 0.87, 0.025, mats["cromo"])
    p.tubo((xm, -0.04, 0.86), (xm, -0.04, 1.12), 0.012, mats["cromo"])
    p.tubo((xm, -0.04, 1.12), (xm, -0.18, 1.12), 0.011, mats["cromo"])
    if espejo:
        p.caja(0, -0.006, largo, 0, 1.02, 1.82, mats["espejo"], 0.002)
        p.caja(-0.01, -0.004, largo + 0.01, 0.001, 1.01, 1.83, mats["negro"], 0.002)
        p.caja(0.02, -0.02, largo - 0.02, -0.011, 1.83, 1.845, mats["luz"], 0)


def ducha(p, mats, d0, d1, a0, a1, mampara, flor):
    """plato, mampara fija de vidrio ((a0, d0, a1, d1) de la hoja) y flor de techo"""
    p.caja(a0, d0, a1, d1, 0, 0.03, mats["WEB_Sanitario"], 0.006)
    ma0, md0, ma1, md1 = mampara
    p.caja(ma0, md0, ma1, md1, 0.03, 2.0, mats["vidrio"], 0.002)
    fa, fd = flor
    p.cilindro(fa, fd, 2.08, 2.095, 0.11, mats["cromo"], 32)
    p.tubo((fa, fd, 2.095), (fa, fd, H_TIPO - 0.005), 0.01, mats["cromo"])


def cortina(p, mats, cara, u0, u1, alto, lado=1):
    """voile recogido a un costado de una ventana del frente o del fondo (onda pareja, 25 filas)"""
    sep, amplitud, onda = 0.1, 0.05, 0.15
    n = max(8, int((u1 - u0) / onda * 8))
    filas = []
    for k in range(25):
        z = 0.02 + (alto - 0.07) * k / 24
        filas.append([(u0 + (u1 - u0) * i / n,
                       cara + lado * (sep + amplitud * math.sin(2 * math.pi * (u1 - u0) * i / n / onda)), z)
                      for i in range(n + 1)])
    p.superficie(filas, mats["voile"])


def riel(p, mats, cara, u0, u1, alto, lado=1):
    d = cara + lado * 0.1
    p.caja(u0, d - 0.015, u1, d + 0.015, alto - 0.03, alto, mats["aluminio"], 0.002)


def roller(p, mats, a0, a1, d, arriba, abajo):
    """cortina roller de screen a medio bajar, en la mocheta de la ventana"""
    p.caja(a0 - 0.01, d - 0.04, a1 + 0.01, d + 0.04, arriba - 0.08, arriba, mats["aluminio"], 0.004)
    p.caja(a0, d - 0.002, a1, d + 0.002, abajo, arriba - 0.08, mats["screen"], 0.0)
    p.caja(a0, d - 0.008, a1, d + 0.008, abajo - 0.02, abajo, mats["aluminio"], 0.003)


# ---------------------------------------------------------------- luminarias
def luz(col, nombre, a, d, z, potencia, tipo="AREA", tamano=0.2, color=(1.0, 0.85, 0.68), largo=None):
    """apagada para plantas y fachadas; renders_recorrido.py prende las que tienen luz_recorrido. largo: tira
    rectangular a lo largo de d (bajo alacena: una cuadrada asoma y marca una línea en las paredes)"""
    datos = bpy.data.lights.new(nombre, tipo)
    datos.energy, datos.color = potencia, color
    if tipo == "AREA" and largo:
        datos.shape, datos.size, datos.size_y = "RECTANGLE", tamano, largo
    elif tipo == "AREA":
        datos.size = tamano
    else:
        datos.shadow_soft_size = tamano
    o = bpy.data.objects.new(nombre, datos)
    o.location = (X0 + a, d, z)
    o.hide_render = True
    o.visible_camera = False
    o["luz_recorrido"] = True
    col.objects.link(o)
    return o


def plafon(p, col, mats, nombre, a, d, zf, alto, potencia, radio=0.13):
    p.cilindro(a, d, alto - 0.012, alto - 0.002, radio, mats["luz"], 40)
    luz(col, nombre, a, d, zf + alto - 0.02, potencia, tamano=radio * 2)


# ---------------------------------------------------------------- cámaras
def camara_pano(col, recorrido, clave, titulo, orden, a, d, zf, mira, **propiedades):
    nombre = f"Pano_{recorrido}_{clave}"
    viejo = bpy.data.cameras.get(nombre)
    if viejo and viejo.users == 0:  # de la corrida anterior: si queda, la nueva sería "….001"
        bpy.data.cameras.remove(viejo)
    datos = bpy.data.cameras.new(nombre)
    o = bpy.data.objects.new(nombre, datos)
    o.location = (X0 + a, d, zf + ALTURA_OJO)
    o.rotation_euler = (math.radians(90), 0, math.atan2(-(mira[0] - a), mira[1] - d))
    o["titulo"], o["orden"] = titulo, orden
    for k, v in propiedades.items():
        o[k] = v
    col.objects.link(o)
    return o


# ---------------------------------------------------------------- 3 ambientes (A), en el piso 2
def tres_ambientes(col, mats):
    n, alto = 2, H_TIPO
    zf = z_piso(n)
    # la unidad 2A de unidades() en modelar_ca931.py, sin el balcón
    region = [(VIDRIO_Y, 3.0, 0.15, 5.33), (3.0, 11.2, 0.15, 3.08), (11.2, 15.55, 0.15, 5.62)]
    sin = MallaSin(region)
    INTERIOR["muebles_tipo"](sin, Malla())
    o = sin.objeto(f"Recorrido_Muebles_{n:02d}", col)
    o.location.z, o["reemplaza"] = zf, f"Interior_{n:02d}_Muebles"

    p = Pieza("Recorrido_3amb")
    # cáscara pintada por dentro: frente (ventanal del estar y ventana de la cocina), medianera y contrafrente
    fondo_frente = CARA_FRENTE - (VIDRIO_Y + 0.02)
    pintar_muro(p, mats, "a", CARA_FRENTE, 1, CARA_MEDIANERA, 5.28, alto,
                [(0.6, 2.88, 0, alto - VIGA, fondo_frente), (3.78, 4.28, 0, alto - VIGA, fondo_frente)])
    pintar_muro(p, mats, "d", CARA_MEDIANERA, 1, CARA_FRENTE, CARA_FONDO, alto)
    sill, cabeza = 0.65, 2.10   # ventanas del contrafrente (piso(): z0 + 0,9 a z1 − 0,4)
    fondo_atras = 0.1
    pintar_muro(p, mats, "a", CARA_FONDO, -1, CARA_MEDIANERA, 5.58, alto,
                [(0.6, 2.6, sill, cabeza, fondo_atras), (3.6, 5.2, sill, cabeza, fondo_atras)])
    pintar_cielo(p, mats, region, alto, CARA_MEDIANERA, 5.58)
    zocalos(p, mats, MUROS_TIPO, region)

    # puertas: entrada desde el palier (cerrada), baño 1 corrediza, dormitorio 2 y principal batientes, baño 2 en
    # suite (corrediza del lado del baño) y pasos sin hoja al pasillo y del vestidor al principal
    vano(p, mats, "x", 3.125, 6.9, 7.9, 0.15, alto, "b", lado=-1, cerrada=True)
    vano(p, mats, "x", 2.05, 7.6, 8.4, 0.10, alto, "b", lado=1, corrediza=True)
    vano(p, mats, "x", 3.125, 11.3, 12.2, 0.15, alto, "a", lado=1)
    vano(p, mats, "y", 12.35, 2.15, 3.05, 0.10, alto, "b", lado=1)
    vano(p, mats, "y", 10.9, 0.80, 1.45, 0.10, alto, "a", lado=-1, corrediza=True)
    vano(p, mats, "y", 12.35, 0.80, 1.45, 0.10, alto)
    vano(p, mats, "y", 6.85, 2.10, 3.05, 0.10, alto)

    # cocina: isla con pileta (banquetas del lado del estar), mesada con anafe y alacenas, heladera
    with en_pared(p, 3.0, 0.65, "+a"):
        bajo_mesada(p, mats, 1.7, anafe=None, pileta=0.85, alacenas=False, vuelo=0.25)
    with en_pared(p, 5.28, 2.4, "-a"):
        bajo_mesada(p, mats, 1.75, anafe=1.45)
    with en_pared(p, 5.28, 2.98, "-a"):
        heladera_acero(p, mats, 0.58)
    luz(col, "Rec_Luz_Cocina", 5.11, 1.52, zf + 1.43, 20, tamano=0.2, largo=1.6)
    # estar y principal: racks con tele; placards y vestidor
    with en_pared(p, 3.05, 6.25, "-a"):
        rack(p, mats, 1.5)
    with en_pared(p, 3.05, 14.8, "-a"):
        rack(p, mats, 1.45)
    with en_pared(p, 5.56, 11.25, "+d"):
        placard(p, mats, 1.41)
    with en_pared(p, CARA_MEDIANERA, 10.95, "+a"):
        estantes(p, mats, 1.35, prof=0.6)
    with en_pared(p, 2.0, 12.3, "-a"):
        estantes(p, mats, 1.35, prof=0.5)

    # baño 1: inodoro, bidet y vanitory contra el estar; ducha en el rincón del fondo
    revestir_bano(p, mats, 6.9, 8.8, CARA_MEDIANERA, 2.0, alto, ("a1", 7.6, 8.4), ducha="d1")
    with en_pared(p, 0.5, 6.915, "+d"):
        inodoro(p, mats)
    with en_pared(p, 0.95, 6.915, "+d"):
        inodoro(p, mats, bidet=True)
    with en_pared(p, 1.95, 6.915, "+d"):
        vanitory(p, mats, 0.6)
    ducha(p, mats, 7.95, 8.785, 0.165, 1.1, (1.095, 8.3, 1.105, 8.785), (0.62, 8.4))
    plafon(p, col, mats, "Rec_Luz_Bano_1", 1.3, 7.9, zf, alto, 6)
    luz(col, "Rec_Luz_Espejo_1", 1.65, 7.0, zf + 1.9, 2, tamano=0.5)
    # baño 2 (en suite): ducha de pared a pared, inodoro y bidet contra la medianera, vanitory contra el pasillo
    revestir_bano(p, mats, 8.9, 10.85, CARA_MEDIANERA, 2.0, alto, ("d1", 0.80, 1.45), ducha="d0")
    ducha(p, mats, 8.915, 9.55, 0.165, 1.985, (0.165, 9.545, 1.1, 9.555), (1.0, 9.2))
    with en_pared(p, 0.165, 9.8, "+a"):
        inodoro(p, mats)
    with en_pared(p, 0.165, 10.3, "+a"):
        inodoro(p, mats, bidet=True)
    with en_pared(p, 1.985, 10.45, "-a"):
        vanitory(p, mats, 0.7)
    plafon(p, col, mats, "Rec_Luz_Bano_2", 1.1, 9.9, zf, alto, 6)
    luz(col, "Rec_Luz_Espejo_2", 1.85, 10.1, zf + 1.9, 2, tamano=0.5)

    # cortinas: voile en el ventanal del estar, rollers en la cocina y los dormitorios
    for u0, u1 in ((0.45, 0.95), (2.43, 2.93)):
        cortina(p, mats, CARA_FRENTE, u0, u1, alto)
    riel(p, mats, CARA_FRENTE, 0.4, 3.0, alto)
    roller(p, mats, 3.78, 4.28, CARA_FRENTE - 0.03, alto - VIGA, 1.5)
    for a0, a1 in ((0.6, 2.6), (3.6, 5.2)):
        roller(p, mats, a0, a1, CARA_FONDO + 0.03, cabeza, 1.55)

    # luminarias: spots del pasillo y del vestidor (las lámparas de noche están en las mesas de luz del vestido)
    for nombre, a, d, w in (("Rec_Luz_Pasillo_1", 2.58, 8.6, 10), ("Rec_Luz_Pasillo_2", 2.58, 10.8, 10),
                            ("Rec_Luz_Vestidor", 1.1, 11.6, 8)):
        p.cilindro(a, d, alto - 0.008, alto - 0.002, 0.045, mats["luz"], 24)
        luz(col, nombre, a, d, zf + alto - 0.02, w, tamano=0.08)
    for nombre, a, d in (("Rec_Luz_Noche_1", 0.37, 12.95), ("Rec_Luz_Noche_2", 0.37, 15.05),
                         ("Rec_Luz_Noche_3", 5.3, 15.25)):
        luz(col, nombre, a, d, zf + 0.86, 8, "POINT", 0.06)
    p.crear(col, zf, n)

    # cuadros y colgante del comedor (Poly Haven)
    modelo("hanging_picture_frame_02", col, 0.165, 5.4, 90, zf + 1.45, n)
    modelo("hanging_picture_frame_01", col, 0.165, 14.0, 90, zf + 1.5, n)
    modelo("hanging_picture_frame_01", col, 2.1, 9.9, 90, zf + 1.5, n)
    modelo("modern_ceiling_lamp_01", col, 1.175, 1.8, 0, zf + alto - 1.173, n)

    # puntos del recorrido: cada uno en línea recta con otro a través de una puerta, a la altura de los ojos
    r = "3-ambientes"
    camara_pano(col, r, "estar", "Estar comedor", 1, 2.3, 3.6, zf, (1.3, 0.6), nombre="3 ambientes", **LUZ)
    camara_pano(col, r, "cocina", "Cocina", 2, 4.14, 1.6, zf, (4.0, 0.6))
    camara_pano(col, r, "pasillo", "Pasillo", 3, 2.58, 8.0, zf, (1.5, 8.0))   # arranca mirando la puerta del baño
    camara_pano(col, r, "bano", "Baño", 4, 1.55, 7.95, zf, (1.6, 6.9))
    camara_pano(col, r, "hall", "Hall de dormitorios", 5, 2.6, 11.75, zf, (2.6, 15.0))
    camara_pano(col, r, "dormitorio", "Dormitorio", 6, 4.4, 12.9, zf, (4.4, 15.5))
    # el vestidor y el baño en suite quedan en diagonal a la puerta del principal: esos enlaces van a mano
    camara_pano(col, r, "principal", "Dormitorio principal", 7, 2.0, 12.85, zf, (0.5, 14.0), enlaces="hall,vestidor")
    camara_pano(col, r, "vestidor", "Vestidor", 8, 1.12, 11.65, zf, (1.12, 10.0), enlaces="principal,bano-suite")
    camara_pano(col, r, "bano-suite", "Baño en suite", 9, 1.12, 10.1, zf, (1.12, 8.9))


# ---------------------------------------------------------------- 2 ambientes (B), en el piso 3
def dos_ambientes(col, mats):
    n, alto = 3, H_TIPO
    zf = z_piso(n)
    derecha = ANCHO - CARA_MEDIANERA   # cara de la medianera derecha
    region = [(VIDRIO_Y, 6.85, 5.38, 8.51), (6.85, 15.55, 5.68, 8.51)]
    sin = MallaSin(region)
    INTERIOR["muebles_tipo"](sin, Malla())
    o = sin.objeto(f"Recorrido_Muebles_{n:02d}", col)
    o.location.z, o["reemplaza"] = zf, f"Interior_{n:02d}_Muebles"

    p = Pieza("Recorrido_2amb")
    fondo_frente = CARA_FRENTE - (VIDRIO_Y + 0.02)
    pintar_muro(p, mats, "a", CARA_FRENTE, 1, 5.43, derecha, alto, [(6.78, 8.21, 0, alto - VIGA, fondo_frente)])
    pintar_muro(p, mats, "d", derecha, -1, CARA_FRENTE, CARA_FONDO, alto)
    sill, cabeza = 0.65, 2.10
    pintar_muro(p, mats, "a", CARA_FONDO, -1, 5.73, derecha, alto, [(6.26, 8.06, sill, cabeza, 0.1)])
    pintar_cielo(p, mats, region, alto, 5.43, derecha)
    zocalos(p, mats, MUROS_TIPO, region)

    # entrada desde el palier (cerrada), baño con corrediza del lado del pasillo, dormitorio batiente, paso a la cocina
    vano(p, mats, "x", 5.355, 5.40, 6.30, 0.15, alto, "a", lado=1, cerrada=True)
    vano(p, mats, "x", 6.65, 10.10, 10.90, 0.10, alto, "a", lado=-1, corrediza=True)
    vano(p, mats, "y", 11.70, 5.73, 6.60, 0.10, alto, "a", lado=1)
    vano(p, mats, "y", 9.30, 5.73, 6.60, 0.10, alto)

    # cocina en L: isla con pileta y desayunador hacia el comedor, mesada con anafe contra la medianera, heladera
    with en_pared(p, 8.5, 6.25, "+d"):
        bajo_mesada(p, mats, 1.9, pileta=1.1, alacenas=False, vuelo=0.3)
    with en_pared(p, derecha, 8.6, "-a"):
        bajo_mesada(p, mats, 1.75, anafe=1.2)
    with en_pared(p, derecha, 9.23, "-a"):
        heladera_acero(p, mats, 0.6)
    luz(col, "Rec_Luz_Cocina_B", derecha - 0.17, 7.72, zf + 1.43, 20, tamano=0.2, largo=1.6)
    # racks con tele en el estar y en el dormitorio, placard
    with en_pared(p, 5.43, 0.9, "+a"):
        rack(p, mats, 1.6)
    with en_pared(p, 5.73, 13.2, "+a"):
        rack(p, mats, 1.6)
    with en_pared(p, 8.5, 11.75, "+d"):
        placard(p, mats, 1.9)

    # baño: vanitory contra la cocina, inodoro y bidet contra el dormitorio, ducha contra la medianera y termo
    revestir_bano(p, mats, 9.35, 11.65, 6.7, derecha, alto, ("a0", 10.10, 10.90), ducha="a1")
    with en_pared(p, 7.5, 9.365, "+d"):
        vanitory(p, mats, 0.7)
    with en_pared(p, 6.95, 11.635, "-d"):
        inodoro(p, mats)
    with en_pared(p, 7.35, 11.635, "-d"):
        inodoro(p, mats, bidet=True)
    ducha(p, mats, 10.0, 11.635, 7.6, derecha - 0.015, (7.595, 10.85, 7.605, 11.635), (8.05, 10.8))
    p.cilindro(8.1, 9.65, 1.25, 1.95, 0.22, mats["WEB_Sanitario"], 32, chaflan=0.02)   # termo eléctrico
    plafon(p, col, mats, "Rec_Luz_Bano_B", 7.6, 10.5, zf, alto, 6)
    luz(col, "Rec_Luz_Espejo_B", 7.15, 9.45, zf + 1.9, 2, tamano=0.5)

    for u0, u1 in ((6.63, 7.13), (7.86, 8.36)):
        cortina(p, mats, CARA_FRENTE, u0, u1, alto)
    riel(p, mats, CARA_FRENTE, 6.6, 8.45, alto)
    roller(p, mats, 6.26, 8.06, CARA_FONDO + 0.03, cabeza, 1.55)
    p.cilindro(6.17, 10.5, alto - 0.008, alto - 0.002, 0.045, mats["luz"], 24)
    luz(col, "Rec_Luz_Pasillo_B", 6.17, 10.5, zf + alto - 0.02, 10, tamano=0.08)
    luz(col, "Rec_Luz_Noche_B", 8.25, 15.05, zf + 0.86, 8, "POINT", 0.06)
    p.crear(col, zf, n)

    modelo("hanging_picture_frame_02", col, derecha - 0.005, 1.85, -90, zf + 1.45, n)
    modelo("hanging_picture_frame_01", col, derecha - 0.005, 14.0, -90, zf + 1.5, n)
    modelo("modern_ceiling_lamp_01", col, 6.95, 4.3, 0, zf + alto - 1.173, n)

    r = "2-ambientes"
    # el ventanal es angosto y el antepecho del balcón, macizo: entra menos luz que en el 3 ambientes
    camara_pano(col, r, "estar", "Estar comedor", 1, 6.3, 3.0, zf, (7.5, 0.6), nombre="2 ambientes",
                enlaces="balcon,cocina,pasillo", **dict(LUZ, exposicion=2.6))
    # el vidrio del ventanal corta la vista a la altura de los ojos: el balcón se enlaza a mano
    camara_pano(col, r, "balcon", "Balcón", 2, 7.2, -0.6, zf, (7.2, -1.4), enlaces="estar")
    camara_pano(col, r, "cocina", "Cocina", 3, 7.0, 7.6, zf, (8.3, 7.6))
    camara_pano(col, r, "pasillo", "Pasillo", 4, 6.17, 10.5, zf, (6.17, 15.0))
    camara_pano(col, r, "bano", "Baño", 5, 7.15, 10.4, zf, (7.15, 9.35))
    camara_pano(col, r, "dormitorio", "Dormitorio", 6, 6.3, 12.85, zf, (7.5, 14.0))


# ---------------------------------------------------------------- 4 ambientes con patio (PB)
def planta_baja(col, mats):
    n, alto = 0, ALTO_PB - LOSA_CIELO
    zf = 0.0
    derecha = ANCHO - CARA_MEDIANERA
    region = [(-0.15, 3.95, 0.15, 5.33), (3.95, 11.45, 0.15, 3.32), (11.45, 15.55, 0.15, 8.51),
              (8.75, 11.45, 5.45, 8.51)]
    sin = MallaSin(region)
    INTERIOR["muebles_pb"](sin, Malla())
    o = sin.objeto("Recorrido_Muebles_PB", col)
    o["reemplaza"] = "Interior_PB_Muebles"

    p = Pieza("Recorrido_PB")
    # frente: el ventanal de los dormitorios detrás de los listones (planta_baja() de modelar_ca931.py); el tramo
    # del dormitorio 2 que no tiene vidrio va pintado
    pintar_muro(p, mats, "a", 0.6, 1, CARA_MEDIANERA, 5.31, alto, [(0.25, 4.38, 0.45, 3.0, 0.05)])
    pintar_muro(p, mats, "d", CARA_MEDIANERA, 1, 0.6, CARA_FONDO, alto)
    pintar_muro(p, mats, "d", derecha, -1, 8.8, CARA_FONDO, alto)
    # contrafrente: puerta-ventana del estar al patio y ventana del dormitorio 3
    pintar_muro(p, mats, "a", CARA_FONDO, -1, CARA_MEDIANERA, derecha, alto,
                [(0.4, 3.2, 0.05, 2.4, 0.1), (6.06, 8.06, 0.9, 2.4, 0.1)])
    pintar_cielo(p, mats, region, alto, CARA_MEDIANERA, derecha)
    zocalos(p, mats, MUROS_PB, region)

    # puertas de los dormitorios del frente, del baño 1 (corrediza), del dormitorio 3 y del baño 2 (corrediza)
    vano(p, mats, "y", 3.97, 1.70, 2.47, 0.10, alto, "b", lado=-1)
    vano(p, mats, "y", 3.97, 2.62, 3.42, 0.10, alto, "a", lado=-1)
    vano(p, mats, "x", 2.05, 5.20, 6.00, 0.10, alto, "b", lado=1, corrediza=True)
    vano(p, mats, "y", 12.25, 5.55, 6.40, 0.10, alto, "a", lado=1)
    vano(p, mats, "y", 10.35, 5.55, 6.35, 0.10, alto, "b", lado=1, corrediza=True)
    vano(p, mats, "x", 5.45, 11.40, 12.15, 0.10, alto)
    vano(p, mats, "y", 7.40, 2.0, 3.30, 0.10, alto)

    # cocina: isla con pileta y banquetas del lado del comedor, mesada con anafe y heladera contra el dormitorio 3
    with en_pared(p, 3.05, 12.3, "+a"):
        bajo_mesada(p, mats, 2.95, pileta=1.8, alacenas=False, vuelo=0.25)
    with en_pared(p, 5.4, 15.35, "-a"):
        bajo_mesada(p, mats, 2.35, anafe=1.15)
    with en_pared(p, 5.4, 12.98, "-a"):
        heladera_acero(p, mats, 0.62)
    luz(col, "Rec_Luz_Cocina_PB", 5.23, 14.17, 1.43, 25, tamano=0.2, largo=2.2)
    with en_pared(p, 3.30, 10.0, "-a"):
        rack(p, mats, 1.6)
    with en_pared(p, 5.5, 13.25, "+a"):
        rack(p, mats, 1.45)
    with en_pared(p, derecha, 12.2, "-a"):
        placard(p, mats, 1.8)
    with en_pared(p, 3.57, 3.0, "-d"):
        placard(p, mats, 1.74, prof=0.55)

    # baño 1: inodoro y bidet contra el pasillo de los dormitorios, vanitory contra la medianera, ducha al fondo
    revestir_bano(p, mats, 4.62, 7.35, CARA_MEDIANERA, 2.0, alto, ("a1", 5.20, 6.00), ducha="d1")
    with en_pared(p, 0.57, 4.635, "+d"):
        inodoro(p, mats)
    with en_pared(p, 1.12, 4.635, "+d"):
        inodoro(p, mats, bidet=True)
    with en_pared(p, 0.165, 5.7, "+a"):
        vanitory(p, mats, 0.7)
    ducha(p, mats, 6.6, 7.335, 0.165, 1.985, (0.165, 6.595, 1.2, 6.605), (1.0, 7.0))
    plafon(p, col, mats, "Rec_Luz_Bano_PB_1", 1.1, 5.9, zf, alto, 6)
    luz(col, "Rec_Luz_Espejo_PB_1", 0.3, 6.05, 1.9, 2, tamano=0.5)
    # baño 2: todo contra el muro de la portería y la ducha contra la medianera
    revestir_bano(p, mats, 8.8, 10.3, 5.5, derecha, alto, ("d1", 5.55, 6.35), ducha="a1")
    with en_pared(p, 6.6, 8.815, "+d"):
        vanitory(p, mats, 0.7)
    with en_pared(p, 6.9, 8.815, "+d"):
        inodoro(p, mats)
    with en_pared(p, 7.3, 8.815, "+d"):
        inodoro(p, mats, bidet=True)
    ducha(p, mats, 8.815, 10.285, 7.65, derecha - 0.015, (7.645, 8.815, 7.655, 9.6), (8.1, 9.6))
    plafon(p, col, mats, "Rec_Luz_Bano_PB_2", 6.8, 9.6, zf, alto, 6)

    # cortinas: voile en la puerta-ventana al patio, rollers en los dormitorios
    for u0, u1 in ((0.25, 0.75), (2.75, 3.25)):
        cortina(p, mats, CARA_FONDO, u0, u1, alto, lado=-1)
    riel(p, mats, CARA_FONDO, 0.2, 3.28, alto, lado=-1)
    for a0, a1 in ((0.25, 2.47), (2.57, 4.38)):
        roller(p, mats, a0, a1, 0.66, 3.0, 1.9)
    roller(p, mats, 6.06, 8.06, CARA_FONDO + 0.03, 2.4, 1.7)

    # el estar queda lejos de las ventanas: spots en el cielorraso, como en una obra de verdad
    for nombre, a, d, w in (("Rec_Luz_Estar_1", 1.7, 8.6, 15), ("Rec_Luz_Estar_2", 1.7, 10.2, 15),
                            ("Rec_Luz_Pasillo_PB_1", 2.7, 4.8, 10), ("Rec_Luz_Pasillo_PB_2", 2.7, 6.6, 10),
                            ("Rec_Luz_Paso_PB", 6.0, 11.3, 10)):
        p.cilindro(a, d, alto - 0.008, alto - 0.002, 0.045, mats["luz"], 24)
        luz(col, nombre, a, d, alto - 0.02, w, tamano=0.08)
    for nombre, a, d in (("Rec_Luz_Noche_PB_1", 0.37, 2.05), ("Rec_Luz_Noche_PB_2", 5.09, 1.95),
                         ("Rec_Luz_Noche_PB_3", 8.25, 12.88), ("Rec_Luz_Noche_PB_4", 8.25, 14.92)):
        luz(col, nombre, a, d, 0.86, 8, "POINT", 0.06)
    p.crear(col, zf, n)

    modelo("hanging_picture_frame_02", col, 0.165, 9.2, 90, 1.45, n)
    modelo("hanging_picture_frame_01", col, derecha - 0.005, 13.9, -90, 1.5, n)
    modelo("modern_ceiling_lamp_01", col, 1.025, 13.6, 0, alto - 1.173, n)

    r = "planta-baja"
    luz_pb = dict(LUZ, exposicion=2.5)   # el estar está en el medio de la planta, lejos de las ventanas
    camara_pano(col, r, "estar", "Estar comedor", 1, 2.55, 11.6, zf, (1.6, 15.5), nombre="Planta baja", **luz_pb)
    camara_pano(col, r, "cocina", "Cocina", 2, 4.2, 14.0, zf, (4.2, 15.5))
    camara_pano(col, r, "paso", "Paso", 3, 6.0, 11.5, zf, (6.0, 13.0))
    camara_pano(col, r, "dormitorio-3", "Dormitorio en suite", 4, 6.1, 12.75, zf, (7.5, 13.9))
    camara_pano(col, r, "pasillo", "Pasillo", 5, 2.65, 5.3, zf, (2.65, 0.6))
    camara_pano(col, r, "bano", "Baño", 6, 1.3, 5.95, zf, (0.165, 6.05))
    camara_pano(col, r, "dormitorio-1", "Dormitorio 1", 7, 1.3, 3.0, zf, (0.5, 1.35))
    camara_pano(col, r, "dormitorio-2", "Dormitorio 2", 8, 3.05, 2.75, zf, (4.3, 1.25))


# ---------------------------------------------------------------- vereda de enfrente
def enfrente(col):
    """
    la cuadra de enfrente, para lo que se ve por las ventanas del frente (en las tomas de fachada no está: las fotos
    son desde ahí): la de este lado girada 180° sobre el eje de la calle (en x = 4 la cuadra cae en el mismo lugar),
    con las casas vecinas en sus huecos y una más, angostada, en el del 931
    """
    giro = Matrix.Translation((4, -8, 0)) @ Matrix.Rotation(math.pi, 4, "Z") @ Matrix.Translation((-4, 8, 0))
    lote = (Matrix.Translation((3.67, 0, 0)) @ Matrix.Diagonal((ANCHO / 9.45, 1, 1, 1))
            @ Matrix.Translation((-3.67 + 9.45, 0, 0)))
    for i, (nombre, extra) in enumerate((("Vecinos_Cuadra", Matrix()), ("Vecinos_Izquierda", Matrix()),
                                         ("Vecinos_Derecha", Matrix()), ("Vecinos_Derecha", lote))):
        base = bpy.data.objects.get(nombre)
        if base is None:
            continue
        o = bpy.data.objects.new(f"Recorrido_Enfrente_{i}", base.data)
        o.matrix_world = extra @ giro @ base.matrix_world
        col.objects.link(o)


# ---------------------------------------------------------------- principal
def materiales_recorrido(mats):
    liso = vi["liso"]
    mats = dict(mats)
    mats["pared"] = bpy.data.materials["INT_Muro"]
    mats["cielorraso"] = liso("REC_Cielorraso", (0.82, 0.82, 0.81), 0.85)
    mats["sombra"] = liso("REC_Sanitario_Interior", (0.8, 0.8, 0.79), 0.08)
    mats["screen"] = vi["voile"]("REC_Screen")
    mats["piso_bano"] = vi["pbr"]("REC_Piso_Bano", "marmol", color_fijo=(0.2, 0.195, 0.19), rugosidad=(0.1, 0.35),
                                  normal=1.4)
    mats["porcelanato_oscuro"] = vi["pbr"]("REC_Porcelanato_Oscuro", "marmol", color_fijo=(0.2, 0.19, 0.175),
                                           rugosidad=(0.04, 0.3), normal=1.6)
    return mats


def recorridos(col_interiores, mats):
    col = coleccion("Recorrido", col_interiores)
    mats = materiales_recorrido(mats)
    tres_ambientes(col, mats)
    dos_ambientes(col, mats)
    planta_baja(col, mats)
    enfrente(col)
    # el sillón individual de Poly Haven viene en cuero negro, que apaga el ambiente: se retapiza (vestir_interior)
    for o in bpy.data.objects:
        if o.type == "MESH" and o.name.startswith("modern_arm_chair_01"):
            for i, m in enumerate(o.data.materials):
                if m and m.name.startswith("modern_arm_chair_01_pillow"):
                    o.data.materials[i] = mats["salvia_modelo"]
    for o in col.all_objects:
        if o.type != "CAMERA":
            o.hide_render = True  # sesion_ca931.py los prende para el recorrido (las luces, renders_recorrido.py)
    print(f"Recorrido: {sum(o.type == 'CAMERA' for o in col.objects)} cámaras")
