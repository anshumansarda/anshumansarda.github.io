// Heads or Tails — call it, flip, keep the streak alive.
import { store } from "./store.js";

export function mount(root) {
  root.innerHTML = `
    <div class="g-hud">
      <div class="g-stat"><b data-k="streak">0</b><span>streak</span></div>
      <div class="g-stat"><b data-k="best">0</b><span>best</span></div>
      <div class="g-stat"><b data-k="rate">–</b><span>hit rate</span></div>
    </div>
    <div class="coin-wrap">
      <div class="coin" aria-hidden="true">
        <div class="coin-face heads">H<small>heads</small></div>
        <div class="coin-face tails">T<small>tails</small></div>
      </div>
      <div class="coin-shadow"></div>
    </div>
    <p class="g-msg" aria-live="polite">Call it.</p>
    <div class="g-row">
      <button class="px-btn" data-call="H">Heads</button>
      <button class="px-btn" data-call="T">Tails</button>
    </div>
    <div class="coin-hist" aria-label="Last flips"></div>`;

  const coin = root.querySelector(".coin");
  const msg = root.querySelector(".g-msg");
  const hist = root.querySelector(".coin-hist");
  const btns = [...root.querySelectorAll("[data-call]")];
  const k = (n) => root.querySelector(`[data-k="${n}"]`);

  let streak = 0, flips = 0, hits = 0;
  let best = store.get("coin-best", 0);
  let angle = 0;
  let busy = false;
  const history = [];
  k("best").textContent = best;

  const lines = {
    win: ["Called it.", "Nice.", "Easy.", "You're reading it.", "Again?"],
    lose: ["Nope.", "Coin says no.", "Close. Not really.", "Streak's gone.", "Unlucky."],
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function flip(call) {
    if (busy) return;
    busy = true;
    btns.forEach((b) => (b.disabled = true));
    msg.textContent = "…";
    const result = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? "H" : "T";
    // spin several full turns, then land on the right face
    const spins = 5 + Math.floor(Math.random() * 3);
    const current = ((angle % 360) + 360) % 360;
    const target = result === "H" ? 0 : 180;
    angle += spins * 360 + ((target - current + 360) % 360);
    const anim = coin.animate(
      [
        { transform: coin.style.transform || "rotateY(0deg)" },
        { transform: `translateY(-90px) rotateY(${angle - spins * 180}deg)`, offset: 0.45 },
        { transform: `rotateY(${angle}deg)` },
      ],
      { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1300, easing: "cubic-bezier(.3,.7,.4,1)" }
    );
    anim.onfinish = () => {
      coin.style.transform = `rotateY(${angle}deg)`;
      flips++;
      const won = call === result;
      if (won) { streak++; hits++; } else streak = 0;
      if (streak > best) { best = streak; store.set("coin-best", best); }
      k("streak").textContent = streak;
      k("best").textContent = best;
      k("rate").textContent = Math.round((hits / flips) * 100) + "%";
      msg.textContent = `${result === "H" ? "Heads" : "Tails"}. ${won ? pick(lines.win) : pick(lines.lose)}`;
      history.unshift({ r: result, won });
      history.length = Math.min(history.length, 10);
      hist.innerHTML = history.map((h) => `<i class="${h.won ? "h-win" : "h-lose"}">${h.r}</i>`).join("");
      btns.forEach((b) => (b.disabled = false));
      busy = false;
    };
  }

  btns.forEach((b) => b.addEventListener("click", () => flip(b.dataset.call)));
  const onKey = (e) => {
    if (e.key === "h" || e.key === "H") flip("H");
    if (e.key === "t" || e.key === "T") flip("T");
  };
  addEventListener("keydown", onKey);
  return () => removeEventListener("keydown", onKey);
}
