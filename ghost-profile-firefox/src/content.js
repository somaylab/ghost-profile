/**
 * Ghost Profile (Firefox) — content.js
 * ═══════════════════════════════════════════════════════════════
 * Runs in ISOLATED world at document_start.
 * 1. Synchronously reads profile config from storage
 * 2. Injects src/inject.js into page execution context
 * 3. Bridges updates via postMessage
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  const api = (typeof browser !== 'undefined') ? browser : chrome;

  api.storage.local.get(['generatedProfile', 'features', 'enabled'], (data) => {
    if (data.enabled === false) return;

    const config = {
      fullProfile: data.generatedProfile || null,
      features: data.features || {
        ua: true, screen: true, canvas: true, webgl: true,
        audio: true, timezone: true, webrtc: true, fonts: true,
        mediaDevices: true, storage: true, matchMedia: true, misc: true
      }
    };

    // Method 1: data attribute (synchronous, read by inject.js before page scripts run)
    try {
      document.documentElement.setAttribute('data-gp-cfg', JSON.stringify(config));
    } catch (_) {}

    // Method 2: Dynamic script injection for Firefox page context execution
    try {
      const scriptUrl = api.runtime.getURL('src/inject.js');
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = false;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch (_) {}

    // Method 3: postMessage (for dynamic live updates)
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
        api.runtime.sendMessage({
          type: 'GHOST_HAR_RELAY_PAYLOAD',
          payload: e.data.payload
        }).catch(() => {});
      } catch (_) {}
    }
  });

  // Listen for relay messages from background/popup
  api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
