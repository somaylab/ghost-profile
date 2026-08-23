# 👻 Ghost Profile — Stealth Fingerprint Spoofing Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Gecko Compatible](https://img.shields.io/badge/Firefox-Gecko%20Compatible-orange.svg)](https://addons.mozilla.org/)
[![Version](https://img.shields.io/badge/Version-3.1.0-brightgreen.svg)](https://github.com/somaylab/ghost-profile/releases)

> **Advanced Cross-Layer Fingerprint Protection & Stealth Diagnostic Console for Chromium & Mozilla Firefox**

**Ghost Profile** is a next-generation browser privacy extension designed for offensive security research and defensive hardening. Unlike naive spoofers that modify the User-Agent header (triggering immediate entropy anomalies on modern anti-bot engines like Cloudflare, Kasada, DataDome, and FingerprintJS), Ghost Profile enforces **cross-layer consistency** by keeping real browser engines intact while mathematically perturbing rendering layers, hardware properties, and network locales.

---

## 📦 Repository Structure

This repository provides two standalone, dedicated builds tailored for each browser engine:

| Directory | Target Browsers | Architecture |
| :--- | :--- | :--- |
| **[`ghost-profile/`](./ghost-profile)** | **Google Chrome, Microsoft Edge, Brave, Opera** | Chrome Side Panel API (`manifest.json` MV3) |
| **[`ghost-profile-firefox/`](./ghost-profile-firefox)** | **Mozilla Firefox, Firefox Dev Edition, LibreWolf** | Firefox Sidebar Action API (`manifest.json` Gecko MV3) |

---

## ✨ Core Protection Modules

### 1. 🎨 Canvas Fingerprint Perturbation
* Injects deterministic, seed-controlled micro-noise via **Mulberry32 PRNG** into `toDataURL()`, `getImageData()`, and `toBlob()`.
* Generates a completely unique, consistent canvas hash per profile without causing visual artifacts.

### 2. 🎮 WebGL & GPU Spoofing
* Replaces unmasked GPU vendor and unmasked renderer strings with realistic device tiers (NVIDIA GeForce RTX series, AMD Radeon RX, Apple Silicon M-series, Intel Iris Xe / Arc).

### 3. 🔊 Deep AudioContext Protection
* Perturbs audio frequency response, buffer channels, and oscillator waveforms across 6 discrete layers to randomize Audio Fingerprint signatures deterministically.

### 4. 🔤 Font Enumeration Noise
* Injects micro-metric perturbations into `CanvasRenderingContext2D.prototype.measureText()` (`±0.01px`), mitigating font detection and enumeration scripts.

### 5. 🌐 Locale & Timezone Synchronization
* **Timezone Selector**: 118 worldwide timezones with synchronized UTC offsets and `Intl.DateTimeFormat` constructors.
* **Browser Language Selector**: 46 global language presets (including `en-US`, `ru-RU`, `id-ID`, `ja-JP`, `de-DE`, `zh-CN`, etc.) with natural fallback chains.

### 6. 🛡️ WebRTC & Device Masking
* **WebRTC Leak Guard**: Strips ICE candidate servers to prevent local/private IP disclosure.
* **Hardware Properties**: Spoofs CPU cores (`hardwareConcurrency`), RAM memory (`deviceMemory`), display resolution, and DPR (`devicePixelRatio`).
* **Media Devices**: Generates realistic random microphone and webcam device IDs.

### 7. 🔐 Data Vault & Fingerprint Hash
* **Export / Import JSON**: Copy and paste raw identity configurations with an attached 16-hex deterministic `fingerprintHash` for reproducibility.

### 8. ⚡ Modern Side Panel / Sidebar UX
* Responsive flex layout with sticky headers and action footers.
* Dynamic SVG Waveform visualizer representing **Signal → Noise** entropy.
* 100% Bilingual UI (English & Indonesian) and Dual Theme (Dark Mode & Light Mode).

---

## 🚀 Installation & Quick Start

### 🌐 Google Chrome / Chromium Browsers (Brave, Edge, Opera)
1. Download `ghost-profile-chromium-v3.1.0.zip` from [Releases](https://github.com/somaylab/ghost-profile/releases/latest) and extract it.
2. Navigate to `chrome://extensions` in your browser address bar.
3. Enable **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the extracted `ghost-profile` directory.
5. Click the **Ghost Profile** icon in your toolbar to open the Side Panel.

### 🦊 Mozilla Firefox Browsers (LibreWolf, Firefox Dev Edition)
1. Download `ghost-profile-firefox-v3.1.0.zip` from [Releases](https://github.com/somaylab/ghost-profile/releases/latest) and extract it.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Under **Temporary Extensions**, click **Load Temporary Add-on...**.
4. Select `manifest.json` inside the `ghost-profile-firefox` directory.
5. Click the **Ghost Profile** toolbar icon to toggle the native Firefox Sidebar.

---

## 📖 Usage Instructions

1. **Generate New Identity**: Open the panel and click **"Randomize & Apply"** (*Acak & Terapkan*). The active tab will reload with the new profile.
2. **Lock Specific Language**: Expand *Category 3: Network & Environment*, click *Browser Language*, select your desired locale (e.g. `Russian (ru-RU)`), and click *Randomize & Apply*.
3. **Lock Specific Timezone**: Click *Timezone*, choose a city (e.g. `Tokyo`), and click *Randomize & Apply*.
4. **Export Profile**: Scroll to *Fingerprint Data*, click **"Copy JSON"** to export the active configuration to your clipboard.
5. **Import Profile**: Click **"Import Profile"**, paste a valid fingerprint JSON, and click **"Apply Fingerprint"**.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
