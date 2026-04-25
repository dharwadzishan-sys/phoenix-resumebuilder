const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Make an API call to the backend server.
 * Automatically attaches Firebase auth token if user is logged in.
 */
export async function apiCall(
  endpoint: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    token?: string | null;
  } = {}
) {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `API call failed with status ${response.status}`);
  }

  return data;
}
