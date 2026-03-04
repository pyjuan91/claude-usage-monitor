/* content.js — Claude Usage Monitor widget */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────
  const POLL_INTERVAL = 60_000;
  const STORAGE_KEY_COLLAPSED = 'claude_usage_collapsed';
  const STORAGE_KEY_ORG = 'claude_usage_org_id';
  const STORAGE_KEY_USAGE = 'claude_usage_data';
  const NOTIFICATION_KEY = 'claude_usage_notified_80';
  const PREFIX = 'claude-usage';

  // ── Storage helper (works with both chrome and browser APIs) ──────
  const storage = {
    async get(key) {
      return new Promise((resolve) => {
        chrome.storage.local.get(key, (r) => resolve(r[key] ?? null));
      });
    },
    async set(key, value) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
      });
    },
    async remove(key) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(key, resolve);
      });
    }
  };

  // ── Org ID extraction ─────────────────────────────────────────────
  async function extractOrgId() {
    // 1. Check cached
    const cached = await storage.get(STORAGE_KEY_ORG);
    if (cached) return cached;

    let orgId = null;

    // 2. From cookies (lastActiveOrg)
    orgId = getOrgFromCookies();
    if (orgId) {
      await storage.set(STORAGE_KEY_ORG, orgId);
      return orgId;
    }

    // 3. From organizations API
    try {
      const res = await fetch('https://claude.ai/api/organizations', {
        credentials: 'include'
      });
      if (res.ok) {
        const orgs = await res.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          orgId = orgs[0].uuid || orgs[0].id;
          if (orgId) {
            await storage.set(STORAGE_KEY_ORG, orgId);
            return orgId;
          }
        }
      }
    } catch (_) { /* continue */ }

    // 4. From __NEXT_DATA__
    try {
      const nd = document.getElementById('__NEXT_DATA__');
      if (nd) {
        const data = JSON.parse(nd.textContent);
        const props = data?.props?.pageProps;
        orgId = props?.organizationId || props?.orgId;
        if (orgId) {
          await storage.set(STORAGE_KEY_ORG, orgId);
          return orgId;
        }
      }
    } catch (_) { /* continue */ }

    // 5. From URL pattern interception
    orgId = extractOrgFromUrl(window.location.href);
    if (orgId) {
      await storage.set(STORAGE_KEY_ORG, orgId);
      return orgId;
    }

    return null;
  }

  function getOrgFromCookies() {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [name, ...rest] = c.trim().split('=');
      if (name === 'lastActiveOrg') {
        const val = decodeURIComponent(rest.join('='));
        // Could be a UUID directly or JSON
        const uuidMatch = val.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
        );
        return uuidMatch ? uuidMatch[0] : null;
      }
    }
    return null;
  }

  function extractOrgFromUrl(url) {
    const m = url.match(/\/api\/organizations\/([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  }

  // Intercept fetch to grab org ID from any API call
  const _origFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url) {
      const orgId = extractOrgFromUrl(url);
      if (orgId) {
        storage.set(STORAGE_KEY_ORG, orgId);
      }
    }
    return _origFetch.apply(this, args);
  };

  // ── Usage fetching ────────────────────────────────────────────────
  let lastUsageData = null;
  let lastFetchTime = null;
  let fetchError = null;

  async function fetchUsage() {
    const orgId = await extractOrgId();
    if (!orgId) {
      fetchError = 'org_not_found';
      return null;
    }

    try {
      const res = await fetch(
        `https://claude.ai/api/organizations/${orgId}/usage`,
        { credentials: 'include' }
      );

      if (res.status === 401 || res.status === 403) {
        // Could be expired org or session
        await storage.remove(STORAGE_KEY_ORG);
        fetchError = 'auth';
        return null;
      }
      if (res.status === 404) {
        await storage.remove(STORAGE_KEY_ORG);
        fetchError = 'org_not_found';
        return null;
      }
      if (!res.ok) {
        fetchError = 'network';
        return null;
      }

      const data = await res.json();
      lastUsageData = data;
      lastFetchTime = Date.now();
      fetchError = null;

      // Cache in storage for popup
      chrome.runtime.sendMessage({
        type: 'CACHE_USAGE',
        data: data
      }).catch(() => {});

      // Threshold notification
      checkThreshold(data);

      return data;
    } catch (e) {
      fetchError = 'network';
      return null;
    }
  }

  function checkThreshold(data) {
    if (data?.five_hour?.utilization >= 80) {
      storage.get(NOTIFICATION_KEY).then((notified) => {
        if (!notified) {
          storage.set(NOTIFICATION_KEY, true);
          chrome.runtime.sendMessage({
            type: 'USAGE_THRESHOLD',
            message: `5-hour usage at ${data.five_hour.utilization.toFixed(0)}%. Consider slowing down.`
          }).catch(() => {});
        }
      });
    } else {
      // Reset notification flag when below threshold
      storage.set(NOTIFICATION_KEY, false);
    }
  }

  // ── Time formatting ───────────────────────────────────────────────
  function formatTimeUntil(isoStr) {
    if (!isoStr) return '';
    const resetTime = new Date(isoStr).getTime();
    const now = Date.now();
    const diff = resetTime - now;
    if (diff <= 0) return 'Resetting soon';

    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);

    if (hours >= 24) {
      const date = new Date(isoStr);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `Resets ${day} ${time}`;
    }
    if (hours > 0) return `Resets in ${hours}h ${mins}m`;
    return `Resets in ${mins}m`;
  }

  function formatLastUpdated() {
    if (!lastFetchTime) return '';
    const diff = Math.floor((Date.now() - lastFetchTime) / 60_000);
    if (diff < 1) return 'Updated just now';
    return `Updated ${diff}m ago`;
  }

  // ── Theme detection ───────────────────────────────────────────────
  function isDarkMode() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) return true;
    if (html.getAttribute('data-theme') === 'dark') return true;
    if (document.body?.classList.contains('dark')) return true;
    if (document.body?.getAttribute('data-theme') === 'dark') return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ── Sidebar detection ───────────────────────────────────────────
  function getSidebarInfo() {
    const nav = document.querySelector('nav[aria-label="Sidebar"]');
    if (!nav) return { element: null, width: 0, isOpen: false };
    const rect = nav.getBoundingClientRect();
    const isOpen = rect.right > 0 && rect.width > 0;
    return { element: nav, width: isOpen ? rect.right : 0, isOpen };
  }

  // ── Widget ────────────────────────────────────────────────────────
  let widgetHost = null;
  let shadowRoot = null;
  let isCollapsed = false;
  let isForceCollapsed = false;
  let countdownInterval = null;

  function getUtilColor(pct, dark) {
    if (pct > 80) return dark ? '#E5524A' : '#D03E3E';
    if (pct > 50) return dark ? '#E0A020' : '#D4940A';
    return dark ? '#D4835E' : '#C15F3C';
  }

  function buildWidget() {
    if (widgetHost) widgetHost.remove();

    widgetHost = document.createElement('div');
    widgetHost.id = `${PREFIX}-host`;
    widgetHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 0; height: 0; z-index: 2147483647; pointer-events: none;';
    shadowRoot = widgetHost.attachShadow({ mode: 'closed' });
    document.body.appendChild(widgetHost);

    renderWidget();
  }

  let renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderWidget();
    });
  }

  function renderWidget() {
    if (!shadowRoot) return;
    const dark = isDarkMode();
    const data = lastUsageData;

    const sidebarWidth = getSidebarInfo().width;
    const leftPos = sidebarWidth + 8;
    const availableWidth = window.innerWidth - sidebarWidth;

    // Auto-collapse on narrow viewport
    if (availableWidth < 600) {
      isForceCollapsed = true;
    } else {
      isForceCollapsed = false;
    }

    const effectiveCollapsed = isCollapsed || isForceCollapsed;

    const bgColor = dark ? '#333333' : '#FFFFFF';
    const borderColor = dark ? '#444444' : '#E8E5DE';
    const textPrimary = dark ? '#ECECEC' : '#1F1E1D';
    const textSecondary = dark ? '#999999' : '#6F6F78';
    const trackColor = dark ? '#444444' : '#E8E5DE';
    const accent = dark ? '#D4835E' : '#C15F3C';

    let html = '';

    // ── Shared styles ──
    html += `<style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :host { all: initial; }

      .widget-expanded {
        position: fixed;
        bottom: 16px;
        left: ${leftPos}px;
        z-index: 2147483647;
        background: ${bgColor};
        border: 1px solid ${borderColor};
        border-radius: 12px;
        padding: 14px 16px 10px;
        width: 280px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        font-size: 12px;
        color: ${textPrimary};
        box-shadow: ${dark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)'};
        line-height: 1.4;
        transition: opacity 0.2s, left 0.2s ease;
        pointer-events: auto;
      }
      .widget-expanded.hidden { display: none; }

      .row { margin-bottom: 10px; }
      .row:last-of-type { margin-bottom: 6px; }

      .row-label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        font-weight: 600;
        font-size: 11px;
        color: ${textSecondary};
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .row-label svg { flex-shrink: 0; }

      .bar-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .bar-track {
        flex: 1;
        height: 6px;
        background: ${trackColor};
        border-radius: 3px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .bar-pct {
        font-size: 12px;
        font-weight: 600;
        min-width: 32px;
        text-align: right;
        color: ${textPrimary};
      }

      .reset-text {
        font-size: 11px;
        color: ${textSecondary};
        margin-top: 2px;
      }

      .extra-text {
        font-size: 12px;
        color: ${textPrimary};
        font-weight: 500;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 4px;
        padding-top: 6px;
        border-top: 1px solid ${borderColor};
      }
      .footer-text {
        font-size: 10px;
        color: ${textSecondary};
      }

      .collapse-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: ${textSecondary};
        padding: 2px;
        border-radius: 4px;
        display: flex;
        align-items: center;
      }
      .collapse-btn:hover { color: ${accent}; }

      .error-msg {
        font-size: 12px;
        color: ${dark ? '#E5524A' : '#D03E3E'};
        text-align: center;
        padding: 8px 0;
      }

      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid ${trackColor};
        border-top-color: ${accent};
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 0;
        color: ${textSecondary};
        font-size: 12px;
      }
    </style>`;

    // ── Expanded widget ──
    html += `<div class="widget-expanded${effectiveCollapsed ? ' hidden' : ''}" id="expanded">`;

    if (!data && !fetchError) {
      // Loading
      html += `<div class="loading-state"><span class="spinner"></span> Loading usage data...</div>`;
    } else if (fetchError && !data) {
      // Error with no data
      html += `<div class="error-msg">${getErrorMessage()}</div>`;
    } else if (data) {
      html += buildUsageRows(data, textSecondary, trackColor, dark);
    }

    // Footer
    html += `<div class="footer">
      <span class="footer-text">${formatLastUpdated()}</span>
      <button class="collapse-btn" id="btn-collapse" title="Collapse">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7L9 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>`;
    html += `</div>`;

    shadowRoot.innerHTML = html;

    // ── Event listeners ──
    const btnCollapse = shadowRoot.getElementById('btn-collapse');

    btnCollapse?.addEventListener('click', () => {
      isCollapsed = true;
      storage.set(STORAGE_KEY_COLLAPSED, true);
      renderWidget();
      renderSidebarToggle();
    });

    // Update sidebar toggle icon state
    renderSidebarToggle();
  }

  function buildUsageRows(data, textSecondary, trackColor, dark) {
    let html = '';

    // 5-hour
    if (data.five_hour) {
      const pct = data.five_hour.utilization ?? 0;
      const color = getUtilColor(pct, dark);
      html += `<div class="row">
        <div class="row-label">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="${textSecondary}"><path d="M8 1a7 7 0 110 14A7 7 0 018 1zm0 1.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM8 3.75a.75.75 0 01.75.75v3.19l2.03 2.03a.75.75 0 01-1.06 1.06l-2.22-2.22a.75.75 0 01-.25-.56V4.5A.75.75 0 018 3.75z"/></svg>
          5-hour
        </div>
        <div class="bar-container">
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="bar-pct">${Math.round(pct)}%</span>
        </div>
        <div class="reset-text">${formatTimeUntil(data.five_hour.resets_at)}</div>
      </div>`;
    }

    // 7-day
    if (data.seven_day) {
      const pct = data.seven_day.utilization ?? 0;
      const color = getUtilColor(pct, dark);
      html += `<div class="row">
        <div class="row-label">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="${textSecondary}"><path d="M2.5 2A1.5 1.5 0 001 3.5v10A1.5 1.5 0 002.5 15h11a1.5 1.5 0 001.5-1.5v-10A1.5 1.5 0 0013.5 2h-1V.75a.75.75 0 00-1.5 0V2h-6V.75a.75.75 0 00-1.5 0V2h-1zM2.5 6h11v7.5h-11V6z"/></svg>
          7-day
        </div>
        <div class="bar-container">
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="bar-pct">${Math.round(pct)}%</span>
        </div>
        <div class="reset-text">${formatTimeUntil(data.seven_day.resets_at)}</div>
      </div>`;
    }

    // Opus / Sonnet / Cowork breakdowns
    const breakdowns = [
      { key: 'seven_day_opus', label: 'Opus 7d' },
      { key: 'seven_day_sonnet', label: 'Sonnet 7d' },
      { key: 'seven_day_cowork', label: 'Cowork 7d' }
    ];
    for (const bd of breakdowns) {
      if (data[bd.key] && data[bd.key].utilization != null) {
        const pct = data[bd.key].utilization;
        const color = getUtilColor(pct, dark);
        html += `<div class="row">
          <div class="row-label">${bd.label}</div>
          <div class="bar-container">
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
            <span class="bar-pct">${Math.round(pct)}%</span>
          </div>
          <div class="reset-text">${formatTimeUntil(data[bd.key].resets_at)}</div>
        </div>`;
      }
    }

    // Extra usage
    if (data.extra_usage?.is_enabled) {
      const used = (data.extra_usage.used_credits ?? 0).toFixed(2);
      const limit = (data.extra_usage.monthly_limit ?? 0).toFixed(2);
      html += `<div class="row">
        <div class="row-label">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="${textSecondary}"><path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM8 0a8 8 0 100 16A8 8 0 008 0zm.5 4.75a.75.75 0 00-1.5 0v3a.75.75 0 00.22.53l2 2a.75.75 0 101.06-1.06L8.5 7.44V4.75z"/></svg>
          Extra usage
        </div>
        <div class="extra-text">$${used} / $${limit}</div>
      </div>`;
    }

    return html;
  }

  function buildDonutIcon(data, accent, trackColor) {
    const pct = data?.five_hour?.utilization ?? 0;
    const dark = isDarkMode();
    const color = getUtilColor(pct, dark);
    // SVG donut ring
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return `<svg width="28" height="28" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="3"/>
      <circle cx="16" cy="16" r="${radius}" fill="none" stroke="${color}" stroke-width="3"
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 16 16)"/>
      <text x="16" y="17" text-anchor="middle" dominant-baseline="middle"
        font-size="8" font-weight="600" fill="${isDarkMode() ? '#ECECEC' : '#1F1E1D'}"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${Math.round(pct)}</text>
    </svg>`;
  }

  // ── Sidebar toggle button (injected into Claude's nav) ──────────
  const SIDEBAR_TOGGLE_ID = `${PREFIX}-sidebar-toggle`;

  function renderSidebarToggle() {
    const { element: nav } = getSidebarInfo();
    if (!nav) return;

    const dark = isDarkMode();
    const data = lastUsageData;
    const pct = data?.five_hour?.utilization ?? 0;
    const color = getUtilColor(pct, dark);
    const textColor = dark ? '#ECECEC' : '#1F1E1D';
    const hoverBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    const trackColor = dark ? '#444444' : '#E8E5DE';

    const effectiveCollapsed = isCollapsed || isForceCollapsed;

    // Donut SVG for the button
    const radius = 8;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (pct / 100) * circumference;
    const donutSvg = `<svg width="20" height="20" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="${radius}" fill="none" stroke="${trackColor}" stroke-width="2.5"/>
      <circle cx="12" cy="12" r="${radius}" fill="none" stroke="${color}" stroke-width="2.5"
        stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
        stroke-linecap="round" transform="rotate(-90 12 12)"/>
      <text x="12" y="12.5" text-anchor="middle" dominant-baseline="middle"
        font-size="7" font-weight="700" fill="${textColor}"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${Math.round(pct)}</text>
    </svg>`;

    let btn = document.getElementById(SIDEBAR_TOGGLE_ID);
    if (!btn) {
      btn = document.createElement('button');
      btn.id = SIDEBAR_TOGGLE_ID;
      btn.title = 'Usage Monitor';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isForceCollapsed) return;
        isCollapsed = !isCollapsed;
        storage.set(STORAGE_KEY_COLLAPSED, isCollapsed);
        renderWidget();
      });

      // Find the bottom area of the sidebar (above account avatar)
      // Claude's sidebar has a bottom section with the user avatar button
      const bottomSection = nav.querySelector('[class*="bottom"]')
        || nav.querySelector(':scope > div:last-child');
      if (bottomSection) {
        bottomSection.insertBefore(btn, bottomSection.firstChild);
      } else {
        nav.appendChild(btn);
      }
    }

    // Update button styles and content each render
    btn.innerHTML = donutSvg;
    btn.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 40px;
      padding: 8px;
      margin: 0;
      border: none;
      background: ${effectiveCollapsed ? 'transparent' : hoverBg};
      cursor: pointer;
      border-radius: 8px;
      transition: background 0.15s;
      opacity: ${isForceCollapsed ? '0.5' : '1'};
    `;

    // Store current hoverBg on the element for hover handlers
    btn._hoverBg = hoverBg;
    if (!btn._hoverAttached) {
      btn._hoverAttached = true;
      btn.addEventListener('mouseenter', () => {
        btn.style.background = btn._hoverBg;
      });
      btn.addEventListener('mouseleave', () => {
        const eff = isCollapsed || isForceCollapsed;
        btn.style.background = eff ? 'transparent' : btn._hoverBg;
      });
    }
  }

  function getErrorMessage() {
    switch (fetchError) {
      case 'auth':
        return 'Please log in to claude.ai';
      case 'org_not_found':
        return 'Unable to detect organization. Please refresh the page.';
      case 'network':
        return lastUsageData
          ? `Usage data unavailable. ${formatLastUpdated()}`
          : 'Usage data unavailable';
      default:
        return 'Loading...';
    }
  }

  // ── Theme observer ────────────────────────────────────────────────
  function observeTheme() {
    const observer = new MutationObserver(() => scheduleRender());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      });
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      scheduleRender();
    });
  }

  // ── Countdown timer (updates reset text every minute) ─────────────
  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      if (lastUsageData) scheduleRender();
    }, 30_000); // Update every 30s for smoother countdown
  }

  // ── Polling ───────────────────────────────────────────────────────
  let pollTimer = null;

  function startPolling() {
    stopPolling();
    poll();
    pollTimer = setInterval(poll, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function poll() {
    await fetchUsage();
    scheduleRender();
  }

  // Visibility-based polling
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      startPolling();
    } else {
      stopPolling();
    }
  });

  // Handle SPA navigation — re-check widget and sidebar toggle presence
  const navObserver = new MutationObserver(() => {
    if (!document.getElementById(`${PREFIX}-host`)) {
      buildWidget();
    }
    // Re-inject sidebar toggle if it was removed (e.g. sidebar re-mounted)
    if (!document.getElementById(SIDEBAR_TOGGLE_ID)) {
      renderSidebarToggle();
    }
  });

  // ── Sidebar observers ────────────────────────────────────────────
  let sidebarObserversAttached = false;

  function observeSidebar() {
    if (sidebarObserversAttached) return;
    const { element } = getSidebarInfo();
    if (element) {
      sidebarObserversAttached = true;
      new ResizeObserver(() => scheduleRender()).observe(element);
      new MutationObserver(() => scheduleRender())
        .observe(element, { attributes: true, attributeFilter: ['style', 'class'] });
    } else {
      setTimeout(observeSidebar, 1000);
    }
  }

  // Debounced resize handler
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => scheduleRender(), 100);
  });

  // ── Init ──────────────────────────────────────────────────────────
  async function init() {
    // Restore collapsed state
    const collapsed = await storage.get(STORAGE_KEY_COLLAPSED);
    isCollapsed = collapsed === true;

    buildWidget();
    observeTheme();
    observeSidebar();
    startCountdown();
    startPolling();

    // Observe body for SPA navigation
    navObserver.observe(document.body, { childList: true, subtree: false });
  }

  // Wait for body to be ready
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
