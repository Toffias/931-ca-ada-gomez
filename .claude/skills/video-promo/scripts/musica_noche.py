# Música del 2º vertical ("Showroom 24 h"), distinta a musica.py: lo-fi nocturno sintetizado con numpy.
# Piano eléctrico (FM), bajo redondo, batería con swing, vinilo, y efectos atados a la historia:
# tic-tac del reloj, toques en pantalla, tipeo del formulario y campanita en cada aviso.
# Uso: GUION=guion_v2b python musica_noche.py   → musica_v2b.wav
import importlib, json, os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

G = importlib.import_module(os.environ.get('GUION', 'guion_v2b'))
ESC, TOTAL = G.linea_de_tiempo()
PULSO, SUF = G.PULSO, G.SUF
SR = 48000
N = int(SR * (TOTAL + 0.6))
rng = np.random.default_rng(23)
E = {e['id']: e for e in ESC}
COMPAS = 4 * PULSO
T_RITMO, T_HATS, T_AVISO, T_CIERRE = E['noche']['ini'], E['planta']['ini'], E['aviso']['ini'], E['cierre']['ini']


def hz(m):
    return 440 * 2 ** ((m - 69) / 12)


def filtro(x, tipo, f, orden=2):
    return sosfilt(butter(orden, f, btype=tipo, fs=SR, output='sos'), x)


def poner(pista, x, t):
    i = int(t * SR)
    if i < 0 or i >= len(pista):
        return
    x = x[: len(pista) - i]
    pista[i: i + len(x)] += x


mix = {k: np.zeros(N) for k in ('ep', 'bajo', 'bombo', 'caja', 'hat', 'vinilo', 'fx', 'ui')}

# ---------- piano eléctrico: FM con índice que decae (ataque "campana", cola cálida) ----------
def ep(f, dur, v=1.0, caida=1.3):
    n = int((dur + 0.8) * SR); t = np.arange(n) / SR
    f = f * (1 + 0.0035 * np.sin(2 * np.pi * 0.45 * rng.random() * 10))  # cinta levemente desafinada
    indice = 1.6 * np.exp(-t * 4) + 0.25
    x = np.sin(2 * np.pi * f * t + indice * np.sin(2 * np.pi * f * t))
    x += 0.12 * np.sin(2 * np.pi * f * 7.02 * t) * np.exp(-t * 30)  # "tine"
    env = np.minimum(1, t / 0.004) * np.exp(-t * caida) * np.clip((dur + 0.8 - t) / 0.8, 0, 1)
    return x * env * v


# Fmaj9 → Em7 → Dm9 → Cmaj9 (descenso lo-fi, otra armonía que la del primero)
ACORDES = [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]]
RAIZ = [41, 40, 38, 36]
SW = 0.58  # swing: la corchea de contratiempo cae al 58 % del pulso

compases = int(TOTAL / COMPAS) + 1
for b in range(compases):
    t0 = b * COMPAS
    if t0 >= T_CIERRE - 0.01:
        break
    ac = ACORDES[b % 4]
    # acorde en el 1 (arpegiado apenas, como tocado a mano) y un golpe corto en el "y" del 2
    for j, m in enumerate(ac):
        poner(mix['ep'], ep(hz(m), COMPAS * 0.9, 0.22), t0 + j * 0.012)
    if t0 >= T_RITMO:
        for j, m in enumerate(ac[1:4]):
            poner(mix['ep'], ep(hz(m + 12), PULSO * 0.5, 0.09), t0 + PULSO * (1 + SW) + j * 0.01)
    # bajo: redondo, raíz en el 1 y quinta/octava en el "y" del 3
    if t0 >= T_RITMO:
        for off, m, largo in ((0, RAIZ[b % 4], PULSO * 1.8), (PULSO * (2 + SW), RAIZ[b % 4] + 7, PULSO * 0.8),
                              (PULSO * 3.5, RAIZ[b % 4] + 12, PULSO * 0.45)):
            n = int(largo * SR); t = np.arange(n) / SR
            f = hz(m)
            x = np.sin(2 * np.pi * f * t) + 0.18 * np.sin(4 * np.pi * f * t)
            x *= np.minimum(1, t / 0.01) * np.clip((largo - t) / 0.06, 0, 1) * np.exp(-t * 1.2)
            poner(mix['bajo'], x * 0.5, t0 + off)

# ---------- batería con swing ----------
def bombo():
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 48 + 80 * np.exp(-t * 32)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)
    return x + filtro(rng.standard_normal(n), 'low', 3000) * np.exp(-t * 200) * 0.25


def caja():
    n = int(0.4 * SR); t = np.arange(n) / SR
    tono = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 22) * 0.5
    ruido = filtro(rng.standard_normal(n), 'band', [1200, 7000]) * np.exp(-t * 13)
    return filtro(tono + ruido, 'low', 6500)


