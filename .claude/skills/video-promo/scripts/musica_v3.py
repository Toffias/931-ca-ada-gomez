# Música del 3º vertical ("Antes / Ahora" en dos mitades): chill acústico, distinto a musica.py (sintes)
# y a musica_noche.py (lo-fi con Rhodes y vinilo). Guitarra criolla punteada (Karplus-Strong), kalimba,
# colchón cálido de senoidales; percusión suave (aro, shaker, bombo apagado) sólo en el "ahora".
# Antes: Si menor, guitarra sola y apagada. Bisagra: se abre el filtro y entra el ritmo. Ahora: Re mayor.
# La versión en pares (espera telefónica + house) quedó en musica_v3_pares.py.
# Uso: GUION=guion_v3 python musica_v3.py   → musica_v3.wav
import importlib, json, os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve, lfilter
from scipy.io import wavfile

G = importlib.import_module(os.environ.get('GUION', 'guion_v3'))
ESC, TOTAL = G.linea_de_tiempo()
PULSO, SUF = G.PULSO, G.SUF
SR = 48000
N = int(SR * (TOTAL + 0.6))
rng = np.random.default_rng(5)
COMPAS = 4 * PULSO
T_BISAGRA = [e for e in ESC if e.get('bisagra')][0]['ini']
T_CIERRE = [e for e in ESC if e['id'] == 'cierre'][0]['ini']


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def filtro(x, tipo, f, orden=2):
    return sosfilt(butter(orden, f, btype=tipo, fs=SR, output='sos'), x)


def poner(pista, x, t, g=1.0):
    i = int(t * SR)
    if i < 0 or i >= len(pista):
        return
    x = x[: len(pista) - i]
    pista[i: i + len(x)] += x * g


def cuerda(f, largo=2.0, brillo=0.5, caida=0.996):
    """guitarra de nylon: Karplus-Strong como filtro IIR (ruido filtrado que recircula por un retardo)"""
    n = int(largo * SR); L = max(2, int(round(SR / f)))
    ex = np.zeros(n); ex[:L] = filtro(rng.uniform(-1, 1, L), 'low', 1200 + 5000 * brillo)
    a = np.zeros(L + 2); a[0] = 1; a[L] = -caida / 2; a[L + 1] = -caida / 2
    y = lfilter([1], a, ex)
    y = filtro(y, 'low', 2600 + 3000 * brillo)  # cuerpo de madera, sin chicharra
    return y * np.clip((largo - np.arange(n) / SR) / 0.2, 0, 1)


def kalimba(f, largo=1.6):
    n = int(largo * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2)
    x += 0.35 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 18)  # parcial metálico inarmónico
    x += 0.2 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 9)
    return x * np.minimum(1, t / 0.002)


pista = {k: np.zeros(N) for k in ('guitarra', 'kalimba', 'colchon', 'bajo', 'bombo', 'aro', 'shaker', 'fx')}

# ---------- armonía ----------
# antes (Si menor, pensativo): Bm9 – Gmaj7 | ahora (Re mayor, abierto): Dmaj9 – Bm7 – Gmaj9 – A6
ANTES = [[47, 54, 57, 61, 62], [43, 50, 54, 57, 59]]
AHORA = [[50, 57, 61, 64, 66], [47, 54, 57, 61, 62], [43, 50, 54, 57, 59], [45, 52, 54, 57, 61]]
B0 = round(T_BISAGRA / COMPAS)

