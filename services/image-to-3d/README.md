# Image-to-3D Generation Service

This service wraps TripoSR and InstantMesh to provide a simple HTTP API for generating 3D GLB models from product images.

## Architecture

```
AR-core-7 (Next.js)
    │
    ├── Upload image → POST /api/assets
    │       │
    │       ▼
    ├── Queue job → ImageTo3DJob (Prisma)
    │       │
    │       ▼
    ├── Worker → POST http://localhost:8080/generate (TripoSR)
    │       │
    │       ▼
    ├── Save GLB → /uploads/{companyId}/products/{productId}/generated.glb
    │       │
    │       ▼
    ├── Create ProductAsset (MODEL_GLB, source: ai_generated)
    │       │
    │       ▼
    ├── Product status → AR_READY
    │       │
    │       ▼
    └── Auto-create Experience → PUBLISHED → "View in AR" works
```

## TripoSR Setup (Primary — Faster, Lighter)

### Prerequisites
- Python 3.10+
- CUDA-capable GPU with 8GB+ VRAM (or CPU mode for testing)
- Git

### Install
```bash
git clone https://github.com/VAST-AI-Research/TripoSR.git
cd TripoSR
pip install -r requirements.txt
```

### Run the server
```bash
python run_api.py --port 8080 --device cuda
# or for CPU testing:
python run_api.py --port 8080 --device cpu
```

### API Endpoint
```
POST http://localhost:8080/generate
Content-Type: multipart/form-data

Parameters:
  image: <file>           # Input product image (JPG/PNG/WebP)
  output_format: glb      # Output format (glb recommended)
  mc_resolution: 256      # Marching cubes resolution (128-512)
  render: false           # Skip rendering preview images

Response: Binary GLB file
```

### Custom API Wrapper (if TripoSR doesn't have built-in API)
Use the included `server.py` to wrap TripoSR as an HTTP service.

## InstantMesh Setup (Optional — Higher Quality)

### Prerequisites
- Python 3.10+
- CUDA GPU with 16GB+ VRAM
- Git

### Install
```bash
git clone https://github.com/TencentARC/InstantMesh.git
cd InstantMesh
pip install -r requirements.txt
```

### Run
```bash
python run_api.py --port 8081
```

### API Endpoint
```
POST http://localhost:8081/generate
Content-Type: multipart/form-data

Parameters:
  image: <file>

Response: Binary GLB file
```

## Environment Variables

Set these in AR-core-7's `.env`:

```bash
IMAGE_TO_3D_ENABLED=true
IMAGE_TO_3D_PROVIDER=triposr          # or "instantmesh"
TRIPOSR_ENDPOINT=http://localhost:8080
INSTANTMESH_ENDPOINT=http://localhost:8081
MAX_IMAGE_SIZE_MB=10
IMAGE_TO_3D_TIMEOUT_MS=120000
IMAGE_TO_3D_AUTO_PUBLISH=true
```

## GPU Requirements

| Provider    | Min VRAM | Recommended | Inference Time |
|-------------|----------|-------------|----------------|
| TripoSR    | 6 GB     | 8 GB        | 5-15 seconds   |
| InstantMesh | 12 GB    | 16 GB       | 30-60 seconds  |

## Testing Without GPU

For development without a GPU, the service will still queue jobs. Jobs will fail with a connection error if no TripoSR server is running. Set `IMAGE_TO_3D_ENABLED=false` to disable.

## Running Locally

1. Start TripoSR:
   ```bash
   cd services/image-to-3d/TripoSR
   python run_api.py --port 8080 --device cuda
   ```

2. Enable in AR-core-7:
   ```bash
   # In .env:
   IMAGE_TO_3D_ENABLED=true
   TRIPOSR_ENDPOINT=http://localhost:8080
   ```

3. Upload a product image via the dashboard or API
4. The pipeline will automatically:
   - Queue the generation job
   - Call TripoSR to generate a 3D model
   - Save the GLB file
   - Create a ProductAsset record
   - Update product status to AR_READY
   - Auto-create and publish an AR experience
5. Visit `/ar/{product-slug}` to view in AR
