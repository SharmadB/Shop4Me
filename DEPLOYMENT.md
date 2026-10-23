# Shop4Me — Deployment Status and Notes

## Current Status

Shop4Me has been run and tested in a local development environment.

Verified during local development:
- The backend services start using `node start-all.js`.
- The API gateway health endpoint responds locally.
- Product data is accessible through the gateway.
- Direct requests to tested protected internal-service endpoints are rejected.
- Both React frontends complete their Vite production builds.
- Product image URLs have been checked for HTTP accessibility.

These checks do not establish production readiness.

## Not Yet Verified

The following should not be considered deployed or production-ready without further implementation and testing:

- AWS EC2, Lambda, S3, or CloudFront deployment
- Public production domains and HTTPS configuration
- Production database provisioning and access controls
- Durable order and cart persistence across restarts
- Integration with a real payment provider
- Delivery of real email or notification messages
- Production monitoring, backups, scaling, and recovery
- A complete production security review

Payment and notification currently use local HTTP adapters around handler code. Do not describe them as deployed AWS Lambda functions unless deployment is completed and verified.

## Local Startup

1. Install dependencies in each backend service and frontend directory as described in the root README.
2. Configure the required environment variables in local `.env` files.
3. Start the backend with `node start-all.js` from the repository root.
4. Start the storefront with `npm run dev` from `frontend/storefront`.
5. Start the admin dashboard with `npm run dev` from `frontend/admin-dashboard`.

Local URLs:
- Storefront: http://localhost:5173
- Admin dashboard: http://localhost:5174
- API gateway: http://localhost:5000

## Before Any Cloud Deployment

1. Choose and document the target architecture and AWS region.
2. Create least-privilege IAM roles and policies.
3. Store secrets in an appropriate secrets-management solution; never embed them in source code or shell history.
4. Configure network access so internal services are not publicly exposed.
5. Confirm database persistence, backups, and recovery procedures.
6. Integrate and test a real payment provider before accepting real payments.
7. Configure HTTPS, CORS, logging, monitoring, and alerting.
8. Build and test deployment automation in a non-production environment.
9. Validate costs and clean up cloud resources when they are no longer needed.

No cloud resources are created by this document. Do not run old deployment commands from previous versions of this file.
