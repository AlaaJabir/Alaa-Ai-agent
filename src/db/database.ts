import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Conversation, ChatMessage } from '../types/chat';
import { MemoryItem } from '../types/memory';
import { ApprovalRequest } from '../types/approval';
import { AuditLogEntry } from '../types/audit';

export interface MyAgentDBSchema extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updatedAt': number };
  };
  messages: {
    key: string;
    value: ChatMessage;
    indexes: {
      'by-conversation': string;
      'by-timestamp': number;
    };
  };
  memories: {
    key: string;
    value: MemoryItem;
    indexes: {
      'by-category': string;
      'by-key': string;
      'by-createdAt': number;
    };
  };
  approvals: {
    key: string;
    value: ApprovalRequest;
    indexes: {
      'by-state': string;
      'by-requestedAt': number;
    };
  };
  auditLogs: {
    key: string;
    value: AuditLogEntry;
    indexes: {
      'by-timestamp': number;
      'by-status': string;
      'by-actor': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  filesMetadata: {
    key: string;
    value: {
      id: string;
      name: string;
      size: number;
      mimeType: string;
      createdAt: number;
      tags?: string[];
    };
  };
}

const DB_NAME = 'my-agent-os-db';
const DB_VERSION = 1;

let dbInstancePromise: Promise<IDBPDatabase<MyAgentDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<MyAgentDBSchema>> {
  if (!dbInstancePromise) {
    dbInstancePromise = openDB<MyAgentDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1 migrations
        if (oldVersion < 1) {
          // 1. Conversations store
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('by-updatedAt', 'updatedAt');

          // 2. Messages store
          const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
          msgStore.createIndex('by-conversation', 'conversationId');
          msgStore.createIndex('by-timestamp', 'timestamp');

          // 3. Memories store
          const memStore = db.createObjectStore('memories', { keyPath: 'id' });
          memStore.createIndex('by-category', 'category');
          memStore.createIndex('by-key', 'key');
          memStore.createIndex('by-createdAt', 'createdAt');

          // 4. Approvals store
          const appStore = db.createObjectStore('approvals', { keyPath: 'id' });
          appStore.createIndex('by-state', 'state');
          appStore.createIndex('by-requestedAt', 'requestedAt');

          // 5. AuditLogs store
          const auditStore = db.createObjectStore('auditLogs', { keyPath: 'id' });
          auditStore.createIndex('by-timestamp', 'timestamp');
          auditStore.createIndex('by-status', 'status');
          auditStore.createIndex('by-actor', 'actor');

          // 6. Settings store
          db.createObjectStore('settings');

          // 7. Files metadata store
          db.createObjectStore('filesMetadata', { keyPath: 'id' });
        }
      },
      blocked() {
        console.warn('MY AGENT IndexedDB is blocked by another tab.');
      },
      blocking() {
        console.warn('MY AGENT IndexedDB is blocking a version change.');
      },
    });
  }
  return dbInstancePromise;
}

// Backup & Export / Import
export interface ExportDataPayload {
  version: number;
  exportedAt: string;
  conversations: Conversation[];
  messages: ChatMessage[];
  memories: MemoryItem[];
  approvals: ApprovalRequest[];
  auditLogs: AuditLogEntry[];
  settings: Record<string, any>;
}

export async function exportLocalData(): Promise<ExportDataPayload> {
  const db = await getDB();
  const conversations = await db.getAll('conversations');
  const messages = await db.getAll('messages');
  const memories = await db.getAll('memories');
  const approvals = await db.getAll('approvals');
  const auditLogs = await db.getAll('auditLogs');

  const settingsKeys = await db.getAllKeys('settings');
  const settings: Record<string, any> = {};
  for (const k of settingsKeys) {
    settings[k as string] = await db.get('settings', k);
  }

  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    conversations,
    messages,
    memories,
    approvals,
    auditLogs,
    settings,
  };
}

export async function importLocalData(data: ExportDataPayload): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!data || typeof data !== 'object') {
      return { success: false, count: 0, error: 'Invalid backup file structure.' };
    }

    const db = await getDB();
    const tx = db.transaction(
      ['conversations', 'messages', 'memories', 'approvals', 'auditLogs', 'settings'],
      'readwrite'
    );

    let count = 0;

    if (Array.isArray(data.conversations)) {
      for (const conv of data.conversations) {
        if (conv.id) {
          await tx.objectStore('conversations').put(conv);
          count++;
        }
      }
    }

    if (Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        if (msg.id) {
          await tx.objectStore('messages').put(msg);
          count++;
        }
      }
    }

    if (Array.isArray(data.memories)) {
      for (const mem of data.memories) {
        if (mem.id) {
          await tx.objectStore('memories').put(mem);
          count++;
        }
      }
    }

    if (Array.isArray(data.approvals)) {
      for (const app of data.approvals) {
        if (app.id) {
          await tx.objectStore('approvals').put(app);
          count++;
        }
      }
    }

    if (Array.isArray(data.auditLogs)) {
      for (const log of data.auditLogs) {
        if (log.id) {
          await tx.objectStore('auditLogs').put(log);
          count++;
        }
      }
    }

    if (data.settings && typeof data.settings === 'object') {
      for (const [key, val] of Object.entries(data.settings)) {
        await tx.objectStore('settings').put(val, key);
        count++;
      }
    }

    await tx.done;
    return { success: true, count };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Failed to import backup' };
  }
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['conversations', 'messages', 'memories', 'approvals', 'auditLogs', 'settings', 'filesMetadata'],
    'readwrite'
  );
  await tx.objectStore('conversations').clear();
  await tx.objectStore('messages').clear();
  await tx.objectStore('memories').clear();
  await tx.objectStore('approvals').clear();
  await tx.objectStore('auditLogs').clear();
  await tx.objectStore('settings').clear();
  await tx.objectStore('filesMetadata').clear();
  await tx.done;
}
