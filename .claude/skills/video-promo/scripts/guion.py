# Guion del video: escenas con su toma, tramo, velocidad, encuadre de la pantalla y textos.
# Las escenas caen en compases de 96 BPM (1 compás = 2.5 s) para que los cortes vayan con la música.
FPS = 30
BPM = 96
PULSO = 60 / BPM  # 0.625 s
SOLAPE = 0.4       # segundos extra a cada lado para los fundidos

# encuadres de la pantalla: dx (px desde el centro), dy, escala, giro Y (grados), radio de borde
ENCUADRES = {
    'oculta': dict(dx=0, dy=40, s=0.30, ry=0, r=26, o=0),
    'completa': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
    'der': dict(dx=262, dy=0, s=0.635, ry=-7, r=22, o=1),
    'izq': dict(dx=-262, dy=0, s=0.635, ry=7, r=22, o=1),
    'cierre': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
}

# (toma, desde s, velocidad, pulsos, encuadre, textos)
ESCENAS = [
    dict(id='gancho', toma=None, pulsos=4, encuadre='oculta',
         texto=dict(pos='centro', h=['¿Cómo se vende', 'un edificio que', '<em>todavía no existe?</em>'])),
    dict(id='intro', toma='intro', desde=1.25, vel=1.0, pulsos=6, encuadre='completa',
         texto=dict(pos='abajo', k='Tu proyecto, online', h=['Mostralo antes', 'de construirlo.'])),
    dict(id='giro', toma='giro', desde=1.95, vel=1.5, pulsos=7, encuadre='der',
         texto=dict(pos='izq', k='Renders', h=['Renders que', '<em>enamoran.</em>'], sub='De día, de noche y desde todos los ángulos.')),
    dict(id='fachada', toma='fachada', desde=1.3, vel=1.4, pulsos=9, encuadre='izq', foco=dict(t=3.25, x=992, y=640, z=1.85),
         texto=dict(pos='der', k='Disponibilidad', h=['Disponibilidad', '<em>en vivo.</em>'], sub='Tocá una unidad y mirá su estado y su precio.')),
    dict(id='planta', toma='planta', desde=1.2, vel=1.4, pulsos=9, encuadre='der', foco=dict(t=3.25, x=910, y=680, z=1.85),
         texto=dict(pos='izq', k='Plantas', h=['Elegí el piso.', '<em>Elegí la unidad.</em>'], sub='De la planta a la ficha de la unidad en un clic.')),
    dict(id='ficha', toma='ficha', desde=1.4, vel=1.25, pulsos=6, encuadre='izq', sin_negros=True,
         texto=dict(pos='der', k='Planos', h=['Planos', '<em>2D y 3D.</em>'], sub='Metros, ambientes y orientación de cada unidad.')),
    dict(id='recorrido', toma='recorrido', desde=0.4, vel=1.75, pulsos=5, encuadre='completa', grupo='tour',
         texto=dict(pos='abajo', k='Recorridos 360', h=['Entrá a la unidad', '<em>antes de que esté terminada.</em>'])),
    dict(id='recorrido2', toma='recorrido', desde=7.0, vel=1.9, pulsos=6, encuadre='completa', grupo='tour', texto={}),
    dict(id='recorrido3', toma='recorrido', desde=15.6, vel=1.1, pulsos=5, encuadre='completa', grupo='tour', texto={}),
    dict(id='tresd', toma='tresd', desde=1.2, vel=2.0, pulsos=9, encuadre='der',
         texto=dict(pos='izq', k='Modo 3D', h=['El edificio', '<em>en 3D.</em>'], sub='Coloreado por disponibilidad y con vistas de cámara.')),
    dict(id='amenities', toma='amenities', desde=1.8, vel=2.0, pulsos=2, encuadre='completa', grupo='todo',
         texto=dict(pos='abajo', k='Y además', h=['Todo el proyecto,', '<em>en un solo lugar.</em>'], chips=['Amenities', 'Ubicación', 'Avance de obra'], chip=0)),
    dict(id='ubicacion', toma='ubicacion', desde=4.3, vel=1.0, pulsos=2, encuadre='completa', grupo='todo',
         texto=dict(chip=1)),
    dict(id='obra', toma='obra', desde=2.4, vel=1.6, pulsos=2, encuadre='completa', grupo='todo',
         texto=dict(chip=2)),
    dict(id='cierre', toma='intro', desde=0.6, vel=0.5, pulsos=9, encuadre='cierre',
         texto=dict(pos='cierre')),
]


def linea_de_tiempo():
    t = 0.0
    for e in ESCENAS:
        e['ini'] = round(t, 4)
        e['dur'] = e['pulsos'] * PULSO
        t += e['dur']
        e['fin'] = round(t, 4)
    return ESCENAS, t
