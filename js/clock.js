// Analog gear clock that pops out of the top-bar clock.
// Desktop: hover to peek, click to pin. Touch: tap to open, X (or tap outside) to close.

const $ = (s) => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
const C = 120; // face centre
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

// Chunky, blocky gear outline (square teeth) — reads like a toy-brick gear.
function gearPath(r, teeth, depth) {
  const pts = [];
  const step = (Math.PI * 2) / teeth;
  const ro = r + depth;
  const arc = (rad, a0, a1, n) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([Math.cos(a) * rad, Math.sin(a) * rad]);
    }
  };
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    arc(r, a, a + step * 0.5, 3);
    arc(ro, a + step * 0.5, a + step, 2);
  }
  return "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
}

// A small, honest gear train. Every gear moves on the escapement's tick, and
// meshing gears turn the opposite way at the ratio of their teeth.
//   seconds wheel (yellow): one turn a minute, its red tooth tracks the second hand
//   pinion (green): driven by the seconds wheel, 14:6 faster
//   escape wheel (red): jumps one tooth per tick
//   pinion (blue): driven by the escape wheel, 11:8 faster
const DEPTH = 8;
const GEARS = [
  { id: "sec", x: 44, y: 50, r: 40, n: 14, c: "#f3b52e" },
  { id: "p1", r: 18, n: 6, c: "#2f9e5b", mesh: "sec", at: -25 },
  { id: "esc", x: 204, y: 198, r: 31, n: 11, c: "#ea4a3b" },
  { id: "p2", r: 23, n: 8, c: "#3e7bf0", mesh: "esc", at: 155 },
];
const byId = Object.fromEntries(GEARS.map((g) => [g.id, g]));
GEARS.forEach((g) => {
  if (!g.mesh) return;
  const m = byId[g.mesh];
  const a = (g.at * Math.PI) / 180, d = m.r + g.r + DEPTH;
  g.x = m.x + Math.cos(a) * d;
  g.y = m.y + Math.sin(a) * d;
  // phase so a tooth of the driver sits in a gap of this gear
  const s1 = 360 / m.n, s2 = 360 / g.n;
  g.ratio = -m.n / g.n;
  g.phase = (g.at + 180 - 0.25 * s2) + (g.at - 0.75 * s1) * (m.n / g.n);
  m.phase = m.phase || 0;
});

let balance = null, dayNight = null;

