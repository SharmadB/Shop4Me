const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003;

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET;
if (!INTERNAL_SERVICE_SECRET || INTERNAL_SERVICE_SECRET.length < 64) {
  throw new Error('INTERNAL_SERVICE_SECRET must be configured and at least 64 characters long.');
}
const requireInternalService = (req, res, next) => {
  if (req.headers['x-internal-service-secret'] !== INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ error: 'Direct service access is not allowed.' });
  }
  next();
};

const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:5002';
const CATALOG_SERVICE_URL = process.env.CATALOG_SERVICE_URL || 'http://localhost:5001';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005';

app.use(cors());
app.use(express.json());
app.use('/api/orders', requireInternalService);

// In-Memory Orders Store with Initial Seed Data
const inMemoryOrders = [
  {
    id: 'ord_1001',
    userId: 'usr_customer_01',
    customerName: 'Elena Rostova',
    customerEmail: 'elena@example.com',
    items: [
      {
        productId: 'prod_01',
        name: 'Aether Studio Pro Noise-Canceling Headphones',
        price: 349.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
      }
    ],
    shippingAddress: {
      street: '742 Evergreen Terrace',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'USA'
    },
    totals: {
      subtotal: 349.99,
      tax: 28.00,
      shipping: 0.00,
      total: 377.99
    },
    paymentStatus: 'PAID',
    orderStatus: 'DELIVERED',
    paymentMethod: 'Credit Card (**** 4242)',
    transactionId: 'txn_mock_994821',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'ord_1002',
    userId: 'usr_customer_01',
    customerName: 'Elena Rostova',
    customerEmail: 'elena@example.com',
    items: [
      {
        productId: 'prod_03',
        name: 'NeuralKey Pro Custom Mechanical Keyboard',
        price: 189.50,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80'
      },
      {
        productId: 'prod_05',
        name: 'Titanium Flux MagSafe Power Bank 20000mAh',
        price: 89.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1609592424074-b52b57b9c3f1?auto=format&fit=crop&w=800&q=80'
      }
    ],
    shippingAddress: {
      street: '742 Evergreen Terrace',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94107',
      country: 'USA'
    },
    totals: {
      subtotal: 279.49,
      tax: 22.36,
      shipping: 0.00,
      total: 301.85
    },
    paymentStatus: 'PAID',
    orderStatus: 'PROCESSING',
    paymentMethod: 'Apple Pay',
    transactionId: 'txn_mock_881923',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

// Request Logger
app.use((req, res, next) => {
  console.log(`[ORDER SERVICE] ${req.method} ${req.originalUrl}`);
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'Shop4Me Order Management Service',
    status: 'HEALTHY',
    totalOrders: inMemoryOrders.length,
    timestamp: new Date().toISOString()
  });
});

// GET All Orders (Admin gets all, Customer gets theirs)
app.get('/api/orders', (req, res) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  let result = [...inMemoryOrders];

  if (userRole !== 'admin') {
    result = result.filter(o => o.userId === userId || o.customerEmail === req.headers['x-user-email']);
  }

  // Sort by newest first
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    status: 'success',
    count: result.length,
    data: result
  });
});

// GET Order by ID — owner or admin only
app.get('/api/orders/:id', (req, res) => {
  const order = inMemoryOrders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];
  const userRole = req.headers['x-user-role'];

  if (userRole !== 'admin' &&
      (!userId || (order.userId !== userId &&
       (!userEmail || order.customerEmail?.toLowerCase() !== userEmail.toLowerCase())))) {
    return res.status(403).json({ error: 'You are not allowed to view this order.' });
  }

  res.json({ status: 'success', data: order });
});

