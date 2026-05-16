// Versioned localStorage save. Day-1 versioning + corruption fallback.

const KEY = "critter_island_save_v1";
export const SAVE_VERSION = 2;
export const CURRENT_VERSION = SAVE_VERSION;

// Migrations from older versions land here.
const migrations = {
  1: (data) => ({ ...data, version: 2, game: { ...data.game } }),
};

export function load() {
  let raw;
  try { raw = localStorage.getItem(KEY); }
  catch { return null; }
  if (!raw) return null;

  let parsed;
  try { parsed = JSON.parse(raw); }
  catch {
    console.warn("[save] corrupted JSON, ignoring");
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.version !== "number") return null;

  let v = parsed.version;
  let data = parsed;
  while (v < CURRENT_VERSION) {
    const fn = migrations[v];
    if (!fn) { console.warn("[save] no migration from", v); return null; }
    try { data = fn(data); v = data.version; }
    catch (e) { console.warn("[save] migration failed", e); return null; }
  }

  if (!data.game || typeof data.game !== "object") return null;
  return data;
}

export function save(game) {
  const payload = {
    version: CURRENT_VERSION,
    createdAt: game.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    game,
  };
  try { localStorage.setItem(KEY, JSON.stringify(payload)); return true; }
  catch (e) { console.warn("[save] write failed", e); return false; }
}

export function clear() {
  try { localStorage.removeItem(KEY); } catch {}
}
