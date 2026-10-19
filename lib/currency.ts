import { detectCurrencySymbol } from '@sainsw/invoice-pdf';

export const DEFAULT_CURRENCY_SYMBOL = '£';

// invoice-pdf falls back to $, but browsers often report en-US (or a bare "en", which it reads as
// the US) for people elsewhere. Only trust the locale when it names a region other than the US;
// otherwise start in pounds.
export const detectDefaultCurrencySymbol = () => {
  if (typeof navigator === 'undefined') {
    return DEFAULT_CURRENCY_SYMBOL;
  }
  let region: string | undefined;
  try {
    region = new Intl.Locale(navigator.languages?.[0] ?? navigator.language).region;
  } catch {
    region = undefined;
  }
  return region && region !== 'US' ? detectCurrencySymbol() : DEFAULT_CURRENCY_SYMBOL;
};
