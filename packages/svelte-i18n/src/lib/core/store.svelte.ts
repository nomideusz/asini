// packages/svelte-i18n/src/lib/core/store.svelte.ts

import type { Locale, Messages, I18nConfig, I18nInstance } from './types.js';
import { interpolate } from './interpolate.js';

/**
 * Create an i18n instance with Svelte 5 runes-based reactivity.
 *
 * @example
 * // src/lib/i18n.ts
 * import { createI18n } from '@nomideusz/svelte-i18n';
 *
 * export const i18n = createI18n({
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'pl'],
 *   loader: (locale) => import(`./messages/${locale}.json`).then(m => m.default),
 * });
 */
export function createI18n(config: I18nConfig): I18nInstance {
  let _locale = $state(config.defaultLocale);
  let _isLoading = $state(true);
  let _messages = $state<Messages>({});

  // Cache: locale → messages (never re-fetches the same locale)
  const cache = new Map<Locale, Messages>();

  async function loadMessages(locale: Locale): Promise<void> {
    const cached = cache.get(locale);
    if (cached) {
      _messages = cached;
      _isLoading = false;
      return;
    }

    _isLoading = true;
    try {
      const loaded = await config.loader(locale);
      // Handle both { default: {...} } (dynamic import) and plain objects
      const msgs = (loaded as Record<string, unknown>).default
        ? ((loaded as Record<string, unknown>).default as Messages)
        : loaded;
      cache.set(locale, msgs);
      _messages = msgs;
    } finally {
      _isLoading = false;
    }
  }

  // Eagerly load default locale
  loadMessages(config.defaultLocale);

  return {
    get locale() {
      return _locale;
    },

    get isLoading() {
      return _isLoading;
    },

    get supportedLocales() {
      return config.supportedLocales;
    },

    t(key: string, params?: Record<string, string | number>): string {
      const value = _messages[key];
      if (value === undefined) return key;
      return interpolate(value, params);
    },

    async setLocale(locale: Locale): Promise<void> {
      if (!config.supportedLocales.includes(locale)) {
        console.warn(`[svelte-i18n] Locale "${locale}" is not in supportedLocales.`);
        return;
      }
      if (locale === _locale && cache.has(locale)) return;
      _locale = locale;
      await loadMessages(locale);
    },
  };
}
