import { ChatRequestPayload, ChatResponsePayload } from '../../types/chat';

export class GeminiClient {
  /**
   * Send a chat prompt to the server-side /api/chat endpoint.
   * Ensures the API key remains strictly on the server.
   */
  static async sendMessage(payload: ChatRequestPayload, signal?: AbortSignal): Promise<ChatResponsePayload> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error(
        'Offline Mode: Internet connection is required to communicate with Gemini AI. Your local conversations, memories, and approval history remain safely accessible.'
      );
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) {
            errorMsg = errData.error;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      const data: ChatResponsePayload = await response.json();
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request was cancelled.');
      }
      throw err;
    }
  }

  /**
   * Health check to inspect backend connectivity and AI configuration.
   */
  static async checkHealth(): Promise<{
    status: string;
    app: string;
    version: string;
    aiConfigured: boolean;
    model: string;
    authRequired: boolean;
  }> {
    const response = await fetch('/api/health');
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    return response.json();
  }
}
