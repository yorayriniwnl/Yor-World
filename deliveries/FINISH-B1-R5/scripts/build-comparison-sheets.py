from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];REPO=ROOT.parents[1]
def fit(path,size,bg=(24,26,35)):
 im=Image.open(path).convert("RGB");im.thumbnail(size,Image.Resampling.LANCZOS);c=Image.new("RGB",size,bg);c.paste(im,((size[0]-im.width)//2,(size[1]-im.height)//2));return c
font=ImageFont.load_default();label_h=32
reference=ROOT/"inputs/finish-35/source-inputs/references/images/main-reference.png"
items=[("Main reference",reference),("Pinned R4-02",ROOT/"inputs/r4/captures/R4/desktop-home/webgl-canvas.png"),("FINISH-B1-R5",ROOT/"captures/R5/desktop-home/webgl-canvas.png")]
w,h=640,360;sheet=Image.new("RGB",(w*3,h+label_h),(18,20,28));d=ImageDraw.Draw(sheet)
for i,(label,path) in enumerate(items):x=i*w;d.text((x+10,8),label,fill=(245,245,250),font=font);sheet.paste(fit(path,(w,h)),(x,label_h))
sheet.save(ROOT/"evidence/visual-comparison.png",optimize=True)
items=[("Pinned R4-02 mobile",ROOT/"inputs/r4/captures/R4/mobile-home/webgl-canvas.png"),("FINISH-B1-R5 mobile",ROOT/"captures/R5/mobile-home/webgl-canvas.png")]
w,h=360,640;sheet=Image.new("RGB",(w*2,h+label_h),(18,20,28));d=ImageDraw.Draw(sheet)
for i,(label,path) in enumerate(items):x=i*w;d.text((x+10,8),label,fill=(245,245,250),font=font);sheet.paste(fit(path,(w,h)),(x,label_h))
sheet.save(ROOT/"evidence/mobile-comparison.png",optimize=True)
print("PASS: comparison sheets rebuilt from archived reference, R4 baseline and R5 capture hashes")
