# 👻 Ghost Profile — Chromium Edition (v3.2.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](../LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Target](https://img.shields.io/badge/Target-Chrome%20%7C%20Edge%20%7C%20Brave%20%7C%20Opera-purple.svg)](https://google.com/chrome)

> **Dedicated Chromium Extension with Persistent Chrome Side Panel, Dynamic Header Spoofing & Global HAR / Flow Recorder**

---

## 🛠️ Installation & Setup

1. Open your Chromium-based browser (Chrome, Brave, Edge, Opera, etc.).
2. Navigate to `chrome://extensions/` (or `brave://extensions/` / `edge://extensions/`).
3. Toggle **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left corner.
5. Select this folder (`ghost-profile/`).
6. Click the extension icon in the toolbar or open the **Side Panel** to manage stealth profiles and record network interactions.

---

## ⚡ Features Overview

* **Dual-Tab Interface**: Switch seamlessly between **Identity & Spoofing** and **HAR & Flow Control**.
* **Global HAR Interception**: Passively captures network activity across all open tabs and popup dialogs.
* **Interaction Breadcrumbs**: Connects DOM clicks and form submissions directly to API requests.
* **Cross-Layer Header Matching**: Synchronizes `sec-ch-ua`, `User-Agent`, and client hints with JavaScript environment objects.
* **Deterministic Noise Injection**: Mulberry32 PRNG for Canvas, WebGL, AudioContext, and Font measureText.
* **100% Bilingual**: Instant English / Indonesian locale switching.
