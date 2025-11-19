export const FALLBACK_CURRENCY = { code: 'USD', symbol: '$' };

const regionCurrencyMap: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  VE: 'VES',
  GB: 'GBP',
  IE: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
  CY: 'EUR',
  HR: 'EUR',
  CZ: 'CZK',
  PL: 'PLN',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  CH: 'CHF',
  IS: 'ISK',
  AU: 'AUD',
  NZ: 'NZD',
  CN: 'CNY',
  HK: 'HKD',
  JP: 'JPY',
  KR: 'KRW',
  TW: 'TWD',
  SG: 'SGD',
  MY: 'MYR',
  TH: 'THB',
  VN: 'VND',
  ID: 'IDR',
  PH: 'PHP',
  IN: 'INR',
  PK: 'PKR',
  BD: 'BDT',
  LK: 'LKR',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  TR: 'TRY',
  IL: 'ILS',
  EG: 'EGP',
  MA: 'MAD',
  ZA: 'ZAR',
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  RU: 'RUB',
  UA: 'UAH',
  BY: 'BYN',
  KZ: 'KZT',
};

const getRegionFromLocale = (locale?: string) => {
  if (!locale) {
    return undefined;
  }
  try {
    const normalized = new Intl.Locale(locale).maximize();
    return normalized.region;
  } catch {
    return undefined;
  }
};

const currencySymbolForCode = (code: string, locale: string) => {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(1);
    return parts.find((part) => part.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
};

const detectLocaleCurrency = () => {
  if (typeof navigator === 'undefined') {
    return FALLBACK_CURRENCY;
  }
  const locale = navigator.languages?.[0] ?? navigator.language ?? 'en-US';
  const region = getRegionFromLocale(locale);
  const code = (region && regionCurrencyMap[region]) || FALLBACK_CURRENCY.code;
  return {
    code,
    symbol: currencySymbolForCode(code, locale),
  };
};

export const detectCurrencySymbol = () => detectLocaleCurrency().symbol || FALLBACK_CURRENCY.symbol;
