/**
 * Ghost Profile — har-panel.js
 * ═══════════════════════════════════════════════════════════════
 * Dedicated UI Controller for Global HAR & Flow Recorder
 * Full Bilingual Localization & Independent On/Off Switch
 * ═══════════════════════════════════════════════════════════════
 */
window.GhostHarPanel = (function () {
  'use strict';

  const api = (typeof browser !== 'undefined') ? browser : chrome;

  let isInitialized = false;
  let activeFilter = 'all';
  let searchQuery = '';
  let entriesList = [];
  let selectedEntry = null;
  let currentT = (key, ...args) => key;
  let lastStats = { isRecording: false, totalRequests: 0, totalBytes: 0, activeTabs: 1 };
  let onStateChangeCallback = null;

  // DOM references
  let $harView, $recToggleBtn, $recStatusPill, $reqCountPill, $bytesCountPill, $tabsCountPill;
  let $clearBtn, $exportHarBtn, $exportFlowBtn, $searchInput, $filterChips, $streamList;
  let $inspectorModal, $inspectorClose, $inspectorContent, $navHarDot;

  function init(getTranslationFn, onStateChange) {
    if (getTranslationFn && typeof getTranslationFn === 'function') {
      currentT = getTranslationFn;
    }
    if (onStateChange && typeof onStateChange === 'function') {
      onStateChangeCallback = onStateChange;
    }

    if (isInitialized) {
      applyLanguage(currentT);
      return;
    }
    isInitialized = true;

    // Cache elements
    $harView = document.getElementById('view-har');
    $recToggleBtn = document.getElementById('har-rec-toggle');
    $recStatusPill = document.getElementById('har-rec-status-pill');
    $reqCountPill = document.getElementById('har-req-count');
    $bytesCountPill = document.getElementById('har-bytes-count');
    $tabsCountPill = document.getElementById('har-tabs-count');
    $clearBtn = document.getElementById('har-clear-btn');
    $exportHarBtn = document.getElementById('har-export-har-btn');
    $exportFlowBtn = document.getElementById('har-export-flow-btn');
    $searchInput = document.getElementById('har-search-input');
    $filterChips = document.querySelectorAll('.har-filter-chip');
    $streamList = document.getElementById('har-stream-list');
    $inspectorModal = document.getElementById('har-inspector-modal');
    $inspectorClose = document.getElementById('har-inspector-close');
    $inspectorContent = document.getElementById('har-inspector-body');
    $navHarDot = document.getElementById('nav-har-dot');

    bindEvents();
    applyLanguage(currentT);
    refreshState();
  }

  function bindEvents() {
    // Record Toggle
    $recToggleBtn.addEventListener('click', () => {
      toggleRecording();
    });

    // Clear Records
    $clearBtn.addEventListener('click', () => {
      if (api && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage({ type: 'GHOST_HAR_CLEAR' }, () => {
          entriesList = [];
          renderStream();
          lastStats.totalRequests = 0;
          lastStats.totalBytes = 0;
          updateStatsUI(lastStats);
        });
      } else {
        entriesList = [];
        renderStream();
        lastStats.totalRequests = 0;
        lastStats.totalBytes = 0;
        updateStatsUI(lastStats);
      }
    });

    // Export HAR (.har)
    $exportHarBtn.addEventListener('click', () => {
      const $btnText = $exportHarBtn.querySelector('.btn-text');
      const origText = $btnText ? $btnText.textContent : 'Unduh .har';
      if ($btnText) $btnText.innerHTML = `<span style="color:#10B981">${currentT('har-toast-saved-har')}</span>`;
      setTimeout(() => { if ($btnText) $btnText.textContent = currentT('har-btn-export-har'); }, 1500);

      const filename = `ghost-profile-network-${new Date().toISOString().replace(/[:.]/g, '-')}.har`;

      if (api && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage({ type: 'GHOST_HAR_EXPORT_HAR' }, (resp) => {
          if (resp && resp.ok && resp.harLog) {
            downloadFile(JSON.stringify(resp.harLog, null, 2), filename, 'application/octet-stream');
          } else {
            downloadFile(JSON.stringify(buildLocalHarLog(), null, 2), filename, 'application/octet-stream');
          }
        });
      } else {
        downloadFile(JSON.stringify(buildLocalHarLog(), null, 2), filename, 'application/octet-stream');
      }
    });

    // Export Flow JSON (.json)
    $exportFlowBtn.addEventListener('click', () => {
      const $btnText = $exportFlowBtn.querySelector('.btn-text');
      const origText = $btnText ? $btnText.textContent : 'Flow JSON';
      if ($btnText) $btnText.innerHTML = `<span style="color:#10B981">${currentT('har-toast-saved-json')}</span>`;
      setTimeout(() => { if ($btnText) $btnText.textContent = currentT('har-btn-export-flow'); }, 1500);

      const filename = `ghost-profile-flow-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      if (api && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage({ type: 'GHOST_HAR_EXPORT_FLOW' }, (resp) => {
          if (resp && resp.ok && resp.flowSummary) {
            downloadFile(JSON.stringify(resp.flowSummary, null, 2), filename, 'application/octet-stream');
          } else {
            downloadFile(JSON.stringify(buildLocalFlowSummary(), null, 2), filename, 'application/octet-stream');
          }
        });
      } else {
        downloadFile(JSON.stringify(buildLocalFlowSummary(), null, 2), filename, 'application/octet-stream');
      }
    });

    // Search Input Filter
    $searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').trim().toLowerCase();
      renderStream();
    });

    // Filter Chips
    $filterChips.forEach($chip => {
      $chip.addEventListener('click', () => {
        $filterChips.forEach(c => c.classList.remove('active'));
        $chip.classList.add('active');
        activeFilter = $chip.dataset.filter || 'all';
        renderStream();
      });
    });

    // Modal Close
    $inspectorClose.addEventListener('click', () => {
      $inspectorModal.style.display = 'none';
      selectedEntry = null;
    });

    $inspectorModal.addEventListener('click', (e) => {
      if (e.target === $inspectorModal) {
        $inspectorModal.style.display = 'none';
        selectedEntry = null;
      }
    });

    // Live Streaming Message Receiver from background
    if (api && api.runtime && api.runtime.onMessage) {
      api.runtime.onMessage.addListener((msg) => {
        if (!msg) return;
        if (msg.type === 'GHOST_HAR_LIVE_ENTRY' && msg.entry) {
          entriesList.push(msg.entry);
          if (msg.stats) {
            lastStats = msg.stats;
            updateStatsUI(msg.stats);
          }
          appendStreamEntry(msg.entry);
        } else if (msg.type === 'GHOST_HAR_STATS_UPDATE' && msg.stats) {
          lastStats = msg.stats;
          updateStatsUI(msg.stats);
        }
      });
    }
  }

  function toggleRecording(desiredState) {
    const isCurrentlyRecording = lastStats.isRecording;
    const shouldRecord = (typeof desiredState === 'boolean') ? desiredState : !isCurrentlyRecording;
    const actionType = shouldRecord ? 'GHOST_HAR_START' : 'GHOST_HAR_STOP';

    if (api && api.runtime && api.runtime.sendMessage) {
      api.runtime.sendMessage({ type: actionType }, (resp) => {
        if (resp && resp.stats) {
          lastStats = resp.stats;
          updateStatsUI(resp.stats);
        }
        refreshState();
      });
    } else {
      lastStats.isRecording = shouldRecord;
      updateStatsUI(lastStats);
    }
  }

  function downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const $a = document.createElement('a');
      $a.href = blobUrl;
      $a.download = filename;
      $a.style.display = 'none';
      document.body.appendChild($a);
      $a.click();
      setTimeout(() => {
        document.body.removeChild($a);
        URL.revokeObjectURL(blobUrl);
      }, 500);
    } catch (e) {
      console.warn('[Ghost HAR] Direct blob download failed, falling back to data URL:', e);
      const dataUri = `data:${mimeType || 'application/octet-stream'};charset=utf-8,` + encodeURIComponent(content);
      const $a = document.createElement('a');
      $a.href = dataUri;
      $a.download = filename;
      $a.style.display = 'none';
      document.body.appendChild($a);
      $a.click();
      setTimeout(() => document.body.removeChild($a), 500);
    }
  }

  function buildLocalHarLog() {
    return {
      log: {
        version: '1.2',
        creator: {
          name: 'Ghost Profile Multi-Tab HAR Engine',
          version: '3.2.0'
        },
        pages: [{
          id: 'page_default',
          startedDateTime: new Date().toISOString(),
          title: 'Ghost Profile Session',
          pageTimings: { onContentLoad: -1, onLoad: -1 }
        }],
        entries: entriesList
      }
    };
  }

  function buildLocalFlowSummary() {
    const domainStats = {};
    for (const e of entriesList) {
      try {
        if (e && e.request && e.request.url) {
          const u = new URL(e.request.url);
          domainStats[u.hostname] = (domainStats[u.hostname] || 0) + 1;
        }
      } catch (_) {}
    }
    return {
      sessionOverview: {
        generatedAt: new Date().toISOString(),
        totalRequestsCaptured: entriesList.length,
        tabsTracked: 1
      },
      topDomainsHit: domainStats,
      interactionTimeline: entriesList
        .filter(e => e && e._initiatingInteraction)
        .map(e => ({
          time: e.startedDateTime,
          tabId: e.tabId,
          action: e._initiatingInteraction,
          triggeredRequest: `${e.request ? e.request.method : 'REQ'} ${e.request ? e.request.url : ''}`
        }))
    };
  }

  function refreshState() {
    if (api && api.runtime && api.runtime.sendMessage) {
      api.runtime.sendMessage({ type: 'GHOST_HAR_GET_STATE' }, (resp) => {
        if (resp) {
          if (resp.stats) {
            lastStats = resp.stats;
            updateStatsUI(resp.stats);
          }
          if (resp.entries && Array.isArray(resp.entries)) {
            entriesList = resp.entries;
            renderStream();
          }
        }
      });
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function updateStatsUI(stats) {
    if (!stats) return;
    lastStats = stats;

    const isRec = !!stats.isRecording;
    const $recBtnText = $recToggleBtn ? $recToggleBtn.querySelector('.btn-text') : null;

    if (isRec) {
      if ($recToggleBtn) $recToggleBtn.classList.add('recording');
      if ($recStatusPill) {
        $recStatusPill.textContent = currentT('har-rec-status-rec');
        $recStatusPill.className = 'har-stat-badge rec-active';
      }
      if ($recBtnText) $recBtnText.textContent = currentT('har-btn-pause');
      if ($navHarDot) $navHarDot.style.display = 'inline-block';
    } else {
      if ($recToggleBtn) $recToggleBtn.classList.remove('recording');
      if ($recStatusPill) {
        $recStatusPill.textContent = currentT('har-rec-status-paused');
        $recStatusPill.className = 'har-stat-badge rec-paused';
      }
      if ($recBtnText) $recBtnText.textContent = currentT('har-btn-record');
      if ($navHarDot) $navHarDot.style.display = 'none';
    }

    if ($reqCountPill) $reqCountPill.textContent = `${stats.totalRequests || 0} ${currentT('har-unit-reqs')}`;
    if ($bytesCountPill) $bytesCountPill.textContent = formatBytes(stats.totalBytes || 0);
    if ($tabsCountPill) {
      const activeTabs = stats.activeTabs || 1;
      const unit = activeTabs > 1 ? currentT('har-unit-tabs') : currentT('har-unit-tab');
      $tabsCountPill.textContent = `${activeTabs} ${unit}`;
    }

    if (onStateChangeCallback) {
      onStateChangeCallback(stats);
    }
  }

  /** Apply language translations to all elements in HAR View */
  function applyLanguage(translationFn) {
    if (translationFn && typeof translationFn === 'function') {
      currentT = translationFn;
    }

    // Translate static data-i18n elements in #view-har
    const $harRoot = document.getElementById('view-har');
    if ($harRoot) {
      $harRoot.querySelectorAll('[data-i18n]').forEach($el => {
        const key = $el.getAttribute('data-i18n');
        if (key) $el.textContent = currentT(key);
      });
    }

    // Toolbar Tooltips
    if ($recToggleBtn) $recToggleBtn.title = currentT('har-btn-record-title');
    if ($clearBtn) $clearBtn.title = currentT('har-btn-clear-title');
    if ($exportHarBtn) $exportHarBtn.title = currentT('har-btn-export-har-title');
    if ($exportFlowBtn) $exportFlowBtn.title = currentT('har-btn-export-flow-title');

    // Search Input Placeholder
    if ($searchInput) $searchInput.placeholder = currentT('har-search-placeholder');

    // Filter Chips
    const filterKeyMap = {
      'all': 'har-filter-all',
      'xhr': 'har-filter-xhr',
      'auth': 'har-filter-auth',
      'doc': 'har-filter-doc',
      'media': 'har-filter-media'
    };
    document.querySelectorAll('.har-filter-chip').forEach($chip => {
      const f = $chip.dataset.filter;
      if (f && filterKeyMap[f]) {
        $chip.textContent = currentT(filterKeyMap[f]);
      }
    });

    // Inspector Close Tooltip
    if ($inspectorClose) $inspectorClose.title = currentT('har-inspector-close-title');

    // Update stats pills & record button text with current language
    updateStatsUI(lastStats);

    // Re-render stream to update empty state or row badges if needed
    renderStream();

    // If inspector modal is open, re-render inspector with current language
    if (selectedEntry && $inspectorModal && $inspectorModal.style.display !== 'none') {
      openInspector(selectedEntry);
    }
  }

  function matchesFilter(entry) {
    if (!entry || !entry.request) return false;

    const url = (entry.request.url || '').toLowerCase();
    const method = (entry.request.method || '').toUpperCase();
    const type = (entry._resourceType || '').toLowerCase();
    const mime = ((entry.response && entry.response.content && entry.response.content.mimeType) || '').toLowerCase();

    // Search query match
    if (searchQuery && !url.includes(searchQuery) && !method.includes(searchQuery)) {
      return false;
    }

    // Category Filter Chip match
    if (activeFilter === 'xhr') {
      return type === 'xmlhttprequest' || type === 'fetch' || type === 'ping' || mime.includes('json') || mime.includes('graphql');
    }
    if (activeFilter === 'doc') {
      return type === 'main_frame' || type === 'sub_frame' || mime.includes('html');
    }
    if (activeFilter === 'auth') {
      return url.includes('auth') || url.includes('oauth') || url.includes('token') || url.includes('login') || url.includes('signin') || url.includes('sso');
    }
    if (activeFilter === 'media') {
      return type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet';
    }

    return true; // 'all'
  }

  function renderStream() {
    if (!$streamList) return;
    $streamList.innerHTML = '';

    const filtered = entriesList.filter(matchesFilter);

    if (filtered.length === 0) {
      $streamList.innerHTML = `
        <div class="har-stream-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <div class="empty-title">${currentT('har-empty-title')}</div>
          <div class="empty-desc">${currentT('har-empty-desc')}</div>
        </div>
      `;
      return;
    }

    // Render list
    filtered.forEach(entry => {
      const row = createEntryRowElement(entry);
      $streamList.appendChild(row);
    });

    // Auto scroll bottom
    $streamList.scrollTop = $streamList.scrollHeight;
  }

  function appendStreamEntry(entry) {
    if (!matchesFilter(entry)) return;

    // Remove empty placeholder if exists
    const emptyNotice = $streamList.querySelector('.har-stream-empty');
    if (emptyNotice) emptyNotice.remove();

    const row = createEntryRowElement(entry);
    $streamList.appendChild(row);

    // Auto scroll if near bottom
    if ($streamList.scrollHeight - $streamList.scrollTop < 500) {
      $streamList.scrollTop = $streamList.scrollHeight;
    }
  }

  function createEntryRowElement(entry) {
    const row = document.createElement('div');
    row.className = 'har-entry-row';

    const status = (entry.response && entry.response.status) || (entry._error ? 'ERR' : 0);
    let statusClass = 's-2xx';
    if (status >= 300 && status < 400) statusClass = 's-3xx';
    else if (status >= 400 && status < 500) statusClass = 's-4xx';
    else if (status >= 500 || status === 'ERR') statusClass = 's-5xx';

    let urlFormatted = entry.request ? entry.request.url : '';
    try {
      const u = new URL(entry.request.url);
      urlFormatted = `<span class="url-host">${u.hostname}</span><span class="url-path">${u.pathname}${u.search}</span>`;
    } catch (_) {}

    const tabBadge = entry.isPopup ?
      `<span class="tab-pill popup" title="Popup / Child Window">POPUP #${entry.tabId}</span>` :
      `<span class="tab-pill" title="Browser Tab">TAB #${entry.tabId > 0 ? entry.tabId : 'BG'}</span>`;

    const actionBadge = entry._initiatingInteraction ?
      `<span class="action-pill" title="${currentT('har-info-tab-action')} ${entry._initiatingInteraction}">⚡ ${entry._initiatingInteraction.substring(0, 24)}</span>` : '';

    const method = entry.request ? entry.request.method : 'REQ';

    row.innerHTML = `
      <div class="row-meta">
        <span class="method-badge method-${method.toLowerCase()}">${method}</span>
        <span class="status-badge ${statusClass}">${status}</span>
        ${tabBadge}
        ${actionBadge}
        <span class="time-pill mono">${entry.time || 0}ms</span>
      </div>
      <div class="row-url mono">${urlFormatted}</div>
    `;

    row.addEventListener('click', () => {
      openInspector(entry);
    });

    return row;
  }

  /* ──────────────────────────────────────────────────────────────
   * INSPECTOR DRAWER (Detailed Request & Response View)
   * ────────────────────────────────────────────────────────────── */
  function openInspector(entry) {
    selectedEntry = entry;
    $inspectorModal.style.display = 'flex';

    const reqHeaders = (entry.request && entry.request.headers) || [];
    const resHeaders = (entry.response && entry.response.headers) || [];

    const reqHeadersHtml = reqHeaders.map(h => `
      <div class="inspector-kv"><span class="k mono">${h.name}:</span> <span class="v mono">${h.value}</span></div>
    `).join('') || `<div class="inspector-none">${currentT('har-info-no-req-headers')}</div>`;

    const resHeadersHtml = resHeaders.map(h => `
      <div class="inspector-kv"><span class="k mono">${h.name}:</span> <span class="v mono">${h.value}</span></div>
    `).join('') || `<div class="inspector-none">${currentT('har-info-no-res-headers')}</div>`;

    let postDataHtml = `<div class="inspector-none">${currentT('har-info-no-req-body')}</div>`;
    if (entry.request && entry.request.postData && entry.request.postData.text) {
      let formatted = entry.request.postData.text;
      try {
        formatted = JSON.stringify(JSON.parse(formatted), null, 2);
      } catch (_) {}
      postDataHtml = `<pre class="inspector-pre mono">${escapeHtml(formatted)}</pre>`;
    }

    let responseBodyHtml = `<div class="inspector-none">${currentT('har-info-no-res-body')}</div>`;
    if (entry.response && entry.response.content && entry.response.content.text) {
      let formatted = entry.response.content.text;
      try {
        formatted = JSON.stringify(JSON.parse(formatted), null, 2);
      } catch (_) {}
      responseBodyHtml = `<pre class="inspector-pre mono">${escapeHtml(formatted)}</pre>`;
    }

    const reqUrl = (entry.request && entry.request.url) || '-';
    const reqMethod = (entry.request && entry.request.method) || '-';
    const resStatus = (entry.response && entry.response.status) || '-';
    const resStatusText = (entry.response && entry.response.statusText) || '';

    $inspectorContent.innerHTML = `
      <div class="inspector-section">
        <div class="section-title">${currentT('har-info-general')}</div>
        <div class="inspector-kv"><span class="k">URL:</span> <span class="v mono break-all">${reqUrl}</span></div>
        <div class="inspector-kv"><span class="k">Method / Status:</span> <span class="v mono">${reqMethod} · ${resStatus} ${resStatusText}</span></div>
        <div class="inspector-kv"><span class="k">Tab / Window:</span> <span class="v mono">${entry.tabTitle || `Tab ${entry.tabId}`} (ID: ${entry.tabId}${entry.isPopup ? ', Child Popup' : ''})</span></div>
        ${entry.parentTabId ? `<div class="inspector-kv"><span class="k">${currentT('har-info-tab-parent')}</span> <span class="v mono">Tab #${entry.parentTabId}</span></div>` : ''}
        ${entry._initiatingInteraction ? `<div class="inspector-kv"><span class="k">${currentT('har-info-tab-action')}</span> <span class="v mono action-text">⚡ ${entry._initiatingInteraction}</span></div>` : ''}
        <div class="inspector-kv"><span class="k">${currentT('har-info-tab-latency')}</span> <span class="v mono">${entry.time || 0}ms · IP: ${entry.serverIPAddress || 'Direct'}</span></div>
      </div>

      <div class="inspector-section">
        <div class="section-title">${currentT('har-info-req-body')}</div>
        ${postDataHtml}
      </div>

      <div class="inspector-section">
        <div class="section-title">${currentT('har-info-res-body')}</div>
        ${responseBodyHtml}
      </div>

      <div class="inspector-section">
        <div class="section-title">${currentT('har-info-req-headers', reqHeaders.length)}</div>
        ${reqHeadersHtml}
      </div>

      <div class="inspector-section">
        <div class="section-title">${currentT('har-info-res-headers', resHeaders.length)}</div>
        ${resHeadersHtml}
      </div>
    `;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    init,
    refreshState,
    applyLanguage,
    toggleRecording,
    getStats: () => lastStats
  };
})();
