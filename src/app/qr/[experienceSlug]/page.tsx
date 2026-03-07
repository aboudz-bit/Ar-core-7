import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { QrPageClient } from './QrPageClient';

interface Props {
  params: { experienceSlug: string };
}

export default async function QrPage({ params }: Props) {
  const experience = await prisma.experience.findUnique({
    where: { slug: params.experienceSlug },
    include: {
      company: true,
      product: { select: { title: true } },
    },
  });

  if (!experience) return notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const arUrl = `${appUrl}/ar/${experience.slug}`;

  return (
    <QrPageClient
      experience={{
        name: experience.name,
        type: experience.experienceType,
      }}
      company={{
        name: experience.company.name,
        brandPrimary: experience.company.brandPrimary,
      }}
      arUrl={arUrl}
      productTitle={experience.product?.title || null}
    />
  );
}
