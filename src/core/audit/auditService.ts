import { saveAuditLog } from '../../db/auditLogs';
import { AuditActor, AuditLogEntry, AuditStatus } from '../../types/audit';
import { ActionRiskLevel } from '../../types/approval';

export async function recordAudit(params: {
  actionType: string;
  status: AuditStatus;
  actor: AuditActor;
  riskLevel: ActionRiskLevel;
  details: string;
  approvalId?: string;
  toolId?: string;
  metadata?: Record<string, any>;
}): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    actionType: params.actionType,
    status: params.status,
    actor: params.actor,
    riskLevel: params.riskLevel,
    details: params.details,
    approvalId: params.approvalId,
    toolId: params.toolId,
    metadata: params.metadata,
  };

  try {
    await saveAuditLog(entry);
  } catch (err) {
    console.error('Failed to write audit log entry to IndexedDB:', err);
  }

  return entry;
}
