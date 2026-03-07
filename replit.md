# AR-Core-7

## Overview
AR-Core-7 is a full-stack Next.js 14 platform for managing AR (Augmented Reality) product experiences. It allows companies to create, manage, and publish 3D product viewers, AR experiences, QR-launch experiences, and embeddable viewers.

## Architecture
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: JWT-based (jose library), cookie-based sessions
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **3D/AR**: Three.js, @google/model-viewer

## Project Structure
```
src/
  app/
    (auth)/login/         - Login page
    (dashboard)/dashboard/ - Dashboard pages (analytics, assets, companies, docs, experiences, products, publish, settings, users)
    api/                  - API routes (auth, analytics, assets, companies, experiences, products, publish, settings, users, webhooks)
    api/v1/              - Public API v1 endpoints
    api/public/          - Public-facing API endpoints
    ar/[experienceSlug]/ - AR experience viewer
    demo/                - Demo pages
  components/            - Shared UI components
  lib/                   - Utility libraries (prisma client, auth helpers)
  middleware.ts          - Auth middleware
  types/                 - TypeScript type definitions
prisma/
  schema.prisma          - Database schema
  seed.ts               - Database seed script
```

## Key Features
- Multi-company/tenant support
- Role-based access control (Super Admin, Company Admin, Content Manager, Viewer)
- Product management with 3D asset uploads (GLB, GLTF, USDZ)
- AR experience creation and publishing
- Analytics tracking
- QR code generation
- API key management
- Webhook support

## Database
- PostgreSQL via Replit's built-in database
- Prisma ORM for schema management
- Run `npx prisma db push` to sync schema
- Run `npx tsx prisma/seed.ts` to seed demo data

## Demo 3D Models
- All demo products use `/demo-models/food.glb` (Astronaut model from modelviewer.dev) as a placeholder GLB
- The GLB file lives in `public/demo-models/food.glb`
- Asset records in the database reference this path via `ProductAsset.filePath` with `assetType = MODEL_GLB`

## Demo Credentials
- Super Admin: admin@arcore7.com / admin123
- Company Admin: sarah@luxebrands.com / admin123
- Content Manager: mike@luxebrands.com / admin123
- Viewer: viewer@arcore7.com / viewer123

## Environment Variables
- DATABASE_URL - PostgreSQL connection string (auto-set by Replit)
- JWT_SECRET - Secret for JWT token signing
- NEXT_PUBLIC_APP_URL - Public app URL
- UPLOAD_DIR - Directory for file uploads (./public/uploads)
- STORAGE_PROVIDER - Storage backend (local)

## Running
The app runs on port 5000 via `npm run dev -- -p 5000`.
