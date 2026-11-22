// Roulette, small edition: pockets 0–12.
// Straight number pays 11:1. Red/black, odd/even, 1–6/7–12 pay 1:1 and lose on 0.
// Shares the chip balance with Blackjack.
import { store } from "./store.js";

const ORDER = [0, 7, 2, 11, 4, 9, 6, 1, 10, 3, 12, 5, 8]; // wheel order, clockwise
const RED = new Set([1, 3, 5, 7, 9, 12]);
const colorOf = (n) => (n === 0 ? "green" : RED.has(n) ? "red" : "black");
const FILL = { green: "#2f9e5b", red: "#d6402f", black: "#1d1d1b" };
const START = 500;
const NS = "http://www.w3.org/2000/svg";

function sector(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1), [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
}

function wheelSVG() {
  const C = 110, step = (Math.PI * 2) / ORDER.length;
  let pockets = "";
  ORDER.forEach((n, i) => {
    // pocket i is centred at the top (−90°) when the wheel is at rotation 0
    const mid = -Math.PI / 2 + i * step;
    const a0 = mid - step / 2, a1 = mid + step / 2;
    const tx = C + 86 * Math.cos(mid), ty = C + 86 * Math.sin(mid);
    pockets += `<path d="${sector(C, C, 70, 100, a0, a1)}" fill="${FILL[colorOf(n)]}" stroke="#fffdf7" stroke-width="1.5"/>
      <text x="${tx}" y="${ty}" fill="#fffdf7" font-family="Silkscreen, monospace" font-size="13" text-anchor="middle" dominant-baseline="central" transform="rotate(${(mid * 180) / Math.PI + 90} ${tx} ${ty})">${n}</text>`;
  });
  return `
  <svg class="rl-svg" viewBox="0 0 220 230" aria-hidden="true">
    <circle cx="115" cy="115" r="106" fill="#161614"/>
    <g class="rl-wheel" style="transform-origin:110px 110px">
      <circle cx="110" cy="110" r="106" fill="#8a5a2b" stroke="#161614" stroke-width="4"/>
      ${pockets}
      <circle cx="110" cy="110" r="70" fill="#a8743d" stroke="#161614" stroke-width="3"/>
      <circle cx="110" cy="110" r="56" fill="#c48a4a"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="106" y="58" width="8" height="104" rx="2" fill="#f3b52e" stroke="#161614" stroke-width="2" transform="rotate(${i * 45} 110 110)"/>`).join("")}
      <circle cx="110" cy="110" r="13" fill="#f3b52e" stroke="#161614" stroke-width="3"/>
      <circle cx="110" cy="110" r="5" fill="#161614"/>
    </g>
    <g class="rl-ball" style="transform-origin:110px 110px">
      <circle cx="110" cy="46" r="6" fill="#fffdf7" stroke="#161614" stroke-width="2"/>
    </g>
    <path d="M103 0h14v6h-3v6h-8v-6h-3z" fill="#161614"/>
  </svg>`;
}

export function mount(root) {
  root.innerHTML = `
    <div class="rl">
      <div class="g-hud">
        <div class="g-stat"><b data-k="bank">0</b><span>chips</span></div>
        <div class="g-stat"><b data-k="bet">0</b><span>on table</span></div>
        <div class="g-stat"><b data-k="last">–</b><span>last</span></div>
      </div>
      <div class="rl-top">
        <div class="rl-wheel-box">${wheelSVG()}</div>
        <div class="rl-hist" aria-label="Recent results"></div>
      </div>
      <p class="g-msg" aria-live="polite">Pick a chip, tap where it goes.</p>
      <div class="rl-board">
        <button class="rl-cell rl-zero green" data-bet="n:0">0</button>
        ${[3, 6, 9, 12, 2, 5, 8, 11, 1, 4, 7, 10].map((n) => `<button class="rl-cell ${colorOf(n)}" data-bet="n:${n}">${n}</button>`).join("")}
      </div>
      <div class="rl-outside">
        <button class="rl-cell" data-bet="low">1–6</button>
        <button class="rl-cell" data-bet="even">even</button>
        <button class="rl-cell red" data-bet="red">red</button>
        <button class="rl-cell black" data-bet="black">black</button>
        <button class="rl-cell" data-bet="odd">odd</button>
        <button class="rl-cell" data-bet="high">7–12</button>
      </div>
      <div class="bj-bets">
        <button class="chip-btn sel-chip" style="--cc:#3e7bf0" data-chip="10">10</button>
        <button class="chip-btn" style="--cc:#2f9e5b" data-chip="25">25</button>
        <button class="chip-btn" style="--cc:#ea4a3b" data-chip="50">50</button>
        <button class="chip-btn" style="--cc:#161614" data-chip="100">100</button>
      </div>
      <div class="g-row">
        <button class="px-btn" data-act="clear">Clear</button>
        <button class="px-btn" data-act="rebet">Rebet</button>
        <button class="px-btn primary" data-act="spin">Spin</button>
      </div>
    </div>`;

  const q = (s) => root.querySelector(s);
  const k = (n) => root.querySelector(`[data-k="${n}"]`);
  const msg = q(".g-msg");
  const wheel = q(".rl-wheel");
  const ball = q(".rl-ball");
  const hist = q(".rl-hist");

  let bank = store.get("bj-bank", START);
  let chip = 10;
  let bets = {};
  let lastBets = null;
  let spinning = false;
  let wheelAngle = 0;
  const results = [];

  const total = () => Object.values(bets).reduce((a, b) => a + b, 0);
  const save = () => store.set("bj-bank", bank);

  function paint() {
    k("bank").textContent = bank;
    k("bet").textContent = total();
    root.querySelectorAll("[data-bet]").forEach((c) => {
      const v = bets[c.dataset.bet];
      let badge = c.querySelector(".rl-chip");
      if (v) {
        if (!badge) { badge = document.createElement("span"); badge.className = "rl-chip"; c.appendChild(badge); }
        badge.textContent = v;
      } else if (badge) badge.remove();
    });
    root.querySelectorAll("[data-chip]").forEach((b) => {
      b.classList.toggle("sel-chip", +b.dataset.chip === chip);
      b.disabled = spinning;
    });
    q('[data-act="spin"]').disabled = spinning || !total();
    q('[data-act="clear"]').disabled = spinning || !total();
    const lastTotal = lastBets ? Object.values(lastBets).reduce((a, b) => a + b, 0) : 0;
    q('[data-act="rebet"]').disabled = spinning || !lastBets || total() > 0 || lastTotal > bank;
  }

  function place(key) {
    if (spinning) return;
    if (chip > bank) { msg.textContent = "Not enough chips for that one."; return; }
    root.querySelectorAll(".rl-hit").forEach((c) => c.classList.remove("rl-hit"));
    bank -= chip;
    bets[key] = (bets[key] || 0) + chip;
    msg.textContent = `${total()} on the table. Spin when ready.`;
    paint();
  }

  function clear() { bank += total(); bets = {}; msg.textContent = "Table cleared."; paint(); }
  function rebet() {
    if (!lastBets) return;
    const t = Object.values(lastBets).reduce((a, b) => a + b, 0);
    if (t > bank || total()) return;
    bets = { ...lastBets }; bank -= t;
    msg.textContent = "Same again.";
    paint();
  }

  function payout(key, n) {
    if (key.startsWith("n:")) return +key.slice(2) === n ? 11 : -1;
    if (n === 0) return -1;
    const ok = {
      red: RED.has(n), black: !RED.has(n), odd: n % 2 === 1, even: n % 2 === 0, low: n <= 6, high: n >= 7,
    }[key];
    return ok ? 1 : -1;
  }

  function spin() {
    if (spinning || !total()) return;
    spinning = true;
    paint();
    msg.textContent = "No more bets…";
    const n = ORDER[crypto.getRandomValues(new Uint32Array(1))[0] % ORDER.length];
    const idx = ORDER.indexOf(n);
    const step = 360 / ORDER.length;
    // land pocket idx under the pointer at the top
    const current = ((wheelAngle % 360) + 360) % 360;
    const target = (360 - idx * step) % 360;
    const delta = ((target - current + 360) % 360) + 360 * 4;
    const from = wheelAngle;
    wheelAngle += delta;
    const dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 3600;
    wheel.animate(
      [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${wheelAngle}deg)` }],
      { duration: dur, easing: "cubic-bezier(.15,.6,.2,1)", fill: "forwards" }
    );
    // ball runs the other way, then drops into the pocket at the top
    ball.animate(
      [
        { transform: "rotate(0deg) translateY(-12px)" },
        { transform: "rotate(-200deg) translateY(0px)", offset: 0.1 },
        { transform: "rotate(-1440deg) translateY(0px)", offset: 0.7 },
        { transform: "rotate(-1800deg) translateY(-12px)" },
      ],
      { duration: dur, easing: "cubic-bezier(.2,.5,.3,1)", fill: "forwards" }
    ).onfinish = () => settle(n);
  }

  function settle(n) {
    let back = 0, wonAny = false;
    for (const [key, amt] of Object.entries(bets)) {
      const m = payout(key, n);
      if (m > 0) { back += amt * (m + 1); wonAny = true; }
    }
    const staked = total();
    bank += back;
    lastBets = bets;
    bets = {};
    const net = back - staked;
    const name = `${n} ${colorOf(n)}`;
    let text;
    if (net > 0) text = `${name}. +${net}`;
    else if (net === 0 && wonAny) text = `${name}. Broke even.`;
    else if (wonAny) text = `${name}. ${back} back, down ${-net}.`;
    else text = `${name}. House wins.`;
    if (bank <= 0) { bank = START; text += " Out of chips. Here's 500 more."; }
    msg.textContent = text;
    k("last").textContent = n;
    root.querySelectorAll(".rl-hit").forEach((c) => c.classList.remove("rl-hit"));
    const cell = root.querySelector(`[data-bet="n:${n}"]`);
    if (cell) cell.classList.add("rl-hit");
    results.unshift(n);
    results.length = Math.min(results.length, 8);
    hist.innerHTML = results.map((r) => `<i class="${colorOf(r)}">${r}</i>`).join("");
    spinning = false;
    save();
    paint();
  }

  const box = q(".rl");
  box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bet]");
    if (b) return place(b.dataset.bet);
    const c = e.target.closest("[data-chip]");
    if (c) { chip = +c.dataset.chip; paint(); return; }
    const a = e.target.closest("[data-act]");
    if (a) ({ clear, rebet, spin })[a.dataset.act]();
  });
  const onKey = (e) => {
    if (e.key === " " && !(e.target.closest && e.target.closest("button"))) { e.preventDefault(); spin(); }
  };
  addEventListener("keydown", onKey);

  k("last").textContent = "–";
  ball.style.transform = "translateY(-12px)"; // resting in the 0 pocket
  paint();

  return () => {
    // chips left on the table go back to the bank
    if (!spinning && total()) bank += total();
    save();
    removeEventListener("keydown", onKey);
  };
}
