import { ActionRiskLevel } from './approval';

export interface ToolValidationResult {
  valid: boolean;
  error?: string;
  normalizedParams?: Record<string, any>;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  message: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  riskLevel: ActionRiskLevel;
  requiresApproval: boolean;
  inputSchema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
    required?: string[];
  };
  validate: (params: Record<string, any>) => ToolValidationResult;
  execute: (params: Record<string, any>, context?: any) => Promise<ToolExecutionResult>;
}
