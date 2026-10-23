# Arma el video: extrae los cuadros de cada escena, escribe linea.js y renderiza escenario.html cuadro a cuadro.
# Uso: python armar.py [extraer] [render] [desde_s hasta_s]  (sin argumentos hace todo)
import asyncio, json, os, shutil, subprocess, sys
from pathlib import Path
import importlib
VERT = os.environ.get('VERT') == '1'  # versión vertical 9:16
# GUION=guion_v2b elige otro guion (define SUF y VERT); si no, guion / guion_v según VERT
G = importlib.import_module(os.environ.get('GUION') or ('guion_v' if VERT else 'guion'))
linea_de_tiempo, ENCUADRES, FPS, SOLAPE, BPM = G.linea_de_tiempo, G.ENCUADRES, G.FPS, G.SOLAPE, G.BPM
VERT = getattr(G, 'VERT', VERT)
SUF = getattr(G, 'SUF', '_v' if VERT else '')
TAM = (1080, 1920) if VERT else (1920, 1080)

AQUI = Path(__file__).parent
ESC, TOTAL = linea_de_tiempo()


def duracion(clip):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', clip]))


def extraer():
    for e in ESC:
        e['solape'] = SOLAPE
        if not e.get('toma'):
            continue
        d = AQUI / f'cuadros{SUF}' / e['id']
        shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
        clip = str(AQUI / f'clips{SUF}' / f"{e['toma']}.mp4")
        ini = e['desde'] - SOLAPE * e['vel']
        e['salto'] = 0
        if ini < 0:  # la toma no alcanza para el solape inicial: arranca más tarde y se repite el primer cuadro
            e['salto'] = round(-ini / e['vel'] * FPS); ini = 0
        largo = (e['dur'] + 2 * SOLAPE) * e['vel']
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{ini:.3f}', '-t', f'{largo:.3f}', '-i', clip,
                        '-vf', f"setpts=PTS/{e['vel']},fps={FPS},scale={TAM[0]}:{TAM[1]}:flags=lanczos",
                        '-q:v', '2', str(d / '%05d.jpg')], check=True)
        e['n'] = len(list(d.glob('*.jpg')))
        if e.get('sin_negros'):  # cuadros negros de carga: se repite el anterior
            from PIL import Image, ImageStat
            fs = sorted(d.glob('*.jpg'))
            for j in range(1, len(fs)):
                if ImageStat.Stat(Image.open(fs[j]).convert('L').crop((1000, 250, 1600, 750))).mean[0] < 22:
                    shutil.copy(fs[j - 1], fs[j])
        falta = (e['dur'] + 2 * SOLAPE) * FPS - e['salto'] - e['n']
        print(f"{e['id']:10s} {e['ini']:6.2f}–{e['fin']:6.2f}s  {e['n']} cuadros  (clip {duracion(clip):.1f}s, faltan {max(0, falta):.0f})")
    datos = dict(fps=FPS, bpm=BPM, total=TOTAL, encuadres=ENCUADRES,
                 escenas=[{k: v for k, v in e.items()} for e in ESC])
    (AQUI / f'linea{SUF}.js').write_text('window.LINEA = ' + json.dumps(datos, ensure_ascii=False) + ';', encoding='utf8')
    logo_claro()


LOGO = os.environ.get('LOGO', r'C:\Renders\plantilla-edificio-3d\media\logo_apz.png')


def logo_claro():
    """el logo va sobre fondo oscuro: lo que no es el color de acento pasa a blanco cálido"""
    from PIL import Image
    im = Image.open(LOGO).convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, al = px[x, y]
            if al and not (r > 200 and g < 170):  # acento naranja de APZ: se deja igual
                px[x, y] = (245, 242, 236, al)
    im.save(AQUI / 'logo_claro.png')


async def render(desde=0.0, hasta=None, salida='render' + SUF):
    from playwright.async_api import async_playwright
    hasta = hasta or TOTAL
    out = AQUI / salida
    shutil.rmtree(out, ignore_errors=True); out.mkdir()
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', args=['--force-device-scale-factor=1', '--allow-file-access-from-files'])
        pg = await b.new_page(viewport={'width': TAM[0], 'height': TAM[1]})
        await pg.goto((AQUI / f'escenario{SUF}.html').as_uri(), wait_until='networkidle')
        await pg.evaluate('document.fonts.ready')
        n0, n1 = round(desde * FPS), round(hasta * FPS)
        for n in range(n0, n1):
            await pg.evaluate(f'render({n / FPS})')
            await pg.screenshot(path=str(out / f'{n - n0 + 1:05d}.jpg'), type='jpeg', quality=95)
            if n % 150 == 0:
                print('cuadro', n, flush=True)
        await b.close()
    return out


def codificar(carpeta, destino, audio=None):
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', str(carpeta / '%05d.jpg')]
    if audio:
        cmd += ['-i', str(audio), '-c:a', 'aac', '-b:a', '256k', '-shortest']
    cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(destino)]
    subprocess.run(cmd, check=True)


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or 'extraer' in args:
        extraer()
    if not args or 'render' in args:
        nums = [float(a) for a in args if a.replace('.', '').isdigit()]
        out = asyncio.run(render(*nums) if nums else render())
        audio = AQUI / f'musica{SUF}.wav'
        codificar(out, AQUI / (f'prueba{SUF}.mp4' if nums else f'video_sin_audio{SUF}.mp4'), audio if audio.exists() and not nums else None)
        print('listo')
