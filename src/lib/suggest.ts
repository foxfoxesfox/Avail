// Ranks candidate session times. Pure (no imports) so it runs under `node --test`.

export type SlotNames = { free: string[]; ifNeeded: string[] };
export type Person = { name: string; isKey: boolean; replied: boolean };
export type Suggestion = {
  day: string;
  startMin: number;
  endMin: number;
  free: string[]; // free for the whole block
  ifNeeded: string[]; // can make it, but "if needed" for part of the block
  busy: string[]; // replied, not available for the whole block
  noReply: string[];
  keyMissing: string[]; // key members who can't make it (busy or no reply)
};

/**
 * Every run of `length` consecutive slots within one day, best first:
 * all key members can make it, then most people fully free, then most "if needed", then earliest.
 */
export function rankSessions(
  days: string[],
  minutes: number[],
  step: number,
  length: number,
  slots: Map<string, SlotNames>,
  people: Person[],
  limit = 5,
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const day of days) {
    for (let i = 0; i + length <= minutes.length; i++) {
      const block = minutes.slice(i, i + length);
      // Gaps (e.g. none in practice, but guard) break a block.
      if (block[block.length - 1] - block[0] !== (length - 1) * step) continue;
      const cells = block.map((m) => slots.get(`${day}@${m}`) ?? { free: [], ifNeeded: [] });
      const freeAll = people.filter((p) => cells.every((c) => c.free.includes(p.name)));
      const okAll = people.filter((p) => cells.every((c) => c.free.includes(p.name) || c.ifNeeded.includes(p.name)));
      if (!okAll.length) continue;
      const ok = new Set(okAll.map((p) => p.name));
      const free = new Set(freeAll.map((p) => p.name));
      out.push({
        day,
        startMin: block[0],
        endMin: block[block.length - 1] + step,
        free: [...free],
        ifNeeded: okAll.filter((p) => !free.has(p.name)).map((p) => p.name),
        busy: people.filter((p) => p.replied && !ok.has(p.name)).map((p) => p.name),
        noReply: people.filter((p) => !p.replied && !ok.has(p.name)).map((p) => p.name),
        keyMissing: people.filter((p) => p.isKey && !ok.has(p.name)).map((p) => p.name),
      });
    }
  }
  out.sort((a, b) =>
    a.keyMissing.length - b.keyMissing.length
    || b.free.length - a.free.length
    || b.ifNeeded.length - a.ifNeeded.length
    || (a.day < b.day ? -1 : a.day > b.day ? 1 : a.startMin - b.startMin));
  return out.slice(0, limit);
}
