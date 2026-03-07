# AR-Core-7 Deployment Guide

## Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- (Optional) Redis or Upstash for production rate limiting
- (Optional) S3-compatible object storage (AWS S3, Cloudflare R2, or MinIO)

---

## 1. Vercel Deployment

### Quick Start

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables

Set the following in Vercel Dashboard > Settings > Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Random 64-char secret for auth tokens |
| `NEXT_PUBLIC_APP_URL` | Yes | Your public domain (e.g., `https://ar.yourcompany.com`) |
| `STORAGE_PROVIDER` | No | `s3`, `r2`, `minio`, or `local` (default) |
| `STORAGE_BUCKET` | If cloud | S3/R2 bucket name |
| `STORAGE_REGION` | If cloud | AWS region (e.g., `us-east-1`) |
| `STORAGE_ACCESS_KEY_ID` | If cloud | AWS/R2 access key |
| `STORAGE_SECRET_ACCESS_KEY` | If cloud | AWS/R2 secret key |
| `CDN_BASE_URL` | No | CDN domain for assets |
| `REDIS_URL` | No | Redis/Upstash URL for rate limiting |
| `WEBHOOK_SIGNING_SECRET` | No | Secret for signing webhook payloads |

### Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Post-Deploy Checklist

- [ ] Verify database migrations ran successfully
- [ ] Test API key creation in dashboard
- [ ] Test asset upload and model optimization
- [ ] Verify webhook delivery
- [ ] Check QR code generation on publish

---

## 2. AWS / Self-Hosted Deployment

### Infrastructure

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  CloudFront  │────▶│  Next.js App │────▶│  PostgreSQL  │
│    (CDN)     │     │  (EC2/ECS)   │     │   (RDS)      │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼─────┐ ┌────▼────┐
              │    S3      │ │  Redis  │
              │  (Assets)  │ │ (Cache) │
              └───────────┘ └─────────┘
```

### S3 Bucket Setup

```bash
# Create bucket
aws s3 mb s3://arcore7-assets --region us-east-1

# CORS configuration for direct browser access
aws s3api put-bucket-cors --bucket arcore7-assets --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}'
```

### CloudFront Distribution

Create a CloudFront distribution pointed at your S3 bucket:
- Origin: `arcore7-assets.s3.us-east-1.amazonaws.com`
- Cache Policy: CachingOptimized
- Set `CDN_BASE_URL` to your CloudFront domain

### Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t arcore7 .
docker run -p 3000:3000 --env-file .env arcore7
```

---

## 3. Cloudflare R2 Setup

R2 is S3-compatible with zero egress fees — ideal for AR asset delivery.

```bash
# Environment variables for R2
STORAGE_PROVIDER=r2
STORAGE_BUCKET=arcore7-assets
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=<r2-access-key>
STORAGE_SECRET_ACCESS_KEY=<r2-secret-key>
CDN_BASE_URL=https://assets.your-domain.com
```

### R2 Custom Domain

1. Go to R2 > your bucket > Settings > Custom Domains
2. Add `assets.your-domain.com`
3. Set `CDN_BASE_URL=https://assets.your-domain.com`

---

## 4. Redis Setup (Rate Limiting)

### Upstash (Serverless, recommended for Vercel)

1. Create a database at [upstash.com](https://upstash.com)
2. Copy the REST URL: `https://<id>.upstash.io`
3. Set `REDIS_URL=https://<id>.upstash.io?token=<token>`

### Self-Hosted Redis

```bash
REDIS_URL=redis://localhost:6379
```

> If no Redis is configured, the rate limiter falls back to in-memory (per-instance). This works fine for single-instance deployments but won't share state across serverless functions.

---

## 5. Production Checklist

### Security
- [ ] Set a strong `JWT_SECRET` (64+ random characters)
- [ ] Set a unique `WEBHOOK_SIGNING_SECRET`
- [ ] Enable HTTPS everywhere
- [ ] Configure CORS if using custom domains
- [ ] Review API key permissions

### Performance
- [ ] Enable CDN for asset delivery (`CDN_BASE_URL`)
- [ ] Configure Redis for shared rate limiting
- [ ] Set appropriate `MAX_UPLOAD_SIZE_MB` for your use case
- [ ] Enable database connection pooling (PgBouncer or Prisma Accelerate)

### Monitoring
- [ ] Set up error tracking (Sentry, Datadog, etc.)
- [ ] Monitor webhook delivery failures via `/api/webhooks/[id]`
- [ ] Review analytics dashboard for usage patterns
- [ ] Set up database backup schedule

### Scaling
- [ ] Use S3/R2 for asset storage (not local filesystem)
- [ ] Enable Redis for distributed rate limiting
- [ ] Consider read replicas for PostgreSQL at scale
- [ ] Use Prisma Accelerate or connection pooler for serverless

---

## 6. Architecture Overview

```
Client Apps (Web, Mobile, Kiosk)
        │
        ├── SDK (<3KB) ──── /api/v1/* (authenticated)
        ├── iframe embed ── /embed/:slug (brandless)
        ├── Direct link ─── /launch/:slug (auto-AR)
        └── QR scan ─────── /launch/:slug
                │
        ┌───────┴────────┐
        │  Next.js App   │
        │  (App Router)  │
        └───────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│ Prisma │  │  S3   │  │ Redis │
│  (DB)  │  │(Files)│  │(Cache)│
└───────┘  └───────┘  └───────┘
```

### Key Services

| Service | File | Purpose |
|---------|------|---------|
| Storage | `src/lib/storage.ts` | S3/R2/MinIO/local file storage |
| Webhooks | `src/lib/webhooks.ts` | Event dispatch with retry |
| QR Service | `src/lib/qr-service.ts` | Auto QR generation on publish |
| Model Pipeline | `src/lib/model-pipeline.ts` | GLB validation + optimization |
| Rate Limiter | `src/lib/rate-limiter.ts` | Redis/memory rate limiting |
| Analytics | `src/lib/analytics.ts` | Device/browser/source parsing |
| API Auth | `src/lib/api-auth.ts` | API key validation |
