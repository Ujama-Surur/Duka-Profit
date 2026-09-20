const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

describe('Checkout Atomicity & Stock Rollback', () => {
  // Simulates the checkout atomic decrement & rollback algorithm
  async function simulateAtomicCheckout(productsDatabase, cartItems) {
    const decrementedItems = [];
    let failureReason = null;

    for (const item of cartItems) {
      const product = productsDatabase.find(p => p._id === item.productId);
      if (!product) {
        failureReason = { status: 404, message: `Product ${item.productId} not found.` };
        break;
      }

      // Atomic conditional update simulation:
      // In MongoDB: findOneAndUpdate({ _id: item.productId, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } })
      if (product.stock >= item.quantity) {
        product.stock -= item.quantity;
        decrementedItems.push({ productId: item.productId, quantity: item.quantity, product });
      } else {
        failureReason = {
          status: 400,
          message: `Insufficient stock for ${product.productName}.`,
          availableStock: product.stock,
          requestedQuantity: item.quantity,
        };
        break;
      }
    }

    // Rollback if any item failed
    if (failureReason) {
      for (const dec of decrementedItems) {
        const prod = productsDatabase.find(p => p._id === dec.productId);
        if (prod) {
          prod.stock += dec.quantity;
        }
      }
      return { success: false, ...failureReason };
    }

    return { success: true, decrementedItems };
  }

  test('successfully decrements stock for all cart items when sufficient', async () => {
    const db = [
      { _id: 'prod_1', productName: 'Sugar 1kg', stock: 10, sellingPrice: 1500, costPrice: 1200 },
      { _id: 'prod_2', productName: 'Rice 5kg', stock: 5, sellingPrice: 6000, costPrice: 5000 },
    ];

    const cart = [
      { productId: 'prod_1', quantity: 3 },
      { productId: 'prod_2', quantity: 2 },
    ];

    const res = await simulateAtomicCheckout(db, cart);
    assert.equal(res.success, true);
    assert.equal(db[0].stock, 7);
    assert.equal(db[1].stock, 3);
  });

  test('rolls back stock for all previously decremented items when a later item has insufficient stock', async () => {
    const db = [
      { _id: 'prod_1', productName: 'Sugar 1kg', stock: 10, sellingPrice: 1500, costPrice: 1200 },
      { _id: 'prod_2', productName: 'Rice 5kg', stock: 1, sellingPrice: 6000, costPrice: 5000 },
    ];

    const cart = [
      { productId: 'prod_1', quantity: 4 }, // Has 10, will succeed initially
      { productId: 'prod_2', quantity: 3 }, // Has 1, will fail!
    ];

    const res = await simulateAtomicCheckout(db, cart);
    assert.equal(res.success, false);
    assert.equal(res.status, 400);
    assert.match(res.message, /Insufficient stock for Rice 5kg/);

    // Verify rollback: prod_1 MUST be restored back to 10, not left at 6!
    assert.equal(db[0].stock, 10, 'prod_1 stock must be restored to 10 after rollback');
    assert.equal(db[1].stock, 1, 'prod_2 stock must remain at 1');
  });

  test('handles missing products with rollback', async () => {
    const db = [
      { _id: 'prod_1', productName: 'Sugar 1kg', stock: 10, sellingPrice: 1500, costPrice: 1200 },
    ];

    const cart = [
      { productId: 'prod_1', quantity: 2 },
      { productId: 'prod_999_missing', quantity: 1 },
    ];

    const res = await simulateAtomicCheckout(db, cart);
    assert.equal(res.success, false);
    assert.equal(res.status, 404);
    assert.equal(db[0].stock, 10, 'prod_1 must be rolled back to 10');
  });
});
