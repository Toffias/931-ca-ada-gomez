"""
Baja de Poly Haven (CC0) los muebles, texturas y el HDRI que usa vestir_interior.py para el recorrido 360
(docs/renders-recorrido.md). Python común, sin Blender. No se versionan: van a una carpeta fuera del repo.

    python scripts/blender/bajar_assets_interior.py [carpeta]      # por defecto C:/Renders/_assets/polyhaven

Lo que ya está bajado no se vuelve a bajar. Para cambiar un mueble o una textura, editá MODELOS / TEXTURAS con el
slug de https://polyhaven.com (y su uso en vestir_interior.py).
"""
import json
import os
import sys
import urllib.request

CARPETA = sys.argv[1] if len(sys.argv) > 1 else "C:/Renders/_assets/polyhaven"
RESOLUCION = "2k"
# el catálogo de Poly Haven es casi todo clásico: sillón, sillas, mesa, camas y placares se modelan en
# vestir_interior.py; de acá salen los objetos que un script no hace bien (plantas, lámpara, cuadros, cerámica)
MODELOS = ["modern_arm_chair_01", "modern_coffee_table_01", "modern_ceiling_lamp_01", "potted_plant_01",
           "potted_plant_04", "ceramic_vase_01", "ceramic_vase_03", "hanging_picture_frame_01",
           "hanging_picture_frame_02", "side_table_01", "wooden_bowl_01"]
# textura -> mapas (color, normal OpenGL, rugosidad)
TEXTURAS = ["wood_floor", "beige_wall_001", "marble_01", "oak_veneer_02", "american_walnut_veneer", "rough_linen",
            "cotton_jersey", "wool_boucle", "poly_wool_herringbone"]
MAPAS = {"color": "Diffuse", "normal": "nor_gl", "rugosidad": "Rough"}
HDRIS = {"portland_landing_pad": "8k"}


def pedir(url):
    req = urllib.request.Request(url, headers={"User-Agent": "plantilla-edificio-3d"})
    return urllib.request.urlopen(req, timeout=300).read()


def bajar(url, ruta):
    if os.path.exists(ruta):
        return False
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    datos = pedir(url)
    with open(ruta + ".parcial", "wb") as f:
        f.write(datos)
    os.replace(ruta + ".parcial", ruta)  # un corte a mitad de camino no deja un archivo roto con el nombre bueno
    return True


def main():
    for slug in MODELOS:
        archivos = json.loads(pedir(f"https://api.polyhaven.com/files/{slug}"))
        blend = archivos["blend"][RESOLUCION]["blend"]
        base = os.path.join(CARPETA, "modelos", slug)
        n = bajar(blend["url"], os.path.join(base, os.path.basename(blend["url"])))
        # las texturas del .blend van con la ruta relativa que espera el archivo (textures/…)
        for relativa, info in blend.get("include", {}).items():
            n |= bajar(info["url"], os.path.join(base, relativa))
        print(f"  modelo  {slug}{'' if n else ' (ya estaba)'}")
    for slug in TEXTURAS:
        archivos = json.loads(pedir(f"https://api.polyhaven.com/files/{slug}"))
        n = False
        for nombre, clave in MAPAS.items():
            e = archivos[clave][RESOLUCION]
            e = e.get("jpg") or e.get("png")
            ext = os.path.splitext(e["url"])[1]
            n |= bajar(e["url"], os.path.join(CARPETA, "texturas", slug, nombre + ext))
        print(f"  textura {slug}{'' if n else ' (ya estaba)'}")
    for slug, res in HDRIS.items():
        archivos = json.loads(pedir(f"https://api.polyhaven.com/files/{slug}"))
        e = archivos["hdri"][res]["hdr"]
        n = bajar(e["url"], os.path.join(CARPETA, "hdris", os.path.basename(e["url"])))
        print(f"  hdri    {slug}{'' if n else ' (ya estaba)'}")
    print(f"Listo: {CARPETA}")


if __name__ == "__main__":
    main()
