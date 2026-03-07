import { describe, it, expect, beforeEach } from 'vitest';
import * as UsageI18n from '../src/i18n.js';

describe('i18n', () => {
  beforeEach(() => {
    UsageI18n.setLang('en');
  });

  describe('detectLang', () => {
    it('returns en for unknown language', () => {
      expect(UsageI18n.detectLang('xx')).toBe('en');
    });

    it('returns exact match for supported language', () => {
      expect(UsageI18n.detectLang('ja')).toBe('ja');
      expect(UsageI18n.detectLang('ko')).toBe('ko');
      expect(UsageI18n.detectLang('fr')).toBe('fr');
    });

    it('returns base language for regional variants', () => {
      expect(UsageI18n.detectLang('ja-JP')).toBe('ja');
      expect(UsageI18n.detectLang('es-419')).toBe('es');
      expect(UsageI18n.detectLang('pt-BR')).toBe('pt');
      expect(UsageI18n.detectLang('de-DE')).toBe('de');
    });

    it('handles Chinese variants correctly', () => {
      expect(UsageI18n.detectLang('zh-TW')).toBe('zh-Hant');
      expect(UsageI18n.detectLang('zh-HK')).toBe('zh-Hant');
      expect(UsageI18n.detectLang('zh-Hant')).toBe('zh-Hant');
      expect(UsageI18n.detectLang('zh-CN')).toBe('zh-Hans');
      expect(UsageI18n.detectLang('zh')).toBe('zh-Hans');
    });

    it('returns en when no argument and no document', () => {
      expect(UsageI18n.detectLang(null)).toBe('en');
      expect(UsageI18n.detectLang(undefined)).toBe('en');
      expect(UsageI18n.detectLang('')).toBe('en');
    });
  });

  describe('t (translation)', () => {
    it('returns English string by default', () => {
      expect(UsageI18n.t('loading')).toBe('Loading usage data...');
    });

    it('returns translated string for set language', () => {
      UsageI18n.setLang('ja');
      expect(UsageI18n.t('hour5')).toBe('5時間');
      expect(UsageI18n.t('day7')).toBe('7日間');
    });

    it('substitutes placeholders', () => {
      expect(UsageI18n.t('updatedAgo', 5)).toBe('Updated 5m ago');
    });

    it('substitutes multiple placeholders', () => {
      expect(UsageI18n.t('resetsInHourMin', 2, 30)).toBe('Resets in 2h 30m');
    });

    it('falls back to English for missing keys', () => {
      UsageI18n.setLang('ja');
      expect(UsageI18n.t('nonexistent_key')).toBe('nonexistent_key');
    });

    it('translates in all supported languages', () => {
      const langs = ['en', 'fr', 'de', 'hi', 'id', 'it', 'ja', 'ko', 'pt', 'es', 'zh-Hant', 'zh-Hans'];
      for (const lang of langs) {
        UsageI18n.setLang(lang);
        const result = UsageI18n.t('loading');
        expect(result).toBeTruthy();
        expect(result).not.toBe('loading');
      }
    });
  });

  describe('getDateLocale', () => {
    it('returns correct locale for each language', () => {
      UsageI18n.setLang('ja');
      expect(UsageI18n.getDateLocale()).toBe('ja-JP');

      UsageI18n.setLang('en');
      expect(UsageI18n.getDateLocale()).toBe('en-US');

      UsageI18n.setLang('zh-Hant');
      expect(UsageI18n.getDateLocale()).toBe('zh-TW');
    });
  });

  describe('setLang / getLang', () => {
    it('sets and gets language', () => {
      UsageI18n.setLang('ko');
      expect(UsageI18n.getLang()).toBe('ko');
    });
  });
});
