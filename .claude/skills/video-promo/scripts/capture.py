# Graba tomas de la web real en el monitor secundario (1920x1080) con un cursor coreografiado.
# Uso: python capture.py [toma ...]   (sin argumentos graba todas)
import asyncio, subprocess, sys, time, json, math, os, base64, shutil
from playwright.async_api import async_playwright

B = 'https://constructoras.apzsoftware.online'
OUT = 'clips'
os.makedirs(OUT, exist_ok=True)

CURSOR_JS = r"""
(() => {
  if (window.__cursor) return;
  const mk = () => {
    if (!document.body || document.getElementById('__cur')) return;
    const s = document.createElement('style');
    s.textContent = `*{cursor:none!important} ::-webkit-scrollbar{display:none}
    #__cur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:30px;height:30px;
      transform:translate(-100px,-100px);transition:scale .12s; filter:drop-shadow(0 3px 6px rgba(0,0,0,.45))}
    #__cur.down{scale:.82}
    .__rip{position:fixed;z-index:2147483646;pointer-events:none;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;
      border:2px solid rgba(255,255,255,.95);box-shadow:0 0 12px rgba(255,255,255,.6);animation:__r .6s cubic-bezier(.2,.7,.3,1) forwards}
    @keyframes __r{to{transform:scale(5);opacity:0}}`;
    document.head.appendChild(s);
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2.5 L4 19.5 L8.6 15.3 L11.6 22 L14.6 20.7 L11.7 14.2 L18 14.2 Z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    const p = window.__pos || [-100, -100];
    c.style.transform = `translate(${p[0]-4}px,${p[1]-2}px)`;
  };
  window.__cursor = true;
  addEventListener('mousemove', e => { window.__pos=[e.clientX,e.clientY]; const c=document.getElementById('__cur'); if(c) c.style.transform=`translate(${e.clientX-4}px,${e.clientY-2}px)`; }, true);
  addEventListener('mousedown', e => { document.getElementById('__cur')?.classList.add('down');
    const r=document.createElement('div'); r.className='__rip'; r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; document.body.appendChild(r); setTimeout(()=>r.remove(),700); }, true);
  addEventListener('mouseup', () => document.getElementById('__cur')?.classList.remove('down'), true);
  new MutationObserver(mk).observe(document, {childList:true, subtree:true});
  document.addEventListener('DOMContentLoaded', mk); mk();
})();
"""


def ease(t):  # easeInOutCubic
    return 4 * t * t * t if t < .5 else 1 - (-2 * t + 2) ** 3 / 2


class Toma:
    def __init__(self, pg):
        self.pg = pg
        self.pos = (960, 540)
        self.ff = None
        self.t0 = 0
        self.marcas = {}
        self.tam = (1920, 1080)
        self.out = OUT

    async def mover(self, x, y, dur=0.9, curva=0.12):
        """mueve el mouse con aceleración suave y un leve arco, como una mano"""
        x0, y0 = self.pos
        dx, dy = x - x0, y - y0
        nx, ny = -dy * curva, dx * curva  # desvío perpendicular
        n = max(2, int(dur * 90))
        t_ini = time.perf_counter()
        for i in range(1, n + 1):
            t = ease(i / n)
            arco = math.sin(math.pi * i / n)
            await self.pg.mouse.move(x0 + dx * t + nx * arco, y0 + dy * t + ny * arco)
            espera = t_ini + dur * i / n - time.perf_counter()
            if espera > 0:
                await asyncio.sleep(espera)
        self.pos = (x, y)

    async def arrastrar(self, x, y, dur=1.5):
        await self.pg.mouse.down()
        await self.mover(x, y, dur, curva=0.02)
        await self.pg.mouse.up()

    async def click(self, pausa=0.12):
        await self.pg.mouse.down()
        await asyncio.sleep(pausa)
        await self.pg.mouse.up()

    async def centro(self, sel):
        loc = self.pg.locator(sel).first if isinstance(sel, str) else sel
        b = await loc.bounding_box()
        return (b['x'] + b['width'] / 2, b['y'] + b['height'] / 2)

    async def ir(self, url, espera=2500):
        await self.pg.goto(B + url, wait_until='networkidle', timeout=90000)
        await self.pg.wait_for_timeout(espera)
        await self.pg.mouse.move(*self.pos)

    async def esperar(self, s):
        await asyncio.sleep(s)

    def marca(self, nombre):
        self.marcas[nombre] = time.time()  # reloj de pared, igual que los timestamps del screencast

    async def grabar(self, nombre):
        """graba lo que dibuja Chrome (screencast CDP), sin depender del monitor"""
        self.nombre = nombre
        self.cuadros = []
        self.marcas = {}
        await self.cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 94, 'maxWidth': self.tam[0], 'maxHeight': self.tam[1]})

    def _cuadro(self, e):
        self.cuadros.append((e['metadata']['timestamp'], base64.b64decode(e['data'])))
        asyncio.ensure_future(self.cdp.send('Page.screencastFrameAck', {'sessionId': e['sessionId']}))

    async def cortar(self):
        await self.cdp.send('Page.stopScreencast')
        self.marcas['fin'] = time.time()
        d = f'{self.out}/{self.nombre}_cuadros'
        shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
        cs = self.cuadros
        with open(f'{d}/lista.txt', 'w') as l:
            for i, (ts, jpg) in enumerate(cs):
                open(f'{d}/{i:05d}.jpg', 'wb').write(jpg)
                dur = (cs[i + 1][0] - ts) if i + 1 < len(cs) else max(1 / 60, self.marcas['fin'] - ts)  # la página quieta no manda cuadros
                l.write(f"file '{i:05d}.jpg'\nduration {dur:.5f}\n")
            if cs:  # concat ignora la duración de la última entrada: se repite el último cuadro
                l.write(f"file '{len(cs) - 1:05d}.jpg'\n")
        # marcas en segundos desde el primer cuadro del clip
        self.marcas = {k: round(v - cs[0][0], 3) for k, v in self.marcas.items()}
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', f'{d}/lista.txt',
                        '-vf', f'scale={self.tam[0]}:{self.tam[1]}:flags=lanczos,setsar=1,fps=60', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p',
                        f'{self.out}/{self.nombre}.mp4'], check=True)
        shutil.rmtree(d)
        json.dump(self.marcas, open(f'{self.out}/{self.nombre}.json', 'w'))
        print(self.nombre, len(cs), 'cuadros', self.marcas, flush=True)


