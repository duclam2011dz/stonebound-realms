export function parseRelativeCoordinate(token: unknown, currentValue: number): number | null {
  const normalized = String(token ?? '').trim();
  if (!normalized) return null;

  if (normalized === '~') return currentValue;
  if (normalized.startsWith('~')) {
    const deltaToken = normalized.slice(1);
    if (!deltaToken) return currentValue;
    const delta = Number(deltaToken);
    if (!Number.isFinite(delta)) return null;
    return currentValue + delta;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}
