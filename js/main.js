import { paintGlyphs } from "./pixel.js";
import { initLiquid } from "./liquid.js";
import { initClock } from "./clock.js";
import { initZodiac } from "./zodiac.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

paintGlyphs();
initLiquid();
initClock();
initZodiac();

/* ---------------- clock + year ---------------- */
const clock = $("#clock");
function tick() {
  const t = new Date();
  clock.textContent = `${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} local`;
}
tick();
setInterval(tick, 15000);
$("#year").textContent = new Date().getFullYear();

/* ---------------- loader ---------------- */
const loader = $("#loader");
const pctEl = $("#pct");
const fill = $(".ld-fill");
const bar = $(".ld-bar");
const ldWalker = $(".ld-walker");
let loaded = false;
let finished = false;

const ready = Promise.all([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise((res) => {
    const img = $(".ld-walker .sprite");
    if (img.complete) res();
    else { img.onload = res; img.onerror = res; }
  }),
]).then(() => { loaded = true; });

function setPct(p) {
  const v = Math.round(p);
  pctEl.textContent = v;
  fill.style.width = v + "%";
  bar.setAttribute("aria-valuenow", v);
}

function runLoader() {
  const DUR = reduced ? 300 : 1900;
  const start = performance.now();
  if (!reduced) {
    ldWalker.classList.add("walking");
    ldWalker.animate(
      [{ transform: "translateX(-42vw)" }, { transform: "translateX(0)" }],
      { duration: DUR * 0.85, easing: "linear", fill: "both" }
    ).onfinish = () => ldWalker.classList.remove("walking");
  }
  function frame(now) {
    if (finished) return;
    const t = Math.min(1, (now - start) / DUR);
    // hold at 92% until assets are ready
    const eased = 1 - Math.pow(1 - t, 2.2);
    const p = loaded ? eased * 100 : Math.min(eased * 100, 92);
    setPct(p);
    if (t >= 1 && loaded) finishLoader();
    else requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function finishLoader() {
  if (finished) return;
  finished = true;
  setPct(100);
  const target = $("#walker .sprite");
  const from = $(".ld-walker .sprite");
  $("#walker").style.opacity = 0;
  document.body.classList.remove("is-loading");

  // let the desk lay out, then fly the loader sprite into the stage
  requestAnimationFrame(() => {
    const a = from.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.bottom - a.bottom;
    const s = b.height / a.height;
    $(".ld-top").style.opacity = 0;
    $(".ld-skip").style.opacity = 0;
    loader.style.background = "transparent";
    ldWalker.getAnimations().forEach((an) => an.cancel());
    ldWalker.classList.add("walking");
    const anim = ldWalker.animate(
      [
        { transform: "translate(0,0) scale(1)", transformOrigin: "50% 100%" },
        { transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: "50% 100%" },
      ],
      { duration: reduced ? 1 : 750, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" }
    );
    anim.onfinish = () => {
      $("#walker").style.opacity = 1;
      loader.classList.add("done");
      setTimeout(() => loader.remove(), 600);
      route();
    };
  });
}

ready.then(runLoader);
addEventListener("keydown", skip);
loader.addEventListener("pointerdown", skip);
function skip() {
  if (finished) return removeEventListener("keydown", skip);
  if (loaded) finishLoader();
}

/* ---------------- walker follows your cursor between folders ---------------- */
const walker = $("#walker");
let walkerX = 0;
let walkTimer;
function walkTo(x) {
  if (reduced) return;
  const dist = Math.abs(x - walkerX);
  if (dist < 2) return;
  walker.classList.toggle("left", x < walkerX);
  walker.style.setProperty("--wdur", `${Math.min(1.1, 0.25 + dist / 520)}s`);
  walker.style.setProperty("--wx", `${x}px`);
  walker.classList.add("walking");
  walkerX = x;
  clearTimeout(walkTimer);
  walkTimer = setTimeout(() => walker.classList.remove("walking"), Math.min(1100, 250 + (dist / 520) * 1000));
}
function folderOffset(folder) {
  const stage = $(".stage").getBoundingClientRect();
  const r = folder.getBoundingClientRect();
  return r.left + r.width / 2 - (stage.left + stage.width / 2);
}

/* ---------------- folders ---------------- */
const folders = $$(".folder");
let lastOrigin = null;
let leaveTimer;

folders.forEach((f) => {
  const body = $(".f-body", f);
  const front = $(".f-front", f);

  if (finePointer) {
    f.addEventListener("pointermove", (e) => {
      const r = body.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      f.style.setProperty("--ty", `${x * 18}deg`);
      f.style.setProperty("--tx", `${-y * 14}deg`);
      const fr = front.getBoundingClientRect();
      f.style.setProperty("--mx", `${e.clientX - fr.left}px`);
      f.style.setProperty("--my", `${e.clientY - fr.top}px`);
    });
    f.addEventListener("pointerleave", () => {
      f.style.setProperty("--tx", "0deg");
      f.style.setProperty("--ty", "0deg");
      f.style.setProperty("--mx", "50%");
      f.style.setProperty("--my", "30%");
    });
  }

  const near = () => { clearTimeout(leaveTimer); walkTo(folderOffset(f)); };
  f.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") near(); });
  f.addEventListener("focus", near);
  f.addEventListener("click", () => {
    lastOrigin = f;
    walkTo(folderOffset(f));
    if (!reduced) {
      walker.classList.remove("hop");
      void walker.offsetWidth;
      walker.classList.add("hop");
    }
    setTimeout(() => { location.hash = f.dataset.open; }, reduced ? 0 : 160);
  });
});
$(".folders").addEventListener("pointerleave", () => {
  leaveTimer = setTimeout(() => walkTo(0), 900);
});
addEventListener("resize", () => { walkerX = 0; walker.style.setProperty("--wdur", "0s"); walker.style.setProperty("--wx", "0px"); });

/* ---------------- windows + routing ---------------- */
const scrim = $("#scrim");
const desk = $("#desk");
let openWin = null;
let activeGame = null; // { name, cleanup }

const games = {
  coin: () => import("./games/coin.js"),
  blackjack: () => import("./games/blackjack.js"),
  snake: () => import("./games/snake.js"),
  roulette: () => import("./games/roulette.js"),
  slots: () => import("./games/slots.js"),
  tictactoe: () => import("./games/tictactoe.js"),
};

function parseHash() {
  const [win, sub] = location.hash.replace(/^#\/?/, "").split("/");
  return { win, sub };
}

function route() {
  if (!finished) return;
  const { win, sub } = parseHash();
  const el = win && $(`#win-${win}`);
  if (!el) { if (openWin) closeWindow(false); return; }
  if (openWin !== el) {
    if (openWin) hideWin(openWin, true);
    showWin(el);
  }
  if (win === "games") showGame(sub);
}
addEventListener("hashchange", route);

function showWin(el) {
  openWin = el;
  el.hidden = false;
  scrim.hidden = false;
  desk.inert = true;
  requestAnimationFrame(() => scrim.classList.add("show"));
  const origin = lastOrigin || folders.find((f) => `win-${f.dataset.open}` === el.id);
  if (!reduced && origin) {
    const o = $(".f-body", origin).getBoundingClientRect();
    const w = el.getBoundingClientRect();
    const dx = o.left + o.width / 2 - (w.left + w.width / 2);
    const dy = o.top + o.height / 2 - (w.top + w.height / 2);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.16)`, opacity: 0, borderRadius: "60px" },
        { transform: "none", opacity: 1, borderRadius: getComputedStyle(el).borderRadius },
      ],
      { duration: 520, easing: "cubic-bezier(.2,.9,.25,1.04)" }
    );
  }
  $("[data-close]", el).focus({ preventScroll: true });
}

function hideWin(el, instant) {
  const origin = folders.find((f) => `win-${f.dataset.open}` === el.id);
  const done = () => { el.hidden = true; };
  if (instant || reduced || !origin) { done(); return; }
  const o = $(".f-body", origin).getBoundingClientRect();
  const w = el.getBoundingClientRect();
  const dx = o.left + o.width / 2 - (w.left + w.width / 2);
  const dy = o.top + o.height / 2 - (w.top + w.height / 2);
  el.animate(
    [{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(0.16)`, opacity: 0 }],
    { duration: 320, easing: "cubic-bezier(.5,0,.75,0)" }
  ).onfinish = done;
}

function closeWindow(updateHash = true) {
  if (!openWin) return;
  const el = openWin;
  const origin = folders.find((f) => `win-${f.dataset.open}` === el.id);
  if (el.id === "win-games") showGame(null);
  hideWin(el);
  openWin = null;
  scrim.classList.remove("show");
  setTimeout(() => { if (!openWin) scrim.hidden = true; }, 350);
  desk.inert = false;
  if (updateHash && location.hash) history.pushState(null, "", location.pathname + location.search);
  if (origin) origin.focus({ preventScroll: true });
  lastOrigin = null;
}

$$("[data-close]").forEach((b) => b.addEventListener("click", () => closeWindow()));
scrim.addEventListener("click", () => closeWindow());

/* ---------------- games ---------------- */
const menu = $("#game-menu");
const stage = $("#game-stage");
const backBtn = $("[data-game-back]");
const gamesTitle = $("#t-games");
const titles = { coin: "Heads or Tails", blackjack: "Blackjack", snake: "Snake", roulette: "Roulette", slots: "Slots", tictactoe: "Tic Tac Toe+" };

$$(".game-card").forEach((c) => c.addEventListener("click", () => { location.hash = `games/${c.dataset.game}`; }));
backBtn.addEventListener("click", () => { location.hash = "games"; });

async function showGame(name) {
  if (activeGame && activeGame.name === name) return;
  if (activeGame) { activeGame.cleanup && activeGame.cleanup(); activeGame = null; }
  stage.innerHTML = "";
  if (!name || !games[name]) {
    stage.hidden = true;
    menu.hidden = false;
    backBtn.hidden = true;
    gamesTitle.textContent = "Games";
    return;
  }
  menu.hidden = true;
  stage.hidden = false;
  backBtn.hidden = false;
  gamesTitle.textContent = titles[name];
  activeGame = { name, cleanup: null };
  const mod = await games[name]();
  if (!activeGame || activeGame.name !== name) return;
  activeGame.cleanup = mod.mount(stage);
  backBtn.focus({ preventScroll: true });
}

/* ---------------- keyboard ---------------- */
addEventListener("keydown", (e) => {
  if (!finished) return;
  if (e.key === "Escape" && openWin) {
    e.preventDefault();
    const { win, sub } = parseHash();
    if (win === "games" && sub) location.hash = "games";
    else closeWindow();
    return;
  }
  if (!openWin && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const map = { 1: "about", 2: "games", 3: "contact" };
    if (map[e.key]) {
      const f = folders.find((x) => x.dataset.open === map[e.key]);
      f.click();
    }
  }
  // simple focus trap inside the open window
  if (e.key === "Tab" && openWin) {
    const items = $$('button:not([hidden]):not([disabled]), a[href], [tabindex="0"]', openWin).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* "soon" socials do nothing */
$$(".soc.is-soon").forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
