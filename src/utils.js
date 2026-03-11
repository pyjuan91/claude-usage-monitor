/* utils.js — Shared pure functions for Claude Usage Monitor */

(function (exports) {
  'use strict';

  /**
   * Returns a color based on utilization percentage and theme.
   */
  exports.getUtilColor = function (pct, dark) {
    if (pct > 80) return dark ? '#E5524A' : '#D03E3E';
    if (pct > 60) return dark ? '#E0A020' : '#D4940A';
    if (pct > 30) return dark ? '#D4835E' : '#C15F3C';
    return dark ? '#C4A882' : '#A8896C';
  };

  /**
   * Formats a countdown string until the given ISO reset time.
   * @param {string|null} isoStr - ISO 8601 date string
   * @param {number} [now] - current timestamp in ms (defaults to Date.now())
   */
  exports.formatTimeUntil = function (isoStr, now) {
    if (!isoStr) return '';
    const resetTime = new Date(isoStr).getTime();
    if (now === undefined) now = Date.now();
    const diff = resetTime - now;

    var i18n = typeof UsageI18n !== 'undefined' ? UsageI18n : null;
    var t = i18n ? function () { return i18n.t.apply(i18n, arguments); } : null;

    if (diff <= 0) return t ? t('resettingSoon') : 'Resetting soon';

    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);

    if (hours >= 24) {
      const date = new Date(isoStr);
      var dateLocale = i18n ? i18n.getDateLocale() : 'en-US';
      var day = date.toLocaleDateString(dateLocale, { weekday: 'short' });
      var time = date.toLocaleTimeString(dateLocale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return t ? t('resets', day + ' ' + time) : 'Resets ' + day + ' ' + time;
    }
    if (hours > 0) return t ? t('resetsInHourMin', hours, mins) : 'Resets in ' + hours + 'h ' + mins + 'm';
    return t ? t('resetsInMin', mins) : 'Resets in ' + mins + 'm';
  };

  /**
   * Extracts an org UUID from an API URL path.
   */
  exports.extractOrgFromUrl = function (url) {
    if (!url) return null;
    var m = url.match(/\/api\/organizations\/([0-9a-f-]{36})/i);
    return m ? m[1] : null;
  };

  /**
   * Extracts the org UUID from a cookie string (looks for lastActiveOrg cookie).
   * @param {string} [cookieStr] - document.cookie-style string
   */
  exports.getOrgFromCookies = function (cookieStr) {
    if (!cookieStr) return null;
    var cookies = cookieStr.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var parts = cookies[i].trim().split('=');
      var name = parts[0];
      var rest = parts.slice(1).join('=');
      if (name === 'lastActiveOrg') {
        var val = decodeURIComponent(rest);
        var uuidMatch = val.match(
          /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
        );
        return uuidMatch ? uuidMatch[0] : null;
      }
    }
    return null;
  };

  /**
   * Builds an SVG donut icon string.
   */
  exports.buildDonutIcon = function (pct, color, trackColor, textColor) {
    var radius = 12;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference - (pct / 100) * circumference;
    return '<svg width="28" height="28" viewBox="0 0 32 32">' +
      '<circle cx="16" cy="16" r="' + radius + '" fill="none" stroke="' + trackColor + '" stroke-width="3"/>' +
      '<circle cx="16" cy="16" r="' + radius + '" fill="none" stroke="' + color + '" stroke-width="3"' +
      ' stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"' +
      ' stroke-linecap="round" transform="rotate(-90 16 16)"/>' +
      '<text x="16" y="17" text-anchor="middle" dominant-baseline="middle"' +
      ' font-size="8" font-weight="600" fill="' + textColor + '"' +
      ' font-family="-apple-system, BlinkMacSystemFont, sans-serif">' + Math.round(pct) + '</text>' +
      '</svg>';
  };

})(typeof module !== 'undefined' && module.exports ? module.exports : (this.UsageUtils = {}));
