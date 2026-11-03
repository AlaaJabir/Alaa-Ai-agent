export type MemoryCategory = 'preference' | 'project' | 'goal' | 'fact' | 'instruction' | 'general';

export interface MemoryItem {
  id: string;
  key: string;
  category: MemoryCategory;
  content: string;
  source: 'user_created' | 'ai_suggested';
  approved: boolean;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}
