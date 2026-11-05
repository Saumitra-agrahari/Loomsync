import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'ta'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const langCookie = cookieStore.get('locale')?.value;
  let locale: Locale = defaultLocale;
  if (langCookie && locales.includes(langCookie as Locale)) {
    locale = langCookie as Locale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
