import { describe, it, expect, vi, beforeEach } from 'vitest';
const utils = require('../src/utils.js');

describe('popup utility functions (via utils)', () => {
  describe('getUtilColor used in popup', () => {
    it('returns correct color for dark mode high usage', () => {
      expect(utils.getUtilColor(90, true)).toBe('#E5524A');
    });

    it('returns correct color for light mode low usage', () => {
      expect(utils.getUtilColor(20, false)).toBe('#A8896C');
    });
  });
});

describe('buildBar HTML output', () => {
  // Simulate buildBar from popup.js
  function buildBar(label, pct, resetAt) {
    const dark = false;
    const color = utils.getUtilColor(pct, dark);
    return `<div class="row">
    <div class="row-label">${label}</div>
    <div class="bar-container">
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="bar-pct">${Math.round(pct)}%</span>
    </div>
    <div class="reset-text">${utils.formatTimeUntil(resetAt)}</div>
  </div>`;
  }

  it('generates correct HTML structure', () => {
    const now = Date.now();
    const resetAt = new Date(now + 2 * 3_600_000).toISOString();
    const html = buildBar('5-hour', 65, resetAt);
    expect(html).toContain('class="row"');
    expect(html).toContain('5-hour');
    expect(html).toContain('65%');
    expect(html).toContain('width:65%');
  });

  it('uses amber color for mid-range utilization', () => {
    const html = buildBar('7-day', 70, null);
    expect(html).toContain('#D4940A');
  });

  it('uses red color for high utilization', () => {
    const html = buildBar('5-hour', 95, null);
    expect(html).toContain('#D03E3E');
  });
});

describe('render logic', () => {
  let contentEl, footerEl;

  beforeEach(() => {
    contentEl = { innerHTML: '' };
    footerEl = { textContent: '' };
  });

  function render(cached) {
    if (!cached || !cached.data) {
      contentEl.innerHTML = '<div class="error-msg">No usage data cached. Open claude.ai to fetch data.</div>';
      return;
    }

    const data = cached.data;
    let html = '';
    const dark = false;

    if (data.five_hour) {
      const pct = data.five_hour.utilization ?? 0;
      const color = utils.getUtilColor(pct, dark);
      html += `<div class="row">${pct}%</div>`;
    }

    contentEl.innerHTML = html;

    if (cached.timestamp) {
      const mins = Math.floor((Date.now() - cached.timestamp) / 60_000);
      footerEl.textContent = mins < 1 ? 'Updated just now' : `Updated ${mins}m ago`;
    }
  }

  it('shows error when no cached data', () => {
    render(null);
    expect(contentEl.innerHTML).toContain('No usage data cached');
  });

  it('shows error when cached.data is null', () => {
    render({ data: null });
    expect(contentEl.innerHTML).toContain('No usage data cached');
  });

  it('renders usage data when available', () => {
    render({
      data: { five_hour: { utilization: 42 } },
      timestamp: Date.now(),
    });
    expect(contentEl.innerHTML).toContain('42%');
    expect(footerEl.textContent).toBe('Updated just now');
  });

  it('shows "Updated Xm ago" for older data', () => {
    render({
      data: { five_hour: { utilization: 10 } },
      timestamp: Date.now() - 5 * 60_000,
    });
    expect(footerEl.textContent).toBe('Updated 5m ago');
  });
});
