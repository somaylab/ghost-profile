/**
 * Ghost Profile (Firefox) — background.js
 * ═══════════════════════════════════════════════════════════════
 * Background script for Firefox WebExtension:
 * 1. HTTP header spoofing via declarativeNetRequest
 * 2. Profile storage & messaging relay across tabs
 * 3. Sidebar toggle on action click
 * 4. Reload all / active tab support
 * ═══════════════════════════════════════════════════════════════
 */

const api = (typeof browser !== 'undefined') ? browser : chrome;

/* ──────────────────────────────────────────────────────────────
 * FIREFOX SIDEBAR TOGGLE ON ACTION CLICK
 * ────────────────────────────────────────────────────────────── */
if (api.action && api.action.onClicked) {
  api.action.onClicked.addListener(async () => {
    try {
      if (api.sidebarAction) {
        if (typeof api.sidebarAction.toggle === 'function') {
          await api.sidebarAction.toggle();
        } else if (typeof api.sidebarAction.open === 'function') {
          await api.sidebarAction.open();
        }
      }
    } catch (err) {
      console.warn('[Ghost Profile Firefox] Sidebar toggle:', err);
    }
  });
}

/* ──────────────────────────────────────────────────────────────
 * HEADER RULE MANAGEMENT (declarativeNetRequest)
 * ────────────────────────────────────────────────────────────── */
const ALL_RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script',
  'image', 'font', 'object', 'xmlhttprequest',
  'ping', 'csp_report', 'media', 'websocket', 'other'
];

/**
 * Build header modification rules from a generated profile object.
 */
function buildHeadersFromProfile(profile) {
  if (!profile || !profile.userAgent) return null;

  const headers = {
    'User-Agent': profile.userAgent
  };

  // Only add Client Hints if present (Chromium targets, null in Firefox stealth)
  if (profile.chUA) headers['Sec-CH-UA'] = profile.chUA;
  if (profile.chUAMobile) headers['Sec-CH-UA-Mobile'] = profile.chUAMobile;
  if (profile.chUAPlatform) headers['Sec-CH-UA-Platform'] = profile.chUAPlatform;

  // C7: Add Accept-Language header matching spoofed navigator.languages
  if (profile.languages && Array.isArray(profile.languages) && profile.languages.length > 0) {
    const acceptLang = profile.languages.map((lang, i) => {
      if (i === 0) return lang;
      const q = Math.max(0.1, 1 - (i * 0.1)).toFixed(1);
      return `${lang};q=${q}`;
    }).join(',');
    headers['Accept-Language'] = acceptLang;
  }

  const requestHeaders = [];
  for (const [header, value] of Object.entries(headers)) {
    if (value !== undefined && value !== null) {
      requestHeaders.push({ header, operation: 'set', value });
    }
  }

  return requestHeaders;
}

async function applyHeaderRulesFromProfile(profile) {
  if (!profile) {
    await removeHeaderRules();
    return;
  }

  // C7: Even in stealth mode, set Accept-Language to match spoofed navigator.languages
  if (profile.stealthMode !== false) {
    console.log('[Ghost Profile] Stealth mode — setting Accept-Language only');
    try {
      const existingRules = await api.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = existingRules.map(r => r.id);
      const langHeaders = [];
      if (profile.languages && Array.isArray(profile.languages) && profile.languages.length > 0) {
        const acceptLang = profile.languages.map((lang, i) => {
          if (i === 0) return lang;
          const q = Math.max(0.1, 1 - (i * 0.1)).toFixed(1);
          return `${lang};q=${q}`;
        }).join(',');
        langHeaders.push({ header: 'Accept-Language', operation: 'set', value: acceptLang });
      }
      if (langHeaders.length > 0) {
        await api.declarativeNetRequest.updateDynamicRules({
          removeRuleIds,
          addRules: [{
            id: 1, priority: 1,
            action: { type: 'modifyHeaders', requestHeaders: langHeaders },
            condition: { urlFilter: '*', resourceTypes: ALL_RESOURCE_TYPES }
          }]
        });
      } else {
        if (removeRuleIds.length > 0) await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
      }
    } catch (err) {
      console.error('[Ghost Profile] Failed to apply Accept-Language:', err);
    }
    return;
  }

  const requestHeaders = buildHeadersFromProfile(profile);
  if (!requestHeaders || requestHeaders.length === 0) {
    await removeHeaderRules();
    return;
  }

  try {
    const existingRules = await api.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    await api.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [{
        id: 1,
        priority: 1,
        action: { type: 'modifyHeaders', requestHeaders },
        condition: {
          urlFilter: '*',
          resourceTypes: ALL_RESOURCE_TYPES
        }
      }]
    });
    console.log(`[Ghost Profile] Header rules applied: ${profile.label || 'custom'}`);
  } catch (err) {
    console.error('[Ghost Profile] Failed to apply header rules:', err);
  }
}

async function removeHeaderRules() {
  try {
    const existingRules = await api.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);
    if (removeRuleIds.length > 0) {
      await api.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
    }
    console.log('[Ghost Profile] Header rules completely removed');
  } catch (err) {
    console.error('[Ghost Profile] Failed to remove header rules:', err);
  }
}

// Ensure clean dynamic rules on startup
api.storage.local.get(['generatedProfile', 'enabled'], async (data) => {
  if (data && data.generatedProfile) {
    await applyHeaderRulesFromProfile(data.generatedProfile);
  } else {
    await removeHeaderRules();
  }
});

/* ──────────────────────────────────────────────────────────────
 * TAB RELOAD UTILITIES
 * ────────────────────────────────────────────────────────────── */
function reloadActiveTab() {
  api.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs && tabs[0] && tabs[0].id) {
      api.tabs.reload(tabs[0].id);
    }
  });
}

