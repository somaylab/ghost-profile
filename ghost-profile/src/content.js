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
      document.dispatchEvent(new CustomEvent('__GP_PROF_UPDATE__', {
        detail: {
          fullProfile: config.fullProfile,
          features: config.features
        }
      }));
    } catch (_) {}
  });

  // Listen for relay messages from inject.js via private CustomEvent
  document.addEventListener('__GP_HAR_RELAY__', (e) => {
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
        document.dispatchEvent(new CustomEvent('__GP_PROF_UPDATE__', {
          detail: {
            fullProfile: msg.fullProfile || null,
            features: msg.features
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
