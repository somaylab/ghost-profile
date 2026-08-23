/**
 * Ghost Profile — content.js
 * ═══════════════════════════════════════════════════════════════
 * Runs in ISOLATED world at document_start.
 * Bridges chrome.storage → inject.js (MAIN world) by passing
 * the FULL generated profile object.
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

    // Method 2: postMessage (for dynamic updates)
    try {
      window.postMessage({
        type: '__GHOST_PROFILE_UPDATE__',
        fullProfile: config.fullProfile,
        features: config.features
      }, '*');
    } catch (_) {}
  });

  // Listen for relay messages from window (inject.js HAR payloads)
  window.addEventListener('message', (e) => {
    if (e.source === window && e.data && e.data.type === '__GHOST_HAR_PAYLOAD_RELAY__') {
      try {
        chrome.runtime.sendMessage({
          type: 'GHOST_HAR_RELAY_PAYLOAD',
          payload: e.data.payload
        }).catch(() => {});
      } catch (_) {}
    }
  });

  // Listen for relay messages from popup/background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GHOST_UPDATE_PROFILE') {
      window.postMessage({
        type: '__GHOST_PROFILE_UPDATE__',
        fullProfile: msg.fullProfile || null,
        features: msg.features
      }, '*');
      sendResponse({ ok: true });
    }

    if (msg.type === 'GHOST_CHECK_STATUS') {
      sendResponse({ active: true });
    }
  });
})();
