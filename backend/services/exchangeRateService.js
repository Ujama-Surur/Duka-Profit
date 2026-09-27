const CurrencySettings = require('../models/CurrencySettings');
const ExchangeRate = require('../models/ExchangeRate');
const PriceChangeHistory = require('../models/PriceChangeHistory');
const Product = require('../models/Product');

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', defaultRounding: 'none' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP', defaultRounding: '100' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RWF', defaultRounding: '50' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', defaultRounding: '100' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', defaultRounding: '5' },
  { code: 'EUR', name: 'Euro', symbol: '€', defaultRounding: 'none' },
  { code: 'GBP', name: 'British Pound', symbol: '£', defaultRounding: 'none' },
];

/**
 * Round a monetary amount according to the configured rounding rule
 */
function roundPrice(amount, roundingRule = 'none') {
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
 * Retrieve or create default currency settings for a user
 */
async function getCurrencySettings(userId) {
  let settings = await CurrencySettings.findOne({ userId });
  if (!settings) {
    try {
      settings = await CurrencySettings.findOneAndUpdate(
        { userId, branchId: 'main' },
        {
          $setOnInsert: {
            userId,
            branchId: 'main',
            isEnabled: false,
            baseCurrency: 'USD',
            sellingCurrency: 'SSP',
            exchangeRateMode: 'manual',
            rateSource: 'manual',
            minProtectionMargin: 0,
            roundingRule: '100',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      // In case of duplicate key race condition, retrieve the created document
      settings = await CurrencySettings.findOne({ userId });
    }
  }
  return settings;
}

/**
 * Update currency settings for a user
 */
async function updateCurrencySettings(userId, updateData) {
  const allowed = [
    'isEnabled',
    'baseCurrency',
    'sellingCurrency',
    'exchangeRateMode',
    'rateSource',
    'minProtectionMargin',
    'roundingRule',
  ];

  const update = {};
  for (const key of allowed) {
    if (updateData[key] !== undefined) {
      update[key] = updateData[key];
    }
  }

  // Validate currencies if provided
  if (update.baseCurrency && !SUPPORTED_CURRENCIES.some(c => c.code === update.baseCurrency.toUpperCase())) {
    throw new Error(`Unsupported base currency: ${update.baseCurrency}`);
  }
  if (update.sellingCurrency && !SUPPORTED_CURRENCIES.some(c => c.code === update.sellingCurrency.toUpperCase())) {
    throw new Error(`Unsupported selling currency: ${update.sellingCurrency}`);
  }

  if (update.baseCurrency) update.baseCurrency = update.baseCurrency.toUpperCase();
  if (update.sellingCurrency) update.sellingCurrency = update.sellingCurrency.toUpperCase();

  const settings = await CurrencySettings.findOneAndUpdate(
    { userId, branchId: 'main' },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  );

  return settings;
}

/**
 * Get active exchange rate for a given currency pair
 */
async function getCurrentRate(userId, baseCurrency = 'USD', targetCurrency = 'SSP') {
  const base = baseCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();

  if (base === target) {
    return {
      rate: 1,
      baseCurrency: base,
      targetCurrency: target,
      status: 'active',
      changePercent: 0,
      effectiveDate: new Date(),
      isIdentical: true,
    };
  }

  const activeRate = await ExchangeRate.findOne({
    userId,
    baseCurrency: base,
    targetCurrency: target,
    status: 'active',
  }).sort({ effectiveDate: -1 });

  return activeRate;
}

/**
 * Record a new exchange rate and trigger recalculations for affected products
 */
async function saveRate(userId, { baseCurrency, targetCurrency, rate, source = 'manual', user = null, offlineSyncId = null, effectiveDate = null, notes = '' }) {
  const numericRate = parseFloat(rate);
  if (isNaN(numericRate) || numericRate <= 0) {
    throw new Error('Exchange rate must be a strictly positive number.');
  }

  const base = String(baseCurrency || 'USD').toUpperCase().trim();
  const target = String(targetCurrency || 'SSP').toUpperCase().trim();

  // Find existing active rate to compute previous rate & change %
  const currentActive = await ExchangeRate.findOne({
    userId,
    baseCurrency: base,
    targetCurrency: target,
    status: 'active',
  }).sort({ effectiveDate: -1 });

  let previousRate = null;
  let changePercent = 0;

  if (currentActive) {
    previousRate = currentActive.rate;
    if (previousRate > 0) {
      changePercent = parseFloat((((numericRate - previousRate) / previousRate) * 100).toFixed(2));
    }
    // Mark previous active rate as superseded
    currentActive.status = 'superseded';
    await currentActive.save();
  }

  // Create new active rate record
  const newRate = await ExchangeRate.create({
    userId,
    baseCurrency: base,
    targetCurrency: target,
    rate: numericRate,
    previousRate,
    changePercent,
    source,
    status: 'active',
    createdBy: user?._id || userId,
    offlineSyncId: offlineSyncId || null,
    effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    notes,
  });

  // Update last rate timestamp in settings
  await CurrencySettings.findOneAndUpdate(
    { userId },
    { $set: { lastRateUpdateAt: newRate.effectiveDate } },
    { upsert: true }
  );

  // Recalculate replacement costs and review flags for products
  const impactedSummary = await recalculateProductCosts(userId, base, target, numericRate);

  return {
    rate: newRate,
    impactedProductsCount: impactedSummary.impactedCount,
    belowReplacementCount: impactedSummary.belowReplacementCount,
  };
}

/**
 * Recalculate replacement costs for products tied to this currency pair
 * CRITICAL RULE: Never automatically modify selling prices!
 */
async function recalculateProductCosts(userId, baseCurrency, targetCurrency, rate) {
  const settings = await getCurrencySettings(userId);
  const roundingRule = settings.roundingRule || '100';
  const minProtectionMargin = settings.minProtectionMargin || 0;

  // Find all active products for this user configured with baseCurrency
  const products = await Product.find({
    userId,
    isActive: true,
    $or: [
      { currency: baseCurrency },
      { baseCost: { $gt: 0 } },
      { pricingMode: { $in: ['currency_linked', 'replacement_protected'] } },
    ],
  });

  let impactedCount = 0;
  let belowReplacementCount = 0;

  for (const product of products) {
    try {
      // Ensure product currency matches baseCurrency (defaulting to baseCurrency if currency is not explicitly specified)
      const prodCurrency = (product.currency || baseCurrency).toUpperCase();
      if (prodCurrency !== baseCurrency) {
        continue;
      }

      const numericBaseCost = parseFloat(product.baseCost || 0);
      if (numericBaseCost > 0) {
        const calculatedReplacement = roundPrice(numericBaseCost * rate, roundingRule);
        const targetMargin = product.targetMargin !== undefined ? parseFloat(product.targetMargin) : 15;
        // Suggested selling price = replacement cost * (1 + margin / 100)
        const calculatedSuggested = roundPrice(calculatedReplacement * (1 + targetMargin / 100), roundingRule);

        const currentSelling = parseFloat(product.sellingPrice || 0);

        // Check if price review is required:
        // Condition 1: Selling price is below current replacement cost
        const isBelowReplacement = currentSelling < calculatedReplacement;

        // Condition 2: Configured minimum protection margin check
        const minSafePrice = calculatedReplacement * (1 + minProtectionMargin / 100);
        const isBelowSafeMargin = currentSelling < minSafePrice;

        // Condition 3: Currency-linked mode where selling price differs from suggested price
        const isCurrencyLinkedDiscrepancy = product.pricingMode === 'currency_linked' && currentSelling !== calculatedSuggested;

        const priceReviewRequired = Boolean(isBelowReplacement || isBelowSafeMargin || isCurrencyLinkedDiscrepancy);

        if (priceReviewRequired) {
          impactedCount++;
          if (isBelowReplacement) {
            belowReplacementCount++;
          }
        }

        // Use updateOne to safely persist replacement cost & review flag
        // without running full document validators on unrelated fields (e.g. historical costPrice/sellingPrice)
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              currentReplacementCost: calculatedReplacement,
              suggestedSellingPrice: calculatedSuggested,
              priceReviewRequired,
            },
          }
        );
      }
    } catch (prodErr) {
      console.error(`Error updating replacement cost for product ${product._id}:`, prodErr);
    }
  }

  return { impactedCount, belowReplacementCount };
}

/**
 * Get products that currently require price review or are below replacement cost
 */
async function getProductsForReview(userId) {
  const products = await Product.find({
    userId,
    isActive: true,
    $or: [
      { priceReviewRequired: true },
      {
        pricingMode: { $in: ['currency_linked', 'replacement_protected'] },
        currentReplacementCost: { $gt: 0 },
      },
    ],
  }).sort({ currentReplacementCost: -1 });

  return products
    .filter(p => {
      const replacementCost = p.currentReplacementCost || 0;
      const sellingPrice = p.sellingPrice || 0;
      return p.priceReviewRequired || (replacementCost > 0 && sellingPrice < replacementCost);
    })
    .map(p => {
      const obj = p.toObject();
    const replacementCost = p.currentReplacementCost || 0;
    const sellingPrice = p.sellingPrice || 0;
    const costPrice = p.costPrice || 0;

    return {
      ...obj,
      isBelowReplacementCost: replacementCost > 0 && sellingPrice < replacementCost,
      replacementGap: replacementCost > sellingPrice ? replacementCost - sellingPrice : 0,
      accountingProfit: sellingPrice - costPrice,
      accountingMargin: sellingPrice > 0 ? (((sellingPrice - costPrice) / sellingPrice) * 100).toFixed(1) : 0,
      replacementAdjustedMargin: sellingPrice > 0 && replacementCost > 0
        ? (((sellingPrice - replacementCost) / sellingPrice) * 100).toFixed(1)
        : null,
    };
  });
}

/**
 * Batch apply approved price changes
 * Atomically updates Product.sellingPrice, clears priceReviewRequired, and logs to PriceChangeHistory
 */
async function applyPriceApprovals(userId, approvals, reason = 'Price review approval', user = null) {
  if (!Array.isArray(approvals) || approvals.length === 0) {
    throw new Error('Approvals array must not be empty.');
  }

  const settings = await getCurrencySettings(userId);
  const targetCurrency = settings.sellingCurrency || 'SSP';

  const results = [];
  const errors = [];

  for (const item of approvals) {
    try {
      const { productId, newPrice } = item;
      const parsedPrice = parseFloat(newPrice);

      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        errors.push({ productId, error: 'Approved price must be a positive number.' });
        continue;
      }

      const product = await Product.findOne({ _id: productId, userId, isActive: true });
      if (!product) {
        errors.push({ productId, error: 'Product not found.' });
        continue;
      }

      // Ensure new selling price is strictly greater than historical cost price
      if (parsedPrice <= product.costPrice && product.costPrice > 0) {
        errors.push({ productId, error: `Approved price (${parsedPrice}) must exceed cost price (${product.costPrice}).` });
        continue;
      }

      const oldSellingPrice = product.sellingPrice;
      product.sellingPrice = parsedPrice;
      product.priceReviewRequired = false;
      product.lastPriceReviewAt = new Date();

      await product.save();

      // Get current exchange rate for audit log
      const activeRate = await getCurrentRate(userId, product.currency || settings.baseCurrency || 'USD', targetCurrency);

      // Create PriceChangeHistory record
      const historyRecord = await PriceChangeHistory.create({
        userId,
        productId: product._id,
        productName: product.productName,
        previousSellingPrice: oldSellingPrice,
        newSellingPrice: parsedPrice,
        costPrice: product.costPrice,
        replacementCost: product.currentReplacementCost,
        exchangeRate: activeRate?.rate || 1,
        currencyPair: `${product.currency || settings.baseCurrency || 'USD'}/${activeRate?.targetCurrency || targetCurrency}`,
        reason: item.reason || reason,
        changedBy: user?._id || userId,
        changedAt: new Date(),
      });

      results.push({
        productId: product._id,
        productName: product.productName,
        previousSellingPrice: oldSellingPrice,
        newSellingPrice: parsedPrice,
        historyId: historyRecord._id,
      });
    } catch (err) {
      errors.push({ productId: item.productId, error: err.message });
    }
  }

  return { successCount: results.length, results, errors };
}

