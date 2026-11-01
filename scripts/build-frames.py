"""Proses frame PNG -> public/templates (WebP ringan + thumbnail) + manifest.json.

Struktur folder input (nama folder = jumlah slot foto):
    <folder-frame>/Frame 2/*.png   (2 foto)
    <folder-frame>/Frame 3/*.png   (3 foto)
    <folder-frame>/Frame 4/*.png   (4 foto)
    <folder-frame>/Frame 6/*.png   (6 foto)

Pakai: python3 scripts/build-frames.py <folder-frame> <folder-output>
Lubang foto = bagian transparan pada PNG. Jumlah lubang harus sama dengan nama folder.
Edit NAMES / ORDER di bawah untuk mengatur nama dan urutan tampil."""
import sys, json, os, re, glob
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in glob.glob(f"{out}/frame-*.webp"): os.remove(f)

# nama file (tanpa .png) -> nama tampil
NAMES = {
  "11": "Memory Ticket",
  "12": "Relax Teal", "9": "Golden Hearts", "13": "Memory Report", "15": "Denim Bow",
  "10": "Archive Pink", "2": "Breaking News",
  "8": "Cute Yellow", "14": "Friendship Ovals",
  "6": "Groovy Happiness", "1": "Boarding Pass", "3": "Lovely Day",
  "4": "Happy Moment", "5": "Groovy Days", "7": "OMG Duo",
}
# urutan tampil per jumlah slot (yang tidak disebut ditaruh di belakang)
ORDER = {3: ["12", "9", "13", "15", "10", "2"], 6: ["6", "1", "3", "4", "5", "7"]}
MAX_H = 2400
PAD = 3

entries = []
for folder in sorted(glob.glob(f"{src}/*/")):
    m = re.search(r"(\d+)\s*/?$", folder.rstrip("/"))
    if not m: continue
    n = int(m.group(1))
    files = {os.path.splitext(os.path.basename(p))[0]: p for p in glob.glob(f"{folder}/*.png")}
    order = [k for k in ORDER.get(n, []) if k in files] + sorted(k for k in files if k not in ORDER.get(n, []))
    for key in order:
        im = Image.open(files[key]).convert("RGBA")
        k = min(1.0, MAX_H / im.height)
        if k < 1: im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        W, H = im.size
        lab, _ = ndimage.label(np.array(im.split()[3]) < 40)
        boxes = []
        for i, sl in enumerate(ndimage.find_objects(lab), 1):
            cnt = (lab[sl] == i).sum(); h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
            if cnt >= W * H * 0.012 and w * h < W * H * 0.85:
                x0, y0 = max(0, sl[1].start - PAD), max(0, sl[0].start - PAD)
                boxes.append({"x": x0, "y": y0, "w": min(W, sl[1].stop + PAD) - x0, "h": min(H, sl[0].stop + PAD) - y0})
        boxes.sort(key=lambda b: b["y"] + b["h"] / 2)
        rows = []
        for b in boxes:
            for r in rows:
                if abs(r[0]["y"] + r[0]["h"] / 2 - (b["y"] + b["h"] / 2)) < r[0]["h"] * 0.5: r.append(b); break
            else: rows.append([b])
        rects = [b for r in rows for b in sorted(r, key=lambda b: b["x"])]
        if len(rects) != n:
            print(f"SKIP {key}.png: folder {n} foto tapi terdeteksi {len(rects)} lubang"); continue
        name = NAMES.get(key, f"Frame {key}")
        im.save(f"{out}/frame-{key}.webp", "WEBP", quality=92, alpha_quality=100, method=6)
        th = im.copy(); th.thumbnail((360, 540)); th.save(f"{out}/frame-{key}-thumb.webp", "WEBP", quality=85, alpha_quality=100)
        entries.append({"id": f"frame-{key}", "name": name, "slots": n, "src": f"frame-{key}.webp",
                        "thumb": f"frame-{key}-thumb.webp", "width": W, "height": H, "photoSlots": rects})
        print(f"OK {n} foto  {key}.png  {name}  {W}x{H}")
entries.sort(key=lambda e: e["slots"])
json.dump({"replaceBuiltin": True, "templates": entries}, open(f"{out}/manifest.json", "w"), indent=1)
