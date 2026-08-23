/**
 * Ghost Profile — inject.js
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
 *   3.  Screen & Display (resolution, colorDepth, DPR, outer*)
 *   4.  Canvas fingerprint (deterministic pixel noise)
 *   5.  WebGL fingerprint (GPU vendor/renderer strings)
 *   6.  AudioContext fingerprint (sample-level noise)
 *   7.  Timezone (getTimezoneOffset, Intl.DateTimeFormat)
 *   8.  WebRTC leak protection (strip ICE servers)
 *   9.  Font enumeration noise (measureText perturbation)
 *  10.  Media devices (enumerateDevices spoofing)
 *  11.  Storage estimate (spoofed quota/usage)
 *  12.  CSS matchMedia (prefers-color-scheme consistency)
 *  13.  Misc (webdriver, connection, battery, plugins, etc.)
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
   * DEFAULT PROFILE (fallback if content.js doesn't provide one)
   * ────────────────────────────────────────────────────────────── */
  const DEFAULT_PROFILE = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.113 Safari/537.36',
    appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.113 Safari/537.36',
    platform: 'Win32',
    vendor: 'Google Inc.',
    oscpu: undefined,
    languages: ['en-US', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    doNotTrack: null,
    chUA: '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
    chUAMobile: '?0',
    chUAPlatform: '"Windows"',
    chUAPlatformVersion: '"10.0.0"',
    chUAArch: '"x86"',
    chUABitness: '"64"',
    chUAFullVersionList: '"Chromium";v="136.0.7103.113", "Google Chrome";v="136.0.7103.113", "Not.A/Brand";v="99.0.0.0"',
    chUAModel: '""',
    uaDataBrands: [
      { brand: 'Chromium', version: '136' },
      { brand: 'Google Chrome', version: '136' },
      { brand: 'Not.A/Brand', version: '99' }
    ],
    uaDataFullVersionList: [
      { brand: 'Chromium', version: '136.0.7103.113' },
      { brand: 'Google Chrome', version: '136.0.7103.113' },
      { brand: 'Not.A/Brand', version: '99.0.0.0' }
    ],
    uaDataPlatform: 'Windows',
    uaDataPlatformVersion: '10.0.0',
    uaDataArchitecture: 'x86',
    uaDataBitness: '64',
    uaDataModel: '',
    uaDataMobile: false,
    uaDataWow64: false,
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
    label: 'Chrome 136 · Windows 10 · GTX 1650'
  };

  /* ──────────────────────────────────────────────────────────────
   * STATE & CONFIGURATION
   * ────────────────────────────────────────────────────────────── */
  let P = { ...DEFAULT_PROFILE };
  let STEALTH_MODE = false;
  let FEATURES = {
    ua: true, screen: true, canvas: true, webgl: true,
    audio: true, timezone: true, webrtc: true, fonts: true,
    mediaDevices: true, storage: true, matchMedia: true, misc: true
  };

  // Read config from data attribute set by content.js
  try {
    const raw = document.documentElement.getAttribute('data-gp-cfg');
    if (raw) {
      const cfg = JSON.parse(raw);
      // Full generated profile (from generator.js)
      if (cfg.fullProfile && typeof cfg.fullProfile === 'object') {
        STEALTH_MODE = !!cfg.fullProfile.stealthMode;
        P = { ...DEFAULT_PROFILE, ...cfg.fullProfile };
      }
      if (cfg.features) Object.assign(FEATURES, cfg.features);
      document.documentElement.removeAttribute('data-gp-cfg');
    }
  } catch (_) {}

  /* ──────────────────────────────────────────────────────────────
   * UTILITY FUNCTIONS
   * ────────────────────────────────────────────────────────────── */

  /** Seeded 32-bit PRNG (Mulberry32) — deterministic noise */
  function mulberry32(seed) {
    let s = Math.imul(Math.floor(seed), 1) || 1;
    return function () {
      s |= 0;
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
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
   * 1. NAVIGATOR SPOOFING
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.ua) {
    // In STEALTH MODE: only override hardware specs, NOT ua/platform/vendor
    const navGetters = STEALTH_MODE ? {} : {
      userAgent:           () => P.userAgent,
      appVersion:          () => P.appVersion,
      platform:            () => P.platform,
      vendor:              () => P.vendor,
      language:            () => P.languages[0],
      languages:           () => Object.freeze([...P.languages]),
    };

    // Always override hardware specs (safe, not detectable by BFP)
    const hwGetters = {
      hardwareConcurrency: () => P.hardwareConcurrency,
      deviceMemory:        () => P.deviceMemory,
    };
    if (!STEALTH_MODE) hwGetters.maxTouchPoints = () => P.maxTouchPoints;

    const allNavGetters = { ...navGetters, ...hwGetters };
    // In stealth mode, also add language spoofing
    if (STEALTH_MODE) {
      allNavGetters.language = () => P.languages[0];
      allNavGetters.languages = () => Object.freeze([...P.languages]);
    }
    for (const [prop, getter] of Object.entries(allNavGetters)) {
      try { overrideGetter(Navigator.prototype, prop, getter); } catch (_) {}
    }

    // navigator.userAgentData (Chrome Client Hints JS API)
    // SKIP in stealth mode — let BFP see real userAgentData
    if (!STEALTH_MODE && ('userAgentData' in navigator || 'NavigatorUAData' in window)) {
      // Null-safety: if uaDataBrands is null/undefined, skip override entirely
      if (!P.uaDataBrands || !Array.isArray(P.uaDataBrands)) {
        // Don't override — let native userAgentData pass through
      } else {
        const makeUAData = () => {
          const obj = {
            brands: (P.uaDataBrands || []).map(b => Object.freeze({ ...b })),
            mobile: P.uaDataMobile ?? false,
            platform: P.uaDataPlatform || 'Windows',
            getHighEntropyValues: maskFn(function (hints) {
              const data = {
                brands: (P.uaDataBrands || []).map(b => Object.freeze({ ...b })),
                mobile: P.uaDataMobile ?? false,
                platform: P.uaDataPlatform || 'Windows'
              };
              if (hints.includes('architecture'))     data.architecture = P.uaDataArchitecture || 'x86';
              if (hints.includes('bitness'))           data.bitness = P.uaDataBitness || '64';
              if (hints.includes('fullVersionList') && P.uaDataFullVersionList)
                data.fullVersionList = P.uaDataFullVersionList.map(b => Object.freeze({ ...b }));
              if (hints.includes('model'))             data.model = P.uaDataModel || '';
              if (hints.includes('platformVersion'))   data.platformVersion = P.uaDataPlatformVersion || '10.0.0';
              if (hints.includes('uaFullVersion'))     data.uaFullVersion = (P.uaDataFullVersionList || [])[0]?.version || '';
              if (hints.includes('wow64'))             data.wow64 = P.uaDataWow64 ?? false;
              return Promise.resolve(data);
            }, 'function getHighEntropyValues() { [native code] }'),
            toJSON: maskFn(function () {
              return { brands: this.brands, mobile: this.mobile, platform: this.platform };
            }, 'function toJSON() { [native code] }')
          };
          return obj;
        };
        try { overrideGetter(Navigator.prototype, 'userAgentData', makeUAData); } catch (_) {}
      }
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * 2. SCREEN & DISPLAY SPOOFING
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

    // devicePixelRatio
    try {
      Object.defineProperty(window, 'devicePixelRatio', {
        get: maskFn(() => P.devicePixelRatio, 'function get devicePixelRatio() { [native code] }'),
        configurable: true, enumerable: true
      });
    } catch (_) {}

    // outerWidth / outerHeight
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

    // screenX / screenY — report 0 (single monitor)
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

    // screen.orientation
    try {
      const orientType = P.screenWidth >= P.screenHeight ? 'landscape-primary' : 'portrait-primary';
      const orientAngle = P.screenWidth >= P.screenHeight ? 0 : 90;
      if (screen.orientation) {
        overrideGetter(screen.orientation.__proto__, 'type', () => orientType);
        overrideGetter(screen.orientation.__proto__, 'angle', () => orientAngle);
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 3. CANVAS FINGERPRINT PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.canvas) {
    const _origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const _origToBlob = HTMLCanvasElement.prototype.toBlob;
    const _origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    const _origPutImageData = CanvasRenderingContext2D.prototype.putImageData;

    function applyCanvasNoise(imageData) {
      const rng = mulberry32(P.canvasNoiseSeed * 1e6);
      const d = imageData.data;
      const step = Math.max(4, Math.floor(d.length / 400));
      for (let i = 0; i < d.length; i += step) {
        const ch = i - (i % 4);
        if (ch + 3 < d.length && d[ch + 3] > 0) {
          const noise = Math.floor(rng() * 3) - 1;
          d[ch] = Math.max(0, Math.min(255, d[ch] + noise));
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
   * 4. WEBGL FINGERPRINT PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.webgl) {
    const UNMASKED_VENDOR = 0x9245;
    const UNMASKED_RENDERER = 0x9246;

    function patchWebGL(proto) {
      const _origGetParam = proto.getParameter;
      const _origGetExt = proto.getExtension;

      proto.getParameter = maskFn(function (param) {
        if (param === UNMASKED_VENDOR) return P.webglVendor;
        if (param === UNMASKED_RENDERER) return P.webglRenderer;
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

    // Also noise OscillatorNode → AnalyserNode pipeline by wrapping createAnalyser
    try {
      const _origCreateOscillator = AudioContext.prototype.createOscillator;
      const _origCreateOscillatorOA = (typeof OfflineAudioContext !== 'undefined') ?
        OfflineAudioContext.prototype.createOscillator : null;

      const wrapCreateOsc = function (orig) {
        return maskFn(function (...args) {
          const osc = orig.apply(this, args);
          // Slightly detune oscillator frequency to alter fingerprint
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
   * 6. TIMEZONE SPOOFING
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

    // Patch Intl.DateTimeFormat constructor to force spoofed timezone
    const _OrigDTF = Intl.DateTimeFormat;
    Intl.DateTimeFormat = maskFn(function (...args) {
      if (args[1] && typeof args[1] === 'object' && !args[1].timeZone) {
        args[1] = { ...args[1], timeZone: P.timezone };
      } else if (!args[1]) {
        args[1] = { timeZone: P.timezone };
      }
      return new _OrigDTF(...args);
    }, 'function DateTimeFormat() { [native code] }');
    Intl.DateTimeFormat.prototype = _OrigDTF.prototype;
    Object.setPrototypeOf(Intl.DateTimeFormat, _OrigDTF);
    Intl.DateTimeFormat.supportedLocalesOf = _OrigDTF.supportedLocalesOf;

    // Patch Date.prototype.toString to reflect spoofed timezone
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
        const tzAbbr = P.timezone.split('/').pop().replace(/_/g, ' ');
        return `${get('weekday')} ${get('month')} ${get('day')} ${get('year')} ${get('hour')}:${get('minute')}:${get('second')} GMT${sign}${oh}${om} (${tzAbbr})`;
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
        const tzAbbr = P.timezone.split('/').pop().replace(/_/g, ' ');
        return `${time} GMT${sign}${oh}${om} (${tzAbbr})`;
      } catch (_) { return _origDateToTimeString.call(this); }
    }, 'function toTimeString() { [native code] }');
  }

  /* ──────────────────────────────────────────────────────────────
   * 7. WEBRTC LEAK PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.webrtc) {
    if (typeof RTCPeerConnection !== 'undefined') {
      const _OrigRTC = RTCPeerConnection;
      window.RTCPeerConnection = maskFn(function (...args) {
        if (args[0]) args[0] = { ...args[0], iceServers: [] };
        return new _OrigRTC(...args);
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
   * 8. FONT ENUMERATION NOISE
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.fonts) {
    // measureText is used by font fingerprinters to detect installed fonts
    // by measuring glyph widths. We add tiny deterministic noise.
    const _origMeasureText = CanvasRenderingContext2D.prototype.measureText;
    const fontRng = mulberry32((P.fontNoiseSeed || 0.5) * 1e6);

    // Wrap measureText without Proxy (Proxy is detectable via Object.getPrototypeOf)
    // Instead, create a real TextMetrics-like object with noised values
    CanvasRenderingContext2D.prototype.measureText = maskFn(function (text) {
      const metrics = _origMeasureText.call(this, text);
      const noise = (fontRng() - 0.5) * 0.2; // ±0.1px

      // Read all numeric properties and create a native-like wrapper
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

    // Also add noise to OffscreenCanvas measureText if available
    try {
      if (typeof OffscreenCanvasRenderingContext2D !== 'undefined') {
        const _origOffMeasure = OffscreenCanvasRenderingContext2D.prototype.measureText;
        const fontRng2 = mulberry32((P.fontNoiseSeed || 0.5) * 1e6 + 3);
        OffscreenCanvasRenderingContext2D.prototype.measureText = maskFn(function (text) {
          const metrics = _origOffMeasure.call(this, text);
          const noise = (fontRng2() - 0.5) * 0.2;
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
      const _origEnumerate = navigator.mediaDevices.enumerateDevices;
      navigator.mediaDevices.enumerateDevices = maskFn(function () {
        // Return spoofed device list instead of real one
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
   * 10. STORAGE ESTIMATE SPOOFING
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.storage) {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const _origEstimate = navigator.storage.estimate.bind(navigator.storage);
        navigator.storage.estimate = maskFn(function () {
          return Promise.resolve({
            quota: P.storageQuota || 250e9,
            usage: P.storageUsage || 350e6
          });
        }, 'function estimate() { [native code] }');
      }
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 11. MATCHMEDIA CONSISTENCY
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.matchMedia) {
    try {
      const _origMatchMedia = window.matchMedia;
      window.matchMedia = maskFn(function (query) {
        // Intercept prefers-color-scheme to return consistent result
        if (query && query.includes('prefers-color-scheme')) {
          const scheme = P.colorScheme || 'light';
          const wantsDark = query.includes('dark');
          const wantsLight = query.includes('light');
          const matches = (wantsDark && scheme === 'dark') || (wantsLight && scheme === 'light');
          const result = _origMatchMedia.call(window, query);
          return new Proxy(result, {
            get(target, prop) {
              if (prop === 'matches') return matches;
              const val = target[prop];
              return typeof val === 'function' ? val.bind(target) : val;
            }
          });
        }
        // Intercept prefers-reduced-motion — always no-preference
        if (query && query.includes('prefers-reduced-motion')) {
          const result = _origMatchMedia.call(window, query);
          return new Proxy(result, {
            get(target, prop) {
              if (prop === 'matches') return query.includes('no-preference');
              const val = target[prop];
              return typeof val === 'function' ? val.bind(target) : val;
            }
          });
        }
        // Intercept screen resolution queries to match spoofed values
        if (query && (query.includes('device-width') || query.includes('device-height'))) {
          const result = _origMatchMedia.call(window, query);
          // Let these pass through since the screen properties are already spoofed
          return result;
        }
        return _origMatchMedia.call(window, query);
      }, 'function matchMedia() { [native code] }');
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 12. MISCELLANEOUS PROTECTIONS
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.misc) {
    // navigator.webdriver — always false
    try { overrideGetter(Navigator.prototype, 'webdriver', () => false); } catch (_) {}

    // navigator.doNotTrack
    try {
      const dnt = P.doNotTrack;
      overrideGetter(Navigator.prototype, 'doNotTrack', () => dnt);
    } catch (_) {}

    // navigator.connection — consistent
    try {
      const connData = Object.freeze({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
        type: 'wifi',
        onchange: null,
        addEventListener: maskFn(function () {}, 'function addEventListener() { [native code] }'),
        removeEventListener: maskFn(function () {}, 'function removeEventListener() { [native code] }'),
        dispatchEvent: maskFn(function () { return true; }, 'function dispatchEvent() { [native code] }')
      });
      overrideGetter(Navigator.prototype, 'connection', () => connData);
    } catch (_) {}

    // navigator.getBattery — generic full battery
    try {
      Navigator.prototype.getBattery = maskFn(function () {
        return Promise.resolve(Object.freeze({
          charging: true, chargingTime: 0,
          dischargingTime: Infinity, level: 1.0,
          onchargingchange: null, onchargingtimechange: null,
          ondischargingtimechange: null, onlevelchange: null,
          addEventListener: function () {},
          removeEventListener: function () {},
          dispatchEvent: function () { return true; }
        }));
      }, 'function getBattery() { [native code] }');
    } catch (_) {}

    // navigator.plugins — consistent (Chrome reports 5 default plugins)
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
      overrideGetter(Navigator.prototype, 'plugins', () => {
        const list = Object.create(PluginArray.prototype);
        pluginsList.forEach((p, i) => {
          Object.defineProperty(list, i, { value: p, enumerable: true });
        });
        Object.defineProperty(list, 'length', { value: pluginsList.length, enumerable: true });
        list.item = maskFn(function(i) { return pluginsList[i] || null; }, 'function item() { [native code] }');
        list.namedItem = maskFn(function(n) { return pluginsList.find(p => p.name === n) || null; }, 'function namedItem() { [native code] }');
        list.refresh = maskFn(function() {}, 'function refresh() { [native code] }');
        return list;
      });
    } catch (_) {}

    // navigator.mimeTypes — consistent
    try {
      overrideGetter(Navigator.prototype, 'mimeTypes', () => {
        const list = Object.create(MimeTypeArray.prototype);
        Object.defineProperty(list, 'length', { value: 2, enumerable: true });
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
        mimes.forEach((m, i) => Object.defineProperty(list, i, { value: m, enumerable: true }));
        list.item = maskFn(function(i) { return mimes[i] || null; }, 'function item() { [native code] }');
        list.namedItem = maskFn(function(n) { return mimes.find(m => m.type === n) || null; }, 'function namedItem() { [native code] }');
        return list;
      });
    } catch (_) {}

    // navigator.permissions.query — consistent for notifications
    try {
      const _origQuery = Permissions.prototype.query;
      Permissions.prototype.query = maskFn(function (desc) {
        if (desc.name === 'notifications') {
          return Promise.resolve({
            state: 'default', name: 'notifications', onchange: null,
            addEventListener: function () {},
            removeEventListener: function () {},
            dispatchEvent: function () { return true; }
          });
        }
        return _origQuery.call(this, desc);
      }, 'function query() { [native code] }');
    } catch (_) {}

    // Performance.now() — reduce precision to 100µs
    try {
      const _origPerfNow = Performance.prototype.now;
      Performance.prototype.now = maskFn(function () {
        return Math.round(_origPerfNow.call(this) * 10) / 10;
      }, 'function now() { [native code] }');
    } catch (_) {}

    // Consistent pdfViewerEnabled
    try { overrideGetter(Navigator.prototype, 'pdfViewerEnabled', () => true); } catch (_) {}

    // window.chrome object
    try {
      if (!window.chrome) {
        window.chrome = { runtime: {}, loadTimes: function () {}, csi: function () {} };
      }
    } catch (_) {}

    // speechSynthesis.getVoices — empty to prevent voice fingerprinting
    try {
      if ('speechSynthesis' in window) {
        speechSynthesis.getVoices = maskFn(function () { return []; },
          'function getVoices() { [native code] }');
      }
    } catch (_) {}

    // navigator.cookieEnabled — always true
    try { overrideGetter(Navigator.prototype, 'cookieEnabled', () => true); } catch (_) {}

    // navigator.onLine — always true
    try { overrideGetter(Navigator.prototype, 'onLine', () => true); } catch (_) {}

    // navigator.javaEnabled — always false
    try {
      Navigator.prototype.javaEnabled = maskFn(function () { return false; },
        'function javaEnabled() { [native code] }');
    } catch (_) {}

    // Consistent Notification.permission
    try {
      if (typeof Notification !== 'undefined') {
        Object.defineProperty(Notification, 'permission', {
          get: maskFn(() => 'default', 'function get permission() { [native code] }'),
          configurable: true
        });
      }
    } catch (_) {}

    // navigator.globalPrivacyControl — consistent
    try {
      overrideGetter(Navigator.prototype, 'globalPrivacyControl', () => false);
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 13. DYNAMIC PROFILE UPDATE LISTENER
   * ────────────────────────────────────────────────────────────── */
  window.addEventListener('message', function (e) {
    if (e.source === window && e.data && e.data.type === '__GHOST_PROFILE_UPDATE__') {
      const { fullProfile, features } = e.data;
      if (fullProfile && typeof fullProfile === 'object') {
        Object.assign(P, fullProfile);
      }
      if (features) {
        Object.assign(FEATURES, features);
      }
    }
  });

  /* ──────────────────────────────────────────────────────────────
   * 14. HAR INTERACTION BREADCRUMBS & PAYLOAD RELAY
   * ────────────────────────────────────────────────────────────── */
  let lastUserAction = null;
  let lastActionTime = 0;

  function setAction(actionStr) {
    lastUserAction = actionStr;
    lastActionTime = Date.now();
  }

  function getRecentAction() {
    if (Date.now() - lastActionTime < 4000) {
      return lastUserAction;
    }
    return null;
  }

  // Track Clicks & Form Submissions
  try {
    document.addEventListener('click', function (e) {
      try {
        const target = e.target;
        if (!target) return;
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        const id = target.id ? `#${target.id}` : '';
        const cls = target.className && typeof target.className === 'string' ? `.${target.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
        const text = (target.innerText || target.value || target.getAttribute('aria-label') || '').trim().substring(0, 30);
        setAction(`Click <${tag}${id}${cls}> ${text ? `"${text}"` : ''}`);
      } catch (_) {}
    }, true);

    document.addEventListener('submit', function (e) {
      try {
        const form = e.target;
        const id = form && form.id ? `#${form.id}` : '';
        const action = form && form.action ? ` -> ${form.action}` : '';
        setAction(`Submit Form${id}${action}`);
      } catch (_) {}
    }, true);
  } catch (_) {}

  // Hook window.open for popup tracking
  try {
    const _origOpen = window.open;
    window.open = maskFn(function (url, target, features) {
      const uStr = url ? (typeof url === 'string' ? url : url.toString()) : '';
      setAction(`window.open("${uStr}", target="${target || '_blank'}")`);
      return _origOpen.apply(this, arguments);
    }, 'function open() { [native code] }');
  } catch (_) {}

  // Hook fetch & XHR for request/response body capture
  try {
    const _origFetch = window.fetch;
    window.fetch = maskFn(async function (input, init) {
      let url = '';
      let method = 'GET';
      let reqBody = null;

      try {
        if (typeof input === 'string') url = input;
        else if (input && input.url) url = input.url;

        if (init) {
          if (init.method) method = init.method.toUpperCase();
          if (init.body) reqBody = init.body;
        } else if (input && input.method) {
          method = input.method.toUpperCase();
        }
      } catch (_) {}

      const action = getRecentAction();
      const res = await _origFetch.apply(this, arguments);

      // Clone response to read text if needed for HAR relay
      try {
        const clone = res.clone();
        clone.text().then(text => {
          window.postMessage({
            type: '__GHOST_HAR_PAYLOAD_RELAY__',
            payload: {
              url: res.url || url,
              method,
              requestBody: reqBody,
              responseBody: text ? text.substring(0, 200000) : '',
              action
            }
          }, '*');
        }).catch(() => {});
      } catch (_) {}

      return res;
    }, 'function fetch() { [native code] }');
  } catch (_) {}

  // DO NOT set detectable global flags — no window.__GHOST_PROFILE_ACTIVE__
  // Sites can check for these and flag as bot/spoofing
})();
