// Blackjack — dealer stands on all 17s, blackjack pays 3:2, double on first two cards.
import { store } from "./store.js";

const SUITS = [["♠", false], ["♥", true], ["♦", true], ["♣", false]];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const START = 500;

function newShoe(decks = 4) {
  const cards = [];
  for (let d = 0; d < decks; d++)
    for (const [s, red] of SUITS) for (const r of RANKS) cards.push({ r, s, red });
  // Fisher–Yates with crypto randomness
  const rnd = new Uint32Array(cards.length);
  crypto.getRandomValues(rnd);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = rnd[i] % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function score(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    if (c.r === "A") { aces++; total += 11; }
    else if ("JQK".includes(c.r)) total += 10;
    else total += +c.r;
  }
  while (total > 21 && aces) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}
const isBJ = (h) => h.length === 2 && score(h).total === 21;

function cardHTML(c, hidden) {
  if (hidden) return `<div class="card back" aria-label="face-down card"><span></span></div>`;
  return `<div class="card${c.red ? " red" : ""}" aria-label="${c.r} of ${c.s}"><span class="r">${c.r}</span><span class="s">${c.s}</span><span class="r2">${c.r}</span></div>`;
}

export function mount(root) {
  root.innerHTML = `
    <div class="bj">
      <div class="g-hud">
        <div class="g-stat"><b data-k="bank">0</b><span>chips</span></div>
        <div class="g-stat"><b data-k="bet">0</b><span>bet</span></div>
        <div class="g-stat"><b data-k="record">0–0</b><span>w–l</span></div>
      </div>
      <div class="bj-table">
        <div class="bj-lane">
          <div class="bj-lane-head"><span>dealer</span><b data-k="dscore"></b></div>
          <div class="bj-hand" data-hand="dealer"></div>
        </div>
        <div class="bj-lane">
          <div class="bj-lane-head"><span>you</span><b data-k="pscore"></b></div>
          <div class="bj-hand" data-hand="player"></div>
        </div>
      </div>
      <p class="g-msg" aria-live="polite"></p>
      <div class="bj-bets" data-phase="bet">
        <button class="chip-btn" style="--cc:#3e7bf0" data-chip="10">10</button>
        <button class="chip-btn" style="--cc:#2f9e5b" data-chip="25">25</button>
        <button class="chip-btn" style="--cc:#ea4a3b" data-chip="50">50</button>
        <button class="chip-btn" style="--cc:#161614" data-chip="100">100</button>
      </div>
      <div class="g-row" data-phase="bet">
        <button class="px-btn" data-act="clear">Clear</button>
        <button class="px-btn primary" data-act="deal">Deal</button>
      </div>
      <div class="g-row" data-phase="play" hidden>
        <button class="px-btn" data-act="hit">Hit</button>
        <button class="px-btn primary" data-act="stand">Stand</button>
        <button class="px-btn" data-act="double">Double</button>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const k = (n) => root.querySelector(`[data-k="${n}"]`);
  const msg = $(".g-msg");
  const dEl = $('[data-hand="dealer"]');
  const pEl = $('[data-hand="player"]');

  let shoe = newShoe();
  let bank = store.get("bj-bank", START);
  let record = store.get("bj-record", { w: 0, l: 0 });
  let bet = 0;
  let player = [], dealer = [];
  let phase = "bet";
  let timers = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const draw = () => { if (shoe.length < 20) shoe = newShoe(); return shoe.pop(); };

  function save() { store.set("bj-bank", bank); store.set("bj-record", record); }

  function render(revealDealer) {
    pEl.innerHTML = player.map((c) => cardHTML(c)).join("");
    dEl.innerHTML = dealer.map((c, i) => cardHTML(c, i === 1 && !revealDealer)).join("");
    k("pscore").textContent = player.length ? score(player).total : "";
    k("dscore").textContent = dealer.length ? (revealDealer ? score(dealer).total : score([dealer[0]]).total + " + ?") : "";
    hud();
  }
  function hud() {
    k("bank").textContent = bank;
    k("bet").textContent = bet;
    k("record").textContent = `${record.w}–${record.l}`;
    root.querySelectorAll("[data-chip]").forEach((b) => (b.disabled = phase !== "bet" || +b.dataset.chip > bank));
    $('[data-act="deal"]').disabled = phase !== "bet" || bet === 0;
    $('[data-act="clear"]').disabled = phase !== "bet" || bet === 0;
    $('[data-act="double"]').disabled = phase !== "play" || player.length !== 2 || bank < bet;
  }
  function setPhase(p) {
    phase = p;
    root.querySelectorAll('[data-phase="bet"]').forEach((n) => (n.hidden = p !== "bet"));
    root.querySelector('[data-phase="play"]').hidden = p !== "play";
    hud();
  }

  function addBet(n) {
    if (phase !== "bet" || n > bank) return;
    if (player.length) { player = []; dealer = []; render(true); }
    bank -= n; bet += n;
    msg.textContent = "Deal when you're ready.";
    hud();
  }
  function clearBet() { bank += bet; bet = 0; msg.textContent = "Place a bet."; hud(); }

  function deal() {
    if (phase !== "bet" || !bet) return;
    player = []; dealer = [];
    setPhase("dealing");
    msg.textContent = "";
    const seq = [player, dealer, player, dealer];
    seq.forEach((h, i) => later(() => { h.push(draw()); render(false); }, i * 220));
    later(() => {
      if (isBJ(player) || isBJ(dealer)) return settle();
      setPhase("play");
      msg.textContent = "Hit or stand?";
    }, seq.length * 220 + 60);
  }

  function hit() {
    if (phase !== "play") return;
    player.push(draw());
    render(false);
    const t = score(player).total;
    if (t > 21) settle();
    else if (t === 21) stand();
    else hud();
  }

  function double() {
    if (phase !== "play" || player.length !== 2 || bank < bet) return;
    bank -= bet; bet *= 2;
    player.push(draw());
    render(false);
    if (score(player).total > 21) settle(); else stand();
  }

  function stand() {
    if (phase !== "play") return;
    setPhase("dealer");
    render(true);
    const step = () => {
      if (score(dealer).total < 17) {
        dealer.push(draw());
        render(true);
        later(step, 420);
      } else settle();
    };
    later(step, 450);
  }

  function settle() {
    render(true);
    const p = score(player).total, d = score(dealer).total;
    const pBJ = isBJ(player), dBJ = isBJ(dealer);
    let text, payout = 0, result = 0;
    if (p > 21) { text = `Bust at ${p}.`; result = -1; }
    else if (pBJ && !dBJ) { payout = bet + Math.floor(bet * 1.5); text = `Blackjack. +${payout - bet}`; result = 1; }
    else if (dBJ && !pBJ) { text = "Dealer has blackjack."; result = -1; }
    else if (d > 21) { payout = bet * 2; text = `Dealer busts. +${bet}`; result = 1; }
    else if (p > d) { payout = bet * 2; text = `${p} beats ${d}. +${bet}`; result = 1; }
    else if (p < d) { text = `${d} beats ${p}.`; result = -1; }
    else { payout = bet; text = `Push at ${p}.`; }
    bank += payout;
    if (result > 0) record.w++;
    if (result < 0) record.l++;
    const last = bet;
    bet = 0;
    if (bank <= 0) { bank = START; text += " Out of chips. Here's 500 more."; }
    save();
    setPhase("bet");
    msg.textContent = text + (bank >= last ? "  Same bet? Tap a chip." : "");
  }

  root.querySelector(".bj").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-chip]");
    if (chip) return addBet(+chip.dataset.chip);
    const act = e.target.closest("[data-act]");
    if (!act) return;
    ({ clear: clearBet, deal, hit, stand, double })[act.dataset.act]();
  });

  const onKey = (e) => {
    if (e.target.closest && e.target.closest("button") && (e.key === " " || e.key === "Enter")) return;
    const key = e.key.toLowerCase();
    if (phase === "play") {
      if (key === "h") hit();
      if (key === "s") stand();
      if (key === "d") double();
    } else if (phase === "bet" && (key === "enter" || key === " ")) { e.preventDefault(); deal(); }
  };
  addEventListener("keydown", onKey);

  msg.textContent = "Place a bet.";
  setPhase("bet");
  render(true);

  return () => {
    // a bet on the table when you leave goes back to the bank
    if (phase === "bet" && bet) { bank += bet; bet = 0; }
    save();
    timers.forEach(clearTimeout);
    removeEventListener("keydown", onKey);
  };
}
