"""
Genera texturas PBR tileables procedurales (public/texturas-procedurales/<material>/{color,normal,rugosidad}.jpg).

El visor usa fotos CC0 de Poly Haven en public/texturas/ (ver importar_polyhaven.py); estas procedurales quedan
como respaldo o punto de partida: para usarlas, copiá la carpeta del material a public/texturas/ o apuntá
`carpeta` en TEXTURAS (convenciones.ts) a /texturas-procedurales/<material>.

Todo es procedural (numpy): el ruido se filtra en el dominio de Fourier, así que cada textura
repite sin costuras. Se puede ajustar colores/escala y volver a correr:

    python scripts/texturas/generar.py            # requiere numpy y pillow

Los mapas normales se escriben en convención OpenGL (verde = +V, hacia arriba), la misma que usan Three.js
y los archivos nor_gl de Poly Haven.
"""
import os

import numpy as np
from PIL import Image

N = 1024
SALIDA = os.path.join(os.path.dirname(__file__), "..", "..", "public", "texturas-procedurales")
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- ruido tileable
_k = None


def _frecuencias(n):
    global _k
    if _k is None or _k.shape[0] != n:
        f = np.fft.fftfreq(n) * n
        kx, ky = np.meshgrid(f, f)
        _k = np.sqrt(kx**2 + ky**2)
    return _k


def ruido(n=N, f_min=1, f_max=None, beta=1.0):
    """Ruido periódico con espectro 1/f^beta entre f_min y f_max (ciclos por tile). Media 0, desvío 1."""
    k = _frecuencias(n)
    f_max = f_max or n / 2
    F = np.fft.fft2(rng.normal(size=(n, n)))
    filtro = np.where((k >= f_min) & (k <= f_max), 1.0 / np.maximum(k, 1) ** beta, 0.0)
    r = np.real(np.fft.ifft2(F * filtro))
    return (r - r.mean()) / (r.std() + 1e-9)


def puntos(n, cantidad, radio, fuerza=1.0):
    """Manchas/poros gaussianos distribuidos al azar, con wrap en los bordes."""
    campo = np.zeros((n, n))
    r = int(radio * 3) + 1
    yy, xx = np.mgrid[-r : r + 1, -r : r + 1]
    for _ in range(cantidad):
        cx, cy = rng.integers(0, n, 2)
        rad = radio * rng.uniform(0.5, 1.4)
        g = np.exp(-(xx**2 + yy**2) / (2 * rad**2)) * fuerza * rng.uniform(0.5, 1.0)
        ix = (np.arange(cx - r, cx + r + 1)) % n
        iy = (np.arange(cy - r, cy + r + 1)) % n
        campo[np.ix_(iy, ix)] += g
    return np.clip(campo, 0, 1)


