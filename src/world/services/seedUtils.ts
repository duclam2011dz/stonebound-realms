export function normalizeSeed(seedInput: string | number | null | undefined): string {
  const trimmed = String(seedInput ?? '').trim();
  if (!trimmed) return '';
  return trimmed;
}

export function hashSeedToInt(seed: string | number | null | undefined): number {
  const normalized = normalizeSeed(seed);
  if (!normalized) return Math.floor(Math.random() * 2147483647);

  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647;
}

export function seededSpawnPosition(
  seedInt: number,
  spread: number = 1024
): { x: number; z: number } {
  const x = ((seedInt % spread) - spread / 2) | 0;
  const z = ((((seedInt / spread) | 0) % spread) - spread / 2) | 0;
  return { x, z };
}
