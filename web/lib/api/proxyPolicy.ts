const PUBLIC_PATHS = new Set(["auth/has-users", "health"]);
const ALLOWED_PREFIXES = [
  "admin",
  "auth/me",
  "connection-types",
  "data-sources",
  "data-stores",
  "pipeline-groups",
  "pipeline-lifecycle",
  "pipelines",
  "plans",
  "validation-schemas",
];
const ALLOWED_LICENSE_PATHS = new Set([
  "license/status",
  "license/activate",
  "license/deactivate",
]);

export function normalizeProxyPath(path: string[]): string | null {
  if (!path.length || path.some((segment) => !segment || segment === "." || segment === "..")) {
    return null;
  }
  return path.join("/");
}

export function isAllowedProxyPath(path: string): boolean {
  return (
    PUBLIC_PATHS.has(path) ||
    ALLOWED_LICENSE_PATHS.has(path) ||
    ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
  );
}

/** Browsers add Origin to cross-site fetches. Allow a missing origin for CLI/service callers. */
export function hasTrustedOrigin(requestUrl: string, origin: string | null): boolean {
  return !origin || origin === new URL(requestUrl).origin;
}
