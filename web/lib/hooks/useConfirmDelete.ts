"use client";
import { useCallback, useState } from "react";

export interface PendingDelete {
  id: number;
  name: string;
}

export function useConfirmDelete(
  mutateAsync: (id: number) => Promise<unknown>,
) {
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback((id: number, name: string) => {
    setError(null);
    setPending({ id, name });
  }, []);

  const cancel = useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  const confirm = useCallback(async () => {
    if (!pending) return;
    try {
      await mutateAsync(pending.id);
      setPending(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    }
  }, [pending, mutateAsync]);

  return { pending, error, ask, cancel, confirm };
}
