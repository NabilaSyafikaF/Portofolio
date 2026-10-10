# Portofolio NabilaXP

Portofolio interaktif bergaya Windows XP untuk **Nabila Syafika Firdaus**.
Seluruh isi (profil, pengalaman, pendidikan, keahlian, dan kontak) diambil dari resume terbaru.
Dibuat dengan Python (server) + HTML, CSS, dan JavaScript tanpa kerangka kerja.

## Menjalankan

```bash
python3 server.py
```

Lalu buka <http://localhost:8123>

Opsi lain:

```bash
python3 server.py --port 9000
python3 server.py --host 0.0.0.0   # bisa dibuka dari HP di Wi-Fi yang sama
```

## Struktur

- `server.py` - server statis kecil, tanpa dependensi (Python 3 saja)
- `site/` - seluruh situs
  - `index.html` - struktur, ikon SVG, dan template tiap jendela
  - `assets/style.css` - tema Luna (Windows XP) dan tema Klasik
  - `assets/app.js` - logika desktop: boot, jendela, terminal, tur Mochi, tema
  - `assets/img/` - foto, Mochi, wallpaper, favicon

## Isi konten

- Kontak sudah aktif dan bisa diklik: email, telepon/WhatsApp, dan lokasi Rangkasbitung.
- Untuk memperbarui data, sunting `site/index.html` pada bagian:
  - `tpl-about` (profil), `tpl-exp` (pengalaman kerja), `tpl-edu` (pendidikan & keahlian), `tpl-contact` (kontak)

## Pintasan tautan

- `?screen=desktop` - langsung ke desktop (melewati layar boot)
- `?open=about` - buka jendela tertentu: `about`, `exp`, `edu`, `contact`, `terminal`, `recycle`, `photo`, `display`, `help`
- `?tab=edu-skill` - pilih tab tertentu saat jendela dibuka
- `?quiet=1` - tanpa sapaan Mochi

## Publikasi ke GitHub Pages

Repositori ini sudah menyertakan alur kerja otomatis (`.github/workflows/pages.yml`) yang menerbitkan folder `site/` ke GitHub Pages setiap kali ada push ke branch `main`.

1. Buat repositori baru di <https://github.com/new> (nama bebas, misalnya `portofolio-nabila`). Untuk akun gratis, pilih **Public** karena GitHub Pages pada repositori privat butuh paket berbayar.
2. Dari folder ini, sambungkan dan kirim:

```bash
git remote add origin https://github.com/USERNAME/portofolio-nabila.git
git push -u origin main
```

3. Di GitHub, buka **Settings > Pages**, lalu pada **Build and deployment** pilih **Source: GitHub Actions**.
4. Tunggu alur kerja "Deploy ke GitHub Pages" selesai (tab Actions). Situs tayang di:

```
https://USERNAME.github.io/portofolio-nabila/
```

Catatan: jangan aktifkan "Deploy from a branch" karena yang diterbitkan adalah folder `site/`, bukan akar repositori. Alur kerja Actions sudah mengurusnya.
