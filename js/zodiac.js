// Zodiac wheel for the About folder, with Pisces highlighted at the top.
// It spins in and settles on Pisces each time it comes into view.
import { GLYPHS } from "./pixel.js";

const SIGNS = ["ari", "tau", "gem", "can", "leo", "vir", "lib", "sco", "sag", "cap", "aqu", "pis"];
const C = 120;

function arc(r0, r1, a0, a1) {
  const p = (r, a) => `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(r1, a0)}A${r1} ${r1} 0 0 1 ${p(r1, a1)}L${p(r0, a1)}A${r0} ${r0} 0 0 0 ${p(r0, a0)}Z`;
}

function glyphRects(rows, x, y, size, color) {
  let out = "";
  rows.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch === "#") out += `<rect x="${x + i * size}" y="${y + j * size}" width="${size + 0.05}" height="${size + 0.05}" fill="${color}"/>`;
    });
  });
  return out;
}

export function initZodiac() {
  const box = document.getElementById("zodiac");
  if (!box) return;
  const step = (Math.PI * 2) / 12;
  let sectors = "";
  SIGNS.forEach((s, i) => {
    const mid = -Math.PI / 2 + (i - 11) * step; // Pisces (i = 11) sits at the top
    const a0 = mid - step / 2, a1 = mid + step / 2;
    const isP = s === "pis";
    const fill = isP ? "#3e7bf0" : i % 2 ? "#fffdf7" : "#f1efe7";
    const tx = C + 84 * Math.cos(mid), ty = C + 84 * Math.sin(mid);
    sectors += `<path d="${arc(64, 104, a0, a1)}" fill="${fill}" stroke="#161614" stroke-width="2.5"/>
      <text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" font-family="Silkscreen, monospace" font-size="${isP ? 13 : 11}" fill="${isP ? "#fff" : "#77746d"}"
        text-anchor="middle" dominant-baseline="central" transform="rotate(${((mid * 180) / Math.PI + 90).toFixed(2)} ${tx.toFixed(2)} ${ty.toFixed(2)})">${s}</text>`;
  });
  const g = GLYPHS.pisces; // 14 x 12
  const px = 4;
  const gx = C - (g[0].length * px) / 2, gy = C - (g.length * px) / 2;

  box.innerHTML = `
  <svg class="zodiac" viewBox="0 0 240 244" role="img" aria-label="Zodiac wheel with Pisces highlighted">
    <circle cx="${C + 5}" cy="${C + 5}" r="108" fill="#161614"/>
    <g class="z-wheel">
      <circle cx="${C}" cy="${C}" r="108" fill="#fffdf7" stroke="#161614" stroke-width="4"/>
      ${sectors}
      <circle cx="${C}" cy="${C}" r="64" fill="#e9eefb" stroke="#161614" stroke-width="3"/>
      ${[...Array(24)].map((_, i) => `<rect x="${C - 1.5}" y="${C - 60}" width="3" height="${i % 2 ? 4 : 7}" fill="#9fb4e6" transform="rotate(${i * 15} ${C} ${C})"/>`).join("")}
    </g>
    <circle cx="${C}" cy="${C}" r="40" fill="#3e7bf0" stroke="#161614" stroke-width="3"/>
    <circle cx="${C}" cy="${C}" r="40" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="4" stroke-dasharray="6 6"/>
    ${glyphRects(g, gx, gy, px, "#fff")}
    <path d="M${C - 9} 0h18v6h-4v5h-10v-5h-4z" fill="#f3b52e" stroke="#161614" stroke-width="2"/>
  </svg>`;

  const wheel = box.querySelector(".z-wheel");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      wheel.animate(
        [{ transform: "rotate(-540deg)" }, { transform: "rotate(8deg)", offset: 0.85 }, { transform: "rotate(0deg)" }],
        { duration: 1800, easing: "cubic-bezier(.2,.7,.2,1)" }
      );
    });
  }, { threshold: 0.4 });
  io.observe(box);
}
