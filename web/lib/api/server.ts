import { getToken } from "@/lib/auth/session";
import { api } from "./client";

export async function apiAuthed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("no session token");
  return api<T>(path, { ...init, token });
}
