# 👻 Ghost Profile — Stealth Fingerprint Spoofing Extension

> **Advanced Fingerprint Protection & Diagnostic Console for Chromium & Mozilla Firefox**

Ghost Profile is a privacy and security extension that implements **deterministic, cross-layer consistent stealth fingerprint spoofing**. Instead of faking user-agent strings (which triggers detection flags on anti-bot systems like Cloudflare, Kasada, DataDome, and FingerprintJS), Ghost Profile keeps real browser versions while mathematically perturbing rendering layers, hardware parameters, and network locales.

---

## 📦 Repositori & Paket Ekstensi

This repository contains two dedicated versions:

1. **[`ghost-profile/`](./ghost-profile)**: For **Google Chrome, Microsoft Edge, Brave, and Opera** (built with Chrome Side Panel API & Manifest V3).
2. **[`ghost-profile-firefox/`](./ghost-profile-firefox)**: For **Mozilla Firefox, Firefox Developer Edition, and LibreWolf** (built with Firefox Sidebar Action API & Gecko Manifest V3).

---

## ✨ Fitur Utama (Core Features)

* **Canvas Fingerprint Perturbation**: Deterministic Mulberry32 pseudo-random noise injected into `toDataURL()`, `getImageData()`, and `toBlob()`.
* **WebGL Spoofing**: Custom GPU vendor & unmasked renderer strings with realistic device tiers.
* **AudioContext Deep Protection**: 6-layer noise injection into audio buffers, analyser frequency data, and oscillator pipelines.
* **Font Enumeration Noise**: Micro-metric perturbations on `measureText()` bounding boxes.
* **Timezone Selector**: 118 worldwide timezones with synchronized UTC offset and `Intl.DateTimeFormat` constructor spoofing.
* **Browser Language Selector**: 46 global language presets (including `ru-RU`, `id-ID`, `ja-JP`, `zh-CN`, `en-US`, `de-DE`, etc.) with natural fallback chains.
* **Hardware & Screen Masking**: Spoofed CPU cores, RAM memory, display resolution, DPR, and color depth.
* **WebRTC Leak Guard**: Strips ICE servers to prevent local IP leakage.
* **Data Vault (JSON Export/Import)**: Export and import complete identity configurations with a 16-character deterministic `fingerprintHash`.
* **Side Panel & Sidebar UX**: Native docking on Chrome Side Panel and Firefox Sidebar with sticky headers/footers.
* **100% Bilingual & Dual Theme**: Seamless switching between pure Indonesian (ID) and pure English (EN), with Dark and Light mode support.

---

## 🚀 Panduan Instalasi (Installation Guide)

### 1. Chrome / Edge / Brave (Chromium)
1. Download `ghost-profile-chromium-v3.1.0.zip` from [Releases](https://github.com/reponame/releases) and extract it.
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted `ghost-profile` folder.
4. Click the Ghost Profile icon in the toolbar to open the Side Panel.

### 2. Mozilla Firefox
1. Download `ghost-profile-firefox-v3.1.0.zip` from [Releases](https://github.com/reponame/releases) and extract it.
2. Open `about:debugging#/runtime/this-firefox`.
3. Under **Temporary Extensions**, click **Load Temporary Add-on...**.
4. Select `manifest.json` inside the `ghost-profile-firefox` folder.
5. Click the Ghost Profile toolbar icon to open the native Firefox Sidebar.

---

## 📄 Lisensi (License)
MIT License — Copyright (c) 2026 Ghost Profile Security Research.
