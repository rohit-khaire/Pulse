/** Pure helpers behind the plug-in registry (the registry itself holds React). */

export interface RegistryLike {
  id: string;
  label: string;
  enabled: boolean;
}

export function enabledEntries<T extends RegistryLike>(entries: readonly T[]): T[] {
  return entries.filter((e) => e.enabled);
}

/** Returns human-readable problems; empty = healthy. Used for a dev-time warning. */
export function findRegistryProblems(
  name: string,
  entries: readonly RegistryLike[]
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (!e.id || !/^[a-z0-9][a-z0-9-]*$/.test(e.id)) {
      problems.push(`${name}: invalid id "${e.id}" (use kebab-case)`);
    }
    if (seen.has(e.id)) problems.push(`${name}: duplicate id "${e.id}"`);
    seen.add(e.id);
    if (!e.label || !e.label.trim()) problems.push(`${name}: "${e.id}" has no label`);
  }
  return problems;
}

/** Keep the active tab valid when a plug-in tab is disabled or removed. */
export function resolveActiveTab(active: string, tabs: readonly RegistryLike[]): string {
  const on = enabledEntries(tabs);
  if (on.some((t) => t.id === active)) return active;
  return on[0]?.id ?? '';
}

/** Arrow/Home/End keyboard navigation for the tab list. Returns the next index. */
export function nextTabIndex(current: number, count: number, key: string): number {
  if (count <= 0) return 0;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return current;
  }
}
