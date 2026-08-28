/**
 * Ghost Profile — inject.js v4.2 (HARDENED & STEALTH-CERTIFIED)
 * ═══════════════════════════════════════════════════════════════
 * Core fingerprint spoofing engine. Runs in MAIN world at
 * document_start BEFORE any page scripts execute.
 *
 * Accepts a FULL profile object from content.js (via generator.js)
 * or falls back to a built-in default profile.
 *
 * Spoofing coverage (17 categories):
 *   1.  Navigator (UA, platform, memory, cores, languages, etc.)
 *   2.  Client Hints JS API (userAgentData + getHighEntropyValues)
 *   3.  Screen & Display (resolution, colorDepth, DPR, inner/outer)
 *   4.  Canvas fingerprint (deterministic pixel noise on probe canvases)
 *   5.  WebGL fingerprint (GPU vendor/renderer + parameter consistency)
 *   6.  AudioContext fingerprint (sample-level noise)
 *   7.  Timezone (getTimezoneOffset, Intl.DateTimeFormat, Date.toString)
 *   8.  WebRTC leak protection (ICE policy + candidate filtering)
 *   9.  Font enumeration noise (deterministic per-input measureText)
 *  10.  Media devices (enumerateDevices spoofing)
 *  11.  Storage estimate (spoofed quota/usage with variance)
 *  12.  CSS matchMedia (prefers-color-scheme on Window.prototype)
 *  13.  Misc (webdriver, connection, battery, plugins, permissions)
 *  14.  Speech Synthesis Voices (filtered to common subset on prototype)
 *  15.  Gamepad API (clean prototype empty return)
 *  16.  HAR Interaction Breadcrumbs & Payload Relay
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
   * OBFUSCATED EVENT NAMES (L6: prevent extension detection)
   * ────────────────────────────────────────────────────────────── */
  const _EVT_PROFILE = '\x5f_' + String.fromCharCode(71, 80) + '_P' + '\x55__';
  const _EVT_HAR     = '\x5f_' + String.fromCharCode(71, 80) + '_H' + '\x52__';

  /* ──────────────────────────────────────────────────────────────
   * DEFAULT PROFILE (fallback if content.js doesn't provide one)
   * ────────────────────────────────────────────────────────────── */
  const DEFAULT_PROFILE = {
    stealthMode: true,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    appVersion: typeof navigator !== 'undefined' ? navigator.appVersion : '',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'Win32',
    vendor: typeof navigator !== 'undefined' ? navigator.vendor : 'Google Inc.',
    oscpu: undefined,
    languages: ['en-US', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0,
    doNotTrack: null,
    chUA: null,
    chUAMobile: null,
    chUAPlatform: null,
    chUAPlatformVersion: null,
    chUAArch: null,
    chUABitness: null,
    chUAFullVersionList: null,
    chUAModel: null,
    uaDataBrands: null,
    uaDataFullVersionList: null,
    uaDataPlatform: null,
    uaDataPlatformVersion: null,
    uaDataArchitecture: null,
    uaDataBitness: null,
    uaDataModel: null,
    uaDataMobile: null,
    uaDataWow64: null,
    screenWidth: 1920,
    screenHeight: 1080,
    availWidth: 1920,
    availHeight: 1040,
    outerWidth: 1920,
    outerHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24,
    devicePixelRatio: 1,
    webglVendor: 'Google Inc. (NVIDIA)',
    webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglParams: null,
    timezoneOffset: -420,
    timezone: 'Asia/Jakarta',
    canvasNoiseSeed: 0.73219481,
    audioNoiseSeed: 0.28471936,
    fontNoiseSeed: 0.55128374,
    mediaDevices: [
      { deviceId: 'a1b2c3d4e5f6', kind: 'audioinput', label: '', groupId: 'g1h2i3j4' },
      { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'k5l6m7n8' }
    ],
    storageQuota: 250e9,
    storageUsage: 350e6,
    colorScheme: 'light',
    label: 'Ghost Profile Stealth'
  };

  /* ──────────────────────────────────────────────────────────────
   * STATE & CONFIGURATION
   * ────────────────────────────────────────────────────────────── */
  let P = { ...DEFAULT_PROFILE };
  let STEALTH_MODE = true;
  let FEATURES = {
    ua: true, screen: true, canvas: true, webgl: true,
    audio: true, timezone: true, webrtc: true, fonts: true,
    mediaDevices: true, storage: true, matchMedia: true, misc: true
  };
  let _harRecordingActive = false;

  // Read initial config from data attribute if set synchronously
  try {
    const raw = document.documentElement.getAttribute('data-gp-cfg');
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.fullProfile && typeof cfg.fullProfile === 'object') {
        STEALTH_MODE = cfg.fullProfile.stealthMode !== false;
        P = { ...DEFAULT_PROFILE, ...cfg.fullProfile };
      }
      if (cfg.features) Object.assign(FEATURES, cfg.features);
      document.documentElement.removeAttribute('data-gp-cfg');
    }
  } catch (_) {}

  // Listen for dynamic profile updates from content.js
  document.addEventListener(_EVT_PROFILE, function (e) {
    try {
      if (e && e.detail) {
        if (e.detail.fullProfile) {
          STEALTH_MODE = e.detail.fullProfile.stealthMode !== false;
          Object.assign(P, e.detail.fullProfile);
        }
        if (e.detail.features) {
          Object.assign(FEATURES, e.detail.features);
        }
        if (e.detail.harRecording !== undefined) {
          _harRecordingActive = !!e.detail.harRecording;
        }
      }
    } catch (_) {}
  }, true);

  /* ──────────────────────────────────────────────────────────────
   * UTILITY FUNCTIONS & MASKING ENGINE
   * ────────────────────────────────────────────────────────────── */

  /** Seeded 32-bit PRNG (Mulberry32) — deterministic noise */
  function mulberry32(seed) {
    let s = (typeof seed === 'number' && !isNaN(seed)) ? (Math.imul(Math.floor(seed), 1) || 1) : 1;
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Simple string hash for deterministic per-input noise */
  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  /** Function.prototype.toString interception with WeakMap */
  const _nativeFns = new WeakMap();
  const _origToString = Function.prototype.toString;

  Object.defineProperty(Function.prototype, 'toString', {
    value: function () {
      return _nativeFns.get(this) || _origToString.call(this);
    },
    writable: true,
    configurable: true
  });
  _nativeFns.set(Function.prototype.toString, 'function toString() { [native code] }');

  /**
   * Mask a function with native toString, exact name, and exact length
   */
  function maskFn(fn, name, length = 0, isGetter = false) {
    const fnName = isGetter ? `get ${name}` : name;
    const sig = isGetter ? `function get ${name}() { [native code] }` : `function ${name}() { [native code] }`;
    _nativeFns.set(fn, sig);
    try {
      Object.defineProperty(fn, 'name', {
        value: fnName,
        writable: false,
        enumerable: false,
        configurable: true
      });
    } catch (_) {}
    if (typeof length === 'number') {
      try {
        Object.defineProperty(fn, 'length', {
          value: length,
          writable: false,
          enumerable: false,
          configurable: true
        });
      } catch (_) {}
    }
    return fn;
  }

  /** Override a prototype getter property cleanly */
  function overrideGetter(proto, prop, getter) {
    const masked = maskFn(getter, prop, 0, true);
    Object.defineProperty(proto, prop, {
      get: masked,
      set: undefined,
      configurable: true,
      enumerable: true
    });
  }

  /** Override a prototype method cleanly */
  function overrideMethod(proto, prop, fn, length = 0) {
    const masked = maskFn(fn, prop, length, false);
    Object.defineProperty(proto, prop, {
      value: masked,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  /* ──────────────────────────────────────────────────────────────
   * 1. NAVIGATOR SPOOFING + CLIENT HINTS
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.ua) {
    try { overrideGetter(Navigator.prototype, 'hardwareConcurrency', () => P.hardwareConcurrency || 8); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'deviceMemory', () => P.deviceMemory || 8); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'language', () => (P.languages && P.languages[0]) || 'en-US'); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'languages', () => Object.freeze([...(P.languages || ['en-US', 'en'])])); } catch (_) {}

    if (!STEALTH_MODE && P.userAgent) {
      try { overrideGetter(Navigator.prototype, 'userAgent', () => P.userAgent); } catch (_) {}
      try { overrideGetter(Navigator.prototype, 'appVersion', () => P.appVersion || P.userAgent.replace('Mozilla/', '')); } catch (_) {}
      try { overrideGetter(Navigator.prototype, 'platform', () => P.platform || 'Win32'); } catch (_) {}
      try { overrideGetter(Navigator.prototype, 'vendor', () => P.vendor || 'Google Inc.'); } catch (_) {}
      try { overrideGetter(Navigator.prototype, 'maxTouchPoints', () => P.maxTouchPoints || 0); } catch (_) {}
    }

    // Client Hints JS API (NavigatorUAData)
    try {
      if (typeof NavigatorUAData !== 'undefined' && navigator.userAgentData) {
        const _realUAData = navigator.userAgentData;
        const _realBrands = _realUAData.brands ? [..._realUAData.brands] : [];
        const _realMobile = _realUAData.mobile;
        const _realPlatform = _realUAData.platform;
        const _origGetHEV = NavigatorUAData.prototype.getHighEntropyValues;

        overrideMethod(NavigatorUAData.prototype, 'getHighEntropyValues', function (hints) {
          return _origGetHEV.call(this, hints).then(result => {
            if (P.uaDataPlatform != null) result.platform = P.uaDataPlatform;
            if (P.uaDataPlatformVersion != null) result.platformVersion = P.uaDataPlatformVersion;
            if (P.uaDataArchitecture != null) result.architecture = P.uaDataArchitecture;
            if (P.uaDataBitness != null) result.bitness = P.uaDataBitness;
            if (P.uaDataModel != null) result.model = P.uaDataModel;
            if (P.uaDataMobile != null) result.mobile = P.uaDataMobile;
            if (P.uaDataWow64 != null) result.wow64 = P.uaDataWow64;
            if (P.uaDataBrands != null) result.brands = P.uaDataBrands;
            if (P.uaDataFullVersionList != null) result.fullVersionList = P.uaDataFullVersionList;
            return result;
          });
        }, 1);

        overrideMethod(NavigatorUAData.prototype, 'toJSON', function () {
          return {
            brands: P.uaDataBrands || _realBrands,
            mobile: P.uaDataMobile != null ? P.uaDataMobile : _realMobile,
            platform: P.uaDataPlatform || _realPlatform
          };
        }, 0);
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 2. SCREEN & DISPLAY SPOOFING (on Window.prototype & Screen.prototype)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.screen) {
    const screenGetters = {
      width:      () => P.screenWidth || 1920,
      height:     () => P.screenHeight || 1080,
      availWidth: () => P.availWidth || 1920,
      availHeight:() => P.availHeight || 1040,
      colorDepth: () => P.colorDepth || 24,
      pixelDepth: () => P.pixelDepth || 24
    };
    for (const [prop, getter] of Object.entries(screenGetters)) {
      try { overrideGetter(Screen.prototype, prop, getter); } catch (_) {}
    }

    try { overrideGetter(Window.prototype, 'devicePixelRatio', () => P.devicePixelRatio || 1); } catch (_) {}
    try { overrideGetter(Window.prototype, 'outerWidth', () => P.outerWidth || P.screenWidth || 1920); } catch (_) {}
    try { overrideGetter(Window.prototype, 'outerHeight', () => P.outerHeight || P.screenHeight || 1080); } catch (_) {}
    try { overrideGetter(Window.prototype, 'innerWidth', () => Math.min(P.outerWidth || 1920, P.screenWidth || 1920)); } catch (_) {}
    try { overrideGetter(Window.prototype, 'innerHeight', () => Math.min(P.outerHeight || 1080, P.screenHeight || 1080)); } catch (_) {}
    try { overrideGetter(Window.prototype, 'screenX', () => 0); } catch (_) {}
    try { overrideGetter(Window.prototype, 'screenY', () => 0); } catch (_) {}

    try {
      if (window.visualViewport) {
        overrideGetter(VisualViewport.prototype, 'width', () => Math.min(P.outerWidth || 1920, P.screenWidth || 1920));
        overrideGetter(VisualViewport.prototype, 'height', () => Math.min(P.outerHeight || 1080, P.screenHeight || 1080));
      }
    } catch (_) {}

    try {
      const orientType = (P.screenWidth || 1920) >= (P.screenHeight || 1080) ? 'landscape-primary' : 'portrait-primary';
      const orientAngle = (P.screenWidth || 1920) >= (P.screenHeight || 1080) ? 0 : 90;
      if (typeof ScreenOrientation !== 'undefined') {
        overrideGetter(ScreenOrientation.prototype, 'type', () => orientType);
        overrideGetter(ScreenOrientation.prototype, 'angle', () => orientAngle);
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 3. CANVAS FINGERPRINT PROTECTION (targeted to probe canvases)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.canvas) {
    const _origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const _origToBlob = HTMLCanvasElement.prototype.toBlob;
    const _origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    const _origPutImageData = CanvasRenderingContext2D.prototype.putImageData;

    function applyCanvasNoise(imageData) {
      const rng = mulberry32(P.canvasNoiseSeed * 1e6);
      const d = imageData.data;
      const step = Math.max(4, Math.floor(d.length / 1600));
      for (let i = 0; i < d.length; i += step) {
        const ch = i - (i % 4);
        if (ch + 3 < d.length && d[ch + 3] > 0) {
          const noise = Math.floor(rng() * 5) - 2;
          d[ch] = Math.max(0, Math.min(255, d[ch] + noise));
          if (rng() > 0.7 && ch + 1 < d.length) {
            d[ch + 1] = Math.max(0, Math.min(255, d[ch + 1] + (Math.floor(rng() * 3) - 1)));
          }
        }
      }
      return imageData;
    }

    overrideMethod(HTMLCanvasElement.prototype, 'toDataURL', function (...args) {
      // Only apply noise on small probe canvases (fingerprinting), keep full UI/video pristine
      if (this.width === 0 || this.height === 0 || this.width > 320 || this.height > 320) {
        return _origToDataURL.apply(this, args);
      }
      try {
        const tmp = document.createElement('canvas');
        tmp.width = this.width; tmp.height = this.height;
        const ctx = tmp.getContext('2d');
        if (!ctx) return _origToDataURL.apply(this, args);
        ctx.drawImage(this, 0, 0);
        const img = _origGetImageData.call(ctx, 0, 0, tmp.width, tmp.height);
        applyCanvasNoise(img);
        _origPutImageData.call(ctx, img, 0, 0);
        return _origToDataURL.apply(tmp, args);
      } catch (_) { return _origToDataURL.apply(this, args); }
    }, 0);

    overrideMethod(HTMLCanvasElement.prototype, 'toBlob', function (callback, ...rest) {
      if (this.width === 0 || this.height === 0 || this.width > 320 || this.height > 320) {
        return _origToBlob.call(this, callback, ...rest);
      }
      try {
        const tmp = document.createElement('canvas');
        tmp.width = this.width; tmp.height = this.height;
        const ctx = tmp.getContext('2d');
        if (!ctx) return _origToBlob.call(this, callback, ...rest);
        ctx.drawImage(this, 0, 0);
        const img = _origGetImageData.call(ctx, 0, 0, tmp.width, tmp.height);
        applyCanvasNoise(img);
        _origPutImageData.call(ctx, img, 0, 0);
        return _origToBlob.call(tmp, callback, ...rest);
      } catch (_) { return _origToBlob.call(this, callback, ...rest); }
    }, 1);

    overrideMethod(CanvasRenderingContext2D.prototype, 'getImageData', function (...args) {
      const img = _origGetImageData.apply(this, args);
      const w = args[2] || (img ? img.width : 0);
      const h = args[3] || (img ? img.height : 0);
      if (w <= 320 && h <= 320 && img) {
        applyCanvasNoise(img);
      }
      return img;
    }, 4);
  }

  /* ──────────────────────────────────────────────────────────────
   * 4. WEBGL FINGERPRINT PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.webgl) {
    const UNMASKED_VENDOR = 0x9245;
    const UNMASKED_RENDERER = 0x9246;

    const GPU_PARAMS_BY_TIER = {
      low: {
        0x0D33: 8192, 0x84E8: 8192,
        0x0D3A: new Int32Array([8192, 8192]),
        0x8869: 16, 0x8DFD: 15, 0x8B4D: 16,
        0x846E: new Float32Array([1, 1]),
        0x846D: new Float32Array([1, 255.875]),
        0x8B49: 221
      },
      mid: {
        0x0D33: 16384, 0x84E8: 16384,
        0x0D3A: new Int32Array([16384, 16384]),
        0x8869: 16, 0x8DFD: 30, 0x8B4D: 32,
        0x846E: new Float32Array([1, 1]),
        0x846D: new Float32Array([1, 1024]),
        0x8B49: 1024
      },
      high: {
        0x0D33: 32768, 0x84E8: 32768,
        0x0D3A: new Int32Array([32768, 32768]),
        0x8869: 16, 0x8DFD: 30, 0x8B4D: 32,
        0x846E: new Float32Array([1, 1]),
        0x846D: new Float32Array([1, 1024]),
        0x8B49: 4096
      }
    };

    function getGpuTier() {
      const r = P.webglRenderer || '';
      if (r.includes('RTX 50') || r.includes('RTX 407') || r.includes('RTX 408') || r.includes('RTX 409') ||
          r.includes('RTX 4060 Ti') || r.includes('RTX 307') || r.includes('RTX 308') || r.includes('RTX 309') ||
          r.includes('RTX 3060 Ti') || r.includes('RTX 207') || r.includes('RTX 208') ||
          r.includes('RX 6700') || r.includes('RX 7700') || r.includes('RX 7800') || r.includes('RX 7900') || r.includes('RX 9070') ||
          r.includes('Arc(TM) A770') || r.includes('M1 Pro') || r.includes('M2 Pro') || r.includes('M3 Pro') || r.includes('M3 Max') || r.includes('M4')) return 'high';
      if (r.includes('RTX 4060') || r.includes('RTX 3060') || r.includes('RTX 2060') ||
          r.includes('GTX 1660') || r.includes('GTX 1650 SUPER') ||
          r.includes('RX 5600') || r.includes('RX 6600') || r.includes('RX 6650') || r.includes('RX 7600') ||
          r.includes('Iris') || r.includes('M1') || r.includes('M2') || r.includes('M3')) return 'mid';
      return 'low';
    }

    function patchWebGL(proto) {
      const _origGetParam = proto.getParameter;
      const _origGetExt = proto.getExtension;

      overrideMethod(proto, 'getParameter', function (param) {
        if (param === UNMASKED_VENDOR) return P.webglVendor;
        if (param === UNMASKED_RENDERER) return P.webglRenderer;
        const tier = getGpuTier();
        const tierParams = GPU_PARAMS_BY_TIER[tier];
        if (tierParams && tierParams[param] !== undefined) {
          return tierParams[param];
        }
        return _origGetParam.call(this, param);
      }, 1);

      overrideMethod(proto, 'getExtension', function (name) {
        const ext = _origGetExt.call(this, name);
        if (name === 'WEBGL_debug_renderer_info' && ext) {
          return { UNMASKED_VENDOR_WEBGL: UNMASKED_VENDOR, UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER };
        }
        return ext;
      }, 1);
    }

    try { patchWebGL(WebGLRenderingContext.prototype); } catch (_) {}
    try { if (typeof WebGL2RenderingContext !== 'undefined') patchWebGL(WebGL2RenderingContext.prototype); } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 5. AUDIO FINGERPRINT PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.audio) {
    const _origGetChannelData = AudioBuffer.prototype.getChannelData;
    overrideMethod(AudioBuffer.prototype, 'getChannelData', function (channel) {
      const data = _origGetChannelData.call(this, channel);
      if (data && data.length < 100000) {
        const rng = mulberry32(P.audioNoiseSeed * 1e6);
        const step = Math.max(1, Math.floor(data.length / 200));
        for (let i = 0; i < data.length; i += step) {
          data[i] += (rng() - 0.5) * 1e-7;
        }
      }
      return data;
    }, 1);

    if (AudioBuffer.prototype.copyFromChannel) {
      const _origCopyFrom = AudioBuffer.prototype.copyFromChannel;
      overrideMethod(AudioBuffer.prototype, 'copyFromChannel', function (dest, ch, start) {
        _origCopyFrom.call(this, dest, ch, start);
        if (dest && dest.length < 100000) {
          const rng = mulberry32(P.audioNoiseSeed * 1e6 + 7);
          const step = Math.max(1, Math.floor(dest.length / 200));
          for (let i = 0; i < dest.length; i += step) {
            dest[i] += (rng() - 0.5) * 1e-7;
          }
        }
      }, 3);
    }

    if (typeof AnalyserNode !== 'undefined') {
      const _origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
      if (_origGetFloatFreq) {
        overrideMethod(AnalyserNode.prototype, 'getFloatFrequencyData', function (arr) {
          _origGetFloatFreq.call(this, arr);
          if (arr) {
            const rng = mulberry32(P.audioNoiseSeed * 1e6 + 13);
            for (let i = 0; i < arr.length; i += 10) arr[i] += (rng() - 0.5) * 0.01;
          }
        }, 1);
      }
      const _origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;
      if (_origGetByteFreq) {
        overrideMethod(AnalyserNode.prototype, 'getByteFrequencyData', function (arr) {
          _origGetByteFreq.call(this, arr);
          if (arr) {
            const rng = mulberry32(P.audioNoiseSeed * 1e6 + 19);
            for (let i = 0; i < arr.length; i += 8) {
              arr[i] = Math.max(0, Math.min(255, arr[i] + Math.floor((rng() - 0.5) * 2)));
            }
          }
        }, 1);
      }
    }

    try {
      const _origCreateOscillator = AudioContext.prototype.createOscillator;
      const _origCreateOscillatorOA = (typeof OfflineAudioContext !== 'undefined') ?
        OfflineAudioContext.prototype.createOscillator : null;

      const wrapCreateOsc = function (orig) {
        return function (...args) {
          const osc = orig.apply(this, args);
          if (osc && osc.frequency) {
            const origFreq = osc.frequency.value;
            const rng = mulberry32(P.audioNoiseSeed * 1e6 + 37);
            osc.frequency.value = origFreq + (rng() - 0.5) * 0.001;
          }
          return osc;
        };
      };
      overrideMethod(AudioContext.prototype, 'createOscillator', wrapCreateOsc(_origCreateOscillator), 0);
      if (_origCreateOscillatorOA) {
        overrideMethod(OfflineAudioContext.prototype, 'createOscillator', wrapCreateOsc(_origCreateOscillatorOA), 0);
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 6. TIMEZONE & DATE SPOOFING
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.timezone) {
    overrideMethod(Date.prototype, 'getTimezoneOffset', function () {
      return P.timezoneOffset;
    }, 0);

    const _origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    overrideMethod(Intl.DateTimeFormat.prototype, 'resolvedOptions', function () {
      const result = _origResolvedOptions.call(this);
      result.timeZone = P.timezone;
      return result;
    }, 0);

    const _OrigDTF = Intl.DateTimeFormat;
    const _newDTF = function (...args) {
      if (args[1] && typeof args[1] === 'object' && !args[1].timeZone) {
        args[1] = { ...args[1], timeZone: P.timezone };
      } else if (!args[1]) {
        args[1] = { timeZone: P.timezone };
      }
      return new _OrigDTF(...args);
    };
    _newDTF.prototype = _OrigDTF.prototype;
    _newDTF.prototype.constructor = _newDTF;
    Object.setPrototypeOf(_newDTF, _OrigDTF);
    _newDTF.supportedLocalesOf = _OrigDTF.supportedLocalesOf;
    try {
      Object.defineProperty(_newDTF, Symbol.hasInstance, {
        value: function(instance) { return instance instanceof _OrigDTF; },
        configurable: true
      });
    } catch (_) {}
    Intl.DateTimeFormat = maskFn(_newDTF, 'DateTimeFormat', 0, false);

    function getTimezoneLongName(date) {
      try {
        const fmt = new _OrigDTF('en-US', { timeZone: P.timezone, timeZoneName: 'long' });
        const parts = fmt.formatToParts(date);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        return tzPart ? tzPart.value : P.timezone.split('/').pop().replace(/_/g, ' ');
      } catch (_) { return P.timezone.split('/').pop().replace(/_/g, ' '); }
    }

    const _origDateToString = Date.prototype.toString;
    overrideMethod(Date.prototype, 'toString', function () {
      if (!(this instanceof Date) || isNaN(this.getTime())) {
        return _origDateToString.call(this);
      }
      try {
        const fmt = new _OrigDTF('en-US', {
          timeZone: P.timezone, weekday: 'short', year: 'numeric',
          month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
          second: '2-digit', hour12: false, timeZoneName: 'longOffset'
        });
        const parts = fmt.formatToParts(this);
        const get = (t) => (parts.find(p => p.type === t) || {}).value || '';
        const offset = P.timezoneOffset;
        const sign = offset <= 0 ? '+' : '-';
        const abs = Math.abs(offset);
        const oh = String(Math.floor(abs / 60)).padStart(2, '0');
        const om = String(abs % 60).padStart(2, '0');
        const tzName = getTimezoneLongName(this);
        return `${get('weekday')} ${get('month')} ${get('day')} ${get('year')} ${get('hour')}:${get('minute')}:${get('second')} GMT${sign}${oh}${om} (${tzName})`;
      } catch (_) { return _origDateToString.call(this); }
    }, 0);

    const _origDateToTimeString = Date.prototype.toTimeString;
    overrideMethod(Date.prototype, 'toTimeString', function () {
      if (!(this instanceof Date) || isNaN(this.getTime())) {
        return _origDateToTimeString.call(this);
      }
      try {
        const fmt = new _OrigDTF('en-US', {
          timeZone: P.timezone, hour: '2-digit', minute: '2-digit',
          second: '2-digit', hour12: false
        });
        const time = fmt.format(this);
        const offset = P.timezoneOffset;
        const sign = offset <= 0 ? '+' : '-';
        const abs = Math.abs(offset);
        const oh = String(Math.floor(abs / 60)).padStart(2, '0');
        const om = String(abs % 60).padStart(2, '0');
        const tzName = getTimezoneLongName(this);
        return `${time} GMT${sign}${oh}${om} (${tzName})`;
      } catch (_) { return _origDateToTimeString.call(this); }
    }, 0);
  }

  /* ──────────────────────────────────────────────────────────────
   * 7. WEBRTC LEAK PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.webrtc && typeof RTCPeerConnection !== 'undefined') {
    const _OrigRTC = RTCPeerConnection;
    const WrappedRTC = function (...args) {
      if (!new.target) {
        throw new TypeError("Failed to construct 'RTCPeerConnection': Please use the 'new' operator, this DOM object constructor cannot be called as a function.");
      }
      if (args[0]) {
        args[0] = { ...args[0], iceServers: [], iceTransportPolicy: 'relay' };
      } else {
        args[0] = { iceServers: [], iceTransportPolicy: 'relay' };
      }
      const pc = new _OrigRTC(...args);
      const _origOnIceCandidateDesc = Object.getOwnPropertyDescriptor(RTCPeerConnection.prototype, 'onicecandidate');
      try {
        Object.defineProperty(pc, 'onicecandidate', {
          get: function () { return pc._gp_oic || null; },
          set: function (fn) {
            pc._gp_oic = fn;
            if (_origOnIceCandidateDesc && _origOnIceCandidateDesc.set) {
              _origOnIceCandidateDesc.set.call(pc, function (e) {
                if (e.candidate && e.candidate.candidate) {
                  const c = e.candidate.candidate;
                  if (c.includes('typ host') || c.includes('typ srflx')) return;
                }
                if (fn) fn.call(pc, e);
              });
            }
          },
          configurable: true
        });
      } catch (_) {}
      return pc;
    };
    WrappedRTC.prototype = _OrigRTC.prototype;
    WrappedRTC.prototype.constructor = WrappedRTC;
    Object.setPrototypeOf(WrappedRTC, _OrigRTC);
    window.RTCPeerConnection = maskFn(WrappedRTC, 'RTCPeerConnection', 0, false);
    if (typeof webkitRTCPeerConnection !== 'undefined') {
      window.webkitRTCPeerConnection = window.RTCPeerConnection;
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * 8. FONT ENUMERATION NOISE
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.fonts) {
    const _origMeasureText = CanvasRenderingContext2D.prototype.measureText;
    overrideMethod(CanvasRenderingContext2D.prototype, 'measureText', function (text) {
      const metrics = _origMeasureText.call(this, text);
      const inputKey = (text || '') + '|' + (this.font || '');
      const inputHash = simpleHash(inputKey);
      const rng = mulberry32(((P.fontNoiseSeed || 0.5) * 1e6) + inputHash);
      const noise = (rng() - 0.5) * 0.2;
      const desc = {};
      const numericProps = ['width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight',
        'fontBoundingBoxAscent', 'fontBoundingBoxDescent',
        'actualBoundingBoxAscent', 'actualBoundingBoxDescent',
        'emHeightAscent', 'emHeightDescent',
        'hangingBaseline', 'alphabeticBaseline', 'ideographicBaseline'];
      for (const prop of numericProps) {
        try {
          const val = metrics[prop];
          if (typeof val === 'number') {
            desc[prop] = { value: val + noise, enumerable: true, configurable: true };
          }
        } catch (_) {}
      }
      const faked = Object.create(TextMetrics.prototype);
      Object.defineProperties(faked, desc);
      return faked;
    }, 1);

    try {
      if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
        const _origOffMeasure = OffscreenCanvasRenderingContext2D.prototype.measureText;
        overrideMethod(OffscreenCanvasRenderingContext2D.prototype, 'measureText', function (text) {
          const metrics = _origOffMeasure.call(this, text);
          const inputKey = (text || '') + '|' + (this.font || '');
          const inputHash = simpleHash(inputKey);
          const rng = mulberry32(((P.fontNoiseSeed || 0.5) * 1e6 + 3) + inputHash);
          const noise = (rng() - 0.5) * 0.2;
          const desc = {};
          const numericProps = ['width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight',
            'fontBoundingBoxAscent', 'fontBoundingBoxDescent',
            'actualBoundingBoxAscent', 'actualBoundingBoxDescent'];
          for (const prop of numericProps) {
            try {
              const val = metrics[prop];
              if (typeof val === 'number') {
                desc[prop] = { value: val + noise, enumerable: true, configurable: true };
              }
            } catch (_) {}
          }
          const faked = Object.create(TextMetrics.prototype);
          Object.defineProperties(faked, desc);
          return faked;
        }, 1);
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 9. MEDIA DEVICES SPOOFING
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.mediaDevices && P.mediaDevices && typeof MediaDevices !== 'undefined') {
    try {
      overrideMethod(MediaDevices.prototype, 'enumerateDevices', function () {
        const devices = P.mediaDevices.map(d => {
          const dev = {};
          Object.defineProperties(dev, {
            deviceId: { value: d.deviceId, enumerable: true },
            kind:     { value: d.kind, enumerable: true },
            label:    { value: d.label || '', enumerable: true },
            groupId:  { value: d.groupId, enumerable: true },
            toJSON:   { value: function () { return { deviceId: this.deviceId, kind: this.kind, label: this.label, groupId: this.groupId }; } }
          });
          Object.setPrototypeOf(dev, MediaDeviceInfo.prototype);
          return dev;
        });
        return Promise.resolve(devices);
      }, 0);
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 10. STORAGE ESTIMATE SPOOFING
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.storage && typeof StorageManager !== 'undefined') {
    try {
      let _storageCallCount = 0;
      overrideMethod(StorageManager.prototype, 'estimate', function () {
        _storageCallCount++;
        const baseUsage = P.storageUsage || 350e6;
        const variance = _storageCallCount * (1024 * Math.floor(Math.random() * 100 + 10));
        return Promise.resolve({
          quota: P.storageQuota || 250e9,
          usage: baseUsage + variance
        });
      }, 0);
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 11. MATCHMEDIA CONSISTENCY (on Window.prototype)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.matchMedia) {
    try {
      const _origMatchMedia = Window.prototype.matchMedia;
      overrideMethod(Window.prototype, 'matchMedia', function (query) {
        const result = _origMatchMedia.call(window, query);
        if (query && query.includes('prefers-color-scheme')) {
          const scheme = P.colorScheme || 'light';
          const wantsDark = query.includes('dark');
          const wantsLight = query.includes('light');
          const matches = (wantsDark && scheme === 'dark') || (wantsLight && scheme === 'light');
          try {
            overrideGetter(result, 'matches', () => matches);
          } catch (_) {}
          return result;
        }
        if (query && query.includes('prefers-reduced-motion')) {
          const shouldMatch = query.includes('no-preference');
          try {
            overrideGetter(result, 'matches', () => shouldMatch);
          } catch (_) {}
          return result;
        }
        return result;
      }, 1);
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 12. MISCELLANEOUS PROTECTIONS
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.misc) {
    try { overrideGetter(Navigator.prototype, 'webdriver', () => false); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'doNotTrack', () => P.doNotTrack); } catch (_) {}

    // NetworkInformation prototype getters (clean prototype inheritance)
    if (typeof NetworkInformation !== 'undefined') {
      try { overrideGetter(NetworkInformation.prototype, 'effectiveType', () => '4g'); } catch (_) {}
      try { overrideGetter(NetworkInformation.prototype, 'rtt', () => 50); } catch (_) {}
      try { overrideGetter(NetworkInformation.prototype, 'downlink', () => 10); } catch (_) {}
      try { overrideGetter(NetworkInformation.prototype, 'saveData', () => false); } catch (_) {}
    }

    // BatteryManager prototype getters
    if (typeof BatteryManager !== 'undefined') {
      try { overrideGetter(BatteryManager.prototype, 'charging', () => true); } catch (_) {}
      try { overrideGetter(BatteryManager.prototype, 'chargingTime', () => 0); } catch (_) {}
      try { overrideGetter(BatteryManager.prototype, 'dischargingTime', () => Infinity); } catch (_) {}
      try { overrideGetter(BatteryManager.prototype, 'level', () => 1.0); } catch (_) {}
    }

    // navigator.plugins & navigator.mimeTypes (bidirectional references matching Chrome 100+)
    try {
      const mimePdf = Object.create(MimeType.prototype);
      const mimeText = Object.create(MimeType.prototype);

      const makePlugin = (name, desc, filename) => {
        const p = Object.create(Plugin.prototype);
        Object.defineProperties(p, {
          name: { value: name, enumerable: true },
          description: { value: desc, enumerable: true },
          filename: { value: filename, enumerable: true },
          length: { value: 1, enumerable: true },
          0: { value: mimePdf, enumerable: true }
        });
        p.item = maskFn(function(i) { return i === 0 ? mimePdf : null; }, 'item', 1, false);
        p.namedItem = maskFn(function(n) { return n === 'application/pdf' ? mimePdf : null; }, 'namedItem', 1, false);
        return p;
      };

      const pluginsList = [
        makePlugin('PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('Chrome PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('Chromium PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('Microsoft Edge PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('WebKit built-in PDF', 'Portable Document Format', 'internal-pdf-viewer')
      ];

      Object.defineProperties(mimePdf, {
        type: { value: 'application/pdf', enumerable: true },
        description: { value: 'Portable Document Format', enumerable: true },
        suffixes: { value: 'pdf', enumerable: true },
        enabledPlugin: { value: pluginsList[0], enumerable: true }
      });
      Object.defineProperties(mimeText, {
        type: { value: 'text/pdf', enumerable: true },
        description: { value: 'Portable Document Format', enumerable: true },
        suffixes: { value: 'pdf', enumerable: true },
        enabledPlugin: { value: pluginsList[0], enumerable: true }
      });

      const _cachedPlugins = Object.create(PluginArray.prototype);
      pluginsList.forEach((p, i) => Object.defineProperty(_cachedPlugins, i, { value: p, enumerable: true }));
      Object.defineProperty(_cachedPlugins, 'length', { value: pluginsList.length, enumerable: true });
      _cachedPlugins.item = maskFn(function(i) { return pluginsList[i] || null; }, 'item', 1, false);
      _cachedPlugins.namedItem = maskFn(function(n) { return pluginsList.find(p => p.name === n) || null; }, 'namedItem', 1, false);
      _cachedPlugins.refresh = maskFn(function() {}, 'refresh', 0, false);
      overrideGetter(Navigator.prototype, 'plugins', () => _cachedPlugins);

      const _cachedMimeTypes = Object.create(MimeTypeArray.prototype);
      const mimes = [mimePdf, mimeText];
      Object.defineProperty(_cachedMimeTypes, 'length', { value: 2, enumerable: true });
      mimes.forEach((m, i) => Object.defineProperty(_cachedMimeTypes, i, { value: m, enumerable: true }));
      _cachedMimeTypes.item = maskFn(function(i) { return mimes[i] || null; }, 'item', 1, false);
      _cachedMimeTypes.namedItem = maskFn(function(n) { return mimes.find(m => m.type === n) || null; }, 'namedItem', 1, false);
      overrideGetter(Navigator.prototype, 'mimeTypes', () => _cachedMimeTypes);
    } catch (_) {}

    // Permissions.prototype.query
    try {
      const _origQuery = Permissions.prototype.query;
      const NORM_PERMS = {
        'notifications': 'default', 'clipboard-read': 'prompt', 'clipboard-write': 'granted',
        'camera': 'prompt', 'microphone': 'prompt', 'geolocation': 'prompt',
        'midi': 'prompt', 'screen-wake-lock': 'prompt'
      };
      overrideMethod(Permissions.prototype, 'query', function (desc) {
        if (desc && desc.name && NORM_PERMS[desc.name] !== undefined) {
          return Promise.resolve({
            state: NORM_PERMS[desc.name], name: desc.name, onchange: null
          });
        }
        return _origQuery.call(this, desc);
      }, 1);
    } catch (_) {}

    try { overrideGetter(Navigator.prototype, 'pdfViewerEnabled', () => true); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'cookieEnabled', () => true); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'onLine', () => true); } catch (_) {}
    try { overrideMethod(Navigator.prototype, 'javaEnabled', function(){ return false; }, 0); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'globalPrivacyControl', () => false); } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 13. SPEECH SYNTHESIS VOICES (on SpeechSynthesis.prototype)
   * ────────────────────────────────────────────────────────────── */
  try {
    if (typeof SpeechSynthesis !== 'undefined') {
      const _origGetVoices = SpeechSynthesis.prototype.getVoices;
      const COMMON_VOICES = [
        { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true, default: true, voiceURI: 'Microsoft David - English (United States)' },
        { name: 'Microsoft Zira - English (United States)', lang: 'en-US', localService: true, default: false, voiceURI: 'Microsoft Zira - English (United States)' },
        { name: 'Microsoft Mark - English (United States)', lang: 'en-US', localService: true, default: false, voiceURI: 'Microsoft Mark - English (United States)' },
        { name: 'Google US English', lang: 'en-US', localService: false, default: false, voiceURI: 'Google US English' },
        { name: 'Google UK English Female', lang: 'en-GB', localService: false, default: false, voiceURI: 'Google UK English Female' }
      ];
      const fakeVoices = COMMON_VOICES.map(v => {
        const voice = Object.create(SpeechSynthesisVoice.prototype);
        Object.defineProperties(voice, {
          name: { value: v.name, enumerable: true },
          lang: { value: v.lang, enumerable: true },
          localService: { value: v.localService, enumerable: true },
          default: { value: v.default, enumerable: true },
          voiceURI: { value: v.voiceURI, enumerable: true }
        });
        return voice;
      });
      overrideMethod(SpeechSynthesis.prototype, 'getVoices', function () {
        const real = _origGetVoices ? _origGetVoices.call(this) : [];
        return real.length > 0 ? fakeVoices : [];
      }, 0);
    }
  } catch (_) {}

  /* ──────────────────────────────────────────────────────────────
   * 14. GAMEPAD API
   * ────────────────────────────────────────────────────────────── */
  try {
    overrideMethod(Navigator.prototype, 'getGamepads', function () {
      return [null, null, null, null];
    }, 0);
  } catch (_) {}

  /* ──────────────────────────────────────────────────────────────
   * 15. HAR INTERACTION BREADCRUMBS & RELAY
   * ────────────────────────────────────────────────────────────── */
  let lastUserAction = null;
  let lastActionTime = 0;
  function setAction(a) { lastUserAction = a; lastActionTime = Date.now(); }
  function getRecentAction() { return (Date.now() - lastActionTime < 4000) ? lastUserAction : null; }

  try {
    document.addEventListener('click', function (e) {
      try {
        if (!_harRecordingActive) return;
        const t = e.target; if (!t) return;
        const tag = t.tagName ? t.tagName.toLowerCase() : '';
        const id = t.id ? `#${t.id}` : '';
        const cls = t.className && typeof t.className === 'string' ? `.${t.className.trim().split(/\s+/).slice(0,2).join('.')}` : '';
        const text = (t.textContent || t.getAttribute('value') || t.getAttribute('aria-label') || '').trim().substring(0, 30);
        setAction(`Click <${tag}${id}${cls}> ${text ? `"${text}"` : ''}`);
      } catch (_) {}
    }, true);
    document.addEventListener('submit', function (e) {
      try {
        if (!_harRecordingActive) return;
        const f = e.target;
        setAction(`Submit Form${f && f.id ? '#'+f.id : ''}${f && f.action ? ' -> '+f.action : ''}`);
      } catch (_) {}
    }, true);
  } catch (_) {}

  try {
    const _origOpen = Window.prototype.open;
    overrideMethod(Window.prototype, 'open', function (url, target, features) {
      if (_harRecordingActive) {
        const u = url ? (typeof url === 'string' ? url : url.toString()) : '';
        setAction(`window.open("${u}", target="${target || '_blank'}")`);
      }
      return _origOpen.apply(this, arguments);
    }, 0);
  } catch (_) {}

  try {
    const _origFetch = window.fetch;
    window.fetch = maskFn(async function (input, init) {
      if (!_harRecordingActive) return _origFetch.apply(this, arguments);
      let url = '', method = 'GET', reqBody = null;
      try {
        if (typeof input === 'string') url = input;
        else if (input && input.url) url = input.url;
        if (init) { if (init.method) method = init.method.toUpperCase(); if (init.body) reqBody = init.body; }
        else if (input && input.method) method = input.method.toUpperCase();
      } catch (_) {}
      const action = getRecentAction();
      const res = await _origFetch.apply(this, arguments);
      try {
        const clone = res.clone();
        clone.text().then(text => {
          document.dispatchEvent(new CustomEvent(_EVT_HAR, {
            detail: { url: res.url || url, method, requestBody: reqBody, responseBody: text ? text.substring(0, 200000) : '', action }
          }));
        }).catch(() => {});
      } catch (_) {}
      return res;
    }, 'fetch', 1, false);
  } catch (_) {}

})();
