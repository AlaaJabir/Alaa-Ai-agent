import { ActionRiskLevel } from '../../types/approval';
import { AppSettings } from '../../types/settings';

export interface PolicyEvaluation {
  requiresApproval: boolean;
  reason: string;
  autoExecutable: boolean;
}

export function evaluatePolicy(
  riskLevel: ActionRiskLevel,
  toolRequiresApproval: boolean,
  settings: AppSettings
): PolicyEvaluation {
  // If user enabled strict approval mode, all actions except read need approval, or even read
  if (settings.strictApprovalMode) {
    return {
      requiresApproval: true,
      reason: 'Strict approval mode is active: all actions require explicit confirmation.',
      autoExecutable: false,
    };
  }

  switch (riskLevel) {
    case 'READ':
      if (toolRequiresApproval) {
        return {
          requiresApproval: true,
          reason: 'This read-only tool explicitly requested approval check.',
          autoExecutable: false,
        };
      }
      return {
        requiresApproval: false,
        reason: 'Read operations are safe and read-only.',
        autoExecutable: true,
      };

    case 'PROPOSE':
      return {
        requiresApproval: false,
        reason: 'Proposal only generates ideas/plans without executing system modifications.',
        autoExecutable: true,
      };

    case 'MODIFY':
      return {
        requiresApproval: true,
        reason: 'State modification operations require explicit user authorization.',
        autoExecutable: false,
      };

    case 'DELETE':
      return {
        requiresApproval: true,
        reason: 'Destructive deletion operations permanently alter local state and require explicit consent.',
        autoExecutable: false,
      };

    case 'EXTERNAL_ACTION':
      return {
        requiresApproval: true,
        reason: 'External actions communicate outside the local sandbox and always require explicit approval.',
        autoExecutable: false,
      };

    default:
      return {
        requiresApproval: true,
        reason: 'Unknown risk classification defaults to mandatory approval.',
        autoExecutable: false,
      };
  }
}
