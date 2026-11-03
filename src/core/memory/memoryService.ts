import { getAllMemories, getApprovedMemories, saveMemory, deleteMemory } from '../../db/memories';
import { getSettings } from '../../db/settings';
import { MemoryItem, MemoryCategory } from '../../types/memory';
import { recordAudit } from '../audit/auditService';

export class MemoryService {
  /**
   * Returns memories eligible for AI context injection.
   * Only returns approved memories if the user permitted memory sharing.
   */
  static async getContextForAI(): Promise<Array<{ key: string; category: string; content: string }>> {
    const settings = await getSettings();
    if (!settings.shareMemoriesWithAI) {
      return [];
    }

    const approved = await getApprovedMemories();
    // Return max 15 most relevant/recent approved memories to avoid large payload overhead
    return approved.slice(0, 15).map((m) => ({
      key: m.key,
      category: m.category,
      content: m.content,
    }));
  }

  /**
   * User manually creates a memory item.
   */
  static async createMemory(params: {
    key: string;
    content: string;
    category: MemoryCategory;
    tags?: string[];
  }): Promise<MemoryItem> {
    const now = Date.now();
    const item: MemoryItem = {
      id: `mem_${now}_${Math.random().toString(36).slice(2, 7)}`,
      key: params.key.trim(),
      content: params.content.trim(),
      category: params.category || 'general',
      source: 'user_created',
      approved: true,
      createdAt: now,
      updatedAt: now,
      tags: params.tags,
    };

    await saveMemory(item);
    await recordAudit({
      actionType: 'MEMORY_CREATED',
      status: 'SUCCESS',
      actor: 'USER',
      riskLevel: 'MODIFY',
      details: `User created local memory "${item.key}" in category [${item.category}].`,
    });

    return item;
  }

  /**
   * Updates an existing memory item.
   */
  static async updateMemory(
    id: string,
    updates: Partial<Pick<MemoryItem, 'key' | 'content' | 'category' | 'tags'>>
  ): Promise<MemoryItem | undefined> {
    const memories = await getAllMemories();
    const existing = memories.find((m) => m.id === id);
    if (!existing) return undefined;

    const updated: MemoryItem = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await saveMemory(updated);
    await recordAudit({
      actionType: 'MEMORY_UPDATED',
      status: 'SUCCESS',
      actor: 'USER',
      riskLevel: 'MODIFY',
      details: `User updated memory "${updated.key}".`,
    });

    return updated;
  }

  /**
   * Permanently deletes a memory item.
   */
  static async removeMemory(id: string, keyName?: string): Promise<boolean> {
    await deleteMemory(id);
    await recordAudit({
      actionType: 'MEMORY_DELETED',
      status: 'SUCCESS',
      actor: 'USER',
      riskLevel: 'DELETE',
      details: `Permanently deleted memory item: "${keyName || id}".`,
    });
    return true;
  }
}
