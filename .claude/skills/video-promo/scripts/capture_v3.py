# Tomas del 3º vertical ("Antes / Ahora"): la mitad "ahora" de cada par. Unidad 3C, fachada sudeste.
# Uso: python capture_v3.py [toma ...]   Salida en clips_v3/
import asyncio, sys
from playwright.async_api import async_playwright
import capture_movil as cm
from capture_movil import TomaMovil, TOQUE_JS, W, H

OUT = 'clips_v3'
import os; os.makedirs(OUT, exist_ok=True)


async def giro(t):
    # de noche a día con la flecha (el primero fue día → aérea → noche)
    await t.ir('/giro/2', 3500)
    await t.grabar('giro'); await t.esperar(1.0)
    t.marca('click'); await t.tocar('.giro-flecha.der', 0)
    await t.esperar(4.0); await t.cortar()


async def fachada(t):
    await t.ir('/disponibilidad/torre-cityh-sudeste', 3500)
    await t.grabar('fachada'); await t.esperar(1.0)
    t.marca('filtro'); await t.tocar(t.pg.locator('label.interruptor').filter(has_text='Sólo disponibles'), 0)
    await t.esperar(1.4)
    libres = t.pg.locator('.forma[aria-label*="Unidad 3C,"]')
    t.marca('click'); await t.tocar(libres.first, 0)
    await t.esperar(3.0); await t.cortar()


async def ficha(t):
    await t.ir('/u/torre-cityh/3C/planta/2d', 3500)
    await t.grabar('ficha'); await t.esperar(1.4)
    t.marca('click3d'); await t.tocar(t.pg.get_by_text('Planta 3D', exact=True), 0)
    await t.esperar(3.4); await t.cortar()


async def recorrido(t):
    await _panorama(t, 'principal')
    await t.grabar('recorrido'); await t.esperar(0.5)
    t.pos = (300, 380); await t.pg.mouse.move(*t.pos)
    t.marca('drag'); await t.arrastrar(235, 383, 3.6)  # giro corto: más allá se ve una pared
    await t.esperar(.6); await t.cortar()


async def tresd(t):
    await t.ir('/3d/torre-cityh', 9000)
    await t.grabar('tresd'); await t.esperar(0.8)
    t.marca('aerea'); await t.tocar(t.pg.get_by_role('button', name='Aérea'), 0)
    await t.esperar(3.2)
    t.marca('panel'); await t.tocar(t.pg.get_by_role('button', name='Mostrar pisos y filtros'), 0)
    await t.esperar(1.0)
    t.marca('colorear'); await t.tocar(t.pg.locator('label.interruptor').filter(has_text='Colorear edificio'), 0)
    await t.esperar(3.4); await t.cortar()


async def _panorama(t, punto):
    await t.ir('/recorridos/unidad-a/' + punto, 5000)
    await t.pg.mouse.move(216, 384)
    for _ in range(12):  # zoom al mínimo
        await t.pg.mouse.wheel(0, 200); await t.pg.wait_for_timeout(60)
    await t.pg.wait_for_timeout(1200)


TOMAS = dict(giro=giro, fachada=fachada, ficha=ficha, recorrido=recorrido, tresd=tresd)


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
