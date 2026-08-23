/**
 * Ghost Profile — popup.js (Diagnostic Console Engine)
 * ═══════════════════════════════════════════════════════════════
 * Handles:
 *  1. Dynamic SVG Waveform (Signal → Noise visualizer)
 *  2. Category grouping, counters, and collapse/expand
 *  3. Active profile state & diagnostic metrics
 *  4. Timezone search & region filtering (118 timezones)
 *  5. Language search & region filtering (40+ language presets)
 *  6. Fingerprint export / import (JSON vault)
 *  7. Sticky CTA & profile application with click animation
 *  8. Full Two-Way Bilingual Localization (100% EN / 100% ID)
 *  9. Dark Mode & Light Mode Theme Support with Persistent State
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ── DOM Elements ───────────────────────────────────── */
  const $container = document.getElementById('app-container');
  const $masterSwitch = document.getElementById('master-switch');
  const $masterSwitchLabel = document.getElementById('master-switch-label');
  const $applyBtn = document.getElementById('apply-btn');
  const $reloadAll = document.getElementById('reload-all');

  // Status & Waveform
  const $waveformContainer = document.getElementById('waveform-container');
  const $statusDot = document.getElementById('status-dot');
  const $statusMsg = document.getElementById('status-msg');
  const $waveformStatus = document.getElementById('waveform-status');
  const $waveformPath = document.getElementById('waveform-path');
  const $waveformSvg = document.getElementById('waveform-svg');

  // Active Identity
  const $identityEmpty = document.getElementById('identity-empty');
  const $identityData = document.getElementById('identity-data');
  const $heroLabel = document.getElementById('hero-label');
  const $specScreen = document.getElementById('spec-screen');
  const $specHardware = document.getElementById('spec-hardware');
  const $specTz = document.getElementById('spec-tz');
  const $specLang = document.getElementById('spec-lang');
  const $seedCanvas = document.getElementById('seed-canvas');
  const $seedAudio = document.getElementById('seed-audio');
  const $seedFont = document.getElementById('seed-font');

  // Feature Toggles & Categories
  const $featureToggles = document.querySelectorAll('[data-feature]');
  const $catHardwareCount = document.getElementById('cat-count-hardware');
  const $catRenderingCount = document.getElementById('cat-count-rendering');
  const $catNetworkCount = document.getElementById('cat-count-network');

  // Timezone UI
  const $tzRowTrigger = document.getElementById('tz-row-trigger');
  const $tzStatusPill = document.getElementById('tz-status-pill');
  const $tzSelectorPanel = document.getElementById('tz-selector-panel');
  const $tzSearchInput = document.getElementById('tz-search-input');
  const $tzResetBtn = document.getElementById('tz-reset-btn');
  const $tzRegionTabs = document.getElementById('tz-region-tabs');
  const $tzScrollList = document.getElementById('tz-scroll-list');

  // Language UI
  const $langRowTrigger = document.getElementById('lang-row-trigger');
  const $langStatusPill = document.getElementById('lang-status-pill');
  const $langSelectorPanel = document.getElementById('lang-selector-panel');
  const $langSearchInput = document.getElementById('lang-search-input');
  const $langResetBtn = document.getElementById('lang-reset-btn');
  const $langRegionTabs = document.getElementById('lang-region-tabs');
  const $langScrollList = document.getElementById('lang-scroll-list');

  // Fingerprint Data Vault
  const $vaultExportBtn = document.getElementById('vault-export-btn');
  const $vaultImportToggle = document.getElementById('vault-import-toggle');
  const $vaultPanel = document.getElementById('vault-panel');
  const $vaultTextarea = document.getElementById('vault-textarea');
  const $vaultApplyBtn = document.getElementById('vault-apply-btn');
  const $vaultCancelBtn = document.getElementById('vault-cancel-btn');
  const $vaultFeedback = document.getElementById('vault-feedback');

  // Header Controls
  const $langToggle = document.getElementById('lang-toggle');
  const $themeToggle = document.getElementById('theme-toggle');
  const $moonIcon = $themeToggle.querySelector('.moon-icon');
  const $sunIcon = $themeToggle.querySelector('.sun-icon');

  /* ── State ──────────────────────────────────────────── */
  let currentProfile = null;
  let selectedTimezone = null; // null = random
  let selectedLanguage = null; // null = random (or language code like 'ru-RU')
  let activeRegion = 'all';
  let activeLangRegion = 'all';
  let isTzPanelOpen = false;
  let isLangPanelOpen = false;
  let currentLang = 'id';   // 'en' or 'id'
  let currentTheme = 'dark'; // 'dark' or 'light'

  /* ── i18n Translation Map (100% Pure EN / 100% Pure ID) ── */
  const TRANSLATIONS = {
    // Header & Tooltips
    'master-switch-title': { en: 'Enable / Disable Protection', id: 'Aktifkan / Nonaktifkan Proteksi' },
    'lang-toggle-title': { en: 'Switch language (EN / ID)', id: 'Ganti bahasa (EN / ID)' },
    'theme-toggle-title': { en: 'Switch theme (Dark / Light)', id: 'Ganti tema (Gelap / Terang)' },

    // Top Tabs
    'nav-tab-spoof': { en: 'Identity & Spoofing', id: 'Identitas & Proteksi' },
    'nav-tab-har': { en: 'HAR & Flow Control', id: 'Ruang Kontrol HAR' },

    // Waveform
    'waveform-title': { en: 'Signal → Noise visualization (Jitter increases with active modules)', id: 'Visualisasi Sinyal → Noise (Jitter meningkat sesuai modul aktif)' },
    'waveform-label': { en: 'SIGNAL → NOISE', id: 'SINYAL → NOISE' },
    'wf-plain': { en: (n) => `0/${n} PLAIN (PURE SIGNAL)`, id: (n) => `0/${n} POLOS (SINYAL MURNI)` },
    'wf-massive': { en: (a, t) => `${a}/${t} MASSIVE (TOTAL NOISE)`, id: (a, t) => `${a}/${t} MASIF (NOISE TOTAL)` },
    'wf-moderate': { en: (a, t) => `${a}/${t} MODERATE`, id: (a, t) => `${a}/${t} MODERAT` },
    'wf-partial': { en: (a, t) => `${a}/${t} PARTIAL`, id: (a, t) => `${a}/${t} PARSIAL` },

    // Status Bar
    'status-off': { en: 'Inactive · Using native browser identity', id: 'Nonaktif · Menggunakan identitas asli browser' },
    'status-full': { en: (a, t) => `Stealth active · <span class="mono">${a}/${t}</span> modules protected`, id: (a, t) => `Stealth aktif · <span class="mono">${a}/${t}</span> modul terlindungi` },
    'status-partial': { en: (a, t) => `Partial protection · <span class="mono">${a}/${t}</span> modules active`, id: (a, t) => `Proteksi parsial · <span class="mono">${a}/${t}</span> modul aktif` },
    'status-zero': { en: 'All protection modules disabled', id: 'Semua modul proteksi dinonaktifkan' },

    // Identity Card
    'id-eyebrow': { en: 'ACTIVE IDENTITY', id: 'IDENTITAS AKTIF' },
    'badge-mode': { en: 'STEALTH', id: 'STEALTH' },
    'empty-title': { en: 'No profile generated yet', id: 'Belum ada profil aktif' },
    'empty-desc': { en: 'Click <strong>Randomize & Apply</strong> below to generate a new identity.', id: 'Klik <strong>Acak & Terapkan</strong> di bawah untuk membuat identitas baru.' },
    'spec-screen': { en: 'Screen', id: 'Layar' },
    'spec-cpu': { en: 'CPU / RAM', id: 'CPU / RAM' },
    'spec-tz': { en: 'Timezone', id: 'Zona Waktu' },
    'spec-lang': { en: 'Language', id: 'Bahasa' },
    'spec-native': { en: 'Native', id: 'Asli' },
    'spec-random': { en: 'Random', id: 'Acak' },
    'hero-custom': { en: 'Custom Stealth Profile', id: 'Profil Stealth Kustom' },
    'hero-imported': { en: (gpu) => `Imported · ${gpu}`, id: (gpu) => `Impor · ${gpu}` },

    // Categories
    'cat-hardware': { en: 'DEVICE IDENTITY', id: 'IDENTITAS PERANGKAT' },
    'cat-rendering': { en: 'RENDERING FINGERPRINT', id: 'SIDIK JARI RENDERING' },
    'cat-network': { en: 'NETWORK & ENVIRONMENT', id: 'JARINGAN & LINGKUNGAN' },

    // Module Names & Descriptions
    'mod-ua': { en: 'Hardware Specs', id: 'Spesifikasi Perangkat' },
    'mod-ua-desc': { en: 'Mask CPU cores, RAM memory, & platform language', id: 'Menyamarkan CPU core, memori RAM, & bahasa sistem' },
    'mod-screen': { en: 'Screen & Display', id: 'Layar & Tampilan' },
    'mod-screen-desc': { en: 'Spoof display resolution, colorDepth, & DPR', id: 'Memanipulasi resolusi layar, kedalaman warna, & DPR' },
    'mod-mediaDevices': { en: 'Media Devices', id: 'Perangkat Media' },
    'mod-mediaDevices-desc': { en: 'Randomize microphone/webcam list & device IDs', id: 'Mengacak daftar & ID perangkat mikrofon/kamera' },
    'mod-storage': { en: 'Storage Estimate', id: 'Estimasi Penyimpanan' },
    'mod-storage-desc': { en: 'Perturb storage quota & persistency API', id: 'Mengacak kuota penyimpanan & persistensi API' },
    'mod-canvas': { en: 'Canvas Fingerprint', id: 'Sidik Jari Canvas' },
    'mod-canvas-desc': { en: 'Deterministic pixel-noise injection (Mulberry32)', id: 'Injeksi noise pixel deterministik (Mulberry32)' },
    'mod-webgl': { en: 'WebGL Fingerprint', id: 'Sidik Jari WebGL' },
    'mod-webgl-desc': { en: 'Spoof GPU vendor & unmasked renderer string', id: 'Memanipulasi vendor GPU & unmasked renderer' },
    'mod-audio': { en: 'AudioContext Deep', id: 'AudioContext Mendalam' },
    'mod-audio-desc': { en: '6-layer noise on analyser, buffer & oscillator', id: 'Injeksi 6 lapis noise pada analyser, buffer & osilator' },
    'mod-fonts': { en: 'Font Enumeration Noise', id: 'Noise Deteksi Font' },
    'mod-fonts-desc': { en: 'Micro-metric measureText perturbation (±0.1px)', id: 'Perturbasi mikro-metrik measureText (±0.1px)' },
    
    // Timezone Module
    'mod-timezone': { en: 'Timezone', id: 'Zona Waktu' },
    'mod-timezone-desc': { en: 'Spoof Intl.DateTimeFormat & UTC offset', id: 'Memanipulasi Intl.DateTimeFormat & offset UTC' },
    'tz-random': { en: 'Random ▸', id: 'Acak ▸' },
    'tz-search-placeholder': { en: 'Search city / timezone...', id: 'Cari kota / zona waktu...' },
    'tz-reset': { en: 'Random', id: 'Acak' },
    'tz-reset-title': { en: 'Reset to random timezone', id: 'Kembalikan ke zona waktu acak' },
    'tz-region-all': { en: 'All', id: 'Semua' },
    'tz-region-Asia': { en: 'Asia', id: 'Asia' },
    'tz-region-America': { en: 'Americas', id: 'Amerika' },
    'tz-region-Europe': { en: 'Europe', id: 'Eropa' },
    'tz-region-Africa': { en: 'Africa', id: 'Afrika' },
    'tz-region-Oceania': { en: 'Oceania', id: 'Oseania' },
    'tz-not-found': { en: 'Region not found', id: 'Wilayah tidak ditemukan' },

    // Language Module
    'mod-language': { en: 'Browser Language', id: 'Bahasa Browser' },
    'mod-language-desc': { en: 'Spoof navigator.languages & locale tags', id: 'Menyamarkan navigator.languages & tag locale' },
    'lang-random': { en: 'Random ▸', id: 'Acak ▸' },
    'lang-search-placeholder': { en: 'Search language / code...', id: 'Cari bahasa / kode...' },
    'lang-reset': { en: 'Random', id: 'Acak' },
    'lang-reset-title': { en: 'Reset to random language', id: 'Kembalikan ke bahasa acak' },
    'lang-region-all': { en: 'All', id: 'Semua' },
    'lang-region-Asia': { en: 'Asia', id: 'Asia' },
    'lang-region-Europe': { en: 'Europe', id: 'Eropa' },
    'lang-region-Americas': { en: 'Americas', id: 'Amerika' },
    'lang-region-Africa': { en: 'Africa & ME', id: 'Afrika & Timteng' },
    'lang-not-found': { en: 'Language not found', id: 'Bahasa tidak ditemukan' },

    // Other modules
    'mod-webrtc': { en: 'WebRTC Leak Guard', id: 'Proteksi Kebocoran WebRTC' },
    'mod-webrtc-desc': { en: 'Prevent local IP leaks via ICE candidates', id: 'Mencegah kebocoran IP lokal via ICE candidate' },
    'mod-matchMedia': { en: 'CSS matchMedia', id: 'CSS matchMedia' },
    'mod-matchMedia-desc': { en: 'Synchronize dark/light theme preference', id: 'Sinkronisasi preferensi tema gelap/terang' },
    'mod-misc': { en: 'Misc Protections', id: 'Proteksi Tambahan' },
    'mod-misc-desc': { en: 'Mask webdriver flag & precision timer', id: 'Menyamarkan flag webdriver & timer presisi' },

    // Data Vault
    'vault-eyebrow': { en: 'FINGERPRINT DATA', id: 'DATA SIDIK JARI' },
    'vault-export': { en: 'Copy JSON', id: 'Salin JSON' },
    'vault-export-title': { en: 'Copy current fingerprint profile in JSON format', id: 'Salin profil sidik jari saat ini dalam format JSON' },
    'vault-import': { en: 'Import Profile', id: 'Impor Profil' },
    'vault-import-title': { en: 'Paste and apply a saved fingerprint profile', id: 'Tempel dan terapkan profil sidik jari yang disimpan' },
    'vault-apply': { en: 'Apply Fingerprint', id: 'Terapkan Sidik Jari' },
    'vault-cancel': { en: 'Cancel', id: 'Batal' },
    'vault-placeholder': { en: 'Paste fingerprint JSON here...', id: 'Tempel JSON sidik jari di sini...' },
    'vault-no-profile': { en: 'No profile to copy yet', id: 'Belum ada profil untuk disalin' },
    'vault-copied': { en: 'Copied!', id: 'Tersalin!' },
    'vault-clipboard-ok': { en: 'Fingerprint JSON copied to clipboard', id: 'JSON sidik jari berhasil disalin ke clipboard' },
    'vault-manual-copy': { en: 'Please copy text manually above', id: 'Silakan salin teks secara manual di atas' },
    'vault-paste-first': { en: 'Paste fingerprint JSON first', id: 'Tempel JSON sidik jari terlebih dahulu' },
    'vault-invalid-json': { en: 'Invalid JSON format', id: 'Format JSON tidak valid' },
    'vault-too-few': { en: (n) => `Only ${n} valid parameters (minimum 3)`, id: (n) => `Hanya ${n} parameter valid (minimal 3)` },
    'vault-applied': { en: (n) => `Successfully applied ${n} fingerprint parameters`, id: (n) => `Berhasil menerapkan ${n} parameter sidik jari` },

    // Footer
    'reload-label': { en: 'Reload all open tabs', id: 'Muat ulang semua tab terbuka' },
    'cta-text': { en: 'Randomize & Apply', id: 'Acak & Terapkan' },
    'cta-applying': { en: 'Applying...', id: 'Menerapkan...' },
    'cta-failed': { en: 'Failed!', id: 'Gagal!' },
    'cta-reloading': { en: 'Active · Reloading...', id: 'Aktif · Memuat ulang...' },
    'cta-active': { en: 'New Identity Active!', id: 'Identitas Baru Aktif!' },
  };

  /** Get translated string helper */
  function t(key, ...args) {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    const val = entry[currentLang] || entry['en'] || key;
    if (typeof val === 'function') return val(...args);
    return val;
  }

  const CATEGORY_MAP = {
    hardware: ['ua', 'screen', 'mediaDevices', 'storage'],
    rendering: ['canvas', 'webgl', 'audio', 'fonts'],
    network: ['timezone', 'language', 'webrtc', 'matchMedia', 'misc']
  };

  const FP_KEYS = [
    'fingerprintHash',
    'webglVendor', 'webglRenderer',
    'screenWidth', 'screenHeight', 'availWidth', 'availHeight',
    'outerWidth', 'outerHeight', 'colorDepth', 'pixelDepth', 'devicePixelRatio',
    'hardwareConcurrency', 'deviceMemory',
    'canvasNoiseSeed', 'audioNoiseSeed', 'fontNoiseSeed',
    'timezoneOffset', 'timezone',
    'languages',
    'mediaDevices',
    'storageQuota', 'storageUsage',
    'colorScheme', 'doNotTrack',
    'label'
  ];

  /* ══════════════════════════════════════════════════════
   * 1. DYNAMIC SVG WAVEFORM (Signal → Noise Visualizer)
   * ══════════════════════════════════════════════════════ */
  function updateWaveform(activeCount, totalCount) {
    const ratio = totalCount > 0 ? activeCount / totalCount : 0;
    const isMasterOn = $masterSwitch.checked;

    if (!isMasterOn || ratio === 0) {
      $waveformPath.setAttribute('d', 'M 0,11 L 360,11');
      $waveformStatus.textContent = t('wf-plain', totalCount);
      $waveformStatus.style.color = 'var(--text-muted)';
      $waveformSvg.style.color = 'var(--text-muted)';
      return;
    }

    // Generate dynamic waveform with deterministic pseudo-noise
    const points = [];
    const numPoints = 28;
    const step = 360 / (numPoints - 1);
    const maxAmplitude = 9.0 * ratio;

    // Pseudo-random deterministic noise sequence
    const noiseFactors = [
      0.0, 0.45, -0.75, 0.88, -0.32, 0.95, -0.92, 0.55, 
      -0.85, 0.72, -0.44, 0.98, -0.89, 0.65, -0.95, 0.82,
      -0.58, 0.91, -0.78, 0.48, -0.88, 0.79, -0.62, 0.94,
      -0.85, 0.52, -0.35, 0.0
    ];

    for (let i = 0; i < numPoints; i++) {
      const x = Math.round(i * step);
      let y = 11;
      if (i > 0 && i < numPoints - 1) {
        const factor = noiseFactors[i % noiseFactors.length];
        y = 11 + factor * maxAmplitude;
      }
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`);
    }

    $waveformPath.setAttribute('d', points.join(' '));

    // Label & Color
    if (ratio === 1) {
      $waveformStatus.textContent = t('wf-massive', activeCount, totalCount);
      $waveformStatus.style.color = 'var(--accent-signal)';
      $waveformSvg.style.color = 'var(--accent-signal)';
    } else if (ratio >= 0.5) {
      $waveformStatus.textContent = t('wf-moderate', activeCount, totalCount);
      $waveformStatus.style.color = 'var(--accent-signal)';
      $waveformSvg.style.color = 'var(--accent-signal)';
    } else {
      $waveformStatus.textContent = t('wf-partial', activeCount, totalCount);
      $waveformStatus.style.color = 'var(--accent-warn)';
      $waveformSvg.style.color = 'var(--accent-warn)';
    }
  }

  /* ══════════════════════════════════════════════════════
   * 2. CATEGORY & STATUS REFRESH
   * ══════════════════════════════════════════════════════ */
  function refreshModuleCounts() {
    const isMasterOn = $masterSwitch.checked;
    let totalActive = 0;
    const totalModules = $featureToggles.length;

    // Check each category
    const catCounts = { hardware: 0, rendering: 0, network: 0 };

    $featureToggles.forEach($t => {
      const feat = $t.getAttribute('data-feature');
      const isChecked = $t.checked;
      const $row = document.querySelector(`.module-row[data-row="${feat}"]`);

      if ($row) {
        if (isChecked && isMasterOn) {
          $row.classList.add('active');
          $row.classList.remove('inactive');
        } else {
          $row.classList.remove('active');
          $row.classList.add('inactive');
        }
      }

      if (isChecked) {
        totalActive++;
        for (const [cat, features] of Object.entries(CATEGORY_MAP)) {
          if (features.includes(feat)) catCounts[cat]++;
        }
      }
    });

    // Update Category Badges
    updateCatBadge($catHardwareCount, catCounts.hardware, CATEGORY_MAP.hardware.length);
    updateCatBadge($catRenderingCount, catCounts.rendering, CATEGORY_MAP.rendering.length);
    updateCatBadge($catNetworkCount, catCounts.network, CATEGORY_MAP.network.length);

    // Update Waveform
    updateWaveform(totalActive, totalModules);

    // Update Status Line
    if (!isMasterOn) {
      $statusDot.className = 'status-dot idle';
      $statusMsg.innerHTML = t('status-off');
    } else if (totalActive === totalModules) {
      $statusDot.className = 'status-dot';
      $statusMsg.innerHTML = t('status-full', totalActive, totalModules);
    } else if (totalActive > 0) {
      $statusDot.className = 'status-dot warn';
      $statusMsg.innerHTML = t('status-partial', totalActive, totalModules);
    } else {
      $statusDot.className = 'status-dot idle';
      $statusMsg.innerHTML = t('status-zero');
    }
  }

  function updateCatBadge($badge, count, total) {
    if (!$badge) return;
    $badge.textContent = `${count}/${total}`;
    $badge.className = 'cat-badge mono';
    if (count === 0) $badge.classList.add('zero');
    else if (count < total) $badge.classList.add('partial');
  }

  /* ══════════════════════════════════════════════════════
   * 3. ACTIVE PROFILE DIAGNOSTICS DISPLAY
   * ══════════════════════════════════════════════════════ */
  function displayProfile(p) {
    currentProfile = p;
    if (!p) {
      $identityEmpty.style.display = 'flex';
      $identityData.style.display = 'none';
      return;
    }

    $identityEmpty.style.display = 'none';
    $identityData.style.display = 'block';

    // Hero Label (e.g. Chrome 135 · WIN11 · RTX 3060)
    $heroLabel.textContent = p.label || t('hero-custom');

    // Specs Grid
    $specScreen.textContent = p.screenWidth && p.screenHeight ? `${p.screenWidth}×${p.screenHeight}` : t('spec-native');
    $specHardware.textContent = `${p.hardwareConcurrency || 8}c / ${p.deviceMemory || 8}GB`;
    $specTz.textContent = p.timezone ? p.timezone.split('/').pop().replace(/_/g, ' ') : t('spec-random');
    $specLang.textContent = p.languages ? p.languages.join(', ') : 'en-US, en';

    // Noise Seeds
    $seedCanvas.textContent = p.canvasNoiseSeed !== undefined ? p.canvasNoiseSeed.toFixed(4) : '0.0000';
    $seedAudio.textContent = p.audioNoiseSeed !== undefined ? p.audioNoiseSeed.toFixed(4) : '0.0000';
    $seedFont.textContent = p.fontNoiseSeed !== undefined ? p.fontNoiseSeed.toFixed(4) : '0.0000';
  }

  /* ══════════════════════════════════════════════════════
   * 4. TIMEZONE SELECTOR (118 Worldwide Zones)
   * ══════════════════════════════════════════════════════ */
  const ALL_TIMEZONES = (window.GhostGenerator && window.GhostGenerator.TIMEZONES) ? window.GhostGenerator.TIMEZONES : [];

  function formatCity(tz) {
    return tz.split('/').pop().replace(/_/g, ' ');
  }

  function formatOffset(offset) {
    const sign = offset <= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h}${m > 0 ? ':' + String(m).padStart(2, '0') : ''}`;
  }

  function buildTimezoneList() {
    const query = $tzSearchInput.value.toLowerCase().trim();
    const region = activeRegion;
    $tzScrollList.innerHTML = '';

    let filtered = ALL_TIMEZONES;
    if (region !== 'all') {
      filtered = filtered.filter(t => t.region === region);
    }
    if (query) {
      filtered = filtered.filter(t => {
        const city = formatCity(t.tz).toLowerCase();
        const full = t.tz.toLowerCase();
        return city.includes(query) || full.includes(query);
      });
    }

    if (filtered.length === 0) {
      $tzScrollList.innerHTML = `<div style="padding:10px;text-align:center;font-size:11px;color:var(--text-muted)">${t('tz-not-found')}</div>`;
      return;
    }

    // Group by Region
    const grouped = {};
    filtered.forEach(t => {
      const r = t.region || 'Other';
      if (!grouped[r]) grouped[r] = [];
      grouped[r].push(t);
    });

    const regionOrder = ['Asia', 'America', 'Europe', 'Africa', 'Oceania', 'Atlantic', 'Indian', 'Other'];
    regionOrder.forEach(r => {
      if (!grouped[r] || grouped[r].length === 0) return;

      if (region === 'all') {
        const regionLabel = t(`tz-region-${r}`) || r;
        const header = document.createElement('div');
        header.className = 'tz-list-header mono';
        header.textContent = `── ${regionLabel} (${grouped[r].length})`;
        $tzScrollList.appendChild(header);
      }

      grouped[r].forEach(itemData => {
        const item = document.createElement('div');
        item.className = `tz-list-item${selectedTimezone === itemData.tz ? ' selected' : ''}`;
        item.innerHTML = `
          <span class="tz-item-city">${formatCity(itemData.tz)}</span>
          <span class="tz-item-utc mono">${formatOffset(itemData.offset)}</span>
        `;
        item.addEventListener('click', () => {
          selectedTimezone = itemData.tz;
          updateTzPill();
          closeTzPanel();
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ghostTimezone: selectedTimezone });
          }
        });
        $tzScrollList.appendChild(item);
      });
    });
  }

  function updateTzPill() {
    if (selectedTimezone) {
      const city = formatCity(selectedTimezone);
      $tzStatusPill.textContent = `${city} ▸`;
      $tzStatusPill.classList.add('fixed');
    } else {
      $tzStatusPill.textContent = t('tz-random');
      $tzStatusPill.classList.remove('fixed');
    }
  }

  function toggleTzPanel() {
    isTzPanelOpen = !isTzPanelOpen;
    $tzSelectorPanel.style.display = isTzPanelOpen ? 'block' : 'none';
    if (isTzPanelOpen) {
      if (isLangPanelOpen) closeLangPanel();
      $tzSearchInput.value = '';
      buildTimezoneList();
      setTimeout(() => $tzSearchInput.focus(), 50);
    }
  }

  function closeTzPanel() {
    isTzPanelOpen = false;
    $tzSelectorPanel.style.display = 'none';
  }

  // Timezone Event Listeners
  $tzRowTrigger.addEventListener('click', (e) => {
    if (e.target.closest('.switch-toggle')) return;
    toggleTzPanel();
  });

  $tzResetBtn.addEventListener('click', () => {
    selectedTimezone = null;
    updateTzPill();
    closeTzPanel();
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ghostTimezone: null });
    }
  });

  $tzSearchInput.addEventListener('input', buildTimezoneList);

  $tzRegionTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.region-tab');
    if (!tab) return;
    activeRegion = tab.dataset.region;
    $tzRegionTabs.querySelectorAll('.region-tab').forEach(b => b.classList.remove('active'));
    tab.classList.add('active');
    buildTimezoneList();
  });

  // Clicking Spec Timezone in Identity Card jumps to Timezone panel
  $specTz.closest('.spec-item').addEventListener('click', () => {
    const $catNetwork = document.getElementById('cat-network');
    if ($catNetwork && $catNetwork.classList.contains('collapsed')) {
      $catNetwork.classList.remove('collapsed');
    }
    if (!isTzPanelOpen) toggleTzPanel();
    $tzSelectorPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ══════════════════════════════════════════════════════
   * 5. LANGUAGE SELECTOR (40+ Top Worldwide Locales)
   * ══════════════════════════════════════════════════════ */
  const ALL_LANGUAGES = (window.GhostGenerator && window.GhostGenerator.LANGUAGES) ? window.GhostGenerator.LANGUAGES : [];

  function buildLanguageList() {
    const query = $langSearchInput.value.toLowerCase().trim();
    const region = activeLangRegion;
    $langScrollList.innerHTML = '';

    let filtered = ALL_LANGUAGES;
    if (region !== 'all') {
      filtered = filtered.filter(l => l.region === region);
    }
    if (query) {
      filtered = filtered.filter(l => {
        const code = l.code.toLowerCase();
        const name = l.name.toLowerCase();
        const native = l.native.toLowerCase();
        const tags = l.tags.join(' ').toLowerCase();
        return code.includes(query) || name.includes(query) || native.includes(query) || tags.includes(query);
      });
    }

    if (filtered.length === 0) {
      $langScrollList.innerHTML = `<div style="padding:10px;text-align:center;font-size:11px;color:var(--text-muted)">${t('lang-not-found')}</div>`;
      return;
    }

    // Group by Region
    const grouped = {};
    filtered.forEach(l => {
      const r = l.region || 'Other';
      if (!grouped[r]) grouped[r] = [];
      grouped[r].push(l);
    });

    const regionOrder = ['Asia', 'Europe', 'Americas', 'Africa', 'Other'];
    regionOrder.forEach(r => {
      if (!grouped[r] || grouped[r].length === 0) return;

      if (region === 'all') {
        const regionLabel = t(`lang-region-${r}`) || r;
        const header = document.createElement('div');
        header.className = 'lang-list-header mono';
        header.textContent = `── ${regionLabel} (${grouped[r].length})`;
        $langScrollList.appendChild(header);
      }

      grouped[r].forEach(itemData => {
        const item = document.createElement('div');
        item.className = `lang-list-item${selectedLanguage === itemData.code ? ' selected' : ''}`;
        item.innerHTML = `
          <span class="lang-item-name">${itemData.name} <span style="opacity:0.75;font-size:10px">(${itemData.native})</span></span>
          <span class="lang-item-tag mono">${itemData.tags.join(', ')}</span>
        `;
        item.addEventListener('click', () => {
          selectedLanguage = itemData.code;
          updateLangPill();
          closeLangPanel();
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ ghostLanguage: selectedLanguage });
          }
        });
        $langScrollList.appendChild(item);
      });
    });
  }

  function updateLangPill() {
    if (selectedLanguage) {
      const found = ALL_LANGUAGES.find(l => l.code === selectedLanguage);
      const label = found ? found.code : selectedLanguage;
      $langStatusPill.textContent = `${label} ▸`;
      $langStatusPill.classList.add('fixed');
    } else {
      $langStatusPill.textContent = t('lang-random');
      $langStatusPill.classList.remove('fixed');
    }
  }

  function toggleLangPanel() {
    isLangPanelOpen = !isLangPanelOpen;
    $langSelectorPanel.style.display = isLangPanelOpen ? 'block' : 'none';
    if (isLangPanelOpen) {
      if (isTzPanelOpen) closeTzPanel();
      $langSearchInput.value = '';
      buildLanguageList();
      setTimeout(() => $langSearchInput.focus(), 50);
    }
  }

  function closeLangPanel() {
    isLangPanelOpen = false;
    $langSelectorPanel.style.display = 'none';
  }

  // Language Event Listeners
  $langRowTrigger.addEventListener('click', (e) => {
    if (e.target.closest('.switch-toggle')) return;
    toggleLangPanel();
  });

  $langResetBtn.addEventListener('click', () => {
    selectedLanguage = null;
    updateLangPill();
    closeLangPanel();
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ghostLanguage: null });
    }
  });

  $langSearchInput.addEventListener('input', buildLanguageList);

  $langRegionTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.lang-tab');
    if (!tab) return;
    activeLangRegion = tab.dataset.langRegion;
    $langRegionTabs.querySelectorAll('.lang-tab').forEach(b => b.classList.remove('active'));
    tab.classList.add('active');
    buildLanguageList();
  });

  // Clicking Spec Language in Identity Card jumps to Language panel
  $specLang.closest('.spec-item').addEventListener('click', () => {
    const $catNetwork = document.getElementById('cat-network');
    if ($catNetwork && $catNetwork.classList.contains('collapsed')) {
      $catNetwork.classList.remove('collapsed');
    }
    if (!isLangPanelOpen) toggleLangPanel();
    $langSelectorPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ══════════════════════════════════════════════════════
   * 6. COLLAPSIBLE CATEGORIES (Smooth toggle)
   * ══════════════════════════════════════════════════════ */
  document.querySelectorAll('[data-toggle-cat]').forEach($hdr => {
    $hdr.addEventListener('click', () => {
      const $group = $hdr.closest('.category-group');
      if ($group) {
        $group.classList.toggle('collapsed');
      }
    });
  });

  /* ══════════════════════════════════════════════════════
   * 7. FINGERPRINT DATA VAULT (Export / Import)
   * ══════════════════════════════════════════════════════ */
  function extractFingerprint(profile) {
    const fp = {};
    FP_KEYS.forEach(k => {
      if (profile[k] !== undefined && profile[k] !== null) fp[k] = profile[k];
    });
    fp._ghostVersion = '3.1';
    fp._exportedAt = new Date().toISOString();
    return fp;
  }

  function setVaultFeedback(msg, type) {
    $vaultFeedback.textContent = msg;
    $vaultFeedback.className = 'vault-feedback ' + type;
    if (type !== 'error') {
      setTimeout(() => {
        $vaultFeedback.textContent = '';
        $vaultFeedback.className = 'vault-feedback';
      }, 3000);
    }
  }

  $vaultExportBtn.addEventListener('click', () => {
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      setVaultFeedback(t('vault-no-profile'), 'error');
      return;
    }
    chrome.runtime.sendMessage({ type: 'GHOST_GET_CONFIG' }, (resp) => {
      if (chrome.runtime.lastError || !resp || !resp.generatedProfile) {
        setVaultFeedback(t('vault-no-profile'), 'error');
        return;
      }
      const fp = extractFingerprint(resp.generatedProfile);
      const json = JSON.stringify(fp, null, 2);

      navigator.clipboard.writeText(json).then(() => {
        $vaultExportBtn.classList.add('copied');
        $vaultExportBtn.querySelector('span').textContent = t('vault-copied');
        setVaultFeedback(t('vault-clipboard-ok'), 'success');
        setTimeout(() => {
          $vaultExportBtn.classList.remove('copied');
          $vaultExportBtn.querySelector('span').textContent = t('vault-export');
        }, 2000);
      }).catch(() => {
        $vaultPanel.style.display = 'block';
        $vaultTextarea.value = json;
        $vaultTextarea.select();
        setVaultFeedback(t('vault-manual-copy'), 'error');
      });
    });
  });

  $vaultImportToggle.addEventListener('click', () => {
    const isOpen = $vaultPanel.style.display !== 'none';
    $vaultPanel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      $vaultTextarea.value = '';
      $vaultTextarea.focus();
      $vaultFeedback.textContent = '';
    }
  });

  $vaultCancelBtn.addEventListener('click', () => {
    $vaultPanel.style.display = 'none';
    $vaultTextarea.value = '';
    $vaultFeedback.textContent = '';
  });

  $vaultApplyBtn.addEventListener('click', () => {
    const raw = $vaultTextarea.value.trim();
    if (!raw) {
      setVaultFeedback(t('vault-paste-first'), 'error');
      return;
    }

    let fp;
    try {
      fp = JSON.parse(raw);
    } catch (_) {
      setVaultFeedback(t('vault-invalid-json'), 'error');
      return;
    }

    const validKeys = FP_KEYS.filter(k => fp[k] !== undefined);
    if (validKeys.length < 3) {
      setVaultFeedback(t('vault-too-few', validKeys.length), 'error');
      return;
    }

    // Generate fresh base profile
    const genOpts = {};
    if (selectedTimezone && !fp.timezone) genOpts.fixedTimezone = selectedTimezone;
    if (selectedLanguage && !fp.languages) genOpts.fixedLanguage = selectedLanguage;
    const baseProfile = window.GhostGenerator.generate(genOpts);

    // Merge imported fields
    FP_KEYS.forEach(k => {
      if (fp[k] !== undefined) baseProfile[k] = fp[k];
    });

    const gpuShort = baseProfile.webglRenderer ?
      (baseProfile.webglRenderer.includes('Apple') ?
        baseProfile.webglRenderer.match(/Apple (\S+ ?\S*)/)?.[1] || 'Apple GPU' :
        baseProfile.webglRenderer.match(/(?:GeForce|Radeon|Iris|UHD|Arc).*?(?=\s*\(0x|\s*Direct|\s*,\s*Open)/)?.[0]?.trim() || 'GPU') : 'GPU';
    
    baseProfile.label = t('hero-imported', gpuShort);

    displayProfile(baseProfile);

    // Collect features & send
    const features = {};
    $featureToggles.forEach($t => {
      features[$t.getAttribute('data-feature')] = $t.checked;
    });

    const enabled = $masterSwitch.checked;
    const reloadAll = $reloadAll.checked;

    sendProfileToBackground(baseProfile, features, enabled, reloadAll);
    setVaultFeedback(t('vault-applied', validKeys.length), 'success');
    $vaultPanel.style.display = 'none';
    $vaultTextarea.value = '';
  });

  /* ══════════════════════════════════════════════════════
   * 8. CTA & DISPATCH (Click Spin Animation)
   * ══════════════════════════════════════════════════════ */
  function sendProfileToBackground(generatedProfile, features, enabled, reloadAll) {
    $applyBtn.disabled = true;
    $applyBtn.querySelector('.cta-text').textContent = t('cta-applying');
    
    // Spin animation on click
    $applyBtn.classList.add('spinning');
    setTimeout(() => $applyBtn.classList.remove('spinning'), 650);

    if (!chrome.runtime || !chrome.runtime.sendMessage) {
      // Offline fallback
      setTimeout(() => {
        $applyBtn.classList.add('success');
        $applyBtn.querySelector('.cta-text').textContent = t('cta-active');
        setTimeout(() => {
          $applyBtn.classList.remove('success');
          $applyBtn.querySelector('.cta-text').textContent = t('cta-text');
          $applyBtn.disabled = false;
        }, 1800);
      }, 300);
      return;
    }

    chrome.runtime.sendMessage({
      type: 'GHOST_APPLY_PROFILE',
      generatedProfile,
      features,
      enabled,
      reloadAll
    }, () => {
      if (chrome.runtime.lastError) {
        $applyBtn.querySelector('.cta-text').textContent = t('cta-failed');
        $applyBtn.disabled = false;
        setTimeout(() => {
          $applyBtn.querySelector('.cta-text').textContent = t('cta-text');
        }, 2000);
        return;
      }

      $applyBtn.classList.add('success');
      $applyBtn.querySelector('.cta-text').textContent = reloadAll ? t('cta-reloading') : t('cta-active');

      setTimeout(() => {
        $applyBtn.classList.remove('success');
        $applyBtn.querySelector('.cta-text').textContent = t('cta-text');
        $applyBtn.disabled = false;
      }, 1800);
    });
  }

  $applyBtn.addEventListener('click', () => {
    const enabled = $masterSwitch.checked;
    const reloadAll = $reloadAll.checked;

    const features = {};
    $featureToggles.forEach($t => {
      features[$t.getAttribute('data-feature')] = $t.checked;
    });

    const genOpts = {};
    if (selectedTimezone) genOpts.fixedTimezone = selectedTimezone;
    if (selectedLanguage) genOpts.fixedLanguage = selectedLanguage;
    const generatedProfile = window.GhostGenerator.generate(genOpts);

    displayProfile(generatedProfile);
    sendProfileToBackground(generatedProfile, features, enabled, reloadAll);
  });

  // Master Switch Change
  $masterSwitch.addEventListener('change', () => {
    const isEnabled = $masterSwitch.checked;
    if (isEnabled) $container.classList.remove('disabled');
    else $container.classList.add('disabled');
    refreshModuleCounts();
  });

  // Feature Toggle Changes
  $featureToggles.forEach($t => {
    $t.addEventListener('change', refreshModuleCounts);
  });

  /* ══════════════════════════════════════════════════════
   * 9. LANGUAGE & THEME ENGINE (100% Bilingual Separation)
   * ══════════════════════════════════════════════════════ */

  /** Apply language translations to every element in the DOM */
  function applyLanguage() {
    document.documentElement.lang = currentLang;

    // Header Tooltips & Titles
    if ($masterSwitchLabel) $masterSwitchLabel.title = t('master-switch-title');
    if ($langToggle) $langToggle.title = t('lang-toggle-title');
    if ($themeToggle) $themeToggle.title = t('theme-toggle-title');

    // Top Navigation Tabs
    const $navSpoof = document.querySelector('#tab-btn-spoof span');
    if ($navSpoof) $navSpoof.textContent = t('nav-tab-spoof');
    const $navHar = document.querySelector('#tab-btn-har span');
    if ($navHar) $navHar.textContent = t('nav-tab-har');

    // Waveform
    if ($waveformContainer) $waveformContainer.title = t('waveform-title');
    const $wfLabel = document.querySelector('.waveform-label');
    if ($wfLabel) $wfLabel.textContent = t('waveform-label');

    // Identity Card
    const $idEyebrow = document.querySelector('.identity-card .card-eyebrow span:first-child');
    if ($idEyebrow) $idEyebrow.textContent = t('id-eyebrow');
    const $badgeMode = document.getElementById('badge-mode');
    if ($badgeMode) $badgeMode.textContent = t('badge-mode');
    
    const $emptyTitle = document.querySelector('.empty-title');
    if ($emptyTitle) $emptyTitle.textContent = t('empty-title');
    const $emptyDesc = document.querySelector('.empty-desc');
    if ($emptyDesc) $emptyDesc.innerHTML = t('empty-desc');

    // Spec Labels
    const specLabels = document.querySelectorAll('.spec-item .spec-k');
    const specKeys = ['spec-screen', 'spec-cpu', 'spec-tz', 'spec-lang'];
    specLabels.forEach(($el, i) => {
      if (specKeys[i]) $el.textContent = t(specKeys[i]);
    });

    // Category Eyebrows
    const catMap = [
      { id: 'cat-hardware', key: 'cat-hardware' },
      { id: 'cat-rendering', key: 'cat-rendering' },
      { id: 'cat-network', key: 'cat-network' }
    ];
    catMap.forEach(({ id, key }) => {
      const $el = document.querySelector(`#${id} .cat-eyebrow`);
      if ($el) $el.textContent = t(key);
    });

    // Module Names & Descriptions
    document.querySelectorAll('.module-row[data-row]').forEach($row => {
      const feat = $row.getAttribute('data-row');
      const $name = $row.querySelector('.module-name');
      const $desc = $row.querySelector('.module-desc');
      if ($name && TRANSLATIONS[`mod-${feat}`]) $name.textContent = t(`mod-${feat}`);
      if ($desc && TRANSLATIONS[`mod-${feat}-desc`]) $desc.textContent = t(`mod-${feat}-desc`);
    });

    // Timezone Selector Elements
    if ($tzSearchInput) $tzSearchInput.placeholder = t('tz-search-placeholder');
    if ($tzResetBtn) {
      $tzResetBtn.textContent = t('tz-reset');
      $tzResetBtn.title = t('tz-reset-title');
    }
    
    // Timezone Region Tabs
    const tzRegionTabMap = {
      'all': 'tz-region-all',
      'Asia': 'tz-region-Asia',
      'America': 'tz-region-America',
      'Europe': 'tz-region-Europe',
      'Africa': 'tz-region-Africa',
      'Oceania': 'tz-region-Oceania'
    };
    document.querySelectorAll('#tz-region-tabs .region-tab').forEach($tab => {
      const r = $tab.dataset.region;
      if (r && tzRegionTabMap[r]) $tab.textContent = t(tzRegionTabMap[r]);
    });

    // Language Selector Elements
    if ($langSearchInput) $langSearchInput.placeholder = t('lang-search-placeholder');
    if ($langResetBtn) {
      $langResetBtn.textContent = t('lang-reset');
      $langResetBtn.title = t('lang-reset-title');
    }

    // Language Region Tabs
    const langRegionTabMap = {
      'all': 'lang-region-all',
      'Asia': 'lang-region-Asia',
      'Europe': 'lang-region-Europe',
      'Americas': 'lang-region-Americas',
      'Africa': 'lang-region-Africa'
    };
    document.querySelectorAll('#lang-region-tabs .lang-tab').forEach($tab => {
      const r = $tab.dataset.langRegion;
      if (r && langRegionTabMap[r]) $tab.textContent = t(langRegionTabMap[r]);
    });

    // Data Vault Section
    const $vaultEyebrow = document.querySelector('.vault-section .cat-eyebrow');
    if ($vaultEyebrow) $vaultEyebrow.textContent = t('vault-eyebrow');
    
    if ($vaultExportBtn) {
      $vaultExportBtn.title = t('vault-export-title');
      const $txt = $vaultExportBtn.querySelector('span');
      if ($txt) $txt.textContent = t('vault-export');
    }
    if ($vaultImportToggle) {
      $vaultImportToggle.title = t('vault-import-title');
      const $txt = $vaultImportToggle.querySelector('span');
      if ($txt) $txt.textContent = t('vault-import');
    }
    if ($vaultApplyBtn) $vaultApplyBtn.textContent = t('vault-apply');
    if ($vaultCancelBtn) $vaultCancelBtn.textContent = t('vault-cancel');
    if ($vaultTextarea) $vaultTextarea.placeholder = t('vault-placeholder');

    // Footer Elements
    const $reloadLabel = document.querySelector('.reload-label');
    if ($reloadLabel) $reloadLabel.textContent = t('reload-label');
    const $ctaText = $applyBtn.querySelector('.cta-text');
    if ($ctaText && !$applyBtn.disabled) $ctaText.textContent = t('cta-text');

    // Refresh dynamic status, waveform, and pills
    refreshModuleCounts();
    updateTzPill();
    updateLangPill();
    if (currentProfile) displayProfile(currentProfile);

    // Update Language Pill indicator (header)
    $langToggle.querySelectorAll('.pill-opt').forEach($opt => {
      $opt.classList.toggle('active', $opt.dataset.langOpt === currentLang);
    });
  }

  /** Apply theme (Dark Mode / Light Mode) */
  function applyTheme() {
    if (currentTheme === 'light') {
      $container.classList.add('light');
      $moonIcon.style.display = 'none';
      $sunIcon.style.display = 'block';
      document.body.style.backgroundColor = '#F4F5F7';
      document.body.style.color = '#1A1D24';
    } else {
      $container.classList.remove('light');
      $moonIcon.style.display = 'block';
      $sunIcon.style.display = 'none';
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  }

  // Language Toggle Click Event (Header)
  $langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'id' ? 'en' : 'id';
    applyLanguage();
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ghostLang: currentLang });
    }
  });

  // Theme Toggle Click Event (Header)
  $themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme();
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ ghostTheme: currentTheme });
    }
  });

  /* ══════════════════════════════════════════════════════
   * 10. TOP NAV TAB SWITCHING & HAR INITIALIZATION
   * ══════════════════════════════════════════════════════ */
  const $tabBtnSpoof = document.getElementById('tab-btn-spoof');
  const $tabBtnHar = document.getElementById('tab-btn-har');
  const $viewSpoof = document.getElementById('view-spoof');
  const $viewHar = document.getElementById('view-har');

  if ($tabBtnSpoof && $tabBtnHar && $viewSpoof && $viewHar) {
    $tabBtnSpoof.addEventListener('click', () => {
      $tabBtnSpoof.classList.add('active');
      $tabBtnSpoof.setAttribute('aria-selected', 'true');
      $tabBtnHar.classList.remove('active');
      $tabBtnHar.setAttribute('aria-selected', 'false');

      $viewSpoof.classList.add('active');
      $viewSpoof.style.display = 'flex';
      $viewHar.classList.remove('active');
      $viewHar.style.display = 'none';
    });

    $tabBtnHar.addEventListener('click', () => {
      $tabBtnHar.classList.add('active');
      $tabBtnHar.setAttribute('aria-selected', 'true');
      $tabBtnSpoof.classList.remove('active');
      $tabBtnSpoof.setAttribute('aria-selected', 'false');

      $viewHar.classList.add('active');
      $viewHar.style.display = 'flex';
      $viewSpoof.classList.remove('active');
      $viewSpoof.style.display = 'none';

      if (window.GhostHarPanel) {
        window.GhostHarPanel.init(t);
        window.GhostHarPanel.refreshState();
      }
    });
  }

  // Initialize HAR panel
  if (window.GhostHarPanel) {
    window.GhostHarPanel.init(t);
  }

  /* ══════════════════════════════════════════════════════
   * 11. INITIAL LOAD & RESTORE
   * ══════════════════════════════════════════════════════ */
  if (chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ type: 'GHOST_GET_CONFIG' }, (resp) => {
      if (chrome.runtime.lastError || !resp) return;

      const { generatedProfile, features, enabled } = resp;

      $masterSwitch.checked = enabled !== false;
      if (!enabled) $container.classList.add('disabled');
      else $container.classList.remove('disabled');

      if (features) {
        $featureToggles.forEach($t => {
          const feat = $t.getAttribute('data-feature');
          if (feat in features) $t.checked = features[feat];
        });
      }

      displayProfile(generatedProfile);
      refreshModuleCounts();
    });
  }

  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['ghostTimezone', 'ghostLanguage', 'ghostLang', 'ghostTheme'], (res) => {
      if (res.ghostTimezone !== undefined) selectedTimezone = res.ghostTimezone;
      if (res.ghostLanguage !== undefined) selectedLanguage = res.ghostLanguage;
      if (res.ghostLang) currentLang = res.ghostLang;
      if (res.ghostTheme) currentTheme = res.ghostTheme;
      applyTheme();
      applyLanguage();
    });
  } else {
    // Initial apply for local / test environments
    applyTheme();
    applyLanguage();
  }

})();
