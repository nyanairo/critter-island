// Hand-drawn pixel sprites as character grids.
// Palette index: 0 = transparent. 1/2/3 map to species.palette[1..3] (1=outline, 2=mid, 3=light).
// Bg sprites use a small fixed palette below.

export const BG_PALETTE = {
  ".": null,
  "g": "#2f6a3a", // grass
  "G": "#4a8a4a", // grass light
  "s": "#cbb16a", // sand
  "S": "#e3cf8a", // sand light
  "w": "#1f5070", // water
  "W": "#3d80a8", // water light
  "p": "#7a5236", // path
  "P": "#9a703f", // path light
  "r": "#666",    // rock
  "R": "#999",    // rock light
  "f": "#243549", // facility wall
  "F": "#3c5876", // facility roof
  "y": "#ffd95a", // accent (signs)
  "o": "#e6792b", // shrine glow
  "k": "#111",    // dark outline
  "_": "#000",    // black
};

// Monster body templates (12x12) — abstract chibi shapes per species.
// Codes: . transparent, 1 outline, 2 mid, 3 light, e eye (black), w white.
export const MONSTER_SPRITES = {
  // LEAF: round head with leaf on top
  leaf: [
    "....111.....",
    "...12121....",
    "..1322321...",
    ".132333231..",
    "13232e2e231.",
    "13322232231.",
    ".13222w2231.",
    "..1322321...",
    "...13231....",
    "....111.....",
    "....1.1.....",
    "....1.1.....",
  ],
  // FLAME: spiky body
  flame: [
    "...1.1.1....",
    "..1213121...",
    ".121332121..",
    "1322e3e2331.",
    "133232323321",
    "132333333231",
    ".13322333231",
    "..1322232.1.",
    "...132331...",
    "....1331....",
    "....1.1.....",
    "...1...1....",
  ],
  // AQUA: droplet
  aqua: [
    ".....1......",
    "....121.....",
    "...12321....",
    "..1233321...",
    ".123e3e321..",
    "12323w32321.",
    "13233333231.",
    "13233332321.",
    ".1233323321.",
    "..13232321..",
    "...1331231..",
    "....11111...",
  ],
};

// Player sprite (16x16) — neutral pixel-art character.
export const PLAYER_SPRITE = {
  size: 16,
  palette: ["#000", "#1d2a3a", "#6e4a2a", "#c89a66", "#f4d6a8", "#3a5a96", "#7aa8d8", "#c3382c"],
  // codes 0..7 in palette; '.' transparent
  pixels: [
    ".....11111......",
    "....1222221.....",
    "...122332221....",
    "...1233333321...",
    "...1234443321...",
    "....14444331....",
    ".....11441......",
    "....1555551.....",
    "...155555551....",
    "..15555555551...",
    "..1565565561....",
    "..1666666661....",
    "..1666666661....",
    "...16666661.....",
    "...122112221....",
    "...11..1111.....",
  ],
};

// Facility tile decorations (16x12) — drawn at top of building.
export const FACILITY_ICONS = {
  shrine:   "🜲",
  training: "💪",
  arena:    "⚔",
  home:     "⌂",
};

// Draw a small monster sprite at (x,y) on ctx, with given species palette.
export function drawMonster(ctx, speciesId, palette, x, y, scale = 1) {
  const grid = MONSTER_SPRITES[speciesId];
  if (!grid) return;
  for (let yy = 0; yy < grid.length; yy++) {
    const row = grid[yy];
    for (let xx = 0; xx < row.length; xx++) {
      const c = row[xx];
      let color = null;
      if (c === "1") color = palette[0];
      else if (c === "2") color = palette[1];
      else if (c === "3") color = palette[2];
      else if (c === "e") color = "#0a0a0a";
      else if (c === "w") color = "#ffffff";
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + xx * scale, y + yy * scale, scale, scale);
      }
    }
  }
}

export function drawPlayer(ctx, x, y, scale = 1) {
  const { pixels, palette } = PLAYER_SPRITE;
  for (let yy = 0; yy < pixels.length; yy++) {
    const row = pixels[yy];
    for (let xx = 0; xx < row.length; xx++) {
      const c = row[xx];
      if (c === ".") continue;
      const idx = parseInt(c, 10);
      const color = palette[idx];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + xx * scale, y + yy * scale, scale, scale);
      }
    }
  }
}
