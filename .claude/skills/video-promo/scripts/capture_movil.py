# Tomas para la versión vertical: la web en modo celular (432x768 CSS, DPR 2.5 = 1080x1920) con toques reales.
# Uso: python capture_movil.py [toma ...]
import asyncio, math, os, sys, time
from playwright.async_api import async_playwright
from capture import Toma, B, ease

OUT = 'clips_v'
os.makedirs(OUT, exist_ok=True)
W, H = 432, 768

# indicador de toque: círculo translúcido que aparece mientras el dedo está apoyado
TOQUE_JS = r"""
(() => {
  if (window.__toque) return; window.__toque = true;
  const mk = () => {
    if (!document.body || document.getElementById('__dedo')) return;
    const s = document.createElement('style');
    s.textContent = `::-webkit-scrollbar{display:none}
    #__dedo{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
      background:radial-gradient(circle, rgba(255,255,255,.85) 0 38%, rgba(255,255,255,.35) 60%, rgba(255,255,255,0) 72%);
      box-shadow:0 0 0 2px rgba(255,255,255,.55), 0 4px 18px rgba(0,0,0,.35);opacity:0;scale:.6;transition:opacity .16s, scale .16s}
    #__dedo.on{opacity:1;scale:1}
    .__rip{position:fixed;z-index:2147483646;pointer-events:none;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;
      border:2px solid rgba(255,255,255,.9);animation:__r .55s cubic-bezier(.2,.7,.3,1) forwards}
    @keyframes __r{to{transform:scale(2.3);opacity:0}}`;
    document.head.appendChild(s);
    const d = document.createElement('div'); d.id = '__dedo'; document.body.appendChild(d);
  };
  const pos = (x, y) => { const d = document.getElementById('__dedo'); if (d) d.style.transform = `translate(${x}px,${y}px)`; };
  addEventListener('touchstart', e => { const t = e.touches[0]; pos(t.clientX, t.clientY); document.getElementById('__dedo')?.classList.add('on');
    const r = document.createElement('div'); r.className = '__rip'; r.style.left = t.clientX + 'px'; r.style.top = t.clientY + 'px';
    document.body.appendChild(r); setTimeout(() => r.remove(), 600); }, {capture: true, passive: true});
  addEventListener('touchmove', e => { const t = e.touches[0]; pos(t.clientX, t.clientY); }, {capture: true, passive: true});
  addEventListener('touchend', () => document.getElementById('__dedo')?.classList.remove('on'), {capture: true, passive: true});
  // el arrastre del visor 360 se hace con mouse: el dedo lo sigue igual
  addEventListener('mousedown', e => { pos(e.clientX, e.clientY); document.getElementById('__dedo')?.classList.add('on'); }, true);
  addEventListener('mousemove', e => pos(e.clientX, e.clientY), true);
  addEventListener('mouseup', () => document.getElementById('__dedo')?.classList.remove('on'), true);
  new MutationObserver(mk).observe(document, {childList: true, subtree: true});
  document.addEventListener('DOMContentLoaded', mk); mk();
})();
"""


class TomaMovil(Toma):
    async def toque(self, x, y, pausa=0.14):
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        await asyncio.sleep(pausa)
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

    async def tocar(self, sel, antes=0.5, despues=0.0):
        await self.esperar(antes)
        x, y = await self.centro(sel)
        await self.toque(x, y)
        await self.esperar(despues)

    async def deslizar(self, x0, y0, x1, y1, dur=1.2):
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        n = max(2, int(dur * 60)); t_ini = time.perf_counter()
        for i in range(1, n + 1):
            p = ease(i / n)
            await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * p, 'y': y0 + (y1 - y0) * p}]})
            espera = t_ini + dur * i / n - time.perf_counter()
            if espera > 0:
                await asyncio.sleep(espera)
        await asyncio.sleep(0.05)
        await self.cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

    async def ir(self, url, espera=2500):
        await self.pg.goto(B + url, wait_until='networkidle', timeout=90000)
        await self.pg.wait_for_timeout(espera)


async def intro(t):
    await t.ir('/', 3500)
    await t.grabar('intro'); await t.esperar(3.4)
    t.marca('click'); await t.tocar(t.pg.get_by_text('Entrar', exact=True), 0)
    await t.esperar(4.0); await t.cortar()


async def giro(t):
    await t.ir('/giro/0', 3000)
    await t.grabar('giro'); await t.esperar(1.4)
    t.marca('click1'); await t.tocar('.giro-flecha.der', 0); await t.esperar(3.2)
    t.marca('click2'); await t.tocar('.giro-flecha.der', 0); await t.esperar(3.4)
    await t.cortar()