function buildGears() {
  const g = $("#gears");
  GEARS.forEach((d) => {
    const grp = document.createElementNS(NS, "g");
    grp.setAttribute("transform", `translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})`);
    const spin = document.createElementNS(NS, "g");
    spin.innerHTML = `
      <path d="${gearPath(d.r, d.n, DEPTH)}" fill="${d.c}" stroke="#161614" stroke-width="3" stroke-linejoin="round"/>
      <circle r="${d.r * 0.55}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${-3}" y="${-d.r * 0.75}" width="6" height="${d.r * 0.3}" fill="rgba(0,0,0,.2)" transform="rotate(${i * 90})"/>`).join("")}
      <circle r="${Math.max(5, d.r * 0.24)}" fill="#161614"/>
      <circle r="${Math.max(2.5, d.r * 0.12)}" fill="${d.c}"/>
      ${d.id === "sec" ? `<rect x="-3" y="${-d.r + 1}" width="6" height="${d.r * 0.5}" fill="#ea4a3b" stroke="#161614" stroke-width="1.5"/>` : ""}`;
    grp.appendChild(spin);
    g.appendChild(grp);
    d.el = spin;
  });

  // balance wheel (top right): swings through zero on every tick, the clock's heartbeat
  const bal = document.createElementNS(NS, "g");
  bal.setAttribute("transform", "translate(208 34)");
  let spiral = "M0 0";
  for (let i = 1; i <= 36; i++) {
    const a = i * 0.45, rr = 1.5 + i * 0.3;
    spiral += `L${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`;
  }
  bal.innerHTML = `
    <circle r="27" fill="#161614" transform="translate(3 3)"/>
    <circle r="27" fill="#ecebe5" stroke="#161614" stroke-width="3"/>
    <g class="bal-swing">
      <circle r="20" fill="none" stroke="#b9b6ae" stroke-width="6"/>
      <circle r="20" fill="none" stroke="#161614" stroke-width="1.5"/>
      <circle r="23" fill="none" stroke="#161614" stroke-width="1.5"/>
      <circle r="17" fill="none" stroke="#161614" stroke-width="1.5"/>
      ${[0, 120, 240].map((a) => `<rect x="-2" y="-18" width="4" height="16" fill="#161614" transform="rotate(${a})"/>`).join("")}
      ${[60, 180, 300].map((a) => `<rect x="-3.5" y="-24" width="7" height="7" fill="#f3b52e" stroke="#161614" stroke-width="1.5" transform="rotate(${a})"/>`).join("")}
    </g>
    <path class="bal-spring" d="${spiral}" fill="none" stroke="#3e7bf0" stroke-width="1.5"/>
    <circle r="4" fill="#ea4a3b" stroke="#161614" stroke-width="1.5"/>`;
  g.appendChild(bal);
  balance = { swing: bal.querySelector(".bal-swing"), spring: bal.querySelector(".bal-spring") };

  // day/night disc (bottom left): sun on top at noon, moon on top at midnight
  const dn = document.createElementNS(NS, "g");
  dn.setAttribute("transform", "translate(32 208)");
  const px = (cx, cy, rows, col) => rows.map((row, j) => [...row].map((ch, i) => ch === "#" ? `<rect x="${cx + i * 3}" y="${cy + j * 3}" width="3.1" height="3.1" fill="${col}"/>` : "").join("")).join("");
  dn.innerHTML = `
    <circle r="27" fill="#161614" transform="translate(3 3)"/>
    <g class="dn-disc">
      <path d="M-26 0A26 26 0 0 1 26 0Z" fill="#8fb8ff"/>
      <path d="M-26 0A26 26 0 0 0 26 0Z" fill="#26304f"/>
      ${px(-6, -20, [".##.", "####", "####", ".##."], "#f3b52e")}
      ${px(-6, 8, [".##.", "##..", "##..", ".##."], "#fffdf7")}
      <rect x="10" y="10" width="3" height="3" fill="#fffdf7"/><rect x="-15" y="15" width="3" height="3" fill="#fffdf7"/>
      <rect x="-26" y="-1.5" width="52" height="3" fill="#161614"/>
      <circle r="26" fill="none" stroke="#161614" stroke-width="3"/>
    </g>
    <path d="M-5 -34h10l-5 8z" fill="#ea4a3b" stroke="#161614" stroke-width="1.5"/>`;
  g.appendChild(dn);
  dayNight = dn.querySelector(".dn-disc");
}

function buildTicks() {
  const g = $("#ticks");
  let html = "";
  for (let i = 0; i < 12; i++) {
    const major = i % 3 === 0;
    const w = major ? 9 : 6, h = major ? 14 : 8;
    html += `<rect x="${C - w / 2}" y="${C - 72}" width="${w}" height="${h}" fill="${major ? "#161614" : "#9a978f"}" transform="rotate(${i * 30} ${C} ${C})"/>`;
  }
  g.innerHTML = html;
}

