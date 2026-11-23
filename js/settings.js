// The Settings folder: pointless, site-wide, and saved in localStorage.
import { store } from "./games/store.js";
import { AVATARS, pixelArt, paintGlyphs } from "./pixel.js";

const DEFAULTS = { theme: "day", avatar: "me", speed: "normal", gravity: true, cursor: true, sound: false, productivity: 50 };
const SPEEDS = { chill: 0.5, normal: 1, fast: 2, chaos: 4 };
const root = document.documentElement;
const listeners = new Set();
let prefs = { ...DEFAULTS, ...store.get("settings", {}) };

export const speed = () => SPEEDS[prefs.speed] || 1;
export const getPrefs = () => prefs;
export const onSettings = (fn) => listeners.add(fn);

const isNightNow = () => { const h = new Date().getHours(); return h >= 22 || h < 6; };

/* ---------- cursors, drawn the same way as every other icon ---------- */
const ARROW = [
  "k...........", "kk..........", "kwk.........", "kwwk........", "kwwwk.......", "kwwwwk......",
  "kwwwwwk.....", "kwwwwwwk....", "kwwwwwwwk...", "kwwwwwwwwk..", "kwwwwwkkkkk.", "kwwkwwk.....",
  "kwk.kwwk....", "kk..kwwk....", "k....kwwk...", ".....kwwk...", "......kk....",
];
const HAND = [
  ".....kk.........", "....kwwk........", "....kwwk........", "....kwwk........", "....kwwkkk......",
  "....kwwkwwkkk...", "..kkkwwkwwkwwkk.", ".kwwkwwwwwwwwwwk", ".kwwkwwwwwwwwwwk", "..kwwwwwwwwwwwwk",
  "..kwwwwwwwwwwwwk", "...kwwwwwwwwwwk.", "...kwwwwwwwwwwk.", "....kwwwwwwwwk..", "....kwwwwwwwwk..", "....kkkkkkkkkk..",
];
function cursorURL(rows, scale) {
  const w = Math.max(...rows.map((r) => r.length)) * scale, h = rows.length * scale;
  const svg = pixelArt(rows, { k: "#161614", w: "#fffdf7" }).replace("<svg ", `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `);
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
root.style.setProperty("--cur-arrow", cursorURL(ARROW, 2));
root.style.setProperty("--cur-hand", cursorURL(HAND, 2));

/* ---------- apply ---------- */
function apply() {
  const night = prefs.theme === "night" || (prefs.theme === "auto" && isNightNow());
  root.dataset.theme = night ? "night" : "day";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = night ? "#12141c" : "#f2f1ec";
  root.dataset.avatar = prefs.avatar;
  root.dataset.speed = prefs.speed;
  root.style.setProperty("--spd", speed());
  root.dataset.gravity = prefs.gravity ? "on" : "off";
  root.dataset.cursor = prefs.cursor ? "pixel" : "system";
  const alt = document.getElementById("avatar-alt");
  if (alt) {
    const a = AVATARS[prefs.avatar];
    alt.innerHTML = a ? pixelArt(a.rows, a.pal) : "";
    alt.dataset.kind = prefs.avatar;
  }
  listeners.forEach((fn) => fn(prefs));
}

function set(key, val) {
  prefs = { ...prefs, [key]: val };
  store.set("settings", prefs);
  root.classList.add("theme-anim");
  clearTimeout(set.t);
  set.t = setTimeout(() => root.classList.remove("theme-anim"), 700);
  apply();
  render();
}

/* ---------- click sounds ---------- */
let actx = null;
function blip(freq = 660) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = "square";
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(g).connect(actx.destination);
    o.start(t); o.stop(t + 0.1);
  } catch { /* no audio */ }
}
document.addEventListener("click", (e) => {
  if (!prefs.sound) return;
  const el = e.target.closest("button, a, [role=button]");
  if (el) blip(el.classList.contains("folder") ? 520 : 700 + Math.random() * 120);
}, true);

/* ---------- the settings window ---------- */
const ROWS = [
  { key: "theme", icon: "moon", ic: "#3e7bf0", title: "Appearance", type: "seg",
    opts: [["day", "Day"], ["night", "Night"], ["auto", "Auto"]],
    desc: { day: "Bright and tidy.", night: "Lights off. Everyone else is asleep.", auto: "Day, until 10pm your time." } },
  { key: "avatar", icon: "person", ic: "#2f9e5b", title: "Avatar", type: "avatar",
    opts: [["me", "Me"], ["cat", "Cat"], ["robot", "Robot"], ["ghost", "Ghost"]],
    desc: { me: "The original.", cat: "Walks around like it owns the place.", robot: "Beep. Boop. Same vibes.", ghost: "Spooky, but friendly." } },
  { key: "speed", icon: "bolt", ic: "#f3b52e", title: "Animation speed", type: "seg",
    opts: [["chill", "Chill"], ["normal", "Normal"], ["fast", "Fast"], ["chaos", "Chaos"]],
    desc: { chill: "Everything takes its time.", normal: "As designed.", fast: "Slightly over-caffeinated.", chaos: "You asked for this." } },
  { key: "gravity", icon: "cloud", ic: "#8d8a82", title: "Gravity", type: "toggle",
    desc: { true: "On. Things stay where you put them.", false: "Off. Things float now." } },
  { key: "cursor", icon: "cursor", ic: "#161614", title: "Pixel cursor", type: "toggle", fine: true,
    desc: { true: "Chunky, like everything else here.", false: "Swap your cursor for a chunkier one." } },
  { key: "sound", icon: "speaker", ic: "#ea4a3b", title: "Click sounds", type: "toggle",
    desc: { true: "Bleep.", false: "Tiny bleeps on every click." } },
  { key: "productivity", icon: "sliders", ic: "#f07a2e", title: "Productivity", type: "range" },
];

