'use client';

import { createContext, useContext, useState, useMemo } from 'react';
import { NextIntlClientProvider } from 'next-intl';

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

type Messages = {
  [key: string]: any;
};

export function LanguageProvider({ children, messages }: { children: React.ReactNode, messages: Messages }) {
  const [locale, setLocale] = useState('en');

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return (
    <LanguageContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </LanguageContext.Provider>
  );
}