// Advanced tic tac toe: each side keeps at most 3 marks.
// Placing your 4th mark removes your oldest one, so nobody can just fill the board.
import { pixelSVG } from "../pixel.js";
import { store } from "./store.js";

const X_ART = ["##....##", "###..###", ".######.", "..####..", "..####..", ".######.", "###..###", "##....##"];
const O_ART = ["..####..", ".######.", "###..###", "##....##", "##....##", "###..###", ".######.", "..####.."];
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const MAX = 3;

const other = (p) => (p === "X" ? "O" : "X");

function winner(cells) {
  for (const l of LINES) {
    const [a, b, c] = l;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return { p: cells[a], line: l };
  }
  return null;
}

function apply(state, p, i) {
  const cells = state.cells.slice();
  const q = { X: state.q.X.slice(), O: state.q.O.slice() };
  if (q[p].length === MAX) cells[q[p].shift()] = null;
  cells[i] = p;
  q[p].push(i);
  return { cells, q };
}

const empties = (cells) => cells.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);

// Depth-limited minimax. The game can go on forever, so we cap the search.
function search(state, toMove, me, depth) {
  const w = winner(state.cells);
  if (w) return w.p === me ? 100 - (8 - depth) : -100 + (8 - depth);
  if (depth === 0) return 0;
  let best = toMove === me ? -Infinity : Infinity;
  for (const i of empties(state.cells)) {
    const v = search(apply(state, toMove, i), other(toMove), me, depth - 1);
    best = toMove === me ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

function aiMove(state, me) {
  const moves = empties(state.cells);
  // a little sloppiness so it's beatable
  if (Math.random() < 0.12) return moves[Math.floor(Math.random() * moves.length)];
  let best = -Infinity, picks = [];
  for (const i of moves) {
    const v = search(apply(state, me, i), other(me), me, 5) + (i === 4 ? 0.5 : 0);
    if (v > best) { best = v; picks = [i]; } else if (v === best) picks.push(i);
  }
  return picks[Math.floor(Math.random() * picks.length)];
}

export function mount(root) {
  root.innerHTML = `
    <div class="ttt">
      <div class="g-hud">
        <div class="g-stat"><b data-k="you">0</b><span data-k="you-label">you</span></div>
        <div class="g-stat"><b data-k="them">0</b><span data-k="them-label">me</span></div>
      </div>
      <div class="ttt-mode" role="group" aria-label="Mode">
        <button class="ttt-tab is-on" data-mode="ai">vs me</button>
        <button class="ttt-tab" data-mode="2p">2 players</button>
      </div>
      <div class="ttt-board" role="grid" aria-label="Tic tac toe board">
        ${[...Array(9)].map((_, i) => `<button class="ttt-cell" data-i="${i}" aria-label="Cell ${i + 1}"></button>`).join("")}
      </div>
      <p class="g-msg" aria-live="polite"></p>
      <p class="ttt-rule mono">3 marks each. your 4th move removes your oldest.</p>
      <div class="g-row"><button class="px-btn" data-act="reset">New round</button></div>
    </div>`;

  const q = (s) => root.querySelector(s);
  const k = (n) => root.querySelector(`[data-k="${n}"]`);
  const cellsEl = [...root.querySelectorAll(".ttt-cell")];
  const msg = q(".g-msg");
  const X_SVG = pixelSVG(X_ART);
  const O_SVG = pixelSVG(O_ART);

  let mode = store.get("ttt-mode", "ai");
  let score = store.get("ttt-score", { ai: { X: 0, O: 0 }, "2p": { X: 0, O: 0 } });
  let state, turn, over, starter = "X", thinking = false, aiTimer = 0;

  function label(p) {
    if (mode === "ai") return p === "X" ? "You" : "Me";
    return p === "X" ? "Blue" : "Red";
  }

  function paintScore() {
    k("you").textContent = score[mode].X;
    k("them").textContent = score[mode].O;
    k("you-label").textContent = mode === "ai" ? "you" : "blue";
    k("them-label").textContent = mode === "ai" ? "me" : "red";
    root.querySelectorAll("[data-mode]").forEach((b) => b.classList.toggle("is-on", b.dataset.mode === mode));
  }

  function paint(winLine) {
    // the next mark to disappear belongs to whoever moves next and already has 3
    const fading = !over && state.q[turn].length === MAX ? state.q[turn][0] : -1;
    cellsEl.forEach((el, i) => {
      const v = state.cells[i];
      el.className = "ttt-cell" + (v ? ` has-${v}` : "") + (i === fading ? " is-fading" : "") + (winLine && winLine.includes(i) ? " is-win" : "");
      el.innerHTML = v ? `<span class="ttt-mark">${v === "X" ? X_SVG : O_SVG}</span>` : "";
      el.disabled = over || !!v || thinking;
      el.setAttribute("aria-label", `Cell ${i + 1}${v ? ", " + label(v) : ""}`);
    });
  }

  function newRound() {
    clearTimeout(aiTimer);
    state = { cells: Array(9).fill(null), q: { X: [], O: [] } };
    over = false;
    thinking = false;
    turn = starter;
    starter = other(starter); // take turns going first
    paint();
    prompt();
  }

  function prompt() {
    if (mode === "ai") {
      if (turn === "X") msg.textContent = state.q.X.length === MAX ? "Your move. The faded one goes next." : "Your move.";
      else { msg.textContent = "Thinking…"; think(); }
    } else msg.textContent = `${label(turn)}'s move.`;
  }

  function think() {
    thinking = true;
    paint();
    aiTimer = setTimeout(() => {
      thinking = false;
      play(aiMove(state, "O"));
    }, 420);
  }

  function play(i) {
    if (over || state.cells[i]) return;
    state = apply(state, turn, i);
    const w = winner(state.cells);
    if (w) {
      over = true;
      score[mode][w.p]++;
      store.set("ttt-score", score);
      paintScore();
      paint(w.line);
      msg.textContent = mode === "ai" ? (w.p === "X" ? "You win. Nicely done." : "I win. Again?") : `${label(w.p)} wins.`;
      return;
    }
    turn = other(turn);
    paint();
    prompt();
  }

  root.querySelector(".ttt").addEventListener("click", (e) => {
    const c = e.target.closest(".ttt-cell");
    if (c) {
      if (thinking || (mode === "ai" && turn === "O")) return;
      return play(+c.dataset.i);
    }
    const m = e.target.closest("[data-mode]");
    if (m && m.dataset.mode !== mode) {
      mode = m.dataset.mode;
      store.set("ttt-mode", mode);
      starter = "X";
      paintScore();
      return newRound();
    }
    if (e.target.closest('[data-act="reset"]')) newRound();
  });

  const onKey = (e) => {
    if (e.key >= "1" && e.key <= "9" && !e.metaKey && !e.ctrlKey) {
      // number keys map to the board like a phone keypad: 1 top-left … 9 bottom-right
      const i = +e.key - 1;
      if (!thinking && !(mode === "ai" && turn === "O")) play(i);
    }
  };
  addEventListener("keydown", onKey);

  paintScore();
  newRound();

  return () => {
    clearTimeout(aiTimer);
    removeEventListener("keydown", onKey);
  };
}
