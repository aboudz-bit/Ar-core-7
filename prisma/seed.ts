import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/** Create a small placeholder file and return its public URL path */
function createPlaceholderFile(companyId: string, productId: string, fileName: string, content: string): string {
  const dir = path.join('./public/uploads', companyId, 'products', productId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const safeName = `seed-${fileName}`;
  const filePath = path.join(dir, safeName);
  writeFileSync(filePath, content);
  return `/uploads/${companyId}/products/${productId}/${safeName}`;
}

/** Create a 1x1 pixel PNG placeholder */
function createPlaceholderImage(companyId: string, productId: string, fileName: string): string {
  // Minimal valid PNG (1x1 gray pixel)
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c626000000002000198e195e80000000049454e44ae426082',
    'hex'
  );
  const dir = path.join('./public/uploads', companyId, 'products', productId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const safeName = `seed-${fileName}`;
  const filePath = path.join(dir, safeName);
  writeFileSync(filePath, png);
  return `/uploads/${companyId}/products/${productId}/${safeName}`;
}

/** Create a minimal valid GLB file (empty scene) */
function createPlaceholderGlb(companyId: string, productId: string, fileName: string): string {
  // Minimal valid glTF 2.0 binary (GLB) — empty scene
  const json = JSON.stringify({
    asset: { version: '2.0', generator: 'ar-core-7-seed' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'DemoNode', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4 }] }],
    accessors: [{
      bufferView: 0, componentType: 5126, count: 3, type: 'VEC3',
      max: [1, 1, 0], min: [-1, -1, 0],
    }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }],
    buffers: [{ byteLength: 36 }],
  });

  // Triangle vertex positions (3 vertices × 3 floats × 4 bytes = 36 bytes)
  const binData = new Float32Array([
    0, 1, 0,     // top
    -1, -1, 0,   // bottom-left
    1, -1, 0,    // bottom-right
  ]);
  const binBuffer = Buffer.from(binData.buffer);

  // Pad JSON to 4-byte alignment
  const jsonStr = json;
  const jsonPadded = jsonStr + ' '.repeat((4 - (jsonStr.length % 4)) % 4);
  const jsonBuffer = Buffer.from(jsonPadded, 'utf8');

  // GLB header: magic (4) + version (4) + length (4) = 12 bytes
  // JSON chunk: length (4) + type (4) + data
  // BIN chunk: length (4) + type (4) + data
  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // glTF magic
  header.writeUInt32LE(2, 4);           // version 2
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // JSON

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4); // BIN

  const glb = Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer]);

  const dir = path.join('./public/uploads', companyId, 'products', productId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const safeName = `seed-${fileName}`;
  const filePath = path.join(dir, safeName);
  writeFileSync(filePath, glb);
  return `/uploads/${companyId}/products/${productId}/${safeName}`;
}

/** Create a pizza-shaped GLB (flat cylinder with colored material) */
function createPizzaGlb(companyId: string, productId: string, fileName: string, color: number[]): string {
  // Build a flat disc (pizza shape) as a triangle fan with material color
  const segments = 24;
  const radius = 0.15; // 15cm radius pizza
  const height = 0.015; // 1.5cm thick

  // Vertices: center top + rim top + center bottom + rim bottom
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Top face center
  positions.push(0, height, 0);
  normals.push(0, 1, 0);

  // Top face rim
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    normals.push(0, 1, 0);
  }

  // Top face indices (triangle fan)
  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  // Bottom face center
  const bottomCenter = segments + 2;
  positions.push(0, 0, 0);
  normals.push(0, -1, 0);

  // Bottom face rim
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    normals.push(0, -1, 0);
  }

  for (let i = 1; i <= segments; i++) {
    indices.push(bottomCenter, bottomCenter + i + 1, bottomCenter + i);
  }

  const posArray = new Float32Array(positions);
  const normArray = new Float32Array(normals);
  const idxArray = new Uint16Array(indices);

  const posBuf = Buffer.from(posArray.buffer);
  const normBuf = Buffer.from(normArray.buffer);
  const idxBuf = Buffer.from(idxArray.buffer);

  // Pad index buffer to 4-byte alignment
  const idxPad = (4 - (idxBuf.length % 4)) % 4;
  const idxBufPadded = idxPad > 0 ? Buffer.concat([idxBuf, Buffer.alloc(idxPad)]) : idxBuf;

  const binBuffer = Buffer.concat([posBuf, normBuf, idxBufPadded]);

  // Compute bounds
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < posArray.length; i += 3) {
    minX = Math.min(minX, posArray[i]); maxX = Math.max(maxX, posArray[i]);
    minY = Math.min(minY, posArray[i+1]); maxY = Math.max(maxY, posArray[i+1]);
    minZ = Math.min(minZ, posArray[i+2]); maxZ = Math.max(maxZ, posArray[i+2]);
  }

  const vertexCount = posArray.length / 3;

  const json = JSON.stringify({
    asset: { version: '2.0', generator: 'ar-core-7-seed' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Pizza', mesh: 0 }],
    materials: [{
      name: 'PizzaMaterial',
      pbrMetallicRoughness: {
        baseColorFactor: [color[0], color[1], color[2], 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.8,
      },
    }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0, NORMAL: 1 },
        indices: 2,
        material: 0,
        mode: 4,
      }],
    }],
    accessors: [
      {
        bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3',
        max: [maxX, maxY, maxZ], min: [minX, minY, minZ],
      },
      {
        bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3',
      },
      {
        bufferView: 2, componentType: 5123, count: indices.length, type: 'SCALAR',
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posBuf.length, target: 34962 },
      { buffer: 0, byteOffset: posBuf.length, byteLength: normBuf.length, target: 34962 },
      { buffer: 0, byteOffset: posBuf.length + normBuf.length, byteLength: idxBuf.length, target: 34963 },
    ],
    buffers: [{ byteLength: binBuffer.length }],
  });

  const jsonPadded = json + ' '.repeat((4 - (json.length % 4)) % 4);
  const jsonBuffer = Buffer.from(jsonPadded, 'utf8');

  const totalLength = 12 + 8 + jsonBuffer.length + 8 + binBuffer.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
  jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4);

  const binChunkHeader = Buffer.alloc(8);
  binChunkHeader.writeUInt32LE(binBuffer.length, 0);
  binChunkHeader.writeUInt32LE(0x004E4942, 4);

  const glb = Buffer.concat([header, jsonChunkHeader, jsonBuffer, binChunkHeader, binBuffer]);

  const dir = path.join('./public/uploads', companyId, 'products', productId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const safeName = `seed-${fileName}`;
  const filePath = path.join(dir, safeName);
  writeFileSync(filePath, glb);
  return `/uploads/${companyId}/products/${productId}/${safeName}`;
}

