import { getDB } from './database';
import { ApprovalRequest, ActionLifecycleState } from '../types/approval';

export async function getAllApprovals(): Promise<ApprovalRequest[]> {
  const db = await getDB();
  const list = await db.getAll('approvals');
  return list.sort((a, b) => b.requestedAt - a.requestedAt);
}

export async function getApprovalsByState(state: ActionLifecycleState): Promise<ApprovalRequest[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('approvals', 'by-state', state);
  return list.sort((a, b) => b.requestedAt - a.requestedAt);
}

export async function getPendingApprovals(): Promise<ApprovalRequest[]> {
  return getApprovalsByState('PENDING_APPROVAL');
}

export async function getApproval(id: string): Promise<ApprovalRequest | undefined> {
  const db = await getDB();
  return db.get('approvals', id);
}

export async function saveApproval(req: ApprovalRequest): Promise<void> {
  const db = await getDB();
  await db.put('approvals', req);
}

export async function deleteApproval(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('approvals', id);
}
