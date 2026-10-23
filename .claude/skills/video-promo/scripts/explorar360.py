import asyncio
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
B='https://constructoras.apzsoftware.online/recorridos/unidad-a/'
PUNTOS=['ingreso','living','cocina','pasillo','dormitorio','principal-entrada','principal']
PASOS=8; DRAG=240
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(channel='chrome',headless=False,args=['--window-position=-1920,0','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--disable-features=CalculateNativeWinOcclusion'])
    pg=await b.new_page(viewport={'width':1920,'height':1080})
    filas=[]
    for pt in PUNTOS:
      await pg.goto(B+pt, wait_until='networkidle'); await pg.wait_for_timeout(3500)
      await pg.mouse.move(960,540)
      for _ in range(12): await pg.mouse.wheel(0,200); await pg.wait_for_timeout(60)
      await pg.wait_for_timeout(800)
      fila=Image.new('RGB',(320*PASOS,180))
      for i in range(PASOS):
        await pg.screenshot(path='_e.jpg',type='jpeg',quality=80)
        im=Image.open('_e.jpg').resize((320,180)); ImageDraw.Draw(im).text((4,4),f'{pt} {i}',fill='red'); fila.paste(im,(320*i,0))
        await pg.mouse.move(1200,540); await pg.mouse.down()
        for k in range(20): await pg.mouse.move(1200-DRAG*(k+1)/20,540); await pg.wait_for_timeout(15)
        await pg.mouse.up(); await pg.wait_for_timeout(900)
      filas.append(fila)
    await b.close()
  out=Image.new('RGB',(320*PASOS,180*len(filas)))
  for i,f in enumerate(filas): out.paste(f,(0,180*i))
  out.save('explorar360.jpg',quality=85)
asyncio.run(main())