# ---------- tomas ----------

async def intro(t):
    t.pos = (1500, 820)
    await t.ir('/', 3500)
    await t.grabar('intro'); await t.esperar(3.2)
    x, y = await t.centro(t.pg.get_by_text('Entrar', exact=True))
    await t.mover(x, y, 1.3); await t.esperar(.35)
    t.marca('click'); await t.click()
    await t.esperar(4.5); await t.cortar()


async def giro(t):
    t.pos = (1300, 700)
    await t.ir('/giro/0', 3000)
    await t.grabar('giro'); await t.esperar(1.2)
    x, y = await t.centro('.giro-flecha.der')
    await t.mover(x, y, 1.0); await t.esperar(.2)
    t.marca('click1'); await t.click(); await t.esperar(3.2)
    t.marca('click2'); await t.click(); await t.esperar(3.2)
    await t.cortar()


async def fachada(t):
    t.pos = (1500, 300)
    await t.ir('/disponibilidad/torre-cityh-noreste', 3500)
    libres = t.pg.locator('.forma[aria-label*="Disponible"]:not(.apagada)')
    cajas = [await libres.nth(i).bounding_box() for i in range(await libres.count())]
    cajas = sorted([c for c in cajas if c], key=lambda c: (c['y'], c['x']))
    elegidas = [cajas[int(len(cajas) * f)] for f in (.15, .45, .7)]
    await t.grabar('fachada'); await t.esperar(0.8)
    for i, c in enumerate(elegidas):
        await t.mover(c['x'] + c['width'] / 2, c['y'] + c['height'] / 2, 0.8)
        t.marca(f'hover{i}'); await t.esperar(0.8)
    t.marca('click'); await t.click()   # la última queda elegida: aparece su tarjeta
    await t.esperar(1.2)
    x, y = await t.centro('.popover-unidad .boton.primario')
    await t.mover(x, y, 0.9); t.marca('ver'); await t.esperar(1.6)
    await t.cortar()

async def planta(t):
    t.pos = (1500, 900)
    await t.ir('/p/torre-cityh/5', 3500)
    await t.grabar('planta'); await t.esperar(0.8)
    for cod in ('5D', '5A', '5C'):
        x, y = await t.centro(t.pg.locator(f'.forma[aria-label*="Unidad {cod},"]').first)
        await t.mover(x, y, 0.8); t.marca(f'hover{cod}'); await t.esperar(0.8)
    t.marca('click'); await t.click()
    await t.esperar(1.2)
    x, y = await t.centro('.popover-unidad .boton.primario')
    await t.mover(x, y, 0.9); await t.esperar(0.4)
    t.marca('ver'); await t.click()   # zoom hacia la ficha
    await t.esperar(3.0); await t.cortar()

async def ficha(t):
    t.pos = (1500, 950)
    await t.ir('/u/torre-cityh/5C/planta/2d', 3500)
    await t.grabar('ficha'); await t.esperar(1.6)
    x, y = await t.centro(t.pg.get_by_text('Planta 3D', exact=True))
    await t.mover(x, y, 1.0); await t.esperar(.2)
    t.marca('click3d'); await t.click(); await t.esperar(3.0)
    x, y = await t.centro(t.pg.get_by_text('Planta 2D', exact=True))
    await t.mover(x, y, .7); t.marca('click2d'); await t.click(); await t.esperar(2.0)
    await t.cortar()


