"""
Interiores de Cañada de Gómez 931 para los renders de plantas (docs/renders-plantas.md), calcados de los planos del
cliente (docs/referencias/plano-planta-baja.jpg y plano-pisos-1-a-4.jpg, opción 2): muros con espesor y vanos de
puerta, solados por ambiente, muebles low-poly, escalera y pasadizo del ascensor.

No se corre solo: lo ejecuta modelar_ca931.py (comparte Malla, material, MATERIALES y las medidas). Va en la
colección "Interiores", fuera de WEB (no se exporta al .glb). El piso tipo es una malla por capa y los pisos 1–4 son
duplicados vinculados, cada uno con la propiedad piso = N.

Coordenadas de plano: d = metros desde la línea municipal hacia el fondo (Y de Blender), a = metros desde la
medianera izquierda vista desde la calle (X = X0 + a). Las cotas salen del plano; lo que no está acotado (muebles,
vanos) se midió sobre el dibujo a ~46 px/m.
"""

MATERIALES.update({
    "INT_Muro": dict(color=(0.86, 0.85, 0.82), rug=0.9),
    "WEB_Corte": dict(color=(0.22, 0.22, 0.23), rug=0.9),       # cara cortada de los muros (planta de arquitectura)
    "INT_Madera": dict(color=(0.52, 0.36, 0.22), rug=0.6),
    "INT_Ceramica": dict(color=(0.78, 0.77, 0.74), rug=0.4),
    "INT_Comun": dict(color=(0.55, 0.55, 0.53), rug=0.5),       # palier, hall y escalera
    "INT_Mueble": dict(color=(0.93, 0.92, 0.89), rug=0.6),
    "INT_Madera_Mueble": dict(color=(0.38, 0.25, 0.15), rug=0.55),
    "INT_Tela": dict(color=(0.42, 0.44, 0.47), rug=0.95),
    "INT_Cama": dict(color=(0.94, 0.93, 0.91), rug=0.95),
    "INT_Mesada": dict(color=(0.12, 0.12, 0.12), rug=0.3),
    "INT_Sanitario": dict(color=(0.96, 0.96, 0.96), rug=0.2),
    "INT_Ducha": dict(color=(0.62, 0.63, 0.63), rug=0.3),
    "INT_Pozo": dict(color=(0.05, 0.05, 0.05), rug=0.9),
})

E = 0.12  # espesor de tabiques interiores

# ---------------------------------------------------------------- piso tipo (pisos 1 a 4)
MUROS_TIPO = [
    # pasadizo del ascensor (1,65 × 1,65) y su frente, que es el fondo de la cocina del 3 ambientes
    (3.00, 3.15, 3.05, 5.28), (3.15, 4.80, 3.05, 3.20), (3.15, 4.80, 5.13, 5.28),
    (4.65, 4.80, 3.20, 3.80), (4.65, 4.80, 4.70, 5.13),
    # medianera entre A y B adelante, con la puerta de B desde el palier
    (0.42, 3.00, 5.28, 5.43), (4.80, 5.40, 5.28, 5.43), (6.30, 6.90, 5.28, 5.43),
    # estar de A / palier, con la puerta de A
    (4.80, 5.50, 3.05, 3.20), (6.40, 6.90, 3.05, 3.20),
    # fondo del palier y medianera A|B de atrás (cocina, baño y dormitorio de B)
    (6.75, 6.90, 5.28, 5.73), (6.90, 15.50, 5.58, 5.73),
    # escalera: lateral hacia el pasillo de A y fondo (frente del dormitorio 2 de A)
    (7.90, 11.30, 3.05, 3.20), (11.10, 11.25, 3.20, 5.58),
    # dormitorio 2 de A: puerta desde el pasillo; muro con el principal
    (12.20, 15.50, 3.05, 3.20),
    # A: estar / baños; pasillo con puertas a los dos baños; divisiones de baños y vestidor
    (6.80, 6.90, 0.15, 2.10),
    (6.90, 7.60, 2.00, 2.10), (8.40, 9.60, 2.00, 2.10), (10.40, 12.30, 2.00, 2.10),
    (8.80, 8.90, 0.15, 2.00), (10.85, 10.95, 0.15, 2.00),
    (12.30, 12.40, 0.15, 2.15),
    # B: cocina / pasillo; baño con puerta al pasillo; baño / dormitorio
    (9.25, 9.35, 6.60, 8.51), (9.35, 10.10, 6.60, 6.70), (10.90, 11.65, 6.60, 6.70), (11.65, 11.75, 6.60, 8.51),
]

