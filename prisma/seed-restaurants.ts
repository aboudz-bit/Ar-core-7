import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function createPlaceholderImage(companyId: string, productId: string, fileName: string): string {
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
  writeFileSync(path.join(dir, safeName), png);
  return `/uploads/${companyId}/products/${productId}/${safeName}`;
}

function createPlaceholderGlb(companyId: string, productId: string, fileName: string, color: number[]): string {
  const segments = 24;
  const radius = 0.12;
  const height = 0.02;

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  positions.push(0, height, 0);
  normals.push(0, 1, 0);

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    normals.push(0, 1, 0);
  }

  for (let i = 1; i <= segments; i++) {
    indices.push(0, i, i + 1);
  }

  const bottomCenter = segments + 2;
  positions.push(0, 0, 0);
  normals.push(0, -1, 0);

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
  const idxPad = (4 - (idxBuf.length % 4)) % 4;
  const idxBufPadded = idxPad > 0 ? Buffer.concat([idxBuf, Buffer.alloc(idxPad)]) : idxBuf;
  const binBuffer = Buffer.concat([posBuf, normBuf, idxBufPadded]);

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
    nodes: [{ name: 'DemoModel', mesh: 0 }],
    materials: [{
      name: 'Material',
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
      { bufferView: 0, componentType: 5126, count: vertexCount, type: 'VEC3', max: [maxX, maxY, maxZ], min: [minX, minY, minZ] },
      { bufferView: 1, componentType: 5126, count: vertexCount, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: indices.length, type: 'SCALAR' },
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
  writeFileSync(path.join(dir, safeName), glb);
  return `/uploads/${companyId}/products/${productId}/${safeName}`;
}

interface RestaurantDef {
  name: string;
  slug: string;
  brandPrimary: string;
  brandSecondary: string;
  description: string;
  products: {
    title: string;
    sku: string;
    category: string;
    description: string;
    tags: string[];
    slug: string;
    color: number[];
  }[];
}

const restaurants: RestaurantDef[] = [
  {
    name: 'Nozomi Al Khobar',
    slug: 'nozomi-alkhobar',
    brandPrimary: '#1a1a2e',
    brandSecondary: '#c9a96e',
    description: 'Luxury Japanese dining experience in Al Khobar, Saudi Arabia.',
    products: [
      {
        title: 'Wagyu Sushi',
        sku: 'NZ-WGS-001',
        category: 'Sushi',
        description: 'Premium A5 wagyu beef sushi with truffle soy glaze, served on warm shari rice with gold leaf garnish.',
        tags: ['sushi', 'wagyu', 'japanese', 'premium'],
        slug: 'nz-wagyu-sushi',
        color: [0.72, 0.25, 0.18],
      },
      {
        title: 'Salmon Nigiri',
        sku: 'NZ-SLN-002',
        category: 'Sushi',
        description: 'Fresh Norwegian salmon nigiri with citrus ponzu, micro herbs, and edible flowers on hand-pressed rice.',
        tags: ['nigiri', 'salmon', 'japanese', 'fresh'],
        slug: 'nz-salmon-nigiri',
        color: [0.95, 0.55, 0.35],
      },
      {
        title: 'Matcha Dessert',
        sku: 'NZ-MTC-003',
        category: 'Dessert',
        description: 'Ceremonial-grade matcha mousse with white chocolate ganache, azuki bean compote, and matcha tuile.',
        tags: ['matcha', 'dessert', 'japanese', 'sweet'],
        slug: 'nz-matcha-dessert',
        color: [0.35, 0.65, 0.30],
      },
    ],
  },
  {
    name: 'Steak House Al Khobar Premium',
    slug: 'steakhouse-alkhobar',
    brandPrimary: '#4a1c1c',
    brandSecondary: '#c0392b',
    description: 'Premium steak and grill restaurant in Al Khobar, Saudi Arabia.',
    products: [
      {
        title: 'Wagyu Steak',
        sku: 'SH-WGS-001',
        category: 'Steak',
        description: 'Dry-aged A5 Japanese wagyu ribeye, charcoal-grilled to perfection with truffle butter and seasonal vegetables.',
        tags: ['steak', 'wagyu', 'premium', 'grilled'],
        slug: 'sh-wagyu-steak',
        color: [0.55, 0.20, 0.15],
      },
      {
        title: 'Tomahawk Steak',
        sku: 'SH-TMH-002',
        category: 'Steak',
        description: '1.2kg bone-in tomahawk ribeye, wood-fired and served with roasted garlic, bone marrow, and peppercorn sauce.',
        tags: ['steak', 'tomahawk', 'bone-in', 'premium'],
        slug: 'sh-tomahawk-steak',
        color: [0.60, 0.22, 0.12],
      },
      {
        title: 'Truffle Burger',
        sku: 'SH-TRB-003',
        category: 'Burger',
        description: 'Wagyu beef patty with black truffle aioli, aged gruyere, caramelized onions on a brioche bun.',
        tags: ['burger', 'truffle', 'wagyu', 'gourmet'],
        slug: 'sh-truffle-burger',
        color: [0.65, 0.40, 0.20],
      },
    ],
  },
  {
    name: 'Brioche Dorée Cafe',
    slug: 'brioche-doree-alkhobar',
    brandPrimary: '#8b6914',
    brandSecondary: '#d4a843',
    description: 'Elegant French cafe with pastries and coffee in Al Khobar, Saudi Arabia.',
    products: [
      {
        title: 'Croissant',
        sku: 'BD-CRS-001',
        category: 'Pastry',
        description: 'Handmade French butter croissant with 72-hour fermented dough, baked golden and flaky every morning.',
        tags: ['croissant', 'pastry', 'french', 'butter'],
        slug: 'bd-croissant',
        color: [0.85, 0.68, 0.35],
      },
      {
        title: 'Chocolate Cake',
        sku: 'BD-CHC-002',
        category: 'Dessert',
        description: 'Rich Valrhona dark chocolate fondant with molten center, served with vanilla bean ice cream and cocoa dust.',
        tags: ['chocolate', 'cake', 'dessert', 'french'],
        slug: 'bd-chocolate-cake',
        color: [0.30, 0.15, 0.08],
      },
      {
        title: 'Latte',
        sku: 'BD-LAT-003',
        category: 'Beverage',
        description: 'Single-origin Ethiopian espresso with silky steamed milk and delicate latte art, served in artisan ceramic.',
        tags: ['latte', 'coffee', 'espresso', 'beverage'],
        slug: 'bd-latte',
        color: [0.75, 0.58, 0.40],
      },
    ],
  },
];

async function main() {
  console.log('Adding 3 premium Al Khobar restaurants...\n');

  const superAdmin = await prisma.user.findUnique({ where: { email: 'admin@arcore7.com' } });
  if (!superAdmin) {
    throw new Error('Super admin user not found. Run the main seed first.');
  }

  for (const rest of restaurants) {
    const existing = await prisma.company.findUnique({ where: { slug: rest.slug } });
    if (existing) {
      console.log(`  Skipping "${rest.name}" — already exists.`);
      continue;
    }

    const company = await prisma.company.create({
      data: {
        name: rest.name,
        slug: rest.slug,
        brandPrimary: rest.brandPrimary,
        brandSecondary: rest.brandSecondary,
        domain: `${rest.slug}.arcore7.com`,
      },
    });

    await prisma.membership.create({
      data: { userId: superAdmin.id, companyId: company.id, role: 'SUPER_ADMIN' },
    });

    console.log(`  Created company: ${rest.name}`);

    for (const prod of rest.products) {
      const product = await prisma.product.create({
        data: {
          companyId: company.id,
          title: prod.title,
          sku: prod.sku,
          category: prod.category,
          description: prod.description,
          brand: rest.name,
          status: 'ACTIVE',
          tags: prod.tags,
          scalePreset: 0.3,
          anchorType: 'table',
          assetCompletenessScore: 100,
        },
      });

      const glbPath = createPlaceholderGlb(company.id, product.id, `${prod.slug}.glb`, prod.color);
      const posterPath = createPlaceholderImage(company.id, product.id, `${prod.slug}-poster.png`);
      const thumbnailPath = createPlaceholderImage(company.id, product.id, `${prod.slug}-thumb.png`);

      await prisma.productAsset.createMany({
        data: [
          {
            productId: product.id,
            assetType: 'MODEL_GLB',
            fileName: `${prod.slug}.glb`,
            filePath: glbPath,
            fileSize: 4096,
            mimeType: 'model/gltf-binary',
            isProcessed: true,
            processingStatus: 'optimized',
          },
          {
            productId: product.id,
            assetType: 'POSTER',
            fileName: `${prod.slug}-poster.png`,
            filePath: posterPath,
            fileSize: 1024,
            mimeType: 'image/png',
          },
          {
            productId: product.id,
            assetType: 'THUMBNAIL',
            fileName: `${prod.slug}-thumb.png`,
            filePath: thumbnailPath,
            fileSize: 1024,
            mimeType: 'image/png',
          },
        ],
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { thumbnailUrl: thumbnailPath },
      });

      const experience = await prisma.experience.create({
        data: {
          companyId: company.id,
          productId: product.id,
          name: `${prod.title} AR`,
          slug: prod.slug,
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

      await prisma.publishRecord.create({
        data: {
          experienceId: experience.id,
          companyId: company.id,
          publishStatus: 'PUBLISHED',
          publicUrl: `/ar/${prod.slug}`,
          publishedAt: new Date(),
          publishedBy: superAdmin.id,
        },
      });

      console.log(`    Product: ${prod.title} (+ GLB + poster + thumbnail + AR experience)`);
    }

    const now = new Date();
    const analyticsData = [];
    const companyProducts = await prisma.product.findMany({ where: { companyId: company.id } });
    const companyExperiences = await prisma.experience.findMany({ where: { companyId: company.id } });

    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const viewCount = Math.floor(Math.random() * 12) + 5;
      const arCount = Math.floor(Math.random() * 6) + 2;

      for (let j = 0; j < viewCount; j++) {
        const pIdx = Math.floor(Math.random() * companyProducts.length);
        const eIdx = Math.floor(Math.random() * companyExperiences.length);
        analyticsData.push({
          companyId: company.id,
          productId: companyProducts[pIdx].id,
          experienceId: companyExperiences[eIdx].id,
          eventType: 'page_view',
          sessionId: Math.random().toString(36).slice(2),
          createdAt: date,
        });
      }

      for (let j = 0; j < arCount; j++) {
        const pIdx = Math.floor(Math.random() * companyProducts.length);
        const eIdx = Math.floor(Math.random() * companyExperiences.length);
        analyticsData.push({
          companyId: company.id,
          productId: companyProducts[pIdx].id,
          experienceId: companyExperiences[eIdx].id,
          eventType: 'ar_launch',
          sessionId: Math.random().toString(36).slice(2),
          createdAt: date,
        });
      }
    }

    await prisma.analyticsEvent.createMany({ data: analyticsData });
    console.log(`    Analytics: ${analyticsData.length} events generated\n`);
  }

  console.log('Done! 3 premium Al Khobar restaurants added.');
  console.log('They are visible in Companies, Products, and Experiences in the dashboard.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
