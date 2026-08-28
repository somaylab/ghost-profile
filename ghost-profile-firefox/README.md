# 🦊 Ghost Profile — Mozilla Firefox Edition (v4.2.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](../LICENSE)
[![Manifest V3](https://img.shields.io/badge/Gecko-Manifest%20V3-blue.svg)](https://extensionworkshop.com/documentation/develop/manifest-v3/)
[![Target](https://img.shields.io/badge/Target-Firefox%20%7C%20Firefox%20Dev%20%7C%20LibreWolf-orange.svg)](https://mozilla.org/firefox)
[![Audit](https://img.shields.io/badge/Anti--Bot%20Audit-100%25%20Passed-brightgreen.svg)](https://github.com/somaylab/ghost-profile/releases/tag/v4.2.0)

> **Enterprise-Grade Client-Side Anti-Fingerprinting Engine & Native Sidebar Console for Mozilla Firefox & LibreWolf**

---

## 🛠️ Installation & Setup (Firefox)

1. Open **Mozilla Firefox**, **Firefox Developer Edition**, or **LibreWolf**.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on...**
4. Select `manifest.json` located inside this `ghost-profile-firefox/` directory.
5. Open the native **Firefox Sidebar** (`Ctrl + B` or click the Ghost Profile toolbar icon) to launch the Side Panel.

---

## ⚡ v4.2.0 Architectural Upgrades (Gecko Hardened)

* 🛡️ **Zero Own-Property Leak**: All spoofed getters (`innerWidth`, `deviceMemory`, `hardwareConcurrency`) reside cleanly on `Window.prototype` / `Navigator.prototype` / `Screen.prototype`.
* 🎭 **Native Descriptor Masking**: Exact `fn.name` (`get [prop]`), `fn.length`, and `WeakMap` native string protection.
* 🎨 **Smart Canvas Probe Isolation**: Canvas noise perturbation is strictly bounded to probe canvases (`<= 320x320`), keeping full-page graphics, WebGL viewports, and video players 100% crisp.
* 🎮 **WebGL Spec Compliance**: Strict TypedArray compliance (`Int32Array` for `0x0D3A` `MAX_VIEWPORT_DIMS`).
* 🌐 **Network Sync**: Dynamic `Accept-Language` header synchronization via `declarativeNetRequest`.
* 📡 **Global HAR Interceptor**: Full multi-tab network traffic & DOM interaction recording.
