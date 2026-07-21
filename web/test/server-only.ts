// Vitest runs outside Next's module graph. Next resolves `server-only` to its
// server marker during application builds; this empty test double keeps pure
// server utility tests executable without weakening that production boundary.
export {};
