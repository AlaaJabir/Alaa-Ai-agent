import { ApprovalRequest, ActionLifecycleState } from '../../types/approval';
import { getToolDefinition } from '../tools/toolRegistry';
import { evaluatePolicy } from './policy';
import { getSettings } from '../../db/settings';
import { saveApproval, getApproval, getAllApprovals } from '../../db/approvals';
import { recordAudit } from '../audit/auditService';

export class ApprovalEngine {
  /**
   * Propose a tool action from Gemini or user interaction.
   * Runs validation against Tool Registry and Policy.
   */
  static async proposeAction(params: {
    toolId: string;
    actionName: string;
    description: string;
    target: string;
    dataAffected: string;
    params: Record<string, any>;
    conversationId?: string;
    messageId?: string;
  }): Promise<{ request?: ApprovalRequest; autoExecuted?: boolean; result?: any; error?: string }> {
    const tool = getToolDefinition(params.toolId);
    if (!tool) {
      await recordAudit({
        actionType: 'TOOL_PROPOSAL_REJECTED',
        status: 'BLOCKED',
        actor: 'APPROVAL_ENGINE',
        riskLevel: 'EXTERNAL_ACTION',
        details: `Rejected execution of unregistered tool "${params.toolId}".`,
      });
      return { error: `Security Error: Tool "${params.toolId}" is not registered in the Tool Registry.` };
    }

    // Step 1: Validate parameters against schema
    const validation = tool.validate(params.params);
    if (!validation.valid) {
      await recordAudit({
        actionType: 'TOOL_VALIDATION_FAILED',
        status: 'FAILURE',
        actor: 'APPROVAL_ENGINE',
        riskLevel: tool.riskLevel,
        details: `Tool "${params.toolId}" parameters failed validation: ${validation.error}`,
        toolId: tool.id,
      });
      return { error: `Validation Failed: ${validation.error}` };
    }

    const settings = await getSettings();
    const policy = evaluatePolicy(tool.riskLevel, tool.requiresApproval, settings);

    const now = Date.now();
    const expiresHours = settings.autoExpireApprovalsHours || 24;
    const expiresAt = now + expiresHours * 60 * 60 * 1000;

    const approvalRequest: ApprovalRequest = {
      id: `appr_${now}_${Math.random().toString(36).slice(2, 7)}`,
      toolId: tool.id,
      actionName: params.actionName || tool.name,
      description: params.description || tool.description,
      target: params.target || 'Local Environment',
      dataAffected: params.dataAffected || 'None',
      riskLevel: tool.riskLevel,
      params: validation.normalizedParams || params.params,
      state: policy.requiresApproval ? 'PENDING_APPROVAL' : 'VALIDATED',
      requestedAt: now,
      expiresAt,
      conversationId: params.conversationId,
      messageId: params.messageId,
    };

    // If auto-executable (e.g. read-only tool not requiring approval)
    if (policy.autoExecutable) {
      try {
        const result = await tool.execute(approvalRequest.params, { settings });
        approvalRequest.state = 'EXECUTED';
        approvalRequest.resolvedAt = Date.now();
        approvalRequest.executedAt = Date.now();
        approvalRequest.executionResult = result;

        await saveApproval(approvalRequest);
        await recordAudit({
          actionType: 'TOOL_AUTO_EXECUTED',
          status: 'SUCCESS',
          actor: 'APPROVAL_ENGINE',
          riskLevel: tool.riskLevel,
          details: `Auto-executed read/proposal tool: "${tool.name}". ${result.message}`,
          approvalId: approvalRequest.id,
          toolId: tool.id,
        });

        return { request: approvalRequest, autoExecuted: true, result };
      } catch (err: any) {
        approvalRequest.state = 'FAILED';
        approvalRequest.resolvedAt = Date.now();
        await saveApproval(approvalRequest);

        await recordAudit({
          actionType: 'TOOL_AUTO_EXECUTION_FAILED',
          status: 'FAILURE',
          actor: 'APPROVAL_ENGINE',
          riskLevel: tool.riskLevel,
          details: `Failed to auto-execute "${tool.name}": ${err?.message}`,
          approvalId: approvalRequest.id,
          toolId: tool.id,
        });

        return { request: approvalRequest, autoExecuted: false, error: err?.message };
      }
    }

    // Requires user approval
    await saveApproval(approvalRequest);
    await recordAudit({
      actionType: 'APPROVAL_REQUEST_CREATED',
      status: 'PENDING',
      actor: 'APPROVAL_ENGINE',
      riskLevel: tool.riskLevel,
      details: `Created pending approval request for "${tool.name}" [Risk: ${tool.riskLevel}]. Reason: ${policy.reason}`,
      approvalId: approvalRequest.id,
      toolId: tool.id,
    });

    return { request: approvalRequest, autoExecuted: false };
  }