async def recorrido(t):
    t.pos = (1500, 560)
    await t.ir('/recorridos/unidad-a/ingreso', 5000)
    await t.pg.mouse.move(960, 540)
    for _ in range(12):  # zoom al mínimo: imagen más amplia
        await t.pg.mouse.wheel(0, 200); await t.pg.wait_for_timeout(60)
    await t.pg.wait_for_timeout(1200); await t.pg.mouse.move(*t.pos)
    await t.grabar('recorrido'); await t.esperar(0.6)
    t.marca('drag1'); await t.arrastrar(1020, 560, 3.2)      # ingreso → hacia el living
    await t.esperar(.4)
    x, y = await t.centro('.recorrido-punto[aria-label="Living"]')
    await t.mover(x, y, 1.0); t.marca('living'); await t.click()
    await t.esperar(2.6)
    await t.mover(1450, 540, .6)
    t.marca('drag2'); await t.arrastrar(750, 550, 4.0)       # living: sillón, ventanales y cocina
    await t.esperar(.4)
    x, y = await t.centro(t.pg.locator('.recorrido-punto[style*="62.3%"]'))
    await t.mover(x, y, 1.0); t.marca('principal'); await t.click()
    await t.esperar(2.6)
    await t.mover(1400, 540, .6)
    t.marca('drag3'); await t.arrastrar(950, 545, 3.0)
    await t.esperar(.6); await t.cortar()

async def tresd(t):
    t.pos = (1500, 820)
    await t.ir('/3d/torre-cityh', 8000)
    await t.grabar('tresd'); await t.esperar(0.8)
    x, y = await t.centro(t.pg.locator('label.interruptor').filter(has_text='Colorear edificio'))
    await t.mover(x - 60, y, 1.0); t.marca('colorear')
    if not await t.pg.locator('label.interruptor').filter(has_text='Colorear edificio').locator('input').is_checked():
        await t.click()
    await t.esperar(1.6)
    x, y = await t.centro(t.pg.get_by_role('button', name='Aérea'))
    await t.mover(x, y, 1.1); t.marca('aerea'); await t.click()
    await t.esperar(3.4)
    x, y = await t.centro(t.pg.get_by_role('button', name='Principal'))
    await t.mover(x, y, 0.8); t.marca('principal'); await t.click()
    await t.esperar(3.4); await t.cortar()

async def amenities(t):
    t.pos = (1500, 700)
    await t.ir('/amenities', 3000)
    await t.grabar('amenities'); await t.esperar(1.2)
    t.marca('scroll')
    for i in range(170):  # scroll suave
        await t.pg.mouse.wheel(0, 14); await asyncio.sleep(1 / 60)
    await t.esperar(1.5); await t.cortar()


async def ubicacion(t):
    t.pos = (1500, 700)
    await t.ir('/ubicacion/info', 3500)
    await t.grabar('ubicacion'); await t.esperar(1.2)
    x, y = await t.centro(t.pg.get_by_text('Mapa', exact=True))
    await t.mover(x, y, 1.0); t.marca('click'); await t.click()
    await t.esperar(3.5); await t.cortar()


async def obra(t):
    t.pos = (1500, 700)
    await t.ir('/obra', 3000)
    await t.grabar('obra'); await t.esperar(1.0)
    items = t.pg.locator('.pantalla-obra button, .pantalla-obra a').filter(has=t.pg.locator('img'))
    if await items.count() > 2:
        x, y = await t.centro(items.nth(2))
        await t.mover(x, y, 1.0); t.marca('click'); await t.click()
    await t.esperar(2.5); await t.cortar()


TOMAS = dict(intro=intro, giro=giro, fachada=fachada, planta=planta, ficha=ficha, recorrido=recorrido,
             tresd=tresd, amenities=amenities, ubicacion=ubicacion, obra=obra)


async def main():
    elegidas = sys.argv[1:] or list(TOMAS)
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=False,
                                    args=['--window-position=-1920,0', '--hide-scrollbars', '--force-device-scale-factor=1',
                                          '--autoplay-policy=no-user-gesture-required',
                                          '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
                                          '--disable-background-timer-throttling',
                                          '--disable-features=CalculateNativeWinOcclusion'],
                                    ignore_default_args=['--enable-automation'])
        ctx = await b.new_context(viewport={'width': 1920, 'height': 1080}, locale='es-AR', color_scheme='dark')
        await ctx.add_init_script(CURSOR_JS)
        pg = await ctx.new_page()
        await pg.goto(B + '/', wait_until='networkidle')
        await pg.wait_for_timeout(1500)
        t = Toma(pg)
        t.cdp = await ctx.new_cdp_session(pg)
        t.cdp.on('Page.screencastFrame', t._cuadro)
        for n in elegidas:
            try:
                await TOMAS[n](t)
            except Exception as e:
                print('FALLO', n, e, flush=True)
        await b.close()

if __name__ == '__main__':
    asyncio.run(main())
