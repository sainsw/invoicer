// Fixed en-US grouping so the decimal point matches the PDF (which uses toFixed(2)),
// whatever the viewer's locale. The currency symbol is user-chosen, so it's prefixed separately.
const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatMoney = (symbol: string, value: number) =>
  `${symbol}${moneyFormatter.format(Number.isFinite(value) ? value : 0)}`;
