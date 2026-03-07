/* i18n.js — Internationalization for Claude Usage Monitor */

(function (exports) {
  'use strict';

  var translations = {
    en: {
      loading: 'Loading usage data...',
      hour5: '5-hour',
      day7: '7-day',
      opus7d: 'Opus 7d',
      sonnet7d: 'Sonnet 7d',
      cowork7d: 'Cowork 7d',
      extraUsage: 'Extra usage',
      updatedNow: 'Updated just now',
      updatedAgo: 'Updated {0}m ago',
      loginRequired: 'Please log in to claude.ai',
      orgNotFound: 'Unable to detect organization. Please refresh the page.',
      unavailable: 'Usage data unavailable',
      collapse: 'Collapse',
      usageMonitor: 'Usage Monitor',
      thresholdWarning: '5-hour usage at {0}%. Consider slowing down.',
      resettingSoon: 'Resetting soon',
      resetsInMin: 'Resets in {0}m',
      resetsInHourMin: 'Resets in {0}h {1}m',
      resets: 'Resets {0}',
      noData: 'No usage data cached. Open claude.ai to fetch data.',
      claudeUsage: 'Claude Usage'
    },
    fr: {
      loading: 'Chargement des donn\u00e9es...',
      hour5: '5 heures',
      day7: '7 jours',
      opus7d: 'Opus 7j',
      sonnet7d: 'Sonnet 7j',
      cowork7d: 'Cowork 7j',
      extraUsage: 'Usage suppl.',
      updatedNow: 'Mis \u00e0 jour \u00e0 l\u2019instant',
      updatedAgo: 'Mis \u00e0 jour il y a {0}m',
      loginRequired: 'Veuillez vous connecter \u00e0 claude.ai',
      orgNotFound: 'Organisation non d\u00e9tect\u00e9e. Veuillez rafra\u00eechir la page.',
      unavailable: 'Donn\u00e9es indisponibles',
      collapse: 'R\u00e9duire',
      usageMonitor: 'Moniteur d\u2019utilisation',
      thresholdWarning: 'Utilisation 5h \u00e0 {0}%. Pensez \u00e0 ralentir.',
      resettingSoon: 'R\u00e9initialisation imminente',
      resetsInMin: 'R\u00e9init. dans {0}m',
      resetsInHourMin: 'R\u00e9init. dans {0}h {1}m',
      resets: 'R\u00e9init. {0}',
      noData: 'Aucune donn\u00e9e en cache. Ouvrez claude.ai.',
      claudeUsage: 'Utilisation Claude'
    },
    de: {
      loading: 'Nutzungsdaten werden geladen...',
      hour5: '5-Stunden',
      day7: '7-Tage',
      opus7d: 'Opus 7T',
      sonnet7d: 'Sonnet 7T',
      cowork7d: 'Cowork 7T',
      extraUsage: 'Zusatznutzung',
      updatedNow: 'Gerade aktualisiert',
      updatedAgo: 'Vor {0}m aktualisiert',
      loginRequired: 'Bitte bei claude.ai anmelden',
      orgNotFound: 'Organisation nicht erkannt. Bitte Seite neu laden.',
      unavailable: 'Nutzungsdaten nicht verf\u00fcgbar',
      collapse: 'Einklappen',
      usageMonitor: 'Nutzungsmonitor',
      thresholdWarning: '5-Stunden-Nutzung bei {0}%. Bitte langsamer.',
      resettingSoon: 'Wird bald zur\u00fcckgesetzt',
      resetsInMin: 'Reset in {0}m',
      resetsInHourMin: 'Reset in {0}h {1}m',
      resets: 'Reset {0}',
      noData: 'Keine Daten im Cache. \u00d6ffnen Sie claude.ai.',
      claudeUsage: 'Claude-Nutzung'
    },
    hi: {
      loading: '\u0909\u092a\u092f\u094b\u0917 \u0921\u0947\u091f\u093e \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...',
      hour5: '5-\u0918\u0902\u091f\u0947',
      day7: '7-\u0926\u093f\u0928',
      opus7d: 'Opus 7\u0926\u093f',
      sonnet7d: 'Sonnet 7\u0926\u093f',
      cowork7d: 'Cowork 7\u0926\u093f',
      extraUsage: '\u0905\u0924\u093f\u0930\u093f\u0915\u094d\u0924 \u0909\u092a\u092f\u094b\u0917',
      updatedNow: '\u0905\u092d\u0940 \u0905\u092a\u0921\u0947\u091f \u0939\u0941\u0906',
      updatedAgo: '{0}\u092e\u093f\u0928\u091f \u092a\u0939\u0932\u0947 \u0905\u092a\u0921\u0947\u091f',
      loginRequired: '\u0915\u0943\u092a\u092f\u093e claude.ai \u092a\u0930 \u0932\u0949\u0917 \u0907\u0928 \u0915\u0930\u0947\u0902',
      orgNotFound: '\u0938\u0902\u0917\u0920\u0928 \u0928\u0939\u0940\u0902 \u092e\u093f\u0932\u093e\u0964 \u092a\u0947\u091c \u0930\u0940\u092b\u094d\u0930\u0947\u0936 \u0915\u0930\u0947\u0902\u0964',
      unavailable: '\u0909\u092a\u092f\u094b\u0917 \u0921\u0947\u091f\u093e \u0905\u0928\u0941\u092a\u0932\u092c\u094d\u0927',
      collapse: '\u091b\u094b\u091f\u093e \u0915\u0930\u0947\u0902',
      usageMonitor: '\u0909\u092a\u092f\u094b\u0917 \u092e\u0949\u0928\u093f\u091f\u0930',
      thresholdWarning: '5-\u0918\u0902\u091f\u0947 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 {0}%\u0964 \u0927\u0940\u0930\u0947 \u0915\u0930\u0947\u0902\u0964',
      resettingSoon: '\u091c\u0932\u094d\u0926 \u0930\u0940\u0938\u0947\u091f \u0939\u094b\u0917\u093e',
      resetsInMin: '{0}\u092e\u093f\u0928\u091f \u092e\u0947\u0902 \u0930\u0940\u0938\u0947\u091f',
      resetsInHourMin: '{0}\u0918\u0902 {1}\u092e\u093f\u0928 \u092e\u0947\u0902 \u0930\u0940\u0938\u0947\u091f',
      resets: '\u0930\u0940\u0938\u0947\u091f {0}',
      noData: '\u0915\u094b\u0908 \u0915\u0948\u0936 \u0921\u0947\u091f\u093e \u0928\u0939\u0940\u0902\u0964 claude.ai \u0916\u094b\u0932\u0947\u0902\u0964',
      claudeUsage: 'Claude \u0909\u092a\u092f\u094b\u0917'
    },
    id: {
      loading: 'Memuat data penggunaan...',
      hour5: '5-jam',
      day7: '7-hari',
      opus7d: 'Opus 7h',
      sonnet7d: 'Sonnet 7h',
      cowork7d: 'Cowork 7h',
      extraUsage: 'Penggunaan ekstra',
      updatedNow: 'Baru saja diperbarui',
      updatedAgo: 'Diperbarui {0}m lalu',
      loginRequired: 'Silakan masuk ke claude.ai',
      orgNotFound: 'Organisasi tidak terdeteksi. Muat ulang halaman.',
      unavailable: 'Data penggunaan tidak tersedia',
      collapse: 'Ciutkan',
      usageMonitor: 'Monitor Penggunaan',
      thresholdWarning: 'Penggunaan 5-jam di {0}%. Pertimbangkan untuk melambat.',
      resettingSoon: 'Segera direset',
      resetsInMin: 'Reset dalam {0}m',
      resetsInHourMin: 'Reset dalam {0}j {1}m',
      resets: 'Reset {0}',
      noData: 'Tidak ada data cache. Buka claude.ai.',
      claudeUsage: 'Penggunaan Claude'
    },
    it: {
      loading: 'Caricamento dati di utilizzo...',
      hour5: '5-ore',
      day7: '7-giorni',
      opus7d: 'Opus 7g',
      sonnet7d: 'Sonnet 7g',
      cowork7d: 'Cowork 7g',
      extraUsage: 'Uso extra',
      updatedNow: 'Aggiornato ora',
      updatedAgo: 'Aggiornato {0}m fa',
      loginRequired: 'Accedi a claude.ai',
      orgNotFound: 'Organizzazione non rilevata. Ricarica la pagina.',
      unavailable: 'Dati di utilizzo non disponibili',
      collapse: 'Comprimi',
      usageMonitor: 'Monitor utilizzo',
      thresholdWarning: 'Uso 5-ore al {0}%. Considera di rallentare.',
      resettingSoon: 'Reset imminente',
      resetsInMin: 'Reset tra {0}m',
      resetsInHourMin: 'Reset tra {0}h {1}m',
      resets: 'Reset {0}',
      noData: 'Nessun dato in cache. Apri claude.ai.',
      claudeUsage: 'Utilizzo Claude'
    },
    ja: {
      loading: '\u4f7f\u7528\u30c7\u30fc\u30bf\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...',
      hour5: '5\u6642\u9593',
      day7: '7\u65e5\u9593',
      opus7d: 'Opus 7\u65e5',
      sonnet7d: 'Sonnet 7\u65e5',
      cowork7d: 'Cowork 7\u65e5',
      extraUsage: '\u8ffd\u52a0\u4f7f\u7528\u91cf',
      updatedNow: '\u305f\u3063\u305f\u4eca\u66f4\u65b0',
      updatedAgo: '{0}\u5206\u524d\u306b\u66f4\u65b0',
      loginRequired: 'claude.ai\u306b\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044',
      orgNotFound: '\u7d44\u7e54\u3092\u691c\u51fa\u3067\u304d\u307e\u305b\u3093\u3002\u30da\u30fc\u30b8\u3092\u66f4\u65b0\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
      unavailable: '\u4f7f\u7528\u30c7\u30fc\u30bf\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093',
      collapse: '\u6298\u308a\u305f\u305f\u3080',
      usageMonitor: '\u4f7f\u7528\u91cf\u30e2\u30cb\u30bf\u30fc',
      thresholdWarning: '5\u6642\u9593\u306e\u4f7f\u7528\u7387\u304c{0}%\u3067\u3059\u3002\u30da\u30fc\u30b9\u3092\u843d\u3068\u3057\u307e\u3057\u3087\u3046\u3002',
      resettingSoon: '\u307e\u3082\u306a\u304f\u30ea\u30bb\u30c3\u30c8',
      resetsInMin: '{0}\u5206\u5f8c\u306b\u30ea\u30bb\u30c3\u30c8',
      resetsInHourMin: '{0}\u6642\u9593{1}\u5206\u5f8c\u306b\u30ea\u30bb\u30c3\u30c8',
      resets: '{0}\u306b\u30ea\u30bb\u30c3\u30c8',
      noData: '\u30ad\u30e3\u30c3\u30b7\u30e5\u30c7\u30fc\u30bf\u306a\u3057\u3002claude.ai\u3092\u958b\u3044\u3066\u304f\u3060\u3055\u3044\u3002',
      claudeUsage: 'Claude \u4f7f\u7528\u91cf'
    },
    ko: {
      loading: '\uc0ac\uc6a9\ub7c9 \ub370\uc774\ud130 \ub85c\ub529 \uc911...',
      hour5: '5\uc2dc\uac04',
      day7: '7\uc77c',
      opus7d: 'Opus 7\uc77c',
      sonnet7d: 'Sonnet 7\uc77c',
      cowork7d: 'Cowork 7\uc77c',
      extraUsage: '\ucd94\uac00 \uc0ac\uc6a9\ub7c9',
      updatedNow: '\ubc29\uae08 \uc5c5\ub370\uc774\ud2b8',
      updatedAgo: '{0}\ubd84 \uc804 \uc5c5\ub370\uc774\ud2b8',
      loginRequired: 'claude.ai\uc5d0 \ub85c\uadf8\uc778\ud574 \uc8fc\uc138\uc694',
      orgNotFound: '\uc870\uc9c1\uc744 \uac10\uc9c0\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4. \ud398\uc774\uc9c0\ub97c \uc0c8\ub85c\uace0\uce68\ud558\uc138\uc694.',
      unavailable: '\uc0ac\uc6a9\ub7c9 \ub370\uc774\ud130 \uc0ac\uc6a9 \ubd88\uac00',
      collapse: '\uc811\uae30',
      usageMonitor: '\uc0ac\uc6a9\ub7c9 \ubaa8\ub2c8\ud130',
      thresholdWarning: '5\uc2dc\uac04 \uc0ac\uc6a9\ub7c9\uc774 {0}%\uc785\ub2c8\ub2e4. \uc18d\ub3c4\ub97c \uc904\uc774\uc138\uc694.',
      resettingSoon: '\uacf3 \ub9ac\uc14b\ub428',
      resetsInMin: '{0}\ubd84 \ud6c4 \ub9ac\uc14b',
      resetsInHourMin: '{0}\uc2dc\uac04 {1}\ubd84 \ud6c4 \ub9ac\uc14b',
      resets: '{0}\uc5d0 \ub9ac\uc14b',
      noData: '\uce90\uc2dc \ub370\uc774\ud130 \uc5c6\uc74c. claude.ai\ub97c \uc5ec\uc138\uc694.',
      claudeUsage: 'Claude \uc0ac\uc6a9\ub7c9'
    },
    pt: {
      loading: 'Carregando dados de uso...',
      hour5: '5-horas',
      day7: '7-dias',
      opus7d: 'Opus 7d',
      sonnet7d: 'Sonnet 7d',
      cowork7d: 'Cowork 7d',
      extraUsage: 'Uso extra',
      updatedNow: 'Atualizado agora',
      updatedAgo: 'Atualizado h\u00e1 {0}m',
      loginRequired: 'Fa\u00e7a login em claude.ai',
      orgNotFound: 'Organiza\u00e7\u00e3o n\u00e3o detectada. Atualize a p\u00e1gina.',
      unavailable: 'Dados de uso indispon\u00edveis',
      collapse: 'Recolher',
      usageMonitor: 'Monitor de uso',
      thresholdWarning: 'Uso de 5h em {0}%. Considere desacelerar.',
      resettingSoon: 'Reiniciando em breve',
      resetsInMin: 'Reinicia em {0}m',
      resetsInHourMin: 'Reinicia em {0}h {1}m',
      resets: 'Reinicia {0}',
      noData: 'Sem dados em cache. Abra claude.ai.',
      claudeUsage: 'Uso do Claude'
    },
    es: {
      loading: 'Cargando datos de uso...',
      hour5: '5-horas',
      day7: '7-d\u00edas',
      opus7d: 'Opus 7d',
      sonnet7d: 'Sonnet 7d',
      cowork7d: 'Cowork 7d',
      extraUsage: 'Uso extra',
      updatedNow: 'Actualizado ahora',
      updatedAgo: 'Actualizado hace {0}m',
      loginRequired: 'Inicia sesi\u00f3n en claude.ai',
      orgNotFound: 'Organizaci\u00f3n no detectada. Recarga la p\u00e1gina.',
      unavailable: 'Datos de uso no disponibles',
      collapse: 'Contraer',
      usageMonitor: 'Monitor de uso',
      thresholdWarning: 'Uso de 5h al {0}%. Considera reducir el ritmo.',
      resettingSoon: 'Reinicio inminente',
      resetsInMin: 'Reinicio en {0}m',
      resetsInHourMin: 'Reinicio en {0}h {1}m',
      resets: 'Reinicio {0}',
      noData: 'Sin datos en cach\u00e9. Abre claude.ai.',
      claudeUsage: 'Uso de Claude'
    },
    'zh-Hant': {
      loading: '\u6b63\u5728\u8f09\u5165\u4f7f\u7528\u8cc7\u6599...',
      hour5: '5\u5c0f\u6642',
      day7: '7\u5929',
      opus7d: 'Opus 7\u5929',
      sonnet7d: 'Sonnet 7\u5929',
      cowork7d: 'Cowork 7\u5929',
      extraUsage: '\u984d\u5916\u7528\u91cf',
      updatedNow: '\u525b\u525b\u66f4\u65b0',
      updatedAgo: '{0}\u5206\u524d\u66f4\u65b0',
      loginRequired: '\u8acb\u767b\u5165 claude.ai',
      orgNotFound: '\u7121\u6cd5\u5075\u6e2c\u7d44\u7e54\u3002\u8acb\u91cd\u65b0\u6574\u7406\u9801\u9762\u3002',
      unavailable: '\u4f7f\u7528\u8cc7\u6599\u7121\u6cd5\u53d6\u5f97',
      collapse: '\u6536\u5408',
      usageMonitor: '\u7528\u91cf\u76e3\u63a7',
      thresholdWarning: '5\u5c0f\u6642\u4f7f\u7528\u7387\u5df2\u9054{0}%\u3002\u8acb\u653e\u6162\u901f\u5ea6\u3002',
      resettingSoon: '\u5373\u5c07\u91cd\u7f6e',
      resetsInMin: '{0}\u5206\u5f8c\u91cd\u7f6e',
      resetsInHourMin: '{0}\u5c0f\u6642{1}\u5206\u5f8c\u91cd\u7f6e',
      resets: '{0}\u91cd\u7f6e',
      noData: '\u7121\u5feb\u53d6\u8cc7\u6599\u3002\u8acb\u958b\u555f claude.ai\u3002',
      claudeUsage: 'Claude \u7528\u91cf'
    },
    'zh-Hans': {
      loading: '\u6b63\u5728\u52a0\u8f7d\u4f7f\u7528\u6570\u636e...',
      hour5: '5\u5c0f\u65f6',
      day7: '7\u5929',
      opus7d: 'Opus 7\u5929',
      sonnet7d: 'Sonnet 7\u5929',
      cowork7d: 'Cowork 7\u5929',
      extraUsage: '\u989d\u5916\u7528\u91cf',
      updatedNow: '\u521a\u521a\u66f4\u65b0',
      updatedAgo: '{0}\u5206\u949f\u524d\u66f4\u65b0',
      loginRequired: '\u8bf7\u767b\u5f55 claude.ai',
      orgNotFound: '\u65e0\u6cd5\u68c0\u6d4b\u7ec4\u7ec7\u3002\u8bf7\u5237\u65b0\u9875\u9762\u3002',
      unavailable: '\u4f7f\u7528\u6570\u636e\u4e0d\u53ef\u7528',
      collapse: '\u6536\u8d77',
      usageMonitor: '\u7528\u91cf\u76d1\u63a7',
      thresholdWarning: '5\u5c0f\u65f6\u4f7f\u7528\u7387\u5df2\u8fbe{0}%\u3002\u8bf7\u653e\u6162\u901f\u5ea6\u3002',
      resettingSoon: '\u5373\u5c06\u91cd\u7f6e',
      resetsInMin: '{0}\u5206\u949f\u540e\u91cd\u7f6e',
      resetsInHourMin: '{0}\u5c0f\u65f6{1}\u5206\u949f\u540e\u91cd\u7f6e',
      resets: '{0}\u91cd\u7f6e',
      noData: '\u65e0\u7f13\u5b58\u6570\u636e\u3002\u8bf7\u6253\u5f00 claude.ai\u3002',
      claudeUsage: 'Claude \u7528\u91cf'
    }
  };

  var currentLang = 'en';

  /**
   * Detect language from the HTML document or a given lang attribute value.
   * Returns the best matching language key.
   */
  exports.detectLang = function (langAttr) {
    if (!langAttr) {
      if (typeof document !== 'undefined') {
        langAttr = document.documentElement.lang;
      }
      if (!langAttr) return 'en';
    }

    // Exact match first (e.g. "zh-Hant", "zh-Hans")
    if (translations[langAttr]) return langAttr;

    // Try base language (e.g. "ja-JP" -> "ja", "es-419" -> "es")
    var base = langAttr.split('-')[0];
    if (translations[base]) return base;

    // Special handling for Chinese variants
    if (base === 'zh') {
      if (langAttr.indexOf('TW') !== -1 || langAttr.indexOf('HK') !== -1 || langAttr.indexOf('Hant') !== -1) {
        return 'zh-Hant';
      }
      return 'zh-Hans';
    }

    return 'en';
  };

  exports.setLang = function (lang) {
    currentLang = lang;
  };

  exports.getLang = function () {
    return currentLang;
  };

  /**
   * Get the locale string for date formatting (e.g. "en-US", "ja-JP").
   */
  exports.getDateLocale = function () {
    var map = {
      en: 'en-US', fr: 'fr-FR', de: 'de-DE', hi: 'hi-IN',
      id: 'id-ID', it: 'it-IT', ja: 'ja-JP', ko: 'ko-KR',
      pt: 'pt-BR', es: 'es-ES', 'zh-Hant': 'zh-TW', 'zh-Hans': 'zh-CN'
    };
    return map[currentLang] || 'en-US';
  };

  /**
   * Translate a key with optional placeholder substitution.
   * Usage: t('updatedAgo', 5) => "Updated 5m ago"
   */
  exports.t = function (key) {
    var args = Array.prototype.slice.call(arguments, 1);
    var dict = translations[currentLang] || translations.en;
    var str = dict[key] || translations.en[key] || key;
    return str.replace(/\{(\d+)\}/g, function (_, i) {
      return args[i] != null ? args[i] : '';
    });
  };

})(typeof module !== 'undefined' && module.exports ? module.exports : (this.UsageI18n = {}));