SOLADOS_TIPO = [
    ("INT_Madera", 0.42, 6.80, 0.15, 3.05),      # estar comedor A
    ("INT_Ceramica", 0.42, 3.00, 3.05, 5.28),    # cocina A
    ("INT_Madera", 6.90, 12.30, 2.10, 3.05),     # pasillo A
    ("INT_Ceramica", 6.90, 8.80, 0.15, 2.00),    # baño 1 A
    ("INT_Ceramica", 8.90, 10.85, 0.15, 2.00),   # baño 2 A
    ("INT_Madera", 10.95, 12.30, 0.15, 2.00),    # vestidor A
    ("INT_Madera", 12.40, 15.50, 0.15, 3.05),    # dormitorio principal A
    ("INT_Madera", 11.25, 15.50, 3.20, 5.58),    # dormitorio 2 A
    ("INT_Comun", 4.80, 7.90, 3.20, 5.28),       # palier
    ("INT_Comun", 7.90, 11.10, 3.20, 5.58),      # escalera
    ("INT_Pozo", 3.15, 4.65, 3.20, 5.13),        # pasadizo del ascensor
    ("INT_Madera", 0.42, 6.90, 5.43, 8.51),      # estar comedor B
    ("INT_Ceramica", 6.90, 9.25, 5.73, 8.51),    # cocina B
    ("INT_Madera", 9.35, 11.65, 5.73, 6.60),     # pasillo B
    ("INT_Ceramica", 9.35, 11.65, 6.70, 8.51),   # baño B
    ("INT_Madera", 11.75, 15.50, 5.73, 8.51),    # dormitorio B
]


def muebles_tipo(m, s):
    """m: fijos (mesadas, baños, placards, escalera); s: sueltos, que vestir_ca931.py reemplaza por los de detalle"""
    # A: comedor para 6, estar mirando al rack, cocina con isla y desayunador
    mesa(s, 1.0, 2.6, 0.7, 1.6)
    estar(s, sofa=(4.5, 6.3, 0.25, 1.05), respaldo="a0", mesita=(4.9, 5.9, 1.45, 2.0), rack=None)
    caja(m, "INT_Mueble", 4.8, 6.2, 2.88, 3.03, 0, 0.5)                       # rack
    mesada(m, 0.5, 2.7, 2.55, 3.15, banquetas="a0", sueltos=s)
    mesada(m, 0.5, 2.9, 4.68, 5.26, anafe=True)
    bano(m, 6.9, 8.8, 0.15, 2.0, ducha="d0")
    bano(m, 8.9, 10.85, 0.15, 2.0, ducha="d1")
    caja(m, "INT_Madera_Mueble", 11.0, 12.25, 0.15, 0.75, 0, 2.0)           # placard del vestidor
    cama(s, 13.4, 15.45, 0.6, 2.2)                                         # principal, cabecera al contrafrente
    cama(s, 13.5, 15.45, 3.45, 4.45, mesitas=False)
    caja(m, "INT_Madera_Mueble", 11.4, 13.2, 5.0, 5.56, 0, 2.0)            # placard del dormitorio 2
    # B: estar, comedor, cocina con península y desayunador
    estar(s, sofa=(0.8, 2.6, 7.65, 8.45), respaldo="a1", mesita=(1.2, 2.2, 6.9, 7.4), rack=None)
    caja(m, "INT_Mueble", 0.9, 2.5, 5.45, 5.6, 0, 0.5)                        # rack
    mesa(s, 3.5, 5.1, 6.5, 7.4)
    mesada(m, 6.95, 9.2, 7.93, 8.5, anafe=True)
    mesada(m, 7.2, 7.8, 5.9, 7.4, banquetas="d0", sueltos=s)
    bano(m, 9.35, 11.65, 6.7, 8.51, ducha="d0")
    cama(s, 13.3, 15.45, 6.4, 8.0)
    caja(m, "INT_Madera_Mueble", 11.8, 12.4, 6.6, 8.5, 0, 2.0)
    escalera(m, 7.95, 11.05, 3.25, 5.53, ALTO_PISO)


