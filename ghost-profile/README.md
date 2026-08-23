# 👻 Ghost Profile — Panduan Penggunaan (Chrome / Chromium)

Ghost Profile adalah ekstensi browser untuk penyamaran sidik jari (*stealth fingerprint spoofing*) tingkat lanjut. Menggunakan arsitektur **Stealth Mode** yang menyamarkan parameter hardware dan rendering tanpa merusak konsistensi versi browser, sehingga bebas dari flag deteksi anti-bot (seperti Cloudflare, Kasada, DataDome, FingerprintJS, CreepJS).

---

## 🚀 1. Cara Instalasi / Pemasangan di Chrome / Edge / Brave

1. Buka browser **Google Chrome**, **Microsoft Edge**, atau **Brave**.
2. Masuk ke halaman pengelolaan ekstensi:
   * **Chrome / Brave**: Ketik URL `chrome://extensions` di address bar.
   * **Edge**: Ketik URL `edge://extensions` di address bar.
3. Aktifkan **"Developer mode"** (Mode Pengembang) melalui switch di pojok kanan atas.
4. Klik tombol **"Load unpacked"** (*Muat yang belum dibongkar*).
5. Pilih folder: `ghost-profile` (folder ekstensi ini).
6. Ekstensi **Ghost Profile** akan langsung terpasang dan muncul di toolbar browser.
7. *(Opsional)* Klik ikon pin 📌 pada menu ekstensi browser agar ikon Ghost Profile selalu muncul di toolbar.

---

## 🖥️ 2. Cara Membuka & Menggunakan Panel Samping (Side Panel)

* **Membuka Panel**: Cukup **klik ikon Ghost Profile** di toolbar browser. Ekstensi akan otomatis terbuka sebagai **Side Panel** nempel di sisi kanan window tanpa menutupi halaman web Anda.
* **Master Switch**: Tombol switch di pojok kanan atas header berfungsi untuk mengaktifkan / menonaktifkan seluruh proteksi ekstensi secara instan.

---

## 🎲 3. Cara Menghasilkan Identitas Baru (*Randomize & Apply*)

1. Buka panel Ghost Profile.
2. Klik tombol utama di bagian bawah: **"Acak & Terapkan"** (*Randomize & Apply*).
3. Ekstensi akan mengacak:
   * GPU Renderer WebGL (NVIDIA, AMD, Intel)
   * Resolusi Layar & DPR
   * CPU Cores & RAM Memory
   * Noise Seed Canvas, Audio, & Font
   * Zona Waktu & Bahasa (jika tidak dikunci)
4. Halaman web yang aktif akan otomatis dimuat ulang (*reload*) dengan identitas baru yang aktif secara deterministik.
5. *(Opsi)* Centang toggle **"Muat ulang semua tab terbuka"** jika ingin menerapkan identitas baru ke seluruh tab browser sekaligus.

---

## 🌐 4. Cara Mengunci Bahasa Browser (Language Selector)

1. Pada panel, scroll ke **Kategori 3: JARINGAN & LINGKUNGAN**.
2. Klik baris **"Bahasa Browser"** (atau klik kotak *Bahasa* pada Kartu Identitas atas).
3. Panel selektor bahasa akan terbuka:
   * **Pencarian**: Ketik nama negara/bahasa (contoh: `Russian`, `ru`, `Indonesian`, `Japan`, `Germany`).
   * **Tab Wilayah**: Pilih kategori *Semua*, *Asia*, *Eropa*, *Amerika*, atau *Afrika & Timteng*.
4. Klik bahasa yang diinginkan (contoh: `Russian (ru-RU, ru, en)`).
5. Status pill akan berubah menjadi hijau: `ru-RU ▸`.
6. Klik tombol **"Acak & Terapkan"** di bawah. Browser akan selalu menggunakan bahasa pilihan Anda tersebut.
7. **Reset ke Acak**: Buka kembali panel bahasa dan klik tombol **"Acak"** (*Random*).

