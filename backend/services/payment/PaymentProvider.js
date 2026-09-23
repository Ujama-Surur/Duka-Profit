/**
 * Abstract Payment Provider Interface
 */
class PaymentProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Initializes a payment with the provider.
   * @param {Object} params
   * @param {string} params.transactionReference Unique system transaction reference
   * @param {number} params.amount Total amount to be charged
   * @param {string} params.currency Currency code (e.g. 'RWF')
   * @param {Object} params.customer Customer info: { email, name, phone }
   * @param {Object} params.plan Plan info: { name, slug }
   * @param {string} params.redirectUrl Callback URL for redirect after payment
   * @returns {Promise<{ paymentUrl: string, providerRef: string, raw: Object }>}
   */
  async createPayment(params) {
    throw new Error('createPayment method not implemented in provider.');
  }

  /**
   * Directly verifies a transaction with the provider.
   * @param {string} providerTransactionId
   * @returns {Promise<{ isSuccessful: boolean, status: string, amount: number, currency: string, txRef: string, raw: Object }>}
   */
  async verifyPayment(providerTransactionId) {
    throw new Error('verifyPayment method not implemented in provider.');
  }

  /**
   * Validates webhook signature from the provider.
   * @param {Object} req Express request object
   * @returns {boolean}
   */
  validateWebhookSignature(req) {
    throw new Error('validateWebhookSignature method not implemented in provider.');
  }
}

module.exports = PaymentProvider;
