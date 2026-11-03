import { getDB } from './database';
import { Conversation } from '../types/chat';

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('conversations', 'by-updatedAt');
  // Sort newest first
  return list.reverse();
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get('conversations', id);
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conv);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'messages'], 'readwrite');
  await tx.objectStore('conversations').delete(id);

  // Delete all associated messages
  const msgIndex = tx.objectStore('messages').index('by-conversation');
  let cursor = await msgIndex.openCursor(IDBKeyRange.only(id));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
