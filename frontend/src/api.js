const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error('Cannot reach TaskFlow. Check your connection and try again.');
  }
  let data;
  try { data = await response.json(); } catch {
    throw new Error('The server is unavailable. Please try again shortly.');
  }
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}
