/**
 * Ghost Profile — background.js
 * ═══════════════════════════════════════════════════════════════
 * Service worker that handles:
 * 1. HTTP header spoofing via declarativeNetRequest
 * 2. Profile storage & messaging relay
 * 3. Global Multi-Tab HAR & Flow Recording Engine
 * 4. Reload all/active tab support
 * ═══════════════════════════════════════════════════════════════
 */

// Import dedicated HAR engine
try {
  importScripts('har-engine.js');
} catch (e) {
  console.warn('[Ghost Profile] importScripts har-engine:', e);
}

/* ──────────────────────────────────────────────────────────────
 * SIDE PANEL BEHAVIOR
 * ────────────────────────────────────────────────────────────── */
function setupSidePanel() {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.error('[Ghost Profile] SidePanel setup error:', err));
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setupSidePanel();
});

// Run once at worker initialization
setupSidePanel();

/* ──────────────────────────────────────────────────────────────
 * HEADER RULE MANAGEMENT
 * ────────────────────────────────────────────────────────────── */
const ALL_RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script',
  'image', 'font', 'object', 'xmlhttprequest',
  'ping', 'csp_report', 'media', 'websocket', 'other'
];

/**
 * Build header modification rules from a generated profile object.
 * Extracts User-Agent and all Sec-CH-UA-* Client Hints headers.
 */
function buildHeadersFromProfile(profile) {
  if (!profile || !profile.userAgent) return null;

  const headers = {
    'User-Agent': profile.userAgent,
    'Sec-CH-UA': profile.chUA,
    'Sec-CH-UA-Mobile': profile.chUAMobile || '?0',
    'Sec-CH-UA-Platform': profile.chUAPlatform,
    'Sec-CH-UA-Platform-Version': profile.chUAPlatformVersion,
    'Sec-CH-UA-Arch': profile.chUAArch,
    'Sec-CH-UA-Bitness': profile.chUABitness,
    'Sec-CH-UA-Full-Version-List': profile.chUAFullVersionList,
    'Sec-CH-UA-Model': profile.chUAModel || '""'
  };

  // Filter out undefined values
  const requestHeaders = [];
  for (const [header, value] of Object.entries(headers)) {
    if (value !== undefined && value !== null) {
      requestHeaders.push({ header, operation: 'set', value });
    }
  }

  return requestHeaders;
}

async function applyHeaderRulesFromProfile(profile) {
  // STEALTH MODE: Do NOT modify any headers — let real browser headers pass through
  // This prevents cross-layer inconsistency between HTTP headers and BFP JS capture
  if (profile.stealthMode) {
    console.log('[Ghost Profile] Stealth mode — removing all header rules (using real browser headers)');
    await removeHeaderRules();
    return;
  }

  const requestHeaders = buildHeadersFromProfile(profile);
  if (!requestHeaders || requestHeaders.length === 0) return;

  try {
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    await chrome.declarativeNetRequest.updateDynamicRules({
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
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);
    if (removeRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
    }
    console.log('[Ghost Profile] Header rules removed');
  } catch (err) {
    console.error('[Ghost Profile] Failed to remove header rules:', err);
  }
}

/* ──────────────────────────────────────────────────────────────
 * RELOAD HELPERS
 * ────────────────────────────────────────────────────────────── */
function reloadAllTabs() {
  chrome.tabs.query({}, tabs => {
    for (const tab of tabs) {
      if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        try { chrome.tabs.reload(tab.id); } catch (_) {}
      }
    }
  });
}

function reloadActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      try { chrome.tabs.reload(tabs[0].id); } catch (_) {}
    }
  });
}

/* ──────────────────────────────────────────────────────────────
 * INITIALIZATION
 * ────────────────────────────────────────────────────────────── */
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['generatedProfile', 'features', 'enabled']);

  if (!data.generatedProfile) {
    // Set defaults — no profile yet, user needs to click "Randomize & Apply"
    await chrome.storage.local.set({
      generatedProfile: null,
      features: {
        ua: true, screen: true, canvas: true, webgl: true,
        audio: true, timezone: true, webrtc: true, fonts: true,
        mediaDevices: true, storage: true, matchMedia: true, misc: true
      },
      enabled: true
    });
  }

  if (data.enabled !== false && data.generatedProfile) {
    await applyHeaderRulesFromProfile(data.generatedProfile);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(['generatedProfile', 'enabled']);
  if (data.enabled !== false && data.generatedProfile) {
    await applyHeaderRulesFromProfile(data.generatedProfile);
  }
});

/* ──────────────────────────────────────────────────────────────
 * MESSAGE HANDLING
 * ────────────────────────────────────────────────────────────── */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GHOST_APPLY_PROFILE') {
    const { generatedProfile, features, enabled, reloadAll } = msg;

    // Save full profile to storage
    chrome.storage.local.set({ generatedProfile, features, enabled });

    const afterRules = () => {
      // Relay to all eligible web tabs' content scripts
      chrome.tabs.query({}, tabs => {
        for (const tab of tabs) {
          if (!tab.id) continue;
          if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://'))) {
            continue;
          }
          try {
            const p = chrome.tabs.sendMessage(tab.id, {
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

      // Reload after rules settle
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
    chrome.storage.local.get(['generatedProfile', 'features', 'enabled'], data => {
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
    sendResponse({ ok, stats: self.GhostHarEngine ? self.GhostHarEngine.getStats() : null });
    return true;
  }

  if (msg.type === 'GHOST_HAR_STOP') {
    const ok = self.GhostHarEngine ? self.GhostHarEngine.stopRecording() : false;
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
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local') return;

  if (changes.enabled) {
    if (changes.enabled.newValue === false) {
      await removeHeaderRules();
    } else {
      const data = await chrome.storage.local.get(['generatedProfile']);
      if (data.generatedProfile) await applyHeaderRulesFromProfile(data.generatedProfile);
    }
  }

  if (changes.generatedProfile && changes.generatedProfile.newValue) {
    const data = await chrome.storage.local.get(['enabled']);
    if (data.enabled !== false) {
      await applyHeaderRulesFromProfile(changes.generatedProfile.newValue);
    }
  }
});
