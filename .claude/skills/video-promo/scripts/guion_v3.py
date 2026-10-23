# 3º vertical (9:16, Reels): "Antes / Ahora" en dos mitades. Primero todo como era antes (PDF, "precio por
# privado", planos sueltos, pedir turno), dibujado en gris y apilado; después todo como es ahora, la web real
# en color en un solo celular. 100 BPM, música chill (musica_v3.py). La versión en pares quedó en guion_v3_pares.py.
VERT = True
SUF = '_v3'
FPS = 30
BPM = 100
PULSO = 60 / BPM
SOLAPE = 0.4

ENCUADRES = {
    'oculta': dict(dx=0, dy=1500, s=0.70, ry=0, r=64, o=0),
    'bajo': dict(dx=0, dy=1500, s=0.70, ry=0, r=64, o=0),     # el celular se va por abajo mientras se ve el "antes"
    'tel': dict(dx=0, dy=210, s=0.70, ry=-4, r=64, o=1),
    'tel2': dict(dx=0, dy=210, s=0.70, ry=4, r=64, o=1),
    'completa': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
    'cierre': dict(dx=0, dy=0, s=1.0, ry=0, r=0, o=1),
}

ANTES = dict(pos='arriba', k='Antes', antes=True)
AHORA = dict(pos='arriba', k='Ahora')

ESCENAS = [
    # ---- primera mitad: todo como era antes. Los mockups se apilan como problemas que se acumulan ----
    dict(id='gancho', toma=None, pulsos=4, encuadre='oculta', antes=True,
         texto=dict(pos='centro', h=['Así se vendía', '<em>un edificio.</em>'], antes=True)),
    dict(id='a_pdf', toma=None, pulsos=3, encuadre='bajo', antes='pdf', eventos=[0.5, 1.1],
         texto=dict(ANTES, h=['Un PDF de 38 MB.'])),
    dict(id='a_chat', toma=None, pulsos=3, encuadre='bajo', antes='chat', eventos=[0.35, 0.85, 1.3],
         texto=dict(ANTES, h=['Precios', '“por privado”.'])),
    dict(id='a_planos', toma=None, pulsos=3, encuadre='bajo', antes='planos', eventos=[0.3, 0.55, 0.8],
         texto=dict(ANTES, h=['Planos sueltos', 'por mail.'])),
    dict(id='a_turno', toma=None, pulsos=4, encuadre='bajo', antes='turno', eventos=[0.6, 1.1],
         texto=dict(ANTES, h=['Y para conocerlo,', 'pedí turno.'])),
    # ---- segunda mitad: todo como es ahora, la web real en un solo celular ----
    dict(id='giro', toma='giro', desde=0.2, vel=1.2, pulsos=5, encuadre='tel', eventos_toma=['click'], bisagra=True,
         texto=dict(AHORA, h=['Ahora, todo', '<em>en un solo lugar.</em>'])),
    dict(id='fachada', toma='fachada', desde=0.7, vel=1.4, pulsos=5, encuadre='tel2', eventos_toma=['filtro', 'click'],
         foco=dict(t=1.9, x=40, y=1720, z=1.18, pan=0),
         texto=dict(pos='arriba', k='Disponibilidad', h=['Precio y disponibilidad,', '<em>a la vista.</em>'])),
    dict(id='ficha', toma='ficha', desde=0.9, vel=1.2, pulsos=4, encuadre='tel', eventos_toma=['click3d'],
         texto=dict(pos='arriba', k='Planos', h=['Planos', '<em>2D y 3D.</em>'])),
    dict(id='recorrido', toma='recorrido', desde=0.4, vel=1.2, pulsos=4, encuadre='completa',
         texto=dict(pos='abajo', bajo=660, k='Recorrido 360', h=['Visitas', '<em>cuando quieran.</em>'])),
    dict(id='tresd', toma='tresd', desde=1.4, vel=2.0, pulsos=5, encuadre='tel2', eventos_toma=['colorear'],
         foco=dict(t=2.0, x=560, y=860, z=1.45),
         texto=dict(pos='arriba', k='Modo 3D', h=['Y el edificio', '<em>en 3D.</em>'])),
    dict(id='cierre', toma='giro', desde=3.4, vel=0.4, pulsos=8, encuadre='cierre',
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
