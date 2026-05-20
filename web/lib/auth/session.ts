import { cookies } from "next/headers";

const COOKIE = process.env.AUTH_COOKIE_NAME ?? "iot_bee_session";
const MAX_AGE_HOURS = Number(process.env.AUTH_COOKIE_MAX_AGE_HOURS ?? 24);

function secureCookie(): boolean {
  // Honor explicit override (staging behind HTTPS LB sets AUTH_COOKIE_SECURE=1).
  if (process.env.AUTH_COOKIE_SECURE === "1") return true;
  if (process.env.AUTH_COOKIE_SECURE === "0") return false;
  return process.env.NODE_ENV === "production";
}

export async function getToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}

export function buildSessionCookie(token: string) {
  return {
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    path: "/",
    maxAge: MAX_AGE_HOURS * 60 * 60,
  };
}

export function clearSessionCookie() {
  return {
    name: COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    path: "/",
    maxAge: 0,
  };
}
