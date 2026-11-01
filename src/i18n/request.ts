import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from "./config";

type Messages = { [key: string]: string | Messages };

/** Deep-merge so any key missing from my.json falls back to English. */
function merge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    if (typeof value === "string") {
      if (value.trim() !== "") out[key] = value;
    } else if (typeof current === "object") {
      out[key] = merge(current, value);
    }
  }
  return out;
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale = cookieLocale && locales.includes(cookieLocale) ? cookieLocale : defaultLocale;

  const en = (await import("../../messages/en.json")).default as Messages;
  const messages = locale === "en" ? en : merge(en, (await import(`../../messages/${locale}.json`)).default as Messages);

  return { locale, messages };
});