function reloadAllTabs() {
  api.tabs.query({}, tabs => {
    if (!tabs) return;
    for (const tab of tabs) {
      if (tab.id && tab.url && !tab.url.startsWith('about:') && !tab.url.startsWith('chrome:') && !tab.url.startsWith('moz-extension:')) {
        api.tabs.reload(tab.id);
      }
    }
  });
}

/* ──────────────────────────────────────────────────────────────
 * L4: BROADCAST HAR RECORDING STATE
 * ────────────────────────────────────────────────────────────── */
function broadcastHarState(isRecording) {
  api.tabs.query({}, tabs => {
    if (!tabs) return;
    for (const tab of tabs) {
      if (!tab.id) continue;
      if (tab.url && (tab.url.startsWith('about:') || tab.url.startsWith('chrome:') || tab.url.startsWith('moz-extension://'))) continue;
      try {
        const p = api.tabs.sendMessage(tab.id, { type: 'GHOST_UPDATE_PROFILE', harRecording: isRecording });
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    }
  });
}

/* ──────────────────────────────────────────────────────────────
 * MESSAGE HANDLING
 * ────────────────────────────────────────────────────────────── */
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GHOST_APPLY_PROFILE') {
    const { generatedProfile, features, enabled, reloadAll } = msg;

    api.storage.local.set({ generatedProfile, features, enabled });

    const afterRules = () => {
      api.tabs.query({}, tabs => {
        if (!tabs) return;
        for (const tab of tabs) {
          if (!tab.id) continue;
          if (tab.url && (tab.url.startsWith('about:') || tab.url.startsWith('chrome:') || tab.url.startsWith('moz-extension://'))) {
            continue;
          }
          try {
            const p = api.tabs.sendMessage(tab.id, {
              type: 'GHOST_UPDATE_PROFILE',
              fullProfile: generatedProfile,
              features
            });
            if (p && typeof p.catch === 'function') {
              p.catch(() => {});
            }
          } catch (_) {}
        }
      });

      setTimeout(() => {
        if (reloadAll) reloadAllTabs();
        else reloadActiveTab();
      }, 200);

      sendResponse({ ok: true });
    };

    if (enabled === false) {
      removeHeaderRules().then(afterRules);
    } else if (generatedProfile) {
      applyHeaderRulesFromProfile(generatedProfile).then(afterRules);
    } else {
      afterRules();
    }

    return true; // async
  }

  if (msg.type === 'GHOST_GET_CONFIG') {
    api.storage.local.get(['generatedProfile', 'features', 'enabled'], data => {
      sendResponse({
        generatedProfile: data.generatedProfile || null,
        features: data.features || {
          ua: true, screen: true, canvas: true, webgl: true,
          audio: true, timezone: true, webrtc: true, fonts: true,
          mediaDevices: true, storage: true, matchMedia: true, misc: true
        },
        enabled: data.enabled !== false
      });
    });
    return true; // async
  }

  // ── HAR RECORDER CONTROLS ──
  if (msg.type === 'GHOST_HAR_START') {
    const ok = self.GhostHarEngine ? self.GhostHarEngine.startRecording() : false;
    broadcastHarState(true);
    sendResponse({ ok, stats: self.GhostHarEngine ? self.GhostHarEngine.getStats() : null });
    return true;
  }

  if (msg.type === 'GHOST_HAR_STOP') {
    const ok = self.GhostHarEngine ? self.GhostHarEngine.stopRecording() : false;
    broadcastHarState(false);
    sendResponse({ ok, stats: self.GhostHarEngine ? self.GhostHarEngine.getStats() : null });
    return true;
  }

  if (msg.type === 'GHOST_HAR_CLEAR') {
    const ok = self.GhostHarEngine ? self.GhostHarEngine.clearRecording() : false;
    sendResponse({ ok, stats: self.GhostHarEngine ? self.GhostHarEngine.getStats() : null });
    return true;
  }

  if (msg.type === 'GHOST_HAR_GET_STATE') {
    if (self.GhostHarEngine) {
      sendResponse({
        isRecording: self.GhostHarEngine.isRecording(),
        stats: self.GhostHarEngine.getStats(),
        entries: self.GhostHarEngine.getRecordedEntries()
      });
    } else {
      sendResponse({ isRecording: false, stats: null, entries: [] });
    }
    return true;
  }

  if (msg.type === 'GHOST_HAR_EXPORT_HAR') {
    const harLog = self.GhostHarEngine ? self.GhostHarEngine.buildHarLog() : null;
    sendResponse({ ok: !!harLog, harLog });
    return true;
  }

  if (msg.type === 'GHOST_HAR_EXPORT_FLOW') {
    const flowSummary = self.GhostHarEngine ? self.GhostHarEngine.buildFlowSummary() : null;
    sendResponse({ ok: !!flowSummary, flowSummary });
    return true;
  }

  if (msg.type === 'GHOST_HAR_RELAY_PAYLOAD') {
    if (self.GhostHarEngine && msg.payload) {
      self.GhostHarEngine.handlePayloadRelay(msg.payload);
    }
    sendResponse({ ok: true });
    return true;
  }
});

// Keep header rules in sync with storage changes
if (api.storage && api.storage.onChanged) {
  api.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;

    if (changes.enabled) {
      if (changes.enabled.newValue === false) {
        await removeHeaderRules();
      } else {
        const data = await api.storage.local.get(['generatedProfile']);
        if (data.generatedProfile) await applyHeaderRulesFromProfile(data.generatedProfile);
      }
    }

    if (changes.generatedProfile && changes.generatedProfile.newValue) {
      const data = await api.storage.local.get(['enabled']);
      if (data.enabled !== false) {
        await applyHeaderRulesFromProfile(changes.generatedProfile.newValue);
      }
    }
  });
}
