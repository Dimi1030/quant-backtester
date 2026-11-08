"use strict";
(() => {
/* =====================================================================
   Gipfelquiz – ein Familienquiz für einen Bildschirm.
   Teams („Seilschaften“) klettern mit jeder richtigen Antwort den
   Kilimandscharo hinauf: Punkte = Höhenmeter.
   ===================================================================== */

const IMG = window.__IMG || {};
const CREDITS = window.__CREDITS || [];
/* focal points for photos shown in cropped frames */
const IMG_POS = { monalisa: "50% 28%", eiffel: "50% 35%", einstein: "50% 30%", aldrin: "50% 35%", machupicchu: "50% 45%", canberra: "50% 55%", giraffe_portrait: "50% 16%", kili_giraffe: "50% 42%", christbaum: "50% 45%", cheetah: "50% 22%", uhuru: "50% 40%", balloon: "30% 55%",
  horse_eye: "72% 32%", stonetown: "45% 50%", zebras: "42% 50%", elephant_family: "35% 40%", lion: "48% 38%", football: "50% 62%", mercury_house: "50% 40%",
  icelandic: "45% 50%", lipizzaner: "62% 50%", dikdik: "45% 50%", kili: "50% 35%", nutcracker: "50% 50%", tanzanite: "50% 45%" };
const posOf = (id) => (IMG_POS[id] ? `object-position:${IMG_POS[id]}` : "");

/* ---------- Palette (mirrors the CSS tokens; needed for SVG & canvas) ---------- */
const PAL = {
  usiku: "#0D1330", usiku2: "#151D44", usiku3: "#1F2A5C", line: "#2E3A72",
  theluji: "#F6F2EA", mawingu: "#AAB4D8", safran: "#F6B427", hibiskus: "#E5487D",
  bahari: "#15A7A3", majani: "#5AA83C", udongo: "#E0693E", anga: "#5E8FF3"
};
const TILE_HEX = ["#D93D72", "#11928F", "#F6B427", "#4C9632"];

const ANIMALS = [
  { id: "simba", name: "Simba", de: "Die Löwen", img: "av_lion", color: PAL.safran },
  { id: "twiga", name: "Twiga", de: "Die Giraffen", img: "av_giraffe", color: PAL.udongo },
  { id: "tembo", name: "Tembo", de: "Die Elefanten", img: "av_elephant", color: PAL.anga },
  { id: "pundamilia", name: "Pundamilia", de: "Die Zebras", img: "av_zebra", color: PAL.theluji },
  { id: "kiboko", name: "Kiboko", de: "Die Nilpferde", img: "av_hippo", color: PAL.hibiskus },
  { id: "duma", name: "Duma", de: "Die Geparden", img: "av_cheetah", color: PAL.majani }
];
const ROUTES = ["Marangu", "Machame", "Lemosho", "Rongai", "Umbwe", "Shira"];
const BASE = 1870, SUMMIT = 5895;
const CAMPS = [
  { n: "Marangu Gate", a: 1870 }, { n: "Mandara Hut", a: 2700 }, { n: "Horombo Hut", a: 3720 },
  { n: "Kibo Hut", a: 4700 }, { n: "Gilman’s Point", a: 5685 }, { n: "Uhuru Peak", a: 5895 }
];
const KIND_LABEL = { mc: "Vier Antworten", tf: "Wahr oder falsch", est: "Schätzfragen", zoom: "Bilderrätsel", final: "Finale mit Einsatz" };
const SAVE_KEY = "gipfelquiz.game.v2", SETUP_KEY = "gipfelquiz.setup.v2", SEEN_KEY = "gipfelquiz.seen.v1", PLAYER_KEY = "gipfelquiz.player.v1";

/* ---------- Small helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => Math.round(n).toLocaleString("de-DE");
const fmtNum = (n) => (Math.abs(n) < 100 && n % 1 ? n.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : fmt(n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round10 = (v) => Math.round(v / 10) * 10;
const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
};
const reduced = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })();
const animal = (id) => ANIMALS.find((a) => a.id === id) || ANIMALS[0];
const imgSrc = (id) => (id && IMG[id]) || "";
function avatarSrc(t) {
  const a = animal(t.animal);
  if (IMG[a.img]) return IMG[a.img];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='${PAL.usiku3}'/><text x='32' y='42' font-size='28' font-family='Arial' font-weight='700' text-anchor='middle' fill='${a.color}'>${a.name[0]}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
const teamColor = (t) => animal(t.animal).color;

/* ---------- Icons ---------- */
const I = {
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
  full: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.4-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 12.5 5 5 10-11"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13l-3-3M20 15H7l3 3"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><g fill="currentColor" stroke="none"><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/></g></svg>',
  wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h7"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  peak: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 21h20L12 3zm0 4.2 2.6 4.6-1.4-.6-1.2 1.3-1.2-1.3-1.4.6L12 7.2z"/></svg>',
  thumbUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11M3 10h4v11H3zM7 10l4-7c1.7 0 3 1.3 3 3v3h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"/></svg>',
  thumbDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V3M21 14h-4V3h4zM17 14l-4 7c-1.7 0-3-1.3-3-3v-3H4.5a2 2 0 0 1-2-2.3l1.4-8A2 2 0 0 1 5.9 3H17"/></svg>',
  undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>'
};

/* ---------- Kanga cloth pattern (SVG tile as data URI) ---------- */
function kangaPattern(c1, c2, c3 = PAL.usiku) {
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><rect width='40' height='40' fill='${c1}'/><path d='M20 3 37 20 20 37 3 20Z' fill='${c2}'/><path d='M20 11 29 20 20 29 11 20Z' fill='${c1}'/><circle cx='20' cy='20' r='3.2' fill='${c3}'/><circle cx='0' cy='0' r='4.5' fill='${c3}'/><circle cx='40' cy='0' r='4.5' fill='${c3}'/><circle cx='0' cy='40' r='4.5' fill='${c3}'/><circle cx='40' cy='40' r='4.5' fill='${c3}'/></svg>`;
  const enc = encodeURIComponent(s).replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `url('data:image/svg+xml,${enc}')`;
}
const roundColors = (R) => [PAL[R.colors[0]] || PAL.safran, PAL[R.colors[1]] || PAL.theluji];
function roundStyle(R) { const [c1, c2] = roundColors(R); return `--c1:${c1};--c2:${c2};background-image:${kangaPattern(c1, c2)}`; }

/* =====================================================================
   Sound: everything is synthesised with WebAudio (kalimba, shaker, drums)
   ===================================================================== */
const Sound = (() => {
  let ctx = null, master = null, fx = null, musicBus = null, noiseBuf = null, timerId = null, nextT = 0, step = 0, urgent = false;
  let enabled = true;
  const EIGHTH = 60 / 106 / 2;
  const N = { C3: 130.81, F2: 87.31, G2: 98, A2: 110, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 };
  const BARS = [
    { bass: N.C3, arp: ["C5", "E5", "G4", "E5", "C5", "G5", "E5", "D5"] },
    { bass: N.A2, arp: ["A4", "C5", "E5", "C5", "A4", "E5", "D5", "C5"] },
    { bass: N.F2, arp: ["F4", "A4", "C5", "A4", "F4", "C5", "A4", "G4"] },
    { bass: N.G2, arp: ["G4", "B4", "D5", "B4", "G4", "D5", "E5", "D5"] }
  ];
  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); } catch { return false; }
      master = ctx.createGain(); master.gain.value = enabled ? 0.55 : 0; master.connect(ctx.destination);
      fx = ctx.createDelay(1); fx.delayTime.value = 0.19;
      const fb = ctx.createGain(); fb.gain.value = 0.25; const wet = ctx.createGain(); wet.gain.value = 0.16;
      fx.connect(fb); fb.connect(fx); fx.connect(wet); wet.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.42; musicBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return true;
  }
  const ok = () => enabled && init();
  function pluck(freq, t, vel = 0.4, dest = master, dur = 1.3) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(freq, t);
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.setValueAtTime(freq * 5.95, t);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.3, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    const o3 = ctx.createOscillator(); o3.type = "triangle"; o3.frequency.setValueAtTime(freq * 2.01, t);
    const g3 = ctx.createGain(); g3.gain.setValueAtTime(0.14, t); g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g);
    g.connect(dest); g.connect(fx);
    o.start(t); o2.start(t); o3.start(t); o.stop(t + dur + 0.05); o2.stop(t + 0.15); o3.stop(t + 0.5);
  }
  function noise(t, dur, vol, type = "highpass", freq = 6000, q = 0.8, dest = master) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.03);
  }
  function drum(t, freq = 100, vol = 0.5, dur = 0.32, dest = master) {
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(freq * 1.9, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.07);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03);
  }
  function brass(freq, t, dur, vol = 0.16) {
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 2;
    f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2800, t + 0.06); f.frequency.exponentialRampToValueAtTime(1300, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const det of [-6, 6]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = freq; o.detune.value = det; o.connect(f); o.start(t); o.stop(t + dur + 0.05); }
    f.connect(g); g.connect(master); g.connect(fx);
  }
  function playStep(s, t) {
    const bar = BARS[Math.floor(s / 8) % 4], i = s % 8;
    pluck(N[bar.arp[i]], t, i % 2 ? 0.16 : 0.22, musicBus, 0.9);
    if (i === 0) drum(t, bar.bass, 0.32, 0.5, musicBus);
    if (i === 4) drum(t, bar.bass * 1.5, 0.18, 0.25, musicBus);
    if (i === 3 || i === 7) noise(t, 0.05, 0.05, "bandpass", 1800, 1.4, musicBus);
    noise(t, 0.035, i % 2 ? 0.05 : 0.025, "highpass", 7000, 0.7, musicBus);
    if (urgent) noise(t + EIGHTH / 2, 0.03, 0.04, "highpass", 8000, 0.7, musicBus);
  }
  function schedule() { while (nextT < ctx.currentTime + 0.14) { playStep(step, nextT); nextT += EIGHTH; step = (step + 1) % 32; } }
  return {
    get enabled() { return enabled; },
    unlock() { init(); },
    setEnabled(v) { enabled = v; if (ctx) master.gain.setTargetAtTime(v ? 0.55 : 0, ctx.currentTime, 0.05); if (!v) this.stopMusic(); },
    startMusic() { if (!ok()) return; this.stopMusic(); urgent = false; step = 0; nextT = ctx.currentTime + 0.08; timerId = setInterval(schedule, 25); },
    stopMusic() { if (timerId) clearInterval(timerId); timerId = null; },
    setUrgent(v) { urgent = v; },
    tick(last) { if (!ok()) return; const t = ctx.currentTime; pluck(last ? 1568 : 1318, t, 0.18, master, 0.12); noise(t, 0.03, 0.08, "bandpass", 2500, 2); },
    click() { if (!ok()) return; pluck(988, ctx.currentTime, 0.12, master, 0.25); },
    timeUp() { if (!ok()) return; const t = ctx.currentTime; [N.C4, N.G4, N.C5].forEach((f, k) => pluck(f, t + k * 0.015, 0.25, master, 2)); drum(t, 70, 0.6, 0.8); noise(t, 0.6, 0.12, "lowpass", 900, 0.5); },
    count(final) { if (!ok()) return; const t = ctx.currentTime; if (final) { [N.C5, N.E5, N.G5, N.C6].forEach((f) => pluck(f, t, 0.18, master, 1.2)); drum(t, 90, 0.5); } else { pluck(N.G5, t, 0.25, master, 0.5); drum(t, 120, 0.35, 0.2); } },
    drumroll(sec = 1.3) {
      if (!ok()) return; const t0 = ctx.currentTime; let t = t0, gap = 0.07;
      while (t < t0 + sec) { const p = (t - t0) / sec; noise(t, 0.06, 0.05 + p * 0.12, "bandpass", 1900, 1.1); t += gap; gap = Math.max(0.028, gap * 0.94); }
      noise(t0 + sec, 1.2, 0.2, "highpass", 4500, 0.5); drum(t0 + sec, 65, 0.7, 0.7);
    },
    good() { if (!ok()) return; const t = ctx.currentTime + 0.02; [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach((f, k) => pluck(f, t + k * 0.075, 0.24, master, 1.1)); },
    sad() { if (!ok()) return; const t = ctx.currentTime + 0.02; [N.G4, N.E4, N.C4].forEach((f, k) => pluck(f, t + k * 0.2, 0.22, master, 1.2)); },
    whoosh() { if (!ok()) return; const t = ctx.currentTime; const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(3800, t + 0.45); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.6); },
    climb(n = 6) { if (!ok()) return; const t = ctx.currentTime; const sc = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6]; for (let k = 0; k < n; k++) pluck(sc[k % sc.length] * (k >= sc.length ? 2 : 1), t + k * 0.11, 0.15, master, 0.8); },
    fanfare() {
      if (!ok()) return; const t = ctx.currentTime + 0.05;
      [[N.G4, 0, 0.14], [N.G4, 0.15, 0.14], [N.G4, 0.3, 0.14], [N.C5, 0.45, 0.5], [N.G4, 1.0, 0.2], [N.C5, 1.22, 0.2]].forEach(([f, d, l]) => brass(f, t + d, l));
      [N.C5, N.E5, N.G5].forEach((f) => brass(f, t + 1.45, 1.6, 0.11));
      drum(t + 0.45, 80, 0.5, 0.5); drum(t + 1.45, 70, 0.6, 0.9); noise(t + 1.45, 1.8, 0.14, "highpass", 5000, 0.5);
      [N.C6, N.G5, N.E5, N.C5].forEach((f, k) => pluck(f, t + 1.5 + k * 0.08, 0.14, master, 1.6));
    }
  };
})();

/* =====================================================================
   Night sky: twinkling stars + gentle snowfall (canvas)
   ===================================================================== */
const Sky = (() => {
  const cv = document.getElementById("sky"); const cx = cv.getContext("2d");
  let W = 0, H = 0, stars = [], flakes = [], snow = false, last = 0, raf = 0;
  function flake(any) { return { x: Math.random() * W, y: any ? Math.random() * H : -8, r: Math.random() * 2 + 0.7, vy: 14 + Math.random() * 26, vx: -5 + Math.random() * 10, ph: Math.random() * 6.3 }; }
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((W * H) / 6500);
    stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.pow(Math.random(), 1.4) * H * 0.85, r: Math.random() * 1.15 + 0.25, p: Math.random() * 6.3, s: 0.4 + Math.random() * 1.6, warm: Math.random() > 0.86 }));
    flakes = Array.from({ length: Math.round(W / 20) }, () => flake(true));
    if (reduced) draw(0, 0);
  }
  function draw(t, dt) {
    cx.clearRect(0, 0, W, H);
    for (const s of stars) {
      cx.globalAlpha = reduced ? 0.7 : 0.25 + 0.75 * Math.abs(Math.sin((t / 1000) * s.s + s.p));
      cx.fillStyle = s.warm ? "#FFE2A6" : "#FFFFFF"; cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
    }
    if (snow && !reduced) {
      cx.fillStyle = "#FFFFFF";
      for (const f of flakes) {
        f.y += f.vy * dt; f.x += (f.vx + Math.sin(t / 900 + f.ph) * 12) * dt;
        if (f.y > H + 8) Object.assign(f, flake(false));
        cx.globalAlpha = 0.55 + f.r * 0.12; cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283); cx.fill();
      }
    }
    cx.globalAlpha = 1;
  }
  function frame(t) { raf = requestAnimationFrame(frame); if (t - last < 33) return; const dt = Math.min(0.1, (t - last) / 1000); last = t; draw(t, dt); }
  return {
    start() { resize(); addEventListener("resize", resize); if (!reduced) raf = requestAnimationFrame(frame); },
    snow(v) { snow = v; }
  };
})();

/* =====================================================================
   Confetti for the award ceremony
   ===================================================================== */
const Confetti = (() => {
  let cv = null, cx = null, parts = [], raf = 0, until = 0;
  const cols = [PAL.safran, PAL.hibiskus, PAL.bahari, PAL.majani, PAL.udongo, PAL.theluji, PAL.anga];
  function frame() {
    const W = cv.width, H = cv.height; cx.clearRect(0, 0, W, H);
    const now = performance.now();
    if (now < until && parts.length < 420) for (let k = 0; k < 4; k++) parts.push(make(Math.random() * W, -20));
    parts = parts.filter((p) => p.y < H + 40);
    for (const p of parts) {
      p.vy += 0.12; p.vx *= 0.992; p.vy *= 0.992; p.x += p.vx + Math.sin(p.y / 40 + p.ph) * 0.6; p.y += p.vy; p.a += p.va;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.scale(1, Math.cos(p.a * 1.7)); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
    }
    if (parts.length || now < until) raf = requestAnimationFrame(frame); else { cx.clearRect(0, 0, W, H); raf = 0; }
  }
  function make(x, y, burst) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    return { x, y, vx: burst ? (Math.random() - 0.5) * 16 * dpr : (Math.random() - 0.5) * 2, vy: burst ? (-Math.random() * 14 - 4) * dpr : Math.random() * 2 + 1, a: Math.random() * 6.3, va: (Math.random() - 0.5) * 0.3, w: (6 + Math.random() * 8) * dpr, h: (8 + Math.random() * 10) * dpr, c: cols[Math.floor(Math.random() * cols.length)], ph: Math.random() * 6 };
  }
  return {
    fire(sec = 6) {
      if (reduced) return;
      cv = document.getElementById("confetti"); cx = cv.getContext("2d");
      const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
      for (let k = 0; k < 160; k++) parts.push(make(cv.width * (k % 2 ? 0.2 : 0.8), cv.height * 0.55, true));
      until = performance.now() + sec * 1000;
      if (!raf) raf = requestAnimationFrame(frame);
    },
    stop() { until = 0; parts = []; }
  };
})();

/* =====================================================================
   Kilimanjaro artwork (altitude-true: y(1870 m) = 680, y(5895 m) = 120)
   ===================================================================== */
const yAt = (alt) => 680 - ((alt - BASE) / (SUMMIT - BASE)) * 560;
const MTN_BODY = "M0 720 L0 600 L70 566 L140 528 L205 486 L262 440 L310 392 L350 340 L384 286 L410 232 L430 184 L446 150 L458 130 L472 123 L490 120 L505 118 L520 116 L540 118 L560 121 L578 126 L592 134 L606 150 L622 174 L642 204 L666 236 L694 266 L724 292 L752 312 L780 326 L800 320 L814 302 L822 282 L828 262 L832 246 L838 236 L844 248 L850 232 L856 226 L862 238 L868 230 L876 250 L884 268 L896 292 L912 320 L934 356 L958 396 L982 432 L1000 450 L1000 720 Z";
const MTN_SHADE = "M520 116 L540 118 L560 121 L578 126 L592 134 L606 150 L622 174 L642 204 L666 236 L694 266 L724 292 L752 312 L780 326 L800 320 L814 302 L822 282 L828 262 L832 246 L838 236 L844 248 L850 232 L856 226 L862 238 L868 230 L876 250 L884 268 L896 292 L912 320 L934 356 L958 396 L982 432 L1000 450 L1000 720 L610 720 L566 430 Z";
const MTN_SNOW = "M446 150 L458 130 L472 123 L490 120 L505 118 L520 116 L540 118 L560 121 L578 126 L592 134 L606 150 L601 161 L594 157 L587 176 L579 167 L571 188 L562 173 L553 199 L544 181 L535 206 L526 186 L517 212 L508 190 L499 203 L490 184 L481 198 L471 176 L463 187 L455 166 Z";
const MAW_SNOW = "M838 236 L844 248 L850 232 L856 226 L862 238 L858 247 L853 241 L849 259 L843 251 L839 263 L836 247 Z";
function forestPath(w = 1000, top = 646) {
  let d = `M0 720 L0 ${top}`;
  for (let x = 0; x <= w; x += 14) { const h = top - 8 - Math.abs(Math.sin(x * 0.11) * 7) - Math.abs(Math.sin(x * 0.037 + 1) * 6); d += ` Q${x + 7} ${h - 6} ${x + 14} ${top - (x % 28 ? 2 : 4)}`; }
  return d + ` L${w} 720 Z`;
}
function mountainDefs(p) {
  return `<defs>
    <linearGradient id="${p}body" gradientUnits="userSpaceOnUse" x1="0" y1="110" x2="0" y2="720"><stop offset="0" stop-color="#3D4F92"/><stop offset=".45" stop-color="#26357A"/><stop offset="1" stop-color="#141D4A"/></linearGradient>
    <linearGradient id="${p}snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9D6F0"/></linearGradient>
    <filter id="${p}glow" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>`;
}
function mountainBody(p) {
  return `<path d="${MTN_BODY}" fill="url(#${p}body)"/><path d="${MTN_BODY.replace(/^M0 720 L/, "M").replace(/ L1000 720 Z$/, "")}" fill="none" stroke="rgba(246,242,234,.18)" stroke-width="2" stroke-linejoin="round"/>
    <path d="${MTN_SHADE}" fill="rgba(5,8,26,.30)"/>
    <path d="${MTN_SNOW}" fill="#E8F0FF" opacity=".55" filter="url(#${p}glow)"/>
    <path d="${MTN_SNOW}" fill="url(#${p}snow)"/>
    <path d="${MAW_SNOW}" fill="#DCE6F8" opacity=".9"/>
    <path d="${forestPath()}" fill="#0B1E33"/>`;
}
function acacia(x, y, s) {
  const P = (dx, dy) => `${(x + dx * s).toFixed(1)} ${(y - dy * s).toFixed(1)}`;
  return `<path d="M${P(-5, 0)} L${P(-3, 58)} L${P(-30, 96)} L${P(-25, 99)} L${P(-1, 68)} L${P(4, 84)} L${P(7, 82)} L${P(3, 64)} L${P(27, 101)} L${P(32, 98)} L${P(5, 58)} L${P(6, 0)} Z"/>
    <path d="M${P(-98, 96)} Q${P(-84, 120)} ${P(-48, 121)} Q${P(-20, 138)} ${P(18, 128)} Q${P(58, 136)} ${P(100, 104)} Q${P(64, 92)} ${P(14, 98)} Q${P(-40, 90)} ${P(-98, 96)} Z"/>`;
}
function giraffeSil(x, y, s) {
  const P = (dx, dy) => `${(x + dx * s).toFixed(1)} ${(y - dy * s).toFixed(1)}`;
  return `<path d="M${P(-15, 0)} L${P(-13, 50)} L${P(-9, 50)} L${P(-10, 0)} Z M${P(-5, 0)} L${P(-3, 50)} L${P(1, 50)} L${P(0, 0)} Z M${P(17, 0)} L${P(16, 47)} L${P(20, 47)} L${P(21, 0)} Z M${P(25, 0)} L${P(24, 47)} L${P(28, 47)} L${P(29, 0)} Z"/>
    <path d="M${P(-17, 47)} Q${P(-19, 66)} ${P(-4, 67)} L${P(23, 60)} Q${P(33, 56)} ${P(30, 45)} Q${P(8, 41)} ${P(-17, 47)} Z"/>
    <path d="M${P(-17, 56)} L${P(-31, 110)} L${P(-23, 113)} L${P(-5, 64)} Z"/>
    <path d="M${P(-31, 106)} L${P(-45, 101)} Q${P(-49, 106)} ${P(-43, 110)} L${P(-24, 119)} Q${P(-22, 112)} ${P(-31, 106)} Z"/>
    <path d="M${P(-28, 116)} L${P(-29, 124)} M${P(-24, 117)} L${P(-24, 125)} M${P(30, 49)} L${P(35, 30)}" stroke="#05081A" stroke-width="${(2 * s).toFixed(1)}" stroke-linecap="round"/>`;
}
function sceneSVG() {
  return `<svg viewBox="0 0 1600 780" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    ${mountainDefs("s")}
    <defs><radialGradient id="dusk" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#E0693E" stop-opacity=".55"/><stop offset=".45" stop-color="#E5487D" stop-opacity=".18"/><stop offset="1" stop-color="#E5487D" stop-opacity="0"/></radialGradient>
    <radialGradient id="starglow"><stop offset="0" stop-color="#FFF4D6" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4D6" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="1060" cy="780" rx="980" ry="460" fill="url(#dusk)"/>
    <g class="xstar" transform="translate(1080 66)"><circle r="46" fill="url(#starglow)"/><path d="M0 -30 L5 -5 L30 0 L5 5 L0 30 L-5 5 L-30 0 L-5 -5 Z" fill="#FFF7E0"/><path d="M0 -14 L3 -3 L14 0 L3 3 L0 14 L-3 3 L-14 0 L-3 -3 Z" fill="#fff" transform="rotate(45)"/></g>
    <g transform="translate(560 60)">
      <path d="M-560 720 L-560 676 C-420 668 -250 650 -120 626 C-70 616 -30 608 0 600 L0 720 Z" fill="url(#sbody)"/>
      <path d="M1000 450 C1010 470 1020 488 1040 512 L1040 720 L1000 720 Z" fill="url(#sbody)"/>
      ${mountainBody("s")}
    </g>
    <path d="M0 780 L0 728 Q240 712 520 724 T1040 720 T1600 716 L1600 780 Z" fill="#070B1F"/>
    <g fill="#05081A">${acacia(120, 752, 1.1)}${acacia(1470, 756, 1.3)}${acacia(1330, 750, 0.66)}${giraffeSil(470, 748, 0.9)}${giraffeSil(400, 750, 0.68)}</g>
  </svg>`;
}

/* Christmas round picture: an acacia dressed up for Christmas under Kilimanjaro */
function xmasAcaciaSVG() {
  const lights = [], cols = [PAL.safran, PAL.hibiskus, PAL.bahari, PAL.majani, PAL.theluji];
  const pts = [[-86, 101], [-70, 112], [-50, 117], [-30, 122], [-8, 128], [14, 124], [36, 127], [58, 124], [80, 114], [94, 106], [70, 97], [40, 99], [10, 100], [-24, 97], [-58, 97]];
  pts.forEach(([dx, dy], k) => { const x = 200 + dx * 1.45, y = 330 - dy * 1.45; lights.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${cols[k % cols.length]}" opacity=".35"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="${cols[k % cols.length]}"/>`); });
  const stars = Array.from({ length: 38 }, (_, k) => `<circle cx="${(k * 97) % 400}" cy="${(k * 53) % 170}" r="${k % 5 ? 1 : 1.8}" fill="#fff" opacity="${0.4 + (k % 4) * 0.15}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A0F2A"/><stop offset=".7" stop-color="#1B2456"/><stop offset="1" stop-color="#3A2A55"/></linearGradient>
    <radialGradient id="h"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".9"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="400" fill="url(#g)"/>${stars}
    <g transform="translate(-60 105) scale(.52)"><path d="${MTN_BODY}" fill="#2B3B7E"/><path d="${MTN_SNOW}" fill="#EEF3FF"/></g>
    <rect y="350" width="400" height="50" fill="#070B1F"/>
    <g fill="#05081A">${acacia(200, 352, 1.45)}</g>${lights.join("")}
    <circle cx="200" cy="140" r="34" fill="url(#h)"/><path d="M200 116 L206 134 L225 134 L210 145 L216 163 L200 152 L184 163 L190 145 L175 134 L194 134 Z" fill="${PAL.safran}"/>
    <g transform="translate(150 336)"><rect width="34" height="24" rx="3" fill="${PAL.hibiskus}"/><rect x="14" width="6" height="24" fill="${PAL.safran}"/></g>
    <g transform="translate(222 330)"><rect width="30" height="30" rx="3" fill="${PAL.bahari}"/><rect x="12" width="6" height="30" fill="${PAL.theluji}"/></g></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
IMG.xmas_acacia = IMG.xmas_acacia || xmasAcaciaSVG();

/* Board: routes, camps and climbers */
function routePts(i, n) {
  const bx = n === 1 ? 500 : 175 + (650 * i) / (n - 1);
  const sx = 520 + (i - (n - 1) / 2) * 27;
  const pts = [], steps = 10;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, y = 694 - t * (694 - 122);
    let x = bx + (sx - bx) * Math.pow(t, 0.8);
    if (k > 0 && k < steps) x += (k % 2 ? 1 : -1) * 26 * Math.sqrt(1 - t);
    pts.push([x, y]);
  }
  return pts;
}
function pointAt(pts, alt, i = 0, n = 1) {
  const top = pts[pts.length - 1];
  if (alt > SUMMIT) { const k = clamp((alt - SUMMIT) / 600, 0, 1); return [top[0] + (520 + (i - (n - 1) / 2) * 74 - top[0]) * k, Math.max(84, yAt(SUMMIT) - 16 - k * 40)]; }
  const y = yAt(Math.max(BASE, alt));
  for (let k = 0; k < pts.length - 1; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    if (y <= y1 && y >= y2) { const t = (y1 - y) / (y1 - y2 || 1); return [x1 + (x2 - x1) * t, y]; }
  }
  return top;
}
function climbedPts(pts, alt) {
  const p = pointAt(pts, Math.min(alt, SUMMIT)); const out = [pts[0]];
  for (let k = 1; k < pts.length; k++) { if (pts[k][1] > p[1]) out.push(pts[k]); else break; }
  out.push(p); return out;
}
const ptsStr = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
function climberSVG(t, i, x, y) {
  const c = teamColor(t);
  return `<g class="climber" id="cl-${t.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
    <g class="balloon" opacity="0" transform="scale(.62)"><path d="M0 -112 C-34 -112 -40 -74 -24 -52 L-11 -34 L11 -34 L24 -52 C40 -74 34 -112 0 -112 Z" fill="${c}"/><path d="M0 -112 C-12 -100 -12 -54 -6 -34 M0 -112 C12 -100 12 -54 6 -34" stroke="rgba(13,19,48,.35)" stroke-width="4" fill="none"/><path d="M-11 -34 L-17 -20 M11 -34 L17 -20" stroke="${PAL.theluji}" stroke-width="2"/></g>
    <circle r="27" fill="${c}"/><circle r="23" fill="${PAL.usiku}"/>
    <image href="${avatarSrc(t)}" x="-23" y="-23" width="46" height="46" clip-path="url(#clipAv)" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
}
function boardSVG(teams) {
  const n = teams.length;
  const camps = CAMPS.map((c) => { const y = yAt(c.a); return `<g><line x1="20" x2="985" y1="${y}" y2="${y}" stroke="rgba(246,242,234,.16)" stroke-dasharray="3 7"/><rect x="8" y="${y - 12}" width="${c.n.length * 8.4 + 70}" height="24" rx="12" fill="rgba(13,19,48,.78)"/><text x="18" y="${y + 5}" class="camp-l">${esc(c.n)} <tspan class="camp-a">${fmt(c.a)} m</tspan></text></g>`; }).join("");
  const routes = teams.map((t, i) => { const pts = routePts(i, n); return `<polyline points="${ptsStr(pts)}" fill="none" stroke="${teamColor(t)}" stroke-opacity=".28" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round" stroke-linejoin="round"/><polyline id="tr-${t.id}" points="${ptsStr([pts[0], pts[0]])}" fill="none" stroke="${teamColor(t)}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`; }).join("");
  const climbers = teams.map((t, i) => { const p = pointAt(routePts(i, n), BASE); return climberSVG(t, i, p[0], p[1]); }).join("");
  return `<svg viewBox="0 0 1000 720" role="img" aria-label="Höhenprofil des Kilimandscharo mit den Seilschaften">
    ${mountainDefs("b")}<defs><clipPath id="clipAv"><circle r="23"/></clipPath></defs>
    ${mountainBody("b")}
    <g transform="translate(520 116)"><path d="M0 0 V-36" stroke="${PAL.theluji}" stroke-width="3"/><path d="M0 -36 L22 -29 L0 -22 Z" fill="${PAL.safran}"/></g>
    ${camps}${routes}${climbers}
  </svg>`;
}

/* =====================================================================
   State
   ===================================================================== */
function defaultTeams(n) { return ANIMALS.slice(0, n).map((a, i) => ({ id: "t" + i, animal: a.id, name: a.name, members: "" })); }
function randomCode() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
const savedSetup = store.get(SETUP_KEY) || (() => { const old = store.get("gipfelquiz.setup.v1"); return old && Array.isArray(old.teams) ? { teams: old.teams, sound: old.sound, timer: old.timer } : null; })();
let setup = Object.assign({ teams: defaultTeams(4), rounds: ROUNDS.filter((r) => r.def !== false).map((r) => r.id), perRound: 2, timer: 30, sound: true, mode: "screen", code: randomCode() },
  savedSetup && Array.isArray(savedSetup.teams) ? savedSetup : {});
setup.rounds = setup.rounds.filter((id) => ROUNDS.some((r) => r.id === id));
if (!setup.code) setup.code = randomCode();
if (setup.mode !== "live") setup.mode = "screen";
let game = null;
let view = "title";
let timer = null;
let modalOpen = false;
let renderToken = 0;
let entryCursor = 0;

const roundById = (id) => (id === "final" ? { id: "final", kind: "final", title: "Gipfelsturm", sub: "Das große Finale", colors: ["safran", "hibiskus"], img: "uhuru", saying: { sw: "Pole pole ndio mwendo.", de: "Langsam, langsam – so kommt man voran." } } : ROUNDS.find((r) => r.id === id));
function current() {
  const p = game.plan[game.r]; const R = roundById(p.round);
  let Q;
  if (p.round === "final") Q = game.tiebreak ? TIEBREAK : FINAL;
  else Q = R.questions[p.qs[game.i]];
  const kind = p.round === "final" ? (game.tiebreak ? "est" : "final") : R.kind;
  return { p, R, Q, kind };
}
function roundPill(R, n) { return R.kind === "zoom" ? `${n} Bilder` : R.kind === "est" ? `${n} Schätzfragen` : R.kind === "tf" ? `${n} × Wahr/Falsch` : `${n} Fragen`; }
function perRoundCount(R, per) { return Math.min(R.questions.length, per + (R.kind === "tf" ? 2 : R.kind === "zoom" ? 1 : 0)); }
function calcUnit(q, live) { return clamp(round10((SUMMIT - BASE) / (Math.max(q, 1) * 0.72 * (live ? 1.25 : 1))), 50, 400); }
function planStats(s) {
  let q = 0, sec = 0;
  for (const R of ROUNDS) {
    if (!s.rounds.includes(R.id)) continue;
    const n = perRoundCount(R, s.perRound); q += n;
    const live = s.mode === "live";
    const per = R.kind === "tf" ? (live ? 30 : 50) : R.kind === "zoom" ? (live ? 55 : 75) : R.kind === "est" ? (live ? 80 : 120) : (live ? Math.round(s.timer * 0.6) + 30 : s.timer + 55);
    sec += n * per + 80;
  }
  sec += 260;
  return { q, min: Math.max(10, Math.round(sec / 300) * 5), unit: calcUnit(q, s.mode === "live") };
}
function buildPlan(s) {
  const seen = new Set(store.get(SEEN_KEY) || []);
  const plan = [];
  for (const R of ROUNDS) {
    if (!s.rounds.includes(R.id)) continue;
    const n = perRoundCount(R, s.perRound);
    const idx = R.questions.map((_, i) => i);
    let pick = shuffle(idx.filter((i) => !seen.has(R.id + ":" + i)));
    if (pick.length < n) pick = pick.concat(shuffle(idx.filter((i) => seen.has(R.id + ":" + i))));
    plan.push({ round: R.id, qs: pick.slice(0, n) });
  }
  plan.push({ round: "final", qs: [0] });
  // remember what was used so the next game brings fresh questions
  const used = plan.flatMap((p) => p.qs.map((i) => p.round + ":" + i));
  const all = new Set([...seen, ...used]);
  for (const R of ROUNDS) { const keys = R.questions.map((_, i) => R.id + ":" + i); if (keys.every((k) => all.has(k))) keys.forEach((k) => { if (!used.includes(k)) all.delete(k); }); }
  store.set(SEEN_KEY, [...all]);
  return plan;
}
function save() { if (game && !game.finished) store.set(SAVE_KEY, game); }
function saveSetup() { store.set(SETUP_KEY, setup); }
const teamById = (id) => game.teams.find((t) => t.id === id);

/* =====================================================================
   Rendering helpers
   ===================================================================== */
const app = document.getElementById("app");
const scene = document.getElementById("scene");
scene.innerHTML = sceneSVG();
function setScene(mode) { scene.dataset.mode = mode; Sky.snow(mode === "title" || mode === "snow"); }
function mount(html) { app.innerHTML = html; app.scrollTop = 0; window.scrollTo(0, 0); }
function ctrls() {
  return `<div class="ctrls">
    <button class="icon-btn ${Sound.enabled ? "" : "off"}" data-act="sound" aria-label="${Sound.enabled ? "Ton aus" : "Ton an"}" title="Ton (M)">${Sound.enabled ? I.sound : I.mute}</button>
    <button class="icon-btn" data-act="fullscreen" aria-label="Vollbild" title="Vollbild (F)">${I.full}</button>
    ${game ? `<button class="icon-btn" data-act="menu" aria-label="Menü" title="Menü">${I.menu}</button>` : ""}
  </div>`;
}
function topbar(showDots = true) {
  const { p, R } = current();
  const n = p.qs.length;
  const dots = showDots && n > 1 ? `<div class="dots" aria-hidden="true">${p.qs.map((_, k) => `<i class="${k < game.i ? "done" : k === game.i ? "now" : ""}"></i>`).join("")}</div>` : "";
  const ts = game.teams.map((t) => `<div class="ts" id="ts-${t.id}" style="--tc:${teamColor(t)}"><img src="${avatarSrc(t)}" alt=""><span><b>${esc(t.name)}</b><em>${fmt(t.score)} m</em></span></div>`).join("");
  return `<header class="topbar">
    <div class="round-badge"><span class="sw" style="${roundStyle(R)}"></span><span><b>${esc(R.title)}</b><br><small>Runde ${game.r + 1} von ${game.plan.length}</small></span>${dots}</div>
    <div class="teamstrip">${ts}</div>${ctrls()}
  </header>`;
}
function toast(html, ms = 4200) {
  const box = document.getElementById("toasts"); const el = document.createElement("div");
  el.className = "toast"; el.innerHTML = html; box.appendChild(el); setTimeout(() => el.remove(), ms);
}

/* =====================================================================
   Views
   ===================================================================== */
function renderView() {
  renderToken++; stopTimer(); Confetti.stop(); document.getElementById("toasts").innerHTML = "";
  document.body.classList.toggle("is-player", view === "player");
  if (view === "player") return viewPlayer();
  if (view === "title") return viewTitle();
  if (view === "setup") return viewSetup();
  if (!game) { view = "title"; return viewTitle(); }
  switch (game.phase) {
    case "intro": return viewIntro();
    case "wager": return viewWager();
    case "question": return viewQuestion();
    case "board": return viewBoard();
    case "podium": return viewPodium();
    default: game.phase = "intro"; return viewIntro();
  }
}

/* ---------- Title ---------- */
function viewTitle() {
  setScene("title");
  const saved = store.get(SAVE_KEY);
  const resumable = saved && saved.plan && saved.phase && saved.phase !== "podium";
  let resumeInfo = "";
  if (resumable) { const p = saved.plan[saved.r]; const R = roundById(p.round); resumeInfo = `Runde ${saved.r + 1}: ${R ? R.title : ""}`; }
  const topics = [["Allgemeinwissen", PAL.anga], ["Geografie", PAL.bahari], ["Tiere", PAL.majani], ["Tansania", PAL.safran], ["Fußball", PAL.anga], ["Pferde", PAL.udongo], ["Ballett", PAL.hibiskus], ["Kino & Musik", PAL.hibiskus], ["Weihnachten", PAL.theluji]];
  mount(`<section class="screen title-screen">
    <header class="topbar" style="justify-content:flex-end">${ctrls()}</header>
    <div class="title-wrap">
      <p class="eyebrow">Krismasi Njema · Frohe Weihnachten</p>
      <div class="wordmark-row"><h1 class="wordmark">Gipfel<span>quiz</span></h1><span class="alt-badge">${I.peak} Uhuru Peak · 5.895 m</span></div>
      <p class="tagline">Das Familienquiz vom Kilimandscharo</p>
      <p class="lede">Bildet Seilschaften und klettert mit jeder richtigen Antwort ein Stück höher – gemeinsam am Fernseher oder live mit euren Handys. Wer steht am Ende ganz oben?</p>
      <ul class="topics">${topics.map(([t, c]) => `<li style="--c:${c}"><i></i>${t}</li>`).join("")}</ul>
      <div class="title-actions">
        ${isPhone() ? `<button class="btn primary big" data-act="playerJoin" data-primary>${I.phone} Am Handy mitspielen</button>` : ""}
        ${resumable ? `<button class="btn ${isPhone() ? "" : "primary"} big" data-act="resume" ${isPhone() ? "" : "data-primary"}>${I.play} Weiterspielen <small>${esc(resumeInfo)}</small></button><button class="btn big" data-act="new">Neues Spiel</button>` : `<button class="btn ${isPhone() ? "" : "primary"} big" data-act="new" ${isPhone() ? "" : "data-primary"}>Expedition planen ${I.arrow}</button>`}
        ${isPhone() ? "" : `<button class="btn big" data-act="playerJoin">${I.phone} Am Handy mitspielen</button>`}
        <button class="btn ghost big" data-act="rules">So wird gespielt</button>
      </div>
      <p class="title-foot">Tipp: Laptop an den Fernseher anschließen und mit <b>F</b> auf Vollbild schalten. · <button class="linkbtn" data-act="credits">Bildnachweise</button></p>
    </div>
  </section>`);
}

/* ---------- Setup ---------- */
function teamCard(t, i) {
  const a = animal(t.animal);
  return `<div class="tcard" style="--tc:${a.color}">
    <button class="tcard-av" data-act="animal" data-i="${i}" aria-label="Tier von Team ${i + 1} wechseln" title="Tier wechseln"><img src="${avatarSrc(t)}" alt=""><span class="swap">${I.swap}</span></button>
    <div class="tcard-fields">
      <input class="tname" id="tname-${i}" data-i="${i}" data-field="name" value="${esc(t.name)}" maxlength="18" aria-label="Name von Team ${i + 1}" autocomplete="off">
      <span class="tcard-sub">${esc(a.de)} · ${ROUTES[i]}-Route <span class="devchip" id="dev-${t.id}"></span></span>
      <input class="tmem" id="tmem-${i}" data-i="${i}" data-field="members" value="${esc(t.members)}" maxlength="80" placeholder="Wer ist dabei? z. B. Oma, Lea, Ben" aria-label="Mitglieder von Team ${i + 1}" autocomplete="off">
    </div>
  </div>`;
}
function viewSetup() {
  setScene("dim");
  const st = planStats(setup);
  const rows = ROUNDS.map((R) => {
    const on = setup.rounds.includes(R.id); const [c1, c2] = roundColors(R);
    return `<button class="rrow-set" data-act="toggleRound" data-id="${R.id}" aria-pressed="${on}"><span class="chk">${I.check}</span><span class="swatch" style="background-color:${c1};background-image:${kangaPattern(c1, c2)}"></span><span><b>${esc(R.title)}</b><span class="s">${esc(R.sub)}</span></span><span class="kind">${roundPill(R, perRoundCount(R, setup.perRound))}</span></button>`;
  }).join("");
  const seg = (key, vals, suffix = "") => `<div class="seg" role="group">${vals.map((v) => `<button data-act="seg" data-key="${key}" data-v="${v}" aria-pressed="${setup[key] === v}">${v}${suffix}</button>`).join("")}</div>`;
  mount(`<section class="screen setup">
    <header class="setup-head">
      <button class="icon-btn" data-act="home" aria-label="Zurück zum Start">${I.back}</button>
      <div><p class="eyebrow">Vor dem Aufstieg</p><h2>Expedition planen</h2></div>
      <div style="margin-left:auto">${ctrls()}</div>
    </header>
    <div class="setup-grid">
      <div class="panel">
        ${modePickHTML()}
        <div class="panel-head"><h3>Seilschaften</h3>
          <div class="head-tools"><button class="btn ghost small" data-act="draw">${I.dice} Auslosen</button>
          <div class="stepper"><button data-act="teams" data-d="-1" aria-label="Ein Team weniger">−</button><b>${setup.teams.length} Teams</b><button data-act="teams" data-d="1" aria-label="Ein Team mehr">+</button></div></div></div>
        <p class="hint">Bei 12 Leuten passen 4 Teams à 3 – am besten Jung und Alt gemischt. Tippt auf ein Tier, um es zu tauschen.</p>
        <div class="team-cards">${setup.teams.map(teamCard).join("")}</div>
        ${setup.mode === "live" ? liveBoxHTML() : ""}
      </div>
      <div class="panel">
        <h3>Route</h3>
        <div class="round-list">${rows}</div>
        <div class="opts">
          <div class="opt"><span>Fragen pro Runde</span>${seg("perRound", [2, 3, 4, 5])}</div>
          <div class="opt"><span>Bedenkzeit pro Frage</span>${seg("timer", [20, 30, 45, 60], " s")}</div>
        </div>
        <div class="summary"><span><b>${st.q + 1} Fragen</b> inkl. Finale</span><span>ca. <b>${st.min} Minuten</b></span><span>+${fmt(st.unit)} m pro richtiger Antwort${setup.mode === "live" ? " (+ bis zu 50 % Tempo-Bonus)" : ""}</span></div>
      </div>
    </div>
    <footer class="setup-foot"><span class="hint">Start für alle: Marangu Gate auf 1.870 m. Ziel: Uhuru Peak auf 5.895 m.</span><button class="btn primary big" data-act="start" data-primary ${setup.rounds.length ? "" : "disabled"}>Aufbruch zum Gipfel ${I.arrow}</button></footer>
  </section>`);
}

/* ---------- Round intro ---------- */
function viewIntro() {
  setScene("dim"); Sky.snow(false);
  const { p, R } = current();
  const isFinal = p.round === "final";
  const rules = isFinal ? [
    "Erst kommt nur die Kategorie. Jedes Team entscheidet, wie viele Höhenmeter es setzt.",
    "Richtige Antwort: Die gesetzten Meter geht es hinauf. Falsche Antwort: Es geht wieder hinunter.",
    "Danach wird die Rangfolge geklärt – und die Gipfelurkunde verliehen."
  ] : R.rules || null;
  const meta = isFinal ? `<span>1 Frage</span><span>Einsatz bis ${fmt(game.unit * 6)} m</span>` : `<span>${p.qs.length} Fragen</span><span>${KIND_LABEL[R.kind]}</span>${R.kind === "mc" ? `<span>+${fmt(game.unit)} m pro richtiger Antwort</span>` : ""}`;
  const pic = imgSrc(R.img);
  mount(`<section class="screen intro">
    ${topbar(false)}
    <div class="kanga" style="${roundStyle(R)}">
      <div class="kanga-in">
        <div class="intro-grid">
          <div>
            <p class="intro-num">${isFinal ? "Finale" : `Runde ${game.r + 1} von ${game.plan.length}`}</p>
            <h2 class="intro-title">${esc(R.title)}</h2>
            <p class="intro-sub">${esc(R.sub)}</p>
            <div class="intro-meta">${meta}</div>
            ${rules ? `<ol class="rules">${rules.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>` : ""}
          </div>
          ${pic ? `<div class="intro-img"><img src="${pic}" alt="" style="${posOf(R.img)}"></div>` : ""}
        </div>
        <div class="jina"><p class="sw">${esc(R.saying.sw)}</p><p class="de">${esc(R.saying.de)}</p></div>
      </div>
    </div>
    <div class="intro-actions"><button class="btn primary big pulse" data-act="beginRound" data-primary>${isFinal ? "Einsätze festlegen" : "Los geht’s"} ${I.arrow}</button></div>
  </section>`);
  Sound.whoosh();
}

/* ---------- Final: wager ---------- */
function viewWager() {
  setScene("off");
  const u = game.unit; const steps = [0, 2 * u, 4 * u, 6 * u];
  game.wagers = game.wagers || {};
  game.teams.forEach((t) => { if (game.wagers[t.id] === undefined) game.wagers[t.id] = 2 * u; });
  const cards = wagerCardsHTML(); void steps;
  mount(`<section class="screen q wager-screen">
    ${topbar(false)}
    <div class="qmain"><div class="qcol">
      <p class="qkicker">Gipfelsturm · Kategorie</p>
      <h2 class="qtext">${esc(FINAL.cat)}</h2>
      <p class="hint" style="font-size:1.15rem">${esc(FINAL.hint)} Wie sicher seid ihr? Richtig: Meter rauf. Falsch: Meter runter.</p>
    </div></div>
    <div class="qfoot"><div class="entry"><div class="entry-label"><b>Einsätze</b><span>${game.mode === "live" ? "Teams mit Handy setzen geheim am Handy, die anderen sagen es laut." : "Jedes Team sagt, wie viele Höhenmeter es setzt."}</span></div><div class="eteams" id="wagerteams">${cards}</div>
      <div class="entry-go"><button class="btn primary big" data-act="showFinal" data-primary>Frage zeigen ${I.arrow}</button></div></div></div>
  </section>`);
  save();
}

/* ---------- Question ---------- */
function newCur(kind, Q) {
  const c = { picks: {}, jokers: {}, est: {}, times: {}, stage: "run", gains: null, remaining: null };
  if (kind === "mc" || kind === "zoom" || kind === "final") {
    if (typeof Q.fixed === "number") { c.order = [0, 1, 2, 3]; c.correct = Q.fixed; }
    else { c.order = shuffle([0, 1, 2, 3]); c.correct = c.order.indexOf(0); }
  } else if (kind === "tf") { c.order = [0, 1]; c.correct = Q.a ? 0 : 1; }
  return c;
}
function durationFor(kind) {
  if (kind === "tf") return Math.max(12, Math.round(game.settings.timer / 2));
  if (kind === "est") return 45;
  if (kind === "zoom") return 30;
  if (kind === "final") return 45;
  return game.settings.timer;
}
const optLabels = (kind, Q, cur) => (kind === "tf" ? ["Wahr", "Falsch"] : cur.order.map((k) => Q.o[k]));
function tilesHTML(kind, Q, cur) {
  if (kind === "est") return "";
  const labels = optLabels(kind, Q, cur);
  const cls = kind === "tf" ? "tiles tf" : kind === "zoom" ? "tiles list" : "tiles";
  return `<div class="${cls}" id="tiles">${labels.map((l, k) => {
    const num = kind === "tf" ? (k === 0 ? I.thumbUp : I.thumbDown) : k + 1;
    const kk = kind === "tf" ? (k === 0 ? 3 : 0) : k;
    const body = Q.flags ? `<span class="tile-flag">${flagSVG(l)}<span class="flagname">${esc(FLAG_NAMES[l] || "")}</span></span>` : `<span class="tile-text">${esc(l)}</span>`;
    return `<div class="tile k${kk}${Q.flags ? " has-flag" : ""}" id="tile-${k}" style="--n:${k}"><span class="tile-num">${num}</span>${body}<span class="tile-chips" id="chips-${k}"></span></div>`;
  }).join("")}</div>`;
}
function timerHTML(total) {
  return `<div class="timer" id="timer"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="44"/><circle class="arc" id="tarc" cx="50" cy="50" r="44" stroke-dasharray="276.46" stroke-dashoffset="0"/></svg><b id="tnum">${total}</b></div>`;
}
function viewQuestion() {
  const { p, R, Q, kind } = current();
  setScene("off");
  if (!game.cur) { game.cur = newCur(kind, Q); save(); }
  const cur = game.cur;
  const total = durationFor(kind);
  const n = p.qs.length;
  const kicker = p.round === "final" ? (game.tiebreak ? "Stechen um Platz 1" : "Gipfelsturm · Finalfrage") : `Frage ${game.i + 1} von ${n}`;
  const pic = imgSrc(Q.img);
  let main;
  if (kind === "zoom") {
    main = `<div class="qmain zoom"><div class="zoomframe" id="zframe"><img id="zimg" src="${pic}" alt="Bildausschnitt"><span class="zlens" id="zlens"></span></div>
      <div class="qcol"><div class="qhead"><div><p class="qkicker">${kicker}</p><h2 class="qtext">${esc(Q.q)}</h2></div>${timerHTML(total)}</div>${tilesHTML(kind, Q, cur)}</div></div>`;
  } else {
    const unit = kind === "est" ? `<span class="qunit">Antwort in ${esc(Q.u)}</span>` : "";
    main = `<div class="qmain ${pic ? "has-img" : ""}">${pic ? `<figure class="qimg" id="qimg"><img src="${pic}" alt="" style="${posOf(Q.img)}"></figure>` : ""}
      <div class="qcol"><div class="qhead"><div><p class="qkicker">${kicker}</p><h2 class="qtext">${esc(Q.q)}</h2>${unit}</div>${timerHTML(total)}</div>${tilesHTML(kind, Q, cur)}${kind === "est" ? `<div id="estline"></div>` : ""}</div></div>`;
  }
  mount(`<section class="screen q q-${kind}">${topbar(true)}${main}<div class="qfoot" id="qfoot"></div></section>`);
  if (kind === "zoom") setupZoom(Q);
  if (cur.stage === "revealed") { paintPicks(); renderRevealed(false); return; }
  paintPicks();
  if (cur.stage === "entry") { finishTimerVisual(); renderFoot(); return; }
  // stage "run"
  renderFoot();
  startTimer(cur.remaining ?? total, total, kind);
}
function setupZoom(Q) {
  const im = $("#zimg"); if (!im) return;
  im.style.transformOrigin = "0 0";
  applyZoom(game.cur.stage === "run" ? (game.cur.remaining ?? 30) / 30 : 0, Q);
}
function applyZoom(remainingFrac, Q) {
  const im = $("#zimg"); if (!im) return;
  const Z = Q.z || 6;
  const prog = clamp((1 - remainingFrac) / 0.85, 0, 1);
  const s = Math.pow(Z, 1 - prog);
  const k = Z > 1 ? (Z - s) / (Z - 1) : 1, h = 0.5 / s;
  const cx = clamp((Q.fx ?? 0.5) + (0.5 - (Q.fx ?? 0.5)) * k, h, 1 - h), cy = clamp((Q.fy ?? 0.5) + (0.5 - (Q.fy ?? 0.5)) * k, h, 1 - h);
  im.style.transform = `translate(${(-(s * cx - 0.5) * 100).toFixed(3)}%, ${(-(s * cy - 0.5) * 100).toFixed(3)}%) scale(${s.toFixed(4)})`;
  const lens = $("#zlens"); if (lens) lens.textContent = s > 1.05 ? `${s.toFixed(1).replace(".", ",")}× Zoom` : "Ganzes Bild";
}

/* ---------- Footer area under the question (controls / entry / results) ---------- */
function renderFoot() {
  const { kind } = current(); const cur = game.cur; const foot = $("#qfoot"); if (!foot) return;
  if (game.mode === "live" && cur.stage !== "revealed") return renderLiveFoot();
  if (cur.stage === "run" && kind !== "zoom") {
    foot.innerHTML = `<div class="runbar">
      <button class="btn" data-act="pause" id="pausebtn">${I.pause} Pause</button>
      <button class="btn" data-act="addTime">${I.plus} 10 Sekunden</button>
      <span class="spacer"></span>
      <span class="note">${kind === "est" ? "Schreibt eure Schätzung auf einen Zettel." : kind === "tf" ? "Gleich zeigen alle: Daumen hoch oder runter." : "Gleich zeigen alle Teams gleichzeitig ihre Antwort mit 1 bis 4 Fingern."}</span>
      <button class="btn primary" data-act="stopTime" data-primary>${I.stop} Zeit stoppen</button></div>`;
    return;
  }
  foot.innerHTML = entryHTML(kind);
  updateEntryState();
}
function entryHTML(kind, teams = activeTeams(), withGo = true) {
  const cur = game.cur; const { Q } = current();
  const label = kind === "zoom" ? `<b>Wer ruft zuerst?</b><span>Tippt die Antwort eines Teams an, sobald es sie ruft. Jedes Team hat einen Versuch.</span>`
    : kind === "est" ? `<b>Schätzungen eintragen</b><span>Was steht auf den Zetteln? Kommazahlen mit Komma.</span>`
    : kind === "tf" ? `<b>Antworten eintragen</b><span>Daumen hoch = Wahr, runter = Falsch. Tasten W und F gehen auch.</span>`
    : `<b>Antworten eintragen</b><span>Was hat jedes Team gezeigt? Zahlentasten 1–4 tragen der Reihe nach ein.</span>`;
  const cards = teams.map((t) => {
    let body;
    if (kind === "est") {
      const v = cur.est[t.id] ?? "";
      body = `<div class="est-row"><input class="est-input" id="est-${t.id}" data-team="${t.id}" inputmode="decimal" autocomplete="off" value="${esc(v)}" aria-label="Schätzung von ${esc(t.name)}"><span>${esc(Q.u)}</span></div>`;
    } else {
      const labels = optLabels(kind, Q, cur);
      const btns = labels.map((l, k) => {
        const kk = kind === "tf" ? (k === 0 ? 3 : 0) : k;
        const inner = kind === "tf" ? (k === 0 ? `${I.thumbUp}` : `${I.thumbDown}`) : k + 1;
        return `<button class="eopt k${kk}" data-act="pick" data-team="${t.id}" data-k="${k}" aria-label="${esc(t.name)}: ${esc(Q.flags ? (FLAG_NAMES[l] || l) : l)}" aria-pressed="false">${inner}</button>`;
      }).join("");
      const joker = kind === "mc" || kind === "tf" ? `<button class="joker" data-act="joker" data-team="${t.id}" ${t.joker ? "" : "disabled"} title="Einmal pro Spiel: doppelte Höhenmeter">${I.wind} ${t.joker ? "Rückenwind ×2" : "Rückenwind verbraucht"}</button>` : "";
      const zt = kind === "zoom" ? `<span class="zt" id="zt-${t.id}"></span>` : "";
      body = `<div class="eopts">${btns}</div>${joker}${zt}`;
    }
    return `<div class="eteam" id="et-${t.id}" style="--tc:${teamColor(t)}"><div class="eteam-id"><img src="${avatarSrc(t)}" alt=""><b>${esc(t.name)}</b><span class="res" id="res-${t.id}"></span></div>${body}</div>`;
  }).join("");
  const go = withGo ? `<div class="entry-go">
    ${kind === "zoom" && cur.stage === "run" ? `<button class="btn" data-act="pause" id="pausebtn">${I.pause} Pause</button>` : ""}
    <button class="btn primary big" data-act="reveal" data-primary id="revealbtn">Auflösen ${I.arrow}</button></div>` : "";
  const lbl = withGo ? label : `<b>Ohne Handy</b><span>Antworten dieser Teams hier eintragen.</span>`;
  return `<div class="entry"><div class="entry-label">${lbl}</div><div class="eteams">${cards}</div>${go}</div>`;
}
function activeTeams() { return game.tiebreak ? game.teams.filter((t) => game.tiebreak.includes(t.id)) : game.teams; }
function updateEntryState() {
  const cur = game.cur; const { kind } = current();
  for (const t of activeTeams()) {
    const card = $("#et-" + t.id); if (!card) continue;
    const pick = cur.picks[t.id];
    $$(".eopt", card).forEach((b) => { const on = Number(b.dataset.k) === pick; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    const has = kind === "est" ? cur.est[t.id] !== undefined && String(cur.est[t.id]).trim() !== "" : pick !== undefined;
    card.classList.toggle("set", has);
    const j = $(".joker", card); if (j && t.joker) j.classList.toggle("on", !!cur.jokers[t.id]);
    if (kind === "zoom") { const z = $("#zt-" + t.id); if (z) z.textContent = cur.times[t.id] !== undefined ? `gerufen nach ${(cur.times[t.id] * 30).toFixed(1).replace(".", ",")} s` : ""; }
  }
  if (kind !== "est") { const next = activeTeams().find((t) => cur.picks[t.id] === undefined); $$(".eteam").forEach((c) => c.classList.remove("next")); if (next && cur.stage === "entry") $("#et-" + next.id)?.classList.add("next"); }
}
function paintPicks() {
  const cur = game.cur; const { kind } = current(); if (kind === "est") return;
  if (game.mode === "live" && cur.stage !== "revealed") { $$(".tile-chips").forEach((c) => (c.innerHTML = "")); return; }
  for (const t of activeTeams()) {
    const k = cur.picks[t.id];
    const target = k === undefined ? null : $("#chips-" + k);
    const style = cur.jokers[t.id] ? `box-shadow:0 0 0 .16rem ${PAL.safran},0 0 0 .32rem #fff` : "";
    const existing = $(`.tile-chips img[data-team="${t.id}"]`);
    if (existing && existing.parentElement === target) { existing.setAttribute("style", style); continue; }
    existing?.remove();
    if (target) target.insertAdjacentHTML("beforeend", `<img data-team="${t.id}" src="${avatarSrc(t)}" alt="${esc(t.name)}" title="${esc(t.name)}${cur.jokers[t.id] ? " (Rückenwind)" : ""}" style="${style}">`);
  }
}

/* ---------- Timer ---------- */
function startTimer(remaining, total, kind) {
  stopTimer();
  timer = { total, remaining, running: true, last: performance.now(), lastSec: Math.ceil(remaining), kind, raf: 0 };
  Sound.startMusic();
  const loop = (now) => {
    if (!timer) return;
    timer.raf = requestAnimationFrame(loop);
    if (!timer.running) { timer.last = now; return; }
    const dt = (now - timer.last) / 1000; timer.last = now;
    timer.remaining = Math.max(0, timer.remaining - dt);
    paintTimer();
    if (kind === "zoom") applyZoom(timer.remaining / timer.total, current().Q);
    const sec = Math.ceil(timer.remaining);
    if (sec !== timer.lastSec) {
      timer.lastSec = sec;
      if (sec <= 5 && sec > 0) Sound.tick(sec === 1);
      if (sec === 10) Sound.setUrgent(true);
      if (game.cur) game.cur.remaining = timer.remaining;
    }
    if (timer.remaining <= 0) { cancelAnimationFrame(timer.raf); const k = timer.kind; timer = null; Sound.stopMusic(); onTimeUp(k); }
  };
  paintTimer();
  timer.raf = requestAnimationFrame(loop);
}
function paintTimer() {
  if (!timer) return;
  const frac = timer.remaining / timer.total;
  const arc = $("#tarc"); if (arc) arc.setAttribute("stroke-dashoffset", String(276.46 * (1 - frac)));
  const num = $("#tnum"); if (num) num.textContent = String(Math.ceil(timer.remaining));
  const box = $("#timer"); if (box) { box.classList.toggle("low", timer.remaining <= 5.0 && timer.remaining > 0); box.classList.toggle("paused", !timer.running); }
}
function finishTimerVisual() { const arc = $("#tarc"); if (arc) arc.setAttribute("stroke-dashoffset", "276.46"); const num = $("#tnum"); if (num) num.textContent = "0"; $("#timer")?.classList.add("done"); }
function stopTimer() { if (timer) { cancelAnimationFrame(timer.raf); timer = null; } Sound.stopMusic(); }
function togglePause() {
  if (!timer) return;
  timer.running = !timer.running;
  if (timer.running) Sound.startMusic(); else { Sound.stopMusic(); if (game.cur) { game.cur.remaining = timer.remaining; save(); } }
  const b = $("#pausebtn"); if (b) b.innerHTML = timer.running ? `${I.pause} Pause` : `${I.play} Weiter`;
  paintTimer(); broadcast();
}
async function onTimeUp(kind) {
  const cur = game.cur; if (!cur || cur.stage !== "run") return;
  Sound.timeUp(); finishTimerVisual();
  if (game.mode === "live") return liveTimeUp(kind, cur);
  if (kind === "zoom") { cur.stage = "entry"; cur.remaining = 0; save(); applyZoom(0, current().Q); renderFoot(); if (activeTeams().some((t) => cur.picks[t.id] === undefined)) toast(`${I.flag} Zeit um! Wer noch nicht gerufen hat, sagt jetzt seine Antwort.`); return; }
  cur.stage = "entry"; cur.remaining = 0; save();
  await showCountdown(kind);
  if (game.cur === cur && cur.stage === "entry") renderFoot();
}
async function showCountdown(kind) {
  const ov = document.createElement("div"); ov.className = "overlay";
  const head = kind === "est" ? "Stifte weg!" : "Zeit ist um!";
  const sub = kind === "est" ? "Zeigt eure Zettel" : kind === "tf" ? "Daumen hoch oder runter – auf drei" : "Antwort mit den Fingern zeigen – auf drei";
  document.body.appendChild(ov);
  if (reduced) { ov.innerHTML = `<div class="big"><p class="headline">${head}</p><p>${sub}</p></div>`; await sleep(1400); ov.remove(); return; }
  const steps = ["1", "2", "3"];
  for (const s of steps) { ov.innerHTML = `<div class="big"><p class="headline">${head}</p><p>${sub}</p><div class="count">${s}</div></div>`; Sound.count(false); await sleep(780); }
  ov.innerHTML = `<div class="big"><p class="headline">${head}</p><p>${sub}</p><div class="count go">${kind === "est" ? "Hoch damit!" : "Zeigen!"}</div></div>`; Sound.count(true);
  await sleep(1100); ov.remove();
}
function stopTimeEarly() {
  if (!timer || !game.cur || game.cur.stage !== "run") return;
  const k = timer.kind; cancelAnimationFrame(timer.raf); timer = null; Sound.stopMusic(); onTimeUp(k);
}

/* ---------- Entry actions ---------- */
function pick(teamId, k) {
  const cur = game.cur; const { kind } = current(); if (!cur || cur.stage === "revealed" || cur.stage === "revealing") return;
  if (kind === "zoom") {
    if (cur.picks[teamId] === k) { delete cur.picks[teamId]; delete cur.times[teamId]; }
    else { cur.picks[teamId] = k; cur.times[teamId] = timer ? clamp(1 - timer.remaining / timer.total, 0, 1) : 1; }
  } else if (cur.picks[teamId] === k) delete cur.picks[teamId];
  else cur.picks[teamId] = k;
  if (game.mode === "live" && cur.picks[teamId] !== undefined && cur.times[teamId] === undefined) cur.times[teamId] = timer ? clamp(1 - timer.remaining / timer.total, 0, 1) : 1;
  Sound.click(); save(); paintPicks(); updateEntryState();
  if (game.mode === "live") { updateLiveStatus(); broadcast(); if (cur.stage === "run" && activeTeams().every(answered)) { stopTimeEarly(); return; } }
  if (kind === "zoom" && cur.stage === "run" && activeTeams().every((t) => cur.picks[t.id] !== undefined)) { stopTimeEarly(); }
}
function toggleJoker(teamId) {
  const t = teamById(teamId); const cur = game.cur; if (!t || !t.joker || !cur || cur.stage === "revealed") return;
  cur.jokers[teamId] = !cur.jokers[teamId]; Sound.click(); save(); paintPicks(); updateEntryState();
}
function parseNum(s) {
  s = String(s ?? "").trim().replace(/\s/g, ""); if (!s) return NaN;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(s);
}

/* ---------- Scoring & reveal ---------- */
function computeGains() {
  const cur = game.cur; const { Q, kind } = current(); const u = game.unit; const g = {};
  const teams = activeTeams();
  if (kind === "est") {
    const vals = teams.map((t) => ({ t, v: parseNum(cur.est[t.id]) })).filter((x) => Number.isFinite(x.v));
    if (vals.length) {
      const best = Math.min(...vals.map((x) => Math.abs(x.v - Q.a)));
      for (const x of vals) {
        const d = Math.abs(x.v - Q.a);
        if (d === best) g[x.t.id] = game.tiebreak ? 10 : d <= Math.abs(Q.a) * 0.05 ? 2 * u : u;
      }
    }
  } else if (kind === "final") {
    for (const t of teams) { const w = game.wagers?.[t.id] ?? 0; g[t.id] = cur.picks[t.id] === cur.correct ? w : -w; }
  } else {
    for (const t of teams) {
      const k = cur.picks[t.id]; if (k === undefined || k !== cur.correct) continue;
      if (kind === "zoom") g[t.id] = Math.max(10, round10(u * (2 - 1.5 * clamp(cur.times[t.id] ?? 1, 0, 1))));
      else { const base = game.mode === "live" ? round10(u * (1 + 0.5 * (1 - clamp(cur.times[t.id] ?? 1, 0, 1)))) : u; g[t.id] = cur.jokers[t.id] ? 2 * base : base; }
    }
  }
  return g;
}
async function reveal() {
  const cur = game.cur; if (!cur || cur.stage === "revealed" || cur.stage === "revealing") return;
  if (timer) { cancelAnimationFrame(timer.raf); timer = null; Sound.stopMusic(); }
  const { kind } = current();
  if (kind === "est") for (const t of activeTeams()) { const el = $("#est-" + t.id); if (el) cur.est[t.id] = el.value; }
  cur.stage = "revealing";
  $("#revealbtn")?.setAttribute("disabled", "");
  finishTimerVisual();
  if (kind === "zoom") { const im = $("#zimg"); if (im) { im.style.transition = "transform 1.1s cubic-bezier(.2,.8,.2,1)"; im.style.transform = "translate(0%, 0%) scale(1)"; } const l = $("#zlens"); if (l) l.textContent = "Ganzes Bild"; }
  Sound.drumroll(reduced ? 0.3 : 1.25);
  await sleep(reduced ? 300 : 1300);
  const gains = computeGains();
  for (const t of game.teams) { const d = gains[t.id] || 0; if (d) t.score = Math.max(BASE, t.score + d); }
  for (const id of Object.keys(cur.jokers)) if (cur.jokers[id] && cur.picks[id] !== undefined) { const t = teamById(id); if (t) t.joker = false; }
  cur.gains = gains; cur.stage = "revealed"; save(); broadcast();
  renderRevealed(true);
}
function renderRevealed(animate) {
  const cur = game.cur; const { Q, kind } = current();
  paintPicks();
  const tiles = $("#tiles");
  if (tiles) { tiles.classList.add("revealed"); const ct = $("#tile-" + cur.correct); if (ct) { ct.classList.add("correct"); if (!$(".mark", ct)) ct.insertAdjacentHTML("beforeend", `<span class="mark">${I.check}</span>`); } }
  if (kind === "zoom") { const im = $("#zimg"); if (im && !animate) im.style.transform = "translate(0%, 0%) scale(1)"; const l = $("#zlens"); if (l) l.textContent = "Ganzes Bild"; }
  if (kind === "est") renderEstLine(Q);
  if (Q.ri && IMG[Q.ri]) {
    const fig = $("#qimg");
    if (fig) { const im = $("img", fig); if (im) { im.style.transition = "opacity .5s"; im.style.opacity = "0"; setTimeout(() => { im.src = IMG[Q.ri]; im.style.objectPosition = IMG_POS[Q.ri] || "50% 50%"; im.style.opacity = "1"; }, animate ? 350 : 0); } }
    else { const qm = $(".qmain"); if (qm && !qm.classList.contains("zoom")) { qm.classList.add("has-img"); qm.insertAdjacentHTML("afterbegin", `<figure class="qimg" id="qimg" style="animation:enter .6s cubic-bezier(.2,.8,.2,1) both"><img src="${IMG[Q.ri]}" alt="" style="${posOf(Q.ri)}"></figure>`); } }
  }
  const gains = cur.gains || {};
  const anyGood = Object.values(gains).some((v) => v > 0);
  if (animate) { anyGood ? Sound.good() : Sound.sad(); }
  // per-team results
  const chips = activeTeams().map((t, n) => {
    const d = gains[t.id] || 0;
    let txt, cls;
    if (kind === "final") { const w = game.wagers?.[t.id] ?? 0; txt = d > 0 ? `+${fmt(d)} m` : d < 0 ? `−${fmt(-d)} m` : w ? "0 m" : "0 m"; cls = d > 0 ? "good" : d < 0 ? "neg" : "bad"; }
    else { txt = d > 0 ? `+${fmt(d)} m` : "0 m"; cls = d > 0 ? "good" : "bad"; }
    if (kind === "est") { const v = parseNum(cur.est[t.id]); if (Number.isFinite(v)) txt += ` · ${fmtNum(v)} ${Q.u}`; }
    return `<span class="rchip" style="--tc:${teamColor(t)};--n:${n}"><img src="${avatarSrc(t)}" alt=""><span>${esc(t.name)}</span><b class="res ${cls}">${txt}</b></span>`;
  }).join("");
  const isLastQ = game.i >= current().p.qs.length - 1;
  const nextLabel = game.phase === "question" && current().p.round === "final" ? (game.tiebreak ? "Zur Siegerehrung" : "Zum Gipfel-Höhenprofil") : isLastQ ? "Zum Höhenprofil" : "Nächste Frage";
  const answerLine = kind === "est" ? `Richtig: <b>${fmtNum(Q.a)} ${esc(Q.u)}</b>. ` : "";
  const foot = $("#qfoot");
  if (foot) foot.innerHTML = `<div class="fact"><span class="bulb">${I.bulb}</span>
      <div><p class="label">Wusstest du?</p><p class="t">${answerLine}${esc(Q.f)}</p><div class="results" style="margin-top:.6rem">${chips}</div></div>
      <button class="btn primary big" data-act="next" data-primary>${nextLabel} ${I.arrow}</button></div>`;
  // top bar numbers
  for (const t of game.teams) {
    const el = $("#ts-" + t.id); if (!el) continue; const em = $("em", el); if (em) em.textContent = `${fmt(t.score)} m`;
    const d = gains[t.id] || 0; if (animate && d) el.insertAdjacentHTML("beforeend", `<span class="plus ${d < 0 ? "neg" : ""}">${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}</span>`);
  }
}
function renderEstLine(Q) {
  const box = $("#estline"); if (!box) return;
  const cur = game.cur; const gains = cur.gains || {};
  const vals = activeTeams().map((t) => ({ t, v: parseNum(cur.est[t.id]) })).filter((x) => Number.isFinite(x.v));
  const all = vals.map((x) => x.v).concat([Q.a]);
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-9) { lo -= Math.abs(Q.a) * 0.1 + 1; hi += Math.abs(Q.a) * 0.1 + 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const pos = (v) => ((v - lo) / (hi - lo)) * 100;
  // nudge overlapping pins apart (in %)
  const sorted = vals.slice().sort((a, b) => a.v - b.v); let prev = -100;
  for (const x of sorted) { x.p = Math.max(pos(x.v), prev + 9); prev = x.p; }
  const over = prev - 100; if (over > 0) sorted.forEach((x) => (x.p -= over * (x.p / (prev || 1))));
  box.innerHTML = `<div class="estline"><div class="axis"></div>
    ${sorted.map((x, n) => `<div class="pin ${gains[x.t.id] > 0 ? "win" : ""}" style="left:${clamp(x.p, 3, 97)}%;--tc:${teamColor(x.t)};--n:${n}"><img src="${avatarSrc(x.t)}" alt=""><span>${fmtNum(x.v)}</span></div>`).join("")}
    <div class="truth" style="left:${clamp(pos(Q.a), 4, 96)}%"><b>${fmtNum(Q.a)} ${esc(Q.u)}</b></div></div>`;
}
function nextStep() {
  const p = game.plan[game.r];
  if (p.round === "final") {
    if (game.tiebreak) { game.tiebreak = null; game.cur = null; game.phase = "podium"; save(); return render(); }
    game.cur = null; game.phase = "board"; save(); return render();
  }
  if (game.i < p.qs.length - 1) { game.i++; game.cur = null; game.phase = "question"; }
  else { game.cur = null; game.phase = "board"; }
  save(); render();
}

/* ---------- Scoreboard ---------- */
function campOf(alt) { let c = CAMPS[0]; for (const x of CAMPS) if (alt >= x.a) c = x; return c; }
function ranked(teams) { const s = teams.slice().sort((a, b) => b.score - a.score); return s.map((t) => ({ t, rank: 1 + s.filter((o) => o.score > t.score).length })); }
function viewBoard() {
  setScene("off"); Sky.snow(true);
  const p = game.plan[game.r]; const isFinal = p.round === "final";
  const prev = game.prevScores || {};
  const list = ranked(game.teams);
  const rows = list.map(({ t, rank }, n) => {
    const d = t.score - (prev[t.id] ?? BASE);
    const nextCamp = CAMPS.find((c) => c.a > t.score);
    const camp = t.score > SUMMIT ? "Über dem Gipfel – im Ballon!" : t.score === SUMMIT ? "Auf dem Gipfel!" : `noch ${fmt(nextCamp.a - t.score)} m bis ${nextCamp.n}`;
    return `<div class="rrow ${rank === 1 ? "first" : ""}" style="--tc:${teamColor(t)};--n:${n}"><span class="pos">${rank}</span><img src="${avatarSrc(t)}" alt=""><span class="nm"><b>${esc(t.name)}</b><span>${esc(t.members || animal(t.animal).de)} · ${esc(camp)}</span></span><span class="alt"><b data-count="${t.score}" data-from="${prev[t.id] ?? BASE}">${fmt(prev[t.id] ?? BASE)} m</b><span class="${d > 0 ? "" : d < 0 ? "neg" : "zero"}">${d > 0 ? "+" + fmt(d) : d < 0 ? "−" + fmt(-d) : "±0"} m</span></span></div>`;
  }).join("");
  const nextP = game.plan[game.r + 1];
  let btn;
  if (isFinal) {
    const top = list.filter((x) => x.rank === 1);
    btn = top.length > 1 ? `<button class="btn primary big" data-act="tiebreak" data-primary>Gleichstand! Stechfrage ${I.arrow}</button>` : `<button class="btn primary big" data-act="podium" data-primary>Zur Siegerehrung ${I.arrow}</button>`;
  } else btn = `<button class="btn primary big" data-act="nextRound" data-primary>${nextP.round === "final" ? "Zum Finale" : "Nächste Runde: " + esc(roundById(nextP.round).title)} ${I.arrow}</button>`;
  const title = isFinal ? "Endstand am Berg" : `Höhenprofil nach Runde ${game.r + 1}`;
  const leader = list[0];
  const sub = leader ? `${esc(leader.t.name)} führt auf ${fmt(leader.t.score)} m.` : "";
  mount(`<section class="screen boardscreen">
    <header class="topbar"><div class="board-title"><h2>${title}</h2><p>${sub}</p></div><div style="margin-left:auto">${ctrls()}</div></header>
    <div class="board"><div class="mtn">${boardSVG(game.teams)}</div><div class="rank">${rows}<div class="board-foot">${btn}</div></div></div>
  </section>`);
  animateClimb(prev);
}
function animateClimb(prev) {
  const n = game.teams.length;
  const items = game.teams.map((t, i) => ({ t, i, pts: routePts(i, n), from: prev[t.id] ?? BASE, to: t.score, g: $("#cl-" + t.id), tr: $("#tr-" + t.id) }));
  const crossed = [];
  for (const it of items) for (const c of CAMPS.slice(1)) if (it.from < c.a && it.to >= c.a) crossed.push({ t: it.t, c });
  const dur = reduced ? 1 : 2600, t0 = performance.now() + 450;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const counters = $$(".rrow .alt b[data-count]");
  const token = renderToken;
  const place = (it, alt) => {
    const [x, y] = pointAt(it.pts, alt, it.i, n);
    it.g?.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    it.tr?.setAttribute("points", ptsStr(climbedPts(it.pts, alt)));
    const b = it.g?.querySelector(".balloon"); if (b) b.setAttribute("opacity", alt > SUMMIT ? "1" : "0");
  };
  items.forEach((it) => place(it, it.from));
  if (items.some((it) => it.to > it.from)) setTimeout(() => Sound.climb(7), 450);
  const step = (now) => {
    const k = clamp((now - t0) / dur, 0, 1); const e = ease(k);
    items.forEach((it) => place(it, it.from + (it.to - it.from) * e));
    counters.forEach((b) => { const from = Number(b.dataset.from), to = Number(b.dataset.count); b.textContent = `${fmt(from + (to - from) * e)} m`; });
    if (token !== renderToken) return;
    if (k < 1) requestAnimationFrame(step);
    else {
      game.prevScores = Object.fromEntries(game.teams.map((t) => [t.id, t.score])); save();
      crossed.slice(0, 4).forEach((x, idx) => setTimeout(() => { if (token === renderToken) toast(`<img src="${avatarSrc(x.t)}" alt="">${esc(x.t.name)} erreicht ${esc(x.c.n)} (${fmt(x.c.a)} m)!`); }, idx * 650));
    }
  };
  requestAnimationFrame(step);
}

/* ---------- Podium ---------- */
function viewPodium() {
  setScene("dim"); Sky.snow(true);
  const list = ranked(game.teams);
  const order = [list[1], list[0], list[2]].filter(Boolean);
  const cols = order.map((x) => {
    const place = x === list[0] ? 1 : x === list[1] ? 2 : 3;
    const [c1, c2] = place === 1 ? [PAL.safran, PAL.udongo] : place === 2 ? [PAL.theluji, PAL.mawingu] : [PAL.udongo, PAL.safran];
    return `<div class="pcol p${place}" style="--tc:${teamColor(x.t)}"><img class="pav" src="${avatarSrc(x.t)}" alt=""><span class="pn">${esc(x.t.name)}</span><span class="pm">${esc(x.t.members)}</span><span class="pa">${fmt(x.t.score)} m</span>
      <div class="pblock" style="--c1:${c1};background-image:${kangaPattern(c1, c2)}"><span>${x.rank}</span></div></div>`;
  }).join("");
  const others = list.slice(3).map((x) => `<span class="rchip" style="--tc:${teamColor(x.t)};--n:0"><img src="${avatarSrc(x.t)}" alt=""><span>${x.rank}. ${esc(x.t.name)}</span><b>${fmt(x.t.score)} m</b></span>`).join("");
  const winners = list.filter((x) => x.rank === 1).map((x) => x.t);
  const w = winners[0];
  const date = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const names = winners.map((t) => `<b>${esc(t.name)}</b>${t.members ? ` (${esc(t.members)})` : ""}`).join(" und ");
  const height = w.score > SUMMIT ? `eine Höhe von <b>${fmt(w.score)} m</b> erreicht ${winners.length > 1 ? "haben" : "hat"} – sogar höher als der Uhuru Peak, das Dach Afrikas` : w.score === SUMMIT ? `den Uhuru Peak auf <b>5.895 m</b> erreicht ${winners.length > 1 ? "haben" : "hat"} – das Dach Afrikas` : `eine Höhe von <b>${fmt(w.score)} m</b> erreicht ${winners.length > 1 ? "haben" : "hat"} – nur noch ${fmt(SUMMIT - w.score)} m bis zum Uhuru Peak`;
  mount(`<section class="screen podium-screen">
    <header class="topbar" style="width:100%;justify-content:flex-end">${ctrls()}</header>
    <div class="podium-head"><p class="eyebrow">Siegerehrung · Hongera!</p><h2>${winners.length > 1 ? "Gemeinsam ganz oben!" : `${esc(w.name)} steht ganz oben!`}</h2></div>
    <div class="podium">${cols}</div>
    ${others ? `<div class="others">${others}</div>` : ""}
    <div class="podium-foot">
      <div class="cert" style="background-image:${kangaPattern(PAL.safran, PAL.udongo)}"><div class="cert-in"><span class="seal">${I.peak}</span><div>
        <h3>Gipfelurkunde</h3>
        <p>Hiermit wird bestätigt, dass ${winners.length > 1 ? "die Seilschaften" : "die Seilschaft"} ${names} am <b>${date}</b> beim Gipfelquiz ${height}.</p>
        <p class="hongera">Hongera! Herzlichen Glückwunsch!</p></div></div></div>
      <div class="podium-actions"><button class="btn primary" data-act="again" data-primary>Neues Spiel ${I.arrow}</button><button class="btn" data-act="showBoard">Höhenprofil</button></div>
    </div>
  </section>`);
  Sound.fanfare(); setTimeout(() => Confetti.fire(7), 300);
  game.finished = true; store.del(SAVE_KEY);
}

/* =====================================================================
   Modals
   ===================================================================== */
function openModal(html, wide = false) {
  closeModal();
  const back = document.createElement("div"); back.className = "modal-back"; back.id = "modal";
  back.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  back.addEventListener("click", (e) => { if (e.target === back) closeModal(); });
  document.body.appendChild(back); modalOpen = true;
  if (timer && timer.running) { togglePause(); back.dataset.resume = "1"; }
  const f = $("button, input, textarea", back); f?.focus();
}
function closeModal() {
  const m = $("#modal"); if (!m) return;
  const resume = m.dataset.resume === "1"; m.remove(); modalOpen = false;
  if (resume && timer && !timer.running) togglePause();
}
const closeBtn = `<button class="icon-btn" data-act="closeModal" aria-label="Schließen">${I.cross}</button>`;
function rulesModal() {
  openModal(`<div class="modal-head"><h3>So wird gespielt</h3>${closeBtn}</div>
    <ol>
      <li><b>Seilschaften bilden:</b> 2 bis 6 Teams. Bei 12 Leuten am besten 4 Teams à 3 – Kinder und Erwachsene gemischt.</li>
      <li><b>Eine Person bedient den Laptop.</b> Sie kann trotzdem mitspielen, denn niemand sieht die Lösung vorher.</li>
      <li><b>Spielweise „Ein Bildschirm“:</b> Ist die Bedenkzeit um, zählt das Spiel bis drei und alle Teams zeigen gleichzeitig ihre Antwort – mit 1 bis 4 Fingern oder mit der Antwortkarte am Handy. Die Spielleitung tippt ein, was die Teams gezeigt haben.</li>
      <li><b>Spielweise „Live mit Handys“:</b> Jedes Team tippt seine Antwort auf dem eigenen Handy. Wer schneller richtig liegt, bekommt bis zu 50 % Bonus-Meter. Dafür muss das Quiz auf jedem Handy bei claude.ai geöffnet und jemand angemeldet sein. Teams ohne Handy trägt die Spielleitung ein.</li>
      <li><b>Alle starten am Marangu Gate auf 1.870 m.</b> Ziel ist der Uhuru Peak auf 5.895 m. Wer drüber hinauskommt, schwebt im Heißluftballon.</li>
      <li><b>Rückenwind-Joker:</b> Jedes Team darf einmal im Spiel vor der Auflösung „Rückenwind!“ rufen und bekommt bei richtiger Antwort doppelte Höhenmeter.</li>
      <li><b>Sonderrunden:</b> Bei der Zoom-Safari ruft ihr dazwischen – je früher richtig, desto mehr Meter. Bei Schätzfragen gewinnt, wer am nächsten dran ist. Im Finale setzt ihr eure eigenen Höhenmeter.</li>
    </ol>
    <p class="hint">Ihr braucht nur Zettel und Stifte für die Schätzfragen. Tasten: <span class="kbd">Leertaste</span> weiter · <span class="kbd">P</span> Pause · <span class="kbd">M</span> Ton · <span class="kbd">F</span> Vollbild · <span class="kbd">1</span>–<span class="kbd">4</span> Antworten eintragen.</p>
    <div><button class="btn primary" data-act="closeModal">Verstanden</button></div>`, true);
}
function creditsModal() {
  const rows = CREDITS.map((c) => `<div class="credit">${IMG[c.id] ? `<img src="${IMG[c.id]}" alt="">` : "<span></span>"}<div><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a><br><span>${esc(c.author || "unbekannt")} · ${esc(c.license || "")}</span></div></div>`).join("");
  openModal(`<div class="modal-head"><h3>Bildnachweise</h3>${closeBtn}</div>
    <p class="hint">Alle Fotos stammen von Wikimedia Commons und stehen unter freien Lizenzen. Teilweise wurden sie zugeschnitten und verkleinert. Alle Illustrationen, Klänge und Musikschnipsel sind für dieses Quiz selbst gebaut.</p>
    <div class="credits">${rows || "<p>Keine Bilder eingebunden.</p>"}</div>`, true);
}
function menuModal() {
  const inQ = game && game.phase === "question" && game.cur && game.cur.stage !== "revealed";
  openModal(`<div class="modal-head"><h3>Spielleitung</h3>${closeBtn}</div>
    <div class="menu-list">
      <button class="btn ghost" data-act="fixScores">${I.undo} Höhenmeter korrigieren</button>
      ${inQ ? `<button class="btn ghost" data-act="skipQ">${I.arrow} Diese Frage überspringen</button>` : ""}
      <button class="btn ghost" data-act="rules">So wird gespielt</button>
      <button class="btn ghost" data-act="credits">Bildnachweise</button>
      <button class="btn ghost" data-act="quit">${I.cross} Spiel beenden</button>
    </div>`);
}
function fixModal() {
  const rows = game.teams.map((t) => `<div class="fix-row" style="--tc:${teamColor(t)}"><img src="${avatarSrc(t)}" alt=""><b>${esc(t.name)}</b><button class="btn small" data-act="fix" data-team="${t.id}" data-d="-1">− ${fmt(game.unit)}</button><em id="fix-${t.id}">${fmt(t.score)} m</em><button class="btn small" data-act="fix" data-team="${t.id}" data-d="1">+ ${fmt(game.unit)}</button></div>`).join("");
  openModal(`<div class="modal-head"><h3>Höhenmeter korrigieren</h3>${closeBtn}</div><p class="hint">Falls etwas falsch eingetippt wurde. Änderungen gelten sofort.</p><div class="menu-list">${rows}</div><div><button class="btn primary" data-act="closeModal">Fertig</button></div>`);
}
function quitModal() {
  openModal(`<div class="modal-head"><h3>Spiel beenden?</h3>${closeBtn}</div><p>Der Spielstand wird gelöscht. Die Teams und Einstellungen bleiben für das nächste Spiel gespeichert.</p>
    <div class="title-actions"><button class="btn primary" data-act="quitYes">Ja, beenden</button><button class="btn ghost" data-act="closeModal">Weiterspielen</button></div>`);
}
function drawModal() {
  const d = store.get("gipfelquiz.draw.v1") || { kids: "", adults: "" };
  openModal(`<div class="modal-head"><h3>Teams auslosen</h3>${closeBtn}</div>
    <p class="hint">Ein Name pro Zeile (oder mit Komma getrennt). Kinder und Erwachsene werden gleichmäßig auf ${setup.teams.length} Teams verteilt.</p>
    <div class="draw-grid"><label for="drawKids">Kinder & Jugendliche<textarea id="drawKids" placeholder="Lea&#10;Ben&#10;Mia&#10;Noah">${esc(d.kids)}</textarea></label>
      <label for="drawAdults">Erwachsene<textarea id="drawAdults" placeholder="Oma&#10;Opa&#10;Tante Sabine&#10;Onkel Tom">${esc(d.adults)}</textarea></label></div>
    <div id="drawResult"></div>
    <div class="title-actions"><button class="btn primary" data-act="doDraw">${I.dice} Auslosen</button><button class="btn ghost" data-act="applyDraw" id="applyDraw" disabled>Übernehmen</button></div>`, true);
}
let lastDraw = null;
function doDraw() {
  const split = (s) => s.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
  const kidsTxt = $("#drawKids").value, adultsTxt = $("#drawAdults").value;
  store.set("gipfelquiz.draw.v1", { kids: kidsTxt, adults: adultsTxt });
  const people = shuffle(split(kidsTxt)).concat(shuffle(split(adultsTxt)));
  const n = setup.teams.length; const groups = Array.from({ length: n }, () => []);
  const offset = Math.floor(Math.random() * n);
  people.forEach((p, i) => groups[(i + offset) % n].push(p));
  lastDraw = groups;
  $("#drawResult").innerHTML = `<div class="draw-result">${setup.teams.map((t, i) => `<div class="draw-team" style="--tc:${teamColor(t)};--n:${i}"><b><img src="${avatarSrc(t)}" alt="">${esc(t.name)}</b><span>${groups[i].length ? esc(groups[i].join(", ")) : "– noch niemand –"}</span></div>`).join("")}</div>`;
  $("#applyDraw").disabled = !people.length; Sound.climb(4);
}

/* =====================================================================
   Game flow
   ===================================================================== */
function startGame() {
  saveSetup();
  const plan = buildPlan(setup);
  const qCount = plan.filter((p) => p.round !== "final").reduce((s, p) => s + p.qs.length, 0);
  game = {
    v: 2, id: randomCode() + Date.now().toString(36).slice(-4), mode: setup.mode === "live" ? "live" : "screen", startedAt: Date.now(), unit: calcUnit(qCount, setup.mode === "live"), plan, r: 0, i: 0, phase: "intro", cur: null, wagers: null, wagerLocked: null, tiebreak: null,
    settings: { timer: setup.timer },
    teams: setup.teams.map((t) => ({ id: t.id, animal: t.animal, name: (t.name || animal(t.animal).name).trim(), members: (t.members || "").trim(), score: BASE, joker: true })),
    prevScores: null
  };
  game.prevScores = Object.fromEntries(game.teams.map((t) => [t.id, BASE]));
  view = "game"; save(); keepAwake(); render();
}
let wakeLock = null;
async function keepAwake() { try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener?.("release", () => (wakeLock = null)); } } catch { wakeLock = null; } }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && view === "game") keepAwake(); });
function toggleFS() {
  try { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()?.catch?.(() => {}); else document.exitFullscreen?.()?.catch?.(() => {}); } catch { /* not allowed here */ }
}
function toggleSound() {
  Sound.setEnabled(!Sound.enabled); setup.sound = Sound.enabled; saveSetup();
  $$("[data-act=sound]").forEach((b) => { b.classList.toggle("off", !Sound.enabled); b.innerHTML = Sound.enabled ? I.sound : I.mute; b.setAttribute("aria-label", Sound.enabled ? "Ton aus" : "Ton an"); });
  if (Sound.enabled && timer && timer.running) Sound.startMusic();
}

