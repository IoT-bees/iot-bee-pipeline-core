export type TabKey = "existing" | "new";

export function defaultTab(existingCount: number): TabKey {
  return existingCount > 0 ? "existing" : "new";
}
