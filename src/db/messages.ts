import { getDB } from './database';
import { ChatMessage } from '../types/chat';

export async function getMessagesByConversation(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('messages', 'by-conversation', conversationId);
  return list.sort((a, b) => a.timestamp - b.timestamp);
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = await getDB();
  await db.put('messages', msg);
}

export async function updateMessage(msg: ChatMessage): Promise<void> {
  const db = await getDB();
  await db.put('messages', msg);
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('messages', id);
}
