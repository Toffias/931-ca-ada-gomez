# 2º vertical (9:16, Reels): "Showroom 24 h". Un comprador a las 23:40, desde el sillón, elige la 8B y deja la
# consulta; a la desarrolladora le llega el aviso. Mismo sistema que guion_v.py, otro clima (104 BPM, Re menor).
VERT = True
SUF = '_v2b'
FPS = 30
BPM = 104
PULSO = 60 / BPM
SOLAPE = 0.4

ENCUADRES = {
    'oculta': dict(dx=0, dy=80, s=0.26, ry=0, r=56, o=0),
    'completa': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
    'tel': dict(dx=0, dy=210, s=0.70, ry=-4, r=64, o=1),
    'tel2': dict(dx=0, dy=210, s=0.70, ry=4, r=64, o=1),
    'lejos': dict(dx=0, dy=560, s=0.46, ry=0, r=64, o=1),
    'cierre': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
}

ESCENAS = [
    dict(id='gancho', toma=None, pulsos=6, encuadre='oculta', reloj=dict(de='18:00', a='23:40'),
         texto=dict(pos='centro', h=['Tu showroom', '<em>ya cerró.</em>'])),
    dict(id='noche', toma='noche', desde=0.5, vel=1.0, pulsos=6, encuadre='completa', velo='arriba', opaca=True,
         texto=dict(pos='arriba', k='23:40', h=['Tu web', '<em>sigue abierta.</em>'])),
    dict(id='planta', toma='planta', desde=0.8, vel=1.0, pulsos=7, encuadre='tel',
         foco=dict(t=2.0, x=40, y=1720, z=1.18, pan=0),
         texto=dict(pos='arriba', k='23:42', h=['Elige su depto', '<em>y ve el precio.</em>'])),
    dict(id='tour', toma='tour', desde=0.4, vel=1.3, pulsos=5, encuadre='completa', grupo='tour',
         texto=dict(pos='abajo', bajo=660, k='23:44', h=['Lo recorre', '<em>desde el sillón.</em>'])),
    dict(id='tour2', toma='tour2', desde=0.5, vel=1.3, pulsos=4, encuadre='completa', grupo='tour', texto={}),
    dict(id='consulta', toma='consulta', desde=1.55, vel=1.5, pulsos=7, encuadre='tel2',
         texto=dict(pos='arriba', k='23:46', h=['Y te deja', '<em>sus datos.</em>'])),
    dict(id='aviso', toma='consulta', desde=7.75, vel=0.25, pulsos=7, encuadre='lejos', apagar=True,
         avisos=[dict(t=0.55, app='Consultas · Torre Cityh', titulo='Nueva consulta · Unidad 8B',
                      cuerpo='Lucía Gómez quiere saber el precio y las formas de pago.'),
                 dict(t=1.45, app='Mail', titulo='Consulta de Lucía Gómez',
                      cuerpo='Tel. 11 5555 0123 · lucia@ejemplo.com')],
         texto=dict(pos='arriba', k='23:47', h=['Y la consulta', 'te llega', '<em>al instante.</em>'])),
    dict(id='cierre', toma='noche', desde=4.2, vel=0.4, pulsos=8, encuadre='cierre',
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


_esc, _ = linea_de_tiempo()
_aviso = [e for e in _esc if e['id'] == 'aviso'][0]
# Re menor: Dm9, B♭maj7, Gm9, A7sus4 — más nocturno que el La menor del primero
MUSICA = dict(intro='noche', giro='planta', fachada='tour', semilla=11,
              acordes=[[53, 57, 60, 62, 64], [53, 58, 62, 65, 69], [55, 58, 62, 65, 69], [57, 62, 64, 67, 69]],
              raiz=[50, 46, 43, 45],
              dings=[_aviso['ini'] + a['t'] for a in _aviso['avisos']])
