// Pixel globe for the Map folder.
// Countries are rasterised once into an equirectangular lookup grid; every frame
// each canvas pixel is inverse-projected (orthographic) and coloured from it.
// The canvas is tiny and scaled up with crisp pixels, so it matches the rest of the site.
import { TRIPS } from "./trips.js";
import { landmark } from "./landmarks.js";
import { speed } from "./settings.js";

const N = 200;           // canvas resolution
const R = 94;            // globe radius in canvas pixels
const CX = N / 2;
const GW = 1440, GH = 720; // lookup grid (0.25°)
const D2R = Math.PI / 180;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const PAL = {
  day: {
    ocean: [[113, 160, 247], [74, 132, 240], [52, 104, 210]],
    land: [[255, 253, 247], [236, 235, 229], [206, 203, 194]],
    been: [[246, 196, 74], [243, 181, 46], [205, 142, 18]],
    pick: [[240, 104, 88], [234, 74, 59], [190, 50, 38]],
    grid: [143, 181, 250],
    coast: [22, 22, 20],
    border: [150, 146, 136],
  },
  night: {
    ocean: [[40, 52, 92], [30, 40, 74], [20, 27, 52]],
    land: [[92, 96, 116], [72, 76, 94], [52, 55, 70]],
    been: [[255, 214, 102], [243, 181, 46], [190, 132, 20]],
    pick: [[255, 128, 110], [234, 74, 59], [170, 44, 34]],
    grid: [52, 66, 112],
    coast: [10, 10, 14],
    border: [40, 42, 54],
  },
};

/* ---------- topojson → rings ---------- */
export function decode(topo) {
  const { scale, translate } = topo.transform;
  const arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
  const ring = (ids) => {
    const pts = [];
    ids.forEach((i, k) => {
      const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      a.forEach((p, j) => { if (k === 0 || j > 0) pts.push(p); });
    });
    return pts;
  };
  return topo.objects.countries.geometries.map((g) => {
    let rings = [];
    if (g.type === "Polygon") rings = g.arcs.map(ring);
    else if (g.type === "MultiPolygon") g.arcs.forEach((poly) => poly.forEach((r) => rings.push(ring(r))));
    return { id: +g.id, name: g.properties.name, rings };
  });
}

/* ---------- scanline fill into the lookup grid (no antialiasing) ---------- */
export function rasterise(countries) {
  const grid = new Uint8Array(GW * GH);
  countries.forEach((c, ci) => {
    const edges = [];
    let y0 = Infinity, y1 = -Infinity;
    c.rings.forEach((r) => {
      // unwrap longitudes so rings that cross the date line stay continuous
      let prev = r[0][0], off = 0;
      const pts = r.map(([lon, lat]) => {
        if (lon - prev > 180) off -= 360;
        else if (lon - prev < -180) off += 360;
        prev = lon;
        return [((lon + off + 180) / 360) * GW, ((90 - lat) / 180) * GH];
      });
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if (ay === by) continue;
        edges.push([ax, ay, bx, by]);
        y0 = Math.min(y0, ay, by); y1 = Math.max(y1, ay, by);
      }
    });
    const xs = [];
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(GH - 1, Math.ceil(y1)); y++) {
      const sy = y + 0.5;
      xs.length = 0;
      for (const [ax, ay, bx, by] of edges) {
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) * (bx - ax)) / (by - ay));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.ceil(xs[k] - 0.5), to = Math.min(from + GW - 1, Math.floor(xs[k + 1] - 0.5));
        const row = y * GW;
        for (let x = from; x <= to; x++) grid[row + (((x % GW) + GW) % GW)] = ci + 1;
      }
    }
  });
  // the data stops short of the pole; cap it with Antarctica
  const ant = countries.findIndex((c) => c.name === "Antarctica");
  if (ant >= 0) grid.fill(ant + 1, Math.floor(((90 + 84) / 180) * GH) * GW);
  return grid;
}

