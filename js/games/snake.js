// Snake — arrows / WASD, swipe or d-pad on touch. Space pauses.
import { store } from "./store.js";

const N = 18; // grid cells per side

export function mount(root) {
  root.innerHTML = `
    <div class="g-hud">
      <div class="g-stat"><b data-k="score">0</b><span>score</span></div>
      <div class="g-stat"><b data-k="best">0</b><span>best</span></div>
    </div>
    <div class="snake-box">
      <canvas class="snake-canvas" aria-label="Snake game board"></canvas>
      <div class="snake-overlay">
        <p data-k="title">Snake</p>
        <small data-k="hint">arrows or wasd · edges wrap around</small>
        <button class="px-btn primary" data-act="start">Play</button>
      </div>
    </div>
    <div class="dpad" aria-label="Direction pad">
      <button class="up" data-dir="0,-1" aria-label="Up">▲</button>
      <button class="left" data-dir="-1,0" aria-label="Left">◀</button>
      <button class="down" data-dir="0,1" aria-label="Down">▼</button>
      <button class="right" data-dir="1,0" aria-label="Right">▶</button>
    </div>`;

  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const overlay = root.querySelector(".snake-overlay");
  const k = (n) => root.querySelector(`[data-k="${n}"]`);
  const isTouch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (isTouch) k("hint").textContent = "swipe or use the pad · edges wrap around";

  let best = store.get("snake-best", 0);
  k("best").textContent = best;

  let snake, dir, queue, food, score, running = false, paused = false, dead = false;
  let portal = null; // last wrap, for the edge flash
  let last = 0, acc = 0, raf = 0, step = 130;
  let cell = 20;

  function size() {
    const css = canvas.clientWidth || 360;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cell = Math.floor((css * dpr) / N);
    canvas.width = canvas.height = cell * N;
    draw();
  }

  function reset() {
    const m = Math.floor(N / 2);
    snake = [{ x: m - 2, y: m }, { x: m - 3, y: m }, { x: m - 4, y: m }];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    step = 130;
    dead = false;
    k("score").textContent = 0;
    placeFood();
  }

  function placeFood() {
    const free = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    food = free[Math.floor(Math.random() * free.length)];
  }

  function turn(x, y) {
    const lastDir = queue.length ? queue[queue.length - 1] : dir;
    if (x === -lastDir.x && y === -lastDir.y) return; // no reversing
    if (x === lastDir.x && y === lastDir.y) return;
    if (queue.length < 3) queue.push({ x, y });
  }

  function update() {
    if (queue.length) dir = queue.shift();
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    // no walls: leave one side, come back on the other
    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N) {
      portal = dir.x !== 0 ? { axis: "x", line: head.y, t: performance.now() } : { axis: "y", line: head.x, t: performance.now() };
      head = { x: (head.x + N) % N, y: (head.y + N) % N };
    }
    const ate = food && head.x === food.x && head.y === food.y;
    const body = ate ? snake : snake.slice(0, -1);
    if (body.some((s) => s.x === head.x && s.y === head.y)) return gameOver();
    snake.unshift(head);
    if (ate) {
      score++;
      k("score").textContent = score;
      step = Math.max(65, 130 - score * 3);
      placeFood();
    } else snake.pop();
  }

  function gameOver() {
    running = false;
    dead = true;
    if (score > best) { best = score; store.set("snake-best", best); k("best").textContent = best; }
    k("title").textContent = score >= best && score > 0 ? `New best: ${score}` : `Score: ${score}`;
    k("hint").textContent = "it happens";
    root.querySelector('[data-act="start"]').textContent = "Again";
    overlay.hidden = false;
    draw();
  }

  function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  function draw() {
    if (!snake) return;
    const c = cell, p = Math.max(1, Math.floor(c / 10));
    px(0, 0, canvas.width, canvas.height, "#e8ece3");
    // checker
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++)
      if ((x + y) % 2) px(x * c, y * c, c, c, "#e1e6db");
    // the edges are portals: soft dashes all round instead of a wall
    const dash = Math.max(2, Math.floor(c / 3));
    for (let i = 0; i < N; i++) {
      const o = i * c + (c - dash) / 2;
      px(o, 0, dash, p, "rgba(62,123,240,.35)");
      px(o, canvas.height - p, dash, p, "rgba(62,123,240,.35)");
      px(0, o, p, dash, "rgba(62,123,240,.35)");
      px(canvas.width - p, o, p, dash, "rgba(62,123,240,.35)");
    }
    // flash both ends of the row/column the snake just wrapped through
    if (portal) {
      const age = (performance.now() - portal.t) / 650;
      if (age < 1) {
        const a = 1 - age, g = `rgba(62,123,240,${a.toFixed(3)})`, depth = p * 4;
        if (portal.axis === "x") {
          px(0, portal.line * c, depth, c, g);
          px(canvas.width - depth, portal.line * c, depth, c, g);
        } else {
          px(portal.line * c, 0, c, depth, g);
          px(portal.line * c, canvas.height - depth, c, depth, g);
        }
      } else portal = null;
    }
    // food (pixel apple)
    if (food) {
      const fx = food.x * c, fy = food.y * c;
      px(fx + p * 2, fy + p * 3, c - p * 4, c - p * 5, "#ea4a3b");
      px(fx + p * 3, fy + p * 2, c - p * 6, c - p * 3, "#ea4a3b");
      px(fx + p * 3, fy + p * 4, p * 2, p * 2, "rgba(255,255,255,.55)");
      px(fx + c / 2 - p / 2, fy + p, p, p * 2, "#3a2a1a");
      px(fx + c / 2 + p / 2, fy + p, p * 2, p, "#2f9e5b");
    }
    // snake
    snake.forEach((s, i) => {
      const x = s.x * c, y = s.y * c;
      const shade = i === 0 ? "#161614" : i % 2 ? "#2b2b27" : "#33332e";
      const col = dead ? "#8a8780" : shade;
      px(x + p, y + p, c - p * 2, c - p * 2, col);
      // join to the segments either side so the body reads as one line,
      // including across a wrap (the join then runs to the board edge)
      [snake[i - 1], snake[i + 1]].forEach((n) => {
        if (!n) return;
        let dx = n.x - s.x, dy = n.y - s.y;
        if (Math.abs(dx) > 1) dx = -Math.sign(dx);
        if (Math.abs(dy) > 1) dy = -Math.sign(dy);
        if (dx < 0) px(x, y + p, p, c - p * 2, col);
        if (dx > 0) px(x + c - p, y + p, p, c - p * 2, col);
        if (dy < 0) px(x + p, y, c - p * 2, p, col);
        if (dy > 0) px(x + p, y + c - p, c - p * 2, p, col);
      });
    });
    // eyes
    const h = snake[0];
    const ex = h.x * c, ey = h.y * c, e = Math.max(2, p * 2);
    const eyes = dir.x !== 0
      ? [[dir.x > 0 ? c - p * 4 : p * 2, p * 3], [dir.x > 0 ? c - p * 4 : p * 2, c - p * 5]]
      : [[p * 3, dir.y > 0 ? c - p * 4 : p * 2], [c - p * 5, dir.y > 0 ? c - p * 4 : p * 2]];
    eyes.forEach(([a, b]) => px(ex + a, ey + b, e, e, "#f2f1ec"));
  }

  function loop(t) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (paused) { last = t; return; }
    // after a tab switch, don't fast-forward the snake into a wall
    acc += Math.min(t - last, step * 2);
    last = t;
    while (acc >= step && running) { update(); acc -= step; }
    draw();
  }

  function start() {
    reset();
    overlay.hidden = true;
    running = true;
    paused = false;
    acc = 0;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    canvas.focus?.();
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    k("title").textContent = "Paused";
    k("hint").textContent = "space to keep going";
    root.querySelector('[data-act="start"]').hidden = true;
    overlay.hidden = !paused;
    if (!paused) root.querySelector('[data-act="start"]').hidden = false;
  }

  root.querySelector('[data-act="start"]').addEventListener("click", start);
  root.querySelectorAll("[data-dir]").forEach((b) =>
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); const [x, y] = b.dataset.dir.split(",").map(Number); turn(x, y); })
  );

  const KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
  };
  const onKey = (e) => {
    if (KEYS[e.key]) {
      e.preventDefault();
      if (!running && !dead && overlay.hidden === false && e.key.startsWith("Arrow")) start();
      turn(...KEYS[e.key]);
    } else if (e.key === " ") {
      e.preventDefault();
      if (running) togglePause(); else start();
    }
  };
  addEventListener("keydown", onKey);

  // swipe
  let sx = 0, sy = 0;
  const ts = (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; };
  const te = (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0); else turn(0, Math.sign(dy));
  };
  canvas.addEventListener("touchstart", ts, { passive: true });
  canvas.addEventListener("touchend", te, { passive: true });

  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  reset();
  size();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    removeEventListener("keydown", onKey);
    ro.disconnect();
  };
}
