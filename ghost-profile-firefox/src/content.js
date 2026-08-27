/**
 * Ghost Profile — content.js
 * ═══════════════════════════════════════════════════════════════
 * Runs in ISOLATED world at document_start.
 * Bridges chrome.storage → inject.js (MAIN world) by passing
 * the FULL generated profile object.
 * Uses stealth CustomEvents to prevent window.postMessage sniffing.
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  // L6: Must match obfuscated names in inject.js
  const _EVT_PROFILE = '\x5f_' + String.fromCharCode(71, 80) + '_P' + '\x55__';
  const _EVT_HAR     = '\x5f_' + String.fromCharCode(71, 80) + '_H' + '\x52__';

  chrome.storage.local.get(['generatedProfile', 'features', 'enabled'], (data) => {
    if (data.enabled === false) return;

    const config = {
      fullProfile: data.generatedProfile || null,
      features: data.features || {
        ua: true, screen: true, canvas: true, webgl: true,
        audio: true, timezone: true, webrtc: true, fonts: true,
        mediaDevices: true, storage: true, matchMedia: true, misc: true
      }
    };

    // Method 1: data attribute (synchronous, read before inject.js executes)
    try {
      document.documentElement.setAttribute('data-gp-cfg', JSON.stringify(config));
    } catch (_) {}

    // Method 2: Private CustomEvent (synchronous, no postMessage leak to page scripts)
    try {
      document.dispatchEvent(new CustomEvent(_EVT_PROFILE, {
        detail: {
          fullProfile: config.fullProfile,
          features: config.features
        }
      }));
    } catch (_) {}
  });

  // Listen for relay messages from inject.js via private CustomEvent
  document.addEventListener(_EVT_HAR, (e) => {
    try {
      if (e && e.detail) {
        chrome.runtime.sendMessage({
          type: 'GHOST_HAR_RELAY_PAYLOAD',
          payload: e.detail
        }).catch(() => {});
      }
    } catch (_) {}
  }, true);

  // Listen for relay messages from popup/background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GHOST_UPDATE_PROFILE') {
      try {
        document.dispatchEvent(new CustomEvent(_EVT_PROFILE, {
          detail: {
            fullProfile: msg.fullProfile || null,
            features: msg.features,
            harRecording: msg.harRecording
          }
        }));
      } catch (_) {}
      sendResponse({ ok: true });
    }

    if (msg.type === 'GHOST_CHECK_STATUS') {
      sendResponse({ active: true });
    }
  });
})();
