/* content.js — Claude Usage Monitor widget */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────
  const POLL_INTERVAL = 60_000;
  const STORAGE_KEY_COLLAPSED = 'claude_usage_collapsed';
  const STORAGE_KEY_ORG = 'claude_usage_org_id';
  const STORAGE_KEY_USAGE = 'claude_usage_data';
  const NOTIFICATION_KEY = 'claude_usage_notified_80';
  const STORAGE_KEY_WIDGET_BOTTOM = 'claude_usage_widget_bottom';
  const STORAGE_KEY_TUTORIAL_VERSION = 'claude_usage_tutorial_version';
  const PREFIX = 'claude-usage';
  const WIDGET_BOUNDARY_PX = 16;
  const TUTORIAL_TOTAL_STEPS = 4;

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

  // ── i18n setup ───────────────────────────────────────────────────
  const STORAGE_KEY_LANG = 'claude_usage_lang';

  function detectAndSetLang() {
    var lang = UsageI18n.detectLang();
    UsageI18n.setLang(lang);
    storage.set(STORAGE_KEY_LANG, lang);
  }
  detectAndSetLang();

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
    return UsageUtils.getOrgFromCookies(document.cookie);
  }

  function extractOrgFromUrl(url) {
    return UsageUtils.extractOrgFromUrl(url);
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
            message: UsageI18n.t('thresholdWarning', data.five_hour.utilization.toFixed(0))
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
    return UsageUtils.formatTimeUntil(isoStr);
  }

  function formatLastUpdated() {
    if (!lastFetchTime) return '';
    const diff = Math.floor((Date.now() - lastFetchTime) / 60_000);
    if (diff < 1) return UsageI18n.t('updatedNow');
    return UsageI18n.t('updatedAgo', diff);
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
    const nav = document.querySelector('nav[aria-label]');
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
  let widgetBottom = WIDGET_BOUNDARY_PX; // default bottom position
  let isDragging = false;
  let dragStartY = 0;
  let dragStartBottom = 0;

  function getUtilColor(pct, dark) {
    return UsageUtils.getUtilColor(pct, dark);
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
        bottom: ${widgetBottom}px;
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
        transition: opacity 0.2s, left 0.35s cubic-bezier(0.25, 0.1, 0.25, 1.0);
        pointer-events: auto;
      }
      .widget-expanded.hidden { display: none; }

      .drag-handle {
        cursor: grab;
        padding: 2px 0 6px;
        display: flex;
        justify-content: center;
        user-select: none;
      }
      .drag-handle:active { cursor: grabbing; }
      .drag-handle-dots {
        width: 32px;
        height: 4px;
        border-radius: 2px;
        background: ${borderColor};
        transition: background 0.15s;
      }
      .drag-handle:hover .drag-handle-dots {
        background: ${textSecondary};
      }

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
    html += `<div class="drag-handle" id="drag-handle"><div class="drag-handle-dots"></div></div>`;

    if (!data && !fetchError) {
      // Loading
      html += `<div class="loading-state"><span class="spinner"></span> ${UsageI18n.t('loading')}</div>`;
    } else if (fetchError && !data) {
      // Error with no data
      html += `<div class="error-msg">${getErrorMessage()}</div>`;
    } else if (data) {
      html += buildUsageRows(data, textSecondary, trackColor, dark);
    }

    // Footer
    html += `<div class="footer">
      <span class="footer-text">${formatLastUpdated()}</span>
      <button class="collapse-btn" id="btn-collapse" title="${UsageI18n.t('collapse')}">
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
      // Tutorial: step 3 (collapse widget)
      if (tutorialStep === 3) {
        setTimeout(() => nextTutorialStep(), 350);
      }
    });

    // ── Drag handling ──
    const dragHandle = shadowRoot.getElementById('drag-handle');
    dragHandle?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      dragStartY = e.clientY;
      dragStartBottom = widgetBottom;

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const deltaY = dragStartY - e.clientY; // up = positive delta = increase bottom
        let newBottom = dragStartBottom + deltaY;

        // Get widget height for boundary calculation
        const expanded = shadowRoot.getElementById('expanded');
        const widgetHeight = expanded ? expanded.offsetHeight : 200;

        // Boundary: bottom = 16px from viewport bottom, top = below chat title bar
        const minBottom = WIDGET_BOUNDARY_PX;
        const titleBar = document.querySelector('[data-testid="chat-title-button"]')?.closest('.flex.w-full.items-center.justify-between');
        const topBoundary = titleBar ? titleBar.getBoundingClientRect().bottom : WIDGET_BOUNDARY_PX;
        const maxBottom = window.innerHeight - widgetHeight - topBoundary;

        newBottom = Math.max(minBottom, Math.min(maxBottom, newBottom));
        widgetBottom = newBottom;

        // Directly update position for smooth dragging (no full re-render)
        if (expanded) {
          expanded.style.transition = 'none';
          expanded.style.bottom = `${widgetBottom}px`;
        }
      };

      const onMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          storage.set(STORAGE_KEY_WIDGET_BOTTOM, widgetBottom);
          // Tutorial: step 2 (drag widget)
          if (tutorialStep === 2) {
            setTimeout(() => nextTutorialStep(), 300);
          }
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
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
          ${UsageI18n.t('hour5')}
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
          ${UsageI18n.t('day7')}
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
      { key: 'seven_day_opus', label: UsageI18n.t('opus7d') },
      { key: 'seven_day_sonnet', label: UsageI18n.t('sonnet7d') },
      { key: 'seven_day_cowork', label: UsageI18n.t('cowork7d') }
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
          ${UsageI18n.t('extraUsage')}
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
    const textColor = dark ? '#ECECEC' : '#1F1E1D';
    return UsageUtils.buildDonutIcon(pct, color, trackColor, textColor);
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
      btn.title = UsageI18n.t('usageMonitor');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isForceCollapsed) return;
        isCollapsed = !isCollapsed;
        storage.set(STORAGE_KEY_COLLAPSED, isCollapsed);
        renderWidget();
        // Tutorial: step 1 (open widget) or step 4 (toggle again)
        if (tutorialStep === 1 && !isCollapsed) {
          setTimeout(() => nextTutorialStep(), 350);
        } else if (tutorialStep === 4 && !isCollapsed) {
          setTimeout(() => nextTutorialStep(), 350);
        }
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
        return UsageI18n.t('loginRequired');
      case 'org_not_found':
        return UsageI18n.t('orgNotFound');
      case 'network':
        return lastUsageData
          ? `${UsageI18n.t('unavailable')}. ${formatLastUpdated()}`
          : UsageI18n.t('unavailable');
      default:
        return UsageI18n.t('loading');
    }
  }

  // ── Theme observer ────────────────────────────────────────────────
  function observeTheme() {
    const observer = new MutationObserver(() => {
      detectAndSetLang();
      scheduleRender();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'lang']
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
  let lastSidebarWidth = -1;

  // Detect sidebar width change and smoothly update widget position via CSS transition
  function onSidebarChange() {
    const sidebarWidth = getSidebarInfo().width;
    if (sidebarWidth === lastSidebarWidth) return;
    lastSidebarWidth = sidebarWidth;

    const expanded = shadowRoot?.getElementById('expanded');
    if (expanded) {
      expanded.style.left = `${sidebarWidth + 8}px`;
    }

    // Also schedule a full render to sync other state (auto-collapse, etc.)
    scheduleRender();
  }

  function observeSidebar() {
    if (sidebarObserversAttached) return;
    const { element } = getSidebarInfo();
    if (element) {
      sidebarObserversAttached = true;

      // Observe the nav and its ancestors for resize/style changes
      const resizeObs = new ResizeObserver(() => onSidebarChange());
      resizeObs.observe(element);

      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        resizeObs.observe(parent);
        parent = parent.parentElement;
      }

      // Catch attribute changes (class toggles for open/close)
      new MutationObserver(() => onSidebarChange())
        .observe(element, { attributes: true, attributeFilter: ['style', 'class'] });

      // Listen for transition end on sidebar to ensure final position is correct
      element.addEventListener('transitionend', () => onSidebarChange());
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

  // ── Tutorial ────────────────────────────────────────────────────────
  let tutorialHost = null;
  let tutorialShadow = null;
  let tutorialStep = 0; // 0 = not showing

  function getExtensionVersion() {
    try { return chrome.runtime.getManifest().version; } catch (_) { return '0'; }
  }

  async function shouldShowTutorial() {
    const shown = await storage.get(STORAGE_KEY_TUTORIAL_VERSION);
    return shown !== getExtensionVersion();
  }

  function finishTutorial() {
    storage.set(STORAGE_KEY_TUTORIAL_VERSION, getExtensionVersion());
    tutorialStep = 0;
    if (tutorialHost) {
      tutorialHost.remove();
      tutorialHost = null;
      tutorialShadow = null;
    }
  }

  function startTutorial() {
    tutorialStep = 1;
    // Ensure widget starts collapsed so user can open it in step 1
    isCollapsed = true;
    storage.set(STORAGE_KEY_COLLAPSED, true);
    renderWidget();
    renderTutorial();
  }

  function nextTutorialStep() {
    tutorialStep++;
    if (tutorialStep > TUTORIAL_TOTAL_STEPS) {
      finishTutorial();
      showConfetti();
      return;
    }
    renderTutorial();
  }

  function getTutorialTargetRect(step) {
    if (step === 1 || step === 4) {
      const btn = document.getElementById(SIDEBAR_TOGGLE_ID);
      return btn ? btn.getBoundingClientRect() : null;
    }
    if (step === 2) {
      const handle = shadowRoot?.getElementById('drag-handle');
      return handle ? handle.getBoundingClientRect() : null;
    }
    if (step === 3) {
      const btn = shadowRoot?.getElementById('btn-collapse');
      return btn ? btn.getBoundingClientRect() : null;
    }
    return null;
  }

  function renderTutorial() {
    if (tutorialStep === 0) return;

    const dark = isDarkMode();
    const targetRect = getTutorialTargetRect(tutorialStep);
    if (!targetRect) {
      setTimeout(() => renderTutorial(), 300);
      return;
    }

    // Create host if needed
    if (!tutorialHost) {
      tutorialHost = document.createElement('div');
      tutorialHost.id = `${PREFIX}-tutorial-host`;
      // pointer-events: none so clicks pass through to real elements
      tutorialHost.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none;';
      tutorialShadow = tutorialHost.attachShadow({ mode: 'closed' });
      document.body.appendChild(tutorialHost);
    }

    const bgColor = dark ? '#2B2B2B' : '#FFFFFF';
    const borderColor = dark ? '#444444' : '#E8E5DE';
    const textPrimary = dark ? '#ECECEC' : '#1F1E1D';
    const textSecondary = dark ? '#999999' : '#6F6F78';
    const accent = dark ? '#D4835E' : '#C15F3C';
    const overlayColor = dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)';

    // Spotlight rect with padding
    const pad = 6;
    const sx = targetRect.left - pad;
    const sy = targetRect.top - pad;
    const sw = targetRect.width + pad * 2;
    const sh = targetRect.height + pad * 2;
    const sr = 10;

    // Tooltip positioning — clamped to viewport
    let tooltipStyle = '';
    let arrowStyle = '';
    let arrowDir = '';
    const tooltipH = tutorialStep === 2 ? 280 : 170;
    const viewH = window.innerHeight;
    const viewPad = 12;

    if (tutorialStep === 1 || tutorialStep === 2 || tutorialStep === 4) {
      const left = targetRect.right + 16;
      const idealTop = targetRect.top + targetRect.height / 2 - tooltipH / 2;
      const clampedTop = Math.max(viewPad, Math.min(viewH - tooltipH - viewPad, idealTop));
      const arrowTop = targetRect.top + targetRect.height / 2 - clampedTop;
      tooltipStyle = `left: ${left}px; top: ${clampedTop}px;`;
      arrowDir = 'left';
      arrowStyle = `left: -6px; top: ${arrowTop}px; transform: translateY(-50%) rotate(45deg);`;
    } else if (tutorialStep === 3) {
      const left = targetRect.left + targetRect.width / 2;
      const top = targetRect.top - 16;
      tooltipStyle = `left: ${left}px; top: ${top}px; transform: translate(-50%, -100%);`;
      arrowDir = 'bottom';
      arrowStyle = `bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg);`;
    }

    // Drag animation SVG for step 2
    const dragAnimationSvg = tutorialStep === 2 ? `
      <div class="drag-anim">
        <svg width="40" height="64" viewBox="0 0 40 64" fill="none">
          <g class="drag-hand">
            <circle cx="20" cy="18" r="8" fill="${accent}" opacity="0.2"/>
            <path d="M20 12 C20 12, 14 16, 14 22 C14 25, 16 26, 18 25 L18 18 C18 16, 22 16, 22 18 L22 25 C24 26, 26 25, 26 22 C26 16, 20 12, 20 12Z" fill="${accent}" opacity="0.7"/>
            <circle cx="20" cy="18" r="3" fill="${bgColor}" opacity="0.9"/>
          </g>
          <line x1="20" y1="4" x2="20" y2="10" stroke="${textSecondary}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
          <polyline points="16,6 20,2 24,6" fill="none" stroke="${textSecondary}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="20" y1="54" x2="20" y2="60" stroke="${textSecondary}" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
          <polyline points="16,58 20,62 24,58" fill="none" stroke="${textSecondary}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>` : '';

    const stepTitle = UsageI18n.t(`tutorialStep${tutorialStep}Title`);
    const stepDesc = UsageI18n.t(`tutorialStep${tutorialStep}Desc`);
    const stepLabel = UsageI18n.t('tutorialStep', tutorialStep, TUTORIAL_TOTAL_STEPS);
    const skipLabel = UsageI18n.t('tutorialSkip');

    const html = `
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      :host { all: initial; }

      .tutorial-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100vw; height: 100vh;
        z-index: 2147483647;
        pointer-events: none;
        animation: fadeIn 0.25s ease;
      }

      .tutorial-overlay svg.overlay-mask {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none;
      }

      .tooltip {
        position: fixed;
        ${tooltipStyle}
        width: 260px;
        background: ${bgColor};
        border: 1px solid ${borderColor};
        border-radius: 12px;
        padding: 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        box-shadow: ${dark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.12)'};
        z-index: 2147483647;
        pointer-events: auto;
        animation: tooltipIn 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.0);
      }

      .tooltip-arrow {
        position: absolute;
        ${arrowStyle}
        width: 12px; height: 12px;
        background: ${bgColor};
        border: 1px solid ${borderColor};
        ${arrowDir === 'left' ? 'border-right: none; border-top: none;' : ''}
        ${arrowDir === 'bottom' ? 'border-left: none; border-top: none;' : ''}
      }

      .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .step-label {
        font-size: 11px;
        font-weight: 600;
        color: ${accent};
        letter-spacing: 0.3px;
      }

      .skip-btn {
        font-size: 11px;
        color: ${textSecondary};
        background: none;
        border: none;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: inherit;
        transition: color 0.15s;
      }
      .skip-btn:hover { color: ${textPrimary}; }

      .tooltip-title {
        font-size: 14px;
        font-weight: 700;
        color: ${textPrimary};
        margin-bottom: 6px;
        line-height: 1.3;
      }

      .tooltip-desc {
        font-size: 12px;
        color: ${textSecondary};
        line-height: 1.5;
      }

      .drag-anim {
        display: flex;
        justify-content: center;
        margin: 4px 0 8px;
      }
      .drag-hand {
        animation: dragUpDown 2s ease-in-out infinite;
      }
      @keyframes dragUpDown {
        0%, 100% { transform: translateY(0); }
        30% { transform: translateY(-12px); }
        70% { transform: translateY(12px); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes tooltipIn {
        from { opacity: 0; transform: ${tooltipStyle.includes('translate(-50%, -100%)') ? 'translate(-50%, -100%) scale(0.95)' : 'scale(0.95)'}; }
        to { opacity: 1; transform: ${tooltipStyle.includes('translate(-50%, -100%)') ? 'translate(-50%, -100%) scale(1)' : 'scale(1)'}; }
      }

      .spotlight-ring {
        animation: pulseRing 2s ease-in-out infinite;
      }
      @keyframes pulseRing {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
    </style>

    <div class="tutorial-overlay" id="tutorial-overlay">
      <svg class="overlay-mask" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white"/>
            <rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="${sr}" fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="${overlayColor}" mask="url(#spotlight-mask)"/>
        <rect class="spotlight-ring" x="${sx - 2}" y="${sy - 2}" width="${sw + 4}" height="${sh + 4}" rx="${sr + 2}"
          fill="none" stroke="${accent}" stroke-width="2"/>
      </svg>

      <div class="tooltip">
        <div class="tooltip-arrow"></div>
        <div class="tooltip-header">
          <span class="step-label">${stepLabel}</span>
          <button class="skip-btn" id="tutorial-skip">${skipLabel}</button>
        </div>
        <div class="tooltip-title">${stepTitle}</div>
        ${dragAnimationSvg}
        <div class="tooltip-desc">${stepDesc}</div>
      </div>
    </div>`;

    tutorialShadow.innerHTML = html;

    // Only Skip button — no Next. Steps advance by real interaction.
    tutorialShadow.getElementById('tutorial-skip')?.addEventListener('click', () => finishTutorial());
  }

  // ── Confetti ─────────────────────────────────────────────────────
  function showConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const colors = ['#D4835E', '#C15F3C', '#E09570', '#5B9BD5', '#7BC67E', '#F0C05A', '#E86B6B', '#B57EDC'];
    const pieces = [];
    for (let i = 0; i < 80; i++) {
      pieces.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.45,
        vx: (Math.random() - 0.5) * 16,
        vy: -Math.random() * 14 - 4,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.3,
        opacity: 1
      });
    }

    let frame = 0;
    const maxFrames = 120;

    function animate() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.x += p.vx;
        p.vy += 0.3; // gravity
        p.y += p.vy;
        p.vx *= 0.98;
        p.rot += p.rotV;
        if (frame > maxFrames - 30) {
          p.opacity = Math.max(0, p.opacity - 0.035);
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (frame < maxFrames) {
        requestAnimationFrame(animate);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(animate);
  }

  // ── Init ──────────────────────────────────────────────────────────
  async function init() {
    // Restore collapsed state
    const collapsed = await storage.get(STORAGE_KEY_COLLAPSED);
    isCollapsed = collapsed === true;

    // Restore widget vertical position
    const savedBottom = await storage.get(STORAGE_KEY_WIDGET_BOTTOM);
    if (savedBottom != null) {
      widgetBottom = savedBottom;
    }

    buildWidget();
    observeTheme();
    observeSidebar();
    startCountdown();
    startPolling();

    // Observe body for SPA navigation
    navObserver.observe(document.body, { childList: true, subtree: false });

    // Check if tutorial should be shown (after a delay to ensure sidebar toggle exists)
    if (await shouldShowTutorial()) {
      setTimeout(() => {
        if (document.getElementById(SIDEBAR_TOGGLE_ID)) {
          startTutorial();
        } else {
          // Wait for sidebar toggle to appear
          const waitForToggle = setInterval(() => {
            if (document.getElementById(SIDEBAR_TOGGLE_ID)) {
              clearInterval(waitForToggle);
              startTutorial();
            }
          }, 500);
          // Give up after 10s
          setTimeout(() => clearInterval(waitForToggle), 10000);
        }
      }, 1500);
    }
  }

  // Wait for body to be ready
  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