function productivityText(v) {
  if (v <= 0) return "Vacation mode. This does nothing.";
  if (v < 35) return "Barely trying. This does nothing.";
  if (v < 70) return "Looking busy. This does nothing.";
  if (v < 100) return "Very busy. Still does nothing.";
  return "Maximum output. It does nothing.";
}

let group = null;
function render() {
  if (!group) return;
  const fineOnly = !matchMedia("(hover: hover) and (pointer: fine)").matches;
  group.innerHTML = ROWS.filter((r) => !(r.fine && fineOnly)).map((r) => {
    const v = prefs[r.key];
    let ctrl = "", desc = "";
    if (r.type === "seg") {
      desc = r.desc[v];
      ctrl = `<div class="seg" role="radiogroup" aria-label="${r.title}">${r.opts.map(([k, l]) =>
        `<button role="radio" aria-checked="${k === v}" class="seg-btn${k === v ? " is-on" : ""}" data-k="${r.key}" data-v="${k}">${l}</button>`).join("")}</div>`;
    } else if (r.type === "avatar") {
      desc = r.desc[v];
      ctrl = `<div class="ava-pick" role="radiogroup" aria-label="Avatar">${r.opts.map(([k, l]) => {
        const art = k === "me" ? `<img src="assets/head.png" alt="" class="sprite" />` : pixelArt(AVATARS[k].rows, AVATARS[k].pal);
        return `<button role="radio" aria-checked="${k === v}" aria-label="${l}" class="ava${k === v ? " is-on" : ""}" data-k="avatar" data-v="${k}">${art}<span class="mono">${l}</span></button>`;
      }).join("")}</div>`;
    } else if (r.type === "toggle") {
      desc = r.desc[String(!!v)];
      ctrl = `<button class="px-toggle${v ? " is-on" : ""}" role="switch" aria-checked="${!!v}" aria-label="${r.title}" data-k="${r.key}" data-toggle><span></span></button>`;
    } else if (r.type === "range") {
      desc = productivityText(v);
      ctrl = `<input class="px-range" type="range" min="0" max="100" step="1" value="${v}" aria-label="Productivity" data-k="${r.key}" style="--p:${v}%" />`;
    }
    return `<div class="set-row${r.type === "avatar" ? " set-row-wide" : ""}">
      <span class="set-ico" style="--ic:${r.ic}" data-glyph="${r.icon}"></span>
      <div class="set-text"><b>${r.title}</b><span data-desc="${r.key}">${desc}</span></div>
      ${ctrl}
    </div>`;
  }).join("");
  paintGlyphs(group);
}

export function initSettings() {
  apply();
  setInterval(() => { if (prefs.theme === "auto") apply(); }, 60000);
  group = document.getElementById("set-group");
  if (!group) return;
  render();
  paintGlyphs(document.getElementById("settings"));

  group.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (!b || b.tagName === "INPUT") return;
    const k = b.dataset.k;
    if (b.hasAttribute("data-toggle")) set(k, !prefs[k]);
    else if (b.dataset.v !== prefs[k]) set(k, b.dataset.v);
    const again = group.querySelector(`[data-k="${k}"]${b.dataset.v ? `[data-v="${b.dataset.v}"]` : ""}`);
    if (again) again.focus({ preventScroll: true });
  });
  group.addEventListener("input", (e) => {
    const r = e.target.closest(".px-range");
    if (!r) return;
    const v = +r.value;
    r.style.setProperty("--p", v + "%");
    group.querySelector('[data-desc="productivity"]').textContent = productivityText(v);
    prefs = { ...prefs, productivity: v };
    store.set("settings", prefs);
  });

  // software update: there is only ever one version
  const upd = document.getElementById("upd-btn"), updMsg = document.getElementById("upd-msg");
  upd.addEventListener("click", () => {
    upd.disabled = true;
    updMsg.textContent = "Checking…";
    setTimeout(() => {
      updMsg.textContent = "You're on the latest version. It's also the only version.";
      upd.disabled = false;
    }, 1400);
  });

  // factory reset with a progress bar that takes itself very seriously
  const rb = document.getElementById("reset-btn"), rmsg = document.getElementById("reset-msg");
  const bar = document.getElementById("reset-bar"), fill = bar.querySelector("span");
  rb.addEventListener("click", () => {
    rb.disabled = true;
    bar.hidden = false;
    const steps = ["Reticulating pixels…", "Refolding folders…", "Asking the cat to leave…", "Done. Good as new."];
    let i = 0;
    fill.style.width = "0%";
    const go = () => {
      rmsg.textContent = steps[i];
      fill.style.width = ((i + 1) / steps.length) * 100 + "%";
      i++;
      if (i < steps.length) setTimeout(go, 650);
      else setTimeout(() => {
        prefs = { ...DEFAULTS };
        store.set("settings", prefs);
        apply();
        render();
        rb.disabled = false;
        setTimeout(() => { bar.hidden = true; rmsg.textContent = "Put every setting back the way it was."; }, 1600);
      }, 500);
    };
    go();
  });
}
