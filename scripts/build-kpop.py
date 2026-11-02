"""Proses frame K-Pop -> public/templates/kpop (WebP + thumbnail + manifest.json).

Pakai: python3 scripts/build-kpop.py "<folder frame kpop>" public/templates/kpop

Catatan: pada frame K-Pop sosok idol adalah bagian TIDAK transparan di dalam jendela foto.
Foto user ditaruh di belakang frame, jadi user berpose di sisi yang kosong.
Posisi jendela dihitung dari gabungan semua frame yang layout-nya sama, supaya tidak menyempit
saat tangan/rambut idol menyentuh tepi jendela.

Edit NAMES untuk memberi nama idol/grup (kunci = nomor file tanpa .png)."""
import sys, os, re, glob, json
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for f in glob.glob(f"{out}/kpop-*.webp"): os.remove(f)

NAMES = {}  # contoh: {"1": "Nama Idol", "2": "Nama Idol"}; default "Frame 01", "Frame 02", ...
PAD = 3

def holes(im):
    a = np.array(im.split()[3]); H, W = a.shape
    lab, _ = ndimage.label(a < 40); boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        cnt = (lab[sl] == i).sum(); h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if cnt >= W * H * 0.012 and w * h < W * H * 0.85:
            boxes.append([sl[1].start, sl[0].start, sl[1].stop, sl[0].stop])
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    return boxes

files = sorted(glob.glob(f"{src}/*.png"), key=lambda p: int(re.search(r"(\d+)", os.path.basename(p)).group(1)))
frames = []
for p in files:
    im = Image.open(p).convert("RGBA"); frames.append((os.path.splitext(os.path.basename(p))[0], im, holes(im)))

# kelompokkan frame menurut jumlah jendela, gabungkan kotak per urutan -> jendela penuh
union = {}
for key, im, b in frames:
    n = len(b)
    if n not in union: union[n] = [list(x) for x in b]
    else:
        for i, x in enumerate(b):
            u = union[n][i]; u[0] = min(u[0], x[0]); u[1] = min(u[1], x[1]); u[2] = max(u[2], x[2]); u[3] = max(u[3], x[3])

entries = []
for key, im, b in frames:
    n = len(b); W, H = im.size
    rects = []
    for u in union[n]:
        x0, y0 = max(0, u[0] - PAD), max(0, u[1] - PAD)
        rects.append({"x": x0, "y": y0, "w": min(W, u[2] + PAD) - x0, "h": min(H, u[3] + PAD) - y0})
    num = int(re.search(r"(\d+)", key).group(1))
    fid = f"kpop-{num:02d}"
    im.save(f"{out}/{fid}.webp", "WEBP", quality=95, alpha_quality=100, method=6)
    th = im.copy(); th.thumbnail((300, 900)); th.save(f"{out}/{fid}-thumb.webp", "WEBP", quality=88, alpha_quality=100)
    entries.append({"id": fid, "name": NAMES.get(str(num), f"Frame {num:02d}"), "slots": n, "src": f"{fid}.webp",
                    "thumb": f"{fid}-thumb.webp", "width": W, "height": H, "photoSlots": rects})
    print(f"OK {key}.png -> {fid}  {n} foto  {W}x{H}")
json.dump({"templates": entries}, open(f"{out}/manifest.json", "w"), indent=1, ensure_ascii=False)
