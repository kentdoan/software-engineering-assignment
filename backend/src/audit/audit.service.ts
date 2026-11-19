import { Injectable } from '@nestjs/common';
import { generateId } from '../common/id.helpers';
import { AuditCategory, AuditLogEntry } from '../common/types';
import { mapAuditLogFromPrisma } from '../common/mappers.helpers';
import { PrismaService } from '../prisma/prisma.service';

export interface AppendAuditInput {
  category: AuditCategory;
  actorName: string;
  actorId: string;
  description: string;
  ipAddress?: string;
  status?: 'SUCCESS' | 'WARNING' | 'ERROR';
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AppendAuditInput): Promise<AuditLogEntry> {
    const created = await this.prisma.audit_logs.create({
      data: {
        id: generateId('log'),
        category: input.category,
        actor_name: input.actorName,
        actor_id: input.actorId,
        description: input.description,
        ip_address: input.ipAddress || '127.0.0.1',
        status: input.status || 'SUCCESS',
      },
    });
    return mapAuditLogFromPrisma(created);
  }
}
