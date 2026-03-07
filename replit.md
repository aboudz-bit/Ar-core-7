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
- **Body Segmentation**: TensorFlow.js BodyPix (server-side, MobileNetV1)
- **Warp Engine**: Modular interface — GeometricWarpEngine (24-strip), MLWarpEngine placeholder

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
  services/
    segmentation/        - BodyPix body segmentation (body-segmentation.ts)
    size-recommendation/ - Category-specific size engine (size-engine.ts)
    virtual-tryon/       - Try-on pipeline (clothing-tryon.ts, cloth-warp.ts, body-mask.ts, warp-engine.ts)
    body/                - Body measurements from landmarks (body-measurements.ts)
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

## Virtual Fit Pipeline
- Public API: `POST /api/public/tryon-jobs` — accepts personImage + garmentImage + bodyLandmarks + garmentCategory + fitType + drapeFactor (multipart)
- Public API: `GET /api/public/tryon-jobs/[id]` — returns full metadata (see below)
- Auth API: `POST /api/tryon-jobs` — same but requires session auth
- Client: VirtualFitClient detects pose via MediaPipe Pose (CDN), sends 33 landmarks as JSON

### Processing Layers
1. **Layer 1 (Base)**: Person image
2. **Layer 2 (Garment)**: Warped garment via WarpEngine (24-strip geometric deformation with drapeFactor, shoulder/waist/hip curvature)
3. **Layer 3 (Occlusion)**: BodyPix segmentation mask (arms/head over garment) — falls back to landmark polygon masking if BodyPix unavailable

### Services
- `src/services/segmentation/body-segmentation.ts` — BodyPix (TensorFlow.js, MobileNetV1, server-side), produces part masks (torso/leftArm/rightArm/head). Graceful fallback if TF fails.
- `src/services/virtual-tryon/cloth-warp.ts` — 24-strip geometric warp with shoulder bulge, waist taper (Gaussian), cubic interpolation, body centerline curvature, drapeFactor support, lanczos3 kernel
- `src/services/virtual-tryon/warp-engine.ts` — WarpEngine interface. GeometricWarpEngine (active), MLWarpEngine (VITON-HD placeholder)
- `src/services/virtual-tryon/body-mask.ts` — Landmark-polygon occlusion masking (fallback for segmentation)
- `src/services/virtual-tryon/clothing-tryon.ts` — Main pipeline orchestrator

## Size Recommendation Engine
- Service: `src/services/size-recommendation/size-engine.ts`
- Category-specific default size charts: thobe (52–64 numeric), abaya (50–60 numeric or S–XXL letter), t-shirt/shirt/polo (XS–XXXL letter), jacket/hoodie/sweater (XS–XXXL letter)
- Category-aware scoring weights (thobe prioritizes height/length/sleeve, abaya prioritizes drape length/shoulder, t-shirt/jacket prioritizes shoulder/chest)
- Fit types: slim, regular, loose, oversized
- Sizing systems: letter, numeric, custom
- Extended GarmentMetadata: category, fitType, sizingSystem, sizeChart (product-level), garmentLength, sleeveLength, shoulderSpec, chestSpec
- Product-level specs override body estimation when provided (e.g. shoulderSpec replaces estimated shoulder width)
- SizeRecommendation response includes: dataSource (product-specific | category-default | generic-fallback), measurementBasis (what data was used)
- Full pipeline: API route parses garmentCategory + fitType + sizeChart (JSON) + garmentLength/sleeveLength/shoulderSpec/chestSpec → createTryOnJob stores in metadata → processTryOnJob reads and passes to recommendSize()
- VirtualFitClient has category/fit type dropdowns + drapeFactor slider with contextual sizing hints; size display formats correctly for numeric vs letter systems

## API Metadata Response
The GET response for a completed job includes:
```json
{
  "processingTime": 4182,
  "method": "sharp-composite",
  "placementMethod": "body-measurements+profile",
  "clothWarp": true,
  "occlusionMask": true,
  "segmentationUsed": true,
  "warpEngine": "geometric",
  "drapeFactor": 1.1,
  "sizeRecommendation": { ... },
  "shoulderWidthPx": 96,
  "torsoHeightPx": 180,
  "confidence": 0.99
}
```

## Next.js Config
- `next.config.mjs` — externalized packages: @prisma/client, bcryptjs, @tensorflow/tfjs-node, @tensorflow-models/body-pix, @tensorflow/tfjs (required to avoid webpack parse errors)

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
