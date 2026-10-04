from pathlib import Path
from PIL import Image
import json,struct,zlib,hashlib
p=Path(__file__).parent/'fixtures'; b=bytearray((p/'animated.png').read_bytes()); chunks=[];o=8
while o+12<=len(b):
 n=struct.unpack('>I',b[o:o+4])[0];t=bytes(b[o+4:o+8]).decode();chunks.append({'type':t,'length':n,'offset':o})
 if t=='fdAT':
  b[o+12:o+8+n]=b'\xff'*(n-4);b[o+8+n:o+12+n]=struct.pack('>I',zlib.crc32(b[o+4:o+8+n]))
 o+=n+12
(p/'corrupt-second-frame.png').write_bytes(b)
im=Image.open(p/'animated.png'); frames=[]
for i in range(im.n_frames):im.seek(i);frames.append(hashlib.sha256(im.convert('RGBA').tobytes()).hexdigest())
try:
 bad=Image.open(p/'corrupt-second-frame.png');bad.seek(1);bad.load();error='none'
except Exception as e:error=str(e)
out={'validFrames':im.n_frames,'framePixelHashes':frames,'chunks':chunks,'corruptSecondFramePillowError':error}
(Path(__file__).parent/'apng-details.json').write_text(json.dumps(out,indent=2));print(json.dumps(out,indent=2))
