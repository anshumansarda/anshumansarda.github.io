// Little toys in the About folder: a flippable polaroid, stat bars that fill
// when they scroll into view, and a die that rolls a random fact.

const FACTS = [
  "I edited videos for a YouTube channel with over a million subscribers.",
  "I've presented monetary policy at the Federal Reserve in Washington, D.C.",
  "I speak English, Hindi and Bengali.",
  "I built a food delivery app in college, and it came second in a pitch competition.",
  "I spent a semester in London at Queen Mary.",
  "Pisces. Water sign, apparently a dreamer.",
  "I DJ techno and house, sometimes. There is a deck further down.",
  "This whole site is hand-written HTML, CSS and JS. No frameworks.",
  "I'll play 8 ball pool with anyone. Table tennis too.",
  "There's a slot machine in the Games folder. It's rigged in your favour.",
];

// pip layouts on a 3x3 grid for faces 1-6
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

export function initAbout() {
  // polaroid: tap to flip to the pixel version
  const pol = document.getElementById("polaroid");
  if (pol) pol.addEventListener("click", () => {
    const on = pol.getAttribute("aria-pressed") !== "true";
    pol.setAttribute("aria-pressed", String(on));
  });

  // stat bars fill each time the card scrolls into view
  const player = document.getElementById("player");
  if (player) {
    new IntersectionObserver((es) => es.forEach((e) => player.classList.toggle("is-in", e.isIntersecting)), { threshold: 0.5 })
      .observe(player.querySelector(".stats") || player);
  }

  // work timeline: entries slide in as they scroll into view
  const xps = document.querySelectorAll(".xp");
  if (xps.length) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }), { threshold: 0.2 });
    xps.forEach((x) => io.observe(x));
  }

  // dice
  const btn = document.getElementById("dice-btn");
  const die = document.getElementById("die");
  const fact = document.getElementById("dice-fact");
  if (!btn) return;
  const pips = [...die.children];
  let last = -1, rolling = false;
  const face = (n) => pips.forEach((p, i) => p.classList.toggle("on", PIPS[n].includes(i)));
  face(5);
  btn.addEventListener("click", () => {
    if (rolling) return;
    rolling = true;
    let k = 0;
    const spins = reduced ? 1 : 9;
    const step = () => {
      face(1 + Math.floor(Math.random() * 6));
      die.style.transform = `rotate(${(Math.random() - 0.5) * 40}deg)`;
      if (++k < spins) return setTimeout(step, 45 + k * 9);
      die.style.transform = "";
      let i;
      do { i = Math.floor(Math.random() * FACTS.length); } while (i === last && FACTS.length > 1);
      last = i;
      face((i % 6) + 1);
      fact.textContent = FACTS[i];
      rolling = false;
    };
    step();
  });
}
