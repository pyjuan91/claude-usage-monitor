/* popup.js — Fallback popup for viewing usage data */

const STORAGE_KEY_USAGE = 'claude_usage_data';
const STORAGE_KEY_LANG = 'claude_usage_lang';

// Detect language from stored preference or browser default
chrome.storage.local.get(STORAGE_KEY_LANG, (result) => {
  const lang = result[STORAGE_KEY_LANG] || UsageI18n.detectLang(navigator.language);
  UsageI18n.setLang(lang);
  document.getElementById('title-text').textContent = UsageI18n.t('claudeUsage');
});

function getUtilColor(pct) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return UsageUtils.getUtilColor(pct, dark);
}

function formatTimeUntil(isoStr) {
  return UsageUtils.formatTimeUntil(isoStr);
}

function buildBar(label, pct, resetAt) {
  const color = getUtilColor(pct);
  return `<div class="row">
    <div class="row-label">${label}</div>
    <div class="bar-container">
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="bar-pct">${Math.round(pct)}%</span>
    </div>
    <div class="reset-text">${formatTimeUntil(resetAt)}</div>
  </div>`;
}

function render(cached) {
  const el = document.getElementById('content');
  const footer = document.getElementById('footer');

  if (!cached || !cached.data) {
    el.innerHTML = '<div class="error-msg">' + UsageI18n.t('noData') + '</div>';
    return;
  }

  const data = cached.data;
  let html = '';

  if (data.five_hour) {
    html += buildBar(UsageI18n.t('hour5'), data.five_hour.utilization ?? 0, data.five_hour.resets_at);
  }
  if (data.seven_day) {
    html += buildBar(UsageI18n.t('day7'), data.seven_day.utilization ?? 0, data.seven_day.resets_at);
  }

  const breakdowns = [
    { key: 'seven_day_opus', label: UsageI18n.t('opus7d') },
    { key: 'seven_day_sonnet', label: UsageI18n.t('sonnet7d') },
    { key: 'seven_day_cowork', label: UsageI18n.t('cowork7d') }
  ];
  for (const bd of breakdowns) {
    if (data[bd.key]?.utilization != null) {
      html += buildBar(bd.label, data[bd.key].utilization, data[bd.key].resets_at);
    }
  }

  if (data.extra_usage?.is_enabled) {
    const used = (data.extra_usage.used_credits ?? 0).toFixed(2);
    const limit = (data.extra_usage.monthly_limit ?? 0).toFixed(2);
    html += `<div class="row">
      <div class="row-label">${UsageI18n.t('extraUsage')}</div>
      <div class="extra-text">$${used} / $${limit}</div>
    </div>`;
  }

  el.innerHTML = html;

  if (cached.timestamp) {
    const mins = Math.floor((Date.now() - cached.timestamp) / 60_000);
    footer.textContent = mins < 1 ? UsageI18n.t('updatedNow') : UsageI18n.t('updatedAgo', mins);
  }
}

// Load cached data from storage
chrome.storage.local.get(STORAGE_KEY_USAGE, (result) => {
  render(result[STORAGE_KEY_USAGE] || null);
});
