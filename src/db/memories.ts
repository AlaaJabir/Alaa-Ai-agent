import { getDB } from './database';
import { MemoryItem, MemoryCategory } from '../types/memory';

export async function getAllMemories(): Promise<MemoryItem[]> {
  const db = await getDB();
  const list = await db.getAll('memories');
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getApprovedMemories(): Promise<MemoryItem[]> {
  const all = await getAllMemories();
  return all.filter((m) => m.approved);
}

export async function getMemoriesByCategory(category: MemoryCategory): Promise<MemoryItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('memories', 'by-category', category);
}

export async function getMemory(id: string): Promise<MemoryItem | undefined> {
  const db = await getDB();
  return db.get('memories', id);
}

export async function saveMemory(item: MemoryItem): Promise<void> {
  const db = await getDB();
  await db.put('memories', item);
}

export async function deleteMemory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('memories', id);
}
