# Shop4Me — Microservices E-Commerce Platform

Shop4Me is a full-stack e-commerce demonstration built with React, Node.js, and Express. It includes a customer storefront, an admin dashboard, an API gateway, and separate catalog, cart, order, payment, and notification services.

The project has been deployed to AWS EC2 and tested through its public web interface. It demonstrates frontend hosting, Nginx reverse proxying, service-to-service HTTP communication, and an end-to-end **simulated checkout workflow**.

> **Project status:** AWS demo deployment verified. This is a learning/demo project, not a production-ready e-commerce platform.

## Live Demo

- **Customer storefront:** http://13.201.186.173/
- **Admin dashboard:** http://13.201.186.173/admin/

The demo currently uses HTTP and a public IP address. Do not submit real credentials or sensitive information.

## Features

- Customer storefront with product listings and shopping cart
- Checkout workflow and order history
- Admin dashboard with administrative interfaces
- API gateway for routing frontend requests
- Separate catalog, cart, order, payment, and notification services
- Shared-secret authentication for internal service requests where configured
- React production builds using Vite
- AWS EC2 hosting with Nginx serving the frontend assets and proxying API requests

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express
- **Authentication:** JWT and role-based access controls where configured
- **Service communication:** HTTP/REST
- **Infrastructure:** AWS EC2, security groups, Nginx, PM2
- **Database integration:** MongoDB/Mongoose support in the catalog service
- **Development tooling:** npm, Node.js, Git

## Architecture

```text
Customer Browser
       |
       v
AWS EC2 — Gateway Host
  Nginx :80
       |
       +---- Storefront static files
       |
       +---- /admin/ --> Admin Dashboard files
       |
       +---- /api/ and /health
                    |
                    v
             API Gateway :5000
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
     Catalog      Cart        Orders
     :5001        :5002        :5003
                                |
                       +--------+--------+
                       |                 |
                       v                 v
                    Payment         Notification
                    :5004              :5005
                 local HTTP         local HTTP
                   adapter            adapter

        Backend services hosted on AWS EC2
```

The diagram summarizes the application request flow. Payment and notification are local HTTP adapters hosted on EC2; they should not be interpreted as verified AWS Lambda or SNS integrations.

## Service Registry

| Component | Port | Purpose |
|---|---:|---|
| Nginx | 80 | Serves frontend assets and proxies requests |
| API Gateway | 5000 | Routes frontend API requests |
| Catalog Service | 5001 | Product and category operations |
| Cart Service | 5002 | Shopping-cart operations |
| Order Service | 5003 | Order workflow |
| Payment Service | 5004 | Simulated payment adapter |
| Notification Service | 5005 | Notification adapter |

The backend ports are intended for service communication, not unrestricted public access.

## Deployment Verification

The following were verified during the AWS demo deployment:

- The storefront and admin dashboard were accessible through the gateway EC2 public IP.
- Nginx served the frontend assets and proxied API requests.
- Backend services were running under PM2 at the time of the checks.
- Catalog products could be retrieved through the application.
- Cart and checkout interactions completed successfully.
- A checkout generated a transaction reference and displayed a paid status.
- The resulting order appeared in the order history with a `PROCESSING` status.
- Internal payment and notification health endpoints responded after network access was configured between the relevant instances.
- Both React frontends completed their Vite production builds.

These checks verify a working demonstration flow, not production reliability or real payment settlement.

## Important Limitations

- **Simulated payment:** The payment adapter does not establish integration with a real payment provider or actual money movement.
- **Persistence:** The catalog service was observed using its in-memory fallback because a MongoDB connection was not active. Do not assume catalog or order data will survive process restarts.
- **Notifications:** The notification adapter is running locally on EC2. Actual SNS publishing or email delivery has not been independently verified.
- **Transport security:** The public demo uses HTTP rather than HTTPS.
- **Operations:** Production-grade monitoring, backups, high availability, disaster recovery, and a complete security review have not been established.

Do not use this deployment to process real payments or store sensitive customer information.

## Repository Structure

```text
.
├── README.md
├── DEPLOYMENT.md
├── .gitignore
├── .deploy/
│   ├── bootstrap-gateway.sh
│   └── bootstrap-backend.sh
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

The scripts under `.deploy/` bootstrap host packages and directories; they are not a complete automated application deployment pipeline.

## Local Development

### Prerequisites

- Node.js and npm
- A terminal and browser
- Environment variables and any external services required by your local configuration

Install dependencies in each backend service and frontend directory:

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

Configure each service's required environment variables using its source code and the relevant `.env.example` files. Use your own credentials and strong secrets. Never commit real `.env` files.

### Start the backend

From the repository root:

```bash
cd ~/shopitry
node start-all.js
```

### Start the storefront

In another terminal:

```bash
cd ~/shopitry/frontend/storefront
npm run dev
```

Open http://localhost:5173.

### Start the admin dashboard

In another terminal:

```bash
cd ~/shopitry/frontend/admin-dashboard
npm run dev
```

Open http://localhost:5174.

Use credentials configured for your local environment. Do not rely on credentials copied from old documentation.

## Build Checks

```bash
cd ~/shopitry/frontend/storefront
npm run build

cd ~/shopitry/frontend/admin-dashboard
npm run build
```

These commands validate the frontend builds; they do not deploy the application.

## Security Notes

- Keep environment files, database credentials, JWT secrets, and internal-service secrets private.
- Use unique secrets for each environment.
- Restrict backend service ports to the required hosts and security groups.
- Avoid using the public HTTP demo for sensitive information.
- Review authentication, authorization, input validation, persistence, logging, and deployment configuration before any production use.

## Deployment Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for the AWS demo deployment notes, verification results, and remaining operational limitations.