/* ---------- Actions ---------- */
const A = {
  new() { view = "setup"; render(); },
  resume() { const s = store.get(SAVE_KEY); if (!s) return; game = s; view = "game"; if (game.cur && game.cur.stage === "revealing") game.cur.stage = "entry"; if (game.mode === "live") Net.ensure(); keepAwake(); render(); },
  home() { view = "title"; render(); },
  rules() { rulesModal(); },
  credits() { creditsModal(); },
  menu() { menuModal(); },
  closeModal() { closeModal(); },
  sound() { toggleSound(); },
  fullscreen() { toggleFS(); },
  animal(b) {
    const i = Number(b.dataset.i); const used = new Set(setup.teams.map((t) => t.animal));
    const curIdx = ANIMALS.findIndex((a) => a.id === setup.teams[i].animal);
    for (let k = 1; k <= ANIMALS.length; k++) {
      const a = ANIMALS[(curIdx + k) % ANIMALS.length];
      if (!used.has(a.id)) { const old = animal(setup.teams[i].animal); if (setup.teams[i].name === old.name || !setup.teams[i].name) setup.teams[i].name = a.name; setup.teams[i].animal = a.id; break; }
    }
    saveSetup(); Sound.click(); render();
  },
  teams(b) {
    const d = Number(b.dataset.d); const n = clamp(setup.teams.length + d, 2, 6);
    if (n > setup.teams.length) { const used = new Set(setup.teams.map((t) => t.animal)); const a = ANIMALS.find((x) => !used.has(x.id)); setup.teams.push({ id: "t" + Date.now().toString(36), animal: a.id, name: a.name, members: "" }); }
    else if (n < setup.teams.length) setup.teams.pop();
    setup.teams.forEach((t, i) => (t.id = "t" + i));
    saveSetup(); render();
  },
  toggleRound(b) { const id = b.dataset.id; setup.rounds = setup.rounds.includes(id) ? setup.rounds.filter((x) => x !== id) : ROUNDS.map((r) => r.id).filter((x) => x === id || setup.rounds.includes(x)); saveSetup(); render(); },
  seg(b) { setup[b.dataset.key] = Number(b.dataset.v); saveSetup(); render(); },
  draw() { drawModal(); },
  doDraw() { doDraw(); },
  applyDraw() { if (!lastDraw) return; setup.teams.forEach((t, i) => (t.members = lastDraw[i].join(", "))); saveSetup(); closeModal(); render(); },
  start() { if (!setup.rounds.length) return; Sound.unlock(); startGame(); },
  beginRound() { const { p } = current(); if (p.round === "final") { game.phase = "wager"; game.wagers = null; game.wagerLocked = null; } else { game.phase = "question"; game.i = 0; game.cur = null; } save(); render(); },
  wager(b) { game.wagers[b.dataset.team] = Number(b.dataset.v); Sound.click(); save(); $$(`.wager button[data-team="${b.dataset.team}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); },
  showFinal() { game.phase = "question"; game.cur = null; save(); render(); },
  pause() { togglePause(); },
  addTime() { if (timer) { timer.total += 10; timer.remaining += 10; Sound.setUrgent(false); paintTimer(); broadcast(); } },
  stopTime() { stopTimeEarly(); },
  pick(b) { pick(b.dataset.team, Number(b.dataset.k)); },
  joker(b) { toggleJoker(b.dataset.team); },
  reveal() { reveal(); },
  next() { nextStep(); },
  nextRound() { game.r++; game.i = 0; game.cur = null; game.phase = "intro"; save(); render(); },
  tiebreak() { const list = ranked(game.teams); game.tiebreak = list.filter((x) => x.rank === 1).map((x) => x.t.id); game.cur = null; game.phase = "question"; save(); render(); },
  podium() { game.phase = "podium"; save(); render(); },
  showBoard() { const keep = game.prevScores; game.prevScores = Object.fromEntries(game.teams.map((t) => [t.id, BASE])); game.phase = "board"; render(); game.prevScores = keep; },
  again() { game = null; store.del(SAVE_KEY); view = "setup"; render(); },
  fixScores() { fixModal(); },
  fix(b) { const t = teamById(b.dataset.team); if (!t) return; t.score = Math.max(BASE, t.score + Number(b.dataset.d) * game.unit); save(); const e = $("#fix-" + t.id); if (e) e.textContent = `${fmt(t.score)} m`; $$(`#ts-${t.id} em`).forEach((x) => (x.textContent = `${fmt(t.score)} m`)); },
  skipQ() { closeModal(); stopTimer(); if (game.plan[game.r].round === "final") { game.cur = null; game.phase = "board"; save(); render(); } else nextStep(); },
  quit() { quitModal(); },
  quitYes() { closeModal(); stopTimer(); store.del(SAVE_KEY); game = null; view = "title"; render(); }
};

/* ---------- Events ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  Sound.unlock();
  const f = A[b.dataset.act]; if (f) { e.preventDefault(); f(b, e); }
  if (e.detail > 0 && b.isConnected && !b.hasAttribute("data-primary") && b.matches("button")) b.blur();
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.matches(".tcard-fields input")) { const t = setup.teams[Number(el.dataset.i)]; if (t) { t[el.dataset.field] = el.value; saveSetup(); } }
  else if (el.matches(".est-input") && game?.cur) { game.cur.est[el.dataset.team] = el.value; save(); updateEntryState(); if (game.mode === "live") { updateLiveStatus(); broadcast(); } }
  else if (el.id === "pname") { P.name = el.value.slice(0, 24); savePlayer(); }
});
document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    if (e.key === "Enter" && e.target.matches(".est-input")) {
      e.preventDefault(); const ins = $$(".est-input"); const i = ins.indexOf(e.target);
      if (i < ins.length - 1) ins[i + 1].focus(); else { e.target.blur(); $("#revealbtn")?.focus(); }
    }
    return;
  }
  if (modalOpen) { if (e.key === "Escape") closeModal(); return; }
  if (view === "player") return;
  const k = e.key;
  if (k === " " || k === "Enter" || k === "ArrowRight" || k === "PageDown") {
    if (tag === "BUTTON" && (k === " " || k === "Enter")) return;
    const p = $("[data-primary]:not([disabled])", app); if (p) { e.preventDefault(); p.click(); }
    return;
  }
  if (view === "game" && game?.phase === "question" && game.cur && game.cur.stage === "entry") {
    const kind = current().kind;
    if (kind !== "est" && kind !== "zoom") {
      let opt = null;
      if (kind === "tf") { if (k === "w" || k === "W" || k === "1") opt = 0; if (k === "f" || k === "F" || k === "2") opt = 1; }
      else if (/^[1-4]$/.test(k)) opt = Number(k) - 1;
      if (opt !== null) { const t = activeTeams().find((x) => game.cur.picks[x.id] === undefined); if (t) pick(t.id, opt); return; }
      if (k === "Backspace") { const set = activeTeams().filter((x) => game.cur.picks[x.id] !== undefined); const t = set[set.length - 1]; if (t) { delete game.cur.picks[t.id]; save(); paintPicks(); updateEntryState(); } return; }
    }
  }
  if (k === "p" || k === "P") { togglePause(); return; }
  if (k === "m" || k === "M") { toggleSound(); return; }
  if (k === "f" || k === "F") { toggleFS(); return; }
});

/*__LIVE__*/

/* ---------- Boot (keeps state across live updates of the page) ---------- */
function boot(data) {
  try {
    if (data && data.setup) setup = data.setup;
    if (data && data.game) { game = data.game; view = data.view || "game"; if (game.cur && game.cur.stage === "revealing") game.cur.stage = "entry"; }
  } catch { /* ignore broken snapshot */ }
  Sound.setEnabled(setup.sound !== false);
  Sky.start();
  render();
}
try { window.claude?.hot?.snapshot?.(() => ({ setup, game, view })); } catch { /* not in a viewer */ }
try { if (window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data ?? {}); } catch { boot({}); }
})();
