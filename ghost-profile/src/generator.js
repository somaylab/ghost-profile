/**
 * Ghost Profile — generator.js v3 (STEALTH MODE)
 * ═══════════════════════════════════════════════════════════════
 * KEY DESIGN CHANGE: No longer spoofs Chrome version or OS.
 * Uses the REAL browser version (detected at runtime) to maintain
 * cross-layer consistency between HTTP headers, JS APIs, and
 * BFP (FingerprintJS Watson) captures.
 *
 * What IS randomized (unique per identity):
 *   - WebGL GPU renderer string (from realistic pool)
 *   - Canvas noise seed (deterministic PRNG)
 *   - Audio noise seed
 *   - Font noise seed  
 *   - Screen resolution
 *   - Hardware specs (cores, memory) matching GPU tier
 *   - Timezone
 *   - Language set
 *   - Media devices (random count & IDs)
 *   - Storage estimate
 *   - Color scheme preference
 *
 * What is NOT changed (stays as real browser):
 *   - Chrome/Edge version number
 *   - OS platform
 *   - Platform version
 *   - Architecture / Bitness
 *   - Client Hints version strings
 *
 * This ensures BFP Watson sees the SAME browser version from
 * both HTTP headers and JS API, eliminating SERVICE_ERROR.
 * ═══════════════════════════════════════════════════════════════
 */
