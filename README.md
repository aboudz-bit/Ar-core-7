# AR-core-7

Production-style B2B AR publishing platform for brands, stores, and merchants. Upload product assets, configure AR experiences, and publish shareable WebAR pages.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **3D/AR**: Google model-viewer, MindAR (image tracking), AR.js (marker sandbox), Three.js
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL
- **Auth**: JWT (jose) + bcryptjs + HTTP-only cookies
- **Storage**: Local filesystem (S3-compatible swap ready)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- npm

### Setup

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to database
npx prisma db push

# 5. Seed demo data
npm run db:seed

# 6. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@arcore7.com | admin123 |
| Company Admin | sarah@luxebrands.com | admin123 |
| Content Manager | mike@luxebrands.com | admin123 |
| Viewer | viewer@arcore7.com | viewer123 |

## Architecture

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/dashboard/ # Admin dashboard (9 sections)
│   ├── api/                   # REST API routes
│   ├── ar/[slug]/             # Public AR experience page
│   ├── viewer/[co]/[prod]/    # Public 3D viewer page
│   ├── qr/[slug]/             # QR code landing page
│   └── demo/                  # AR tech demos
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── dashboard/             # Dashboard layout components
│   ├── viewer/                # Viewer components
│   └── ar/                    # AR components
├── lib/                       # Core utilities (auth, prisma, storage, audit)
├── types/                     # Shared TypeScript types
└── middleware.ts               # Auth middleware
```

## Features

### Implemented (MVP)

- **Auth**: JWT login, role-based access (Super Admin, Company Admin, Content Manager, Viewer)
- **Multi-tenancy**: Company isolation, per-company products/assets/experiences
- **Companies**: CRUD, branding, member management
- **Products**: Catalog with SKU, categories, tags, asset completeness scoring
- **Assets**: File upload, type detection, validation, GLB/GLTF/USDZ/images
- **Experiences**: 5 types (3D Viewer, Surface AR, Image Target, QR Launch, Embed)
- **model-viewer**: 3D preview, camera controls, auto-rotate, AR launch (WebXR/Scene Viewer/Quick Look)
- **MindAR**: Image tracking demo with camera permission handling
- **AR.js**: Marker-based demo (Hiro marker)
- **Publishing**: Draft/Ready/Published/Archived states, public URLs, embed snippets, QR codes
- **Analytics**: Page views, AR launches, tracking sessions, daily activity charts
- **Dashboard**: 9-section admin panel with stats, tables, cards, filters
- **Settings**: Branding, viewer defaults, upload limits, analytics toggles
- **Audit Logging**: Action tracking for admin operations
- **Seed Data**: 3 companies, 7 products, 6 experiences, 30 days of analytics

### Planned (Next Phase)

- Full media optimization pipeline (GLB compression, texture optimization)
- MindAR .mind file compilation workflow
- Real-time collaboration
- Webhook integrations
- S3/R2 object storage backend
- Custom domain routing per company
- Advanced analytics (heatmaps, funnel analysis)
- Batch operations
- API keys for external integrations
- Full RTL/Arabic UI localization
- E2E and unit test suites

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Authentication |
| `/dashboard` | Overview with stats |
| `/dashboard/companies` | Company management |
| `/dashboard/users` | User management |
| `/dashboard/products` | Product catalog |
| `/dashboard/products/[id]` | Product detail + asset upload + 3D preview |
| `/dashboard/assets` | Asset browser |
| `/dashboard/experiences` | Experience management |
| `/dashboard/experiences/[id]` | Experience config + publishing |
| `/dashboard/publish` | Publish center |
| `/dashboard/analytics` | Analytics dashboard |
| `/dashboard/settings` | Platform settings |
| `/viewer/[company]/[product]` | Public 3D viewer |
| `/ar/[slug]` | Public AR experience |
| `/qr/[slug]` | QR code landing |
| `/demo/model-viewer` | model-viewer demo |
| `/demo/mindar-image` | MindAR image tracking demo |
| `/demo/arjs-marker` | AR.js marker demo |

## Licenses

- model-viewer: Apache 2.0
- MindAR: MIT
- AR.js: MIT
- Three.js: MIT
