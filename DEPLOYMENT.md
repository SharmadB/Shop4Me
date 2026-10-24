# Shop4Me — AWS Deployment Notes

## Deployment Overview

Shop4Me has been deployed to AWS EC2 in the `ap-south-1` region for demonstration and learning purposes.

- **Storefront:** http://13.201.186.173/
- **Admin dashboard:** http://13.201.186.173/admin/
- **Entry point:** Nginx on the gateway EC2 instance
- **Process management:** PM2
- **Application communication:** HTTP between the gateway and backend services

This is a verified demo deployment, not a production-ready e-commerce environment.

## Deployment Architecture

The gateway EC2 instance hosts Nginx, the API gateway, and the local payment and notification adapters. Separate EC2 instances host the catalog, cart, and order services.

| Component | Hosting | Port |
|---|---|---:|
| Nginx | Gateway EC2 | 80 |
| API Gateway | Gateway EC2 | 5000 |
| Payment adapter | Gateway EC2 | 5004 |
| Notification adapter | Gateway EC2 | 5005 |
| Catalog service | Separate EC2 | 5001 |
| Cart service | Separate EC2 | 5002 |
| Order service | Separate EC2 | 5003 |

Nginx serves the storefront and admin dashboard static files and forwards API requests to the gateway. Backend services communicate over private EC2 network addresses where configured.

The payment and notification adapters run as local Node.js HTTP processes. Their presence does not establish that AWS Lambda or Amazon SNS is being used for the corresponding operations.

## Deployment Configuration

### Nginx

The Nginx site configuration is located at:

```text
/etc/nginx/sites-available/shop4me
```

The configuration serves the frontend assets and routes `/api/` and `/health` requests to the API gateway.

### PM2

PM2 manages the Node.js services. The deployment was checked with `pm2 status`, and the relevant processes were online during verification.

Example operational commands:

```bash
pm2 status
pm2 logs shop4me-gateway --lines 50
pm2 logs shop4me-catalog --lines 50
pm2 logs shop4me-cart --lines 50
pm2 logs shop4me-order --lines 50
```

Use the appropriate instance and process name when checking logs. Avoid publishing logs that contain tokens, credentials, or customer data.

### Network Access

The gateway security group allows HTTP access for the public demo and uses security-group-based rules for required backend communication.

Backend service ports should remain private and restricted to the services that need them. SSH access should be limited to the administrator's current public IP or another controlled access method.

Do not add broad public inbound rules for backend service ports.

## Verification Performed

The following checks were completed during the demo deployment:

- Storefront and admin dashboard opened through the public gateway IP.
- Nginx served the frontend assets and proxied application API requests.
- Relevant Node.js services were online under PM2 at the time of inspection.
- Product listings were available through the application.
- Cart and checkout interactions completed successfully.
- Checkout returned a transaction reference and displayed a paid status.
- The created order appeared in order history with a `PROCESSING` status.
- Payment and notification adapter health endpoints responded after private network access was configured.
- Both frontend production builds completed successfully.

These results establish that the demo workflow functioned during testing. They do not prove production reliability, real payment settlement, or durable data storage.

## Known Limitations

### Payment Processing

Payment is simulated by the local payment adapter. No real payment gateway or financial transaction has been verified. The displayed paid status and transaction reference are application-demo results only.

### Data Persistence

The catalog service was observed running with its in-memory fallback because a MongoDB connection was not active. Do not assume catalog, cart, or order data will survive process restarts without checking the relevant service implementation and persistence configuration.

### Notifications

The notification adapter runs as a local HTTP process on the gateway host. Actual Amazon SNS publishing and email delivery have not been independently verified.

### HTTPS and Domain

The demo is accessed over HTTP using a public IP address. HTTPS, a custom domain, and a CloudFront distribution are not part of the verified deployment.

### Production Operations

High availability, automated backups, disaster recovery, comprehensive monitoring and alerting, and a full security review have not been established.

Do not use this deployment to process real payments or store sensitive customer information.

## Host Bootstrap Scripts

The repository includes:

- `.deploy/bootstrap-gateway.sh`
- `.deploy/bootstrap-backend.sh`

These scripts install base packages, Node.js, and PM2 and create the application directory. They are host-bootstrap helpers, not a complete automated deployment pipeline. They do not, by themselves, build, transfer, configure, and deploy the entire application.

## Local Development

For local installation and startup instructions, see [README.md](README.md).

## Before Production Use

Before treating this application as production-ready:

1. Integrate and verify a real payment provider.
2. Configure and test durable persistence, backups, and recovery.
3. Enable HTTPS and review cookie, CORS, and authentication settings.
4. Review IAM permissions, secrets handling, and security-group rules.
5. Verify authorization, input validation, and internal-service authentication.
6. Configure monitoring, alerting, log retention, and incident response.
7. Test deployment, restart, and recovery procedures.
8. Review expected AWS costs and remove resources that are no longer needed.

This document describes the demo configuration and verification results. It does not provision or modify AWS resources.
