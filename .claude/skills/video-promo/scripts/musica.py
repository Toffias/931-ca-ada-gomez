# Música y efectos del video, sintetizados (sin samples, sin licencias). 96 BPM, La menor.
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile
import os
import importlib
G = importlib.import_module(os.environ.get('GUION') or ('guion_v' if os.environ.get('VERT') == '1' else 'guion'))
linea_de_tiempo, PULSO = G.linea_de_tiempo, G.PULSO
SUF = getattr(G, 'SUF', '_v' if os.environ.get('VERT') == '1' else '')
# el guion puede cambiar clima y dónde entra cada capa (ids de escena)
M = getattr(G, 'MUSICA', {})

SR = 48000
ESC, TOTAL = linea_de_tiempo()
N = int(SR * (TOTAL + 0.5))
rng = np.random.default_rng(7)


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def filtro(x, tipo, f, orden=2):
    return sosfilt(butter(orden, f, btype=tipo, fs=SR, output='sos'), x)


def env(n, a, r, sus=1.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * sus
    cola = np.clip((n / SR - t) / max(r, 1e-4), 0, 1)
    return e * cola


def saw(f, n, det=0.0):
    t = np.arange(n) / SR
    ph = (f * (1 + det)) * t + rng.random()
    return 2 * (ph % 1) - 1


def poner(pista, x, t):
    i = int(t * SR)
    if i >= len(pista):
        return
    x = x[: len(pista) - i]
    pista[i: i + len(x)] += x


mix = {k: np.zeros(N) for k in ('pad', 'bajo', 'bombo', 'hat', 'arpa', 'fx')}
COMPAS = 4 * PULSO
# Am9, Fmaj7, C(add9), G6 — voces en MIDI
ACORDES = M.get('acordes', [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 55, 60, 62, 64], [55, 59, 62, 64, 67]])
RAIZ = M.get('raiz', [45, 41, 48, 43])
rng = np.random.default_rng(M.get('semilla', 7))
fin_cierre = [e for e in ESC if e['id'] == 'cierre'][0]
T_CIERRE = fin_cierre['ini']
T_INTRO = [e for e in ESC if e['id'] == M.get('intro', 'intro')][0]['ini']
T_GIRO = [e for e in ESC if e['id'] == M.get('giro', 'giro')][0]['ini']
T_FACHADA = [e for e in ESC if e['id'] == M.get('fachada', 'fachada')][0]['ini']

# --- colchón: sierras desafinadas con filtro que se abre a lo largo del video
nc = int(COMPAS * SR) + int(1.2 * SR)
for b in range(int(TOTAL / COMPAS) + 1):
    t0 = b * COMPAS
    ac = ACORDES[b % 4] if t0 < T_CIERRE else ACORDES[0]
    v = sum(saw(hz(m), nc, d) for m in ac for d in (-0.004, 0.0, 0.0045)) / 15
    corte = 700 + 1800 * min(1, t0 / T_CIERRE)
    v = filtro(v, 'low', corte, 2) * env(nc, 0.5, 1.0)
    poner(mix['pad'], v * 0.55, t0)

# --- bajo: senoidal + un poco de armónico, desde la intro
for b in range(int(T_INTRO / COMPAS), int(T_CIERRE / COMPAS)):
    t0 = b * COMPAS
    f = hz(RAIZ[b % 4] - 12 + 12)
    for p in range(4):
        n = int(PULSO * 0.95 * SR)
        t = np.arange(n) / SR
        x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env(n, 0.01, 0.25)
        poner(mix['bajo'], x * 0.42, t0 + p * PULSO)

# --- bombo en cada pulso desde el giro; en la intro sólo en 1 y 3
def bombo():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)

k = bombo()
p = 0
while p * PULSO < T_CIERRE - 0.01:
    t = p * PULSO
    if t >= T_GIRO or (t >= T_INTRO and p % 2 == 0):
        poner(mix['bombo'], k * 0.8, t)
    p += 1

# --- hi-hat en contratiempo desde la fachada
def hat(largo=0.06):
    n = int(largo * SR)
    return filtro(rng.standard_normal(n), 'high', 7000) * np.exp(-np.arange(n) / SR * 60)

p = 0
while p * PULSO < T_CIERRE - 0.3:
    t = p * PULSO
    if t >= T_FACHADA:
        poner(mix['hat'], hat() * 0.22, t + PULSO / 2)
        poner(mix['hat'], hat(0.03) * 0.08, t + PULSO * 0.75)
    p += 1

# --- arpegio pulsado (triángulo filtrado) en corcheas, desde el giro
def pluck(f, largo=0.35):
    n = int(largo * SR); t = np.arange(n) / SR
    tri = 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    return filtro(tri, 'low', 3200) * np.exp(-t * 9)

