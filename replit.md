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
- **Image Processing**: sharp (compositing for virtual fit)
- **Face/Body Tracking**: MediaPipe Face Mesh + Pose (CDN-loaded)

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
- Face try-on (FACE_TRYON) — camera + MediaPipe face tracking for eyewear/accessories overlay
- Body tracking (BODY_TRYON) — camera + MediaPipe pose estimation with skeleton rendering
- Virtual fit (CLOTHING_TRYON_PHOTO) — photo upload-based garment overlay with sharp compositing backend
- Analytics tracking
- QR code generation
- API key management
- Webhook support

## Try-On Routes
- `/tryon/[experienceSlug]` — Face try-on (requires camera, loads MediaPipe face mesh, draws glasses overlay on canvas)
- `/body/[experienceSlug]` — Body tracking (requires camera, loads MediaPipe pose, draws color-coded skeleton)
- `/virtual-fit/[experienceSlug]` — Photo-based virtual fit (no camera needed, upload-based UI + sharp compositing)
- Demo slugs: `optica-aviator-tryon`, `noor-body-tracking-demo`, `noor-virtual-fit-demo`
- Data fetched by `src/lib/tryon.ts` → `getTryOnData(slug)`
- Seed script: `prisma/seed-tryon.ts`
- Face overlay asset: `public/demo-assets/aviator-glasses.png` (seeded as FACE_OVERLAY_IMAGE)

## Virtual Fit API
- Public API: `POST /api/public/tryon-jobs` — accepts personImage + garmentImage + optional bodyLandmarks JSON + garmentCategory + fitType (multipart)
- Public API: `GET /api/public/tryon-jobs/[id]` — returns job status + outputImagePath + metadata (clothWarp, occlusionMask, sizeRecommendation, etc.)
- Auth API: `POST /api/tryon-jobs` — same but requires session auth
- Client: VirtualFitClient detects body pose from uploaded photo via MediaPipe Pose (CDN), sends 33 landmarks as JSON
- Processing pipeline: landmarks → computeBodyMeasurements() → warpGarment() (12-strip cloth deformation) + generateOcclusionMask() (head/arms layering) + recommendSize(category, fitType)
- Fallback (no landmarks): flat sharp.resize() with proportional placement
- Output: `/public/uploads/tryon-output/tryon_{jobId}_{timestamp}.png`
- Service: `src/services/virtual-tryon/clothing-tryon.ts`

## Size Recommendation Engine
- Service: `src/services/size-recommendation/size-engine.ts`
- Category-specific default size charts: thobe (52–64 numeric), abaya (50–60 numeric), t-shirt/shirt/polo (XS–XXXL letter), jacket/hoodie/sweater (XS–XXXL letter)
- Category-aware scoring weights (e.g., thobe prioritizes height/length, abaya prioritizes drape length)
- Fit types: slim, regular, loose, oversized
- Sizing systems: letter, numeric, custom
- Full pipeline: API route parses garmentCategory + fitType → createTryOnJob stores in metadata → processTryOnJob reads and passes to recommendSize()
- VirtualFitClient has category and fit type dropdowns with contextual sizing hints

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
