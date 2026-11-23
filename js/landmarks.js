// Pixel postcards for the Map cards: a sky, some ground and one landmark per place.
// Every scene is 40 x 25 pixels and drawn with the same palette as the rest of the site.
import { pixelArt } from "./pixel.js";

const W = 40, H = 25, GROUND = 20;

const PAL = {
  k: "#161614", w: "#fffdf7", t: "#b9b6ae", T: "#77746d",
  y: "#f3b52e", o: "#d9824a", O: "#a8562a", r: "#ea4a3b",
  s: "#e8c98a", S: "#c9a46a", n: "#8a5a32", N: "#5e3b1f",
  g: "#2f9e5b", G: "#1f7542", l: "#5fae9b", L: "#3f8a78",
  b: "#3e7bf0", B: "#2856b8", c: "#bfe0ff",
};

// landmark art, bottom row sits on the ground line
const ART = {
  liberty: [
    ".y........", "yyy.......", ".n........", ".l..l.l.l.", ".l..lllll.", ".ll.lllll.",
    "..llllll..", "...llllll.", "...llLlll.", "...llLlll.", "...lllLll.", "...llllLl.",
    "...llllLl.", "..llllllll", "..tttttttt", ".tttttttttt", ".tTtTtTtTtt", "ttttttttttttt",
  ],
  bigben: [
    "....k....", "...kTk...", "...TTT...", "..TTTTT..", "..SSSSS..", "..SwkwS..", "..SwwwS..",
    "..SSSSS..", "..SnSnS..", "..SnSnS..", "..SSSSS..", "..SnSnS..", "..SnSnS..", "..SSSSS..",
    "..SnSnS..", ".SSSSSSS.", ".SnSnSnS.", "SSSSSSSSS",
  ],
  kolkata: [
    "......k......", "......y......", ".....www.....", "....wwwww....", "...wwwwwww...", "...wwwwwww...",
    "..ttttttttt..", "..wwwwwwwww..", "w.wkwkwkwkw.w", "w.wwwwwwwww.w", "wwwwwwwwwwwww", "wkwwkwwwkwwkw",
    "wwwwwwwwwwwww", "ttttttttttttt",
  ],
  balloons: [
    "..rrr.........yyy...", ".rrrrr.......yyyyy..", ".rwrwr.......yoyoy..", "..rrr.........yyy...",
    "...n...........n....", "..nnn.........nnn...", "....................", "........ooo.........",
    ".......ooooo........", ".......owowo........", "........ooo.........", ".........n..........",
    "........nnn.........", "....................", "..S.......S.....S...", ".SSS.....SSS...SSS..",
    ".SSS..S..SSS...SSS..", "SSSSSSSSSSSSSSSSSSSS",
  ],
  minaret: [
    ".......y.........", ".......O.........", "......OOO........", "......OkO........", ".....OOOOO.......",
    ".....OOOOO.......", ".....OkOkO.......", ".....OOOOO...gg..", ".....OOOOO..gggg.", ".....OOkOO.g.n..g",
    ".....OOOOO...n...", ".....OkOkO...n...", ".....OOOOO...n...", ".....OOOOO...n...", "....OOOOOOO..n...",
  ],
  pyramids: [
    "...........S............", "..........SSs...........", ".........SSSss..........", "........SSSSsss.........",
    ".......SSSSSssss........", "......SSSSSSsssss.......", ".....SSSSSSSssssss..S...", "....SSSSSSSSsssssssSSs..",
    "...SSSSSSSSSssssssSSSss.", "..SSSSSSSSSSsssssSSSSsss",
  ],
  steps: [
    "........TTTT........", "........TkkT........", ".......TTTTTT.......", "......tttttttt......",
    "......tttkkttt......", ".....tttttttttt.....", "....tttttkkttttt....", "....tttttkkttttt....",
    "...ttttttkktttttt...", "..tttttttkkttttttt..", ".ttttttttkktttttttt.", "tttttttttkkttttttttt",
  ],
  halong: [
    "..GG................GG..", ".GGGG..............GGGG.", ".GGGG.....G.......GGGGG.", "GGGGGG...GGG......GGGGGG",
    "GGGGGG...GGG.....GGGGGGG", "GGGGGGG.GGGGG..r.GGGGGGG", "GGGGGGG.GGGGG.rr.GGGGGGG", "GGGGGGG.GGGGGrrr.GGGGGGG",
    "........GGGGrrrr.GGGGGGG", ".............n..........", "..........nnnnnnn.......", "...........nnnnn........",
  ],
  tower: [
    "....T....", "...TTT...", "..TTTTT..", "..ttttt..", "..tktkt..", "..ttttt..", "..ttttt..",
    "..ttktt..", "..ttttt..", "..ttttt..", "..ttktt..", "..ttttt..", ".ttttttt.",
  ],
  castle: [
    "..b...............", "..bb..............", "..t.....t.t.t.....", ".ttt.t..ttttt.t.t.",
    ".ttttt..tkttttttt.", ".tkttttttttttkttt.", ".ttttttktttttttttt", ".ttttttttttttttttt",
    "TTTTTTTTTTTTTTTTTTT", "TTTTTTTTTTTTTTTTTTTT", "TTTTTTTTTTTTTTTTTTTTT",
  ],
  sigiriya: [
    "........gggggggg........", "......GGgggggggGG.......", ".....nnnnnnnnnnnnn......", "....nnnNnnnnnnnNnnn.....",
    "....nnnnnnnnnnnnnnn.....", "...nnnnnnNnnnnnnnnnn....", "...nnnnnnnnnnnnnNnnn....", "..nnnNnnnnnnnnnnnnnnn...",
    "..nnnnnnnnnnnnnnnnnnn...", ".gGnnnnnnnnnnnnnnnnnnGg.", "gGGGgnnnnnnnnnnnnnnGGGGg",
  ],
  boat: [
    "......r.........", "......n.........", "....wwn.........", "...wwwn.........", "..wwwwn.........",
    ".wwwwwn.........", "wwwwwwn.........", "......n.........", "nnnnnnnnnnnnnnnn", ".nnnnnnnnnnnnnn.",
    "..NNNNNNNNNNNN..",
  ],
  himalaya: [
    "..........w.............", ".........www............", "........wwTww...........", ".......wwTTTTw.....w....",
    "......wTTTTTTTT...www...", ".....TTTTTTTTTTT.wTTTw..", "....TTTTTTTTTTTTTTTTTTT.", "...TTTTTTTTTTTTTTTTTTTTT",
    "..TTTTTTTTTTTTTTTTTTTTTT", ".TTTTTTTTTTTTTTTTTTTTTTT",
  ],
  mosque: [
    "w.........y.........w", "w.........w.........w", "w........www........w", "w.......wwwww.......w",
    "w..y...wwwwwww...y..w", "w..w...wwwwwww...w..w", "w.www..wwwwwww..www.w", "wwwwwwwwwwwwwwwwwwwww",
    "wkwwkwwkwwkwwkwwkwwkw", "wkwwkwwkwwkwwkwwkwwkw", "wwwwwwwwwwwwwwwwwwwww",
  ],
};

