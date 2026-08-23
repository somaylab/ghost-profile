# 👻 Ghost Profile — Firefox Edition (v3.2.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](../LICENSE)
[![Gecko MV3](https://img.shields.io/badge/Gecko-Manifest%20V3-orange.svg)](https://addons.mozilla.org/)
[![Target](https://img.shields.io/badge/Target-Firefox%20%7C%20Dev%20Edition%20%7C%20LibreWolf-red.svg)](https://mozilla.org/firefox)

> **Dedicated Mozilla Firefox Extension with Native Sidebar, Gecko Profile Generator & Global HAR / Flow Recorder**

---

## 🛠️ Installation & Setup

1. Open Mozilla Firefox or Firefox Developer Edition.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...** under Temporary Extensions.
4. Select `manifest.json` from this directory (`ghost-profile-firefox/`).
5. Click the extension icon in the toolbar or press `Ctrl + B` (select Ghost Profile) to open the native **Sidebar**.

---

## ⚡ Features Overview

* **Dual-Tab Interface**: Switch seamlessly between **Identity & Spoofing** and **HAR & Flow Control**.
* **Global HAR Interception**: Passively captures network activity across all open tabs and popup dialogs.
* **Interaction Breadcrumbs**: Connects DOM clicks and form submissions directly to API requests.
* **Gecko Engine Calibration**: Real `Firefox 135` User-Agent strings, clean empty string `navigator.vendor: ""`, `oscpu`, and platform architecture.
* **Deterministic Noise Injection**: Mulberry32 PRNG for Canvas, WebGL, AudioContext, and Font measureText.
* **100% Bilingual**: Instant English / Indonesian locale switching.
