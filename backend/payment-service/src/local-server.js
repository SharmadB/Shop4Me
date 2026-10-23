const express = require('express');
const cors = require('cors');
const { handler } = require('./handler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors());
app.use(express.json());

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
app.use('/api/payments', requireInternalService);

// Request logging
app.use((req, res, next) => {
  console.log(`[PAYMENT LAMBDA LOCAL] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'Shop4Me Payment Service (AWS Lambda)',
    status: 'HEALTHY',
    runtime: 'Node.js 20.x Lambda Environment',
    timestamp: new Date().toISOString()
  });
});

// Adapter routing to Lambda handler
app.post('/api/payments/process', async (req, res) => {
  const lambdaEvent = {
    body: req.body,
    headers: req.headers,
    httpMethod: 'POST',
    path: '/api/payments/process'
  };

  const lambdaResult = await handler(lambdaEvent, {});
  res.status(lambdaResult.statusCode).json(JSON.parse(lambdaResult.body));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`💳 SHOP4ME PAYMENT SERVICE (LAMBDA 1) ON PORT ${PORT}`);
  console.log(`=======================================================`);
});