def hat(largo=0.05):
    n = int(largo * SR)
    return filtro(rng.standard_normal(n), 'band', [6000, 12000]) * np.exp(-np.arange(n) / SR * 70)


golpes_bombo = []
p = 0
while p * PULSO < T_CIERRE - PULSO * 0.5:
    t = p * PULSO
    en = p % 4
    ritmo = t >= T_RITMO and not (T_CIERRE - COMPAS / 2 <= t)  # medio compás de silencio antes del cierre
    if ritmo:
        if en == 0 or (en == 2 and t < T_AVISO) or (en == 1 and p % 8 == 5):
            poner(mix['bombo'], bombo() * 0.8, t); golpes_bombo.append(t)
        if en == 2 and t >= T_AVISO:  # en los avisos el ritmo se aliviana
            poner(mix['bombo'], bombo() * 0.5, t + PULSO * SW); golpes_bombo.append(t + PULSO * SW)
        if en in (1, 3):
            poner(mix['caja'], caja() * 0.45, t + 0.008)
        if t >= T_HATS:
            poner(mix['hat'], hat() * 0.16, t)
            poner(mix['hat'], hat(0.035) * 0.1, t + PULSO * SW)
    p += 1

# pulso de "sidechain": el piano y el bajo respiran con el bombo
duck = np.ones(N)
for tb in golpes_bombo:
    i = int(tb * SR); n = int(0.28 * SR)
    seg = 1 - 0.35 * np.exp(-np.arange(n) / SR * 14)
    duck[i:i + n] = np.minimum(duck[i:i + n], seg[: max(0, min(n, N - i))])
mix['ep'] *= duck; mix['bajo'] *= duck

# ---------- vinilo: chasquidos sueltos + soplido ----------
chasq = np.zeros(N)
for i in rng.integers(0, N, int(TOTAL * 22)):
    chasq[i] = rng.uniform(-1, 1) * rng.uniform(0.2, 1) ** 3
mix['vinilo'] = filtro(chasq, 'high', 1500) * 0.5 + filtro(rng.standard_normal(N), 'band', [300, 6000]) * 0.012

# ---------- efectos atados a la imagen ----------
def tic(f=3200, v=1.0):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * 0.6 + filtro(rng.standard_normal(n), 'high', 4000) * 0.5) * np.exp(-t * 260) * v


# reloj del gancho: engranaje que se acelera mientras corre de 18:00 a 23:40 (misma curva que escenario_v2b.html)
def eio(x):
    x = min(1, max(0, x))
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2

rel = E['gancho']['reloj']
a_min = lambda s: int(s[:2]) * 60 + int(s[3:])
m0, m1 = a_min(rel['de']), a_min(rel['a'])
ultimo = None
for i in range(int(E['gancho']['fin'] * SR / 240)):
    t = i * 240 / SR
    m = round(m0 + (m1 - m0) * eio((t - 0.35) / 1.5))
    paso = m // 6
    if ultimo is not None and paso != ultimo:
        poner(mix['ui'], tic(2600 + rng.uniform(-200, 200), 0.35), t)
    ultimo = paso
# al quedar en 23:40: "clac" y el tic-tac de un reloj de pared hasta que entra el ritmo
poner(mix['ui'], tic(1400, 0.9) + np.pad(tic(900, 0.5), (int(0.012 * SR), 0))[: int(0.03 * SR)], 1.87)
t = 1.87 + PULSO
while t < T_RITMO - 0.05:
    poner(mix['ui'], tic(2200 if round((t - 1.87) / PULSO) % 2 else 1700, 0.5), t)
    t += PULSO


def en_video(escena, s):
    """segundo de la toma → segundo del video"""
    e = E[escena]
    return e['ini'] + (s - e['desde']) / e['vel']


def toque(v=1.0):  # toque en el vidrio: grave corto + clic
    n = int(0.09 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 520 * t) * np.exp(-t * 60) * 0.6 + filtro(rng.standard_normal(n), 'band', [2000, 6000]) * np.exp(-t * 180) * 0.5) * v


def tecla():
    n = int(0.035 * SR); t = np.arange(n) / SR
    return filtro(rng.standard_normal(n), 'band', [1800 + rng.uniform(-500, 500), 5000]) * np.exp(-t * 170) * rng.uniform(0.5, 1)


