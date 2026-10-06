/**
 * API Client with Automatic Token Refresh
 * Handles API requests with automatic token refresh on 401 errors
 */

interface FetchOptions extends RequestInit {
  skipRefresh?: boolean;
}

/**
 * Enhanced fetch with automatic token refresh
 * If a request fails with 401, it will attempt to refresh the token and retry
 */
export async function fetchWithAuth(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipRefresh = false, ...fetchOptions } = options;

  // First attempt
  let response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
  });

  // If 401 and not already a refresh attempt, try to refresh token
  if (response.status === 401 && !skipRefresh && !url.includes('/auth/refresh')) {
    try {
      // Attempt to refresh the token
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        // Retry the original request with new token
        response = await fetch(url, {
          ...fetchOptions,
          credentials: 'include',
        });
      } else {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
          window.location.href = '/admin/login';
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Redirect to login on refresh failure
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
  }

  return response;
}

/**
 * Convenience method for GET requests
 */
export async function apiGet<T = any>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: 'GET' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Convenience method for POST requests
 */
export async function apiPost<T = any>(url: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut<T = any>(url: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete<T = any>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: 'DELETE' });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}
