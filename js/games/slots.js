// Slot machine. Three pixel heads on the payline = jackpot (40% of spins),
// and the jackpot sends you to one of my socials, picked at random.
import { pixelSVG } from "../pixel.js";
import { store } from "./store.js";

const JACKPOT_ODDS = 0.4;
const SOCIALS = [
  { name: "Instagram", url: "https://www.instagram.com/unshusarda" },
  { name: "LinkedIn", url: "https://www.linkedin.com/in/anshumansarda" },
  { name: "GitHub", url: "https://github.com/anshumansarda" },
];

const ART = {
  seven: [[
    "##########", "##########", ".......###", "......###.", ".....###..",
    "....###...", "...###....", "...###....", "...###....", "...###....",
  ], "#d6402f"],
  star: [[
    "....##....", "....##....", "...####...", "##########", ".########.",
    "..######..", "..######..", ".###..###.", ".##....##.", "##......##",
  ], "#f3b52e"],
  diamond: [[
    "..........", "..######..", ".########.", "##########", ".########.",
    "..######..", "...####...", "....##....", "..........", "..........",
  ], "#3e7bf0"],
};
const CHERRY_STEM = ["......##..", ".....#.#..", "....#..#..", "...#...#..", "..#....#..", "..........", "..........", "..........", "..........", ".........."];
const CHERRY_BALLS = ["..........", "..........", "..........", "..........", "..........", ".##...##..", "####.####.", "####.####.", ".##...##..", ".........."];

const SYMBOLS = ["head", "seven", "star", "diamond", "cherry"];

function symbolHTML(s) {
  if (s === "head") return `<span class="sl-sym"><img src="assets/head.png" alt="" class="sprite" /></span>`;
  if (s === "cherry") {
    return `<span class="sl-sym"><span class="sl-layer">${pixelSVG(CHERRY_STEM, "#2f9e5b")}</span><span class="sl-layer">${pixelSVG(CHERRY_BALLS, "#d6402f")}</span></span>`;
  }
  const [rows, color] = ART[s];
  return `<span class="sl-sym">${pixelSVG(rows, color)}</span>`;
}

const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const pick = (a) => a[Math.floor(rnd() * a.length)];

function outcome() {
  if (rnd() < JACKPOT_ODDS) return ["head", "head", "head"];
  let r;
  do r = [pick(SYMBOLS), pick(SYMBOLS), pick(SYMBOLS)];
  while (r.every((s) => s === "head"));
  return r;
}

