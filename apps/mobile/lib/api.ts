import { mobileEnv } from '@/lib/env';

export type ApiErrorPayload = {
  detail?: string;
  message?: string;
};

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