paso = PULSO / 2
i = 0
while i * paso < T_CIERRE - 0.2:
    t = i * paso
    if t >= T_GIRO:
        b = int(t / COMPAS)
        ac = ACORDES[b % 4]
        orden = [0, 2, 4, 3, 1, 3, 4, 2]
        m = ac[orden[i % 8]] + 12
        poner(mix['arpa'], pluck(hz(m)) * 0.16, t)
    i += 1

# --- whoosh antes de cada corte (ruido con banda que sube)
def whoosh(largo=0.55):
    n = int(largo * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    trozos = 24
    for j in range(trozos):
        a, b = j * n // trozos, (j + 1) * n // trozos
        f = 400 * (12 ** (j / trozos))
        out[a:b] = filtro(x, 'band', [f * 0.7, min(f * 1.4, 20000)], 2)[a:b]
    return out * np.sin(np.pi * np.arange(n) / n) ** 2

for e in ESC[1:]:
    if e.get('grupo') and e is not [x for x in ESC if x.get('grupo') == e['grupo']][0]:
        poner(mix['fx'], whoosh(0.3) * 0.18, e['ini'] - 0.2)
    elif e['id'] != 'cierre':
        poner(mix['fx'], whoosh() * 0.32, e['ini'] - 0.4)

# --- subida antes del cierre + golpe grave sobre la marca
nr = int(2.5 * SR); tr = np.arange(nr) / SR
riser = filtro(rng.standard_normal(nr), 'band', [800, 9000]) * (tr / 2.5) ** 2.2 * 0.25
riser += np.sin(2 * np.pi * np.cumsum(220 + 660 * (tr / 2.5) ** 2) / SR) * (tr / 2.5) ** 2 * 0.06
poner(mix['fx'], riser, T_CIERRE - 2.5)
ng = int(3.5 * SR); tg = np.arange(ng) / SR
golpe = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tg * 10)) / SR) * np.exp(-tg * 1.6)
golpe += filtro(rng.standard_normal(ng), 'low', 1800) * np.exp(-tg * 5) * 0.35
poner(mix['fx'], golpe * 0.9, T_CIERRE)
# acorde final que suena abierto sobre el logo
nf = int((TOTAL - T_CIERRE + 0.5) * SR)
fin = sum(pluck(hz(m + 12), TOTAL - T_CIERRE) for m in ACORDES[0]) * 0.18
poner(mix['arpa'], fin, T_CIERRE + 0.05)

# --- avisos (notificación): dos notas de campanita
for t_ding in M.get('dings', []):
    for j, m in enumerate((88, 95)):
        n = int(1.2 * SR); tt = np.arange(n) / SR
        x = (np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(2 * np.pi * hz(m) * 2.01 * tt)) * np.exp(-tt * 5) * np.minimum(1, tt / 0.004)
        poner(mix['fx'], x * 0.22, t_ding + j * 0.11)

# --- reverb simple (ruido con decaimiento) para pad, arpa y fx
ir_n = int(2.8 * SR)
ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 2.4)
ir = filtro(ir, 'low', 6000); ir /= np.abs(ir).sum() ** 0.5 * 40
envio = mix['pad'] * 0.3 + mix['arpa'] * 0.6 + mix['fx'] * 0.35
rev = fftconvolve(envio, ir)[:N]

# pausa del ritmo durante la subida (el compás antes del cierre queda sólo con colchón)
ritmo = np.ones(N)
a, b = int((T_CIERRE - COMPAS / 2) * SR), int(T_CIERRE * SR)
ritmo[a:b] = np.linspace(1, 0.15, b - a); ritmo[b:] = 0
for k_ in ('bombo', 'hat', 'bajo'):
    mix[k_] *= ritmo

izq = der = None
m = mix['pad'] * 0.9 + mix['bajo'] + mix['bombo'] + mix['arpa'] + mix['fx'] + rev
# estéreo: arpa y hats un poco abiertos
ancho = (mix['arpa'] * 0.35 + mix['hat'])
L = m + ancho * 0.6 + mix['hat'] * 0.4
R = m + np.roll(ancho, int(0.012 * SR)) * 0.6 + np.roll(mix['hat'], int(0.007 * SR)) * 0.4
st = np.stack([L, R], 1)
# fundido de entrada y salida
t = np.arange(N) / SR
st *= np.clip(t / 0.4, 0, 1)[:, None] * np.clip((TOTAL - t) / 1.2, 0, 1)[:, None]
st = np.tanh(st / np.abs(st).max() * 1.6)
st = st / np.abs(st).max() * 0.89
wavfile.write(f'musica{SUF}.wav', SR, (st * 32767).astype(np.int16))
print(f'musica{SUF}.wav', round(N / SR, 2), 's')
