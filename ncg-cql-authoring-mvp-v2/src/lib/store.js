import { SEED_GUIDELINES } from '../data/seed.js';

const KEY = 'ncg-guideline-studio-v2';

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.guidelines?.length) {
        const seedMap = new Map(SEED_GUIDELINES.map((x) => [x.id, x]));

        // 1. Automatically update stored seed guidelines if code version or customDefinitions changed
        let updated = false;
        s.guidelines = s.guidelines.map((existing) => {
          const seed = seedMap.get(existing.id);
          if (!seed) return existing;
          const needsUpdate =
            existing.version !== seed.version ||
            (!existing.functions && seed.functions) ||
            (existing.functions?.length !== seed.functions?.length) ||
            (!existing.customDefinitions && seed.customDefinitions) ||
            (existing.customDefinitions?.length !== seed.customDefinitions?.length) ||
            (existing.rules?.length !== seed.rules?.length);
          if (needsUpdate) {
            updated = true;
            return structuredClone(seed);
          }
          return existing;
        });

        // 2. Automatically merge any newly added seed guidelines
        const existingIds = new Set(s.guidelines.map((x) => x.id));
        const missing = SEED_GUIDELINES.filter((x) => !existingIds.has(x.id));
        if (missing.length) {
          s.guidelines = [...s.guidelines, ...structuredClone(missing)];
          updated = true;
        }

        if (updated) {
          saveStore(s);
        }
        return s;
      }
    }
  } catch { /* ignore corrupt storage */ }
  return { guidelines: structuredClone(SEED_GUIDELINES), activeId: SEED_GUIDELINES[0].id };
}

export function saveStore(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}

export function resetStore() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  return { guidelines: structuredClone(SEED_GUIDELINES), activeId: SEED_GUIDELINES[0].id };
}

export function resetGuidelineToSeed(id) {
  const seed = SEED_GUIDELINES.find((x) => x.id === id);
  return seed ? structuredClone(seed) : null;
}
