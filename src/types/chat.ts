export interface ToolCallProposal {
  id: string;
  toolId: string;
  actionName: string;
  description: string;
  target: string;
  dataAffected: string;
  riskLevel: 'READ' | 'PROPOSE' | 'MODIFY' | 'DELETE' | 'EXTERNAL_ACTION';
  params: Record<string, any>;
  approvalId?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolProposals?: ToolCallProposal[];
  status?: 'sending' | 'sent' | 'error';
  errorMessage?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  preview: string;
  pinned?: boolean;
}

export interface ChatRequestPayload {
  message: string;
  conversationId?: string;
  history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  contextMemories?: Array<{
    key: string;
    category: string;
    content: string;
  }>;
}

export interface ChatResponsePayload {
  text: string;
  toolProposals?: ToolCallProposal[];
  model?: string;
  timestamp?: string;
}
