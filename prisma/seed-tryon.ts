import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding try-on demo experiences...');

  const luxe = await prisma.company.findUnique({ where: { slug: 'luxe-brands' } });
  const noor = await prisma.company.findUnique({ where: { slug: 'noor-home' } });

  if (!luxe) throw new Error('Company "luxe-brands" not found. Run base seed first.');
  if (!noor) throw new Error('Company "noor-home" not found. Run base seed first.');

  // --- 1. FACE_TRYON: Optica Aviator Try-On (under Luxe Brands) ---

  let aviatorProduct = await prisma.product.findFirst({
    where: { title: 'Optica Aviator Glasses', companyId: luxe.id },
  });

  if (!aviatorProduct) {
    aviatorProduct = await prisma.product.create({
      data: {
        title: 'Optica Aviator Glasses',
        description: 'Classic aviator-style sunglasses with UV protection and polarized lenses. Try them on virtually using face tracking.',
        category: 'Eyewear',
        status: 'ACTIVE',
        companyId: luxe.id,
      },
    });
    console.log('  Created product: Optica Aviator Glasses');
  }

  const existingFaceTryon = await prisma.experience.findUnique({
    where: { slug: 'optica-aviator-tryon' },
  });
  if (!existingFaceTryon) {
    await prisma.experience.create({
      data: {
        name: 'Optica Aviator Try-On',
        slug: 'optica-aviator-tryon',
        experienceType: 'FACE_TRYON',
        publishStatus: 'PUBLISHED',
        scale: 1.0,
        companyId: luxe.id,
        productId: aviatorProduct.id,
        ctaText: 'Buy Now',
        ctaLink: 'https://example.com/shop/aviator',
        sceneConfig: {
          placementMode: 'GLASSES',
          smoothingFactor: 0.3,
        },
      },
    });
    console.log('  Created experience: optica-aviator-tryon (FACE_TRYON)');
  } else {
    console.log('  Experience optica-aviator-tryon already exists, skipping');
  }

  // --- 2. BODY_TRYON: Noor Body Tracking Demo (under Noor Home Decor) ---

  let bodyProduct = await prisma.product.findFirst({
    where: { title: 'Noor Body Tracking Demo', companyId: noor.id },
  });

  if (!bodyProduct) {
    bodyProduct = await prisma.product.create({
      data: {
        title: 'Noor Body Tracking Demo',
        description: 'Real-time body pose estimation and skeleton tracking demo. Detects 33 body landmarks using MediaPipe Pose.',
        category: 'Demo',
        status: 'ACTIVE',
        companyId: noor.id,
      },
    });
    console.log('  Created product: Noor Body Tracking Demo');
  }

  const existingBodyTryon = await prisma.experience.findUnique({
    where: { slug: 'noor-body-tracking-demo' },
  });
  if (!existingBodyTryon) {
    await prisma.experience.create({
      data: {
        name: 'Noor Body Tracking Demo',
        slug: 'noor-body-tracking-demo',
        experienceType: 'BODY_TRYON',
        publishStatus: 'PUBLISHED',
        scale: 1.0,
        companyId: noor.id,
        productId: bodyProduct.id,
        ctaText: null,
        ctaLink: null,
        sceneConfig: {
          showSkeleton: true,
          showLandmarks: true,
        },
      },
    });
    console.log('  Created experience: noor-body-tracking-demo (BODY_TRYON)');
  } else {
    console.log('  Experience noor-body-tracking-demo already exists, skipping');
  }

  // --- 3. CLOTHING_TRYON_PHOTO: Noor Virtual Fit Demo (under Noor Home Decor) ---

  let fitProduct = await prisma.product.findFirst({
    where: { title: 'Noor Virtual Fit Demo', companyId: noor.id },
  });

  if (!fitProduct) {
    fitProduct = await prisma.product.create({
      data: {
        title: 'Noor Virtual Fit Demo',
        description: 'Upload a photo and a garment image to see a virtual try-on preview. Photo-based clothing overlay demo.',
        category: 'Clothing',
        status: 'ACTIVE',
        companyId: noor.id,
      },
    });
    console.log('  Created product: Noor Virtual Fit Demo');
  }

  const existingVirtualFit = await prisma.experience.findUnique({
    where: { slug: 'noor-virtual-fit-demo' },
  });
  if (!existingVirtualFit) {
    await prisma.experience.create({
      data: {
        name: 'Noor Virtual Fit Demo',
        slug: 'noor-virtual-fit-demo',
        experienceType: 'CLOTHING_TRYON_PHOTO',
        publishStatus: 'PUBLISHED',
        scale: 1.0,
        companyId: noor.id,
        productId: fitProduct.id,
        ctaText: 'Explore Collection',
        ctaLink: 'https://example.com/noor/collection',
        sceneConfig: null,
      },
    });
    console.log('  Created experience: noor-virtual-fit-demo (CLOTHING_TRYON_PHOTO)');
  } else {
    console.log('  Experience noor-virtual-fit-demo already exists, skipping');
  }

  console.log('Try-on seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