async def fachada(t):
    await t.ir('/disponibilidad/torre-cityh-noreste', 3500)
    libres = t.pg.locator('.forma[aria-label*="Disponible"]:not(.apagada)')
    cajas = [await libres.nth(i).bounding_box() for i in range(await libres.count())]
    cajas = sorted([c for c in cajas if c and 150 < c['y'] < 560], key=lambda c: (c['y'], c['x']))
    c = cajas[len(cajas) // 2]
    await t.grabar('fachada'); await t.esperar(1.6)
    t.marca('click'); await t.toque(c['x'] + c['width'] / 2, c['y'] + c['height'] / 2)
    await t.esperar(3.2); await t.cortar()


async def planta(t):
    await t.ir('/p/torre-cityh/5', 3500)
    await t.grabar('planta'); await t.esperar(1.4)
    t.marca('click'); await t.tocar(t.pg.locator('.forma[aria-label*="Unidad 5C,"]').first, 0)
    await t.esperar(2.2)
    t.marca('ver'); await t.tocar('.popover-unidad .boton.primario', 0)
    await t.esperar(3.2); await t.cortar()


async def ficha(t):
    await t.ir('/u/torre-cityh/5C/planta/2d', 3500)
    await t.grabar('ficha'); await t.esperar(1.6)
    t.marca('click3d'); await t.tocar(t.pg.get_by_text('Planta 3D', exact=True), 0)
    await t.esperar(3.0)
    t.marca('scroll'); await t.deslizar(216, 640, 216, 380, 1.0)   # sube la ficha: precio y datos
    await t.esperar(1.8); await t.cortar()


async def recorrido(t):
    await t.ir('/recorridos/unidad-a/ingreso', 5000)
    await t.pg.mouse.move(216, 384)
    for _ in range(12):  # zoom al mínimo
        await t.pg.mouse.wheel(0, 200); await t.pg.wait_for_timeout(60)
    await t.pg.wait_for_timeout(1200)
    await t.grabar('recorrido'); await t.esperar(0.6)
    t.pos = (300, 380); await t.pg.mouse.move(*t.pos)
    t.marca('drag1'); await t.arrastrar(200, 390, 3.0)
    await t.esperar(.4)
    t.marca('living'); await t.tocar('.recorrido-punto[aria-label="Living"]', 0.2)
    await t.esperar(2.6)
    t.pos = (110, 380); await t.pg.mouse.move(*t.pos)
    t.marca('drag2'); await t.arrastrar(290, 385, 3.8)
    await t.esperar(.4)
    t.marca('principal'); await t.tocar(t.pg.locator('.recorrido-punto[style*="62.3%"]'), 0.2)
    await t.esperar(2.6)
    t.pos = (340, 380); await t.pg.mouse.move(*t.pos)
    t.marca('drag3'); await t.arrastrar(150, 382, 3.0)
    await t.esperar(.6); await t.cortar()


async def tresd(t):
    await t.ir('/3d/torre-cityh', 8000)
    await t.grabar('tresd'); await t.esperar(1.0)
    lab = t.pg.locator('label.interruptor').filter(has_text='Colorear edificio')
    t.marca('colorear')
    if not await lab.locator('input').is_checked():
        await t.tocar(lab, 0)
    await t.esperar(1.8)
    t.marca('aerea'); await t.tocar(t.pg.get_by_role('button', name='Aérea'), 0)
    await t.esperar(3.4)
    t.marca('principal'); await t.tocar(t.pg.get_by_role('button', name='Principal'), 0)
    await t.esperar(3.4); await t.cortar()


async def amenities(t):
    await t.ir('/amenities', 3000)
    await t.grabar('amenities'); await t.esperar(1.2)
    t.marca('scroll')
    for _ in range(3):
        await t.deslizar(216, 620, 216, 260, 1.1); await t.esperar(0.5)
    await t.esperar(1.0); await t.cortar()


async def ubicacion(t):
    await t.ir('/ubicacion/info', 3500)
    await t.grabar('ubicacion'); await t.esperar(1.2)
    t.marca('click'); await t.tocar(t.pg.get_by_text('Mapa', exact=True), 0)
    await t.esperar(3.8); await t.cortar()


async def obra(t):
    await t.ir('/obra', 3000)
    await t.grabar('obra'); await t.esperar(1.2)
    t.marca('scroll'); await t.deslizar(216, 620, 216, 300, 1.2)
    await t.esperar(2.0); await t.cortar()


TOMAS = dict(intro=intro, giro=giro, fachada=fachada, planta=planta, ficha=ficha, recorrido=recorrido,
             tresd=tresd, amenities=amenities, ubicacion=ubicacion, obra=obra)


async def main():
    elegidas = sys.argv[1:] or list(TOMAS)
    async with async_playwright() as p:
        b = await p.chromium.launch(channel='chrome', headless=False,
                                    args=['--window-position=-1920,0', '--hide-scrollbars',
                                          '--autoplay-policy=no-user-gesture-required',
                                          '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
                                          '--disable-background-timer-throttling',
                                          '--disable-features=CalculateNativeWinOcclusion'],
                                    ignore_default_args=['--enable-automation'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2.5, is_mobile=True,
                                  has_touch=True, locale='es-AR', color_scheme='dark')
        await ctx.add_init_script(TOQUE_JS)
        pg = await ctx.new_page()
        t = TomaMovil(pg)
        t.tam = (1080, 1920); t.out = OUT
        t.cdp = await ctx.new_cdp_session(pg)
        t.cdp.on('Page.screencastFrame', t._cuadro)
        for n in elegidas:
            try:
                await TOMAS[n](t)
            except Exception as e:
                print('FALLO', n, e, flush=True)
                try:
                    await t.cortar()
                except Exception:
                    pass
        await b.close()

if __name__ == '__main__':
    asyncio.run(main())
