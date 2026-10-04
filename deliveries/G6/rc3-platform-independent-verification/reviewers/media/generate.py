from PIL import Image, features
from pathlib import Path
import json, struct, zlib, hashlib
p=Path(__file__).parent/'fixtures'; p.mkdir(exist_ok=True)
im=Image.new('RGBA',(37,29)); im.putdata([(x*7%256,y*11%256,(x+y)*13%256,(x*9+y*3)%256) for y in range(29) for x in range(37)])
im.save(p/'rgba.png'); im.convert('RGB').save(p/'baseline.jpg',quality=87); im.convert('RGB').save(p/'progressive.jpg',progressive=True,quality=82)
im.convert('RGB').save(p/'lossy.webp',quality=77); im.save(p/'lossless.webp',lossless=True); im.save(p/'alpha.webp',quality=73)
for name,size in [('axis-ok',(8192,1)),('axis-bad',(1,8193)),('pixels-ok',(4096,4096)),('pixels-bad',(4096,4097))]: Image.new('L',size,42).save(p/(name+'.png'))
im.save(p/'animated.png',save_all=True,append_images=[Image.new('RGBA',im.size,'red')],duration=100,loop=0)
im.save(p/'animated.webp',save_all=True,append_images=[Image.new('RGBA',im.size,'red')],duration=100,loop=0)
png=(p/'rgba.png').read_bytes(); (p/'missing-iend.png').write_bytes(png[:-12]); corrupt=bytearray(png); corrupt[29]^=1; (p/'crc.png').write_bytes(corrupt)
zero=bytearray(png); zero[16:20]=struct.pack('>I',0); zero[29:33]=struct.pack('>I',zlib.crc32(zero[12:29])); (p/'zero.png').write_bytes(zero)
for name in ['rgba.png','baseline.jpg','progressive.jpg','lossy.webp','lossless.webp','alpha.webp']:
 b=(p/name).read_bytes(); (p/('truncated-'+name)).write_bytes(b[:int(len(b)*.8)])
j=bytearray((p/'baseline.jpg').read_bytes()); pos=j.index(b'\xff\xda'); j[pos+2:pos+4]=b'\xff\xff'; (p/'scan.jpg').write_bytes(j)
w=bytearray((p/'lossy.webp').read_bytes()); w[20:30]=b'\xff'*10; (p/'body.webp').write_bytes(w)
w=bytearray((p/'alpha.webp').read_bytes()); w[4:8]=struct.pack('<I',len(w)+2); (p/'riff.webp').write_bytes(w)
manifest={'generator':'Pillow '+Image.__version__,'webp':features.version('webp'),'files':[{ 'name':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sorted(p.iterdir())]}
(p/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps(manifest,indent=2))
