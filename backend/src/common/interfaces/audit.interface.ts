export type AuditCategory = 'QUAN_TRI' | 'CANH_BAO' | 'API' | 'VAN_HANH';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: AuditCategory;
  actorName: string;
  actorId: string;
  description: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}
