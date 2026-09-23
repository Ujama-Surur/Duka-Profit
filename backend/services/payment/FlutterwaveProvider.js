const PaymentProvider = require('./PaymentProvider');

class FlutterwaveProvider extends PaymentProvider {
  constructor() {
    super('flutterwave');
    this.publicKey = process.env.FLW_PUBLIC_KEY || '';
    this.secretKey = process.env.FLW_SECRET_KEY || '';
    this.webhookSecret = process.env.FLW_WEBHOOK_SECRET || '';
    this.baseUrl = 'https://api.flutterwave.com/v3';
    this.isSandbox =
      process.env.PAYMENT_ENVIRONMENT !== 'production' ||
      !this.secretKey ||
      this.secretKey.startsWith('mock_') ||
      this.secretKey === 'your-flutterwave-secret-key';
  }

  /**
   * Initialize Flutterwave standard payment
   */
  async createPayment(params) {
    const { transactionReference, amount, currency, customer, plan, redirectUrl } = params;

    // In sandbox simulation mode (when no live FLW secret key is present)
    if (this.isSandbox && (!this.secretKey || this.secretKey === 'your-flutterwave-secret-key')) {
      const sandboxCheckoutUrl = `${redirectUrl || 'http://localhost:5173/#/payment-verify'}?tx_ref=${encodeURIComponent(
        transactionReference
      )}&transaction_id=SIM-${Date.now()}&status=successful`;

      return {
        paymentUrl: sandboxCheckoutUrl,
        providerRef: `SIM-${Date.now()}`,
        isSimulated: true,
        raw: { message: 'Sandbox payment initialized' },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tx_ref: transactionReference,
          amount,
          currency: currency || 'RWF',
          redirect_url: redirectUrl,
          payment_options: 'card,mobilemoneyrwanda,ussd',
          customer: {
            email: customer.email,
            phonenumber: customer.phone || '',
            name: customer.name || 'Duka Profit Merchant',
          },
          customizations: {
            title: 'Duka Profit Subscription',
            description: `${plan.name} (${amount} ${currency || 'RWF'})`,
            logo: 'https://dukaprofit.com/icon.png',
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to initialize payment with Flutterwave.');
      }

      return {
        paymentUrl: data.data.link,
        providerRef: data.data.link,
        isSimulated: false,
        raw: data,
      };
    } catch (err) {
      console.error('Flutterwave createPayment error:', err);
      throw err;
    }
  }

  /**
   * Verify transaction with Flutterwave API directly
   */
  async verifyPayment(providerTransactionId) {
    if (!providerTransactionId) {
      throw new Error('Transaction ID is required for verification.');
    }

    // Handle simulated sandbox transactions
    if (String(providerTransactionId).startsWith('SIM-') || this.isSandbox && !this.secretKey) {
      return {
        isSuccessful: true,
        status: 'successful',
        amount: null, // Will match expected amount in paymentService
        currency: 'RWF',
        txRef: null,
        providerTransactionId: String(providerTransactionId),
        raw: { status: 'successful', isSimulated: true },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transactions/${providerTransactionId}/verify`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Flutterwave transaction verification failed.');
      }

      const tx = result.data;
      return {
        isSuccessful: tx.status === 'successful',
        status: tx.status,
        amount: tx.amount,
        currency: tx.currency,
        txRef: tx.tx_ref,
        providerTransactionId: String(tx.id),
        paymentMethod: tx.payment_type || 'flutterwave',
        raw: tx,
      };
    } catch (err) {
      console.error('Flutterwave verifyPayment error:', err);
      throw err;
    }
  }

  /**
   * Validate webhook header signature
   */
  validateWebhookSignature(req) {
    if (!this.webhookSecret) {
      // In sandbox mode without configured secret, reject or allow with warning
      return true;
    }
    const signature = req.headers['verif-hash'];
    return signature === this.webhookSecret;
  }
}

module.exports = FlutterwaveProvider;
