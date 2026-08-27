/**
 * Ghost Profile — inject.js v4.0 (HARDENED)
 * ═══════════════════════════════════════════════════════════════
 * Core fingerprint spoofing engine. Runs in MAIN world at
 * document_start BEFORE any page scripts execute.
 *
 * Accepts a FULL profile object from content.js (via generator.js)
 * or falls back to a built-in default profile.
 *
 * Spoofing coverage:
 *   1.  Navigator (UA, platform, memory, cores, languages, etc.)
 *   2.  Client Hints JS API (userAgentData + getHighEntropyValues)
 *   3.  Screen & Display (resolution, colorDepth, DPR, inner/outer)
 *   4.  Canvas fingerprint (deterministic pixel noise)
 *   5.  WebGL fingerprint (GPU vendor/renderer + parameter consistency)
 *   6.  AudioContext fingerprint (sample-level noise)
 *   7.  Timezone (getTimezoneOffset, Intl.DateTimeFormat, Date.toString)
 *   8.  WebRTC leak protection (ICE policy + candidate filtering)
 *   9.  Font enumeration noise (deterministic per-input measureText)
 *  10.  Media devices (enumerateDevices spoofing)
 *  11.  Storage estimate (spoofed quota/usage with variance)
 *  12.  CSS matchMedia (prefers-color-scheme, no Proxy)
 *  13.  Misc (webdriver, connection, battery, plugins, permissions)
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

  // Listen for dynamic profile updates from content.js (SINGLE listener — C3 fix)
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
   * UTILITY FUNCTIONS
   * ────────────────────────────────────────────────────────────── */

  /** Seeded 32-bit PRNG (Mulberry32) — deterministic noise (L8: NaN guard) */
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

  /** Simple string hash for deterministic per-input noise (M11) */
  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  }

  /** Mask an overridden function so toString() returns native-looking string */
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

  function maskFn(fn, sig) {
    _nativeFns.set(fn, sig);
    return fn;
  }

  /** Override a getter on a prototype, masked as native */
  function overrideGetter(proto, prop, getter) {
    const masked = maskFn(getter, `function get ${prop}() { [native code] }`);
    Object.defineProperty(proto, prop, {
      get: masked, set: undefined,
      configurable: true, enumerable: true
    });
  }

  /* ──────────────────────────────────────────────────────────────
   * 1. NAVIGATOR SPOOFING + CLIENT HINTS (C1/C6)
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

    // C1/C6: Client Hints JS API
    try {
      if (typeof NavigatorUAData !== 'undefined' && navigator.userAgentData) {
        const _realUAData = navigator.userAgentData;
        const _realBrands = _realUAData.brands ? [..._realUAData.brands] : [];
        const _realMobile = _realUAData.mobile;
        const _realPlatform = _realUAData.platform;
        const _origGetHEV = NavigatorUAData.prototype.getHighEntropyValues;

        NavigatorUAData.prototype.getHighEntropyValues = maskFn(function (hints) {
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
        }, 'function getHighEntropyValues() { [native code] }');

        NavigatorUAData.prototype.toJSON = maskFn(function () {
          return {
            brands: P.uaDataBrands || _realBrands,
            mobile: P.uaDataMobile != null ? P.uaDataMobile : _realMobile,
            platform: P.uaDataPlatform || _realPlatform
          };
        }, 'function toJSON() { [native code] }');
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 2. SCREEN & DISPLAY SPOOFING (C5 + M3)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.screen) {
    const screenGetters = {
      width:      () => P.screenWidth,
      height:     () => P.screenHeight,
      availWidth: () => P.availWidth,
      availHeight:() => P.availHeight,
      colorDepth: () => P.colorDepth,
      pixelDepth: () => P.pixelDepth
    };
    for (const [prop, getter] of Object.entries(screenGetters)) {
      try { overrideGetter(Screen.prototype, prop, getter); } catch (_) {}
    }

    try {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: maskFn(() => P.devicePixelRatio, 'function get devicePixelRatio() { [native code] }'),
        configurable: true, enumerable: true
      });
    } catch (_) {}

    try {
      Object.defineProperty(window, 'outerWidth', {
        get: maskFn(() => P.outerWidth, 'function get outerWidth() { [native code] }'),
        configurable: true, enumerable: true
      });
      Object.defineProperty(window, 'outerHeight', {
        get: maskFn(() => P.outerHeight, 'function get outerHeight() { [native code] }'),
        configurable: true, enumerable: true
      });
    } catch (_) {}

    // C5: innerWidth / innerHeight — clamp to outerWidth/outerHeight
    try {
      Object.defineProperty(window, 'innerWidth', {
        get: maskFn(() => Math.min(P.outerWidth, P.screenWidth), 'function get innerWidth() { [native code] }'),
        configurable: true, enumerable: true
      });
      Object.defineProperty(window, 'innerHeight', {
        get: maskFn(() => Math.min(P.outerHeight, P.screenHeight), 'function get innerHeight() { [native code] }'),
        configurable: true, enumerable: true
      });
    } catch (_) {}

    // C5: visualViewport
    try {
      if (window.visualViewport) {
        overrideGetter(VisualViewport.prototype, 'width', () => Math.min(P.outerWidth, P.screenWidth));
        overrideGetter(VisualViewport.prototype, 'height', () => Math.min(P.outerHeight, P.screenHeight));
      }
    } catch (_) {}

    try {
      Object.defineProperty(window, 'screenX', {
        get: maskFn(() => 0, 'function get screenX() { [native code] }'),
        configurable: true, enumerable: true
      });
      Object.defineProperty(window, 'screenY', {
        get: maskFn(() => 0, 'function get screenY() { [native code] }'),
        configurable: true, enumerable: true
      });
    } catch (_) {}

    // M3: Use ScreenOrientation.prototype
    try {
      const orientType = P.screenWidth >= P.screenHeight ? 'landscape-primary' : 'portrait-primary';
      const orientAngle = P.screenWidth >= P.screenHeight ? 0 : 90;
      if (typeof ScreenOrientation !== 'undefined') {
        overrideGetter(ScreenOrientation.prototype, 'type', () => orientType);
        overrideGetter(ScreenOrientation.prototype, 'angle', () => orientAngle);
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 3. CANVAS FINGERPRINT PROTECTION (M1: improved density)
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

    HTMLCanvasElement.prototype.toDataURL = maskFn(function (...args) {
      if (this.width === 0 || this.height === 0) return _origToDataURL.apply(this, args);
      try {
        const tmp = document.createElement('canvas');
        tmp.width = this.width; tmp.height = this.height;
        const ctx = tmp.getContext('2d');
        ctx.drawImage(this, 0, 0);
        const img = _origGetImageData.call(ctx, 0, 0, tmp.width, tmp.height);
        applyCanvasNoise(img);
        _origPutImageData.call(ctx, img, 0, 0);
        return _origToDataURL.apply(tmp, args);
      } catch (_) { return _origToDataURL.apply(this, args); }
    }, 'function toDataURL() { [native code] }');

    HTMLCanvasElement.prototype.toBlob = maskFn(function (callback, ...rest) {
      if (this.width === 0 || this.height === 0) return _origToBlob.call(this, callback, ...rest);
      try {
        const tmp = document.createElement('canvas');
        tmp.width = this.width; tmp.height = this.height;
        const ctx = tmp.getContext('2d');
        ctx.drawImage(this, 0, 0);
        const img = _origGetImageData.call(ctx, 0, 0, tmp.width, tmp.height);
        applyCanvasNoise(img);
        _origPutImageData.call(ctx, img, 0, 0);
        return _origToBlob.call(tmp, callback, ...rest);
      } catch (_) { return _origToBlob.call(this, callback, ...rest); }
    }, 'function toBlob() { [native code] }');

    CanvasRenderingContext2D.prototype.getImageData = maskFn(function (...args) {
      const img = _origGetImageData.apply(this, args);
      applyCanvasNoise(img);
      return img;
    }, 'function getImageData() { [native code] }');
  }

  /* ──────────────────────────────────────────────────────────────
   * 4. WEBGL FINGERPRINT PROTECTION (M2: parameter consistency)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.webgl) {
    const UNMASKED_VENDOR = 0x9245;
    const UNMASKED_RENDERER = 0x9246;

    const GPU_PARAMS_BY_TIER = {
      low: {
        0x0D33: 8192, 0x84E8: 8192,
        0x0D3A: new Float32Array([8192, 8192]),
        0x8869: 16, 0x8DFD: 15, 0x8B4D: 16,
        0x846E: new Float32Array([1, 1]),
        0x846D: new Float32Array([1, 255.875]),
        0x8B49: 221
      },
      mid: {
        0x0D33: 16384, 0x84E8: 16384,
        0x0D3A: new Float32Array([16384, 16384]),
        0x8869: 16, 0x8DFD: 30, 0x8B4D: 32,
        0x846E: new Float32Array([1, 1]),
        0x846D: new Float32Array([1, 1024]),
        0x8B49: 1024
      },
      high: {
        0x0D33: 32768, 0x84E8: 32768,
        0x0D3A: new Float32Array([32768, 32768]),
        0x8869: 16, 0x8DFD: 30, 0x8B4D: 32,
        0x846E: new Float32Array([1, 1]),
        0x846D: new Float32Array([1, 1024]),
        0x8B49: 4096
      }
    };

    function getGpuTier() {
      const r = P.webglRenderer || '';
      if (r.includes('RTX 4') || r.includes('RTX 3070') || r.includes('RTX 3060 Ti') ||
          r.includes('RTX 2070') || r.includes('RX 6700') || r.includes('M1 Pro') ||
          r.includes('M2 Pro') || r.includes('M3 Pro') || r.includes('M4')) return 'high';
      if (r.includes('RTX') || r.includes('GTX 1650') || r.includes('GTX 1660') ||
          r.includes('RX 5600') || r.includes('RX 6600') || r.includes('RX 7600') ||
          r.includes('Iris') || r.includes('M1') || r.includes('M2') || r.includes('M3')) return 'mid';
      return 'low';
    }

    function patchWebGL(proto) {
      const _origGetParam = proto.getParameter;
      const _origGetExt = proto.getExtension;

      proto.getParameter = maskFn(function (param) {
        if (param === UNMASKED_VENDOR) return P.webglVendor;
        if (param === UNMASKED_RENDERER) return P.webglRenderer;
        const tier = getGpuTier();
        const tierParams = GPU_PARAMS_BY_TIER[tier];
        if (tierParams && tierParams[param] !== undefined) {
          return tierParams[param];
        }
        return _origGetParam.call(this, param);
      }, 'function getParameter() { [native code] }');

      proto.getExtension = maskFn(function (name) {
        const ext = _origGetExt.call(this, name);
        if (name === 'WEBGL_debug_renderer_info' && ext) {
          return { UNMASKED_VENDOR_WEBGL: UNMASKED_VENDOR, UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER };
        }
        return ext;
      }, 'function getExtension() { [native code] }');
    }

    try { patchWebGL(WebGLRenderingContext.prototype); } catch (_) {}
    try { if (typeof WebGL2RenderingContext !== 'undefined') patchWebGL(WebGL2RenderingContext.prototype); } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 5. AUDIO FINGERPRINT PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.audio) {
    const _origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = maskFn(function (channel) {
      const data = _origGetChannelData.call(this, channel);
      if (data.length < 100000) {
        const rng = mulberry32(P.audioNoiseSeed * 1e6);
        const step = Math.max(1, Math.floor(data.length / 200));
        for (let i = 0; i < data.length; i += step) {
          data[i] += (rng() - 0.5) * 1e-7;
        }
      }
      return data;
    }, 'function getChannelData() { [native code] }');

    if (AudioBuffer.prototype.copyFromChannel) {
      const _origCopyFrom = AudioBuffer.prototype.copyFromChannel;
      AudioBuffer.prototype.copyFromChannel = maskFn(function (dest, ch, start) {
        _origCopyFrom.call(this, dest, ch, start);
        if (dest.length < 100000) {
          const rng = mulberry32(P.audioNoiseSeed * 1e6 + 7);
          const step = Math.max(1, Math.floor(dest.length / 200));
          for (let i = 0; i < dest.length; i += step) {
            dest[i] += (rng() - 0.5) * 1e-7;
          }
        }
      }, 'function copyFromChannel() { [native code] }');
    }

    if (typeof AnalyserNode !== 'undefined') {
      const _origGetFloatFreq = AnalyserNode.prototype.getFloatFrequencyData;
      if (_origGetFloatFreq) {
        AnalyserNode.prototype.getFloatFrequencyData = maskFn(function (arr) {
          _origGetFloatFreq.call(this, arr);
          const rng = mulberry32(P.audioNoiseSeed * 1e6 + 13);
          for (let i = 0; i < arr.length; i += 10) arr[i] += (rng() - 0.5) * 0.01;
        }, 'function getFloatFrequencyData() { [native code] }');
      }
      const _origGetByteFreq = AnalyserNode.prototype.getByteFrequencyData;
      if (_origGetByteFreq) {
        AnalyserNode.prototype.getByteFrequencyData = maskFn(function (arr) {
          _origGetByteFreq.call(this, arr);
          const rng = mulberry32(P.audioNoiseSeed * 1e6 + 19);
          for (let i = 0; i < arr.length; i += 8) {
            arr[i] = Math.max(0, Math.min(255, arr[i] + Math.floor((rng() - 0.5) * 2)));
          }
        }, 'function getByteFrequencyData() { [native code] }');
      }
      const _origGetFloatTime = AnalyserNode.prototype.getFloatTimeDomainData;
      if (_origGetFloatTime) {
        AnalyserNode.prototype.getFloatTimeDomainData = maskFn(function (arr) {
          _origGetFloatTime.call(this, arr);
          const rng = mulberry32(P.audioNoiseSeed * 1e6 + 23);
          for (let i = 0; i < arr.length; i += 8) arr[i] += (rng() - 0.5) * 1e-7;
        }, 'function getFloatTimeDomainData() { [native code] }');
      }
    }

    try {
      const _origCreateOscillator = AudioContext.prototype.createOscillator;
      const _origCreateOscillatorOA = (typeof OfflineAudioContext !== 'undefined') ?
        OfflineAudioContext.prototype.createOscillator : null;
      const wrapCreateOsc = function (orig) {
        return maskFn(function (...args) {
          const osc = orig.apply(this, args);
          const origFreq = osc.frequency.value;
          const rng = mulberry32(P.audioNoiseSeed * 1e6 + 37);
          osc.frequency.value = origFreq + (rng() - 0.5) * 0.001;
          return osc;
        }, 'function createOscillator() { [native code] }');
      };
      AudioContext.prototype.createOscillator = wrapCreateOsc(_origCreateOscillator);
      if (_origCreateOscillatorOA) {
        OfflineAudioContext.prototype.createOscillator = wrapCreateOsc(_origCreateOscillatorOA);
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 6. TIMEZONE SPOOFING (M8: fix abbrev, M9: fix instanceof)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.timezone) {
    Date.prototype.getTimezoneOffset = maskFn(function () {
      return P.timezoneOffset;
    }, 'function getTimezoneOffset() { [native code] }');

    const _origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = maskFn(function () {
      const result = _origResolvedOptions.call(this);
      result.timeZone = P.timezone;
      return result;
    }, 'function resolvedOptions() { [native code] }');

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
    Object.setPrototypeOf(_newDTF, _OrigDTF);
    _newDTF.supportedLocalesOf = _OrigDTF.supportedLocalesOf;
    try {
      Object.defineProperty(_newDTF, Symbol.hasInstance, {
        value: function(instance) { return instance instanceof _OrigDTF; },
        configurable: true
      });
    } catch (_) {}
    Intl.DateTimeFormat = maskFn(_newDTF, 'function DateTimeFormat() { [native code] }');

    function getTimezoneLongName(date) {
      try {
        const fmt = new _OrigDTF('en-US', { timeZone: P.timezone, timeZoneName: 'long' });
        const parts = fmt.formatToParts(date);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        return tzPart ? tzPart.value : P.timezone.split('/').pop().replace(/_/g, ' ');
      } catch (_) { return P.timezone.split('/').pop().replace(/_/g, ' '); }
    }

    const _origDateToString = Date.prototype.toString;
    Date.prototype.toString = maskFn(function () {
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
    }, 'function toString() { [native code] }');

    const _origDateToTimeString = Date.prototype.toTimeString;
    Date.prototype.toTimeString = maskFn(function () {
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
    }, 'function toTimeString() { [native code] }');
  }

  /* ──────────────────────────────────────────────────────────────
   * 7. WEBRTC LEAK PROTECTION (C4: iceTransportPolicy + filtering)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.webrtc) {
    if (typeof RTCPeerConnection !== 'undefined') {
      const _OrigRTC = RTCPeerConnection;
      window.RTCPeerConnection = maskFn(function (...args) {
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
      }, 'function RTCPeerConnection() { [native code] }');
      window.RTCPeerConnection.prototype = _OrigRTC.prototype;
      Object.setPrototypeOf(window.RTCPeerConnection, _OrigRTC);
      for (const key of Object.getOwnPropertyNames(_OrigRTC)) {
        if (!(key in window.RTCPeerConnection)) {
          try {
            Object.defineProperty(window.RTCPeerConnection, key,
              Object.getOwnPropertyDescriptor(_OrigRTC, key));
          } catch (_) {}
        }
      }
    }
    if (typeof webkitRTCPeerConnection !== 'undefined') {
      window.webkitRTCPeerConnection = window.RTCPeerConnection;
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * 8. FONT ENUMERATION NOISE (M11: deterministic per-input)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.fonts) {
    const _origMeasureText = CanvasRenderingContext2D.prototype.measureText;
    CanvasRenderingContext2D.prototype.measureText = maskFn(function (text) {
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
    }, 'function measureText() { [native code] }');

    try {
      if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
        const _origOffMeasure = OffscreenCanvasRenderingContext2D.prototype.measureText;
        OffscreenCanvasRenderingContext2D.prototype.measureText = maskFn(function (text) {
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
        }, 'function measureText() { [native code] }');
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 9. MEDIA DEVICES SPOOFING
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.mediaDevices && P.mediaDevices) {
    try {
      navigator.mediaDevices.enumerateDevices = maskFn(function () {
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
      }, 'function enumerateDevices() { [native code] }');
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 10. STORAGE ESTIMATE SPOOFING (M10: with variance)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.storage) {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        let _storageCallCount = 0;
        navigator.storage.estimate = maskFn(function () {
          _storageCallCount++;
          const baseUsage = P.storageUsage || 350e6;
          const variance = _storageCallCount * (1024 * Math.floor(Math.random() * 100 + 10));
          return Promise.resolve({
            quota: P.storageQuota || 250e9,
            usage: baseUsage + variance
          });
        }, 'function estimate() { [native code] }');
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 11. MATCHMEDIA CONSISTENCY (M4: no Proxy)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.matchMedia) {
    try {
      const _origMatchMedia = window.matchMedia;
      window.matchMedia = maskFn(function (query) {
        const result = _origMatchMedia.call(window, query);
        if (query && query.includes('prefers-color-scheme')) {
          const scheme = P.colorScheme || 'light';
          const wantsDark = query.includes('dark');
          const wantsLight = query.includes('light');
          const matches = (wantsDark && scheme === 'dark') || (wantsLight && scheme === 'light');
          try {
            Object.defineProperty(result, 'matches', {
              get: maskFn(() => matches, 'function get matches() { [native code] }'),
              configurable: true
            });
          } catch (_) {}
          return result;
        }
        if (query && query.includes('prefers-reduced-motion')) {
          const shouldMatch = query.includes('no-preference');
          try {
            Object.defineProperty(result, 'matches', {
              get: maskFn(() => shouldMatch, 'function get matches() { [native code] }'),
              configurable: true
            });
          } catch (_) {}
          return result;
        }
        return result;
      }, 'function matchMedia() { [native code] }');
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 12. MISCELLANEOUS PROTECTIONS (M5, M6, M7, M12, L1)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.misc) {
    try { overrideGetter(Navigator.prototype, 'webdriver', () => false); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'doNotTrack', () => P.doNotTrack); } catch (_) {}

    // M5: navigator.connection
    try {
      const connObj = (typeof NetworkInformation !== 'undefined') ?
        Object.create(NetworkInformation.prototype) : {};
      Object.defineProperties(connObj, {
        effectiveType: { value: '4g', enumerable: true, configurable: true, writable: true },
        rtt:           { value: 50, enumerable: true, configurable: true, writable: true },
        downlink:      { value: 10, enumerable: true, configurable: true, writable: true },
        saveData:      { value: false, enumerable: true, configurable: true, writable: true },
        type:          { value: 'wifi', enumerable: true, configurable: true, writable: true },
        onchange:      { value: null, enumerable: true, configurable: true, writable: true },
        addEventListener:    { value: maskFn(function(){}, 'function addEventListener() { [native code] }'), enumerable: false },
        removeEventListener: { value: maskFn(function(){}, 'function removeEventListener() { [native code] }'), enumerable: false },
        dispatchEvent:       { value: maskFn(function(){ return true; }, 'function dispatchEvent() { [native code] }'), enumerable: false }
      });
      overrideGetter(Navigator.prototype, 'connection', () => connObj);
    } catch (_) {}

    // L1: navigator.getBattery — masked event listeners
    try {
      const batteryObj = {};
      Object.defineProperties(batteryObj, {
        charging:              { value: true, enumerable: true, configurable: true, writable: true },
        chargingTime:          { value: 0, enumerable: true, configurable: true, writable: true },
        dischargingTime:       { value: Infinity, enumerable: true, configurable: true, writable: true },
        level:                 { value: 1.0, enumerable: true, configurable: true, writable: true },
        onchargingchange:      { value: null, enumerable: true, configurable: true, writable: true },
        onchargingtimechange:  { value: null, enumerable: true, configurable: true, writable: true },
        ondischargingtimechange: { value: null, enumerable: true, configurable: true, writable: true },
        onlevelchange:         { value: null, enumerable: true, configurable: true, writable: true },
        addEventListener:      { value: maskFn(function(){}, 'function addEventListener() { [native code] }'), enumerable: false },
        removeEventListener:   { value: maskFn(function(){}, 'function removeEventListener() { [native code] }'), enumerable: false },
        dispatchEvent:         { value: maskFn(function(){ return true; }, 'function dispatchEvent() { [native code] }'), enumerable: false }
      });
      try { if (typeof BatteryManager !== 'undefined') Object.setPrototypeOf(batteryObj, BatteryManager.prototype); } catch(_){}
      Object.freeze(batteryObj);
      Navigator.prototype.getBattery = maskFn(function () {
        return Promise.resolve(batteryObj);
      }, 'function getBattery() { [native code] }');
    } catch (_) {}

    // M6: navigator.plugins — cached singleton
    try {
      const makePlugin = (name, desc, filename) => {
        const p = Object.create(Plugin.prototype);
        Object.defineProperties(p, {
          name: { value: name, enumerable: true },
          description: { value: desc, enumerable: true },
          filename: { value: filename, enumerable: true },
          length: { value: 0, enumerable: true }
        });
        return p;
      };
      const pluginsList = [
        makePlugin('PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('Chrome PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('Chromium PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('Microsoft Edge PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
        makePlugin('WebKit built-in PDF', 'Portable Document Format', 'internal-pdf-viewer')
      ];
      const _cachedPlugins = Object.create(PluginArray.prototype);
      pluginsList.forEach((p, i) => Object.defineProperty(_cachedPlugins, i, { value: p, enumerable: true }));
      Object.defineProperty(_cachedPlugins, 'length', { value: pluginsList.length, enumerable: true });
      _cachedPlugins.item = maskFn(function(i) { return pluginsList[i] || null; }, 'function item() { [native code] }');
      _cachedPlugins.namedItem = maskFn(function(n) { return pluginsList.find(p => p.name === n) || null; }, 'function namedItem() { [native code] }');
      _cachedPlugins.refresh = maskFn(function() {}, 'function refresh() { [native code] }');
      overrideGetter(Navigator.prototype, 'plugins', () => _cachedPlugins);
    } catch (_) {}

    // M7: navigator.mimeTypes — cached singleton
    try {
      const makeMime = (type, desc, suffix) => {
        const m = Object.create(MimeType.prototype);
        Object.defineProperties(m, {
          type: { value: type, enumerable: true },
          description: { value: desc, enumerable: true },
          suffixes: { value: suffix, enumerable: true }
        });
        return m;
      };
      const mimes = [
        makeMime('application/pdf', 'Portable Document Format', 'pdf'),
        makeMime('text/pdf', 'Portable Document Format', 'pdf')
      ];
      const _cachedMimeTypes = Object.create(MimeTypeArray.prototype);
      Object.defineProperty(_cachedMimeTypes, 'length', { value: 2, enumerable: true });
      mimes.forEach((m, i) => Object.defineProperty(_cachedMimeTypes, i, { value: m, enumerable: true }));
      _cachedMimeTypes.item = maskFn(function(i) { return mimes[i] || null; }, 'function item() { [native code] }');
      _cachedMimeTypes.namedItem = maskFn(function(n) { return mimes.find(m => m.type === n) || null; }, 'function namedItem() { [native code] }');
      overrideGetter(Navigator.prototype, 'mimeTypes', () => _cachedMimeTypes);
    } catch (_) {}

    // M12: navigator.permissions.query — normalize multiple permissions
    try {
      const _origQuery = Permissions.prototype.query;
      const NORM_PERMS = {
        'notifications': 'default', 'clipboard-read': 'prompt', 'clipboard-write': 'granted',
        'camera': 'prompt', 'microphone': 'prompt', 'geolocation': 'prompt',
        'midi': 'prompt', 'screen-wake-lock': 'prompt'
      };
      Permissions.prototype.query = maskFn(function (desc) {
        if (desc && desc.name && NORM_PERMS[desc.name] !== undefined) {
          return Promise.resolve({
            state: NORM_PERMS[desc.name], name: desc.name, onchange: null,
            addEventListener: maskFn(function(){}, 'function addEventListener() { [native code] }'),
            removeEventListener: maskFn(function(){}, 'function removeEventListener() { [native code] }'),
            dispatchEvent: maskFn(function(){ return true; }, 'function dispatchEvent() { [native code] }')
          });
        }
        return _origQuery.call(this, desc);
      }, 'function query() { [native code] }');
    } catch (_) {}

    try { overrideGetter(Navigator.prototype, 'pdfViewerEnabled', () => true); } catch (_) {}
    try { if (!window.chrome) { window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} }; } } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'cookieEnabled', () => true); } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'onLine', () => true); } catch (_) {}
    try { Navigator.prototype.javaEnabled = maskFn(function(){ return false; }, 'function javaEnabled() { [native code] }'); } catch (_) {}
    try { if (typeof Notification !== 'undefined') { Object.defineProperty(Notification, 'permission', { get: maskFn(() => 'default', 'function get permission() { [native code] }'), configurable: true }); } } catch (_) {}
    try { overrideGetter(Navigator.prototype, 'globalPrivacyControl', () => false); } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 13. HAR INTERACTION BREADCRUMBS (L4: conditional)
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
    const _origOpen = window.open;
    window.open = maskFn(function (url, target, features) {
      if (_harRecordingActive) {
        const u = url ? (typeof url === 'string' ? url : url.toString()) : '';
        setAction(`window.open("${u}", target="${target || '_blank'}")`);
      }
      return _origOpen.apply(this, arguments);
    }, 'function open() { [native code] }');
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
    }, 'function fetch() { [native code] }');
  } catch (_) {}

})();
