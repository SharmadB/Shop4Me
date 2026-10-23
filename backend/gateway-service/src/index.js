const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured and at least 32 characters long.');
}

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

// Service routes configuration
const SERVICES = {
  catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:5001',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:5002',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:5003',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005',
};

// Demo users are configured through environment variables.
// Passwords are hashed before being stored in memory.
const users = [];

if (process.env.DEMO_ADMIN_EMAIL && process.env.DEMO_ADMIN_PASSWORD) {
  users.push({
    id: 'usr_admin_01',
    name: 'Shop4Me Admin',
    email: process.env.DEMO_ADMIN_EMAIL.trim().toLowerCase(),
    password: bcrypt.hashSync(process.env.DEMO_ADMIN_PASSWORD, 12),
    role: 'admin',
    createdAt: new Date().toISOString()
  });
}

if (process.env.DEMO_CUSTOMER_EMAIL && process.env.DEMO_CUSTOMER_PASSWORD) {
  users.push({
    id: 'usr_customer_01',
    name: 'Demo Customer',
    email: process.env.DEMO_CUSTOMER_EMAIL.trim().toLowerCase(),
    password: bcrypt.hashSync(process.env.DEMO_CUSTOMER_PASSWORD, 12),
    role: 'customer',
    createdAt: new Date().toISOString()
  });
}

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { status: 'error', message: 'Too many requests from this IP, please try again later.' }
});

app.use(cors());
app.use(limiter);
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[GATEWAY] ${new Date().toISOString()} | ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'Shop4Me API Gateway',
    status: 'HEALTHY',
    timestamp: new Date().toISOString()
  });
});

// Authentication Endpoints
app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }
  if (typeof email !== 'string' || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name and email must be valid text values.' });
  }

  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name,
    email,
    password: bcrypt.hashSync(password, 12),
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Authentication successful',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

// Authentication and authorization helpers.
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    req.authUser = user;
  }
  next();
};

const requireAuth = (req, res, next) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  req.authUser = user;
  next();
};

const requireAdmin = (req, res, next) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  req.authUser = user;
  next();
};

// Generic reverse-proxy dispatcher. Internal service URLs are not returned to clients.
const proxyRequest = async (targetServiceUrl, targetPath, req, res) => {
  const user = req.authUser || null;
  const serviceName = Object.keys(SERVICES).find(
    key => SERVICES[key] === targetServiceUrl
  ) || 'downstream';

  const url = `${targetServiceUrl}${targetPath}`;
  console.log(`[PROXY] ${req.method} -> ${serviceName}${targetPath}`);

  const headers = { ...req.headers };
  delete headers.host;
  delete headers['content-length'];
  delete headers.authorization;
  delete headers['x-user-id'];
  delete headers['x-user-email'];
  delete headers['x-user-role'];
  delete headers['x-user-name'];
  delete headers['x-internal-service-secret'];
  headers['x-internal-service-secret'] = INTERNAL_SERVICE_SECRET;

  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-email'] = user.email;
    headers['x-user-role'] = user.role;
    headers['x-user-name'] = user.name;
  }

  try {
    const options = { method: req.method, headers };

    if (['POST', 'PUT', 'PATCH'].includes(req.method) &&
        req.body && Object.keys(req.body).length > 0) {
      options.body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');

    res.status(response.status);
    if (contentType && contentType.includes('application/json')) {
      return res.json(await response.json());
    }
    return res.send(await response.text());
  } catch (error) {
    console.error(`[PROXY ERROR] ${serviceName} unavailable: ${error.message}`);
    return res.status(503).json({
      error: 'Downstream Service Unavailable',
      message: 'The requested service is temporarily unavailable.'
    });
  }
};

// Catalog reads are public; changes require an administrator.
app.use('/api/catalog', optionalAuth, (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return requireAdmin(req, res, () =>
      proxyRequest(SERVICES.catalog, `/api/catalog${req.url}`, req, res)
    );
  }
  return proxyRequest(SERVICES.catalog, `/api/catalog${req.url}`, req, res);
});

// Guest carts remain supported. If a token is supplied, it must be valid.
app.use('/api/cart', optionalAuth, (req, res) =>
  proxyRequest(SERVICES.cart, `/api/cart${req.url}`, req, res)
);

// Guest checkout remains available; order history requires authentication.
// Status changes are administrator-only.
app.use('/api/orders', (req, res, next) => {
  const path = req.path;
  if (req.method === 'POST' && path === '/checkout') {
    return optionalAuth(req, res, () =>
      proxyRequest(SERVICES.order, `/api/orders${req.url}`, req, res)
    );
  }

  if (req.method === 'PUT' && /^\/[^/]+\/status\/?$/.test(path)) {
    return requireAdmin(req, res, () =>
      proxyRequest(SERVICES.order, `/api/orders${req.url}`, req, res)
    );
  }

  return requireAuth(req, res, () =>
    proxyRequest(SERVICES.order, `/api/orders${req.url}`, req, res)
  );
});

// These internal workflows must not be invoked directly through the public gateway.
app.use('/api/payments', (req, res) =>
  res.status(403).json({ error: 'Direct payment-service access is not allowed.' })
);
app.use('/api/notifications', (req, res) =>
  res.status(403).json({ error: 'Direct notification-service access is not allowed.' })
);

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 SHOP4ME API GATEWAY RUNNING ON PORT ${PORT}`);
  console.log(`🔗 Catalog Service:      ${SERVICES.catalog}`);
  console.log(`🔗 Cart Service:         ${SERVICES.cart}`);
  console.log(`🔗 Order Service:        ${SERVICES.order}`);
  console.log(`🔗 Payment Service:      ${SERVICES.payment}`);
  console.log(`🔗 Notification Service: ${SERVICES.notification}`);
  console.log(`=======================================================`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use by another process.`);
  } else {
    console.error('Server error:', err);
  }
});