---

## ⏰ 5. Cara Mengunci Zona Waktu (Timezone Selector)

1. Pada panel, klik baris **"Zona Waktu"** (atau klik kotak *Zona Waktu* pada Kartu Identitas atas).
2. Panel 118 zona waktu dunia akan terbuka:
   * Cari kota tujuan (contoh: `Tokyo`, `London`, `New York`, `Jakarta`).
3. Klik kota yang dipilih. Status pill akan berubah menjadi hijau (contoh: `Tokyo ▸`).
4. Klik **"Acak & Terapkan"**. Offset UTC dan `Intl.DateTimeFormat` akan terkunci ke zona waktu tersebut.

---

## 💾 6. Fitur Data Vault (Salin & Impor JSON)

Di bagian paling bawah panel terdapat menu **DATA SIDIK JARI**:

* **Salin JSON (Export)**:
  * Klik tombol **"Salin JSON"**.
  * Seluruh profil aktif (termasuk `fingerprintHash`, seed noise canvas/audio/font, WebGL GPU, resolusi layar, bahasa, timezone) akan disalin ke clipboard Anda dalam format JSON standar.
* **Impor Profil (Import)**:
  * Klik **"Impor Profil"**.
  * Tempelkan (*paste*) JSON profil yang sebelumnya disimpan ke kolom teks.
  * Klik **"Terapkan Sidik Jari"**.
  * Identitas browser Anda akan langsung berubah 100% identik dengan data JSON tersebut (sangat berguna untuk melanjutkan sesi dengan fingerprint yang sama persis).

---

## 🎨 7. Kontrol Tampilan & Bahasa UI

* **Ganti Bahasa Tampilan (EN / ID)**: Klik pill `EN / ID` di header untuk beralih antara 100% Bahasa Indonesia dan 100% Bahasa Inggris.
* **Mode Gelap / Terang**: Klik ikon Bulan 🌙 / Matahari ☀️ di header untuk beralih tema Dark Mode / Light Mode.

---

## 🛡️ 8. Ringkasan Modul Proteksi

1. **Spesifikasi Perangkat (`ua`)**: Menyamarkan CPU core, RAM memory, dan preferensi platform.
2. **Layar & Tampilan (`screen`)**: Memanipulasi resolusi layar, availWidth/Height, kedalaman warna, dan DPR.
3. **Perangkat Media (`mediaDevices`)**: Mengacak daftar dan ID perangkat mikrofon & webcam.
4. **Estimasi Penyimpanan (`storage`)**: Memodifikasi kuota penyimpanan `navigator.storage.estimate()`.
5. **Sidik Jari Canvas (`canvas`)**: Injeksi pixel-noise deterministik (Mulberry32) pada `toDataURL` / `getImageData` → menghasilkan Canvas Hash unik.
6. **Sidik Jari WebGL (`webgl`)**: Memanipulasi vendor GPU dan unmasked renderer string.
7. **AudioContext Mendalam (`audio`)**: Injeksi 6 lapis noise pada analyser, buffer, & osilator → menghasilkan Audio Hash unik.
8. **Noise Deteksi Font (`fonts`)**: Perturbasi mikro `measureText()` `±0.01px` → menghasilkan Font Hash unik.
9. **Zona Waktu (`timezone`)**: Menyamarkan offset UTC & constructor `Intl.DateTimeFormat`.
10. **Bahasa Browser (`language`)**: Menyamarkan `navigator.languages` dan tag locale.
11. **Proteksi WebRTC (`webrtc`)**: Menghapus ICE servers untuk mencegah kebocoran IP lokal asli.
12. **CSS matchMedia (`matchMedia`)**: Menyelaraskan preferensi tema `prefers-color-scheme`.
13. **Proteksi Tambahan (`misc`)**: Menyamarkan flag `navigator.webdriver` dan plugin array.
