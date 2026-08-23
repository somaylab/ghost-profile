/**
 * Ghost Profile — har-panel.js
 * ═══════════════════════════════════════════════════════════════
 * Dedicated UI Controller for Global HAR & Flow Recorder
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

  // DOM references
  let $harView, $recToggleBtn, $recStatusPill, $reqCountPill, $bytesCountPill, $tabsCountPill;
  let $clearBtn, $exportHarBtn, $exportFlowBtn, $searchInput, $filterChips, $streamList;
  let $inspectorModal, $inspectorClose, $inspectorContent, $navHarDot;

  function init(getTranslationFn) {
    if (isInitialized) return;
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

    bindEvents(getTranslationFn);
    refreshState();
  }

  function bindEvents(t) {
    // Record Toggle
    $recToggleBtn.addEventListener('click', () => {
      const isCurrentlyRecording = $recToggleBtn.classList.contains('recording');
      const actionType = isCurrentlyRecording ? 'GHOST_HAR_STOP' : 'GHOST_HAR_START';

      if (api && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage({ type: actionType }, (resp) => {
          if (resp && resp.stats) updateStatsUI(resp.stats);
          refreshState();
        });
      } else {
        // Local preview fallback
        updateStatsUI({ isRecording: !isCurrentlyRecording, totalRequests: entriesList.length, totalBytes: 0, activeTabs: 1 });
      }
    });

    // Clear Records
    $clearBtn.addEventListener('click', () => {
      if (api && api.runtime && api.runtime.sendMessage) {
        api.runtime.sendMessage({ type: 'GHOST_HAR_CLEAR' }, () => {
          entriesList = [];
          renderStream();
          updateStatsUI({ isRecording: $recToggleBtn.classList.contains('recording'), totalRequests: 0, totalBytes: 0, activeTabs: 1 });
        });
      } else {
        entriesList = [];
        renderStream();
        updateStatsUI({ isRecording: $recToggleBtn.classList.contains('recording'), totalRequests: 0, totalBytes: 0, activeTabs: 1 });
      }
    });

    // Export HAR (.har)
    $exportHarBtn.addEventListener('click', () => {
      api.runtime.sendMessage({ type: 'GHOST_HAR_EXPORT_HAR' }, (resp) => {
        if (resp && resp.ok && resp.harLog) {
          const jsonStr = JSON.stringify(resp.harLog, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const filename = `ghost-profile-network-${new Date().toISOString().replace(/[:.]/g, '-')}.har`;

          if (api.downloads && api.downloads.download) {
            api.downloads.download({ url, filename, saveAs: true }).catch(() => {
              fallbackDownload(url, filename);
            });
          } else {
            fallbackDownload(url, filename);
          }
        }
      });
    });

    // Export Flow Summary (.json)
    $exportFlowBtn.addEventListener('click', () => {
      api.runtime.sendMessage({ type: 'GHOST_HAR_EXPORT_FLOW' }, (resp) => {
        if (resp && resp.ok && resp.flowSummary) {
          const jsonStr = JSON.stringify(resp.flowSummary, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const filename = `ghost-profile-flow-summary-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

          if (api.downloads && api.downloads.download) {
            api.downloads.download({ url, filename, saveAs: true }).catch(() => {
              fallbackDownload(url, filename);
            });
          } else {
            fallbackDownload(url, filename);
          }
        }
      });
    });

    // Filter Chips
    $filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        $filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-filter') || 'all';
        renderStream();
      });
    });

    // Search Box
    $searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderStream();
    });

    // Inspector Close
    $inspectorClose.addEventListener('click', () => {
      $inspectorModal.style.display = 'none';
    });

    // Runtime Live Entry Listener
    if (api && api.runtime && api.runtime.onMessage) {
      api.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'GHOST_HAR_LIVE_ENTRY' && msg.entry) {
          entriesList.push(msg.entry);
          if (entriesList.length > 5000) entriesList.shift();
          appendStreamEntry(msg.entry);
          if (msg.stats) updateStatsUI(msg.stats);
        }
        if (msg.type === 'GHOST_HAR_STATS_UPDATE' && msg.stats) {
          updateStatsUI(msg.stats);
        }
      });
    }

    // Window message listener fallback (for mock/preview testing)
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'GHOST_HAR_LIVE_ENTRY' && e.data.entry) {
        entriesList.push(e.data.entry);
        appendStreamEntry(e.data.entry);
        if (e.data.stats) updateStatsUI(e.data.stats);
      }
    });
  }

  function fallbackDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function refreshState() {
    if (api && api.runtime && api.runtime.sendMessage) {
      api.runtime.sendMessage({ type: 'GHOST_HAR_GET_STATE' }, (resp) => {
        if (resp) {
          if (resp.stats) updateStatsUI(resp.stats);
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

    if (stats.isRecording) {
      $recToggleBtn.classList.add('recording');
      $recStatusPill.textContent = 'REC 🔴';
      $recStatusPill.className = 'har-stat-badge rec-active';
      if ($navHarDot) $navHarDot.style.display = 'inline-block';
    } else {
      $recToggleBtn.classList.remove('recording');
      $recStatusPill.textContent = 'PAUSED ⏸';
      $recStatusPill.className = 'har-stat-badge rec-paused';
      if ($navHarDot) $navHarDot.style.display = 'none';
    }

    if ($reqCountPill) $reqCountPill.textContent = `${stats.totalRequests || 0} reqs`;
    if ($bytesCountPill) $bytesCountPill.textContent = formatBytes(stats.totalBytes || 0);
    if ($tabsCountPill) $tabsCountPill.textContent = `${stats.activeTabs || 1} tab${stats.activeTabs > 1 ? 's' : ''}`;
  }

  function matchesFilter(entry) {
    if (!entry || !entry.request) return false;

    const url = entry.request.url.toLowerCase();
    const method = entry.request.method.toUpperCase();
    const type = (entry._resourceType || '').toLowerCase();
    const mime = (entry.response.content.mimeType || '').toLowerCase();

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
          <div class="empty-title">Belum ada request terekam</div>
          <div class="empty-desc">Nyalakan perekam lalu buka halaman atau lakukan interaksi di web.</div>
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

    const status = entry.response.status || (entry._error ? 'ERR' : 0);
    let statusClass = 's-2xx';
    if (status >= 300 && status < 400) statusClass = 's-3xx';
    else if (status >= 400 && status < 500) statusClass = 's-4xx';
    else if (status >= 500 || status === 'ERR') statusClass = 's-5xx';

    let urlFormatted = entry.request.url;
    try {
      const u = new URL(entry.request.url);
      urlFormatted = `<span class="url-host">${u.hostname}</span><span class="url-path">${u.pathname}${u.search}</span>`;
    } catch (_) {}

    const tabBadge = entry.isPopup ?
      `<span class="tab-pill popup" title="Popup / Child Window">POPUP #${entry.tabId}</span>` :
      `<span class="tab-pill" title="Browser Tab">TAB #${entry.tabId > 0 ? entry.tabId : 'BG'}</span>`;

    const actionBadge = entry._initiatingInteraction ?
      `<span class="action-pill" title="Aksi Pemicu: ${entry._initiatingInteraction}">⚡ ${entry._initiatingInteraction.substring(0, 24)}</span>` : '';

    row.innerHTML = `
      <div class="row-meta">
        <span class="method-badge method-${entry.request.method.toLowerCase()}">${entry.request.method}</span>
        <span class="status-badge ${statusClass}">${status}</span>
        ${tabBadge}
        ${actionBadge}
        <span class="time-pill mono">${entry.time}ms</span>
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

    let u = { host: '', pathname: '', search: '' };
    try {
      const parsed = new URL(entry.request.url);
      u = { host: parsed.host, pathname: parsed.pathname, search: parsed.search };
    } catch (_) {}

    const reqHeadersHtml = (entry.request.headers || []).map(h => `
      <div class="inspector-kv"><span class="k mono">${h.name}:</span> <span class="v mono">${h.value}</span></div>
    `).join('') || '<div class="inspector-none">No Request Headers</div>';

    const resHeadersHtml = (entry.response.headers || []).map(h => `
      <div class="inspector-kv"><span class="k mono">${h.name}:</span> <span class="v mono">${h.value}</span></div>
    `).join('') || '<div class="inspector-none">No Response Headers</div>';

    let postDataHtml = '<div class="inspector-none">No Request Body</div>';
    if (entry.request.postData && entry.request.postData.text) {
      let formatted = entry.request.postData.text;
      try {
        formatted = JSON.stringify(JSON.parse(formatted), null, 2);
      } catch (_) {}
      postDataHtml = `<pre class="inspector-pre mono">${escapeHtml(formatted)}</pre>`;
    }

    let responseBodyHtml = '<div class="inspector-none">No Response Payload</div>';
    if (entry.response.content && entry.response.content.text) {
      let formatted = entry.response.content.text;
      try {
        formatted = JSON.stringify(JSON.parse(formatted), null, 2);
      } catch (_) {}
      responseBodyHtml = `<pre class="inspector-pre mono">${escapeHtml(formatted)}</pre>`;
    }

    $inspectorContent.innerHTML = `
      <div class="inspector-section">
        <div class="section-title">Informasi Umum</div>
        <div class="inspector-kv"><span class="k">URL:</span> <span class="v mono break-all">${entry.request.url}</span></div>
        <div class="inspector-kv"><span class="k">Method / Status:</span> <span class="v mono">${entry.request.method} · ${entry.response.status} ${entry.response.statusText}</span></div>
        <div class="inspector-kv"><span class="k">Tab / Window:</span> <span class="v mono">${entry.tabTitle || `Tab ${entry.tabId}`} (ID: ${entry.tabId}${entry.isPopup ? ', Child Popup' : ''})</span></div>
        ${entry.parentTabId ? `<div class="inspector-kv"><span class="k">Induk Tab:</span> <span class="v mono">Tab #${entry.parentTabId}</span></div>` : ''}
        ${entry._initiatingInteraction ? `<div class="inspector-kv"><span class="k">Aksi Pemicu:</span> <span class="v mono action-text">⚡ ${entry._initiatingInteraction}</span></div>` : ''}
        <div class="inspector-kv"><span class="k">Latency / IP:</span> <span class="v mono">${entry.time}ms · IP: ${entry.serverIPAddress || 'Direct'}</span></div>
      </div>

      <div class="inspector-section">
        <div class="section-title">Request Body / Payload</div>
        ${postDataHtml}
      </div>

      <div class="inspector-section">
        <div class="section-title">Response Payload</div>
        ${responseBodyHtml}
      </div>

      <div class="inspector-section">
        <div class="section-title">Request Headers (${entry.request.headers ? entry.request.headers.length : 0})</div>
        ${reqHeadersHtml}
      </div>

      <div class="inspector-section">
        <div class="section-title">Response Headers (${entry.response.headers ? entry.response.headers.length : 0})</div>
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
    refreshState
  };
})();
