# Shop4Me — Microservices E-Commerce Platform

Shop4Me is a full-stack e-commerce demonstration built with React, Node.js, Express, and a microservices-style backend. It includes a customer storefront, an admin dashboard, an API gateway, and separate catalog, cart, order, payment, and notification services.

The project is intended for hands-on learning, local testing, and demonstrating application architecture and service-to-service communication.

> **Project status:** Local development has been tested. Production deployment to AWS has not been verified or documented as complete.

## Features

- Customer storefront with product listings and shopping-cart UI
- Admin dashboard with product and order management interfaces
- API gateway for routing requests to backend services
- Separate services for catalog, cart, orders, payments, and notifications
- Internal-service authentication using a shared secret
- Local HTTP adapters for payment and notification handler code
- React production builds using Vite

Some operations use simulated or in-memory behavior. A successful UI interaction does not, by itself, establish production-grade payment processing, durable order storage, or deployment readiness.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express
- **Authentication:** JWT and role-based access controls where configured
- **Service communication:** HTTP/REST
- **Catalog data:** MongoDB/Mongoose integration is present in the backend
- **Local tooling:** npm and Node.js

## Architecture

```text
Customer Storefront          Admin Dashboard
      :5173                       :5174
         \                         /
          \                       /
             API Gateway :5000
                    |
      +-------------+-------------+
      |             |             |
   Catalog         Cart          Order
   :5001           :5002         :5003
                                  |
                         +--------+--------+
                         |                 |
                      Payment          Notification
                       :5004              :5005
                    local adapter      local adapter
```

The diagram represents the local service layout, not a verified production deployment topology.

## Service Registry

| Component | Local port | Purpose |
|---|---:|---|
| API Gateway | 5000 | Entry point for frontend API requests |
| Catalog Service | 5001 | Product and category operations |
| Cart Service | 5002 | Shopping-cart operations |
| Order Service | 5003 | Order workflow |
| Payment Service | 5004 | Local payment adapter |
| Notification Service | 5005 | Local notification adapter |
| Storefront | 5173 | Customer-facing React app |
| Admin Dashboard | 5174 | Administrative React app |

Frontend API requests should go through the gateway where the application is configured to do so. Direct access to protected internal-service endpoints is expected to be rejected.

## Repository Structure

```text
.
├── README.md
├── DEPLOYMENT.md
├── .gitignore
├── start-all.js
├── cleanup-ports.js
├── frontend/
│   ├── storefront/
│   └── admin-dashboard/
└── backend/
    ├── gateway-service/
    ├── catalog-service/
    ├── cart-service/
    ├── order-service/
    ├── payment-service/
    └── notification-service/
```

## Local Development

### Prerequisites

- Node.js and npm
- A terminal
- A browser
- Any external database or service required by your chosen local configuration

Install dependencies in each backend service and each frontend directory, if they are not already installed:

```bash
cd ~/shopitry/backend/gateway-service && npm install
cd ~/shopitry/backend/catalog-service && npm install
cd ~/shopitry/backend/cart-service && npm install
cd ~/shopitry/backend/order-service && npm install
cd ~/shopitry/backend/payment-service && npm install
cd ~/shopitry/backend/notification-service && npm install
cd ~/shopitry/frontend/storefront && npm install
cd ~/shopitry/frontend/admin-dashboard && npm install
```

Configure each service's required environment variables in its local `.env` file before starting the application. Use the variable names expected by that service's source code. Supply your own credentials and strong secrets; never commit `.env` files.

### Start the backend

In a terminal:

```bash
cd ~/shopitry
node start-all.js
```

Keep this terminal running.

### Start the storefront

In a second terminal:

```bash
cd ~/shopitry/frontend/storefront
npm run dev
```

Open http://localhost:5173

### Start the admin dashboard

In a third terminal:

```bash
cd ~/shopitry/frontend/admin-dashboard
npm run dev
```

Open http://localhost:5174

Use credentials configured for your local environment. Do not rely on credentials copied from old documentation.

## Build Checks

Run the frontend production builds:

```bash
cd ~/shopitry/frontend/storefront
npm run build

cd ~/shopitry/frontend/admin-dashboard
npm run build
```

These commands build the frontend assets. They do not deploy the application.

## Security Notes

- Keep `.env` files, database connection strings, JWT secrets, and internal-service secrets private.
- Use unique, strong secrets for local and production environments.
- Do not expose internal service ports publicly in a production environment.
- The payment adapter is not evidence of integration with a real payment provider.
- Review authentication, authorization, input validation, persistence, and deployment configuration before production use.

## Deployment Status

AWS hosting, public production URLs, and production infrastructure have not been verified as part of the documented local checks. See [DEPLOYMENT.md](DEPLOYMENT.md) for the current status and next steps.
