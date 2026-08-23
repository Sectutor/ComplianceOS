/**
 * Universal Currency & Regional Localization Engine
 * ComplianceOS Global Multi-Tenant Framework
 */

export interface CurrencyDefinition {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  defaultLocale: string;
  decimals: number;
}

export interface LocaleDefinition {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  defaultCurrency: string;
}

export const SUPPORTED_CURRENCIES: CurrencyDefinition[] = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸", defaultLocale: "en-US", decimals: 2 },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺", defaultLocale: "de-DE", decimals: 2 },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧", defaultLocale: "en-GB", decimals: 2 },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", flag: "🇨🇦", defaultLocale: "en-CA", decimals: 2 },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺", defaultLocale: "en-AU", decimals: 2 },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", flag: "🇨🇭", defaultLocale: "de-CH", decimals: 2 },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵", defaultLocale: "ja-JP", decimals: 0 },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬", defaultLocale: "en-SG", decimals: 2 },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", flag: "🇸🇪", defaultLocale: "sv-SE", decimals: 2 },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", flag: "🇳🇴", defaultLocale: "nb-NO", decimals: 2 },
  { code: "DKK", symbol: "kr.", name: "Danish Krone", flag: "🇩🇰", defaultLocale: "da-DK", decimals: 2 },
  { code: "PLN", symbol: "zł", name: "Polish Zloty", flag: "🇵🇱", defaultLocale: "pl-PL", decimals: 2 },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳", defaultLocale: "en-IN", decimals: 2 },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "🇧🇷", defaultLocale: "pt-BR", decimals: 2 },
  { code: "ZAR", symbol: "R", name: "South African Rand", flag: "🇿🇦", defaultLocale: "en-ZA", decimals: 2 },
  { code: "AED", symbol: "AED", name: "UAE Dirham", flag: "🇦🇪", defaultLocale: "ar-AE", decimals: 2 },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal", flag: "🇸🇦", defaultLocale: "ar-SA", decimals: 2 },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", flag: "🇳🇿", defaultLocale: "en-NZ", decimals: 2 },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", flag: "🇹🇷", defaultLocale: "tr-TR", decimals: 2 },
  { code: "MXN", symbol: "Mex$", name: "Mexican Peso", flag: "🇲🇽", defaultLocale: "es-MX", decimals: 2 },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", flag: "🇭🇰", defaultLocale: "zh-HK", decimals: 2 },
];

export const SUPPORTED_LOCALES: LocaleDefinition[] = [
  { code: "en-US", name: "English (United States)", nativeName: "English (US)", flag: "🇺🇸", defaultCurrency: "USD" },
  { code: "en-GB", name: "English (United Kingdom)", nativeName: "English (UK)", flag: "🇬🇧", defaultCurrency: "GBP" },
  { code: "de-DE", name: "German (Germany)", nativeName: "Deutsch (Deutschland)", flag: "🇩🇪", defaultCurrency: "EUR" },
  { code: "fr-FR", name: "French (France)", nativeName: "Français (France)", flag: "🇫🇷", defaultCurrency: "EUR" },
  { code: "es-ES", name: "Spanish (Spain)", nativeName: "Español (España)", flag: "🇪🇸", defaultCurrency: "EUR" },
  { code: "it-IT", name: "Italian (Italy)", nativeName: "Italiano (Italia)", flag: "🇮🇹", defaultCurrency: "EUR" },
  { code: "nl-NL", name: "Dutch (Netherlands)", nativeName: "Nederlands (Nederland)", flag: "🇳🇱", defaultCurrency: "EUR" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", flag: "🇧🇷", defaultCurrency: "BRL" },
  { code: "pl-PL", name: "Polish (Poland)", nativeName: "Polski (Polska)", flag: "🇵🇱", defaultCurrency: "PLN" },
  { code: "sv-SE", name: "Swedish (Sweden)", nativeName: "Svenska (Sverige)", flag: "🇸🇪", defaultCurrency: "SEK" },
  { code: "nb-NO", name: "Norwegian (Norway)", nativeName: "Norsk (Norge)", flag: "🇳🇴", defaultCurrency: "NOK" },
  { code: "da-DK", name: "Danish (Denmark)", nativeName: "Dansk (Danmark)", flag: "🇩🇰", defaultCurrency: "DKK" },
  { code: "ja-JP", name: "Japanese (Japan)", nativeName: "日本語 (日本)", flag: "🇯🇵", defaultCurrency: "JPY" },
  { code: "zh-CN", name: "Chinese (China)", nativeName: "简体中文 (中国)", flag: "🇨🇳", defaultCurrency: "CNY" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)", nativeName: "العربية (السعودية)", flag: "🇸🇦", defaultCurrency: "SAR" },
  { code: "he-IL", name: "Hebrew (Israel)", nativeName: "עברית (ישראל)", flag: "🇮🇱", defaultCurrency: "ILS" },
  { code: "tr-TR", name: "Turkish (Turkey)", nativeName: "Türkçe (Türkiye)", flag: "🇹🇷", defaultCurrency: "TRY" },
  { code: "hi-IN", name: "Hindi / English (India)", nativeName: "English / हिन्दी (India)", flag: "🇮🇳", defaultCurrency: "INR" },
];

export const SUPPORTED_DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO 8601 - e.g. 2026-10-24)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (UK/EU - e.g. 24/10/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US - e.g. 10/24/2026)" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY (German/Swiss - e.g. 24.10.2026)" },
  { value: "YYYY/MM/DD", label: "YYYY/MM/DD (East Asia - e.g. 2026/10/24)" },
];

/**
 * Universal Currency Formatter
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "USD",
  locale: string = "en-US",
  options?: {
    compact?: boolean;
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    amount = 0;
  }
  const numericAmount = Number(amount);
  const targetCurrency = (currency || "USD").toUpperCase();
  const currDef = SUPPORTED_CURRENCIES.find((c) => c.code === targetCurrency);
  const targetLocale = locale || currDef?.defaultLocale || "en-US";
  const defaultDecimals = currDef?.decimals ?? 2;

  try {
    if (options?.compact) {
      const formatted = new Intl.NumberFormat(targetLocale, {
        style: "currency",
        currency: targetCurrency,
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(numericAmount);
      return options?.showCode ? `${formatted} ${targetCurrency}` : formatted;
    }

    const minDec = options?.minimumFractionDigits !== undefined ? options.minimumFractionDigits : (numericAmount % 1 === 0 ? 0 : defaultDecimals);
    const maxDec = options?.maximumFractionDigits !== undefined ? options.maximumFractionDigits : defaultDecimals;

    const formatted = new Intl.NumberFormat(targetLocale, {
      style: "currency",
      currency: targetCurrency,
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec,
    }).format(numericAmount);

    return options?.showCode ? `${formatted} ${targetCurrency}` : formatted;
  } catch (err) {
    const symbol = currDef?.symbol || "$";
    return `${symbol}${numericAmount.toLocaleString()}${options?.showCode ? ` ${targetCurrency}` : ""}`;
  }
}

/**
 * Get the currency symbol for a currency code
 */
export function getCurrencySymbol(currency: string = "USD", locale: string = "en-US"): string {
  const code = (currency || "USD").toUpperCase();
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  if (found) return found.symbol;

  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency: code }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === "currency");
    return symbolPart?.value || code;
  } catch {
    return code;
  }
}
