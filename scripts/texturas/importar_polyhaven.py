"""
Baja texturas CC0 de Poly Haven y las deja listas para el visor en public/texturas/<material>/
(color.jpg sRGB, normal.jpg en convención OpenGL, rugosidad.jpg en grises; 1024 px, repiten sin costuras).

    python scripts/texturas/importar_polyhaven.py                 # baja de Poly Haven y convierte
    python scripts/texturas/importar_polyhaven.py --crudo carpeta   # convierte PNG ya bajados (<material>_<mapa>.png)

Requiere numpy y pillow. Para cambiar un material, editá SETS (slug de https://polyhaven.com/textures) y ajustá
`escala` en TEXTURAS (convenciones.ts) con las dimensiones de la ficha del asset (metros por tile).
Las procedurales de respaldo están en public/texturas-procedurales/ (scripts/texturas/generar.py).
"""
import argparse
import json
import os
import urllib.request

import numpy as np
from PIL import Image

SALIDA = os.path.join(os.path.dirname(__file__), "..", "..", "public", "texturas")
N = 1024
CALIDAD = 88

# material -> slug de Poly Haven y color medio buscado (sRGB) para calibrar el albedo, o None para dejar la foto.
# La calibración aplica una ganancia por canal en espacio lineal: conserva el detalle y lleva el promedio a un
# tono neutro, así el `tinte` de cada regla decide el color final (p. ej. revoque blanco, beige o gris).
# `contraste` (opcional) amplía la variación alrededor del promedio: las fotos de revoque y hormigón claros tienen
# ±7 % de variación y, en superficies claras, el tone mapping (ACES) la comprime hasta que la pared se ve lisa.
SETS = {
    "revoque": {"slug": "painted_plaster_wall", "media": (192, 189, 182), "contraste": 1.0},
    "hormigon": {"slug": "concrete_wall_008", "media": (178, 176, 171), "contraste": 1.0},
    "piedra": {"slug": "granite_tile", "media": None},
    "baldosa": {"slug": "large_square_pattern_01", "media": None},
    "asfalto": {"slug": "asphalt_02", "media": None},
}
MAPAS = {"color": "Diffuse", "normal": "nor_gl", "rugosidad": "Rough"}


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "plantilla-edificio-3d"})
    return urllib.request.urlopen(req, timeout=60).read()


def bajar(material, slug, carpeta):
    archivos = json.loads(_get(f"https://api.polyhaven.com/files/{slug}"))
    for nombre, clave in MAPAS.items():
        entrada = archivos[clave]["1k"]
        url = entrada["png"]["url"] if "png" in entrada else entrada["jpg"]["url"]
        with open(os.path.join(carpeta, f"{material}_{nombre}.png"), "wb") as f:
            f.write(_get(url))
        print("  bajado", url)


def _lineal(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def _srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055) * 255


def _leer(ruta, gris=False):
    im = Image.open(ruta)
    a = np.asarray(im).astype(np.float32)
    if im.mode.startswith("I;16") or a.max() > 255:  # PNG de 16 bits
        a = a / 257.0
    if a.ndim == 3 and a.shape[2] == 4:
        a = a[..., :3]
    if gris and a.ndim == 3:
        a = a.mean(axis=2)
    if not gris and a.ndim == 2:
        a = np.dstack([a] * 3)
    if a.shape[0] != N:
        modo = "L" if gris else "RGB"
        a = np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), modo).resize((N, N), Image.LANCZOS))
    return a


def convertir(material, media, carpeta, contraste=1.0):
    d = os.path.join(SALIDA, material)
    os.makedirs(d, exist_ok=True)
    op = dict(quality=CALIDAD, optimize=True, progressive=True)

    color = _leer(os.path.join(carpeta, f"{material}_color.png"))
    if media is not None:
        lin = _lineal(color)
        lin *= _lineal(np.array(media, dtype=np.float32)) / lin.reshape(-1, 3).mean(0)
        color = _srgb(lin)
    if contraste != 1.0:
        prom = color.reshape(-1, 3).mean(0)
        color = prom + (color - prom) * contraste
    # sin perfil ICC: el navegador y three.js lo toman como sRGB
    Image.fromarray(np.clip(color + 0.5, 0, 255).astype(np.uint8), "RGB").save(os.path.join(d, "color.jpg"), **op)

    normal = _leer(os.path.join(carpeta, f"{material}_normal.png"))
    Image.fromarray(np.clip(normal + 0.5, 0, 255).astype(np.uint8), "RGB").save(os.path.join(d, "normal.jpg"), **op)

    rug = _leer(os.path.join(carpeta, f"{material}_rugosidad.png"), gris=True)
    Image.fromarray(np.clip(rug + 0.5, 0, 255).astype(np.uint8), "L").save(os.path.join(d, "rugosidad.jpg"), **op)

    kb = sum(os.path.getsize(os.path.join(d, f)) for f in ("color.jpg", "normal.jpg", "rugosidad.jpg")) // 1024
    print(f"ok {material} ({kb} KB)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--crudo", help="carpeta con <material>_{color,normal,rugosidad}.png ya bajados")
    args = ap.parse_args()
    carpeta = args.crudo or os.path.join(os.path.dirname(__file__), "_crudo")
    os.makedirs(carpeta, exist_ok=True)
    for material, s in SETS.items():
        if not args.crudo:
            print(material, "←", s["slug"])
            bajar(material, s["slug"], carpeta)
        convertir(material, s["media"], carpeta, s.get("contraste", 1.0))