/**
 * Retrieve rate history for a specific currency pair
 */
async function getRateHistory(userId, baseCurrency = 'USD', targetCurrency = 'SSP', limit = 50) {
  const base = baseCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();

  const history = await ExchangeRate.find({
    userId,
    baseCurrency: base,
    targetCurrency: target,
  })
    .sort({ effectiveDate: -1 })
    .limit(limit)
    .populate('createdBy', 'name email')
    .lean();

  return history;
}

/**
 * Generate Currency Impact Report data
 */
async function getCurrencyImpactReport(userId) {
  const settings = await getCurrencySettings(userId);
  const baseCurrency = settings.baseCurrency || 'USD';
  const sellingCurrency = settings.sellingCurrency || 'SSP';

  const activeRate = await getCurrentRate(userId, baseCurrency, sellingCurrency);

  const products = await Product.find({ userId, isActive: true }).lean();

  let totalHistoricalCostValue = 0;
  let totalCurrentReplacementValue = 0;
  let totalCurrentSellingValue = 0;
  let totalStockUnits = 0;
  const belowReplacementProducts = [];
  const rateLinkedProducts = [];

  for (const p of products) {
    const stock = p.stock || 0;
    const costPrice = p.costPrice || 0;
    const replacementCost = p.currentReplacementCost || costPrice;
    const sellingPrice = p.sellingPrice || 0;

    totalStockUnits += stock;
    totalHistoricalCostValue += costPrice * stock;
    totalCurrentReplacementValue += replacementCost * stock;
    totalCurrentSellingValue += sellingPrice * stock;

    if (p.currentReplacementCost > 0 && p.sellingPrice < p.currentReplacementCost) {
      belowReplacementProducts.push({
        _id: p._id,
        productName: p.productName,
        category: p.category,
        stock,
        costPrice,
        sellingPrice,
        replacementCost: p.currentReplacementCost,
        gapPerUnit: p.currentReplacementCost - p.sellingPrice,
        totalGap: (p.currentReplacementCost - p.sellingPrice) * stock,
        suggestedSellingPrice: p.suggestedSellingPrice,
      });
    }

    if (p.pricingMode !== 'fixed') {
      rateLinkedProducts.push({
        _id: p._id,
        productName: p.productName,
        pricingMode: p.pricingMode,
        baseCost: p.baseCost,
        currentReplacementCost: p.currentReplacementCost,
        sellingPrice: p.sellingPrice,
      });
    }
  }

  const replacementGapTotal = totalCurrentReplacementValue > totalCurrentSellingValue
    ? totalCurrentReplacementValue - totalCurrentSellingValue
    : 0;

  return {
    baseCurrency,
    sellingCurrency,
    activeRate: activeRate?.rate || null,
    rateChangePercent: activeRate?.changePercent || 0,
    lastRateUpdate: activeRate?.effectiveDate || null,
    totalProducts: products.length,
    rateLinkedCount: rateLinkedProducts.length,
    belowReplacementCount: belowReplacementProducts.length,
    totalStockUnits,
    valuation: {
      historicalCostValue: totalHistoricalCostValue,
      replacementCostValue: totalCurrentReplacementValue,
      currentSellingValue: totalCurrentSellingValue,
      valueGap: totalCurrentReplacementValue - totalHistoricalCostValue,
      replacementDeficit: replacementGapTotal,
    },
    belowReplacementProducts,
  };
}

