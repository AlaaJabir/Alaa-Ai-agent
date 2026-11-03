import { ToolDefinition } from '../../types/tools';
import { getAllMemories, saveMemory, deleteMemory } from '../../db/memories';
import { getAllConversations } from '../../db/conversations';
import { getPendingApprovals } from '../../db/approvals';

export const TOOL_REGISTRY: Record<string, ToolDefinition> = {
  get_current_app_status: {
    id: 'get_current_app_status',
    name: 'Get App Operating Status',
    description: 'Inspects local agent operating status, memory counts, and pending security items.',
    riskLevel: 'READ',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        includePendingApprovals: {
          type: 'boolean',
          description: 'Whether to count pending approvals',
        },
      },
    },
    validate: (params) => {
      return { valid: true, normalizedParams: params || {} };
    },
    execute: async (_params) => {
      const memories = await getAllMemories();
      const conversations = await getAllConversations();
      const pendingApprovals = await getPendingApprovals();

      return {
        success: true,
        data: {
          app: 'MY AGENT',
          version: '1.0.0-phase1',
          conversationsCount: conversations.length,
          memoriesCount: memories.length,
          pendingApprovalsCount: pendingApprovals.length,
          storageType: 'IndexedDB (Local-First)',
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
          timestamp: new Date().toISOString(),
        },
        message: 'Successfully retrieved local application status.',
      };
    },
  },

  search_local_memories: {
    id: 'search_local_memories',
    name: 'Search Local Memories',
    description: 'Queries locally saved knowledge and user preferences by keyword or category.',
    riskLevel: 'READ',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keyword to search inside local memories',
          required: true,
        },
        category: {
          type: 'string',
          description: 'Optional category filter',
        },
      },
      required: ['query'],
    },
    validate: (params) => {
      if (!params || typeof params.query !== 'string' || !params.query.trim()) {
        return { valid: false, error: 'A search query string is required.' };
      }
      return { valid: true, normalizedParams: { query: params.query.trim(), category: params.category } };
    },
    execute: async (params) => {
      const memories = await getAllMemories();
      const q = params.query.toLowerCase();
      const results = memories.filter((m) => {
        const matchesQuery =
          m.key.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q);
        const matchesCat = !params.category || m.category === params.category;
        return matchesQuery && matchesCat;
      });

      return {
        success: true,
        data: results.map((r) => ({ id: r.id, key: r.key, category: r.category, content: r.content })),
        message: `Found ${results.length} matching memory items.`,
      };
    },
  },

  create_demo_note: {
    id: 'create_demo_note',
    name: 'Create Local Note / Memory',
    description: 'Stores a new personal note or preference into the local-first memory store.',
    riskLevel: 'MODIFY',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Identifier / Title of the note',
          required: true,
        },
        content: {
          type: 'string',
          description: 'Content of the note to store',
          required: true,
        },
        category: {
          type: 'string',
          description: 'Category: preference, project, goal, fact, instruction, general',
        },
      },
      required: ['key', 'content'],
    },
    validate: (params) => {
      if (!params || typeof params.key !== 'string' || !params.key.trim()) {
        return { valid: false, error: 'Note title or key is required.' };
      }
      if (typeof params.content !== 'string' || !params.content.trim()) {
        return { valid: false, error: 'Note content cannot be empty.' };
      }
      const validCategories = ['preference', 'project', 'goal', 'fact', 'instruction', 'general'];
      const cat = validCategories.includes(params.category) ? params.category : 'general';

      return {
        valid: true,
        normalizedParams: {
          key: params.key.trim(),
          content: params.content.trim(),
          category: cat,
        },
      };
    },
    execute: async (params) => {
      const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const now = Date.now();
      const newMemory = {
        id,
        key: params.key,
        content: params.content,
        category: params.category || 'general',
        source: 'user_created' as const,
        approved: true,
        createdAt: now,
        updatedAt: now,
      };

      await saveMemory(newMemory);
      return {
        success: true,
        data: newMemory,
        message: `Saved note "${newMemory.key}" into local memory.`,
      };
    },
  },

  delete_demo_note: {
    id: 'delete_demo_note',
    name: 'Delete Local Note / Memory',
    description: 'Permanently deletes a specific note or memory item from local storage.',
    riskLevel: 'DELETE',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the memory item to delete',
          required: true,
        },
        key: {
          type: 'string',
          description: 'The key/title of the note being deleted for confirmation',
        },
      },
      required: ['id'],
    },
    validate: (params) => {
      if (!params || !params.id) {
        return { valid: false, error: 'Memory ID is required for deletion.' };
      }
      return { valid: true, normalizedParams: { id: params.id, key: params.key } };
    },
    execute: async (params) => {
      await deleteMemory(params.id);
      return {
        success: true,
        data: { id: params.id },
        message: `Permanently removed memory item "${params.key || params.id}".`,
      };
    },
  },

  propose_demo_action: {
    id: 'propose_demo_action',
    name: 'Propose Future Workflow',
    description: 'Generates a structured workflow proposal for review without modifying any system state.',
    riskLevel: 'PROPOSE',
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Summary of the proposed workflow',
          required: true,
        },
        steps: {
          type: 'string',
          description: 'Planned outline of execution steps',
        },
      },
      required: ['summary'],
    },
    validate: (params) => {
      if (!params || !params.summary) {
        return { valid: false, error: 'Proposal summary is required.' };
      }
      return { valid: true, normalizedParams: params };
    },
    execute: async (params) => {
      return {
        success: true,
        data: {
          summary: params.summary,
          steps: params.steps || 'Step 1: Inspect environment; Step 2: Request user confirmation.',
          proposedAt: new Date().toISOString(),
        },
        message: 'Generated workflow proposal for user review.',
      };
    },
  },

  simulate_external_sync: {
    id: 'simulate_external_sync',
    name: 'Simulate External Cloud Sync',
    description: 'Demonstration of an external interaction requiring highest security approval (Phase 1 mock).',
    riskLevel: 'EXTERNAL_ACTION',
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        endpoint: {
          type: 'string',
          description: 'Simulated remote destination or endpoint',
          required: true,
        },
        payloadDescription: {
          type: 'string',
          description: 'Summary of payload to be transmitted',
        },
      },
      required: ['endpoint'],
    },
    validate: (params) => {
      if (!params || !params.endpoint) {
        return { valid: false, error: 'Remote endpoint parameter is required.' };
      }
      return { valid: true, normalizedParams: params };
    },
    execute: async (params) => {
      // Simulate remote network latency
      await new Promise((resolve) => setTimeout(resolve, 400));
      return {
        success: true,
        data: {
          simulatedEndpoint: params.endpoint,
          status: 'SUCCESS',
          encryptedBytesTransmitted: 0,
          phase: 'Phase 1 Mock Demonstration',
        },
        message: `Simulated external sync with ${params.endpoint} completed safely.`,
      };
    },
  },
};

export function getToolDefinition(toolId: string): ToolDefinition | undefined {
  return TOOL_REGISTRY[toolId];
}

export function getAllToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOL_REGISTRY);
}