# ---------------------------------------------------------------- planta baja
MUROS_PB = [
    # dormitorios al frente (detrás de los listones negros) y su frente de placards
    (0.60, 3.92, 2.47, 2.57), (3.92, 4.02, 0.15, 1.70), (3.92, 4.02, 2.57, 3.30), (3.92, 4.02, 4.10, 5.31),
    (0.60, 4.40, 5.31, 5.43),
    # pasadizo del ascensor
    (2.75, 2.85, 3.30, 5.15), (4.30, 4.40, 3.30, 4.20), (2.85, 4.30, 3.30, 3.40), (2.85, 4.30, 5.05, 5.15),
    # baño 1, con puerta al pasillo interno
    (4.52, 4.62, 0.15, 2.00), (7.35, 7.45, 0.15, 2.00), (4.62, 5.20, 2.00, 2.10), (6.00, 7.35, 2.00, 2.10),
    # pasillo interno de la unidad / hall de acceso y núcleo
    (4.40, 11.40, 3.30, 3.40),
    # portería, toilette y fondo del hall
    (6.50, 6.60, 3.40, 5.00), (6.50, 6.60, 5.80, 8.51), (7.60, 7.70, 3.40, 8.51),
    (7.70, 8.70, 5.90, 6.00), (8.70, 8.80, 5.90, 8.51),
    # escalera y tanque de bombeo
    (8.00, 8.10, 3.40, 5.40), (8.10, 11.30, 5.40, 5.50), (11.30, 11.40, 3.40, 5.50),
    # dormitorio 3 (puerta desde la cocina) y su baño
    (11.40, 11.50, 5.50, 8.51), (11.50, 12.30, 5.40, 5.50), (13.10, 15.50, 5.40, 5.50),
    (8.80, 11.40, 5.90, 6.00),
]

SOLADOS_PB = [
    ("INT_Madera", 0.60, 3.92, 0.15, 2.47),      # dormitorio 1
    ("INT_Madera", 0.60, 3.92, 2.57, 5.31),      # dormitorio 2
    ("INT_Madera", 3.92, 7.45, 2.10, 3.30),      # pasillo interno
    ("INT_Madera", 4.02, 4.52, 0.15, 2.10),
    ("INT_Ceramica", 4.62, 7.35, 0.15, 2.00),    # baño 1
    ("INT_Madera", 7.45, 15.50, 0.15, 3.30),     # estar comedor
    ("INT_Madera", 11.40, 12.30, 3.30, 5.40),
    ("INT_Ceramica", 12.30, 15.50, 3.30, 5.40),  # cocina
    ("INT_Madera", 11.50, 15.50, 5.50, 8.51),    # dormitorio 3
    ("INT_Ceramica", 8.80, 11.40, 6.00, 8.51),   # baño 2
    ("INT_Comun", 0.60, 6.50, 5.43, 8.51),       # hall de acceso
    ("INT_Comun", 4.40, 6.50, 3.40, 5.43),
    ("INT_Comun", 6.60, 7.60, 3.40, 8.51),       # portería
    ("INT_Ceramica", 7.70, 8.70, 6.00, 8.51),    # toilette
    ("INT_Comun", 8.10, 11.30, 3.40, 5.40),      # escalera y bombeo
    ("INT_Pozo", 2.85, 4.30, 3.40, 5.05),        # pasadizo del ascensor
]


def muebles_pb(m, s):
    cama(s, 0.65, 2.65, 0.45, 2.05, cabecera="d0")
    cama(s, 0.65, 2.55, 3.4, 4.4, cabecera="d0", mesitas=False)
    bano(m, 4.62, 7.35, 0.15, 2.0, ducha="d0")
    estar(s, sofa=(8.3, 10.1, 0.25, 1.05), respaldo="a0", mesita=(8.7, 9.7, 1.45, 2.0), rack=None)
    caja(s, "INT_Tela", 7.6, 8.25, 1.6, 2.3, 0, 0.42)                       # sillones
    caja(s, "INT_Tela", 10.15, 10.8, 1.6, 2.3, 0, 0.42)
    mesa(s, 12.6, 14.6, 0.8, 1.8)
    mesada(m, 12.6, 15.2, 2.15, 2.75, banquetas="a0", sueltos=s)
    mesada(m, 12.6, 15.3, 4.75, 5.35, anafe=True)
    cama(s, 12.9, 15.4, 6.0, 7.9)
    bano(m, 8.8, 11.4, 6.0, 8.51, ducha="d1")
    bano(m, 7.7, 8.7, 6.0, 8.51, ducha=None)                                # toilette de portería
    caja(m, "INT_Mueble", 6.7, 7.4, 6.5, 8.3, 0, 0.75)                      # mostrador de portería
    caja(m, "INT_Ducha", 2.4, 6.2, 8.1, 8.5, 0, 2.0)                        # nicho de los 9 medidores
    caja(m, "INT_Ducha", 0.6, 2.3, 7.95, 8.5, 0, 1.8)                       # medidores de gas
    for a in (3.95, 4.85):                                                  # tanque de bombeo
        m.cilindro("INT_Mueble", X0 + a, 10.75, 0, 1.6, 0.38, 16)
    escalera(m, 8.15, 10.0, 3.45, 5.35, ALTO_PB, un_tramo=True)