/**
 * Retrieve price change audit history
 */
async function getPriceChangeHistory(userId, { productId, limit = 50, page = 1 } = {}) {
  const filter = { userId };
  if (productId) filter.productId = productId;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    PriceChangeHistory.find(filter)
      .sort({ changedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('changedBy', 'name email')
      .lean(),
    PriceChangeHistory.countDocuments(filter),
  ]);

  return { items, total, page, limit };
}

/**
 * Reconcile offline rates queue
 */
async function reconcileOfflineRates(userId, incomingRates, user = null) {
  if (!Array.isArray(incomingRates)) return { synced: 0, conflicts: [] };

  let synced = 0;
  const conflicts = [];

  for (const item of incomingRates) {
    try {
      const { offlineSyncId, rate, baseCurrency, targetCurrency, timestamp } = item;
      
      // Check if already processed by UUID
      if (offlineSyncId) {
        const existing = await ExchangeRate.findOne({ userId, offlineSyncId });
        if (existing) {
          synced++;
          continue;
        }
      }

      // Check current rate for conflict (>1% variance)
      const current = await getCurrentRate(userId, baseCurrency, targetCurrency);
      if (current && Math.abs(current.rate - parseFloat(rate)) / current.rate > 0.01) {
        conflicts.push({
          offlineSyncId,
          incomingRate: parseFloat(rate),
          currentRate: current.rate,
          timestamp,
        });
      }

      await saveRate(userId, {
        baseCurrency,
        targetCurrency,
        rate,
        source: 'offline_sync',
        user,
        offlineSyncId,
        effectiveDate: timestamp,
        notes: 'Synced from offline device',
      });

      synced++;
    } catch (err) {
      console.error('Offline rate sync error:', err);
    }
  }

  return { synced, conflicts };
}

module.exports = {
  SUPPORTED_CURRENCIES,
  roundPrice,
  getCurrencySettings,
  updateCurrencySettings,
  getCurrentRate,
  saveRate,
  recalculateProductCosts,
  getProductsForReview,
  applyPriceApprovals,
  getRateHistory,
  getCurrencyImpactReport,
  getPriceChangeHistory,
  reconcileOfflineRates,
};
