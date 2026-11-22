// Pixel DJ deck in About. Play spins the records, drops the tonearms,
// runs the level meters and plays a tiny synthesized four-on-the-floor loop.
const SEGS = 8;
const BPM = 124;

export function initDJ() {
  const deck = document.getElementById("dj-deck");
  const btn = document.getElementById("dj-play");
  if (!deck || !btn) return;
  const svg = deck.querySelector("svg");
  const NS = "http://www.w3.org/2000/svg";

  // level meters: 8 segments each, green → yellow → red
  const meters = ["l", "r"].map((side, m) => {
    const g = svg.querySelector(`.dj-vu-${side}`);
    const x = m === 0 ? 124 : 144;
    const segs = [];
    for (let i = 0; i < SEGS; i++) {
      const r = document.createElementNS(NS, "rect");
      r.setAttribute("x", x);
      r.setAttribute("y", 62 - i * 4.5);
      r.setAttribute("width", 12);
      r.setAttribute("height", 3.5);
      r.dataset.on = i >= 7 ? "#ea4a3b" : i >= 5 ? "#f3b52e" : "#2f9e5b";
      r.setAttribute("fill", "#d6d3ca");
      g.appendChild(r);
      segs.push(r);
    }
    return segs;
  });
  const led = svg.querySelector(".dj-led");

  let playing = false, ctx = null, master = null, timer = 0, meterRaf = 0;
  let nextBeat = 0, step = 0, lastKick = 0;

  function setLevel(segs, lvl) {
    segs.forEach((r, i) => r.setAttribute("fill", i < lvl ? r.dataset.on : "#d6d3ca"));
  }

  // --- tiny synth -------------------------------------------------------
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 0.32);
  }
  let noiseBuf = null;
  function hat(t, open) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = "highpass"; f.frequency.value = 7500;
    const len = open ? 0.16 : 0.04;
    g.gain.setValueAtTime(open ? 0.22 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(master);
    src.start(t); src.stop(t + len + 0.01);
  }
  function bass(t, freq) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = freq;
    f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(f).connect(g).connect(master);
    o.start(t); o.stop(t + 0.22);
  }

  const sixteenth = 60 / BPM / 4;
  const BASSLINE = [0, 0, 55, 0, 0, 0, 55, 0, 0, 0, 65.4, 0, 0, 0, 49, 0];

  function schedule() {
    // look ahead 120ms and queue anything due
    while (nextBeat < ctx.currentTime + 0.12) {
      const s = step % 16;
      if (s % 4 === 0) { kick(nextBeat); lastKick = nextBeat; }
      if (s % 4 === 2) hat(nextBeat, true);
      else if (s % 2 === 1) hat(nextBeat, false);
      if (BASSLINE[s]) bass(nextBeat, BASSLINE[s]);
      nextBeat += sixteenth;
      step++;
    }
  }

  function meterLoop() {
    meterRaf = requestAnimationFrame(meterLoop);
    // meters jump on each kick and fall back between them
    const since = ctx ? ctx.currentTime - lastKick : 1;
    const base = Math.max(0, 1 - since / (60 / BPM)) ;
    const l = Math.round(2 + base * 6 + Math.random() * 0.8);
    const r = Math.round(2 + base * 5.6 + Math.random() * 0.8);
    setLevel(meters[0], l);
    setLevel(meters[1], r);
    led.setAttribute("fill", since < 0.08 ? "#ea4a3b" : "#77746d");
  }

  function start() {
    if (playing) return;
    playing = true;
    deck.classList.add("is-playing");
    btn.setAttribute("aria-pressed", "true");
    btn.querySelector(".dj-play-label").textContent = "Stop";
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      nextBeat = ctx.currentTime + 0.08;
      step = 0;
      timer = setInterval(schedule, 25);
    } catch { /* no audio: the deck still animates */ }
    meterLoop();
  }

  function stop() {
    if (!playing) return;
    playing = false;
    deck.classList.remove("is-playing");
    btn.setAttribute("aria-pressed", "false");
    btn.querySelector(".dj-play-label").textContent = "Play";
    clearInterval(timer);
    cancelAnimationFrame(meterRaf);
    if (master && ctx) {
      const m = master;
      m.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      setTimeout(() => m.disconnect(), 300);
    }
    meters.forEach((s) => setLevel(s, 0));
    led.setAttribute("fill", "#77746d");
  }

  btn.addEventListener("click", () => (playing ? stop() : start()));
  deck.addEventListener("click", () => (playing ? stop() : start()));
  // stop the music when you leave the About folder or the tab
  addEventListener("hashchange", () => { if (!location.hash.startsWith("#about")) stop(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  const win = document.getElementById("win-about");
  if (win) new MutationObserver(() => { if (win.hidden) stop(); }).observe(win, { attributes: true, attributeFilter: ["hidden"] });
}
