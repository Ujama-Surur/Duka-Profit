const crypto = require('crypto');
const Payment = require('../../models/Payment');
const Subscription = require('../../models/Subscription');
const SubscriptionPlan = require('../../models/SubscriptionPlan');
const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');
const FlutterwaveProvider = require('./FlutterwaveProvider');

class PaymentService {
  constructor() {
    this.providers = {
      flutterwave: new FlutterwaveProvider(),
    };
    this.defaultProvider = 'flutterwave';
  }

  getProvider(providerName) {
    const provider = this.providers[providerName || this.defaultProvider];
    if (!provider) {
      throw new Error(`Unsupported payment provider: ${providerName}`);
    }
    return provider;
  }

  /**
   * Generates a collision-resistant unique transaction reference.
   * Example: DP-1718000000000-A1B2C3D4
   */
  generateTransactionReference() {
    const timestamp = Date.now();
    const entropy = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `DP-${timestamp}-${entropy}`;
  }

  /**
   * Initiates payment for a chosen plan.
   * Price and duration are ALWAYS resolved from database, never from frontend.
   */
  async initiatePayment({ userId, planId, customerPhone, redirectUrl, providerName, ipAddress }) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      throw new Error('The selected subscription plan is currently unavailable.');
    }

    // Free plan: directly assign without gateway transaction
    if (plan.price === 0) {
      const now = new Date();
      const endDate = new Date(now.getTime() + (plan.durationDays || 3650) * 24 * 60 * 60 * 1000);

      const sub = await Subscription.create({
        userId: user._id,
        planId: plan._id,
        status: 'ACTIVE',
        startDate: now,
        endDate,
        source: 'DEFAULT_FREE',
        provider: 'free_tier',
      });

      user.currentSubscription = sub._id;
      user.subscriptionStatus = 'ACTIVE';
      await user.save();

      await AuditLog.create({
        userId: user._id,
        action: 'SUBSCRIPTION_ACTIVATED',
        subscriptionId: sub._id,
        ipAddress,
        metadata: { planName: plan.name, planSlug: plan.slug, isFree: true },
      });

      return {
        isFree: true,
        success: true,
        message: 'Free Starter plan activated successfully.',
        subscription: sub,
      };
    }

    // Update user phone if provided
    if (customerPhone && customerPhone.trim() && user.phone !== customerPhone.trim()) {
      user.phone = customerPhone.trim();
      await user.save();
    }

    const transactionReference = this.generateTransactionReference();
    const provider = this.getProvider(providerName);

    // Create PENDING payment record
    const payment = await Payment.create({
      userId: user._id,
      planId: plan._id,
      provider: provider.name,
      transactionReference,
      amount: plan.price,
      currency: plan.currency || 'RWF',
      paymentMethod: 'mobilemoneyrwanda',
      status: 'PENDING',
      metadata: {
        customerEmail: user.email,
        customerName: user.name,
        customerPhone: user.phone || customerPhone,
        planName: plan.name,
        planSlug: plan.slug,
        durationDays: plan.durationDays,
      },
    });

    await AuditLog.create({
      userId: user._id,
      action: 'PAYMENT_CREATED',
      paymentId: payment._id,
      ipAddress,
      metadata: { transactionReference, amount: plan.price, currency: plan.currency },
    });

    // Request checkout session from provider
    const checkoutResult = await provider.createPayment({
      transactionReference,
      amount: plan.price,
      currency: plan.currency || 'RWF',
      customer: {
        email: user.email,
        name: user.name,
        phone: user.phone || customerPhone,
      },
      plan: {
        name: plan.name,
        slug: plan.slug,
      },
      redirectUrl,
    });

    return {
      paymentId: payment._id,
      transactionReference,
      paymentUrl: checkoutResult.paymentUrl,
      amount: plan.price,
      currency: plan.currency || 'RWF',
      planName: plan.name,
      isSimulated: checkoutResult.isSimulated || false,
    };
  }

  /**
   * Verifies payment directly with the provider, enforces idempotency,
   * and activates or cumulatively extends the subscription.
   */
  async verifyAndProcessPayment(txRef, providerTransactionId, ipAddress) {
    if (!txRef) {
      throw new Error('Transaction reference is required for verification.');
    }

    const payment = await Payment.findOne({ transactionReference: txRef })
      .populate('planId')
      .populate('userId');

    if (!payment) {
      throw new Error('Payment record not found.');
    }

    // STRICT IDEMPOTENCY: If payment was already verified successfully, return existing result.
    // Do NOT extend subscription a second time!
    if (payment.status === 'SUCCESS') {
      const existingSub = await Subscription.findById(payment.subscriptionId).populate('planId');
      return {
        success: true,
        alreadyProcessed: true,
        payment,
        subscription: existingSub,
        message: 'Payment already verified and processed.',
      };
    }

    const provider = this.getProvider(payment.provider);
    const verifyTargetId = providerTransactionId || payment.providerTransactionId || txRef;

    const verificationResult = await provider.verifyPayment(verifyTargetId);

    if (!verificationResult.isSuccessful) {
      payment.status = 'FAILED';
      payment.failureReason = verificationResult.raw?.message || 'Payment not successful';
      payment.providerStatus = verificationResult.status;
      await payment.save();

      await AuditLog.create({
        userId: payment.userId._id,
        action: 'PAYMENT_FAILED',
        paymentId: payment._id,
        ipAddress,
        metadata: { reason: payment.failureReason, verificationResult },
      });

      throw new Error(`Payment verification failed: ${payment.failureReason}`);
    }

    // Security check: Validate amount and currency match
    if (verificationResult.amount !== null && verificationResult.amount !== undefined) {
      if (Number(verificationResult.amount) < payment.amount) {
        payment.status = 'FAILED';
        payment.failureReason = `Amount mismatch: expected ${payment.amount}, received ${verificationResult.amount}`;
        await payment.save();
        throw new Error(payment.failureReason);
      }
    }

    if (verificationResult.currency && verificationResult.currency.toUpperCase() !== payment.currency.toUpperCase()) {
      payment.status = 'FAILED';
      payment.failureReason = `Currency mismatch: expected ${payment.currency}, received ${verificationResult.currency}`;
      await payment.save();
      throw new Error(payment.failureReason);
    }

    // Mark payment SUCCESS
    payment.status = 'SUCCESS';
    payment.paidAt = new Date();
    payment.providerStatus = verificationResult.status;
    payment.providerTransactionId = verificationResult.providerTransactionId || providerTransactionId;
    if (verificationResult.paymentMethod) {
      payment.paymentMethod = verificationResult.paymentMethod;
    }

    const now = new Date();
    const plan = payment.planId;
    const durationDays = plan.durationDays || 30;

    // Check for existing active or expiring subscription to extend cumulatively
    const existingSub = await Subscription.findOne({
      userId: payment.userId._id,
      status: { $in: ['ACTIVE', 'TRIAL', 'EXPIRING_SOON'] },
      endDate: { $gt: now },
    }).sort({ endDate: -1 });

    let finalSubscription;
    let actionType = 'SUBSCRIPTION_ACTIVATED';

    if (existingSub) {
      // User renewing early: extend from existing endDate
      const newEndDate = new Date(existingSub.endDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
      existingSub.endDate = newEndDate;
      existingSub.planId = plan._id;
      existingSub.status = 'ACTIVE';
      existingSub.currentPaymentId = payment._id;
      existingSub.source = 'PAYMENT';
      await existingSub.save();
      finalSubscription = existingSub;
      actionType = 'SUBSCRIPTION_RENEWED';
    } else {
      // New subscription or re-activation from expired state
      const startDate = now;
      const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      finalSubscription = await Subscription.create({
        userId: payment.userId._id,
        planId: plan._id,
        status: 'ACTIVE',
        startDate,
        endDate,
        currentPaymentId: payment._id,
        source: 'PAYMENT',
        provider: payment.provider,
      });
    }

    // Attach subscription to payment and user
    payment.subscriptionId = finalSubscription._id;
    await payment.save();

    await User.findByIdAndUpdate(payment.userId._id, {
      currentSubscription: finalSubscription._id,
      subscriptionStatus: 'ACTIVE',
    });

    await AuditLog.create({
      userId: payment.userId._id,
      action: 'PAYMENT_SUCCESS',
      paymentId: payment._id,
      subscriptionId: finalSubscription._id,
      ipAddress,
      metadata: {
        amount: payment.amount,
        currency: payment.currency,
        planSlug: plan.slug,
        txRef,
        providerTransactionId: payment.providerTransactionId,
      },
    });

    await AuditLog.create({
      userId: payment.userId._id,
      action: actionType,
      paymentId: payment._id,
      subscriptionId: finalSubscription._id,
      ipAddress,
      metadata: {
        startDate: finalSubscription.startDate,
        endDate: finalSubscription.endDate,
        planName: plan.name,
      },
    });

    return {
      success: true,
      alreadyProcessed: false,
      payment,
      subscription: finalSubscription,
      message: 'Subscription successfully activated!',
    };
  }

  /**
   * Process incoming Flutterwave Webhook
   */
  async handleWebhook(req) {
    const provider = this.getProvider('flutterwave');
    const isValid = provider.validateWebhookSignature(req);
    if (!isValid) {
      throw new Error('Invalid webhook signature.');
    }

    const { event, data } = req.body || {};
    if (event !== 'charge.completed' || !data) {
      return { ignored: true, message: 'Event ignored.' };
    }

    const txRef = data.tx_ref;
    const providerTransactionId = data.id;

    const result = await this.verifyAndProcessPayment(
      txRef,
      providerTransactionId,
      req.ip || req.connection.remoteAddress
    );

    return result;
  }
}

module.exports = new PaymentService();
