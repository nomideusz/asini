// apps/yoga — i18n setup (PL-only)
import { createI18n } from '@nomideusz/svelte-i18n';

const loader = async (locale: string) => {
  const mod = await import(`./messages/${locale}.json`);
  return mod.default;
};

export const i18n = createI18n({
  defaultLocale: 'pl',
  supportedLocales: ['pl'],
  loader,
});