marcas = {n: json.load(open(f'clips{SUF}/{n}.json')) for n in ('noche', 'planta', 'consulta')}
poner(mix['ui'], toque(0.8), en_video('noche', marcas['noche']['click']))
poner(mix['ui'], toque(), en_video('planta', marcas['planta']['click']))
c = marcas['consulta']
poner(mix['ui'], toque(), en_video('consulta', c['precio']))
for campo, sig, largo in (('nombre', 'telefono', 11), ('telefono', 'email', 12), ('email', 'acepto', 17)):
    t_tap = c[campo] + 0.25
    poner(mix['ui'], toque(0.7), en_video('consulta', t_tap))
    ini, fin = t_tap + 0.16, c[sig] - 0.05
    for k in range(largo):
        poner(mix['ui'], tecla() * 0.55, en_video('consulta', ini + (fin - ini) * k / largo))
poner(mix['ui'], toque(0.7), en_video('consulta', c['acepto'] + 0.3))
poner(mix['ui'], toque(1.2), en_video('consulta', c['enviar']))
# "enviado": barrido suave hacia arriba justo al alejarse el celular
n = int(0.5 * SR); t = np.arange(n) / SR
poner(mix['fx'], np.sin(2 * np.pi * np.cumsum(500 + 1400 * (t / 0.5) ** 2) / SR) * np.sin(np.pi * t / 0.5) ** 2 * 0.1, T_AVISO - 0.05)

# avisos: campanita de dos notas tipo marimba (tercera mayor arriba), una por notificación
def marimba(f):
    n = int(0.9 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 3.9 * t) * np.exp(-t * 20)) * np.exp(-t * 6) * np.minimum(1, t / 0.002)

for k, t_d in enumerate(G.MUSICA['dings']):
    base = 84 if k == 0 else 79
    poner(mix['ui'], marimba(hz(base)) * 0.3, t_d)
    poner(mix['ui'], marimba(hz(base + 4)) * 0.3, t_d + 0.12)

# cortes: soplido cálido y corto (no el barrido del primero)
for e in ESC[1:]:
    if e['id'] in ('tour2', 'cierre'):
        continue
    n = int(0.45 * SR); t = np.arange(n) / SR
    x = filtro(rng.standard_normal(n), 'band', [250, 2200]) * np.sin(np.pi * t / 0.45) ** 3
    poner(mix['fx'], x * 0.12, e['ini'] - 0.3)

# ---------- cierre: acorde al revés que crece, golpe grave y el acorde final que queda sonando ----------
final = [41, 53, 57, 60, 64, 67, 72]  # Fmaj9 abierto
nr = int(1.4 * SR)
rev_acorde = sum(ep(hz(m), 1.2, 0.2) for m in final[1:])[:nr][::-1]
poner(mix['fx'], rev_acorde * np.linspace(0, 1, nr) ** 1.5 * 0.9, T_CIERRE - 1.4)
ng = int(3.0 * SR); tg = np.arange(ng) / SR
poner(mix['fx'], np.sin(2 * np.pi * np.cumsum(36 + 50 * np.exp(-tg * 12)) / SR) * np.exp(-tg * 1.8) * 0.8, T_CIERRE)
for j, m in enumerate(final):
    poner(mix['ep'], ep(hz(m), TOTAL - T_CIERRE, 0.2 if m > 45 else 0.35, caida=0.45), T_CIERRE + 0.02 + j * 0.03)

# ---------- mezcla ----------
ir_n = int(2.2 * SR)
ir = filtro(rng.standard_normal(ir_n), 'low', 5000) * np.exp(-np.arange(ir_n) / SR * 2.8)
ir /= np.abs(ir).sum() ** 0.5 * 40
envio = mix['ep'] * 0.45 + mix['caja'] * 0.25 + mix['ui'] * 0.3 + mix['fx'] * 0.4
rev = fftconvolve(envio, ir)[:N]

# trémolo estéreo del piano (el Rhodes que va de un lado al otro)
t = np.arange(N) / SR
trem = 0.5 + 0.5 * np.sin(2 * np.pi * 2.6 * t)
epL, epR = mix['ep'] * (0.7 + 0.3 * trem), mix['ep'] * (1.0 - 0.3 * trem)
seco = mix['bajo'] + mix['bombo'] + mix['caja'] * 0.9 + mix['fx'] + mix['ui'] + mix['vinilo'] + rev
L = seco + epL + mix['hat'] * 1.1
R = seco + epR + np.roll(mix['hat'], int(0.006 * SR)) * 0.9
st = np.stack([L, R], 1)
st = sosfilt(butter(2, 11000, btype='low', fs=SR, output='sos'), st, axis=0)  # un poco de "cinta"
st *= np.clip(t / 0.25, 0, 1)[:, None] * np.clip((TOTAL + 0.3 - t) / 1.3, 0, 1)[:, None]
st = np.tanh(st / np.abs(st).max() * 1.4)
st = st / np.abs(st).max() * 0.89
wavfile.write(f'musica{SUF}.wav', SR, (st * 32767).astype(np.int16))
print(f'musica{SUF}.wav', round(N / SR, 2), 's')
