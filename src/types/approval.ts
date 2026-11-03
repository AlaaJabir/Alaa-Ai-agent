export type ActionRiskLevel = 'READ' | 'PROPOSE' | 'MODIFY' | 'DELETE' | 'EXTERNAL_ACTION';

export type ActionLifecycleState =
  | 'PROPOSED'
  | 'VALIDATED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'FAILED';

export interface ApprovalRequest {
  id: string;
  toolId: string;
  actionName: string;
  description: string;
  target: string;
  dataAffected: string;
  riskLevel: ActionRiskLevel;
  params: Record<string, any>;
  state: ActionLifecycleState;
  requestedAt: number;
  resolvedAt?: number;
  executedAt?: number;
  rejectionReason?: string;
  executionResult?: {
    success: boolean;
    data?: any;
    message: string;
  };
  conversationId?: string;
  messageId?: string;
  expiresAt: number; // e.g. 24 hours after creation
}
