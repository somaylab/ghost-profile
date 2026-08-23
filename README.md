# 👻 Ghost Profile — Stealth Fingerprint Spoofing & Network Flow Recorder

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Gecko Compatible](https://img.shields.io/badge/Firefox-Gecko%20Compatible-orange.svg)](https://addons.mozilla.org/)
[![Version](https://img.shields.io/badge/Version-3.2.0-brightgreen.svg)](https://github.com/somaylab/ghost-profile/releases)

> **Advanced Cross-Layer Fingerprint Protection, Global HAR Interceptor & Multi-Tab Flow Recorder for Chromium & Mozilla Firefox**

**Ghost Profile** is a next-generation browser privacy extension designed for offensive security research, forensic audits, and defensive hardening. Unlike naive spoofers that modify the User-Agent header (triggering immediate entropy anomalies on modern anti-bot engines like Cloudflare, Kasada, DataDome, and FingerprintJS), Ghost Profile enforces **cross-layer consistency** by keeping real browser engines intact while mathematically perturbing rendering layers, hardware properties, and network locales.

Version 3.2 introduces a **Global Multi-Tab HAR & Interaction Flow Recorder** with an integrated Chrome-style Top Tab interface, capturing comprehensive HTTP/S traffic, request/response bodies, multi-tab OAuth/SSO lineages, and DOM interaction breadcrumbs in real-time.

---

## 📦 Repository Structure

This repository provides two standalone, dedicated builds tailored for each browser engine:

| Directory | Target Browsers | Architecture |
| :--- | :--- | :--- |
| **[`ghost-profile/`](./ghost-profile)** | **Google Chrome, Microsoft Edge, Brave, Opera** | Chrome Side Panel API (`manifest.json` MV3) |
| **[`ghost-profile-firefox/`](./ghost-profile-firefox)** | **Mozilla Firefox, Firefox Dev Edition, LibreWolf** | Firefox Sidebar Action API (`manifest.json` Gecko MV3) |

---

## ✨ Core Features & Modules

### 1. 🎛️ Dual-Tab Modern Console
* **Tab 1: Identity & Spoofing (`Identitas & Proteksi`)**: Full access to all 12 stealth spoofing modules, custom seed visualizers, and the Data Vault.
* **Tab 2: HAR & Flow Control (`Ruang Kontrol HAR`)**: Real-time network recorder with live counters, method/status badges, stream filtering, and full request/response inspector drawer.

### 2. 📡 Global Multi-Tab HAR & Interaction Flow Recorder
* **Global Passive Interception**: Captures all HTTP/S network traffic globally across **ALL open tabs, background workers, and child popups** simultaneously without triggering the yellow DevTools debugger infobar.
* **Multi-Tab Lineage & OAuth Tracing**: Maps parent tab to child window/popup relationships (e.g. OAuth2 popups, SSO login flows, payment gateways, `window.open` redirects).
* **DOM Interaction Breadcrumbs**: Associates network requests with specific user actions (e.g. `Click <button.login-btn> "Sign In"`, `Submit Form#auth-form`).
* **Request & Response Payload Relay**: Extracts JSON bodies, query strings, headers, and response payloads.
* **Standard Export Formats**:
  * **Export HAR (.har)**: 100% compliant with the official HAR 1.2 specification, ready to import into Wireshark, Fiddler, Postman, or Chrome DevTools.
  * **Export Flow JSON (.json)**: Hierarchical tab lineage tree and domain interaction timeline.

### 3. 🎨 Canvas Fingerprint Perturbation
* Injects deterministic, seed-controlled micro-noise via **Mulberry32 PRNG** into `toDataURL()`, `getImageData()`, and `toBlob()`.
* Generates a completely unique, consistent canvas hash per profile without causing visual artifacts.

### 4. 🎮 WebGL & GPU Spoofing
* Replaces unmasked GPU vendor and unmasked renderer strings with realistic device tiers (NVIDIA GeForce RTX series, AMD Radeon RX, Apple Silicon M-series, Intel Iris Xe / Arc).

### 5. 🔊 Deep AudioContext Protection
* Perturbs audio frequency response, buffer channels, and oscillator waveforms across 6 discrete layers to randomize Audio Fingerprint signatures deterministically.

### 6. 🔤 Font Enumeration Noise
* Injects micro-metric perturbations into `CanvasRenderingContext2D.prototype.measureText()` (`±0.01px`), mitigating font detection and enumeration scripts.

### 7. 🌐 Locale & Timezone Synchronization
* **Timezone Selector**: 118 worldwide timezones with synchronized UTC offsets and `Intl.DateTimeFormat` constructors.
* **Browser Language Selector**: 46 global language presets (including `en-US`, `ru-RU`, `id-ID`, `ja-JP`, `de-DE`, `zh-CN`, etc.) with natural fallback chains.

### 8. 🛡️ WebRTC & Device Masking
* **WebRTC Leak Guard**: Strips ICE candidate servers to prevent local/private IP disclosure.
* **Hardware Properties**: Spoofs CPU cores (`hardwareConcurrency`), RAM memory (`deviceMemory`), display resolution, and DPR (`devicePixelRatio`).
* **Media Devices**: Generates realistic random microphone and webcam device IDs.

### 9. 🔐 Data Vault & Fingerprint Hash
* **Export / Import JSON**: Copy and paste raw identity configurations with an attached 16-hex deterministic `fingerprintHash` for reproducibility.

---

## 🚀 Quick Start Guide

### Chromium (Chrome, Edge, Brave, Opera)
1. Download `ghost-profile-chromium-v3.2.0.zip` from [Releases](https://github.com/somaylab/ghost-profile/releases).
2. Extract the archive to a local directory.
3. Open `chrome://extensions/` and enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extracted folder.
5. Click the **Ghost Profile** icon in the toolbar or press `Ctrl + Shift + O` to open the persistent Side Panel.

### Mozilla Firefox (Firefox, Dev Edition, LibreWolf)
1. Download `ghost-profile-firefox-v3.2.0.zip` from [Releases](https://github.com/somaylab/ghost-profile/releases).
2. Extract the archive to a local directory.
3. Open `about:debugging#/runtime/this-firefox` in Firefox.
4. Click **Load Temporary Add-on...** and select `manifest.json`.
5. Click the toolbar icon or press `Ctrl + B` (select Ghost Profile) to open the native Sidebar.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
