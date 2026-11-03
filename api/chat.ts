import { GoogleGenAI } from '@google/genai';
import { checkRateLimit } from './middleware/rateLimit';
import { validateAuth } from './middleware/auth';
import { validateChatPayload } from './middleware/validation';

const SYSTEM_INSTRUCTION = `You are MY AGENT, a private, trusted personal AI operating system and executive digital assistant designed for mobile (iPhone) and desktop.

Security & Safety Protocol:
1. You act with high precision, confidentiality, and utmost respect for user privacy.
2. You CANNOT directly execute system modifications or sensitive actions on the user's device or data.
3. Instead, you propose actions that pass through the local Approval Engine.
4. When the user asks to save a memory/note, search memories, inspect status, delete a note, or perform a task, answer courteously and also specify an action block using this exact JSON format inside your answer or at the end:

\`\`\`json:action_proposal
{
  "toolId": "get_current_app_status" | "search_local_memories" | "create_demo_note" | "delete_demo_note" | "propose_demo_action" | "simulate_external_sync",
  "actionName": "Descriptive short title of action",
  "description": "Clear explanation of what will be performed",
  "target": "Local Note / Memory Store / Device Environment",
  "dataAffected": "Description of data modified or accessed",
  "riskLevel": "READ" | "PROPOSE" | "MODIFY" | "DELETE" | "EXTERNAL_ACTION",
  "params": {}
}
\`\`\`

Available Tools:
- "get_current_app_status": (READ) Checks local agent status and pending items.
- "search_local_memories": (READ) Parameters: {"query": "string", "category": "string"}
- "create_demo_note": (MODIFY) Parameters: {"key": "string", "content": "string", "category": "preference|project|goal|fact|instruction|general"}
- "delete_demo_note": (DELETE) Parameters: {"id": "string", "key": "string"}
- "propose_demo_action": (PROPOSE) Parameters: {"summary": "string", "steps": "string"}
- "simulate_external_sync": (EXTERNAL_ACTION) Parameters: {"endpoint": "string", "payloadDescription": "string"}

Always prioritize concise, elegant, structured communication.`;

export async function handleChat(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 1. Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').toString();
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Too many requests. Please wait before asking MY AGENT again.',
      resetInSeconds: Math.ceil(rateLimit.resetMs / 1000),
    });
  }

  // 2. Auth Check
  const authHeader = req.headers.authorization;
  const auth = validateAuth(authHeader);
  if (!auth.authenticated) {
    return res.status(401).json({ error: auth.error });
  }

  // 3. Body Validation
  const validation = validateChatPayload(req.body);
  if (!validation.valid || !validation.data) {
    return res.status(400).json({ error: validation.error });
  }

  const { message, history, contextMemories } = validation.data;

  // 4. Gemini API Key check
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(503).json({
      error: 'AI Provider configuration missing on server. Please configure GEMINI_API_KEY.',
    });
  }

  // Select primary model (fallback to gemini-2.5-flash or gemini-3.1-flash-lite if gemini-3.8-flash has capacity issues)
  const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Build context prompt
    let promptWithContext = '';

    if (contextMemories && contextMemories.length > 0) {
      promptWithContext += '[LOCAL APPROVED USER MEMORIES - PRIVATE CONTEXT]\n';
      contextMemories.forEach((m) => {
        promptWithContext += `- [${m.category}] ${m.key}: ${m.content}\n`;
      });
      promptWithContext += '\n[USER QUERY]\n';
    }

    promptWithContext += message;

    // Build contents array if previous history is available
    const contents: any[] = [];
    if (history && history.length > 0) {
      for (const item of history) {
        contents.push({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: promptWithContext }],
    });

    let response;
    let usedModel = preferredModel;

    // Helper to generate content with timeout
    const tryGenerate = async (targetModel: string, timeoutMs: number) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await ai.models.generateContent({
          model: targetModel,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
            abortSignal: controller.signal,
          },
        });
        clearTimeout(timer);
        return res;
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    };

    try {
      response = await tryGenerate(preferredModel, 9000);
    } catch (primaryErr: any) {
      console.warn(`Model ${preferredModel} failed or timed out (${primaryErr?.message}), trying gemini-2.5-flash fallback...`);
      try {
        usedModel = 'gemini-2.5-flash';
        response = await tryGenerate('gemini-2.5-flash', 9000);
      } catch (fallbackErr: any) {
        console.warn(`Fallback to gemini-2.5-flash failed, trying gemini-3.1-flash-lite...`);
        usedModel = 'gemini-3.1-flash-lite';
        response = await tryGenerate('gemini-3.1-flash-lite', 9000);
      }
    }

    const rawText = response.text || '';

    // Extract any structured action proposal blocks: ```json:action_proposal ... ```
    const toolProposals: any[] = [];
    let cleanText = rawText;

    const actionProposalRegex = /```(?:json:action_proposal|action_proposal|json)\s*\n([\s\S]*?)\n```/g;
    let match;
    while ((match = actionProposalRegex.exec(rawText)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.toolId && parsed.riskLevel) {
          toolProposals.push({
            id: `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            toolId: parsed.toolId,
            actionName: parsed.actionName || parsed.toolId,
            description: parsed.description || 'Proposed action',
            target: parsed.target || 'Local Storage',
            dataAffected: parsed.dataAffected || 'None',
            riskLevel: parsed.riskLevel,
            params: parsed.params || {},
          });
          // Remove the raw proposal block from conversational display for a clean UI
          cleanText = cleanText.replace(match[0], '').trim();
        }
      } catch {
        // Not a valid tool proposal, leave text as is
      }
    }

    return res.status(200).json({
      text: cleanText || rawText,
      toolProposals,
      model: usedModel,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Gemini API call failed:', err?.message || err);
    const safeMessage = err?.message?.includes('API_KEY_INVALID')
      ? 'The configured Gemini API key is invalid.'
      : err?.message || 'AI processing failed. Please check your connectivity and try again.';

    return res.status(500).json({
      error: safeMessage,
      details: err?.message,
    });
  }
}

export default async function handler(req: any, res: any) {
  return handleChat(req, res);
}
