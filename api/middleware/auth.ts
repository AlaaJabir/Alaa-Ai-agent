// Authentication middleware for MY AGENT API endpoints

export function validateAuth(authHeader: string | undefined): { authenticated: boolean; error?: string } {
  const configuredToken = process.env.AGENT_ACCESS_TOKEN;

  // If no AGENT_ACCESS_TOKEN is configured in environment, allow local/private access
  if (!configuredToken || !configuredToken.trim()) {
    return { authenticated: true };
  }

  if (!authHeader) {
    return { authenticated: false, error: 'Authorization header required.' };
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return { authenticated: false, error: 'Malformed Authorization header. Format: Bearer <token>' };
  }

  const token = parts[1];
  if (token !== configuredToken.trim()) {
    return { authenticated: false, error: 'Unauthorized: Invalid agent access token.' };
  }

  return { authenticated: true };
}
