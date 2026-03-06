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

async function main() {
  console.log('Seeding AR-core-7 database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.publishRecord.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.productAsset.deleteMany();
  await prisma.product.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.membership.deleteMany();
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

  const sneakerGlbPath = createPlaceholderGlb(luxeBrands.id, sneaker.id, 'sneaker-model.glb');
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
        fileName: 'sneaker-model.glb',
        filePath: sneakerGlbPath,
        fileSize: 2457600, // ~2.4MB
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
  const watchGlbPath = createPlaceholderGlb(luxeBrands.id, watch.id, 'watch-model.glb');
  const watchThumbnailPath = createPlaceholderImage(luxeBrands.id, watch.id, 'watch-thumbnail.png');

  await prisma.productAsset.createMany({
    data: [
      {
        productId: watch.id,
        assetType: 'MODEL_GLB',
        fileName: 'watch-model.glb',
        filePath: watchGlbPath,
        fileSize: 1800000,
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
  const hpGlbPath = createPlaceholderGlb(techGear.id, headphones.id, 'headphones-model.glb');
  await prisma.productAsset.create({
    data: {
      productId: headphones.id,
      assetType: 'MODEL_GLB',
      fileName: 'headphones-model.glb',
      filePath: hpGlbPath,
      fileSize: 3200000,
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
  console.log(`Companies: ${3}`);
  console.log(`Products: ${7}`);
  console.log(`Experiences: ${6}`);
  console.log(`Product Assets: ${9}`);
  console.log(`Analytics events: ${analyticsData.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
