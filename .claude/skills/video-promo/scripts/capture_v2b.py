# Tomas del 2º vertical ("Showroom 24 h"): la historia de un comprador a la noche, unidad 8B.
# Uso: python capture_v2b.py [toma ...]   Salida en clips_v2b/
import asyncio, sys
from playwright.async_api import async_playwright
import capture_movil as cm
from capture_movil import TomaMovil, TOQUE_JS, W, H

OUT = 'clips_v2b'
import os; os.makedirs(OUT, exist_ok=True)


async def noche(t):
    # la vista aérea de día pasa a la de noche: "cerró el showroom"
    await t.ir('/giro/1', 3500)
    await t.grabar('noche'); await t.esperar(1.2)
    t.marca('click'); await t.tocar('.giro-flecha.der', 0)
    await t.esperar(4.5); await t.cortar()


async def planta(t):
    await t.ir('/p/torre-cityh/8', 3500)
    await t.grabar('planta'); await t.esperar(1.3)
    t.marca('click'); await t.tocar(t.pg.locator('.forma[aria-label*="Unidad 8B,"]').first, 0)
    await t.esperar(3.2); await t.cortar()


async def _panorama(t, punto):
    await t.ir('/recorridos/unidad-a/' + punto, 5000)
    await t.pg.mouse.move(216, 384)
    for _ in range(12):  # zoom al mínimo
        await t.pg.mouse.wheel(0, 200); await t.pg.wait_for_timeout(60)
    await t.pg.wait_for_timeout(1200)


async def tour(t):
    await _panorama(t, 'living')
    await t.grabar('tour'); await t.esperar(0.5)
    t.pos = (330, 380); await t.pg.mouse.move(*t.pos)
    t.marca('drag1'); await t.arrastrar(120, 386, 3.4)
    await t.esperar(.6); await t.cortar()


async def tour2(t):
    await _panorama(t, 'dormitorio')
    await t.grabar('tour2'); await t.esperar(0.5)
    t.pos = (320, 380); await t.pg.mouse.move(*t.pos)
    t.marca('drag'); await t.arrastrar(160, 384, 3.0)
    await t.esperar(.6); await t.cortar()


async def escribir(t, sel, texto):
    await t.tocar(sel, 0.25)
    await t.pg.keyboard.type(texto, delay=55)


async def consulta(t):
    # nunca se manda la consulta: se bloquea todo POST y el submit del formulario
    await t.pg.route('**/*', lambda r: r.abort() if r.request.method == 'POST' else r.continue_())
    await t.ir('/u/torre-cityh/8B', 3500)
    await t.pg.evaluate("document.addEventListener('submit', e => { e.preventDefault(); e.stopImmediatePropagation() }, true)")
    await t.grabar('consulta'); await t.esperar(1.6)
    t.marca('precio'); await t.tocar(t.pg.get_by_role('button', name='Consultar precio').first, 0)
    await t.esperar(1.0)
    t.marca('nombre'); await escribir(t, 'input[name=nombre]', 'Lucía Gómez')
    t.marca('telefono'); await escribir(t, 'input[name=telefono]', '11 5555 0123')
    t.marca('email'); await escribir(t, 'input[name=email]', 'lucia@ejemplo.com')
    await t.pg.locator('input[name=nombre]').blur()
    t.marca('acepto'); await t.tocar('input[name=privacidad]', 0.3)
    await t.esperar(0.5)
    t.marca('enviar'); await t.tocar(t.pg.get_by_role('button', name='Enviar consulta'), 0)
    await t.esperar(1.0); await t.cortar()
    await t.pg.unroute('**/*')


TOMAS = dict(noche=noche, planta=planta, tour=tour, tour2=tour2, consulta=consulta)


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
        for n in elegidas:  # contexto nuevo por toma: nada queda abierto de la anterior
            ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2.5, is_mobile=True,
                                      has_touch=True, locale='es-AR', color_scheme='dark')
            await ctx.add_init_script(TOQUE_JS)
            pg = await ctx.new_page()
            t = TomaMovil(pg)
            t.tam = (1080, 1920); t.out = OUT
            t.cdp = await ctx.new_cdp_session(pg)
            t.cdp.on('Page.screencastFrame', t._cuadro)
            try:
                await TOMAS[n](t)
            except Exception as e:
                print('FALLO', n, e, flush=True)
                try:
                    await t.cortar()
                except Exception:
                    pass
            await ctx.close()
        await b.close()

if __name__ == '__main__':
    asyncio.run(main())
