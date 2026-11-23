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
    msg.textContent = "Up it goes…";
    const beats = matchMedia("(prefers-reduced-motion: reduce)").matches ? [] :
      [setTimeout(() => (msg.textContent = "…"), 900), setTimeout(() => (msg.textContent = "and…"), 1700)];
    const result = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? "H" : "T";
    // spin several full turns, then land on the right face
    const spins = 11 + Math.floor(Math.random() * 3);
    const current = ((angle % 360) + 360) % 360;
    const target = result === "H" ? 0 : 180;
    angle += spins * 360 + ((target - current + 360) % 360);
    const anim = coin.animate(
      [
        // toss up fast, hang at the top while it spins, then slow right down before it lands
        { transform: `${coin.style.transform || "rotateY(0deg)"}`, offset: 0 },
        { transform: `translateY(-110px) rotateY(${angle - spins * 360 + spins * 150}deg) scale(1.08)`, offset: 0.28 },
        { transform: `translateY(-120px) rotateY(${angle - spins * 360 + spins * 290}deg) scale(1.1)`, offset: 0.62 },
        { transform: `translateY(-30px) rotateY(${angle - 200}deg) scale(1.03)`, offset: 0.86 },
        { transform: `translateY(0) rotateY(${angle}deg)`, offset: 1 },
      ],
      { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 2400, easing: "cubic-bezier(.25,.6,.35,1)" }
    );
    anim.onfinish = () => {
      beats.forEach(clearTimeout);
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
