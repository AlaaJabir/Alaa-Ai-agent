import { ActionRiskLevel } from './approval';

export type AuditActor = 'USER' | 'AGENT' | 'APPROVAL_ENGINE' | 'SYSTEM';
export type AuditStatus = 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PENDING' | 'REJECTED' | 'EXPIRED';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actionType: string;
  status: AuditStatus;
  actor: AuditActor;
  riskLevel: ActionRiskLevel;
  details: string;
  approvalId?: string;
  toolId?: string;
  metadata?: Record<string, any>;
}