export function mount(root) {
  root.innerHTML = `
    <div class="sl">
      <div class="g-hud">
        <div class="g-stat"><b data-k="spins">0</b><span>spins</span></div>
        <div class="g-stat"><b data-k="jackpots">0</b><span>jackpots</span></div>
      </div>
      <div class="sl-machine">
        <div class="sl-cabinet">
          <div class="sl-marquee">
            <span class="sl-lights" aria-hidden="true"></span>
            <span class="pixel">Jackpot</span>
            <span class="sl-lights" aria-hidden="true"></span>
          </div>
          <div class="sl-window">
            <div class="sl-reel"><div class="sl-strip"></div></div>
            <div class="sl-reel"><div class="sl-strip"></div></div>
            <div class="sl-reel"><div class="sl-strip"></div></div>
            <span class="sl-payline" aria-hidden="true"></span>
          </div>
          <p class="sl-rule mono">3 heads = jackpot</p>
        </div>
        <button class="sl-lever" aria-label="Pull the lever"><span class="sl-stick"></span><span class="sl-knob"></span></button>
        <div class="sl-win" hidden>
          <p class="pixel sl-win-title">Jackpot!</p>
          <p class="sl-win-text">Sending you to my <b data-k="dest">Instagram</b> in <b data-k="count">3</b>…</p>
          <div class="g-row">
            <a class="px-btn primary" data-k="go" href="#">Go now</a>
            <button class="px-btn" data-act="stay">Stay here</button>
          </div>
        </div>
      </div>
      <p class="g-msg" aria-live="polite">Pull the lever.</p>
      <div class="g-row"><button class="px-btn primary" data-act="spin">Spin</button></div>
    </div>`;

  const q = (s) => root.querySelector(s);
  const k = (n) => root.querySelector(`[data-k="${n}"]`);
  const reels = [...root.querySelectorAll(".sl-reel")];
  const strips = [...root.querySelectorAll(".sl-strip")];
  const lever = q(".sl-lever");
  const msg = q(".g-msg");
  const win = q(".sl-win");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let spins = 0;
  let jackpots = store.get("slot-jackpots", 0);
  let busy = false;
  let countdown = 0;
  let current = [pick(SYMBOLS.slice(1)), "head", pick(SYMBOLS.slice(1))];
  k("jackpots").textContent = jackpots;

  // geometry comes from CSS so it scales on phones
  const cellH = () => reels[0].clientHeight / 1.5;

  function setStrip(i, list, targetIndex, animate, delay) {
    const strip = strips[i];
    strip.innerHTML = list.map(symbolHTML).join("");
    const h = cellH();
    strip.querySelectorAll(".sl-sym").forEach((el) => (el.style.height = h + "px"));
    const end = -(targetIndex * h) + h * 0.25;
    if (!animate) { strip.style.transform = `translateY(${end}px)`; return Promise.resolve(); }
    const start = -(0 * h) + h * 0.25;
    return strip.animate(
      [{ transform: `translateY(${start}px)` }, { transform: `translateY(${end + h * 0.12}px)`, offset: 0.92 }, { transform: `translateY(${end}px)` }],
      { duration: reduced ? 1 : 1200 + i * 450, delay: reduced ? 0 : delay, easing: "cubic-bezier(.3,.1,.25,1)", fill: "forwards" }
    ).finished;
  }

  function idle() {
    current.forEach((s, i) => {
      const list = [pick(SYMBOLS), s, pick(SYMBOLS)];
      setStrip(i, list, 1, false);
    });
  }

  async function spin() {
    if (busy) return;
    busy = true;
    q('[data-act="spin"]').disabled = true;
    msg.textContent = "…";
    lever.classList.remove("pulled");
    void lever.offsetWidth;
    lever.classList.add("pulled");
    const res = outcome();
    await Promise.all(res.map((s, i) => {
      const len = 14 + i * 4;
      const list = [current[i]];
      for (let j = 1; j < len; j++) list.push(pick(SYMBOLS));
      list.push(s, pick(SYMBOLS));
      return setStrip(i, list, len, true, i * 60);
    }));
    current = res;
    spins++;
    k("spins").textContent = spins;
    busy = false;
    q('[data-act="spin"]').disabled = false;
    lever.classList.remove("pulled");

    if (res.every((s) => s === "head")) return jackpot();
    if (res[0] === res[1] && res[1] === res[2]) msg.textContent = "Three of a kind. Nice, but not the head.";
    else if (res.filter((s) => s === "head").length === 2) msg.textContent = "Two heads. So close.";
    else msg.textContent = pick(["Nothing. Again?", "Not this time.", "The reels are thinking about it.", "Pull again."]);
  }

  function jackpot() {
    jackpots++;
    store.set("slot-jackpots", jackpots);
    k("jackpots").textContent = jackpots;
    const dest = pick(SOCIALS);
    msg.textContent = "Three heads!";
    k("dest").textContent = dest.name;
    k("go").href = dest.url;
    win.hidden = false;
    q(".sl-machine").classList.add("is-jackpot");
    let n = 3;
    k("count").textContent = n;
    clearInterval(countdown);
    countdown = setInterval(() => {
      n--;
      k("count").textContent = n;
      if (n <= 0) { clearInterval(countdown); location.href = dest.url; }
    }, 1000);
  }

  function stay() {
    clearInterval(countdown);
    win.hidden = true;
    q(".sl-machine").classList.remove("is-jackpot");
    msg.textContent = "Staying. Fair enough.";
  }

  q(".sl").addEventListener("click", (e) => {
    if (e.target.closest(".sl-lever") || e.target.closest('[data-act="spin"]')) spin();
    if (e.target.closest('[data-act="stay"]')) stay();
  });
  const onKey = (e) => {
    if (e.key === " " && !(e.target.closest && e.target.closest("button, a"))) { e.preventDefault(); if (win.hidden) spin(); }
  };
  addEventListener("keydown", onKey);

  const ro = new ResizeObserver(() => { if (!busy) idle(); });
  ro.observe(reels[0]);
  idle();

  return () => {
    clearInterval(countdown);
    removeEventListener("keydown", onKey);
    ro.disconnect();
  };
}
