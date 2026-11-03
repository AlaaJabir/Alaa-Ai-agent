// Input validation middleware for MY AGENT chat requests

export interface ValidatedChatBody {
  message: string;
  conversationId?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextMemories?: Array<{ key: string; category: string; content: string }>;
}

export function validateChatPayload(body: any): { valid: boolean; error?: string; data?: ValidatedChatBody } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a valid JSON object.' };
  }

  const { message, conversationId, history, contextMemories } = body;

  if (typeof message !== 'string') {
    return { valid: false, error: 'Field "message" must be a string.' };
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > 12000) {
    return { valid: false, error: 'Message exceeds maximum allowed length (12,000 characters).' };
  }

  let cleanHistory: Array<{ role: 'user' | 'assistant'; content: string }> | undefined = undefined;
  if (Array.isArray(history)) {
    cleanHistory = history
      .slice(-10) // Limit to last 10 messages for token safety
      .filter((h) => h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
      .map((h) => ({ role: h.role, content: h.content.slice(0, 4000) }));
  }

  let cleanMemories: Array<{ key: string; category: string; content: string }> | undefined = undefined;
  if (Array.isArray(contextMemories)) {
    cleanMemories = contextMemories
      .slice(0, 15)
      .filter((m) => m && typeof m.key === 'string' && typeof m.content === 'string')
      .map((m) => ({
        key: String(m.key).slice(0, 100),
        category: String(m.category || 'general').slice(0, 50),
        content: String(m.content).slice(0, 1000),
      }));
  }

  return {
    valid: true,
    data: {
      message: trimmed,
      conversationId: typeof conversationId === 'string' ? conversationId : undefined,
      history: cleanHistory,
      contextMemories: cleanMemories,
    },
  };
}