export function initGlobe() {
  const box = document.getElementById("globe-box");
  const canvas = document.getElementById("globe");
  const pinsEl = document.getElementById("globe-pins");
  const card = document.getElementById("trip-card");
  const win = document.getElementById("win-map");
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(N, N);
  const px = img.data;

  // per-pixel constants: view-space position on the sphere and lighting
  const P = N * N;
  const vX = new Float32Array(P), vY = new Float32Array(P), vZ = new Float32Array(P);
  const band = new Uint8Array(P);       // 0 lit, 1 mid, 2 shade
  const kind = new Uint8Array(P);       // 0 outside, 1 sphere, 2 rim
  const L = [-0.48, 0.58, 0.66];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const nx = (x + 0.5 - CX) / R, ny = -(y + 0.5 - CX) / R;
      const d2 = nx * nx + ny * ny;
      if (d2 <= 1) {
        const z = Math.sqrt(1 - d2);
        vX[i] = nx; vY[i] = ny; vZ[i] = z;
        kind[i] = 1;
        const lum = nx * L[0] + ny * L[1] + z * L[2];
        band[i] = lum > 0.62 ? 0 : lum > 0.22 ? 1 : 2;
      } else if (Math.sqrt(d2) <= 1 + 3 / R) kind[i] = 2;
    }
  }
  const cell = new Int32Array(P);       // which grid cell each pixel shows this frame

  let countries = [], grid = null;
  const visited = new Uint8Array(256);
  let picked = 0; // country index + 1 of the selected trip

  let lam = -20, phi = 18;               // view centre (degrees)
  let vLam = 0, vPhi = 0;
  let dragging = false, lastX = 0, lastY = 0, idleUntil = 0;
  let hovering = false, running = false, raf = 0, lastT = 0;
  let tween = null;
  let activeTrip = -1;

  function draw() {
    const theme = document.documentElement.dataset.theme === "night" ? PAL.night : PAL.day;
    const sl = Math.sin(phi * D2R), cl = Math.cos(phi * D2R);
    // pass 1: which grid cell does each pixel land on
    for (let i = 0; i < P; i++) {
      if (kind[i] !== 1) { cell[i] = -1; continue; }
      const X = vX[i], Y = vY[i], Z = vZ[i];
      const lat = Math.asin(Math.max(-1, Math.min(1, Z * sl + Y * cl)));
      let lon = lam * D2R + Math.atan2(X, Z * cl - Y * sl);
      lon = ((lon / D2R + 540) % 360) - 180;
      const gx = Math.min(GW - 1, Math.floor(((lon + 180) / 360) * GW));
      const gy = Math.min(GH - 1, Math.floor(((90 - lat / D2R) / 180) * GH));
      cell[i] = gy * GW + gx;
    }
    // pass 2: colour
    for (let i = 0; i < P; i++) {
      const o = i * 4;
      if (kind[i] === 0) { px[o + 3] = 0; continue; }
      if (kind[i] === 2) { px[o] = 22; px[o + 1] = 22; px[o + 2] = 20; px[o + 3] = 255; continue; }
      const id = grid ? grid[cell[i]] : 0;
      let c;
      const right = (i % N) < N - 1 && kind[i + 1] === 1 ? (grid ? grid[cell[i + 1]] : 0) : id;
      const down = i + N < P && kind[i + N] === 1 ? (grid ? grid[cell[i + N]] : 0) : id;
      if (id === 0) {
        if ((right !== 0 || down !== 0)) c = theme.coast;
        else {
          // faint graticule every 30 degrees
          const g = cell[i], gx = g % GW, gy = (g / GW) | 0;
          const onGrid = gx % (GW / 12) < 2 || gy % (GH / 6) < 2;
          c = onGrid && band[i] < 2 ? theme.grid : theme.ocean[band[i]];
          if (band[i] === 2 && ((i % N) + ((i / N) | 0)) % 2 === 0) c = theme.ocean[1]; // dither the shadow edge
        }
      } else {
        if (right === 0 || down === 0) c = theme.coast;
        else if (right !== id || down !== id) c = theme.border;
        else if (id === picked) c = theme.pick[band[i]];
        else if (visited[id]) c = theme.been[band[i]];
        else c = theme.land[band[i]];
      }
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    placePins(sl, cl);
  }

  /* ---------- pins ---------- */
  const pins = TRIPS.map((t, i) => {
    const b = document.createElement("button");
    b.className = "pin";
    b.setAttribute("aria-label", [t.place, t.country, t.when].filter(Boolean).join(", "));
    b.innerHTML = `<span class="pin-head"></span><span class="pin-stick"></span>`;
    b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hovering = true; showCard(i); } });
    b.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hovering = false; if (!card.dataset.pinned) hideCard(); } });
    b.addEventListener("click", (e) => { e.stopPropagation(); focusTrip(i, true); });
    pinsEl.appendChild(b);
    return b;
  });

  function project(t, sl, cl) {
    const la = t.lat * D2R, dl = (t.lon - lam) * D2R;
    const cosc = sl * Math.sin(la) + cl * Math.cos(la) * Math.cos(dl);
    const x = Math.cos(la) * Math.sin(dl);
    const y = cl * Math.sin(la) - sl * Math.cos(la) * Math.cos(dl);
    return { x: CX + x * R, y: CX - y * R, cosc };
  }

  function placePins(sl, cl) {
    TRIPS.forEach((t, i) => {
      const p = project(t, sl, cl);
      const b = pins[i];
      const vis = p.cosc > 0.08;
      b.style.left = (p.x / N) * 100 + "%";
      b.style.top = (p.y / N) * 100 + "%";
      b.style.setProperty("--d", Math.max(0, Math.min(1, p.cosc)).toFixed(3));
      b.classList.toggle("is-back", !vis);
      b.tabIndex = vis ? 0 : -1;
      b.classList.toggle("is-on", i === activeTrip);
      if (i === activeTrip && !card.hidden) positionCard(p);
      if (i === activeTrip && !vis && !tween) hideCard();
    });
  }

  /* ---------- card ---------- */
  function cardHTML(t) {
    const art = t.art && landmark(t.art);
    const photo = t.photo
      ? `<img src="${t.photo}" alt="${t.place || t.country}" loading="lazy" />`
      : art || `<span class="trip-ph"><span data-glyph="globe"></span><small class="mono">photo soon</small></span>`;
    return `<div class="trip-photo">${photo}</div>
      <div class="trip-meta">
        <b class="pixel">${t.country}</b>
        <span class="mono">${[t.place, t.when].filter(Boolean).join(" · ") || "dates soon"}</span>
        ${t.note ? `<p>${t.note}</p>` : ""}
      </div>`;
  }
  function showCard(i) {
    const t = TRIPS[i];
    activeTrip = i;
    picked = countries.findIndex((c) => c.id === t.id) + 1;
    card.innerHTML = cardHTML(t);
    import("./pixel.js").then((m) => m.paintGlyphs(card));
    card.hidden = false;
    if (!running) draw();
  }
  function hideCard() {
    card.hidden = true;
    delete card.dataset.pinned;
    activeTrip = -1;
    picked = 0;
  }
  function positionCard(p) {
    const narrow = matchMedia("(max-width: 640px)").matches;
    if (narrow) { card.style.left = ""; card.style.top = ""; return; }
    const bw = box.offsetWidth;
    const x = (p.x / N) * bw, y = (p.y / N) * bw;
    const right = x < bw * 0.62;
    card.style.left = (right ? x + 22 : x - 22 - card.offsetWidth) + box.offsetLeft + "px";
    card.style.top = Math.max(0, y - 60) + box.offsetTop + "px";
  }

  // spin the globe so a trip faces us, then pin its card open
  function focusTrip(i, pin) {
    const t = TRIPS[i];
    showCard(i);
    if (pin) card.dataset.pinned = "1";
    const from = { lam, phi };
    let dl = ((t.lon - lam + 540) % 360) - 180;
    const to = { lam: lam + dl, phi: Math.max(-50, Math.min(50, t.lat * 0.8)) };
    tween = { from, to, t0: performance.now(), dur: reduced ? 1 : 700 };
    vLam = vPhi = 0;
    idleUntil = performance.now() + 6000;
    if (!running) start();
  }

  /* ---------- trip list ---------- */
  const uniq = new Set(TRIPS.map((t) => t.country));
  document.getElementById("map-count").textContent = `${uniq.size} ${uniq.size === 1 ? "country" : "countries"} so far`;

  /* ---------- drag to spin ---------- */
  box.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".pin")) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    vLam = vPhi = 0; tween = null;
    box.setPointerCapture(e.pointerId);
    box.classList.add("is-drag");
  });
  box.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const k = 180 / Math.PI / ((box.offsetWidth * R) / N); // degrees per css px
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    lam -= dx * k; phi = Math.max(-70, Math.min(70, phi + dy * k));
    vLam = -dx * k; vPhi = dy * k;
    if (!running) draw();
  });
  const endDrag = () => { if (!dragging) return; dragging = false; idleUntil = performance.now() + 2500; box.classList.remove("is-drag"); };
  box.addEventListener("pointerup", endDrag);
  box.addEventListener("pointercancel", endDrag);
  box.addEventListener("click", (e) => { if (!e.target.closest(".pin") && card.dataset.pinned && Math.abs(vLam) < 0.5) hideCard(); });

  /* ---------- loop ---------- */
  function frame(t) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(50, t - (lastT || t)) / 16.67;
    lastT = t;
    if (tween) {
      const p = Math.min(1, (t - tween.t0) / tween.dur);
      const e = 1 - Math.pow(1 - p, 3);
      lam = tween.from.lam + (tween.to.lam - tween.from.lam) * e;
      phi = tween.from.phi + (tween.to.phi - tween.from.phi) * e;
      if (p >= 1) tween = null;
    } else if (!dragging) {
      if (Math.abs(vLam) > 0.01 || Math.abs(vPhi) > 0.01) {
        lam += vLam * dt; phi = Math.max(-70, Math.min(70, phi + vPhi * dt));
        vLam *= Math.pow(0.93, dt); vPhi *= Math.pow(0.93, dt);
      } else if (!hovering && !card.dataset.pinned && t > idleUntil && !reduced) {
        lam += 0.18 * speed() * dt;
        phi += (18 - phi) * 0.01 * dt; // drift back to a nice tilt
      }
    }
    draw();
  }
  function start() {
    if (running) return;
    running = true; lastT = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  new MutationObserver(() => { if (win.hidden) { stop(); hideCard(); } else start(); })
    .observe(win, { attributes: true, attributeFilter: ["hidden"] });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else if (!win.hidden) start(); });

  draw();
  if (!win.hidden) start();

  fetch("assets/data/countries-110m.json")
    .then((r) => r.json())
    .then((topo) => {
      countries = decode(topo);
      grid = rasterise(countries);
      TRIPS.forEach((t) => { const k = countries.findIndex((c) => c.id === t.id); if (k >= 0) visited[k + 1] = 1; });
      draw();
    })
    .catch(() => { /* no map data: the globe still spins as an ocean with pins */ });
}
