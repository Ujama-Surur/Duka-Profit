/**
 * DukaProfit Subscription Plans & Manual Payment Configuration
 * All prices in Rwandan Francs (RWF).
 * You can edit plans, prices, durations, and features here directly.
 */

const plans = [
  {
    id: 'monthly',
    slug: 'monthly',
    name: 'Monthly Pro',
    price: 5000,
    currency: 'RWF',
    durationDays: 30,
    description: 'Full point-of-sale checkout, barcode scanning, and instant profit calculations.',
    popular: true,
    features: [
      'Unlimited products & categories',
      'High-speed POS Checkout & receipt printing',
      'Barcode scanner & mobile pairing',
      'Real-time gross profit & margin reports',
      'Daily/Monthly financial analytics',
      'Excel & PDF report exports',
    ],
  },
  {
    id: 'quarterly',
    slug: 'quarterly',
    name: 'Quarterly Pro',
    price: 12000,
    currency: 'RWF',
    durationDays: 90,
    description: '3 months of complete Pro access with 20% discount for growing businesses.',
    popular: false,
    badge: 'Save 3,000 RWF',
    features: [
      'All Monthly Pro features included',
      'Save 3,000 RWF (20% discount)',
      '3 months uninterrupted access',
      'Advanced financial analytics',
      'Priority customer support',
    ],
  },
  {
    id: 'yearly',
    slug: 'yearly',
    name: 'Annual VIP',
    price: 35000,
    currency: 'RWF',
    durationDays: 365,
    description: 'Full year of unlimited Duka Profit features with maximum savings and cloud sync.',
    popular: false,
    badge: 'Best Value (40% OFF)',
    features: [
      'All Pro & Advanced features for 1 full year',
      'Best Value: Save over 40% annually',
      'Automatic cloud backup protection',
      'Multi-user cashier permissions',
      'Dedicated WhatsApp VIP support',
    ],
  },
];

/**
 * Payment instructions for manual Mobile Money transfer
 */
const getPaymentInstructions = () => ({
  currency: 'RWF',
  momo: {
    network: 'MTN Mobile Money',
    codeType: 'MoMo Pay Code',
    code: process.env.MOMO_PAY_CODE || '055123',
    accountName: process.env.MOMO_RECIPIENT_NAME || 'DUKA PROFIT LTD',
    ussdGuide: '*182*8*1*CODE*AMOUNT#',
  },
  airtel: {
    network: 'Airtel Money',
    codeType: 'Airtel Money Number',
    phone: process.env.AIRTEL_MONEY_PHONE || '+250730000000',
    accountName: process.env.AIRTEL_RECIPIENT_NAME || 'DUKA PROFIT LTD',
    ussdGuide: '*182*1*1*PHONE*AMOUNT#',
  },
});

module.exports = {
  plans,
  getPaymentInstructions,
};
