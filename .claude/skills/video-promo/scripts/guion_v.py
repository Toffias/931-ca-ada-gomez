# Guion de la versión vertical (9:16, Reels): la web en modo celular. Mismo sistema que guion.py.
# Zonas seguras de Reels: arriba ~220 px (barra) y abajo ~400 px (descripción y botones) quedan sin texto.
FPS = 30
BPM = 96
PULSO = 60 / BPM
SOLAPE = 0.4

ENCUADRES = {
    'oculta': dict(dx=0, dy=60, s=0.30, ry=0, r=56, o=0),
    'completa': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
    'tel': dict(dx=0, dy=200, s=0.72, ry=-4, r=64, o=1),
    'tel2': dict(dx=0, dy=200, s=0.72, ry=4, r=64, o=1),
    'tel3': dict(dx=0, dy=270, s=0.68, ry=0, r=64, o=1),
    'cierre': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
}

ESCENAS = [
    dict(id='gancho', toma=None, pulsos=4, encuadre='oculta',
         texto=dict(pos='centro', h=['¿Cómo se vende', 'un edificio', 'que todavía', '<em>no existe?</em>'])),
    dict(id='intro', toma='intro', desde=0.4, vel=1.0, pulsos=5, encuadre='completa',
         texto=dict(pos='arriba', k='Tu proyecto, online', h=['Mostralo antes', 'de construirlo.'])),
    dict(id='giro', toma='giro', desde=1.0, vel=1.8, pulsos=6, encuadre='tel',
         texto=dict(pos='arriba', k='Renders', h=['Renders que', '<em>enamoran.</em>'])),
    dict(id='fachada', toma='fachada', desde=0.8, vel=1.2, pulsos=5, encuadre='tel2',
         texto=dict(pos='arriba', k='Disponibilidad', h=['Disponibilidad', '<em>en vivo.</em>'])),
    dict(id='planta', toma='planta', desde=0.8, vel=1.2, pulsos=6, encuadre='tel',
         texto=dict(pos='arriba', k='Plantas', h=['Elegí el piso.', '<em>Elegí la unidad.</em>'])),
    dict(id='ficha', toma='ficha', desde=0.9, vel=1.2, pulsos=5, encuadre='tel2', sin_negros=True,
         texto=dict(pos='arriba', k='Planos', h=['Planos', '<em>2D y 3D.</em>'])),
    dict(id='recorrido', toma='recorrido', desde=0.4, vel=1.4, pulsos=4, encuadre='completa', grupo='tour',
         texto=dict(pos='abajo', k='Recorridos 360', h=['Entrá a la unidad', '<em>antes de que</em>', '<em>esté terminada.</em>'])),
    dict(id='recorrido2', toma='recorrido', desde=5.6, vel=1.6, pulsos=5, encuadre='completa', grupo='tour', texto={}),
    dict(id='tresd', toma='tresd', desde=0.5, vel=2.0, pulsos=7, encuadre='tel',
         texto=dict(pos='arriba', k='Modo 3D', h=['El edificio', '<em>en 3D.</em>'])),
    dict(id='amenities', toma='amenities', desde=1.3, vel=2.0, pulsos=2, encuadre='tel3', grupo='todo',
         texto=dict(pos='arriba', k='Y además', h=['Todo el proyecto,', '<em>en un solo lugar.</em>'], chips=['Amenities', 'Ubicación', 'Obra'])),
    dict(id='ubicacion', toma='ubicacion', desde=3.2, vel=1.0, pulsos=2, encuadre='tel3', grupo='todo', texto={}),
    dict(id='obra', toma='obra', desde=1.2, vel=1.6, pulsos=2, encuadre='tel3', grupo='todo', texto={}),
    dict(id='cierre', toma='intro', desde=0.3, vel=0.5, pulsos=8, encuadre='cierre',
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
