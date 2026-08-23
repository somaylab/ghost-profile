# 🦊 Ghost Profile — User Guide (Mozilla Firefox)

Ghost Profile for Firefox is an advanced **stealth browser fingerprint spoofing** extension specifically engineered for the **Gecko engine (Mozilla Firefox, Firefox Developer Edition, and LibreWolf)**.

It uses a **Stealth Mode** architecture that preserves real Firefox binary and version signatures while respecting Firefox-native properties (such as empty `navigator.vendor: ""` and native `navigator.oscpu`). This eliminates entropy anomalies that trigger detection by anti-bot systems (such as Cloudflare Turnstile, Kasada, DataDome, FingerprintJS, and CreepJS).

---

## 🚀 1. Installation & Setup (Mozilla Firefox)

1. Open **Mozilla Firefox** or **Firefox Developer Edition**.
2. Navigate to the following address:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. On the **This Firefox** page, locate the **Temporary Extensions** section.
4. Click the **"Load Temporary Add-on..."** button.
5. Navigate to this folder: `ghost-profile-firefox`.
6. Select the **`manifest.json`** file and click **Open**.
7. The **Ghost Profile** extension will load immediately and appear on your browser toolbar.

---

## 🖥️ 2. Opening the Firefox Sidebar

* **Open Sidebar**: Click the **Ghost Profile icon** in the Firefox toolbar. The extension opens natively in the **Firefox Sidebar** on the side of your window.
* **Toggle Sidebar**: Click the Ghost Profile toolbar button again to open or close the sidebar.
* **Master Switch**: The toggle switch in the top-right corner of the header instantly activates or deactivates all protection modules globally.

---

## 🎲 3. Generating a New Identity (Randomize & Apply)

1. Open the Ghost Profile Sidebar.
2. Click the primary button at the bottom: **"Randomize & Apply"** (*Acak & Terapkan*).
3. The engine generates:
   * WebGL GPU Renderer from realistic device pools (NVIDIA, AMD, Apple Silicon, Intel)
   * Screen Resolution, Avail Dimensions, & DPR
   * CPU Cores & RAM Memory matching the GPU tier
   * Seed-controlled Canvas, AudioContext, & Font Noise
   * Timezone & Language locales (if set to random)
4. The active Firefox tab reloads automatically with the new identity active deterministically.
5. Check **"Reload all open tabs"** to update all open tabs simultaneously.

---

## 🌐 4. Customizing Browser Language (Language Selector)

1. In the Sidebar, scroll to **Category 3: NETWORK & ENVIRONMENT**.
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

At the bottom of the Sidebar, expand the **FINGERPRINT DATA** section:

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

## 🛡️ 8. Protection Modules Overview in Firefox

1. **Hardware Specifications (`ua`)**: Spoofs CPU cores (`hardwareConcurrency`), RAM memory (`deviceMemory`), and platform properties respecting Gecko standards (`vendor: ""`, `oscpu`).
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