async function main() {
  console.log('Seeding AR-core-7 database...');

  // Clean existing data (order matters due to foreign key constraints)
  await prisma.imageTo3DJob.deleteMany();
  await prisma.modelOptimizationJob.deleteMany();
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.qRCode.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.publishRecord.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.productAsset.deleteMany();
  await prisma.product.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const viewerHash = await bcrypt.hash('viewer123', 10);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@arcore7.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Admin',
    },
  });

  const companyAdmin = await prisma.user.create({
    data: {
      email: 'sarah@luxebrands.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Chen',
    },
  });

  const contentManager = await prisma.user.create({
    data: {
      email: 'mike@luxebrands.com',
      passwordHash,
      firstName: 'Mike',
      lastName: 'Rivera',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@arcore7.com',
      passwordHash: viewerHash,
      firstName: 'Demo',
      lastName: 'Viewer',
    },
  });

  // Create companies
  const luxeBrands = await prisma.company.create({
    data: {
      name: 'Luxe Brands',
      slug: 'luxe-brands',
      brandPrimary: '#1a1a2e',
      brandSecondary: '#e94560',
      domain: 'luxebrands.com',
    },
  });

  const techGear = await prisma.company.create({
    data: {
      name: 'TechGear Pro',
      slug: 'techgear-pro',
      brandPrimary: '#0ea5e9',
      brandSecondary: '#38bdf8',
      domain: 'techgearpro.com',
    },
  });

  const homeDecor = await prisma.company.create({
    data: {
      name: 'Noor Home Decor',
      slug: 'noor-home',
      brandPrimary: '#d97706',
      brandSecondary: '#f59e0b',
      domain: 'noorhome.com',
    },
  });

  // Create memberships
  await prisma.membership.createMany({
    data: [
      { userId: superAdmin.id, companyId: luxeBrands.id, role: 'SUPER_ADMIN' },
      { userId: superAdmin.id, companyId: techGear.id, role: 'SUPER_ADMIN' },
      { userId: superAdmin.id, companyId: homeDecor.id, role: 'SUPER_ADMIN' },
      { userId: companyAdmin.id, companyId: luxeBrands.id, role: 'COMPANY_ADMIN' },
      { userId: contentManager.id, companyId: luxeBrands.id, role: 'CONTENT_MANAGER' },
      { userId: viewer.id, companyId: luxeBrands.id, role: 'VIEWER' },
      { userId: viewer.id, companyId: techGear.id, role: 'VIEWER' },
    ],
  });

  // Create products for Luxe Brands
  const sneaker = await prisma.product.create({
    data: {
      companyId: luxeBrands.id,
      title: 'Premium Running Sneaker',
      sku: 'LX-SNK-001',
      category: 'Footwear',
      description: 'High-performance running sneaker with breathable mesh upper and responsive foam midsole. Designed for comfort and speed.',
      brand: 'Luxe Athletics',
      status: 'ACTIVE',
      tags: ['sneaker', 'running', 'premium', 'athletic'],
      scalePreset: 1.0,
      anchorType: 'floor',
      assetCompletenessScore: 100,
    },
  });

  const watch = await prisma.product.create({
    data: {
      companyId: luxeBrands.id,
      title: 'Chronograph Watch Elite',
      sku: 'LX-WCH-002',
      category: 'Accessories',
      description: 'Elegant chronograph watch with sapphire crystal glass and Swiss movement. Water resistant to 100m.',
      brand: 'Luxe Timepieces',
      status: 'ACTIVE',
      tags: ['watch', 'luxury', 'chronograph', 'swiss'],
      scalePreset: 0.3,
      anchorType: 'table',
      assetCompletenessScore: 45,
    },
  });

  const handbag = await prisma.product.create({
    data: {
      companyId: luxeBrands.id,
      title: 'Designer Leather Handbag',
      sku: 'LX-BAG-003',
      category: 'Bags',
      description: 'Artisan-crafted leather handbag with gold hardware. Italian calfskin leather with suede lining.',
      brand: 'Luxe Maison',
      status: 'DRAFT',
      tags: ['handbag', 'leather', 'luxury', 'designer'],
      scalePreset: 0.8,
      anchorType: 'table',
      assetCompletenessScore: 15,
    },
  });

  // Create products for TechGear Pro
  const headphones = await prisma.product.create({
    data: {
      companyId: techGear.id,
      title: 'Wireless ANC Headphones',
      sku: 'TG-HP-001',
      category: 'Audio',
      description: 'Premium wireless headphones with active noise cancellation and 40-hour battery life.',
      brand: 'TechGear Audio',
      status: 'ACTIVE',
      tags: ['headphones', 'wireless', 'ANC', 'audio'],
      scalePreset: 0.5,
      anchorType: 'table',
      assetCompletenessScore: 30,
    },
  });

  const speaker = await prisma.product.create({
    data: {
      companyId: techGear.id,
      title: 'Portable Bluetooth Speaker',
      sku: 'TG-SPK-002',
      category: 'Audio',
      description: 'Rugged portable speaker with 360-degree sound and waterproof design.',
      brand: 'TechGear Audio',
      status: 'ACTIVE',
      tags: ['speaker', 'bluetooth', 'portable', 'waterproof'],
      scalePreset: 0.6,
      anchorType: 'table',
      assetCompletenessScore: 20,
    },
  });

  // Create products for Noor Home Decor
  const lamp = await prisma.product.create({
    data: {
      companyId: homeDecor.id,
      title: 'Arabesque Table Lamp',
      sku: 'NH-LMP-001',
      category: 'Lighting',
      description: 'Handcrafted brass table lamp with intricate arabesque patterns. Casts beautiful shadow patterns.',
      brand: 'Noor Artisan',
      status: 'ACTIVE',
      tags: ['lamp', 'brass', 'arabesque', 'handcrafted'],
      scalePreset: 0.7,
      anchorType: 'table',
      assetCompletenessScore: 20,
    },
  });

  const vase = await prisma.product.create({
    data: {
      companyId: homeDecor.id,
      title: 'Ceramic Art Vase',
      sku: 'NH-VSE-002',
      category: 'Decor',
      description: 'Contemporary ceramic vase with geometric patterns. Perfect centerpiece for modern interiors.',
      brand: 'Noor Studio',
      status: 'ACTIVE',
      tags: ['vase', 'ceramic', 'geometric', 'modern'],
      scalePreset: 0.5,
      anchorType: 'table',
      assetCompletenessScore: 15,
    },
  });

  // ============================================================
  // Create FULL ASSET SET for the Premium Running Sneaker
  // This demonstrates the complete asset pipeline
  // ============================================================
  console.log('Creating demo asset files for Premium Running Sneaker...');

  const sneakerThumbnailPath = createPlaceholderImage(luxeBrands.id, sneaker.id, 'sneaker-thumbnail.png');
  const sneakerPosterPath = createPlaceholderImage(luxeBrands.id, sneaker.id, 'sneaker-poster.png');
  const sneakerImage1Path = createPlaceholderImage(luxeBrands.id, sneaker.id, 'sneaker-front.png');
  const sneakerImage2Path = createPlaceholderImage(luxeBrands.id, sneaker.id, 'sneaker-side.png');
  const sneakerTargetPath = createPlaceholderImage(luxeBrands.id, sneaker.id, 'sneaker-target.png');

  await prisma.productAsset.createMany({
    data: [
      {
        productId: sneaker.id,
        assetType: 'MODEL_GLB',
        fileName: 'food.glb',
        filePath: '/demo-models/food.glb',
        fileSize: 2869044,
        mimeType: 'model/gltf-binary',
      },
      {
        productId: sneaker.id,
        assetType: 'THUMBNAIL',
        fileName: 'sneaker-thumbnail.png',
        filePath: sneakerThumbnailPath,
        fileSize: 85000,
        mimeType: 'image/png',
      },
      {
        productId: sneaker.id,
        assetType: 'POSTER',
        fileName: 'sneaker-poster.png',
        filePath: sneakerPosterPath,
        fileSize: 120000,
        mimeType: 'image/png',
      },
      {
        productId: sneaker.id,
        assetType: 'IMAGE_2D',
        fileName: 'sneaker-front.png',
        filePath: sneakerImage1Path,
        fileSize: 95000,
        mimeType: 'image/png',
      },
      {
        productId: sneaker.id,
        assetType: 'IMAGE_2D',
        fileName: 'sneaker-side.png',
        filePath: sneakerImage2Path,
        fileSize: 88000,
        mimeType: 'image/png',
      },
      {
        productId: sneaker.id,
        assetType: 'TARGET_IMAGE',
        fileName: 'sneaker-target.png',
        filePath: sneakerTargetPath,
        fileSize: 150000,
        mimeType: 'image/png',
      },
    ],
  });

  // Also update the sneaker thumbnailUrl
  await prisma.product.update({
    where: { id: sneaker.id },
    data: { thumbnailUrl: sneakerThumbnailPath },
  });

  // Create partial assets for the watch (model + thumbnail only)
  const watchThumbnailPath = createPlaceholderImage(luxeBrands.id, watch.id, 'watch-thumbnail.png');

  await prisma.productAsset.createMany({
    data: [
      {
        productId: watch.id,
        assetType: 'MODEL_GLB',
        fileName: 'food.glb',
        filePath: '/demo-models/food.glb',
        fileSize: 2869044,
        mimeType: 'model/gltf-binary',
      },
      {
        productId: watch.id,
        assetType: 'THUMBNAIL',
        fileName: 'watch-thumbnail.png',
        filePath: watchThumbnailPath,
        fileSize: 72000,
        mimeType: 'image/png',
      },
    ],
  });

  await prisma.product.update({
    where: { id: watch.id },
    data: { thumbnailUrl: watchThumbnailPath },
  });

  // Create a model asset for headphones
  await prisma.productAsset.create({
    data: {
      productId: headphones.id,
      assetType: 'MODEL_GLB',
      fileName: 'food.glb',
      filePath: '/demo-models/food.glb',
      fileSize: 2869044,
      mimeType: 'model/gltf-binary',
    },
  });

  console.log('Demo asset files created.');

  // Create experiences
  const sneakerViewer = await prisma.experience.create({
    data: {
      companyId: luxeBrands.id,
      productId: sneaker.id,
      name: 'Sneaker 3D Showcase',
      slug: 'lx-sneaker-3d',
      experienceType: 'PRODUCT_VIEWER',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'studio',
      backgroundMode: 'gradient',
      ctaText: 'Shop Now',
      ctaLink: 'https://luxebrands.com/sneaker',
      analyticsEnabled: true,
    },
  });

  const sneakerAR = await prisma.experience.create({
    data: {
      companyId: luxeBrands.id,
      productId: sneaker.id,
      name: 'Sneaker AR Try-On',
      slug: 'lx-sneaker-ar',
      experienceType: 'SURFACE_AR',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'outdoor',
      backgroundMode: 'transparent',
      ctaText: 'Add to Cart',
      ctaLink: 'https://luxebrands.com/sneaker/buy',
      analyticsEnabled: true,
    },
  });

  const watchViewer = await prisma.experience.create({
    data: {
      companyId: luxeBrands.id,
      productId: watch.id,
      name: 'Watch Elite Viewer',
      slug: 'lx-watch-elite',
      experienceType: 'PRODUCT_VIEWER',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'warm',
      backgroundMode: 'dark',
      analyticsEnabled: true,
    },
  });

  await prisma.experience.create({
    data: {
      companyId: luxeBrands.id,
      productId: watch.id,
      name: 'Watch Catalog AR',
      slug: 'lx-watch-catalog-ar',
      experienceType: 'IMAGE_TARGET',
      publishStatus: 'DRAFT',
      lightingPreset: 'studio',
      analyticsEnabled: true,
    },
  });

  const headphonesQR = await prisma.experience.create({
    data: {
      companyId: techGear.id,
      productId: headphones.id,
      name: 'Headphones QR Experience',
      slug: 'tg-headphones-qr',
      experienceType: 'QR_LAUNCH',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'cool',
      ctaText: 'Buy on TechGear',
      ctaLink: 'https://techgearpro.com/headphones',
      analyticsEnabled: true,
    },
  });

  await prisma.experience.create({
    data: {
      companyId: homeDecor.id,
      productId: lamp.id,
      name: 'Arabesque Lamp Showcase',
      slug: 'noor-lamp-showcase',
      experienceType: 'SURFACE_AR',
      publishStatus: 'READY',
      lightingPreset: 'warm',
      backgroundMode: 'transparent',
      analyticsEnabled: true,
    },
  });

  // Create publish records
  await prisma.publishRecord.createMany({
    data: [
      {
        experienceId: sneakerViewer.id,
        companyId: luxeBrands.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/ar/lx-sneaker-3d',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
      {
        experienceId: sneakerAR.id,
        companyId: luxeBrands.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/ar/lx-sneaker-ar',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
      {
        experienceId: watchViewer.id,
        companyId: luxeBrands.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/ar/lx-watch-elite',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
      {
        experienceId: headphonesQR.id,
        companyId: techGear.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/ar/tg-headphones-qr',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
    ],
  });

  // Create sample analytics events
  const now = new Date();
  const analyticsData = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const viewCount = Math.floor(Math.random() * 15) + 3;
    const arCount = Math.floor(Math.random() * 5) + 1;

    for (let j = 0; j < viewCount; j++) {
      analyticsData.push({
        companyId: [luxeBrands.id, techGear.id, homeDecor.id][Math.floor(Math.random() * 3)],
        productId: [sneaker.id, watch.id, headphones.id, lamp.id][Math.floor(Math.random() * 4)],
        experienceId: [sneakerViewer.id, sneakerAR.id, watchViewer.id, headphonesQR.id][Math.floor(Math.random() * 4)],
        eventType: 'page_view',
        sessionId: Math.random().toString(36).slice(2),
        createdAt: date,
      });
    }

    for (let j = 0; j < arCount; j++) {
      analyticsData.push({
        companyId: [luxeBrands.id, techGear.id][Math.floor(Math.random() * 2)],
        productId: [sneaker.id, headphones.id][Math.floor(Math.random() * 2)],
        experienceId: [sneakerAR.id, headphonesQR.id][Math.floor(Math.random() * 2)],
        eventType: 'ar_launch',
        sessionId: Math.random().toString(36).slice(2),
        createdAt: date,
      });
    }

    if (Math.random() > 0.5) {
      analyticsData.push({
        companyId: luxeBrands.id,
        productId: watch.id,
        experienceId: watchViewer.id,
        eventType: 'tracking_session',
        sessionId: Math.random().toString(36).slice(2),
        duration: Math.floor(Math.random() * 60) + 5,
        createdAt: date,
      });
    }
  }

  await prisma.analyticsEvent.createMany({ data: analyticsData });

  // Create audit logs
  await prisma.auditLog.createMany({
    data: [
      { userId: superAdmin.id, companyId: luxeBrands.id, action: 'CREATE', entity: 'Company', entityId: luxeBrands.id },
      { userId: superAdmin.id, companyId: techGear.id, action: 'CREATE', entity: 'Company', entityId: techGear.id },
      { userId: superAdmin.id, companyId: homeDecor.id, action: 'CREATE', entity: 'Company', entityId: homeDecor.id },
      { userId: superAdmin.id, companyId: luxeBrands.id, action: 'CREATE', entity: 'Product', entityId: sneaker.id },
      { userId: superAdmin.id, companyId: luxeBrands.id, action: 'UPLOAD', entity: 'ProductAsset', details: { fileName: 'sneaker-model.glb', assetType: 'MODEL_GLB' } },
      { userId: superAdmin.id, companyId: luxeBrands.id, action: 'CREATE', entity: 'Experience', entityId: sneakerViewer.id },
      { userId: superAdmin.id, companyId: luxeBrands.id, action: 'PUBLISH', entity: 'Experience', entityId: sneakerViewer.id, details: { action: 'publish' } },
      { userId: superAdmin.id, action: 'LOGIN', entity: 'User', entityId: superAdmin.id },
    ],
  });

  // ============================================================
  // Pizza Demo Restaurant — end-to-end AR demo
  // ============================================================
  console.log('Creating Pizza Demo Restaurant...');

  const pizzaDemo = await prisma.company.create({
    data: {
      name: 'Pizza Demo Restaurant',
      slug: 'pizza-demo',
      brandPrimary: '#dc2626',
      brandSecondary: '#f97316',
      domain: 'pizzademo.arcore7.com',
    },
  });

  await prisma.membership.create({
    data: { userId: superAdmin.id, companyId: pizzaDemo.id, role: 'SUPER_ADMIN' },
  });

  // Create pizza products
  const margherita = await prisma.product.create({
    data: {
      companyId: pizzaDemo.id,
      title: 'Margherita Pizza',
      sku: 'PZ-MRG-001',
      category: 'Pizza',
      description: 'Classic Italian margherita with fresh mozzarella, San Marzano tomatoes, and basil on a thin, crispy crust.',
      brand: 'Pizza Demo',
      status: 'ACTIVE',
      tags: ['pizza', 'margherita', 'classic', 'italian'],
      scalePreset: 0.3,
      anchorType: 'table',
      assetCompletenessScore: 100,
    },
  });

  const pepperoni = await prisma.product.create({
    data: {
      companyId: pizzaDemo.id,
      title: 'Pepperoni Pizza',
      sku: 'PZ-PEP-001',
      category: 'Pizza',
      description: 'Loaded pepperoni pizza with extra cheese, spicy pepperoni, and our signature tomato sauce.',
      brand: 'Pizza Demo',
      status: 'ACTIVE',
      tags: ['pizza', 'pepperoni', 'spicy', 'classic'],
      scalePreset: 0.3,
      anchorType: 'table',
      assetCompletenessScore: 100,
    },
  });

  // Create GLB models for pizzas (flat disc geometry)
  const margheritaPosterPath = createPlaceholderImage(pizzaDemo.id, margherita.id, 'margherita-poster.png');
  const pepperoniPosterPath = createPlaceholderImage(pizzaDemo.id, pepperoni.id, 'pepperoni-poster.png');

  await prisma.productAsset.createMany({
    data: [
      {
        productId: margherita.id,
        assetType: 'MODEL_GLB',
        fileName: 'food.glb',
        filePath: '/demo-models/food.glb',
        fileSize: 2869044,
        mimeType: 'model/gltf-binary',
        isProcessed: true,
        processingStatus: 'optimized',
      },
      {
        productId: margherita.id,
        assetType: 'POSTER',
        fileName: 'margherita-poster.png',
        filePath: margheritaPosterPath,
        fileSize: 1024,
        mimeType: 'image/png',
      },
      {
        productId: pepperoni.id,
        assetType: 'MODEL_GLB',
        fileName: 'food.glb',
        filePath: '/demo-models/food.glb',
        fileSize: 2869044,
        mimeType: 'model/gltf-binary',
        isProcessed: true,
        processingStatus: 'optimized',
      },
      {
        productId: pepperoni.id,
        assetType: 'POSTER',
        fileName: 'pepperoni-poster.png',
        filePath: pepperoniPosterPath,
        fileSize: 1024,
        mimeType: 'image/png',
      },
    ],
  });

  // Create experiences for pizzas
  const margheritaExp = await prisma.experience.create({
    data: {
      companyId: pizzaDemo.id,
      productId: margherita.id,
      name: 'Margherita Pizza AR',
      slug: 'margherita',
      experienceType: 'SURFACE_AR',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'warm',
      backgroundMode: 'transparent',
      ctaText: 'Order Now',
      ctaLink: '#',
      scale: 0.3,
      analyticsEnabled: true,
    },
  });

  const pepperoniExp = await prisma.experience.create({
    data: {
      companyId: pizzaDemo.id,
      productId: pepperoni.id,
      name: 'Pepperoni Pizza AR',
      slug: 'pepperoni',
      experienceType: 'SURFACE_AR',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'warm',
      backgroundMode: 'transparent',
      ctaText: 'Order Now',
      ctaLink: '#',
      scale: 0.3,
      analyticsEnabled: true,
    },
  });

  await prisma.publishRecord.createMany({
    data: [
      {
        experienceId: margheritaExp.id,
        companyId: pizzaDemo.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/launch/margherita',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
      {
        experienceId: pepperoniExp.id,
        companyId: pizzaDemo.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/launch/pepperoni',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
    ],
  });

  console.log('Pizza Demo Restaurant created!');
  console.log('  Products: Margherita Pizza, Pepperoni Pizza');
  console.log('  Routes: /demo, /launch/margherita, /launch/pepperoni');

  // ============================================================
  // Image-to-3D Pipeline Test Products
  // These products have IMAGE_ONLY status to test the automated pipeline
  // ============================================================
  console.log('Creating Image-to-3D test products...');

  const steakHouse = await prisma.company.create({
    data: {
      name: 'Steak House Al Khobar Premium',
      slug: 'steak-house-alkhobar',
      brandPrimary: '#c0392b',
      brandSecondary: '#e74c3c',
      domain: 'steakhouse-alkhobar.com',
    },
  });

  await prisma.membership.create({
    data: { userId: superAdmin.id, companyId: steakHouse.id, role: 'SUPER_ADMIN' },
  });

  const abayaBoutique = await prisma.company.create({
    data: {
      name: 'Noor Abaya Boutique',
      slug: 'noor-abaya',
      brandPrimary: '#1a1a2e',
      brandSecondary: '#16213e',
      domain: 'noorabaya.com',
    },
  });

  await prisma.membership.create({
    data: { userId: superAdmin.id, companyId: abayaBoutique.id, role: 'SUPER_ADMIN' },
  });

  // Wagyu Steak — IMAGE_ONLY (ready for image-to-3D pipeline)
  const wagyuSteak = await prisma.product.create({
    data: {
      companyId: steakHouse.id,
      title: 'Wagyu Steak',
      sku: 'SH-WGY-001',
      category: 'Steak',
      description: 'Dry-aged A5 Japanese wagyu ribeye, charcoal-grilled to perfection with truffle butter and seasonal vegetables.',
      brand: 'Steak House Premium',
      status: 'IMAGE_ONLY',
      tags: ['wagyu', 'steak', 'premium', 'japanese'],
      scalePreset: 0.3,
      anchorType: 'table',
      assetCompletenessScore: 15,
    },
  });

  const wagyuImagePath = createPlaceholderImage(steakHouse.id, wagyuSteak.id, 'wagyu-steak.jpg');
  await prisma.productAsset.create({
    data: {
      productId: wagyuSteak.id,
      assetType: 'IMAGE_2D',
      fileName: 'wagyu-steak.jpg',
      filePath: wagyuImagePath,
      fileSize: 250000,
      mimeType: 'image/jpeg',
    },
  });
  await prisma.product.update({
    where: { id: wagyuSteak.id },
    data: { thumbnailUrl: wagyuImagePath },
  });

  // Tomahawk Steak — IMAGE_ONLY
  const tomahawkSteak = await prisma.product.create({
    data: {
      companyId: steakHouse.id,
      title: 'Tomahawk Steak',
      sku: 'SH-TMH-001',
      category: 'Steak',
      description: '1.2kg bone-in tomahawk ribeye, wood-fired and served with roasted garlic, bone marrow, and peppercorn sauce.',
      brand: 'Steak House Premium',
      status: 'IMAGE_ONLY',
      tags: ['tomahawk', 'steak', 'bone-in', 'premium'],
      scalePreset: 0.35,
      anchorType: 'table',
      assetCompletenessScore: 15,
    },
  });

  const tomahawkImagePath = createPlaceholderImage(steakHouse.id, tomahawkSteak.id, 'tomahawk-steak.jpg');
  await prisma.productAsset.create({
    data: {
      productId: tomahawkSteak.id,
      assetType: 'IMAGE_2D',
      fileName: 'tomahawk-steak.jpg',
      filePath: tomahawkImagePath,
      fileSize: 280000,
      mimeType: 'image/jpeg',
    },
  });
  await prisma.product.update({
    where: { id: tomahawkSteak.id },
    data: { thumbnailUrl: tomahawkImagePath },
  });

  // Black Abaya — IMAGE_ONLY
  const blackAbaya = await prisma.product.create({
    data: {
      companyId: abayaBoutique.id,
      title: 'Black Abaya',
      sku: 'NA-BLK-001',
      category: 'Abaya',
      description: 'Elegant black abaya with intricate embroidery and flowing silhouette. Premium crepe fabric with hand-stitched details.',
      brand: 'Noor Couture',
      status: 'IMAGE_ONLY',
      tags: ['abaya', 'black', 'embroidery', 'premium'],
      scalePreset: 1.0,
      anchorType: 'floor',
      assetCompletenessScore: 15,
    },
  });

  const abayaImagePath = createPlaceholderImage(abayaBoutique.id, blackAbaya.id, 'black-abaya.jpg');
  await prisma.productAsset.create({
    data: {
      productId: blackAbaya.id,
      assetType: 'IMAGE_2D',
      fileName: 'black-abaya.jpg',
      filePath: abayaImagePath,
      fileSize: 320000,
      mimeType: 'image/jpeg',
    },
  });
  await prisma.product.update({
    where: { id: blackAbaya.id },
    data: { thumbnailUrl: abayaImagePath },
  });

  console.log('Image-to-3D test products created!');
  console.log('  Wagyu Steak (IMAGE_ONLY) — ready for pipeline');
  console.log('  Tomahawk Steak (IMAGE_ONLY) — ready for pipeline');
  console.log('  Black Abaya (IMAGE_ONLY) — ready for pipeline');

  // ============================================================
  // Face Try-On Module — Eyewear test products
  // ============================================================
  console.log('Creating Face Try-On test products...');

  const eyewearBrand = await prisma.company.create({
    data: {
      name: 'Optica Eyewear',
      slug: 'optica-eyewear',
      brandPrimary: '#7c3aed',
      brandSecondary: '#a78bfa',
      domain: 'optica-eyewear.com',
    },
  });

  await prisma.membership.create({
    data: { userId: superAdmin.id, companyId: eyewearBrand.id, role: 'SUPER_ADMIN' },
  });

  // Aviator Sunglasses — FACE_TRYON
  const aviatorGlasses = await prisma.product.create({
    data: {
      companyId: eyewearBrand.id,
      title: 'Aviator Sunglasses Classic',
      sku: 'OPT-AVT-001',
      category: 'Eyewear',
      description: 'Classic aviator sunglasses with polarized lenses and gold-tone metal frame. UV400 protection.',
      brand: 'Optica',
      status: 'ACTIVE',
      tags: ['sunglasses', 'aviator', 'polarized', 'classic'],
      scalePreset: 1.0,
      anchorType: 'face',
      assetCompletenessScore: 80,
    },
  });

  const aviatorOverlayPath = createPlaceholderImage(eyewearBrand.id, aviatorGlasses.id, 'aviator-overlay.png');
  const aviatorThumbnailPath = createPlaceholderImage(eyewearBrand.id, aviatorGlasses.id, 'aviator-thumbnail.png');

  await prisma.productAsset.createMany({
    data: [
      {
        productId: aviatorGlasses.id,
        assetType: 'FACE_OVERLAY_IMAGE',
        fileName: 'aviator-overlay.png',
        filePath: aviatorOverlayPath,
        fileSize: 45000,
        mimeType: 'image/png',
        metadata: { placement: 'GLASSES', offsetY: 0 },
      },
      {
        productId: aviatorGlasses.id,
        assetType: 'THUMBNAIL',
        fileName: 'aviator-thumbnail.png',
        filePath: aviatorThumbnailPath,
        fileSize: 30000,
        mimeType: 'image/png',
      },
    ],
  });

  await prisma.product.update({
    where: { id: aviatorGlasses.id },
    data: { thumbnailUrl: aviatorThumbnailPath },
  });

  // Cat-Eye Frames — FACE_TRYON
  const catEyeFrames = await prisma.product.create({
    data: {
      companyId: eyewearBrand.id,
      title: 'Cat Eye Fashion Frames',
      sku: 'OPT-CAT-001',
      category: 'Eyewear',
      description: 'Retro cat-eye frames with acetate construction. Available with prescription or clear lenses.',
      brand: 'Optica',
      status: 'ACTIVE',
      tags: ['glasses', 'cat-eye', 'retro', 'fashion'],
      scalePreset: 1.0,
      anchorType: 'face',
      assetCompletenessScore: 80,
    },
  });

  const catEyeOverlayPath = createPlaceholderImage(eyewearBrand.id, catEyeFrames.id, 'cateye-overlay.png');
  const catEyeThumbnailPath = createPlaceholderImage(eyewearBrand.id, catEyeFrames.id, 'cateye-thumbnail.png');

  await prisma.productAsset.createMany({
    data: [
      {
        productId: catEyeFrames.id,
        assetType: 'FACE_OVERLAY_IMAGE',
        fileName: 'cateye-overlay.png',
        filePath: catEyeOverlayPath,
        fileSize: 42000,
        mimeType: 'image/png',
        metadata: { placement: 'GLASSES', offsetY: 0 },
      },
      {
        productId: catEyeFrames.id,
        assetType: 'THUMBNAIL',
        fileName: 'cateye-thumbnail.png',
        filePath: catEyeThumbnailPath,
        fileSize: 28000,
        mimeType: 'image/png',
      },
    ],
  });

  await prisma.product.update({
    where: { id: catEyeFrames.id },
    data: { thumbnailUrl: catEyeThumbnailPath },
  });

  // Create FACE_TRYON experiences
  const aviatorTryOn = await prisma.experience.create({
    data: {
      companyId: eyewearBrand.id,
      productId: aviatorGlasses.id,
      name: 'Aviator Virtual Try-On',
      slug: 'optica-aviator-tryon',
      experienceType: 'FACE_TRYON',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'studio',
      backgroundMode: 'transparent',
      ctaText: 'Buy Now',
      ctaLink: 'https://optica-eyewear.com/aviator',
      sceneConfig: { placementMode: 'GLASSES' },
      analyticsEnabled: true,
    },
  });

  const catEyeTryOn = await prisma.experience.create({
    data: {
      companyId: eyewearBrand.id,
      productId: catEyeFrames.id,
      name: 'Cat Eye Virtual Try-On',
      slug: 'optica-cateye-tryon',
      experienceType: 'FACE_TRYON',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'studio',
      backgroundMode: 'transparent',
      ctaText: 'Buy Now',
      ctaLink: 'https://optica-eyewear.com/cateye',
      sceneConfig: { placementMode: 'GLASSES' },
      analyticsEnabled: true,
    },
  });

  await prisma.publishRecord.createMany({
    data: [
      {
        experienceId: aviatorTryOn.id,
        companyId: eyewearBrand.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/tryon/optica-aviator-tryon',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
      {
        experienceId: catEyeTryOn.id,
        companyId: eyewearBrand.id,
        publishStatus: 'PUBLISHED',
        publicUrl: 'http://localhost:3000/tryon/optica-cateye-tryon',
        publishedAt: new Date(),
        publishedBy: superAdmin.id,
      },
    ],
  });

  console.log('Face Try-On test products created!');
  console.log('  Aviator Sunglasses (FACE_TRYON) — /tryon/optica-aviator-tryon');
  console.log('  Cat Eye Frames (FACE_TRYON) — /tryon/optica-cateye-tryon');

  // ============================================================
  // Body Tracking Demo — Noor Abaya Boutique
  // ============================================================
  console.log('Creating Body Tracking demo...');

  const bodyTrackingDemo = await prisma.experience.create({
    data: {
      companyId: abayaBoutique.id,
      productId: blackAbaya.id,
      name: 'Abaya Body Tracking Demo',
      slug: 'noor-body-tracking-demo',
      experienceType: 'BODY_TRYON',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'natural',
      backgroundMode: 'camera',
      ctaText: 'Shop Now',
      ctaLink: 'https://noorabaya.com/black-abaya',
      sceneConfig: { placementMode: 'BODY' },
      analyticsEnabled: true,
    },
  });

  await prisma.publishRecord.create({
    data: {
      experienceId: bodyTrackingDemo.id,
      companyId: abayaBoutique.id,
      publishStatus: 'PUBLISHED',
      publicUrl: 'http://localhost:3000/body/noor-body-tracking-demo',
      publishedAt: new Date(),
      publishedBy: superAdmin.id,
    },
  });

  console.log('  Body Tracking Demo (BODY_TRYON) — /body/noor-body-tracking-demo');

  // ============================================================
  // Clothing Try-On Photo Demo — Noor Abaya Boutique
  // ============================================================
  console.log('Creating Clothing Try-On Photo demo...');

  const garmentImagePath = createPlaceholderImage(abayaBoutique.id, blackAbaya.id, 'black-abaya-garment.png');

  const clothingTryOnDemo = await prisma.experience.create({
    data: {
      companyId: abayaBoutique.id,
      productId: blackAbaya.id,
      name: 'Abaya Virtual Fit Demo',
      slug: 'noor-virtual-fit-demo',
      experienceType: 'CLOTHING_TRYON_PHOTO',
      publishStatus: 'PUBLISHED',
      lightingPreset: 'studio',
      backgroundMode: 'white',
      ctaText: 'Buy This Abaya',
      ctaLink: 'https://noorabaya.com/black-abaya',
      sceneConfig: { placementMode: 'CLOTHING' },
      analyticsEnabled: true,
    },
  });

  // Add garment image asset for the clothing try-on experience
  await prisma.productAsset.create({
    data: {
      productId: blackAbaya.id,
      assetType: 'GARMENT_IMAGE',
      fileName: 'black-abaya-garment.png',
      filePath: garmentImagePath,
      fileSize: 450000,
      mimeType: 'image/png',
    },
  });

  await prisma.publishRecord.create({
    data: {
      experienceId: clothingTryOnDemo.id,
      companyId: abayaBoutique.id,
      publishStatus: 'PUBLISHED',
      publicUrl: 'http://localhost:3000/virtual-fit/noor-virtual-fit-demo',
      publishedAt: new Date(),
      publishedBy: superAdmin.id,
    },
  });

  console.log('  Clothing Try-On Photo (CLOTHING_TRYON_PHOTO) — /virtual-fit/noor-virtual-fit-demo');

  console.log('Seed complete!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Super Admin: admin@arcore7.com / admin123');
  console.log('  Company Admin: sarah@luxebrands.com / admin123');
  console.log('  Content Manager: mike@luxebrands.com / admin123');
  console.log('  Viewer: viewer@arcore7.com / viewer123');
  console.log('');
  console.log('Products with full assets:');
  console.log('  Premium Running Sneaker (Luxe Brands) — GLB + Thumbnail + Poster + 2 Images + Target Image = 100%');
  console.log('  Chronograph Watch Elite (Luxe Brands) — GLB + Thumbnail = 50%');
  console.log('  Wireless ANC Headphones (TechGear Pro) — GLB = 30%');
  console.log('');
  console.log('Try-On experiences:');
  console.log('  Aviator Virtual Try-On — /tryon/optica-aviator-tryon');
  console.log('  Cat Eye Virtual Try-On — /tryon/optica-cateye-tryon');
  console.log('  Body Tracking Demo — /body/noor-body-tracking-demo');
  console.log('  Virtual Fit Demo — /virtual-fit/noor-virtual-fit-demo');
  console.log('');
  console.log(`Analytics events: ${analyticsData.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