// POST Process Checkout & Create Order
app.post('/api/orders/checkout', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'usr_guest_' + require('crypto').randomUUID();
    const userEmail = req.headers['x-user-email'] || req.body.customerEmail || 'guest@shop4me.local';
    const userName = req.headers['x-user-name'] || req.body.customerName || 'Valued Customer';
    const { items, shippingAddress, paymentMethod = 'Credit Card' } = req.body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ error: 'Checkout requires between 1 and 50 items.' });
    }

    if (!shippingAddress ||
        typeof shippingAddress.street !== 'string' || !shippingAddress.street.trim() ||
        typeof shippingAddress.city !== 'string' || !shippingAddress.city.trim()) {
      return res.status(400).json({ error: 'Valid shipping street and city are required.' });
    }

    // Never trust prices, names, or stock quantities supplied by the browser.
    const verifiedItems = [];
    for (const item of items) {
      const productId = item?.productId || item?.id;
      const quantity = item?.quantity;

      if (typeof productId !== 'string' || !productId.trim() ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return res.status(400).json({
          error: 'Each item must have a valid product ID and an integer quantity between 1 and 99.'
        });
      }

      let catalogRes;
      try {
        catalogRes = await fetch(
          `${CATALOG_SERVICE_URL}/api/catalog/products/${encodeURIComponent(productId)}`, {
            headers: { 'x-internal-service-secret': INTERNAL_SERVICE_SECRET },
            signal: AbortSignal.timeout(10000)
          }
        );
      } catch {
        return res.status(503).json({ error: 'Catalog service is unavailable. Please try again.' });
      }

      if (catalogRes.status === 404) {
        return res.status(400).json({ error: `Product "${productId}" is not available in the catalog.` });
      }
      if (!catalogRes.ok) {
        return res.status(503).json({ error: 'Unable to verify catalog products. Please try again.' });
      }

      let catalogPayload;
      try {
        catalogPayload = await catalogRes.json();
      } catch {
        return res.status(502).json({ error: 'Catalog service returned an invalid response.' });
      }

      const product = catalogPayload?.data;
      if (!product || typeof product.price !== 'number' ||
          !Number.isFinite(product.price) || product.price < 0) {
        return res.status(502).json({ error: 'Catalog returned invalid product information.' });
      }

      if (Number.isFinite(product.stock) && product.stock < quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${product.name}". Available: ${product.stock}.`
        });
      }

      verifiedItems.push({
        productId: product.id || productId,
        name: product.name,
        price: product.price,
        quantity,
        image: product.image || ''
      });
    }

    const subtotal = Number(verifiedItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    ).toFixed(2));
    const tax = Number((subtotal * 0.08).toFixed(2));
    const shipping = subtotal > 150 ? 0 : 15;
    const total = Number((subtotal + tax + shipping).toFixed(2));
    const orderId = `ord_${require('crypto').randomUUID()}`;

    // The order is not created unless the payment service explicitly approves it.
    let paymentRes;
    try {
      paymentRes = await fetch(`${PAYMENT_SERVICE_URL}/api/payments/process`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-service-secret': INTERNAL_SERVICE_SECRET
        },
        body: JSON.stringify({
          orderId,
          amount: total,
          currency: 'USD',
          paymentMethod
        }),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      return res.status(502).json({
        error: 'Payment service is unavailable. No order was created; please verify payment status before retrying.'
      });
    }

    let payData;
    try {
      payData = await paymentRes.json();
    } catch {
      return res.status(502).json({ error: 'Payment service returned an invalid response. No order was created.' });
    }

    if (!paymentRes.ok || payData?.status !== 'APPROVED' || !payData.transactionId) {
      return res.status(402).json({
        error: 'Payment was not approved. No order was created.',
        paymentStatus: 'FAILED'
      });
    }

    const newOrder = {
      id: orderId,
      userId,
      customerName: userName,
      customerEmail: userEmail,
      items: verifiedItems,
      shippingAddress,
      totals: { subtotal, tax, shipping, total },
      paymentStatus: 'PAID',
      orderStatus: 'PROCESSING',
      paymentMethod,
      transactionId: payData.transactionId,
      createdAt: new Date().toISOString()
    };

    inMemoryOrders.unshift(newOrder);

    // Notifications are best-effort; notification failure does not undo checkout.
    fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/send`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-service-secret': INTERNAL_SERVICE_SECRET
      },
      body: JSON.stringify({
        type: 'ORDER_CONFIRMATION',
        recipientEmail: userEmail,
        recipientName: userName,
        orderId: newOrder.id,
        totalAmount: newOrder.totals.total
      }),
      signal: AbortSignal.timeout(5000)
    }).catch(err => console.warn('[ORDER SERVICE] Notification failed:', err.message));

    fetch(`${CART_SERVICE_URL}/api/cart`, {
      method: 'DELETE',
      headers: {
        'x-internal-service-secret': INTERNAL_SERVICE_SECRET,
        'x-user-id': userId,
        ...(req.headers['x-session-id']
          ? { 'x-session-id': req.headers['x-session-id'] }
          : {})
      },
      signal: AbortSignal.timeout(5000)
    }).catch(() => {});

    return res.status(201).json({
      status: 'success',
      message: 'Order created and processed successfully!',
      data: newOrder
    });
  } catch (error) {
    console.error('[ORDER SERVICE] Checkout failed:', error.message);
    return res.status(500).json({ error: 'Failed to process checkout. Please try again.' });
  }
});

// PUT Update Order Status (Admin pipeline control)
app.put('/api/orders/:id/status', (req, res) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required.' });
  }

  const { orderStatus } = req.body;
  const allowedStatuses = ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  if (!allowedStatuses.includes(orderStatus)) {
    return res.status(400).json({
      error: 'Invalid order status.',
      allowedStatuses
    });
  }

  const order = inMemoryOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  order.orderStatus = orderStatus;
  order.updatedAt = new Date().toISOString();

  fetch(`${NOTIFICATION_SERVICE_URL}/api/notifications/send`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-internal-service-secret': INTERNAL_SERVICE_SECRET
    },
    body: JSON.stringify({
      type: 'ORDER_STATUS_UPDATE',
      recipientEmail: order.customerEmail,
      recipientName: order.customerName,
      orderId: order.id,
      newStatus: orderStatus
    }),
    signal: AbortSignal.timeout(5000)
  }).catch(() => {});

  return res.json({
    status: 'success',
    message: `Order ${order.id} status updated to ${orderStatus}`,
    data: order
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`📦 SHOP4ME ORDER SERVICE RUNNING ON PORT ${PORT}`);
  console.log(`=======================================================`);
});
