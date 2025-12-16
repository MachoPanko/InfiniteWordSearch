import enMessages from "./messages/en.json";
import zhMessages from "./messages/zh.json";
import { getRequestConfig } from 'next-intl/server';

export const messages = {
  en: enMessages,
  zh: zhMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || 'en';
  
  return {
    locale,
    messages: messages[locale as keyof typeof messages],
    timeZone: 'UTC',
  };
});