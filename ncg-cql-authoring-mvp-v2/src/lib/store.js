import { SEED_GUIDELINES } from '../data/seed';

const KEY = 'ncg-guideline-studio-v2';

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.guidelines?.length) return s;
    }
  } catch { /* ignore corrupt storage */ }
  return { guidelines: structuredClone(SEED_GUIDELINES), activeId: SEED_GUIDELINES[0].id };
}

export function saveStore(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}

export function resetStore() {
  localStorage.removeItem(KEY);
}
