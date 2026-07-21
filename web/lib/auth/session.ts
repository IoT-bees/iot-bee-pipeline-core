import { cookies } from "next/headers";
import { getServerEnv } from "@/lib/env/server";

function secureCookie(): boolean {
  const { authCookieSecure } = getServerEnv();
  // Honor explicit override (staging behind HTTPS LB sets AUTH_COOKIE_SECURE=1).
  if (authCookieSecure === "1") return true;
  if (authCookieSecure === "0") return false;
  return process.env.NODE_ENV === "production";
}

export async function getToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(getServerEnv().authCookieName)?.value ?? null;
}

export function buildSessionCookie(token: string) {
  const env = getServerEnv();
  return {
    name: env.authCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    path: "/",
    maxAge: env.authCookieMaxAgeHours * 60 * 60,
  };
}

export function clearSessionCookie() {
  const env = getServerEnv();
  return {
    name: env.authCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookie(),
    path: "/",
    maxAge: 0,
  };
}
