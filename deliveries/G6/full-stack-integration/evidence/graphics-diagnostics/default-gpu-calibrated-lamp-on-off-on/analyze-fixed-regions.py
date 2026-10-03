from PIL import Image, ImageChops
from pathlib import Path
import json
root=Path(r"C:\Users\yoray\AppData\Local\Temp\yor-world-calibrated-lamp-visual-retry-2e5b71d219424e39ae038dcae94ef367")
regions={"upper-wall-shelf":(0,30,340,290),"left-desk-drawers":(20,395,290,630),"front-left-floor":(5,575,285,639),"monitor-and-back-wall":(120,260,310,395)}
result={"scope":"Fixed non-avatar ROI pixel comparison of actual production bitmaps. Stationary camera; avatar continues animation. No claim of pixel-identical scene or lamp acceptance.","comparisons":[]}
for tier in ("high","low"):
 images={phase:Image.open(root/f"{tier}-home-lamp-{phase}-canvas-bitmap.png").convert("RGB") for phase in ("on-1","off-2","on-3")}
 for pair in (("on-1","off-2"),("off-2","on-3"),("on-1","on-3")):
  diff=ImageChops.difference(images[pair[0]],images[pair[1]])
  for name,box in regions.items():
   pixels=list(diff.crop(box).getdata()); changed=sum(any(pixel) for pixel in pixels)
   result["comparisons"].append({"tier":tier,"pair":pair,"region":name,"box":box,"pixels":len(pixels),"changedPixels":changed,"maxChannelDifference":max(max(pixel) for pixel in pixels),"meanAbsoluteChannelDifference":sum(sum(pixel) for pixel in pixels)/(len(pixels)*3)})
(root/"fixed-region-comparison.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
for row in result["comparisons"]:
 print(json.dumps(row))