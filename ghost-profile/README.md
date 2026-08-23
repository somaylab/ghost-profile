# 👻 Ghost Profile — User Guide (Chrome / Chromium)

Ghost Profile is an advanced **stealth browser fingerprint spoofing** extension designed for **Google Chrome, Microsoft Edge, Brave, and Chromium-based browsers**. 

It employs a **Stealth Mode** architecture that preserves the real browser binary and version headers while mathematically perturbing rendering layers, hardware properties, and network locales. This eliminates entropy inconsistencies that trigger anti-bot detection systems (such as Cloudflare Turnstile, Kasada, DataDome, FingerprintJS, and CreepJS).

---

## 🚀 1. Installation & Setup (Chrome / Edge / Brave)

1. Open **Google Chrome**, **Microsoft Edge**, or **Brave Browser**.
2. Navigate to the extensions management page:
   * **Chrome / Brave**: Go to `chrome://extensions` in the address bar.
   * **Edge**: Go to `edge://extensions` in the address bar.
3. Enable **Developer mode** via the toggle switch in the top-right corner.
4. Click the **"Load unpacked"** button.
5. Select this folder: `ghost-profile`.
6. The **Ghost Profile** extension will be loaded and pinned to your browser toolbar.

---

## 🖥️ 2. Opening the Chrome Side Panel

* **Open Panel**: Simply click the **Ghost Profile icon** in the browser toolbar. The extension will open natively in the **Chrome Side Panel** on the right side of the screen without covering the web page.
* **Master Switch**: The toggle switch in the top-right of the header instantly activates or deactivates all protection modules globally.

---

## 🎲 3. Generating a New Identity (Randomize & Apply)

1. Open the Ghost Profile Side Panel.
2. Click the primary button at the bottom: **"Randomize & Apply"** (*Acak & Terapkan*).
3. The engine generates:
   * Randomized WebGL GPU Renderer (NVIDIA, AMD, Apple Silicon, Intel)
   * Screen Resolution, Avail Dimensions, & DPR
   * CPU Cores & RAM Memory
   * Seed-controlled Canvas, AudioContext, & Font Noise
   * Timezone & Language locales (if set to random)
4. The active tab reloads automatically with the new identity active deterministically.
5. *(Optional)* Check **"Reload all open tabs"** to propagate the new identity across all open tabs simultaneously.

---

## 🌐 4. Customizing Browser Language (Language Selector)

1. In the Side Panel, scroll to **Category 3: NETWORK & ENVIRONMENT**.
2. Click the **"Browser Language"** row (or click the *Language* tile on the Identity Card at the top).
3. The language selection panel opens:
   * **Search**: Type language name or country code (e.g. `Russian`, `ru`, `Indonesian`, `Japan`, `German`).
   * **Region Tabs**: Filter by *All*, *Asia*, *Europe*, *Americas*, or *Africa & Middle East*.
4. Select your desired language (e.g. `Russian (ru-RU, ru, en)`).
5. The status pill turns green: `ru-RU ▸`.
6. Click **"Randomize & Apply"**. The browser locale is now locked to this language configuration.
7. **Reset to Random**: Re-open the language panel and click the **"Random"** (*Acak*) button.

---

## ⏰ 5. Customizing Timezone (Timezone Selector)

1. Click the **"Timezone"** row in Category 3 (or click the *Timezone* tile on the Identity Card).
2. The 118 worldwide timezone database panel opens.
3. Search for your target city (e.g. `Tokyo`, `London`, `New York`, `Singapore`).
4. Click the timezone. The status pill turns green (e.g. `Tokyo ▸`).
5. Click **"Randomize & Apply"**. UTC offset and `Intl.DateTimeFormat` will remain locked to that timezone.

---

## 💾 6. Fingerprint Data Vault (Export & Import JSON)

At the bottom of the Side Panel, expand the **FINGERPRINT DATA** section:

* **Copy JSON (Export)**:
  * Click **"Copy JSON"**.
  * The complete active profile (including `fingerprintHash`, noise seeds, WebGL renderer, display resolution, language, and timezone) is copied to your clipboard in standard JSON format.
* **Import Profile**:
  * Click **"Import Profile"**.
  * Paste a saved fingerprint JSON into the text area.
  * Click **"Apply Fingerprint"**.
  * The browser identity updates immediately to match the imported JSON configuration.

---

## 🎨 7. Display Controls & UI Language

* **UI Language Toggle (EN / ID)**: Click the `EN / ID` pill in the header to switch between 100% English and 100% Indonesian UI.
* **Dark / Light Mode**: Click the Moon 🌙 / Sun ☀️ icon in the header to switch color themes.

---

## 🛡️ 8. Protection Modules Overview

1. **Hardware Specifications (`ua`)**: Spoofs CPU cores (`hardwareConcurrency`), RAM memory (`deviceMemory`), and platform properties.
2. **Screen & Display (`screen`)**: Modifies display resolution, avail dimensions, color depth, and DPR.
3. **Media Devices (`mediaDevices`)**: Randomizes device counts and IDs for microphones and webcams.
4. **Storage Estimate (`storage`)**: Modifies storage quota in `navigator.storage.estimate()`.
5. **Canvas Fingerprint (`canvas`)**: Injects deterministic PRNG noise into `toDataURL` / `getImageData`.
6. **WebGL Fingerprint (`webgl`)**: Overrides unmasked vendor and unmasked renderer strings.
7. **Deep AudioContext (`audio`)**: Injects 6-layer noise into audio buffers and frequency data.
8. **Font Enumeration Noise (`fonts`)**: Injects micro-perturbations into `measureText()` bounding boxes.
9. **Timezone (`timezone`)**: Spoofs UTC offset and `Intl.DateTimeFormat` constructor.
10. **Browser Language (`language`)**: Spoofs `navigator.languages` and locale tags.
11. **WebRTC Leak Guard (`webrtc`)**: Strips ICE servers to prevent private IP leakage.
12. **CSS matchMedia (`matchMedia`)**: Synchronizes `prefers-color-scheme` theme preferences.
13. **Additional Protections (`misc`)**: Clears `navigator.webdriver` flags and standardizes plugin lists.