# ---------------------------------------------------------------- piezas
def caja(m, mat, d0, d1, a0, a1, h0, h1):
    m.caja(mat, (X0 + a0, X0 + a1), (d0, d1), (h0, h1))


def mesa(m, d0, d1, a0, a1):
    caja(m, "INT_Madera_Mueble", d0, d1, a0, a1, 0.72, 0.76)
    for d in (d0 + 0.1, d1 - 0.15):
        for a in (a0 + 0.1, a1 - 0.15):
            caja(m, "INT_Madera_Mueble", d, d + 0.05, a, a + 0.05, 0, 0.72)
    largo = d1 - d0
    for i in range(3):
        d = d0 + largo * (i + 0.5) / 3 - 0.21
        for a, ar in ((a0 - 0.5, a0 - 0.5), (a1 + 0.08, a1 + 0.38)):
            caja(m, "INT_Mueble", d, d + 0.42, a, a + 0.42, 0.42, 0.47)
            caja(m, "INT_Mueble", d, d + 0.42, ar, ar + 0.04, 0.47, 0.85)


def estar(m, sofa, respaldo, mesita, rack):
    d0, d1, a0, a1 = sofa
    caja(m, "INT_Tela", d0, d1, a0, a1, 0, 0.42)
    if respaldo == "a0":
        caja(m, "INT_Tela", d0, d1, a0, a0 + 0.2, 0.42, 0.8)
    else:
        caja(m, "INT_Tela", d0, d1, a1 - 0.2, a1, 0.42, 0.8)
    caja(m, "INT_Madera_Mueble", *mesita, 0, 0.4)
    if rack:
        caja(m, "INT_Mueble", *rack, 0, 0.5)


def mesada(m, d0, d1, a0, a1, banquetas=None, anafe=False, sueltos=None):
    caja(m, "INT_Mueble", d0, d1, a0, a1, 0, 0.86)
    caja(m, "INT_Mesada", d0, d1, a0, a1, 0.86, 0.9)
    if anafe:
        dm = (d0 + d1) / 2
        caja(m, "INT_Pozo", dm - 0.3, dm + 0.3, a0 + 0.05, a1 - 0.05, 0.9, 0.905)
    if banquetas:
        largo = d1 - d0
        for i in range(3):
            if banquetas == "a0":
                d, a = d0 + largo * (i + 0.5) / 3, a0 - 0.3
            else:
                d, a = d0 - 0.3, a0 + (a1 - a0) * (i + 0.5) / 3
            (sueltos or m).cilindro("INT_Madera_Mueble", X0 + a, d, 0, 0.65, 0.17, 10)


def cama(m, d0, d1, a0, a1, cabecera="d1", mesitas=True):
    caja(m, "INT_Cama", d0, d1, a0, a1, 0.15, 0.52)
    caja(m, "INT_Madera_Mueble", d0, d1, a0, a1, 0, 0.15)
    hd = (d1 - 0.08, d1) if cabecera == "d1" else (d0, d0 + 0.08)
    caja(m, "INT_Madera_Mueble", *hd, a0 - 0.05, a1 + 0.05, 0, 1.1)
    almohada = (d1 - 0.55, d1 - 0.15) if cabecera == "d1" else (d0 + 0.15, d0 + 0.55)
    caja(m, "INT_Mueble", *almohada, a0 + 0.12, a1 - 0.12, 0.52, 0.62)
    if mesitas:
        md = (d1 - 0.45, d1) if cabecera == "d1" else (d0, d0 + 0.45)
        caja(m, "INT_Madera_Mueble", *md, a0 - 0.5, a0 - 0.05, 0, 0.5)
        caja(m, "INT_Madera_Mueble", *md, a1 + 0.05, a1 + 0.5, 0, 0.5)


