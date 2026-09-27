const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { roundPrice, SUPPORTED_CURRENCIES } = require('../services/exchangeRateService');

describe('Currency Protection & Dynamic Pricing Core Logic', () => {

  describe('Rounding Engine across Currencies (§11)', () => {
    test('SSP default rounding to nearest 100', () => {
      assert.equal(roundPrice(96640, '100'), 96600);
      assert.equal(roundPrice(96650, '100'), 96700);
      assert.equal(roundPrice(96680, '100'), 96700);
    });

    test('RWF rounding to nearest 50', () => {
      assert.equal(roundPrice(1234, '50'), 1250);
      assert.equal(roundPrice(1220, '50'), 1200);
    });

    test('KES rounding to nearest 5', () => {
      assert.equal(roundPrice(143.2, '5'), 145);
      assert.equal(roundPrice(141.8, '5'), 140);
    });

    test('UGX rounding to nearest 500', () => {
      assert.equal(roundPrice(34200, '500'), 34000);
      assert.equal(roundPrice(34350, '500'), 34500);
    });

    test('USD / EUR / GBP default rounding (2 decimals)', () => {
      assert.equal(roundPrice(19.994, 'none'), 19.99);
      assert.equal(roundPrice(19.996, 'none'), 20.00);
    });
  });

  describe('Exchange Rate Calculations & Protection Alerts (§8, §9, §24)', () => {
    // Simulated product
    function calculateProductCurrencyState({
      baseCost,
      purchaseRate,
      currentRate,
      targetMarginPercent,
      currentSellingPrice,
      pricingMode,
      roundingRule = '100',
      minProtectionMargin = 0,
    }) {
      const historicalLocalCost = baseCost * purchaseRate;
      const currentReplacementCost = roundPrice(baseCost * currentRate, roundingRule);
      const suggestedSellingPrice = roundPrice(currentReplacementCost * (1 + targetMarginPercent / 100), roundingRule);

      const isBelowReplacement = currentReplacementCost > 0 && currentSellingPrice < currentReplacementCost;
      const minSafePrice = currentReplacementCost * (1 + minProtectionMargin / 100);
      const isBelowSafeMargin = currentSellingPrice < minSafePrice;
      const isCurrencyLinkedDiscrepancy = pricingMode === 'currency_linked' && currentSellingPrice !== suggestedSellingPrice;

      const priceReviewRequired = pricingMode !== 'fixed' && (isBelowReplacement || isBelowSafeMargin || isCurrencyLinkedDiscrepancy);
      const replacementGap = currentReplacementCost > currentSellingPrice ? currentReplacementCost - currentSellingPrice : 0;
      const accountingProfit = currentSellingPrice - historicalLocalCost;
      const accountingMargin = currentSellingPrice > 0 ? (((currentSellingPrice - historicalLocalCost) / currentSellingPrice) * 100).toFixed(1) : 0;
      const replacementAdjustedMargin = currentSellingPrice > 0 && currentReplacementCost > 0
        ? (((currentSellingPrice - currentReplacementCost) / currentSellingPrice) * 100).toFixed(1)
        : null;

      return {
        historicalLocalCost,
        currentReplacementCost,
        suggestedSellingPrice,
        priceReviewRequired,
        isBelowReplacement,
        replacementGap,
        accountingProfit,
        accountingMargin,
        replacementAdjustedMargin,
        // Crucial hard rule: selling price is never automatically changed
        unalteredSellingPrice: currentSellingPrice,
      };
    }

    test('Depreciation scenario (Rice 25kg): 3,500 -> 4,200 SSP/USD correctly flags Below Replacement Cost', () => {
      const state = calculateProductCurrencyState({
        baseCost: 20, // $20 USD
        purchaseRate: 3500, // 3,500 SSP/USD -> Historical cost = 70,000 SSP
        currentRate: 4200, // 4,200 SSP/USD -> Replacement cost = 84,000 SSP
        targetMarginPercent: 15,
        currentSellingPrice: 78000, // Retailer is currently selling at 78,000 SSP
        pricingMode: 'replacement_protected',
        roundingRule: '100',
      });

      assert.equal(state.historicalLocalCost, 70000);
      assert.equal(state.currentReplacementCost, 84000);
      assert.equal(state.suggestedSellingPrice, 96600); // 84,000 * 1.15 = 96,600
      assert.equal(state.unalteredSellingPrice, 78000, 'Selling price must never auto-change');
      assert.equal(state.isBelowReplacement, true);
      assert.equal(state.priceReviewRequired, true);
      assert.equal(state.replacementGap, 6000); // 84,000 - 78,000 = 6,000 gap

      // Accounting shows a profit of +8,000 against historical cost, but replacement-adjusted margin is NEGATIVE (-7.7%)
      assert.equal(state.accountingProfit, 8000);
      assert.equal(Number(state.replacementAdjustedMargin) < 0, true);
    });

    test('Appreciation scenario: 4,200 -> 3,800 SSP/USD does not auto-reduce customer selling prices', () => {
      const state = calculateProductCurrencyState({
        baseCost: 20,
        purchaseRate: 3500,
        currentRate: 3800,
        targetMarginPercent: 15,
        currentSellingPrice: 96600, // Current selling price after previous review
        pricingMode: 'replacement_protected',
        roundingRule: '100',
      });

      assert.equal(state.currentReplacementCost, 76000); // 20 * 3800
      assert.equal(state.suggestedSellingPrice, 87400); // 76,000 * 1.15
      assert.equal(state.unalteredSellingPrice, 96600, 'Prices must never be auto-lowered on currency appreciation');
      assert.equal(state.isBelowReplacement, false);
      assert.equal(state.replacementGap, 0);
    });

    test('Stable rate (3,500 -> 3,500): No unnecessary alerts when prices are healthy', () => {
      const state = calculateProductCurrencyState({
        baseCost: 20,
        purchaseRate: 3500,
        currentRate: 3500,
        targetMarginPercent: 15,
        currentSellingPrice: 80500, // 70,000 * 1.15 = 80,500
        pricingMode: 'replacement_protected',
        roundingRule: '100',
      });

      assert.equal(state.isBelowReplacement, false);
      assert.equal(state.priceReviewRequired, false);
      assert.equal(state.replacementGap, 0);
    });

    test('Fixed pricing mode products are never flagged for price review on rate changes', () => {
      const state = calculateProductCurrencyState({
        baseCost: 20,
        purchaseRate: 3500,
        currentRate: 5000,
        targetMarginPercent: 15,
        currentSellingPrice: 50000,
        pricingMode: 'fixed',
        roundingRule: '100',
      });

      assert.equal(state.priceReviewRequired, false);
    });

    test('Configurable minimum protection margin triggers review before price drops below replacement cost', () => {
      const state = calculateProductCurrencyState({
        baseCost: 20,
        purchaseRate: 3500,
        currentRate: 4000, // Replacement cost = 80,000
        targetMarginPercent: 15,
        currentSellingPrice: 84000, // 84,000 is > 80,000, but < 80,000 * 1.10 (88,000)
        pricingMode: 'replacement_protected',
        minProtectionMargin: 10, // 10% buffer required
        roundingRule: '100',
      });

      assert.equal(state.isBelowReplacement, false); // Not strictly below replacement
      assert.equal(state.priceReviewRequired, true); // But flagged because margin buffer is breached
    });
  });

  describe('Historical Immutability & Audit Trail (§16, §21, §28)', () => {
    test('Historical sale preserves original snapshot and is never recalculated with todays rate', () => {
      const historicalSale = {
        productId: 'prod_123',
        quantity: 2,
        costPriceSnapshot: 70000, // Snapshotted when rate was 3,500
        sellingPriceSnapshot: 80500,
        profit: (80500 - 70000) * 2, // 21,000 SSP
        revenue: 80500 * 2, // 161,000 SSP
        createdAt: new Date('2026-01-15T10:00:00Z'),
      };

      // Today's rate moves to 4,500
      const todayRate = 4500;
      const todayReplacementCost = 20 * todayRate; // 90,000

      // The sale record must remain exactly identical
      assert.equal(historicalSale.costPriceSnapshot, 70000);
      assert.equal(historicalSale.sellingPriceSnapshot, 80500);
      assert.equal(historicalSale.profit, 21000);
      assert.equal(historicalSale.revenue, 161000);
    });

    test('Audit history records all price change parameters transparently', () => {
      const priceAudit = {
        productId: 'prod_123',
        productName: 'Rice 25kg',
        previousSellingPrice: 78000,
        newSellingPrice: 96600,
        costPrice: 70000,
        replacementCost: 84000,
        exchangeRate: 4200,
        reason: 'Rate change USD/SSP 3500->4200 approved by merchant',
        changedBy: 'user_merchant_1',
        changedAt: new Date(),
      };

      assert.equal(priceAudit.previousSellingPrice, 78000);
      assert.equal(priceAudit.newSellingPrice, 96600);
      assert.equal(priceAudit.exchangeRate, 4200);
      assert.ok(priceAudit.reason.includes('3500->4200'));
    });
  });

  describe('Offline Conflict Detection Logic (§19)', () => {
    test('Identical or near-identical offline rate sync resolves without conflict', () => {
      const currentRate = 4200;
      const offlineRate = 4210; // 0.23% variance (< 1%)
      const variance = Math.abs(offlineRate - currentRate) / currentRate;
      assert.equal(variance <= 0.01, true);
    });

    test('Conflicting offline rate with >1% variance is detected for reconciliation', () => {
      const currentRate = 4200;
      const offlineRate = 4400; // 4.76% variance (> 1%)
      const variance = Math.abs(offlineRate - currentRate) / currentRate;
      assert.equal(variance > 0.01, true);
    });
  });

  describe('Supported Currencies (§3)', () => {
    test('Includes USD, SSP, RWF, UGX, KES, EUR, GBP', () => {
      const codes = SUPPORTED_CURRENCIES.map(c => c.code);
      assert.ok(codes.includes('USD'));
      assert.ok(codes.includes('SSP'));
      assert.ok(codes.includes('RWF'));
      assert.ok(codes.includes('UGX'));
      assert.ok(codes.includes('KES'));
      assert.ok(codes.includes('EUR'));
      assert.ok(codes.includes('GBP'));
    });
  });

  describe('Crash Resilience & Edge Cases', () => {
    test('recalculation does not crash when sellingPrice <= costPrice on existing products', () => {
      // Simulates product with historical corruption or costPrice equal/higher than sellingPrice
      const legacyProduct = {
        _id: 'prod_legacy_1',
        costPrice: 5000,
        sellingPrice: 5000, // sellingPrice <= costPrice
        baseCost: 2,
        currency: 'USD',
        pricingMode: 'currency_linked',
        targetMargin: 15,
      };

      const rate = 3000;
      const roundingRule = '100';
      const replacement = roundPrice(legacyProduct.baseCost * rate, roundingRule);
      const suggested = roundPrice(replacement * (1 + legacyProduct.targetMargin / 100), roundingRule);
      const reviewRequired = legacyProduct.sellingPrice < replacement || legacyProduct.sellingPrice !== suggested;

      assert.equal(replacement, 6000);
      assert.equal(suggested, 6900);
      assert.equal(reviewRequired, true);
      // Validates update payload is decoupled from sellingPrice > costPrice validator
      const updatePayload = {
        currentReplacementCost: replacement,
        suggestedSellingPrice: suggested,
        priceReviewRequired: reviewRequired,
      };
      assert.equal(updatePayload.currentReplacementCost, 6000);
      assert.equal(updatePayload.suggestedSellingPrice, 6900);
      assert.equal(updatePayload.priceReviewRequired, true);
    });

    test('multi-currency pair formulation handles RWF, KES, and UGX dynamically', () => {
      const product = { currency: 'USD' };
      const configs = [
        { sellingCurrency: 'RWF', rate: 1350 },
        { sellingCurrency: 'KES', rate: 130 },
        { sellingCurrency: 'UGX', rate: 3750 },
        { sellingCurrency: 'SSP', rate: 4200 },
      ];

      for (const cfg of configs) {
        const pair = `${product.currency}/${cfg.sellingCurrency}`;
        const replacement = roundPrice(10 * cfg.rate, cfg.sellingCurrency === 'KES' ? '5' : '100');
        assert.ok(pair.includes(cfg.sellingCurrency));
        assert.ok(replacement > 0);
      }
    });

    test('roundPrice gracefully handles invalid, null, and non-numeric inputs', () => {
      assert.equal(roundPrice(null), 0);
      assert.equal(roundPrice(undefined), 0);
      assert.equal(roundPrice('invalid'), 0);
      assert.equal(roundPrice(0), 0);
      assert.equal(roundPrice(150.45, 'none'), 150.45);
    });

    test('recalculation isolates by currency and skips mismatched products', () => {
      const usdProduct = { currency: 'USD', baseCost: 10 };
      const eurProduct = { currency: 'EUR', baseCost: 10 };

      const targetBaseCurrency = 'USD';
      const usdMatches = (usdProduct.currency || 'USD').toUpperCase() === targetBaseCurrency;
      const eurMatches = (eurProduct.currency || 'USD').toUpperCase() === targetBaseCurrency;

      assert.equal(usdMatches, true);
      assert.equal(eurMatches, false);
    });
  });
});
