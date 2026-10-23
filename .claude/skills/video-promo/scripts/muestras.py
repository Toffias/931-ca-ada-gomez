import asyncio, sys
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
AQUI=Path(__file__).parent
import os
V=os.environ.get('VERT')=='1'
TS=[float(x) for x in sys.argv[1:]]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(channel='chrome',args=['--allow-file-access-from-files'])
    pg=await b.new_page(viewport=({'width':1080,'height':1920} if V else {'width':1920,'height':1080}))
    pg.on('pageerror', lambda e: print('ERR', e))
    await pg.goto((AQUI/(os.environ.get('ESC') or ('escenario_v.html' if V else 'escenario.html'))).as_uri(), wait_until='networkidle')
    ims=[]
    for t in TS:
      await pg.evaluate(f'render({t})'); await pg.screenshot(path='_m.jpg',type='jpeg',quality=85)
      im=Image.open('_m.jpg').resize((270,480) if V else (640,360)); ImageDraw.Draw(im).text((6,6),f'{t}s',fill='red'); ims.append(im)
    await b.close()
  w,hh=ims[0].size; c=8 if V else 4; out=Image.new('RGB',(w*c,hh*((len(ims)+c-1)//c)))
  for i,im in enumerate(ims): out.paste(im,((i%c)*w,(i//c)*hh))
  out.save('muestras.jpg',quality=85)
asyncio.run(main())
