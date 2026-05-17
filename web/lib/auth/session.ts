import { cookies } from "next/headers";

const COOKIE = process.env.AUTH_COOKIE_NAME ?? "iot_bee_session";
const MAX_AGE_HOURS = Number(process.env.AUTH_COOKIE_MAX_AGE_HOURS ?? 24);

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
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_HOURS * 60 * 60,
  };
}

export function clearSessionCookie() {
  return { name: COOKIE, value: "", maxAge: 0, path: "/" };
}
