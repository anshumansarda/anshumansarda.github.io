// Liquid glass refraction.
// Chromium can run an SVG filter as a backdrop-filter, so there we build a
// displacement map that bends the backdrop near the rim of each glass shape.
// Other browsers keep the CSS blur + highlight fallback from style.css.

const isChromium = !!(navigator.userAgentData && navigator.userAgentData.brands &&
  navigator.userAgentData.brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand)));

const KINDS = {
  folder: { radius: 6, bezel: 14, scale: 34, blur: 2.5, sat: 1.7 },
  win: { radius: 26, bezel: 30, scale: 70, blur: 12, sat: 1.8 },
  soc: { radius: 26, bezel: 16, scale: 26, blur: 3, sat: 1.8 },
};

const made = new Map(); // kind -> "WxH"

function mapURL(w, h, radius, bezel) {
  // render at reduced resolution; feImage stretches it back up
  const k = Math.min(1, 320 / Math.max(w, h));
  const cw = Math.max(8, Math.round(w * k));
  const ch = Math.max(8, Math.round(h * k));
  const r = radius * k;
  const bz = Math.max(2, bezel * k);
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(cw, ch);
  const hw = cw / 2, hh = ch / 2;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const sdf = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
      const inside = -sdf;
      let nx = 0, ny = 0, s = 0;
      if (inside < bz && inside > -1) {
        const t = 1 - Math.max(0, inside) / bz;
        s = t * t * (3 - 2 * t); // smoothstep
        if (qx > 0 && qy > 0) {
          const l = Math.hypot(qx, qy) || 1;
          nx = (qx / l) * Math.sign(px);
          ny = (qy / l) * Math.sign(py);
        } else if (qx > qy) nx = Math.sign(px);
        else ny = Math.sign(py);
      }
      const i = (y * cw + x) * 4;
      img.data[i] = 128 + nx * s * 127;
      img.data[i + 1] = 128 + ny * s * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function ensureFilter(kind, w, h) {
  const key = `${Math.round(w)}x${Math.round(h)}`;
  if (made.get(kind) === key) return;
  made.set(kind, key);
  const cfg = KINDS[kind];
  const id = `lq-${kind}`;
  const svg = document.getElementById("fx");
  let f = document.getElementById(id);
  if (!f) {
    f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    f.id = id;
    f.setAttribute("color-interpolation-filters", "sRGB");
    svg.appendChild(f);
  }
  f.setAttribute("x", "0");
  f.setAttribute("y", "0");
  f.setAttribute("width", "100%");
  f.setAttribute("height", "100%");
  f.innerHTML = `
    <feImage href="${mapURL(w, h, cfg.radius, cfg.bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="${cfg.blur}" result="blur"/>
    <feDisplacementMap in="blur" in2="map" scale="${cfg.scale}" xChannelSelector="R" yChannelSelector="G" result="bent"/>
    <feColorMatrix in="bent" type="saturate" values="${cfg.sat}"/>`;
}

export function initLiquid() {
  if (!isChromium) return;
  document.documentElement.classList.add("lq-on");
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const el = e.target;
      const kind = el.dataset.lq;
      const { width, height } = e.contentRect;
      if (!KINDS[kind] || width < 4 || height < 4) continue;
      // social pills change width on hover; one square map stretched is fine
      if (kind === "soc" && made.has("soc")) { el.style.backdropFilter = "url(#lq-soc)"; continue; }
      // border-box size including padding
      const w = el.offsetWidth, h = el.offsetHeight;
      ensureFilter(kind, w, h);
      el.style.backdropFilter = `url(#lq-${kind})`;
    }
  });
  document.querySelectorAll("[data-lq]").forEach((el) => ro.observe(el));
}