  /**
   * User approves a pending request.
   * Performs real-time re-validation before execution.
   */
  static async approve(approvalId: string): Promise<{ success: boolean; result?: any; error?: string }> {
    const request = await getApproval(approvalId);
    if (!request) {
      return { success: false, error: 'Approval request not found.' };
    }

    if (request.state !== 'PENDING_APPROVAL') {
      return {
        success: false,
        error: `Action cannot be approved because current state is "${request.state}".`,
      };
    }

    // Check expiration
    if (Date.now() > request.expiresAt) {
      request.state = 'CANCELLED';
      request.rejectionReason = 'Request expired before approval.';
      await saveApproval(request);
      await recordAudit({
        actionType: 'APPROVAL_EXPIRED',
        status: 'EXPIRED',
        actor: 'APPROVAL_ENGINE',
        riskLevel: request.riskLevel,
        details: `Approval request ${request.id} expired.`,
        approvalId: request.id,
      });
      return { success: false, error: 'Approval request has expired.' };
    }

    // Step 2: Re-validate immediately before execution
    const tool = getToolDefinition(request.toolId);
    if (!tool) {
      request.state = 'FAILED';
      await saveApproval(request);
      await recordAudit({
        actionType: 'EXECUTION_BLOCKED_UNREGISTERED',
        status: 'BLOCKED',
        actor: 'APPROVAL_ENGINE',
        riskLevel: request.riskLevel,
        details: `Tool "${request.toolId}" not found in registry during re-validation.`,
        approvalId: request.id,
      });
      return { success: false, error: 'Security alert: Target tool is no longer registered.' };
    }

    const revalidation = tool.validate(request.params);
    if (!revalidation.valid) {
      request.state = 'FAILED';
      await saveApproval(request);
      return { success: false, error: `Execution aborted: ${revalidation.error}` };
    }

    // Step 3: Transition to APPROVED
    request.state = 'APPROVED';
    request.resolvedAt = Date.now();
    await saveApproval(request);

    await recordAudit({
      actionType: 'APPROVAL_GRANTED',
      status: 'SUCCESS',
      actor: 'USER',
      riskLevel: request.riskLevel,
      details: `User explicitly approved action: "${request.actionName}" on target "${request.target}".`,
      approvalId: request.id,
      toolId: tool.id,
    });

    // Step 4: Execute the authorized tool
    try {
      const result = await tool.execute(revalidation.normalizedParams || request.params);
      request.state = 'EXECUTED';
      request.executedAt = Date.now();
      request.executionResult = result;
      await saveApproval(request);

      await recordAudit({
        actionType: 'TOOL_EXECUTED',
        status: 'SUCCESS',
        actor: 'APPROVAL_ENGINE',
        riskLevel: request.riskLevel,
        details: `Successfully executed "${tool.name}": ${result.message}`,
        approvalId: request.id,
        toolId: tool.id,
      });

      return { success: true, result };
    } catch (err: any) {
      request.state = 'FAILED';
      request.executionResult = { success: false, message: err?.message || 'Execution exception' };
      await saveApproval(request);

      await recordAudit({
        actionType: 'TOOL_EXECUTION_FAILED',
        status: 'FAILURE',
        actor: 'APPROVAL_ENGINE',
        riskLevel: request.riskLevel,
        details: `Execution exception in "${tool.name}": ${err?.message}`,
        approvalId: request.id,
        toolId: tool.id,
      });

      return { success: false, error: err?.message };
    }
  }

  /**
   * User rejects a pending request.
   */
  static async reject(approvalId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const request = await getApproval(approvalId);
    if (!request) {
      return { success: false, error: 'Approval request not found.' };
    }

    if (request.state !== 'PENDING_APPROVAL') {
      return {
        success: false,
        error: `Request cannot be rejected because state is "${request.state}".`,
      };
    }

    request.state = 'REJECTED';
    request.resolvedAt = Date.now();
    request.rejectionReason = reason || 'Declined by user.';
    await saveApproval(request);

    await recordAudit({
      actionType: 'APPROVAL_REJECTED',
      status: 'REJECTED',
      actor: 'USER',
      riskLevel: request.riskLevel,
      details: `User rejected action: "${request.actionName}". Reason: ${request.rejectionReason}`,
      approvalId: request.id,
      toolId: request.toolId,
    });

    return { success: true };
  }

  /**
   * Clean up expired approvals in the background.
   */
  static async sweepExpiredApprovals(): Promise<number> {
    const list = await getAllApprovals();
    const now = Date.now();
    let count = 0;

    for (const req of list) {
      if (req.state === 'PENDING_APPROVAL' && now > req.expiresAt) {
        req.state = 'CANCELLED';
        req.rejectionReason = 'Automatically cancelled due to expiration.';
        await saveApproval(req);
        await recordAudit({
          actionType: 'APPROVAL_AUTO_EXPIRED',
          status: 'EXPIRED',
          actor: 'APPROVAL_ENGINE',
          riskLevel: req.riskLevel,
          details: `Approval ${req.id} automatically expired and was cancelled.`,
          approvalId: req.id,
        });
        count++;
      }
    }

    return count;
  }
}