// sky top, sky bottom, ground, extras ('sun' | 'moon' | 'stars')
const SCENE = {
  liberty: ["#8fb8ff", "#cfe0ff", "B", "sun"],
  bigben: ["#9fb4c8", "#d6dde4", "g", "cloud"],
  kolkata: ["#f6b26b", "#fde2b8", "g", "sun"],
  balloons: ["#ffcf8a", "#ffecc8", "S", ""],
  minaret: ["#f6a964", "#fcd9a8", "s", "sun"],
  pyramids: ["#ffd27a", "#fff0c9", "s", "sun"],
  steps: ["#8fd1ff", "#d4efff", "g", "sun"],
  halong: ["#b9d9e8", "#e6f2f6", "b", "cloud"],
  tower: ["#a9c4d6", "#dbe7ee", "g", "cloud"],
  castle: ["#8fa7c4", "#cbd6e3", "G", "cloud"],
  sigiriya: ["#8fd8c8", "#d6f5ee", "g", "sun"],
  boat: ["#ffb38a", "#ffe0cc", "b", "sun"],
  himalaya: ["#6fa0f0", "#c7dbff", "G", "sun"],
  mosque: ["#2b2f5c", "#7a5c9e", "s", "moon"],
};

export function landmark(key) {
  const art = ART[key], sc = SCENE[key];
  if (!art || !sc) return "";
  const [top, bottom, ground, extra] = sc;
  const pal = { ...PAL, A: top, Z: bottom, x: "rgba(255,255,255,.85)" };
  const grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      if (y >= GROUND) row.push(ground);
      else {
        // two-tone sky with a dithered band in the middle
        const band = y < 7 ? "A" : y > 9 ? "Z" : (x + y) % 2 ? "A" : "Z";
        row.push(band);
      }
    }
    grid.push(row);
  }
  // ground texture: a darker line on top, a few flecks below
  const dark = { g: "G", G: "N", s: "S", S: "O", B: "b", b: "B" }[ground] || ground;
  for (let x = 0; x < W; x++) {
    grid[GROUND][x] = dark;
    for (let y = GROUND + 1; y < H; y++) if ((x * 3 + y * 5) % 11 === 0) grid[y][x] = dark;
  }
  if (ground === "b") for (let x = 2; x < W; x += 6) grid[GROUND + 2][x] = grid[GROUND + 2][x + 1] = "c";

  const put = (rows, ox, oy, col) => rows.forEach((r, j) => [...r].forEach((ch, i) => {
    const X = ox + i, Y = oy + j;
    if (ch !== "." && X >= 0 && X < W && Y >= 0 && Y < H) grid[Y][X] = col || ch;
  }));
  if (extra === "sun") put([".yy.", "yyyy", "yyyy", ".yy."], 32, 3);
  if (extra === "moon") { put([".ww.", "ww..", "ww..", ".ww."], 32, 3); put(["w"], 6, 3); put(["w"], 14, 6); put(["w"], 25, 2); }
  if (extra === "cloud") { put(["..xxx...", ".xxxxxx.", "xxxxxxxx"], 29, 3); put([".xxx.", "xxxxx"], 3, 5); }

  const w = Math.max(...art.map((r) => r.length));
  put(art, Math.floor((W - w) / 2), GROUND - art.length);
  return pixelArt(grid.map((r) => r.join("")), pal).replace("<svg ", '<svg preserveAspectRatio="xMidYMid slice" ');
}
