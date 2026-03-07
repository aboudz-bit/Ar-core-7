import { prisma } from './prisma';

export async function logAudit(params: {
  userId?: string;
  companyId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) : undefined,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
