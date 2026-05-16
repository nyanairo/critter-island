// Seeded PRNG (xorshift32) + helpers. Deterministic given the same seed.
// Used for: summon derivation, battle replay, anywhere reproducibility matters.

export function hashString(str) {
  // FNV-1a 32-bit -> non-zero seed (xorshift requires non-zero state).
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h >>>= 0;
  return h === 0 ? 0x9e3779b9 : h;
}

export function makeRng(seed) {
  let s = (seed | 0) || 0x9e3779b9;
  function next() {
    s ^= s << 13; s |= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s |= 0;
    return (s >>> 0) / 0x100000000;
  }
  return {
    next,
    int(min, max) { return min + Math.floor(next() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    chance(p) { return next() < p; },
    get seed() { return s >>> 0; },
  };
}

// Convenience: derive a sub-seed from a string + seed for layered determinism.
export function deriveSeed(seed, tag) {
  return hashString(String(seed) + ":" + tag);
}
