/**
 * Ghost Profile (Firefox) — har-engine.js
 * ═══════════════════════════════════════════════════════════════
 * Global Multi-Tab HAR & Interaction Flow Recorder Engine for Firefox
 * 
 * Capabilities:
 *   1. Captures HTTP network activity globally across ALL tabs & popups
 *   2. Maps multi-tab lineage (Parent Tab -> Child Popup / OAuth redirect)
 *   3. Relays request/response payloads (JSON, text, GraphQL, tokens)
 *   4. Connects DOM interaction breadcrumbs to network requests
 *   5. Exports standard HAR 1.2 (.har) and Flow Summary (.json)
 * ═══════════════════════════════════════════════════════════════
 */
(function (global) {
  'use strict';

  const api = (typeof browser !== 'undefined') ? browser : chrome;

  // In-memory state
  let isRecording = false;
  const MAX_ENTRIES = 5000;
  const pendingRequests = new Map(); // requestId -> partial entry
  const recordedEntries = [];        // completed entries array
  const tabRegistry = new Map();     // tabId -> { tabId, openerTabId, url, title, createdAt, isPopup, windowId }
  const pageRegistry = new Map();    // pageId -> { id, startedDateTime, title, pageTimings, _tabId, _parentTabId, _isPopup }
  const payloadCache = new Map();    // url/requestId -> { requestBody, responseBody, action }

  let totalBytesTransferred = 0;

  /* ──────────────────────────────────────────────────────────────
   * MULTI-TAB LINEAGE & FLOW TRACKER
   * ────────────────────────────────────────────────────────────── */
  function initTabTracking() {
    if (api.webNavigation && api.webNavigation.onCreatedNavigationTarget) {
      api.webNavigation.onCreatedNavigationTarget.addListener((details) => {
        const { sourceTabId, tabId, url, timeStamp } = details;
        const parentInfo = tabRegistry.get(sourceTabId);

        tabRegistry.set(tabId, {
          tabId,
          openerTabId: sourceTabId,
          sourceUrl: parentInfo ? parentInfo.url : '',
          url: url || '',
          title: 'Popup / Child Tab',
          createdAt: timeStamp || Date.now(),
          isPopup: true
        });

        registerPage(tabId, url || 'about:blank', sourceTabId, true);
        broadcastLiveStats();
      });
    }

    if (api.tabs && api.tabs.onCreated) {
      api.tabs.onCreated.addListener((tab) => {
        if (!tabRegistry.has(tab.id)) {
          tabRegistry.set(tab.id, {
            tabId: tab.id,
            openerTabId: tab.openerTabId || null,
            url: tab.url || tab.pendingUrl || '',
            title: tab.title || 'New Tab',
            createdAt: Date.now(),
            isPopup: !!tab.openerTabId
          });
          registerPage(tab.id, tab.url || 'about:blank', tab.openerTabId || null, !!tab.openerTabId);
          broadcastLiveStats();
        }
      });
    }

    if (api.tabs && api.tabs.onUpdated) {
      api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        const existing = tabRegistry.get(tabId) || { tabId, createdAt: Date.now() };
        if (changeInfo.url) existing.url = changeInfo.url;
        if (changeInfo.title) existing.title = changeInfo.title;
        tabRegistry.set(tabId, existing);

        if (changeInfo.url) {
          registerPage(tabId, changeInfo.url, existing.openerTabId, existing.isPopup);
        }
      });
    }
  }

  function registerPage(tabId, url, parentTabId, isPopup) {
    const pageId = `page_tab_${tabId}_${Date.now()}`;
    const pageObj = {
      id: pageId,
      startedDateTime: new Date().toISOString(),
      title: url || 'Untitled Page',
      pageTimings: {
        onContentLoad: -1,
        onLoad: -1
      },
      _tabId: tabId,
      _parentTabId: parentTabId || null,
      _isPopup: !!isPopup
    };
    pageRegistry.set(pageId, pageObj);
    return pageId;
  }

  function getActivePageIdForTab(tabId) {
    let latestPageId = null;
    let latestTime = 0;
    for (const [id, page] of pageRegistry.entries()) {
      if (page._tabId === tabId) {
        const time = new Date(page.startedDateTime).getTime();
        if (time >= latestTime) {
          latestTime = time;
          latestPageId = id;
        }
      }
    }
    if (!latestPageId && tabId > 0) {
      const tabInfo = tabRegistry.get(tabId);
      return registerPage(tabId, tabInfo ? tabInfo.url : '', tabInfo ? tabInfo.openerTabId : null, tabInfo ? tabInfo.isPopup : false);
    }
    return latestPageId || 'page_global_default';
  }

  /* ──────────────────────────────────────────────────────────────
   * NETWORK REQUEST CAPTURE (webRequest Listeners)
   * ────────────────────────────────────────────────────────────── */
  function formatHeaders(headersArray) {
    if (!headersArray || !Array.isArray(headersArray)) return [];
    return headersArray.map(h => ({
      name: h.name,
      value: h.value !== undefined ? h.value : (h.binaryValue ? '[Binary]' : '')
    }));
  }

  function parseCookies(cookieHeader) {
    if (!cookieHeader) return [];
    const cookies = [];
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const idx = pair.indexOf('=');
      if (idx > -1) {
        cookies.push({
          name: pair.substring(0, idx).trim(),
          value: pair.substring(idx + 1).trim()
        });
      }
    }
    return cookies;
  }

  function parseQueryString(url) {
    try {
      const u = new URL(url);
      const params = [];
      u.searchParams.forEach((value, name) => {
        params.push({ name, value });
      });
      return params;
    } catch (_) {
      return [];
    }
  }

  function initWebRequestListeners() {
    if (!api.webRequest) return;

    // 1. onBeforeRequest: Request URL, Method, Type, RequestBody
    api.webRequest.onBeforeRequest.addListener((details) => {
      if (!isRecording) return;
      const { requestId, url, method, type, timeStamp, tabId, frameId, requestBody } = details;

      let postData = null;
      if (requestBody) {
        if (requestBody.formData) {
          const params = [];
          for (const [name, vals] of Object.entries(requestBody.formData)) {
            for (const v of vals) params.push({ name, value: v });
          }
          postData = {
            mimeType: 'application/x-www-form-urlencoded',
            params,
            text: params.map(p => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`).join('&')
          };
        } else if (requestBody.raw && requestBody.raw.length > 0) {
          try {
            const bytes = new Uint8Array(requestBody.raw[0].bytes || []);
            const text = new TextDecoder('utf-8').decode(bytes);
            postData = {
              mimeType: 'application/json',
              text: text
            };
          } catch (_) {}
        }
      }

      const tabInfo = tabRegistry.get(tabId);

      pendingRequests.set(requestId, {
        requestId,
        pageref: getActivePageIdForTab(tabId),
        startedDateTime: new Date(timeStamp).toISOString(),
        startTime: timeStamp,
        tabId,
        frameId,
        tabTitle: tabInfo ? tabInfo.title : (tabId === -1 ? 'Background / Service Worker' : `Tab ${tabId}`),
        isPopup: tabInfo ? tabInfo.isPopup : false,
        parentTabId: tabInfo ? tabInfo.openerTabId : null,
        request: {
          method,
          url,
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          queryString: parseQueryString(url),
          postData: postData,
          headersSize: -1,
          bodySize: postData && postData.text ? postData.text.length : 0
        },
        response: {
          status: 0,
          statusText: '',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          content: {
            size: 0,
            mimeType: 'text/plain',
            text: ''
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: -1
        },
        cache: {},
        timings: {
          blocked: 0,
          dns: -1,
          connect: -1,
          send: 0,
          wait: 0,
          receive: 0,
          ssl: -1
        },
        time: 0,
        serverIPAddress: '',
        _resourceType: type
      });
    }, { urls: ['<all_urls>'] }, ['requestBody']);

    // 2. onSendHeaders: Request Headers & Request Cookies
    api.webRequest.onSendHeaders.addListener((details) => {
      if (!isRecording) return;
      const req = pendingRequests.get(details.requestId);
      if (!req) return;

      req.request.headers = formatHeaders(details.requestHeaders);
      const cookieHeader = (details.requestHeaders || []).find(h => h.name.toLowerCase() === 'cookie');
      if (cookieHeader) {
        req.request.cookies = parseCookies(cookieHeader.value);
      }
    }, { urls: ['<all_urls>'] }, ['requestHeaders'].filter(Boolean));

    // 3. onHeadersReceived: Status, Response Headers, Set-Cookie, IP
    api.webRequest.onHeadersReceived.addListener((details) => {
      if (!isRecording) return;
      const req = pendingRequests.get(details.requestId);
      if (!req) return;

      req.response.status = details.statusCode;
      req.response.statusText = details.statusLine ? details.statusLine.replace(/^HTTP\/[\d.]+\s+\d+\s*/, '') : '';
      req.response.headers = formatHeaders(details.responseHeaders);
      req.serverIPAddress = details.ip || '';

      const contentTypeHeader = (details.responseHeaders || []).find(h => h.name.toLowerCase() === 'content-type');
      if (contentTypeHeader) {
        req.response.content.mimeType = contentTypeHeader.value.split(';')[0].trim();
      }

      const contentLengthHeader = (details.responseHeaders || []).find(h => h.name.toLowerCase() === 'content-length');
      if (contentLengthHeader) {
        const len = parseInt(contentLengthHeader.value, 10);
        if (!isNaN(len)) {
          req.response.content.size = len;
          req.response.bodySize = len;
          totalBytesTransferred += len;
        }
      }

      const locationHeader = (details.responseHeaders || []).find(h => h.name.toLowerCase() === 'location');
      if (locationHeader) {
        req.response.redirectURL = locationHeader.value;
      }
    }, { urls: ['<all_urls>'] }, ['responseHeaders'].filter(Boolean));

    // 4. onCompleted: Compute timings, attach payload cache, finalize entry
    api.webRequest.onCompleted.addListener((details) => {
      if (!isRecording) return;
      const req = pendingRequests.get(details.requestId);
      if (!req) return;

      const duration = Math.max(1, Math.round(details.timeStamp - req.startTime));
      req.time = duration;
      req.timings.wait = Math.round(duration * 0.7);
      req.timings.receive = Math.max(1, duration - req.timings.wait);

      // Check payload cache from in-page hook
      const cached = payloadCache.get(req.request.url) || payloadCache.get(details.requestId);
      if (cached) {
        if (cached.requestBody && !req.request.postData) {
          req.request.postData = {
            mimeType: 'application/json',
            text: typeof cached.requestBody === 'string' ? cached.requestBody : JSON.stringify(cached.requestBody)
          };
        }
        if (cached.responseBody) {
          req.response.content.text = typeof cached.responseBody === 'string' ? cached.responseBody : JSON.stringify(cached.responseBody);
          req.response.content.size = req.response.content.text.length;
        }
        if (cached.action) {
          req._initiatingInteraction = cached.action;
        }
      }

      addRecordedEntry(req);
      pendingRequests.delete(details.requestId);
    }, { urls: ['<all_urls>'] }, ['responseHeaders'].filter(Boolean));

    // 5. onErrorOccurred: Error capture
    api.webRequest.onErrorOccurred.addListener((details) => {
      if (!isRecording) return;
      const req = pendingRequests.get(details.requestId);
      if (!req) return;

      req.time = Math.max(1, Math.round(details.timeStamp - req.startTime));
      req.response.status = 0;
      req.response.statusText = details.error || 'Failed';
      req._error = details.error;

      addRecordedEntry(req);
      pendingRequests.delete(details.requestId);
    }, { urls: ['<all_urls>'] });
  }

  function addRecordedEntry(entry) {
    recordedEntries.push(entry);
    if (recordedEntries.length > MAX_ENTRIES) {
      recordedEntries.shift();
    }

    // Broadcast live event to open sidepanel/popup
    try {
      api.runtime.sendMessage({
        type: 'GHOST_HAR_LIVE_ENTRY',
        entry,
        stats: getStats()
      }).catch(() => {});
    } catch (_) {}
  }

  function broadcastLiveStats() {
    try {
      api.runtime.sendMessage({
        type: 'GHOST_HAR_STATS_UPDATE',
        stats: getStats()
      }).catch(() => {});
    } catch (_) {}
  }

  /* ──────────────────────────────────────────────────────────────
   * CONTROLS & API EXPORTS
   * ────────────────────────────────────────────────────────────── */
  function startRecording() {
    isRecording = true;
    api.storage.local.set({ harIsRecording: true });
    broadcastLiveStats();
    console.log('[Ghost HAR Engine Firefox] Global recording started.');
    return true;
  }

  function stopRecording() {
    isRecording = false;
    api.storage.local.set({ harIsRecording: false });
    broadcastLiveStats();
    console.log('[Ghost HAR Engine Firefox] Global recording stopped.');
    return true;
  }

  function clearRecording() {
    recordedEntries.length = 0;
    pendingRequests.clear();
    pageRegistry.clear();
    payloadCache.clear();
    totalBytesTransferred = 0;
    broadcastLiveStats();
    console.log('[Ghost HAR Engine Firefox] Recording buffer cleared.');
    return true;
  }

  function getStats() {
    const activeTabCount = tabRegistry.size || 1;
    return {
      isRecording,
      totalRequests: recordedEntries.length,
      totalBytes: totalBytesTransferred,
      activeTabs: activeTabCount,
      popupsDetected: Array.from(tabRegistry.values()).filter(t => t.isPopup).length
    };
  }

  function getRecordedEntries() {
    return recordedEntries;
  }

  function handlePayloadRelay(payloadData) {
    if (!payloadData || !payloadData.url) return;
    payloadCache.set(payloadData.url, {
      requestBody: payloadData.requestBody || null,
      responseBody: payloadData.responseBody || null,
      action: payloadData.action || null
    });
  }

  /* ──────────────────────────────────────────────────────────────
   * HAR 1.2 SPECIFICATION BUILDER
   * ────────────────────────────────────────────────────────────── */
  function buildHarLog(customCreator = {}) {
    const pages = Array.from(pageRegistry.values());
    if (pages.length === 0) {
      pages.push({
        id: 'page_global_default',
        startedDateTime: new Date().toISOString(),
        title: 'Ghost Profile Global Session',
        pageTimings: { onContentLoad: -1, onLoad: -1 }
      });
    }

    const harObject = {
      log: {
        version: '1.2',
        creator: {
          name: customCreator.name || 'Ghost Profile HAR & Flow Engine (Firefox)',
          version: customCreator.version || '3.2.0',
          comment: 'Global Multi-Tab & Interaction Flow Archive'
        },
        browser: {
          name: 'Firefox',
          version: (navigator.userAgent.match(/Firefox\/(\d+(\.\d+)*)/) || [])[1] || '135.0'
        },
        pages: pages,
        entries: recordedEntries.map(e => ({
          pageref: e.pageref || 'page_global_default',
          startedDateTime: e.startedDateTime,
          time: e.time,
          request: e.request,
          response: e.response,
          cache: e.cache || {},
          timings: e.timings,
          serverIPAddress: e.serverIPAddress,
          _tabId: e.tabId,
          _tabTitle: e.tabTitle,
          _isPopup: e.isPopup,
          _parentTabId: e.parentTabId,
          _resourceType: e._resourceType,
          _initiatingInteraction: e._initiatingInteraction || null
        }))
      }
    };

    return harObject;
  }

  /* ──────────────────────────────────────────────────────────────
   * FLOW SUMMARY JSON BUILDER
   * ────────────────────────────────────────────────────────────── */
  function buildFlowSummary() {
    const tabsArray = Array.from(tabRegistry.values());
    const domainStats = {};

    for (const e of recordedEntries) {
      try {
        const u = new URL(e.request.url);
        domainStats[u.hostname] = (domainStats[u.hostname] || 0) + 1;
      } catch (_) {}
    }

    return {
      sessionOverview: {
        generatedAt: new Date().toISOString(),
        totalRequestsCaptured: recordedEntries.length,
        totalBytesTransferred: totalBytesTransferred,
        tabsTracked: tabsArray.length
      },
      tabLineageTree: tabsArray,
      topDomainsHit: domainStats,
      interactionTimeline: recordedEntries
        .filter(e => e._initiatingInteraction)
        .map(e => ({
          time: e.startedDateTime,
          tabId: e.tabId,
          action: e._initiatingInteraction,
          triggeredRequest: `${e.request.method} ${e.request.url}`
        }))
    };
  }

  // Initialize
  initTabTracking();
  initWebRequestListeners();

  // Restore recording state
  api.storage.local.get(['harIsRecording'], (data) => {
    if (data.harIsRecording) {
      isRecording = true;
    }
  });

  // Export engine instance
  const HarEngine = {
    startRecording,
    stopRecording,
    clearRecording,
    isRecording: () => isRecording,
    getStats,
    getRecordedEntries,
    handlePayloadRelay,
    buildHarLog,
    buildFlowSummary
  };

  global.GhostHarEngine = HarEngine;

})(typeof self !== 'undefined' ? self : window);
