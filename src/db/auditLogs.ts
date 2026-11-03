import { getDB } from './database';
import { AuditLogEntry } from '../types/audit';

export async function getAllAuditLogs(): Promise<AuditLogEntry[]> {
  const db = await getDB();
  const list = await db.getAll('auditLogs');
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

export async function saveAuditLog(entry: AuditLogEntry): Promise<void> {
  const db = await getDB();
  await db.put('auditLogs', entry);
}

export async function clearAuditLogs(): Promise<void> {
  const db = await getDB();
  await db.clear('auditLogs');
}
