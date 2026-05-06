"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

type RunActionArgs = {
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  successMessage: string;
  body?: object;
  defaultErrorMessage: string;
  pendingKey?: string;
};

export function useDashboardAction(apiBaseUrl: string) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function runAction({
    path,
    method,
    successMessage,
    body,
    defaultErrorMessage,
    pendingKey: nextPendingKey,
  }: RunActionArgs) {
    setError(null);
    setSuccess(null);
    setPendingKey(nextPendingKey ?? method);

    try {
      const response = await fetch(`${apiBaseUrl}${path}`, {
        method,
        headers: body
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`${method} failed with ${response.status}`);
      }

      setSuccess(successMessage);
      startTransition(() => {
        router.refresh();
      });
      return true;
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : defaultErrorMessage,
      );
      return false;
    } finally {
      setPendingKey(null);
    }
  }

  return {
    error,
    success,
    pendingKey,
    clearMessages() {
      setError(null);
      setSuccess(null);
    },
    runAction,
  };
}