window.GhostGenerator = (function () {
  'use strict';

  /* ── Utility ─────────────────────────────────────────── */
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  // L9: Use crypto.getRandomValues for better entropy in device IDs
  const hexId = (len) => {
    try {
      const bytes = new Uint8Array(Math.ceil(len / 2));
      crypto.getRandomValues(bytes);
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').substring(0, len);
    } catch (_) {
      return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
  };

  /* ══════════════════════════════════════════════════════
   * REAL BROWSER DETECTION
   * ══════════════════════════════════════════════════════ */
  function detectRealBrowser() {
    const ua = navigator.userAgent;
    const chromeMatch = ua.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
    const edgeMatch = ua.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    
    let chromeMajor = 135;
    let chromeFull = '135.0.7049.96';
    let isEdge = false;
    let edgeBuild = '';
    
    if (chromeMatch) {
      chromeMajor = parseInt(chromeMatch[1]);
      chromeFull = `${chromeMatch[1]}.${chromeMatch[2]}.${chromeMatch[3]}.${chromeMatch[4]}`;
    }
    if (edgeMatch) {
      isEdge = true;
      edgeBuild = edgeMatch[1];
    }

    // Detect OS from UA
    let osId = 'win11';
    if (ua.includes('Macintosh')) osId = 'macos';
    else if (ua.includes('Linux') && !ua.includes('Android')) osId = 'linux';
    else if (ua.includes('Windows')) {
      // Differentiate Win10 vs Win11 via platform version if possible
      osId = 'win11'; // Default to win11 since UA is same for both
    }

    // Get real platform version from userAgentData if available
    let realPlatformVersion = null;
    if (navigator.userAgentData) {
      // We can't call getHighEntropyValues synchronously, 
      // so we read what's available
      realPlatformVersion = null; // Will be set via async init if needed
    }

    // Detect sec-ch-ua from current headers (not accessible from JS directly)
    // We'll reconstruct it from navigator.userAgentData if available
    let realSecChUa = '';
    let realBrands = [];
    if (navigator.userAgentData && navigator.userAgentData.brands) {
      realBrands = navigator.userAgentData.brands.map(b => ({ brand: b.brand, version: b.version }));
      realSecChUa = realBrands.map(b => `"${b.brand}";v="${b.version}"`).join(', ');
    }

    return {
      chromeMajor,
      chromeFull,
      isEdge,
      edgeBuild,
      osId,
      realSecChUa,
      realBrands,
      ua
    };
  }

  /* ══════════════════════════════════════════════════════
   * DATA POOLS (only for randomizable elements)
   * ══════════════════════════════════════════════════════ */

  /* ── GPU Pools (verified PCI Device IDs from techpowerup/devicehunt) ── */
  const GPU_WINDOWS = [
    // ── NVIDIA GeForce GTX (Turing/Pascal) ──
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti (0x00001C82) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB (0x00001C20) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 SUPER (0x00002187) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER (0x000021C4) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti (0x00002182) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    // ── NVIDIA GeForce RTX 20 Series (Turing) ──
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 (0x00001F08) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 SUPER (0x00001F47) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER (0x00001EC2) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    // ── NVIDIA GeForce RTX 30 Series (Ampere) ──
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 (0x00002582) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002503) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002489) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti (0x00002482) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    // ── NVIDIA GeForce RTX 40 Series (Ada Lovelace) ──
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti (0x00002803) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002709) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti (0x00002782) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti SUPER (0x00002705) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 (0x00002704) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    // ── NVIDIA GeForce RTX 50 Series (Blackwell) ──
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 (0x00002F04) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 5070 Ti (0x00002C05) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 5080 (0x00002B02) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 (0x00002B85) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    // ── AMD Radeon RX 6000 Series (RDNA 2) ──
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 580 (0x000067DF) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 5600 XT (0x0000731F) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 6500 XT (0x0000743F) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 6600 XT (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 6650 XT (0x000073EF) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    // ── AMD Radeon RX 7000 Series (RDNA 3) ──
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 7600 (0x00007480) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 7700 XT (0x0000747E) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 7800 XT (0x0000747E) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 7900 XT (0x0000744C) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    // ── AMD Radeon RX 9000 Series (RDNA 4) ──
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 9070 XT (0x00009441) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
    // ── Intel ──
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00003EA0) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E92) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Intel(R) UHD Graphics 730 (0x00004692) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Intel(R) UHD Graphics 770 (0x00004680) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'low' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'mid' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics (0x000056A0) Direct3D11 vs_5_0 ps_5_0, D3D11)', t: 'high' },
  ];

  const GPU_MACOS = [
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', t: 'mid' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', t: 'high' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', t: 'mid' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)', t: 'high' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)', t: 'mid' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro, Unspecified Version)', t: 'high' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max, Unspecified Version)', t: 'high' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M4, Unspecified Version)', t: 'high' },
    { v: 'Google Inc. (Apple)', r: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)', t: 'high' },
  ];

  const GPU_LINUX = [
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL ES 3.2)', t: 'low' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 770 (ADL-S GT1), OpenGL ES 3.2)', t: 'low' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2), OpenGL ES 3.2)', t: 'mid' },
    { v: 'Google Inc. (Intel)', r: 'ANGLE (Intel, Mesa Intel(R) Arc(TM) A770 Graphics (DG2), OpenGL ES 3.2)', t: 'high' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650/PCIe/SSE2, OpenGL ES 3.2)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060/PCIe/SSE2, OpenGL ES 3.2)', t: 'mid' },
    { v: 'Google Inc. (NVIDIA)', r: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070/PCIe/SSE2, OpenGL ES 3.2)', t: 'high' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 580 (radeonsi, polaris10, LLVM 15.0.7, DRM 3.49, 6.1.0), OpenGL ES 3.2)', t: 'low' },
    { v: 'Google Inc. (AMD)', r: 'ANGLE (AMD, AMD Radeon RX 7600 (radeonsi, navi33, LLVM 17.0.6, DRM 3.54, 6.6.0), OpenGL ES 3.2)', t: 'mid' },
  ];

  const GPU_POOLS = { windows: GPU_WINDOWS, macos: GPU_MACOS, linux: GPU_LINUX };

  /* ── Screen Resolutions (StatCounter 2025 top desktop) ──────────── */
  const SCREENS = [
    { w: 1366, h: 768 },
    { w: 1440, h: 900 },
    { w: 1536, h: 864 },
    { w: 1600, h: 900 },
    { w: 1680, h: 1050 },
    { w: 1920, h: 1080 },
    { w: 1920, h: 1200 },
    { w: 2560, h: 1080 },
    { w: 2560, h: 1440 },
    { w: 2560, h: 1600 },
    { w: 2880, h: 1800 },
    { w: 3440, h: 1440 },
    { w: 3840, h: 2160 }
  ];

  const SCREENS_MACOS = [
    { w: 1440, h: 900 },
    { w: 1512, h: 982 },
    { w: 1728, h: 1117 },
    { w: 1800, h: 1169 },
    { w: 1920, h: 1080 },
    { w: 2560, h: 1440 },
    { w: 2560, h: 1600 },
    { w: 3024, h: 1964 },
    { w: 3456, h: 2234 }
  ];

  /* ── Hardware Tiers (Intel 12-14th gen, Ryzen 5000-9000, Apple M-series) ── */
  const HW_TIERS = {
    low:  { cores: [2, 4, 4, 4, 6],           mem: [4, 4, 8],                    colorDepth: [24] },
    mid:  { cores: [4, 6, 6, 8, 8, 10, 12],   mem: [8, 8, 16, 16],               colorDepth: [24, 24, 30] },
    high: { cores: [8, 10, 12, 14, 16, 20, 24], mem: [16, 16, 32, 32, 64],        colorDepth: [24, 30] }
  };

  const HW_MACOS = {
    low:  { cores: [8],                       mem: [8, 16],                      colorDepth: [30] },
    mid:  { cores: [8, 8, 10, 10, 12],        mem: [8, 16, 18, 24],              colorDepth: [30] },
    high: { cores: [10, 12, 12, 14, 16],      mem: [16, 24, 32, 36, 48, 64, 128], colorDepth: [30] }
  };

  /* ── Timezones (ALL major IANA zones, grouped by region) ── */
  const TIMEZONES = [
    // ── Asia ──
    { tz: 'Asia/Jakarta',          offset: -420, region: 'Asia' },
    { tz: 'Asia/Makassar',         offset: -480, region: 'Asia' },
    { tz: 'Asia/Jayapura',         offset: -540, region: 'Asia' },
    { tz: 'Asia/Singapore',        offset: -480, region: 'Asia' },
    { tz: 'Asia/Kuala_Lumpur',     offset: -480, region: 'Asia' },
    { tz: 'Asia/Bangkok',          offset: -420, region: 'Asia' },
    { tz: 'Asia/Ho_Chi_Minh',      offset: -420, region: 'Asia' },
    { tz: 'Asia/Manila',           offset: -480, region: 'Asia' },
    { tz: 'Asia/Tokyo',            offset: -540, region: 'Asia' },
    { tz: 'Asia/Seoul',            offset: -540, region: 'Asia' },
    { tz: 'Asia/Shanghai',         offset: -480, region: 'Asia' },
    { tz: 'Asia/Hong_Kong',        offset: -480, region: 'Asia' },
    { tz: 'Asia/Taipei',           offset: -480, region: 'Asia' },
    { tz: 'Asia/Kolkata',          offset: -330, region: 'Asia' },
    { tz: 'Asia/Colombo',          offset: -330, region: 'Asia' },
    { tz: 'Asia/Dhaka',            offset: -360, region: 'Asia' },
    { tz: 'Asia/Karachi',          offset: -300, region: 'Asia' },
    { tz: 'Asia/Kathmandu',        offset: -345, region: 'Asia' },
    { tz: 'Asia/Yangon',           offset: -390, region: 'Asia' },
    { tz: 'Asia/Almaty',           offset: -360, region: 'Asia' },
    { tz: 'Asia/Tashkent',         offset: -300, region: 'Asia' },
    { tz: 'Asia/Dubai',            offset: -240, region: 'Asia' },
    { tz: 'Asia/Muscat',           offset: -240, region: 'Asia' },
    { tz: 'Asia/Riyadh',           offset: -180, region: 'Asia' },
    { tz: 'Asia/Qatar',            offset: -180, region: 'Asia' },
    { tz: 'Asia/Kuwait',           offset: -180, region: 'Asia' },
    { tz: 'Asia/Baghdad',          offset: -180, region: 'Asia' },
    { tz: 'Asia/Tehran',           offset: -210, region: 'Asia' },
    { tz: 'Asia/Beirut',           offset: -120, region: 'Asia' },
    { tz: 'Asia/Jerusalem',        offset: -120, region: 'Asia' },
    { tz: 'Asia/Amman',            offset: -180, region: 'Asia' },
    { tz: 'Asia/Baku',             offset: -240, region: 'Asia' },
    { tz: 'Asia/Tbilisi',          offset: -240, region: 'Asia' },
    { tz: 'Asia/Yerevan',          offset: -240, region: 'Asia' },
    { tz: 'Asia/Vladivostok',      offset: -600, region: 'Asia' },
    { tz: 'Asia/Novosibirsk',      offset: -420, region: 'Asia' },
    { tz: 'Asia/Krasnoyarsk',      offset: -420, region: 'Asia' },
    { tz: 'Asia/Irkutsk',          offset: -480, region: 'Asia' },
    { tz: 'Asia/Kamchatka',        offset: -720, region: 'Asia' },
    // ── America ──
    { tz: 'America/New_York',      offset: 300,  region: 'America' },
    { tz: 'America/Chicago',       offset: 360,  region: 'America' },
    { tz: 'America/Denver',        offset: 420,  region: 'America' },
    { tz: 'America/Los_Angeles',   offset: 480,  region: 'America' },
    { tz: 'America/Anchorage',     offset: 540,  region: 'America' },
    { tz: 'America/Phoenix',       offset: 420,  region: 'America' },
    { tz: 'America/Toronto',       offset: 300,  region: 'America' },
    { tz: 'America/Vancouver',     offset: 480,  region: 'America' },
    { tz: 'America/Edmonton',      offset: 420,  region: 'America' },
    { tz: 'America/Winnipeg',      offset: 360,  region: 'America' },
    { tz: 'America/Halifax',       offset: 240,  region: 'America' },
    { tz: 'America/St_Johns',      offset: 210,  region: 'America' },
    { tz: 'America/Mexico_City',   offset: 360,  region: 'America' },
    { tz: 'America/Cancun',        offset: 300,  region: 'America' },
    { tz: 'America/Bogota',        offset: 300,  region: 'America' },
    { tz: 'America/Lima',          offset: 300,  region: 'America' },
    { tz: 'America/Santiago',      offset: 240,  region: 'America' },
    { tz: 'America/Buenos_Aires',  offset: 180,  region: 'America' },
    { tz: 'America/Sao_Paulo',     offset: 180,  region: 'America' },
    { tz: 'America/Caracas',       offset: 240,  region: 'America' },
    { tz: 'America/Guayaquil',     offset: 300,  region: 'America' },
    { tz: 'America/Montevideo',    offset: 180,  region: 'America' },
    { tz: 'America/Asuncion',      offset: 240,  region: 'America' },
    { tz: 'America/La_Paz',        offset: 240,  region: 'America' },
    { tz: 'America/Panama',        offset: 300,  region: 'America' },
    { tz: 'America/Costa_Rica',    offset: 360,  region: 'America' },
    { tz: 'America/Guatemala',     offset: 360,  region: 'America' },
    { tz: 'America/Havana',        offset: 300,  region: 'America' },
    { tz: 'America/Jamaica',       offset: 300,  region: 'America' },
    { tz: 'America/Puerto_Rico',   offset: 240,  region: 'America' },
    // ── Europe ──
    { tz: 'Europe/London',         offset: 0,    region: 'Europe' },
    { tz: 'Europe/Dublin',         offset: 0,    region: 'Europe' },
    { tz: 'Europe/Lisbon',         offset: 0,    region: 'Europe' },
    { tz: 'Europe/Paris',          offset: -60,  region: 'Europe' },
    { tz: 'Europe/Berlin',         offset: -60,  region: 'Europe' },
    { tz: 'Europe/Amsterdam',      offset: -60,  region: 'Europe' },
    { tz: 'Europe/Brussels',       offset: -60,  region: 'Europe' },
    { tz: 'Europe/Madrid',         offset: -60,  region: 'Europe' },
    { tz: 'Europe/Rome',           offset: -60,  region: 'Europe' },
    { tz: 'Europe/Zurich',         offset: -60,  region: 'Europe' },
    { tz: 'Europe/Vienna',         offset: -60,  region: 'Europe' },
    { tz: 'Europe/Stockholm',      offset: -60,  region: 'Europe' },
    { tz: 'Europe/Oslo',           offset: -60,  region: 'Europe' },
    { tz: 'Europe/Copenhagen',     offset: -60,  region: 'Europe' },
    { tz: 'Europe/Helsinki',       offset: -120, region: 'Europe' },
    { tz: 'Europe/Warsaw',         offset: -60,  region: 'Europe' },
    { tz: 'Europe/Prague',         offset: -60,  region: 'Europe' },
    { tz: 'Europe/Budapest',       offset: -60,  region: 'Europe' },
    { tz: 'Europe/Bucharest',      offset: -120, region: 'Europe' },
    { tz: 'Europe/Athens',         offset: -120, region: 'Europe' },
    { tz: 'Europe/Istanbul',       offset: -180, region: 'Europe' },
    { tz: 'Europe/Moscow',         offset: -180, region: 'Europe' },
    { tz: 'Europe/Kiev',           offset: -120, region: 'Europe' },
    { tz: 'Europe/Minsk',          offset: -180, region: 'Europe' },
    // ── Africa ──
    { tz: 'Africa/Cairo',          offset: -120, region: 'Africa' },
    { tz: 'Africa/Casablanca',     offset: -60,  region: 'Africa' },
    { tz: 'Africa/Lagos',          offset: -60,  region: 'Africa' },
    { tz: 'Africa/Nairobi',        offset: -180, region: 'Africa' },
    { tz: 'Africa/Johannesburg',   offset: -120, region: 'Africa' },
    { tz: 'Africa/Accra',          offset: 0,    region: 'Africa' },
    { tz: 'Africa/Addis_Ababa',    offset: -180, region: 'Africa' },
    { tz: 'Africa/Dar_es_Salaam',  offset: -180, region: 'Africa' },
    { tz: 'Africa/Algiers',        offset: -60,  region: 'Africa' },
    { tz: 'Africa/Tunis',          offset: -60,  region: 'Africa' },
    { tz: 'Africa/Khartoum',       offset: -120, region: 'Africa' },
    // ── Pacific / Oceania ──
    { tz: 'Australia/Sydney',      offset: -600, region: 'Oceania' },
    { tz: 'Australia/Melbourne',   offset: -600, region: 'Oceania' },
    { tz: 'Australia/Brisbane',    offset: -600, region: 'Oceania' },
    { tz: 'Australia/Perth',       offset: -480, region: 'Oceania' },
    { tz: 'Australia/Adelaide',    offset: -570, region: 'Oceania' },
    { tz: 'Australia/Darwin',      offset: -570, region: 'Oceania' },
    { tz: 'Pacific/Auckland',      offset: -720, region: 'Oceania' },
    { tz: 'Pacific/Fiji',          offset: -720, region: 'Oceania' },
    { tz: 'Pacific/Guam',          offset: -600, region: 'Oceania' },
    { tz: 'Pacific/Honolulu',      offset: 600,  region: 'Oceania' },
    { tz: 'Pacific/Port_Moresby',  offset: -600, region: 'Oceania' },
    // ── Atlantic / Indian ──
    { tz: 'Atlantic/Reykjavik',    offset: 0,    region: 'Atlantic' },
    { tz: 'Indian/Maldives',       offset: -300, region: 'Indian' },
    { tz: 'Indian/Mauritius',      offset: -240, region: 'Indian' },
  ];

  /* ── Language Presets Database (40+ Top Worldwide Browser Locales) ── */
  const LANGUAGES = [
    // ── Americas ──
    { code: 'en-US', name: 'English (US)',         native: 'English (US)',          tags: ['en-US', 'en'],                  region: 'Americas' },
    { code: 'en-CA', name: 'English (Canada)',     native: 'English (Canada)',      tags: ['en-CA', 'en-US', 'en'],         region: 'Americas' },
    { code: 'es-MX', name: 'Spanish (Mexico)',     native: 'Español (México)',      tags: ['es-MX', 'es', 'en-US', 'en'],   region: 'Americas' },
    { code: 'es-AR', name: 'Spanish (Argentina)',  native: 'Español (Argentina)',   tags: ['es-AR', 'es', 'en-US', 'en'],   region: 'Americas' },
    { code: 'es-CO', name: 'Spanish (Colombia)',   native: 'Español (Colombia)',    tags: ['es-CO', 'es', 'en-US', 'en'],   region: 'Americas' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)',  native: 'Português (Brasil)',    tags: ['pt-BR', 'pt', 'en-US', 'en'],   region: 'Americas' },
    { code: 'fr-CA', name: 'French (Canada)',      native: 'Français (Canada)',     tags: ['fr-CA', 'fr', 'en-US', 'en'],   region: 'Americas' },

    // ── Asia & Pacific ──
    { code: 'id-ID', name: 'Indonesian',           native: 'Bahasa Indonesia',      tags: ['id-ID', 'id', 'en-US', 'en'],   region: 'Asia' },
    { code: 'ja-JP', name: 'Japanese',             native: '日本語',                tags: ['ja-JP', 'ja', 'en-US', 'en'],   region: 'Asia' },
    { code: 'ko-KR', name: 'Korean',               native: '한국어',                tags: ['ko-KR', 'ko', 'en-US', 'en'],   region: 'Asia' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文',              tags: ['zh-CN', 'zh', 'en-US', 'en'],   region: 'Asia' },
    { code: 'zh-TW', name: 'Chinese (Traditional)',native: '繁體中文',              tags: ['zh-TW', 'zh', 'en-US', 'en'],   region: 'Asia' },
    { code: 'zh-HK', name: 'Chinese (Hong Kong)',  native: '香港中文',              tags: ['zh-HK', 'zh', 'en-US', 'en'],   region: 'Asia' },
    { code: 'vi-VN', name: 'Vietnamese',           native: 'Tiếng Việt',            tags: ['vi-VN', 'vi', 'en-US', 'en'],   region: 'Asia' },
    { code: 'th-TH', name: 'Thai',                 native: 'ไทย',                   tags: ['th-TH', 'th', 'en-US', 'en'],   region: 'Asia' },
    { code: 'ms-MY', name: 'Malay',                native: 'Bahasa Melayu',         tags: ['ms-MY', 'ms', 'en-US', 'en'],   region: 'Asia' },
    { code: 'tl-PH', name: 'Filipino',             native: 'Filipino / Tagalog',    tags: ['tl-PH', 'tl', 'en-US', 'en'],   region: 'Asia' },
    { code: 'hi-IN', name: 'Hindi',                native: 'हिन्दी',                tags: ['hi-IN', 'hi', 'en-US', 'en'],   region: 'Asia' },
    { code: 'bn-BD', name: 'Bengali',              native: 'বাংলা',                  tags: ['bn-BD', 'bn', 'en-US', 'en'],   region: 'Asia' },
    { code: 'en-AU', name: 'English (Australia)',  native: 'English (Australia)',   tags: ['en-AU', 'en-GB', 'en'],         region: 'Asia' },

    // ── Europe ──
    { code: 'en-GB', name: 'English (UK)',         native: 'English (UK)',          tags: ['en-GB', 'en'],                  region: 'Europe' },
    { code: 'ru-RU', name: 'Russian',              native: 'Русский',               tags: ['ru-RU', 'ru', 'en'],            region: 'Europe' },
    { code: 'de-DE', name: 'German',               native: 'Deutsch',               tags: ['de-DE', 'de', 'en-US', 'en'],   region: 'Europe' },
    { code: 'fr-FR', name: 'French',               native: 'Français',              tags: ['fr-FR', 'fr', 'en-US', 'en'],   region: 'Europe' },
    { code: 'es-ES', name: 'Spanish (Spain)',      native: 'Español (España)',      tags: ['es-ES', 'es', 'en-US', 'en'],   region: 'Europe' },
    { code: 'it-IT', name: 'Italian',              native: 'Italiano',              tags: ['it-IT', 'it', 'en-US', 'en'],   region: 'Europe' },
    { code: 'pt-PT', name: 'Portuguese (Portugal)',native: 'Português (Portugal)',  tags: ['pt-PT', 'pt', 'en-US', 'en'],   region: 'Europe' },
    { code: 'nl-NL', name: 'Dutch',                native: 'Nederlands',            tags: ['nl-NL', 'nl', 'en-US', 'en'],   region: 'Europe' },
    { code: 'pl-PL', name: 'Polish',               native: 'Polski',                tags: ['pl-PL', 'pl', 'en-US', 'en'],   region: 'Europe' },
    { code: 'uk-UA', name: 'Ukrainian',            native: 'Українська',            tags: ['uk-UA', 'uk', 'en-US', 'en'],   region: 'Europe' },
    { code: 'tr-TR', name: 'Turkish',              native: 'Türkçe',                tags: ['tr-TR', 'tr', 'en-US', 'en'],   region: 'Europe' },
    { code: 'el-GR', name: 'Greek',                native: 'Ελληνικά',              tags: ['el-GR', 'el', 'en-US', 'en'],   region: 'Europe' },
    { code: 'sv-SE', name: 'Swedish',              native: 'Svenska',               tags: ['sv-SE', 'sv', 'en-US', 'en'],   region: 'Europe' },
    { code: 'no-NO', name: 'Norwegian',            native: 'Norsk',                 tags: ['no-NO', 'no', 'en-US', 'en'],   region: 'Europe' },
    { code: 'da-DK', name: 'Danish',               native: 'Dansk',                 tags: ['da-DK', 'da', 'en-US', 'en'],   region: 'Europe' },
    { code: 'fi-FI', name: 'Finnish',              native: 'Suomi',                 tags: ['fi-FI', 'fi', 'en-US', 'en'],   region: 'Europe' },
    { code: 'cs-CZ', name: 'Czech',                native: 'Čeština',               tags: ['cs-CZ', 'cs', 'en-US', 'en'],   region: 'Europe' },
    { code: 'ro-RO', name: 'Romanian',             native: 'Română',                tags: ['ro-RO', 'ro', 'en-US', 'en'],   region: 'Europe' },
    { code: 'hu-HU', name: 'Hungarian',            native: 'Magyar',                tags: ['hu-HU', 'hu', 'en-US', 'en'],   region: 'Europe' },

    // ── Africa & Middle East ──
    { code: 'ar-SA', name: 'Arabic (Saudi Arabia)',native: 'العربية (السعودية)',    tags: ['ar-SA', 'ar', 'en-US', 'en'],   region: 'Africa' },
    { code: 'ar-AE', name: 'Arabic (UAE)',         native: 'العربية (الإمارات)',    tags: ['ar-AE', 'ar', 'en-US', 'en'],   region: 'Africa' },
    { code: 'ar-EG', name: 'Arabic (Egypt)',       native: 'العربية (مصر)',         tags: ['ar-EG', 'ar', 'en-US', 'en'],   region: 'Africa' },
    { code: 'he-IL', name: 'Hebrew',               native: 'עברית',                 tags: ['he-IL', 'he', 'en-US', 'en'],   region: 'Africa' },
    { code: 'fa-IR', name: 'Persian',              native: 'فارسی',                 tags: ['fa-IR', 'fa', 'en-US', 'en'],   region: 'Africa' },
    { code: 'sw-KE', name: 'Swahili',              native: 'Kiswahili',             tags: ['sw-KE', 'sw', 'en-US', 'en'],   region: 'Africa' },
    { code: 'af-ZA', name: 'Afrikaans',            native: 'Afrikaans',             tags: ['af-ZA', 'af', 'en-US', 'en'],   region: 'Africa' }
  ];


  /* ── Language Sets ───────────────────────────────────── */
  const LANGUAGE_SETS = [
    ['en-US', 'en'],
    ['en-US', 'en', 'id'],
    ['en-GB', 'en'],
    ['id-ID', 'id', 'en-US', 'en'],
    ['id-ID', 'id', 'en'],
    ['de-DE', 'de', 'en-US', 'en'],
    ['fr-FR', 'fr', 'en'],
    ['es-ES', 'es', 'en'],
    ['pt-BR', 'pt', 'en'],
    ['ja-JP', 'ja', 'en'],
    ['ko-KR', 'ko', 'en'],
    ['zh-CN', 'zh', 'en'],
    ['th-TH', 'th', 'en'],
    ['vi-VN', 'vi', 'en'],
    ['ru-RU', 'ru', 'en'],
    ['nl-NL', 'nl', 'en'],
    ['it-IT', 'it', 'en'],
    ['pl-PL', 'pl', 'en'],
    ['tr-TR', 'tr', 'en']
  ];

  /* ── Media Device Templates ──────────────────────────── */
  function generateMediaDevices() {
    const devices = [];
    const numAudioIn = rand(1, 3);
    const numAudioOut = rand(1, 2);
    const numVideoIn = rand(0, 2);
    for (let i = 0; i < numAudioIn; i++) {
      devices.push({ deviceId: hexId(64), kind: 'audioinput', label: '', groupId: hexId(64) });
    }
    for (let i = 0; i < numAudioOut; i++) {
      devices.push({ deviceId: i === 0 ? 'default' : hexId(64), kind: 'audiooutput', label: '', groupId: hexId(64) });
    }
    for (let i = 0; i < numVideoIn; i++) {
      devices.push({ deviceId: hexId(64), kind: 'videoinput', label: '', groupId: hexId(64) });
    }
    return devices;
  }

  /* ── OS info map ─────────────────────────────────────── */
  const OS_INFO = {
    win10: { gpuPool: 'windows', taskbarH: 40, dprOptions: [1, 1.25], screenPool: 'standard' },
    win11: { gpuPool: 'windows', taskbarH: 48, dprOptions: [1, 1.25, 1.5], screenPool: 'standard' },
    macos: { gpuPool: 'macos', taskbarH: 25, dprOptions: [2], screenPool: 'macos' },
    linux: { gpuPool: 'linux', taskbarH: 27, dprOptions: [1], screenPool: 'standard' }
  };

  /* ══════════════════════════════════════════════════════
   * PROFILE GENERATOR (STEALTH MODE)
   * ══════════════════════════════════════════════════════ */
  function generate(options = {}) {
    const real = detectRealBrowser();
    const osInfo = OS_INFO[real.osId] || OS_INFO.win11;

    // ── GPU (randomized) ──
    const gpuPool = GPU_POOLS[osInfo.gpuPool];
    const gpu = pick(gpuPool);

    // ── Hardware matching GPU tier ──
    const hwTable = real.osId === 'macos' ? HW_MACOS : HW_TIERS;
    const hw = hwTable[gpu.t] || hwTable.mid;
    const cores = pick(hw.cores);
    const mem = pick(hw.mem);
    const colorDepth = pick(hw.colorDepth);

    // ── Screen (randomized) ──
    const screenPool = osInfo.screenPool === 'macos' ? SCREENS_MACOS : SCREENS;
    const scr = pick(screenPool);
    const dpr = pick(osInfo.dprOptions);
    const availH = scr.h - osInfo.taskbarH;

    // ── Timezone (fixed or randomized) ──
    let tz;
    if (options.fixedTimezone) {
      tz = TIMEZONES.find(t => t.tz === options.fixedTimezone);
      if (!tz) tz = pick(TIMEZONES); // fallback if not found
    } else {
      tz = pick(TIMEZONES);
    }

    // ── Language (fixed or randomized) ──
    let langs;
    if (options.fixedLanguage) {
      const found = LANGUAGES.find(l => l.code === options.fixedLanguage || l.tags.join(',') === options.fixedLanguage);
      if (found) {
        langs = found.tags;
      } else if (Array.isArray(options.fixedLanguage)) {
        langs = options.fixedLanguage;
      } else if (typeof options.fixedLanguage === 'string') {
        const parts = options.fixedLanguage.split(',').map(s => s.trim()).filter(Boolean);
        langs = parts.length > 0 ? parts : ['en-US', 'en'];
      } else {
        langs = pick(LANGUAGES).tags;
      }
    } else {
      langs = pick(LANGUAGES).tags;
    }

    // ── Noise seeds (unique per identity) ──
    const canvasNoiseSeed = Math.random();
    const audioNoiseSeed = Math.random();
    const fontNoiseSeed = Math.random();

    // ── Misc ──
    const colorScheme = Math.random() < 0.65 ? 'light' : 'dark';
    const doNotTrack = pick([null, null, null, '1']);
    const mediaDevices = generateMediaDevices();
    const storageQuota = rand(100, 500) * 1e9;
    const storageUsage = rand(20, 1500) * 1e6;

    // ── GPU short label ──
    const gpuShort = gpu.r.includes('Apple') ?
      gpu.r.match(/Apple (\S+ ?\S*)/)?.[1] || 'Apple GPU' :
      gpu.r.match(/(?:GeForce|Radeon|Iris|UHD|Arc).*?(?=\s*\(0x|\s*Direct|\s*,\s*Open)/)?.[0]?.trim() || 'GPU';

    const label = `${real.isEdge ? 'Edge' : 'Chrome'} ${real.chromeMajor} · ${real.osId.toUpperCase()} · ${gpuShort}`;

    // ══════════════════════════════════════════════════════
    // COMPOSE PROFILE — UA/version stays REAL, rest spoofed
    // ══════════════════════════════════════════════════════
    const p = {
      // ── Mode indicator ──
      stealthMode: true,

      // ── Navigator (version = REAL, hardware = spoofed) ──
      userAgent: real.ua,                 // KEEP REAL!
      appVersion: real.ua.replace('Mozilla/', ''),
      platform: navigator.platform,       // KEEP REAL!
      vendor: 'Google Inc.',
      oscpu: undefined,
      languages: langs,
      hardwareConcurrency: cores,         // SPOOFED
      deviceMemory: mem,                  // SPOOFED
      maxTouchPoints: navigator.maxTouchPoints || 0,  // KEEP REAL!
      doNotTrack,

      // ── Client Hints — ALL REAL (no header override) ──
      // Set to null to signal background.js: DON'T modify headers
      chUA: null,
      chUAMobile: null,
      chUAPlatform: null,
      chUAPlatformVersion: null,
      chUAArch: null,
      chUABitness: null,
      chUAFullVersionList: null,
      chUAModel: null,

      // ── Client Hints JS API — not overridden ──
      // (inject.js will skip ua spoofing when stealthMode = true)
      uaDataBrands: null,
      uaDataFullVersionList: null,
      uaDataPlatform: null,
      uaDataPlatformVersion: null,
      uaDataArchitecture: null,
      uaDataBitness: null,
      uaDataModel: null,
      uaDataMobile: null,
      uaDataWow64: null,

      // ── Screen (SPOOFED) ──
      screenWidth: scr.w,
      screenHeight: scr.h,
      availWidth: scr.w,
      availHeight: availH,
      outerWidth: scr.w,
      outerHeight: availH,
      colorDepth,
      pixelDepth: colorDepth,
      devicePixelRatio: dpr,

      // ── WebGL (SPOOFED) ──
      webglVendor: gpu.v,
      webglRenderer: gpu.r,

      // ── Timezone (SPOOFED) ──
      timezoneOffset: tz.offset,
      timezone: tz.tz,

      // ── Noise Seeds (unique per identity) ──
      canvasNoiseSeed,
      audioNoiseSeed,
      fontNoiseSeed,

      // ── Media Devices (SPOOFED) ──
      mediaDevices,

      // ── Storage (SPOOFED) ──
      storageQuota,
      storageUsage,

      // ── Misc ──
      colorScheme,

      // ── Meta & Fingerprint Hash ──
      label
    };

    // ── Deterministic 16-hex Fingerprint Identity Hash ──
    const rawSig = `${p.userAgent}|${p.screenWidth}x${p.screenHeight}|${p.webglRenderer}|${p.timezone}|${p.languages.join(',')}|${p.canvasNoiseSeed}|${p.audioNoiseSeed}|${p.fontNoiseSeed}|${p.hardwareConcurrency}|${p.deviceMemory}`;
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < rawSig.length; i++) {
      const ch = rawSig.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hash = `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
    p.fingerprintHash = hash;

    return p;
  }

  return { generate, TIMEZONES, LANGUAGES };
})();

