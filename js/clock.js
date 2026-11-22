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

// x, y, radius, teeth, colour. Same tooth size everywhere so they look like they mesh.
const GEARS = [
  { x: 44, y: 50, r: 40, n: 14, c: "#f3b52e", dir: 1 },
  { x: 206, y: 40, r: 23, n: 8, c: "#3e7bf0", dir: -1 },
  { x: 204, y: 198, r: 31, n: 11, c: "#ea4a3b", dir: -1 },
  { x: 34, y: 204, r: 18, n: 6, c: "#2f9e5b", dir: 1 },
];

function buildGears() {
  const g = $("#gears");
  GEARS.forEach((d) => {
    const grp = document.createElementNS(NS, "g");
    grp.setAttribute("transform", `translate(${d.x} ${d.y})`);
    const spin = document.createElementNS(NS, "g");
    spin.innerHTML = `
      <path d="${gearPath(d.r, d.n, 8)}" fill="${d.c}" stroke="#161614" stroke-width="3" stroke-linejoin="round"/>
      <circle r="${d.r * 0.55}" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="3"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${-3}" y="${-d.r * 0.75}" width="6" height="${d.r * 0.3}" fill="rgba(0,0,0,.2)" transform="rotate(${i * 90})"/>`).join("")}
      <circle r="${Math.max(5, d.r * 0.24)}" fill="#161614"/>
      <circle r="${Math.max(2.5, d.r * 0.12)}" fill="${d.c}"/>`;
    grp.appendChild(spin);
    g.appendChild(grp);
    d.el = spin;
  });
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
  let introStart = 0, gearSpin = 0, lastT = 0;
  const INTRO = reduced ? 1 : 1400;

  const ease = (t) => 1 - Math.pow(1 - t, 3);

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

    // gears: race during the wind-up, then tick along with the seconds
    const dt = Math.min(64, t - (lastT || t));
    lastT = t;
    const boost = p < 1 ? (1 - e) * 1.4 : 0;
    gearSpin += dt * (0.012 + boost);
    const tick = now.getSeconds() + (now.getMilliseconds() < 160 ? now.getMilliseconds() / 160 : 1);
    GEARS.forEach((g) => {
      const ratio = 14 / g.n; // smaller gears turn faster
      const ang = g.dir * ratio * (gearSpin + tick * 6);
      g.el.setAttribute("transform", `rotate(${ang.toFixed(2)})`);
    });

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