t0 = 0.0; b = 0
while t0 < T_CIERRE - 0.01:
    # los compases del "ahora" se cuentan desde la bisagra (que no cae justo en un compás)
    ahora = t0 >= T_BISAGRA - 0.01
    ac = AHORA[b % 4] if ahora else ANTES[b % 2]
    largo_c = min(COMPAS, (T_BISAGRA if not ahora else T_CIERRE) - t0)
    # colchón: senoidales con ataque lento (nada de sierras)
    nc = int((largo_c + 1.2) * SR); tc = np.arange(nc) / SR
    x = sum(np.sin(2 * np.pi * hz(m + 12) * tc + j) for j, m in enumerate(ac[1:])) / 4
    x *= np.minimum(1, tc / 0.8) * np.clip((largo_c + 1.2 - tc) / 1.2, 0, 1)
    poner(pista['colchon'], x, t0, 0.13 if ahora else 0.09)
    if not ahora:
        # guitarra sola, arpegio lento en corcheas: bajo y notas que suben y bajan
        orden = [0, 2, 3, 4, 3, 2, 1, 2]
        for k, o in enumerate(orden):
            if k * PULSO / 2 < largo_c - 0.05:
                poner(pista['guitarra'], cuerda(hz(ac[o] + (0 if o == 0 else 12)), 1.8, 0.25), t0 + k * PULSO / 2, 0.32 if k else 0.4)
    else:
        # bossa: pulgar en 1 y 3 (bajo), acorde rasgueado suave en contratiempos
        for off in (0, 2):
            poner(pista['guitarra'], cuerda(hz(ac[0]), 1.4, 0.3), t0 + off * PULSO, 0.45)
        for off in (0.5, 1.5, 2.5, 3.0, 3.5):
            for j, m in enumerate(ac[1:]):
                poner(pista['guitarra'], cuerda(hz(m + 12), 0.9, 0.45, 0.994), t0 + off * PULSO + j * 0.008, 0.2)
        # bajo redondo
        for off, m, largo in ((0, ac[0] - 12, 1.6), (2.5, ac[0] - 5, 0.9), (3.5, ac[0], 0.45)):
            n = int(largo * PULSO * SR); t = np.arange(n) / SR
            x = np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t / 0.012) * np.exp(-t * 1.6) * np.clip((n / SR - t) / 0.05, 0, 1)
            poner(pista['bajo'], x, t0 + off * PULSO, 0.5)
    t0 += largo_c; b = b + 1 if not (not ahora and t0 >= T_BISAGRA - 0.01) else 0

# kalimba: melodía propia, en el "ahora" (una frase por compás, respira)
FRASES = [[74, 76, 78, None, 81, None, 78, 76], [73, None, 74, 76, None, 73, 71, None],
          [71, 74, 76, None, 78, 76, None, 74], [76, None, 73, None, 69, 71, 73, None]]
t0 = T_BISAGRA + COMPAS; b = 1  # el primer compás del "ahora" sólo abre; la kalimba entra en el segundo
while t0 < T_CIERRE - 0.01:
    for k, m in enumerate(FRASES[b % 4]):
        if m and t0 + k * PULSO / 2 < T_CIERRE - 0.1:
            poner(pista['kalimba'], kalimba(hz(m)), t0 + k * PULSO / 2, 0.16)
    t0 += COMPAS; b += 1
# en el "antes" la kalimba aparece sólo al final de cada mockup, sola, como una pregunta
for e in ESC:
    if e.get('antes') and e['id'] != 'gancho':
        poner(pista['kalimba'], kalimba(hz(78)), e['fin'] - PULSO, 0.08)
        poner(pista['kalimba'], kalimba(hz(74)), e['fin'] - PULSO / 2, 0.07)

# ---------- percusión suave, sólo en el "ahora" ----------
def bombo():
    n = int(0.3 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(46 + 40 * np.exp(-t * 30)) / SR) * np.exp(-t * 11)


def aro():  # golpe de aro con la baqueta acostada
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1700 * t) * 0.5 + filtro(rng.standard_normal(n), 'band', [1500, 5000])) * np.exp(-t * 55)


def shaker(v):
    n = int(0.07 * SR); t = np.arange(n) / SR
    return filtro(rng.standard_normal(n), 'band', [5000, 11000]) * np.sin(np.pi * t / 0.07) ** 2 * v


golpes = []
p = 0
while T_BISAGRA + p * PULSO < T_CIERRE - PULSO * 0.5:
    t = T_BISAGRA + p * PULSO; en = p % 4
    if p >= 4:  # el ritmo entra en el segundo compás del "ahora"
        if en in (0, 2):
            poner(pista['bombo'], bombo(), t, 0.55); golpes.append(t)
        if en == 3 or (en == 1 and p % 8 == 5):
            poner(pista['aro'], aro(), t + (PULSO * 0.5 if en == 1 else 0), 0.22)
    for s, v in ((0, 0.5), (0.25, 0.25), (0.5, 0.8), (0.75, 0.3)):
        poner(pista['shaker'], shaker(v), t + s * PULSO, 0.09)
    p += 1
duck = np.ones(N)
for tb in golpes:
    i = int(tb * SR); n = min(int(0.25 * SR), N - i)
    duck[i:i + n] = np.minimum(duck[i:i + n], 1 - 0.25 * np.exp(-np.arange(n) / SR * 12))
pista['bajo'] *= duck; pista['colchon'] *= duck

# ---------- efectos ----------
def papel():  # cada mockup que cae sobre la pila
    n = int(0.22 * SR); t = np.arange(n) / SR
    return filtro(rng.standard_normal(n), 'band', [250, 3000]) * np.exp(-t * 28) * 0.7 + np.sin(2 * np.pi * 95 * t) * np.exp(-t * 30) * 0.5


