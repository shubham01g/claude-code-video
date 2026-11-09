"""Screenshot a real web page (or a local .html) for reel graphics with headless Chrome.

usage: webshot.py OUT.png URL_OR_FILE [--size 1400,1000] [--crop x0,y0,x1,y1]
  OUT goes to YouTube/assets/ig/ by convention (reel.json src "ig/<name>.png").
  Crop close to portrait (~1250x830 or taller) — landscape shots look small in the full layout.
  Check every shot: cookie banners and animated heroes (blank first frame) need a crop or a retry.
"""
import argparse
import subprocess
from pathlib import Path

from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("url")
ap.add_argument("--size", default="1400,1000")
ap.add_argument("--crop")
a = ap.parse_args()

url = a.url if a.url.startswith(("http://", "https://", "file:")) else Path(a.url).resolve().as_uri()
out = Path(a.out).resolve()
out.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                f"--window-size={a.size}", "--virtual-time-budget=8000", f"--screenshot={out}", url],
               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
if a.crop and out.exists():
    Image.open(out).crop(tuple(int(v) for v in a.crop.split(","))).save(out)
print(out, Image.open(out).size if out.exists() else "FAILED")
