'use client';

import { createContext, useContext, useMemo } from 'react';
import { createTranslator, DEFAULT_LOCALE, type Locale, type Translate } from './messages';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** 根布局按服务端算好的语言包一层，客户端组件用 useT() 取文案 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Translate {
  const locale = useLocale();
  return useMemo(() => createTranslator(locale), [locale]);
}