def normal_desde_altura(h, intensidad):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * intensidad
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * intensidad
    # OpenGL: n = (-dh/du, -dh/dv, 1) con V hacia arriba; como la fila crece hacia abajo, -dh/dv = +dy
    n = np.dstack([-dx, dy, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return (n * 0.5 + 0.5)


def juntas(n, cols, filas, ancho, desfase_filas=0.0):
    """Máscara 1 en juntas de una grilla (con traba opcional) + id de cada pieza."""
    y, x = np.mgrid[0:n, 0:n] / n
    fila = np.floor(y * filas)
    xs = x * cols + (fila % 2) * desfase_filas * 1.0
    col = np.floor(xs) % cols
    fx = np.abs((xs % 1) - 0.5)
    fy = np.abs(((y * filas) % 1) - 0.5)
    ax = ancho * cols
    ay = ancho * filas
    junta = np.clip(np.maximum((fx - (0.5 - ax)) / ax, (fy - (0.5 - ay)) / ay), 0, 1)
    pieza = (fila * cols + col).astype(int)
    return junta, pieza, fx, fy


def guardar(nombre, color, normal, rug):
    d = os.path.join(SALIDA, nombre)
    os.makedirs(d, exist_ok=True)
    a8 = lambda a: (np.clip(a, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)  # color lineal -> sRGB
    Image.fromarray(a8(color)).save(os.path.join(d, "color.jpg"), quality=86, optimize=True, progressive=True)
    Image.fromarray((np.clip(normal, 0, 1) * 255).astype(np.uint8)).save(os.path.join(d, "normal.jpg"), quality=90, optimize=True)
    Image.fromarray((np.clip(rug, 0, 1) * 255).astype(np.uint8)).save(os.path.join(d, "rugosidad.jpg"), quality=86, optimize=True)
    print("ok", nombre)


def color_base(rgb, variacion):
    return np.dstack([np.full((N, N), c) for c in rgb]) * variacion[..., None]


# ---------------------------------------------------------------- revoque (fachada)
def revoque():
    grano = ruido(f_min=180, beta=0.5)
    medio = ruido(f_min=25, f_max=160, beta=1.2)
    manchas = ruido(f_min=1, f_max=8, beta=1.8)
    # revoque "salpicado": gránulos que sobresalen
    granulos = np.clip((ruido(f_min=90, f_max=400, beta=0.8) - 0.9) * 0.8, 0, 1)
    h = 0.2 * grano + 0.6 * medio + 1.0 * granulos
    variacion = 1 + 0.09 * manchas + 0.06 * medio + 0.035 * grano + 0.05 * granulos
    color = color_base((0.55, 0.51, 0.45), variacion)
    rug = 0.8 + 0.05 * grano - 0.08 * granulos
    guardar("revoque", color, normal_desde_altura(h, 4.0), rug)


# ---------------------------------------------------------------- hormigón (losas, cornisas)
def hormigon():
    grano = ruido(f_min=150, beta=0.6)
    manchas = ruido(f_min=1, f_max=10, beta=1.6)
    nubes = ruido(f_min=6, f_max=60, beta=1.4)
    poros = puntos(N, 900, 1.6, 1.0)
    h = 0.15 * grano + 0.15 * nubes - 1.2 * poros
    variacion = 1 + 0.06 * manchas + 0.04 * nubes + 0.03 * grano - 0.35 * poros
    color = color_base((0.5, 0.49, 0.465), variacion)
    rug = 0.82 + 0.04 * grano + 0.1 * poros
    guardar("hormigon", color, normal_desde_altura(h, 4.0), rug)


# ---------------------------------------------------------------- piedra (planta baja): placas 2 x 4 por tile
def piedra():
    junta, pieza, fx, fy = juntas(N, 2, 4, 0.004)
    tonos = rng.uniform(0.85, 1.15, pieza.max() + 1)
    motas = ruido(f_min=200, beta=0.3)
    oscuras = np.clip((ruido(f_min=120, f_max=500, beta=0.5) - 1.3) * 1.5, 0, 1)
    claras = np.clip((ruido(f_min=150, f_max=500, beta=0.5) - 1.7) * 1.5, 0, 1)
    vetas = ruido(f_min=3, f_max=30, beta=1.5)
    variacion = tonos[pieza] * (1 + 0.08 * motas + 0.06 * vetas) * (1 - 0.45 * oscuras) * (1 + 1.2 * claras) * (1 - 0.75 * junta)
    color = color_base((0.11, 0.108, 0.105), variacion)
    h = 1 - junta + 0.01 * motas
    rug = 0.5 + 0.05 * motas + 0.4 * junta
    guardar("piedra", color, normal_desde_altura(h, 22.0), rug)


# ---------------------------------------------------------------- baldosa vereda (9 panes), 4 x 4 por tile
def baldosa():
    junta, pieza, fx, fy = juntas(N, 4, 4, 0.006)
    # 9 panes: grilla 3x3 de cuadrados en relieve dentro de cada baldosa
    y, x = np.mgrid[0:N, 0:N] / N
    px = np.abs(((x * 12) % 1) - 0.5)
    py = np.abs(((y * 12) % 1) - 0.5)
    pan = np.clip((0.42 - np.maximum(px, py)) * 25, 0, 1)
    tonos = rng.uniform(0.9, 1.1, pieza.max() + 1)
    grano = ruido(f_min=160, beta=0.5)
    suciedad = ruido(f_min=2, f_max=20, beta=1.6)
    variacion = tonos[pieza] * (1 + 0.06 * grano) * (1 + 0.08 * suciedad) * (1 - 0.6 * junta) * (0.9 + 0.1 * pan)
    color = color_base((0.30, 0.29, 0.27), variacion)
    h = (1 - junta) * (0.6 + 0.4 * pan) + 0.01 * grano
    rug = 0.82 + 0.03 * grano + 0.1 * junta
    guardar("baldosa", color, normal_desde_altura(h, 14.0), rug)


# ---------------------------------------------------------------- asfalto
def asfalto():
    grano = ruido(f_min=250, beta=0.2)
    piedritas = np.clip((ruido(f_min=150, f_max=500, beta=0.4) - 0.9) * 0.9, 0, 1)
    parches = ruido(f_min=1, f_max=6, beta=2.0)
    desgaste = ruido(f_min=8, f_max=40, beta=1.3)
    variacion = (1 + 0.2 * grano) * (1 + 1.2 * piedritas) * (1 + 0.12 * parches) * (1 + 0.06 * desgaste)
    color = color_base((0.05, 0.05, 0.052), np.clip(variacion, 0.3, 3))
    h = 0.2 * grano + 0.8 * piedritas
    rug = 0.9 - 0.12 * piedritas
    guardar("asfalto", color, normal_desde_altura(h, 6.0), rug)


if __name__ == "__main__":
    revoque()
    hormigon()
    piedra()
    baldosa()
    asfalto()