def toque():
    n = int(0.08 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 900 * t) * np.exp(-t * 80) * 0.5 + filtro(rng.standard_normal(n), 'band', [2500, 6000]) * np.exp(-t * 220) * 0.3


for e in ESC:
    if e.get('antes') and e['id'] != 'gancho':
        poner(pista['fx'], papel(), e['ini'] + 0.3, 0.35)
    if e.get('antes') == 'chat':
        for x in e['eventos']:
            n = int(0.1 * SR); tt = np.arange(n) / SR
            poner(pista['fx'], np.sin(2 * np.pi * np.cumsum(700 + 500 * np.exp(-tt * 50)) / SR) * np.exp(-tt * 45), e['ini'] + x, 0.18)
    if e.get('toma') and e.get('eventos_toma'):
        marcas = json.load(open(f"clips{SUF}/{e['toma']}.json"))
        for m in e['eventos_toma']:
            poner(pista['fx'], toque(), e['ini'] + (marcas[m] - e['desde']) / e['vel'], 0.3)

# bisagra: la pila cae (soplido que baja) y la guitarra "se abre" con un rasgueo largo de Dmaj9
n = int(1.0 * SR); tt = np.arange(n) / SR
poner(pista['fx'], filtro(rng.standard_normal(n), 'band', [300, 2500]) * np.sin(np.pi * tt / 1.0) ** 2 * 0.25, T_BISAGRA - 0.6)
for j, m in enumerate([38, 50, 57, 61, 64, 66, 69]):
    poner(pista['guitarra'], cuerda(hz(m), 3.0, 0.55, 0.998), T_BISAGRA + j * 0.03, 0.3)

# cierre: el ritmo se va; rasgueo final, kalimba que sube y queda sonando
for j, m in enumerate([38, 50, 57, 61, 64, 66, 69]):
    poner(pista['guitarra'], cuerda(hz(m), TOTAL - T_CIERRE + 0.5, 0.5, 0.9985), T_CIERRE + j * 0.035, 0.34)
for j, m in enumerate([74, 78, 81, 85, 86]):
    poner(pista['kalimba'], kalimba(hz(m), 2.5), T_CIERRE + 0.8 + j * PULSO / 2, 0.14)
nc = int((TOTAL - T_CIERRE + 0.5) * SR); tc = np.arange(nc) / SR
x = sum(np.sin(2 * np.pi * hz(m) * tc + j) for j, m in enumerate([62, 66, 69, 73, 76])) / 5
poner(pista['colchon'], x * np.minimum(1, tc / 1.0) * np.exp(-tc * 0.25), T_CIERRE, 0.12)

# ---------- el "antes" suena apagado; en la bisagra el filtro se abre ----------
t = np.arange(N) / SR
abre = np.clip((t - (T_BISAGRA - 0.5)) / 1.2, 0, 1) ** 1.5
for k_ in ('guitarra', 'kalimba', 'colchon'):
    pista[k_] = filtro(pista[k_], 'low', 1300, 2) * 1.8 * (1 - abre) + pista[k_] * abre

# ---------- mezcla ----------
ir_n = int(2.6 * SR)
ir = filtro(rng.standard_normal(ir_n), 'low', 6000) * np.exp(-np.arange(ir_n) / SR * 2.3)
ir /= np.abs(ir).sum() ** 0.5 * 40
envio = pista['guitarra'] * 0.35 + pista['kalimba'] * 0.7 + pista['aro'] * 0.4 + pista['fx'] * 0.3 + pista['colchon'] * 0.3
rev = fftconvolve(envio, ir)[:N]
centro = pista['bajo'] + pista['bombo'] + pista['colchon'] + pista['fx'] + rev
# guitarra un poco a la izquierda, kalimba y shaker a la derecha
L = centro + pista['guitarra'] * 1.1 + pista['kalimba'] * 0.7 + pista['aro'] * 0.9 + pista['shaker'] * 0.6
R = centro + pista['guitarra'] * 0.8 + pista['kalimba'] * 1.1 + pista['aro'] * 0.7 + np.roll(pista['shaker'], int(0.01 * SR)) * 1.1
st = np.stack([L, R], 1)
st *= np.clip(t / 0.3, 0, 1)[:, None] * np.clip((TOTAL + 0.2 - t) / 0.9, 0, 1)[:, None]
st = np.tanh(st / np.abs(st).max() * 1.3)
st = st / np.abs(st).max() * 0.89
wavfile.write(f'musica{SUF}.wav', SR, (st * 32767).astype(np.int16))
print(f'musica{SUF}.wav', round(N / SR, 2), 's')
