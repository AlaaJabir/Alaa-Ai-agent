// Health endpoint for MY AGENT
// Compatible with both Vercel Serverless and Express

export async function handleHealth(req: any, res: any) {
  const isAIConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const hasAuthToken = !!(process.env.AGENT_ACCESS_TOKEN && process.env.AGENT_ACCESS_TOKEN.trim());

  return res.status(200).json({
    status: 'ok',
    app: 'MY AGENT',
    version: '1.0.0-phase1',
    aiConfigured: isAIConfigured,
    model,
    authRequired: hasAuthToken,
    timestamp: new Date().toISOString(),
  });
}

export default async function handler(req: any, res: any) {
  return handleHealth(req, res);
}
