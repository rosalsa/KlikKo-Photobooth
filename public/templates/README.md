# Cara menambahkan template sendiri

1. Buat template **PNG** dengan bagian foto **transparan** (lubang). Dekorasi/frame/teks ada di bagian yang tidak transparan.
   - Jumlah lubang = jumlah foto: **2**, **3**, **4**, atau **6**.
   - Lubang boleh berbentuk persegi/rounded. Urutan foto otomatis: atas → bawah, kiri → kanan.
2. Taruh file PNG di folder ini (`public/templates/`).
3. Daftarkan di `manifest.json`:

```json
{
  "replaceBuiltin": true,
  "templates": [
    { "name": "Pinky 3", "src": "pinky-3.png" },
    { "name": "Squad 6", "src": "squad-6.png", "slots": 6 }
  ]
}
```

- Jumlah slot **terdeteksi otomatis** dari lubang transparan. `slots` hanya opsional (untuk validasi).
- Kalau deteksi kurang pas, tentukan sendiri area foto (piksel pada gambar asli):
  `"photoSlots": [{ "x": 50, "y": 150, "w": 620, "h": 400 }, ...]`
- `replaceBuiltin: true` menyembunyikan template bawaan untuk ukuran yang sudah punya template kamu.
- Template muncul otomatis sesuai jumlah slot yang dipilih pengguna.

## Cara cepat (disarankan): pakai skrip

Susun frame dalam folder bernama sesuai jumlah slot, lalu jalankan skrip:

```
frame/Frame 2/11.png      (2 foto)
frame/Frame 3/12.png ...  (3 foto)
frame/Frame 4/8.png ...   (4 foto)
frame/Frame 6/6.png ...   (6 foto)
```

```
python3 scripts/build-frames.py frame public/templates
```

Skrip mendeteksi lubang transparan, memperkecil gambar, dan menulis `manifest.json` otomatis.
Atur nama tampil dan urutan di `NAMES` / `ORDER` pada `scripts/build-frames.py`.

## Frame K-Pop (folder `kpop/`)

Frame K-Pop beda dengan frame biasa: sosok idol adalah bagian **tidak transparan** di dalam jendela foto.
Foto user ditaruh di belakang frame, dan potongan idol ditampilkan di kamera sebagai panduan pose.
Frame dikelompokkan otomatis (3 atau 4 foto) dan dibaca dari `public/templates/kpop/manifest.json`.

```
python3 scripts/build-kpop.py "<folder frame kpop>" public/templates/kpop
```

Untuk memberi nama idol/grup pada tiap frame, isi `NAMES` di `scripts/build-kpop.py`, contoh:
`NAMES = {"1": "Nama Idol A", "2": "Nama Idol B"}` (kunci = nomor file), lalu jalankan skrip lagi.
