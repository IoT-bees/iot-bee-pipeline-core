import { cookies } from "next/headers";
import { getToken } from "@/lib/auth/session";
import { api } from "./client";

const BASE = process.env.INTERNAL_API_URL ?? "http://localhost:8080";
const COOKIE = process.env.AUTH_COOKIE_NAME ?? "iot_bee_session";

export async function apiAuthed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("no session token");
  return api<T>(path, { ...init, token });
}

export async function serverFetch<T>(
  path: string,
  init?: { revalidate?: number; tag?: string },
): Promise<T> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) {
    throw new Error("unauthenticated");
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    next: {
      revalidate: init?.revalidate ?? 30,
      ...(init?.tag ? { tags: [init.tag] } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`backend ${res.status} ${path}`);
  }
  return res.json() as Promise<T>;
}