def bano(m, d0, d1, a0, a1, ducha="d0"):
    """vanitory contra el pasillo, inodoro y ducha en un extremo"""
    am = a0 + 0.15
    caja(m, "INT_Mueble", d0 + 0.1, d0 + 0.7, am, am + 0.5, 0, 0.85)           # vanitory
    caja(m, "INT_Sanitario", d0 + 0.2, d0 + 0.6, am + 0.05, am + 0.4, 0.85, 0.9)
    dw = (d0 + d1) / 2
    caja(m, "INT_Sanitario", dw - 0.2, dw + 0.2, a0 + 0.05, a0 + 0.25, 0, 0.75)  # mochila
    caja(m, "INT_Sanitario", dw - 0.18, dw + 0.18, a0 + 0.25, a0 + 0.7, 0, 0.4)  # inodoro
    if ducha:
        d = (d0, d0 + 0.9) if ducha == "d0" else (d1 - 0.9, d1)
        if ducha == "d0":
            caja(m, "INT_Mueble", d0 + 0.1, d0 + 0.7, a1 - 0.6, a1 - 0.1, 0, 0.85)
        caja(m, "INT_Ducha", *d, a1 - 1.0, a1, 0, 0.04)


def escalera(m, d0, d1, a0, a1, alto, un_tramo=False):
    """dos tramos con descanso al fondo (o uno solo en planta baja), de huellas macizas"""
    descanso = d1 - (a1 - a0) / 2
    n = 9
    sube = alto / 2 / n
    medio = (a0 + a1) / 2
    for i in range(n):
        dd = d0 + (descanso - d0) * i / n
        caja(m, "INT_Comun", dd, descanso, a0, medio - 0.05, 0, sube * (i + 1))
    caja(m, "INT_Comun", descanso, d1, a0, a1, 0, alto / 2)
    if un_tramo:
        return
    for i in range(n):
        dd = descanso - (descanso - d0) * (i + 1) / n
        caja(m, "INT_Comun", dd, descanso, medio + 0.05, a1, 0, alto / 2 + sube * (i + 1))
    caja(m, "INT_Mesada", d0, descanso, medio - 0.05, medio + 0.05, alto / 2, alto / 2 + 0.9)  # baranda


# ---------------------------------------------------------------- armado
def capas(muros, solados, muebles, alto_muro):
    """(muros, solados, muebles fijos, muebles sueltos) del nivel, con el piso terminado en z = 0"""
    mm = Malla()
    for d0, d1, a0, a1 in muros:
        caja(mm, "INT_Muro", d0, d1, a0, a1, 0, alto_muro)
    ms = Malla()
    for mat, d0, d1, a0, a1 in solados:
        caja(ms, mat, d0, d1, a0, a1, 0, 0.02)
    mb, su = Malla(), Malla()
    muebles(mb, su)
    return mm, ms, mb, su


def nivel(col, nombre, mallas, z, n, compartidas=None):
    objetos = []
    for i, capa in enumerate(("Muros", "Solados", "Muebles", "Sueltos")):
        if compartidas:
            o = bpy.data.objects.new(f"Interior_{nombre}_{capa}", compartidas[capa])
            col.objects.link(o)
        else:
            o = mallas[i].objeto(f"Interior_{nombre}_{capa}", col)
        o.location.z = z
        o["piso"] = n
        objetos.append(o)
    return objetos


def interiores(col):
    material("WEB_Corte")  # lo busca renders_plantas.py por nombre para la cara cortada
    # planta baja: piso terminado en 0; los muros llegan hasta la losa del piso 1
    nivel(col, "PB", capas(MUROS_PB, SOLADOS_PB, muebles_pb, ALTO_PB - LOSA), 0.0, 0)
    # piso tipo: una malla por capa, compartida por los cuatro pisos (duplicados vinculados)
    base = nivel(col, "01", capas(MUROS_TIPO, SOLADOS_TIPO, muebles_tipo, ALTO_PISO - 2 * LOSA),
                 ALTO_PB + LOSA, 1)
    compartidas = {o.name.rsplit("_", 1)[1]: o.data for o in base}
    for n in range(2, PISOS + 1):
        nivel(col, f"0{n}", None, ALTO_PB + (n - 1) * ALTO_PISO + LOSA, n, compartidas)
