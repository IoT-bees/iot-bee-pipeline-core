import { NextRequest, NextResponse } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME ?? "iot_bee_session";

const PROTECTED_PREFIXES = [
  "/app",
  "/pipelines",
  "/sources",
  "/stores",
  "/schemas",
  "/groups",
  "/settings",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!isProtected) return NextResponse.next();
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|api|favicon\\.ico|icon\\.svg|apple-icon\\.svg|manifest\\.json|robots\\.txt|sitemap\\.xml).*)",
  ],
};
