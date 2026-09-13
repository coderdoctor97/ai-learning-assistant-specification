import { DEFAULT_LOCALE, formatMessage } from "./format";
import { en, type MessageCatalog, type MessageKey } from "./messages";

export type { MessageKey } from "./messages";

/*
 * Translation registry. `en` is the source of truth; further locales can be
 * added to `catalogs` (partial catalogs fall back to English per key).
 */
const catalogs: Record<string, Partial<MessageCatalog>> = { en };

/** Active UI locale. Date/number formatting uses it explicitly everywhere. */
export const UI_LOCALE = DEFAULT_LOCALE;

function lookup(key: MessageKey, locale: string): string {
  const catalog = catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
  return catalog?.[key] ?? en[key] ?? String(key);
}

export type MessageVars = Record<string, string | number>;

/**
 * Translate a catalog key.
 * `t("stage.label", { index: 2, total: 6 })`
 */
export function t(key: MessageKey, vars: MessageVars = {}, locale: string = UI_LOCALE): string {
  return formatMessage(lookup(key, locale), vars, null, locale);
}

/**
 * Translate a catalog key whose message contains an ICU plural on `count`.
 * `tPlural("sidebar.storedLocally", 3)`
 */
export function tPlural(
  key: MessageKey,
  count: number,
  vars: MessageVars = {},
  locale: string = UI_LOCALE,
): string {
  return formatMessage(lookup(key, locale), vars, count, locale);
}

/** Explicit-locale date formatting (never relies on host defaults). */
export function formatDate(iso: string | number | Date, locale: string = UI_LOCALE): string {
  return new Date(iso).toLocaleDateString(locale);
}

/** Explicit-locale date-time formatting (never relies on host defaults). */
export function formatDateTime(iso: string | number | Date, locale: string = UI_LOCALE): string {
  return new Date(iso).toLocaleString(locale);
}

/** Explicit-locale number formatting. */
export function formatNumber(value: number, locale: string = UI_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}