export function initClock() {
  const wrap = $("#clock-wrap");
  const btn = $("#clock-btn");
  const pop = $("#clockpop");
  const hands = { h: $("#hand-h"), m: $("#hand-m"), s: $("#hand-s") };
  const digital = $("#clock-digital");
  const dateEl = $("#clock-date");
  buildGears();
  buildTicks();

  let open = false, pinned = false, raf = 0, hideTimer = 0;
  let introStart = 0, lastT = 0;
  const INTRO = reduced ? 1 : 1400;

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const backOut = (t) => { const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function targetAngles(now) {
    const ms = now.getMilliseconds();
    const s = now.getSeconds();
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    // second hand ticks with a tiny mechanical settle at the start of each second
    const settle = ms < 120 ? Math.sin((ms / 120) * Math.PI) * 1.6 : 0;
    return { h: h * 30, m: m * 6, s: s * 6 + settle };
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    const now = new Date();
    const tgt = targetAngles(now);
    const p = Math.min(1, (t - introStart) / INTRO);
    const e = ease(p);
    // intro: hands wind up from 12 (with an extra lap) to the real time
    const a = {
      h: tgt.h * e,
      m: (tgt.m + 360) * e - (p < 1 ? 0 : 360),
      s: (tgt.s + 720) * e - (p < 1 ? 0 : 720),
    };
    hands.h.setAttribute("transform", `rotate(${a.h} ${C} ${C})`);
    hands.m.setAttribute("transform", `rotate(${a.m} ${C} ${C})`);
    hands.s.setAttribute("transform", `rotate(${a.s} ${C} ${C})`);

    // gears: race during the wind-up, then move only on the tick
    const dt = Math.min(64, t - (lastT || t));
    lastT = t;
    const wind = (1 - e) * 720; // wind-up: gears spin into place with the hands
    const ms = now.getMilliseconds();
    // a tick that snaps forward and settles, like a real escapement
    const snap = ms < 140 ? backOut(ms / 140) : 1;
    const secs = now.getSeconds() + snap;            // 0..60 in steps
    const ticks = Math.floor(now.getTime() / 1000) - 1 + snap; // ever-increasing
    const ang = {
      sec: secs * 6 - wind,
      esc: (ticks % 11) * (360 / 11) - wind * 1.6,
    };
    ang.p1 = ang.sec * byId.p1.ratio + byId.p1.phase;
    ang.p2 = ang.esc * byId.p2.ratio + byId.p2.phase;
    GEARS.forEach((g) => g.el.setAttribute("transform", `rotate(${ang[g.id].toFixed(2)})`));

    // balance: swings through zero on every tick
    const ph = (now.getTime() % 2000) / 2000;
    const swing = Math.sin(ph * Math.PI * 2) * 150 * (p < 1 ? 1 + (1 - e) : 1);
    balance.swing.setAttribute("transform", `rotate(${swing.toFixed(1)})`);
    balance.spring.setAttribute("transform", `rotate(${(swing * 0.25).toFixed(1)}) scale(${(1 + Math.cos(ph * Math.PI * 2) * 0.06).toFixed(3)})`);

    // day / night disc
    const hrs = now.getHours() + now.getMinutes() / 60;
    dayNight.setAttribute("transform", `rotate(${((hrs - 12) * 15 * e).toFixed(2)})`);

    digital.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  }

  function show() {
    clearTimeout(hideTimer);
    if (open) return;
    open = true;
    pop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    dateEl.textContent = new Date().toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }).toLowerCase();
    pop.animate(
      [{ opacity: 0, transform: "translateY(-6px) scale(.92)" }, { opacity: 1, transform: "none" }],
      { duration: reduced ? 1 : 260, easing: "cubic-bezier(.2,.9,.25,1.1)" }
    );
    introStart = performance.now();
    lastT = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function hide() {
    if (!open) return;
    open = false;
    pinned = false;
    btn.setAttribute("aria-expanded", "false");
    const anim = pop.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-6px) scale(.95)" }],
      { duration: reduced ? 1 : 160, easing: "ease-in" }
    );
    anim.onfinish = () => { if (!open) { pop.hidden = true; cancelAnimationFrame(raf); } };
  }

  if (canHover) {
    wrap.addEventListener("mouseenter", show);
    wrap.addEventListener("mouseleave", () => { if (!pinned) hideTimer = setTimeout(hide, 220); });
  }
  btn.addEventListener("click", () => {
    if (!open) { show(); pinned = true; }
    else if (canHover && !pinned) pinned = true; // hovering already showed it; click pins it
    else hide();
  });
  $("#clockpop-x").addEventListener("click", (e) => { e.stopPropagation(); hide(); btn.focus({ preventScroll: true }); });
  document.addEventListener("pointerdown", (e) => { if (open && !wrap.contains(e.target)) hide(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && open) hide(); });
}
