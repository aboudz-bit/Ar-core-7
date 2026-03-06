import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
      assetCompletenessScore: 30,
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
      assetCompletenessScore: 20,
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

  const watchImageTarget = await prisma.experience.create({
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

  const lampViewer = await prisma.experience.create({
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
      { userId: superAdmin.id, companyId: luxeBrands.id, action: 'CREATE', entity: 'Experience', entityId: sneakerViewer.id },
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
  console.log(`Companies: ${3}`);
  console.log(`Products: ${7}`);
  console.log(`Experiences: ${6}`);
  console.log(`Analytics events: ${analyticsData.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
