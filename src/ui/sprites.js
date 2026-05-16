export const MONSTER_SPRITES = {
  leaf: [
    "...11..11...",
    "..123..321..",
    "...133331...",
    "..13233231..",
    ".132e33e231.",
    ".132w33w231.",
    "132334433231",
    "132333333231",
    ".1323223231.",
    "..13333331..",
    "...133331...",
    "....1111....",
  ],
  flame: [
    "..1....1....",
    ".121..121...",
    ".13211231...",
    "1323333231..",
    "133e33e331..",
    "1323w433321.",
    ".13333332311",
    "..1323323143",
    "...133331.14",
    "....1221....",
    "...11..11...",
    "..1.....1...",
  ],
  aqua: [
    ".....1......",
    "....123.....",
    "...12321....",
    "...13331....",
    "..1323321...",
    ".132ee3321..",
    "13233333321.",
    "1323w33w321.",
    ".1323333231.",
    "..13243321..",
    "...133331...",
    "....1111....",
  ],
  light: [
    "....444.....",
    "..11...11...",
    ".1221.1221..",
    "..1233321...",
    ".123333321..",
    "1233e3e3321.",
    "1233w3w3321.",
    ".123333321..",
    "..1234321...",
    "...12321....",
    "....111.....",
    "...1...1....",
  ],
  dark: [
    "............",
    "...111111...",
    "..1233331...",
    ".123333331..",
    ".1234e33331.",
    "12333w33331.",
    "12333334e31.",
    ".1233344431.",
    "..12333331..",
    "...122221...",
    "..11....11..",
    ".1.......1..",
  ],
};

export const PLAYER_SPRITE = {
  palette: ["#000", "#1d2a3a", "#6e4a2a", "#c89a66", "#f4d6a8", "#3a5a96", "#7aa8d8", "#c3382c"],
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
      else if (c === "4") color = palette[3];
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
      const color = palette[parseInt(c, 10)];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x + xx * scale, y + yy * scale, scale, scale);
      }
    }
  }
}
