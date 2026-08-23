/**
 * Ghost Profile (Firefox) — inject.js
 * ═══════════════════════════════════════════════════════════════
 * Core fingerprint spoofing engine for Firefox Gecko runtime.
 * Runs at document_start in page execution context.
 *
 * Spoofing coverage:
 *   1.  Navigator (UA, platform, oscpu, memory, cores, languages, vendor)
 *   2.  Screen & Display (resolution, colorDepth, DPR, outer*)
 *   3.  Canvas fingerprint (deterministic Mulberry32 pixel noise)
 *   4.  WebGL fingerprint (GPU vendor/renderer strings)
 *   5.  AudioContext fingerprint (sample-level noise)
 *   6.  Timezone (getTimezoneOffset, Intl.DateTimeFormat)
 *   7.  WebRTC leak protection (strip ICE servers)
 *   8.  Font enumeration noise (measureText perturbation)
 *   9.  Media devices (enumerateDevices spoofing)
 *  10.  Storage estimate (spoofed quota/usage)
 *  11.  CSS matchMedia (prefers-color-scheme consistency)
 *  12.  Misc (webdriver, connection, battery, plugins, etc.)
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
   * DEFAULT FIREFOX PROFILE
   * ────────────────────────────────────────────────────────────── */
  const DEFAULT_PROFILE = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
    appVersion: '5.0 (Windows)',
    platform: 'Win32',
    vendor: '',
    oscpu: 'Windows NT 10.0; Win64; x64',
    languages: ['en-US', 'en'],
    hardwareConcurrency: 8,
    deviceMemory: 8,
    maxTouchPoints: 0,
    doNotTrack: null,
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
    label: 'Firefox 135 · WIN11 · GTX 1650'
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

  try {
    Object.defineProperty(Function.prototype, 'toString', {
      value: function () {
        return _nativeFns.get(this) || _origToString.call(this);
      },
      writable: true,
      configurable: true
    });
    _nativeFns.set(Function.prototype.toString, 'function toString() { [native code] }');
  } catch (_) {}

  function maskFn(fn, sig) {
    _nativeFns.set(fn, sig);
    try {
      Object.defineProperty(fn, 'name', { value: (sig.match(/function\s*([^(]*)/) || [])[1] || '' });
    } catch (_) {}
    return fn;
  }

  function overrideGetter(proto, prop, fn) {
    try {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      const originalGetter = desc ? desc.get : null;
      Object.defineProperty(proto, prop, {
        get: maskFn(function () {
          return fn.call(this, originalGetter);
        }, `function get ${prop}() { [native code] }`),
        set: desc ? desc.set : undefined,
        configurable: true,
        enumerable: true
      });
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 1. NAVIGATOR OVERRIDES (Firefox Compliant)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.ua) {
    // In stealth mode: userAgent stays real, hardware/languages are spoofed
    if (!STEALTH_MODE && P.userAgent) {
      overrideGetter(Navigator.prototype, 'userAgent', () => P.userAgent);
      overrideGetter(Navigator.prototype, 'appVersion', () => P.appVersion || P.userAgent.replace('Mozilla/', ''));
    }

    if (P.platform) {
      overrideGetter(Navigator.prototype, 'platform', () => P.platform);
    }

    // Firefox vendor is empty string ""
    overrideGetter(Navigator.prototype, 'vendor', () => P.vendor !== undefined ? P.vendor : '');

    // Firefox oscpu property
    if (P.oscpu !== undefined) {
      overrideGetter(Navigator.prototype, 'oscpu', () => P.oscpu);
    }

    if (P.hardwareConcurrency) {
      overrideGetter(Navigator.prototype, 'hardwareConcurrency', () => P.hardwareConcurrency);
    }

    if (P.deviceMemory) {
      overrideGetter(Navigator.prototype, 'deviceMemory', () => P.deviceMemory);
    }

    if (P.maxTouchPoints !== undefined) {
      overrideGetter(Navigator.prototype, 'maxTouchPoints', () => P.maxTouchPoints);
    }

    if (P.languages && P.languages.length > 0) {
      overrideGetter(Navigator.prototype, 'language', () => P.languages[0]);
      overrideGetter(Navigator.prototype, 'languages', () => Object.freeze([...P.languages]));
    }

    if (P.doNotTrack !== undefined) {
      overrideGetter(Navigator.prototype, 'doNotTrack', () => P.doNotTrack);
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * 2. SCREEN & DISPLAY OVERRIDES
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.screen) {
    if (P.screenWidth) {
      overrideGetter(Screen.prototype, 'width', () => P.screenWidth);
      overrideGetter(Screen.prototype, 'availWidth', () => P.availWidth || P.screenWidth);
    }
    if (P.screenHeight) {
      overrideGetter(Screen.prototype, 'height', () => P.screenHeight);
      overrideGetter(Screen.prototype, 'availHeight', () => P.availHeight || P.screenHeight - 40);
    }
    if (P.colorDepth) {
      overrideGetter(Screen.prototype, 'colorDepth', () => P.colorDepth);
      overrideGetter(Screen.prototype, 'pixelDepth', () => P.pixelDepth || P.colorDepth);
    }
    if (P.devicePixelRatio) {
      overrideGetter(window, 'devicePixelRatio', () => P.devicePixelRatio);
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * 3. CANVAS FINGERPRINT PROTECTION (Mulberry32 PRNG Noise)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.canvas && P.canvasNoiseSeed !== undefined) {
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
  if (FEATURES.webgl && (P.webglVendor || P.webglRenderer)) {
    const UNMASKED_VENDOR = 0x9245;
    const UNMASKED_RENDERER = 0x9246;

    function patchWebGL(proto) {
      const _origGetParam = proto.getParameter;
      const _origGetExt = proto.getExtension;

      proto.getParameter = maskFn(function (param) {
        if (param === UNMASKED_VENDOR && P.webglVendor) return P.webglVendor;
        if (param === UNMASKED_RENDERER && P.webglRenderer) return P.webglRenderer;
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
  if (FEATURES.audio && P.audioNoiseSeed !== undefined) {
    if (typeof AudioBuffer !== 'undefined') {
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
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * 6. TIMEZONE PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.timezone && P.timezoneOffset !== undefined) {
    Date.prototype.getTimezoneOffset = maskFn(function () {
      return P.timezoneOffset;
    }, 'function getTimezoneOffset() { [native code] }');

    const _origDateTimeFormat = Intl.DateTimeFormat;
    const _origResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;

    Intl.DateTimeFormat.prototype.resolvedOptions = maskFn(function () {
      const options = _origResolvedOptions.call(this);
      if (P.timezone) options.timeZone = P.timezone;
      return options;
    }, 'function resolvedOptions() { [native code] }');

    // Spoof Intl.DateTimeFormat constructor call without timezone specified
    const SpoofedDateTimeFormat = maskFn(function (locales, options = {}) {
      if (!options.timeZone && P.timezone) {
        options = { ...options, timeZone: P.timezone };
      }
      return new _origDateTimeFormat(locales, options);
    }, 'function DateTimeFormat() { [native code] }');

    SpoofedDateTimeFormat.prototype = _origDateTimeFormat.prototype;
    SpoofedDateTimeFormat.supportedLocalesOf = _origDateTimeFormat.supportedLocalesOf;
    try { Intl.DateTimeFormat = SpoofedDateTimeFormat; } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 7. FONT ENUMERATION NOISE
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.fonts && P.fontNoiseSeed !== undefined) {
    const _origMeasureText = CanvasRenderingContext2D.prototype.measureText;
    const fontRng = mulberry32(P.fontNoiseSeed * 1e6);

    CanvasRenderingContext2D.prototype.measureText = maskFn(function (text) {
      const metrics = _origMeasureText.call(this, text);
      const fake = Object.create(TextMetrics.prototype);

      const props = [
        'width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight',
        'fontBoundingBoxAscent', 'fontBoundingBoxDescent',
        'actualBoundingBoxAscent', 'actualBoundingBoxDescent',
        'emHeightAscent', 'emHeightDescent'
      ];

      for (const prop of props) {
        if (prop in metrics) {
          const val = metrics[prop];
          const delta = prop === 'width' ? (fontRng() - 0.5) * 0.02 : 0;
          Object.defineProperty(fake, prop, {
            value: typeof val === 'number' ? val + delta : val,
            enumerable: true
          });
        }
      }

      return fake;
    }, 'function measureText() { [native code] }');
  }

  /* ──────────────────────────────────────────────────────────────
   * 8. WEBRTC LEAK PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.webrtc && typeof RTCPeerConnection !== 'undefined') {
    const _origRTCPC = RTCPeerConnection;
    const SpoofedRTCPC = maskFn(function (config, ...rest) {
      if (config && config.iceServers) {
        config = { ...config, iceServers: [] };
      }
      return new _origRTCPC(config, ...rest);
    }, 'function RTCPeerConnection() { [native code] }');

    SpoofedRTCPC.prototype = _origRTCPC.prototype;
    SpoofedRTCPC.generateCertificate = _origRTCPC.generateCertificate;
    try { window.RTCPeerConnection = SpoofedRTCPC; } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * 9. MEDIA DEVICES PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.mediaDevices && P.mediaDevices && navigator.mediaDevices) {
    navigator.mediaDevices.enumerateDevices = maskFn(async function () {
      return P.mediaDevices.map(d => ({
        deviceId: d.deviceId,
        kind: d.kind,
        label: d.label || '',
        groupId: d.groupId || '',
        toJSON() {
          return { deviceId: this.deviceId, kind: this.kind, label: this.label, groupId: this.groupId };
        }
      }));
    }, 'function enumerateDevices() { [native code] }');
  }

  /* ──────────────────────────────────────────────────────────────
   * 10. STORAGE ESTIMATE PROTECTION
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.storage && navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate = maskFn(async function () {
      return {
        quota: P.storageQuota || 250e9,
        usage: P.storageUsage || 350e6,
        usageDetails: {}
      };
    }, 'function estimate() { [native code] }');
  }

  /* ──────────────────────────────────────────────────────────────
   * 11. CSS MATCHMEDIA (Dark/Light Consistency)
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.matchMedia && P.colorScheme && window.matchMedia) {
    const _origMatchMedia = window.matchMedia;
    window.matchMedia = maskFn(function (query) {
      const res = _origMatchMedia.call(this, query);
      if (query.includes('prefers-color-scheme')) {
        const matches = query.includes(P.colorScheme);
        return {
          matches,
          media: query,
          onchange: res.onchange,
          addListener: res.addListener ? res.addListener.bind(res) : () => {},
          removeListener: res.removeListener ? res.removeListener.bind(res) : () => {},
          addEventListener: res.addEventListener ? res.addEventListener.bind(res) : () => {},
          removeEventListener: res.removeEventListener ? res.removeEventListener.bind(res) : () => {},
          dispatchEvent: res.dispatchEvent ? res.dispatchEvent.bind(res) : () => true
        };
      }
      return res;
    }, 'function matchMedia() { [native code] }');
  }

  /* ──────────────────────────────────────────────────────────────
   * 12. MISC PROTECTIONS
   * ────────────────────────────────────────────────────────────── */
  if (FEATURES.misc) {
    // navigator.webdriver — false
    overrideGetter(Navigator.prototype, 'webdriver', () => false);

    // navigator.plugins — clean standard array
    if (Navigator.prototype.plugins) {
      overrideGetter(Navigator.prototype, 'plugins', () => {
        const arr = [];
        arr.item = (i) => arr[i] || null;
        arr.namedItem = (n) => arr.find(p => p.name === n) || null;
        arr.refresh = () => {};
        return arr;
      });
    }
  }

  /* ──────────────────────────────────────────────────────────────
   * 13. DYNAMIC PROFILE UPDATE LISTENER (STEALTH CUSTOM EVENT)
   * ────────────────────────────────────────────────────────────── */
  document.addEventListener('__GP_PROF_UPDATE__', function (e) {
    if (e && e.detail) {
      const { fullProfile, features } = e.detail;
      if (fullProfile && typeof fullProfile === 'object') {
        Object.assign(P, fullProfile);
      }
      if (features) {
        Object.assign(FEATURES, features);
      }
    }
  }, true);

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

  // Track Clicks & Form Submissions safely without DOM reflows
  try {
    document.addEventListener('click', function (e) {
      try {
        const target = e.target;
        if (!target) return;
        const tag = target.tagName ? target.tagName.toLowerCase() : '';
        const id = target.id ? `#${target.id}` : '';
        const cls = target.className && typeof target.className === 'string' ? `.${target.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
        const text = (target.textContent || target.getAttribute('value') || target.getAttribute('aria-label') || '').trim().substring(0, 30);
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

  // Hook fetch & XHR for request/response body capture via private CustomEvent
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
          document.dispatchEvent(new CustomEvent('__GP_HAR_RELAY__', {
            detail: {
              url: res.url || url,
              method,
              requestBody: reqBody,
              responseBody: text ? text.substring(0, 200000) : '',
              action
            }
          }));
        }).catch(() => {});
      } catch (_) {}

      return res;
    }, 'function fetch() { [native code] }');
  } catch (_) {}

})();
