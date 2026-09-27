export const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', defaultRounding: 'none' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP', defaultRounding: '100' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RWF', defaultRounding: '50' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', defaultRounding: '100' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', defaultRounding: '5' },
  { code: 'EUR', name: 'Euro', symbol: '€', defaultRounding: 'none' },
  { code: 'GBP', name: 'British Pound', symbol: '£', defaultRounding: 'none' },
];

export const ROUNDING_OPTIONS = [
  { value: 'none', label: 'Exact / 2 Decimals (e.g. USD, EUR)' },
  { value: '1', label: 'Nearest 1' },
  { value: '5', label: 'Nearest 5 (e.g. KES)' },
  { value: '10', label: 'Nearest 10' },
  { value: '50', label: 'Nearest 50 (e.g. RWF)' },
  { value: '100', label: 'Nearest 100 (e.g. SSP, UGX)' },
  { value: '500', label: 'Nearest 500' },
  { value: '1000', label: 'Nearest 1,000' },
];

/**
 * Client-side rounding utility matching backend logic
 */
export function roundPrice(amount, roundingRule = 'none') {
  const num = Number(amount);
  if (isNaN(num)) return 0;

  switch (String(roundingRule).toLowerCase()) {
    case '1':
      return Math.round(num);
    case '5':
      return Math.round(num / 5) * 5;
    case '10':
      return Math.round(num / 10) * 10;
    case '50':
      return Math.round(num / 50) * 50;
    case '100':
      return Math.round(num / 100) * 100;
    case '500':
      return Math.round(num / 500) * 500;
    case '1000':
      return Math.round(num / 1000) * 1000;
    case 'none':
    default:
      return Math.round(num * 100) / 100;
  }
}

/**
 * Preview replacement cost calculation
 */
export function calculateReplacementCost(baseCost, rate, roundingRule = 'none') {
  const c = parseFloat(baseCost || 0);
  const r = parseFloat(rate || 0);
  if (c <= 0 || r <= 0) return 0;
  return roundPrice(c * r, roundingRule);
}

/**
 * Preview suggested selling price calculation
 */
export function calculateSuggestedSellingPrice(replacementCost, targetMarginPercent = 15, roundingRule = 'none') {
  const rep = parseFloat(replacementCost || 0);
  const margin = parseFloat(targetMarginPercent || 15);
  if (rep <= 0) return 0;
  return roundPrice(rep * (1 + margin / 100), roundingRule);
}
