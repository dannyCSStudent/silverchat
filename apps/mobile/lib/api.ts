import { mobileEnv } from '@/lib/env';
import type { Session } from '@supabase/supabase-js';

export type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

export type ApiConnectivityResult = {
  ok: boolean;
  status: number | null;
  detail: string;
};

export async function checkApiConnectivity(apiBaseUrl = mobileEnv.apiBaseUrl): Promise<ApiConnectivityResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (response.ok) {
      return {
        ok: true,
        status: response.status,
        detail: 'Backend health check succeeded.',
      };
    }

    let detail = `Health check failed with ${response.status}`;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      detail = payload.detail ?? payload.message ?? detail;
    } catch {
      // Keep the status-based fallback.
    }

    return {
      ok: false,
      status: response.status,
      detail,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      detail: error instanceof Error ? error.message : 'Network request failed',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${mobileEnv.apiBaseUrl}${path}`, options);

  if (!response.ok) {
    let errorMessage = `Request failed with ${response.status}`;

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      errorMessage = payload.detail ?? payload.message ?? errorMessage;
    } catch {
      // Keep the default message when the response body is not JSON.
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export async function authorizedApiRequest<T>(
  session: Session,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return apiRequest<T>(path, {
    ...options,
    headers,
  });
}
