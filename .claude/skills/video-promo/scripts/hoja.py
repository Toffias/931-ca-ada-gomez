import subprocess, sys, glob, os, json
from PIL import Image, ImageDraw
# tira de N cuadros por clip, rotulados con el segundo
import os
DIR=os.environ.get('DIR','clips'); CW,CH=(160,284) if DIR!='clips' else (480,270)
N=int(sys.argv[1]) if len(sys.argv)>1 else 6
nombres=sys.argv[2:] or [os.path.basename(f)[:-4] for f in sorted(glob.glob(DIR+'/*.mp4'))]
filas=[]
for n in nombres:
  d=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'{DIR}/{n}.mp4']))
  fila=Image.new('RGB',(CW*N,CH))
  for i in range(N):
    t=d*(i+.5)/N
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(t),'-i',f'{DIR}/{n}.mp4','-frames:v','1','-vf',f'scale={CW}:{CH}','_f.jpg'])
    im=Image.open('_f.jpg'); ImageDraw.Draw(im).text((8,8),f'{n} {t:.1f}s',fill='red'); fila.paste(im,(CW*i,0))
  filas.append(fila)
out=Image.new('RGB',(CW*N,CH*len(filas)))
for i,f in enumerate(filas): out.paste(f,(0,CH*i))
out.save('hoja_clips.jpg',quality=80)
