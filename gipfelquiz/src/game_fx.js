/* =====================================================================
   Version 3: Spielgefühl – Licht, Partikel, Einblendungen, Sounddesign,
   inszenierte Fragen, Kamerafahrt am Berg, Siegerehrung, Auszeichnungen.
   ===================================================================== */
I.fire = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-3.9 2.4-5 .1 1.7.9 3 2.1 3.4C11 9.6 10.6 6 12 2z"/></svg>';
I.crown = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/></svg>';
const AI = {
  crown: I.crown,
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/></svg>',
  fire: I.fire,
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
  wind: I.wind,
  rocket: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3c3.5 0 7 0 7 0s0 3.5 0 7l-6.5 6.5-7-7L14 3zM7.5 10.5 4 11l-2 3 4.5.5M13.5 16.5 13 20l-3 2-.5-4.5"/><circle cx="16" cy="8" r="1.8" fill="#0D1330"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6 4 4 7-8"/><path d="M15 7h6v6"/></svg>',
  bulb: I.bulb,
  heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/></svg>',
  snail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 18h15a3 3 0 0 0 3-3V9"/><circle cx="11" cy="12" r="5"/><path d="M11 12a2 2 0 1 1 2-2M19 9l-1-3M21 9l1-3"/></svg>',
  smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 14.5s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/></svg>'
};

/* ---------- More sounds, built on the synth ---------- */
const SFX = (() => {
  // phones stay quiet: the TV is the loudspeaker of the show
  const go = () => { if (view === "player") return null; const x = Sound._x(); return x.ok() ? x : null; };
  function tone(x, type, f0, f1, t, dur, vol, att = 0.006) {
    const o = x.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = x.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(x.master); if (x.rev) g.connect(x.rev); o.start(t); o.stop(t + dur + 0.05);
  }
  let amb = null;
  const S = {
    boom() { const x = go(); if (!x) return; const t = x.ctx.currentTime; tone(x, "sine", 130, 34, t, 1.3, 0.95); tone(x, "triangle", 70, 30, t, 0.9, 0.35); x.noise(t, 0.7, 0.28, "lowpass", 380, 0.6); },
    impact() { const x = go(); if (!x) return; const t = x.ctx.currentTime; tone(x, "sine", 170, 42, t, 0.5, 0.8); x.noise(t, 0.16, 0.32, "bandpass", 1400, 0.9); },
    thud() { const x = go(); if (!x) return; const t = x.ctx.currentTime; tone(x, "sine", 90, 40, t, 0.45, 0.6); x.noise(t, 0.2, 0.18, "lowpass", 600, 0.7); },
    stamp() { const x = go(); if (!x) return; const t = x.ctx.currentTime; tone(x, "sine", 200, 50, t, 0.4, 0.75); x.noise(t, 0.09, 0.45, "highpass", 2500, 0.7); x.noise(t + 0.02, 0.5, 0.12, "bandpass", 5000, 1.5); },
    riser(sec = 1.4) {
      const x = go(); if (!x) return; const t = x.ctx.currentTime;
      const s = x.ctx.createBufferSource(); s.buffer = x.noiseBuf; s.loop = true;
      const f = x.ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 3; f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(6000, t + sec);
      const g = x.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + sec); g.gain.exponentialRampToValueAtTime(0.0001, t + sec + 0.06);
      s.connect(f); f.connect(g); g.connect(x.master); s.start(t); s.stop(t + sec + 0.1);
      tone(x, "sawtooth", 98, 392, t, sec, 0.03, sec * 0.8);
    },
    heartbeat() { const x = go(); if (!x) return; const t = x.ctx.currentTime; tone(x, "sine", 75, 45, t, 0.22, 0.75); tone(x, "sine", 70, 42, t + 0.2, 0.26, 0.55); },
    lockIn() { const x = go(); if (!x) return; const t = x.ctx.currentTime; x.pluck(1318.5, t, 0.22, x.master, 0.4); x.pluck(1975.5, t + 0.06, 0.2, x.master, 0.5); x.noise(t, 0.03, 0.15, "highpass", 6000, 0.7); },
    coin() { const x = go(); if (!x) return; const t = x.ctx.currentTime; x.pluck(1975.5, t, 0.16, x.master, 0.3); x.pluck(2637, t + 0.07, 0.16, x.master, 0.45); },
    shimmer() { const x = go(); if (!x) return; const t = x.ctx.currentTime; [2093, 2637, 3136, 3951, 4186].forEach((f, k) => x.pluck(f, t + k * 0.05, 0.08, x.master, 0.9)); },
    go() { const x = go(); if (!x) return; const t = x.ctx.currentTime; [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => x.pluck(f, t + k * 0.045, 0.2, x.master, 0.6)); x.drum(t + 0.18, 95, 0.55, 0.35); },
    sting() { const x = go(); if (!x) return; const t = x.ctx.currentTime + 0.02; x.brass(392, t, 0.16, 0.16); x.brass(523.25, t + 0.18, 0.55, 0.16); x.brass(659.25, t + 0.18, 0.55, 0.1); x.drum(t + 0.18, 80, 0.5, 0.4); },
    streak() { const x = go(); if (!x) return; const t = x.ctx.currentTime; Sound.whoosh(); [659.25, 783.99, 987.77, 1318.5].forEach((f, k) => x.pluck(f, t + 0.1 + k * 0.06, 0.18, x.master, 0.7)); },
    whip() { Sound.whoosh(); },
    applause(sec = 3) {
      const x = go(); if (!x) return; const t0 = x.ctx.currentTime;
      const g = x.ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.4); g.gain.setValueAtTime(1, t0 + sec * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + sec); g.connect(x.master);
      for (let k = 0; k < sec * 70; k++) { const t = t0 + Math.random() * sec; x.noise(t, 0.04 + Math.random() * 0.03, 0.03 + Math.random() * 0.05, "bandpass", 1200 + Math.random() * 2600, 1.2, g); }
      x.noise(t0, sec, 0.05, "lowpass", 700, 0.5, g);
    },
    firework() {
      const x = go(); if (!x) return; const t = x.ctx.currentTime;
      tone(x, "sine", 700, 1900, t, 0.55, 0.05);
      x.noise(t + 0.55, 0.9, 0.35, "lowpass", 900, 0.6); tone(x, "sine", 110, 35, t + 0.55, 0.8, 0.5);
      for (let k = 0; k < 18; k++) x.noise(t + 0.75 + Math.random() * 0.9, 0.02, 0.06 + Math.random() * 0.06, "highpass", 5000, 0.8);
    },
    thunder() { const x = go(); if (!x) return; const t = x.ctx.currentTime; x.noise(t, 0.25, 0.5, "highpass", 1500, 0.6); x.noise(t + 0.05, 2.6, 0.55, "lowpass", 260, 0.5); tone(x, "sine", 60, 28, t, 2.2, 0.5, 0.05); },
    ambient(on) {
      const x = Sound._x();
      if (!on || !Sound.enabled) { if (amb) { clearInterval(amb.id); amb = null; } return; }
      if (amb || !x.ok()) return;
      const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99];
      const chords = [[130.81, 196, 261.63], [110, 164.81, 220], [87.31, 130.81, 174.61], [98, 146.83, 196]];
      let step = 0, next = x.ctx.currentTime + 0.1;
      const pad = (fs, t) => fs.forEach((f) => { const o = x.ctx.createOscillator(); o.type = "triangle"; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12;
        const g = x.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.022, t + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.6);
        const lp = x.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; o.connect(lp); lp.connect(g); g.connect(x.master); if (x.rev) g.connect(x.rev); o.start(t); o.stop(t + 4.8); });
      amb = { id: setInterval(() => {
        while (next < x.ctx.currentTime + 0.3) {
          if (step % 8 === 0) pad(chords[(step / 8) % 4], next);
          if (step % 2 === 0 || Math.random() < 0.3) x.pluck(scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.2 ? 2 : 1), next, 0.045 + Math.random() * 0.03, x.master, 1.6);
          next += 0.58; step = (step + 1) % 32;
        }
      }, 120) };
    }
  };
  return S;
})();

/* ---------- Living sky (WebGL aurora behind everything) ---------- */
const BG = (() => {
  const cv = document.getElementById("bgcanvas");
  const MOODS = {
    night: { c1: [0.08, 0.72, 0.66], c2: [0.9, 0.28, 0.55], c3: [0.88, 0.41, 0.24], k: 0.8 },
    calm: { c1: [0.1, 0.5, 0.62], c2: [0.38, 0.4, 0.9], c3: [0.7, 0.32, 0.3], k: 0.42 },
    tension: { c1: [1.0, 0.42, 0.12], c2: [0.95, 0.12, 0.22], c3: [0.75, 0.12, 0.1], k: 1.0 },
    gold: { c1: [1.0, 0.78, 0.25], c2: [0.98, 0.42, 0.58], c3: [0.95, 0.5, 0.2], k: 1.0 }
  };
  let gl = null;
  try { gl = cv && !reduced ? cv.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" }) : null; } catch { gl = null; }
  if (!gl) { if (cv) cv.style.display = "none"; return { mood() {}, ok: false }; }
  const vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const fs = `precision mediump float;uniform vec2 r;uniform float t;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;uniform float k;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
  void main(){vec2 uv=gl_FragCoord.xy/r;float asp=r.x/r.y;vec2 p=vec2(uv.x*asp,uv.y);
  vec3 col=mix(vec3(.04,.055,.15),vec3(.02,.028,.085),uv.y);
  col+=c3*.45*pow(1.-uv.y,3.4);
  float w=fbm(vec2(p.x*1.3+t*.022,t*.018));
  float y0=.66+.09*sin(p.x*1.6+t*.1+w*3.2);
  float band=exp(-pow((uv.y-y0)/(.075+.07*w),2.));
  float cur=.5+.5*sin(p.x*21.+w*10.+t*.55);
  vec3 a=mix(c1,c2,smoothstep(.25,.85,fbm(p*1.5+t*.03)));
  col+=a*band*(.35+.65*cur)*(.35+.55*w)*k*.85;
  float y1=.82+.05*sin(p.x*2.3-t*.07);
  col+=mix(c2,c1,.5)*exp(-pow((uv.y-y1)/.05,2.))*.18*k*fbm(p*3.+t*.04);
  col+=c2*.06*smoothstep(.55,1.,fbm(p*2.4-t*.012))*k;
  gl_FragColor=vec4(col,1.);}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  let prog;
  try { prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link"); }
  catch (e) { console.warn("Sky shader off:", e); cv.style.display = "none"; return { mood() {}, ok: false }; }
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ["r", "t", "c1", "c2", "c3", "k"].forEach((u) => (U[u] = gl.getUniformLocation(prog, u)));
  const cur = JSON.parse(JSON.stringify(MOODS.night)); let target = MOODS.night;
  function size() { const s = 0.5; cv.width = Math.max(2, Math.round(innerWidth * s)); cv.height = Math.max(2, Math.round(innerHeight * s)); gl.viewport(0, 0, cv.width, cv.height); }
  size(); addEventListener("resize", size);
  let last = 0, running = true; const t0 = performance.now();
  const lerp = (a, b, f) => a + (b - a) * f;
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - last < 33 || document.hidden) return; last = now;
    for (const key of ["c1", "c2", "c3"]) for (let i = 0; i < 3; i++) cur[key][i] = lerp(cur[key][i], target[key][i], 0.04);
    cur.k = lerp(cur.k, target.k, 0.04);
    gl.uniform2f(U.r, cv.width, cv.height); gl.uniform1f(U.t, (now - t0) / 1000);
    gl.uniform3fv(U.c1, cur.c1); gl.uniform3fv(U.c2, cur.c2); gl.uniform3fv(U.c3, cur.c3); gl.uniform1f(U.k, cur.k);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
  document.body.classList.add("has-aurora");
  return {
    mood(name) { target = MOODS[name] || MOODS.night; }, ok: true,
    off() { running = false; cv.style.display = "none"; document.body.classList.remove("has-aurora"); }
  };
})();
if (!BG.off) BG.off = () => {};

/* ---------- Quality guard: on a slow computer, drop the costliest layers by itself ---------- */
const lowFX = () => document.body.classList.contains("lowfx");
(() => {
  const force = store.get("gipfelquiz.fx"); // "high" or "low" to override
  const goLow = () => { document.body.classList.add("lowfx"); BG.off(); document.getElementById("grain")?.remove(); };
  if (force === "low") { goLow(); return; }
  if (force === "high" || reduced) return;
  let n = 0, t0 = 0, prev = 0, slow = 0;
  const check = (now) => {
    if (prev && now - prev > 250) { n = 0; t0 = 0; } // tab was hidden or the page paused: start over
    prev = now;
    if (!t0) { t0 = now; n = 0; }
    n++;
    if (now - t0 >= 2000) {
      const fps = (n * 1000) / (now - t0); n = 0; t0 = now;
      slow = fps < 24 ? slow + 1 : 0;
      if (slow >= 2) { goLow(); return; }
    }
    requestAnimationFrame(check);
  };
  setTimeout(() => requestAnimationFrame(check), 3000);
})();

/* ---------- Effects: particles, shake, flash, callouts, flying points, wipes ---------- */
const FX = (() => {
  const cv = document.getElementById("fxcanvas"); const cx = cv.getContext("2d");
  let W = 0, H = 0, raf = 0; const P = [];
  const COLS = [PAL.safran, PAL.hibiskus, PAL.bahari, PAL.majani, PAL.udongo, PAL.theluji, PAL.anga, "#FFE38A"];
  function size() { const d = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * d); cv.height = Math.round(H * d); cx.setTransform(d, 0, 0, d, 0, 0); }
  size(); addEventListener("resize", size);
  function star(x, y, r) { cx.beginPath(); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } cx.closePath(); cx.fill(); }
  let lastT = 0;
  function tick(now) {
    // physics in 60 fps steps, scaled by the real frame time (same look at 30, 60 or 120 Hz)
    const f = lastT ? clamp((now - lastT) / 16.667, 0.25, 4) : 1; lastT = now;
    cx.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.age += f / 60; const k = p.age / p.life;
      if (k >= 1) { P.splice(i, 1); if (p.end) p.end(p); continue; }
      const dr = Math.pow(p.drag, f);
      p.vx *= dr; p.vy = p.vy * dr + p.g * f; p.x += p.vx * f; p.y += p.vy * f; p.rot += p.vr * f;
      cx.globalAlpha = p.fade ? Math.max(0, 1 - k) : k > 0.72 ? (1 - k) / 0.28 : 1;
      if (p.kind === "conf") { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.scale(1, Math.cos(p.rot * 1.7)); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore(); }
      else if (p.kind === "spark") { cx.strokeStyle = p.c; cx.lineWidth = p.w; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4); cx.stroke(); }
      else if (p.kind === "ring") { cx.strokeStyle = p.c; cx.lineWidth = Math.max(0.5, p.w * (1 - k)); cx.beginPath(); cx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - k, 3)), 0, 6.283); cx.stroke(); }
      else if (p.kind === "star") { cx.fillStyle = p.c; star(p.x, p.y, p.w * (1 - k * 0.6)); }
      else if (p.kind === "shell") { cx.fillStyle = "#FFF3C4"; cx.beginPath(); cx.arc(p.x, p.y, 2.6, 0, 6.283); cx.fill(); if (Math.random() < 0.7) add({ kind: "star", x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.6, vy: 0.6, c: "#FFD27A", w: 4, life: 0.45, fade: true }); }
    }
    cx.globalAlpha = 1;
    if (P.length) raf = requestAnimationFrame(tick); else { raf = 0; lastT = 0; }
  }
  function add(p) { P.push(Object.assign({ age: 0, vx: 0, vy: 0, g: 0, drag: 0.985, rot: 0, vr: 0, w: 4, h: 6, life: 1.5 }, p)); if (!raf) raf = requestAnimationFrame(tick); }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function burst(x, y, o = {}) {
    if (reduced) return; const n = o.n ?? 50, cols = o.colors || COLS;
    for (let i = 0; i < n; i++) {
      const a = (o.angle ?? -Math.PI / 2) + (Math.random() - 0.5) * (o.spread ?? Math.PI * 2); const s = (o.speed ?? 9) * (0.3 + Math.random() * 0.8);
      const kind = o.kind || (Math.random() < 0.62 ? "conf" : Math.random() < 0.6 ? "spark" : "star");
      add({ kind, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: o.g ?? 0.22, drag: 0.972, c: pick(cols), w: kind === "conf" ? 6 + Math.random() * 7 : kind === "star" ? 6 + Math.random() * 6 : 2 + Math.random() * 2.4, h: 9 + Math.random() * 9, rot: Math.random() * 6.3, vr: (Math.random() - 0.5) * 0.35, life: (o.life ?? 1.7) * (0.7 + Math.random() * 0.6) });
    }
  }
  const mid = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r]; };
  function burstEl(el, o) { if (!el) return; const [x, y] = mid(el); burst(x, y, o); }
  function ring(x, y, c = PAL.theluji, r1 = 120, w = 6) { if (reduced) return; add({ kind: "ring", x, y, r0: 8, r1, c, w, life: 0.7 }); }
  function ringEl(el, c, r1) { if (!el) return; const [x, y, r] = mid(el); ring(x, y, c, r1 || Math.max(r.width, r.height) * 0.75); }
  function explode(x, y, c) {
    const cols = [c, pick(COLS), "#FFF3C4"];
    for (let i = 0; i < 90; i++) { const a = Math.random() * 6.283, s = 2 + Math.random() * 6.5; add({ kind: Math.random() < 0.8 ? "spark" : "star", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 0.05, drag: 0.965, c: pick(cols), w: 2 + Math.random() * 2, life: 1.2 + Math.random() * 0.9 }); }
    ring(x, y, c, 170, 3);
  }
  function firework(x, y) {
    if (reduced) return; const c = pick(COLS); const x0 = x + (Math.random() - 0.5) * 160, life = 0.85;
    add({ kind: "shell", x: x0, y: H + 10, vx: (x - x0) / (life * 60), vy: (y - H - 10) / (life * 60), drag: 1, life, end: () => explode(x, y, c) });
    SFX.firework();
  }
  function fireworksShow(sec = 8) {
    if (reduced) return; const until = performance.now() + sec * 1000, token = renderToken;
    const fire = () => { if (performance.now() > until || token !== renderToken) return; firework(W * (0.15 + Math.random() * 0.7), H * (0.12 + Math.random() * 0.35)); setTimeout(fire, 380 + Math.random() * 520); };
    fire();
  }
  function shake(px = 10, ms = 420) {
    if (reduced) return; const el = document.getElementById("app"); const kf = [];
    for (let i = 0; i <= 8; i++) { const d = px * (1 - i / 8); kf.push({ transform: i === 8 ? "none" : `translate(${(Math.random() - 0.5) * 2 * d}px, ${(Math.random() - 0.5) * 2 * d}px)` }); }
    el.animate(kf, { duration: ms, easing: "ease-out" });
  }
  function flash(color = "#fff", ms = 380, op = 0.55) {
    if (reduced) return; const el = document.createElement("div"); el.className = "fxflash"; el.style.background = color; document.body.appendChild(el);
    el.animate([{ opacity: op }, { opacity: 0 }], { duration: ms, easing: "ease-out" }).onfinish = () => el.remove();
  }
  function callout(text, o = {}) {
    const token = renderToken;
    const el = document.createElement("div"); el.className = "callout" + (o.cls ? " " + o.cls : "");
    el.innerHTML = `<div class="co-in">${o.kicker ? `<span class="co-k">${esc(o.kicker)}</span>` : ""}<span class="co-main gtitle">${esc(text)}</span>${o.sub ? `<span class="co-sub">${esc(o.sub)}</span>` : ""}</div>`;
    document.body.appendChild(el);
    try { (o.sound || SFX.impact)(); } catch { /* sound optional */ }
    if (o.shake !== false) shake(o.shakeAmt ?? 10, 380);
    if (o.burst) burst(innerWidth / 2, innerHeight / 2, { n: 70, speed: 12 });
    if (o.ring !== false) ring(innerWidth / 2, innerHeight / 2, o.ringColor || "rgba(255,240,200,.9)", Math.min(innerWidth, innerHeight) * 0.42, 5);
    const inn = el.firstChild;
    const bl = (v) => (lowFX() ? {} : { filter: `blur(${v}px)` });
    inn.animate([{ transform: "scale(2.4)", opacity: 0, ...bl(14) }, { transform: "scale(.95)", opacity: 1, ...bl(0), offset: 0.65 }, { transform: "scale(1)", opacity: 1, ...bl(0) }], { duration: reduced ? 1 : 360, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "forwards" });
    return new Promise((res) => setTimeout(() => {
      if (!el.isConnected) { res(false); return; }
      const out = inn.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.88) translateY(-1.2rem)" }], { duration: reduced ? 1 : 240, easing: "ease-in", fill: "forwards" });
      out.onfinish = () => { el.remove(); res(token === renderToken); };
    }, (reduced ? 0 : 360) + (o.hold ?? 850)));
  }
  function flyText(from, to, text, color) {
    const token = renderToken;
    return new Promise((res) => {
      if (!from || !to || reduced) return res();
      const [x0, y0] = mid(from); const [x1, y1] = mid(to);
      const el = document.createElement("div"); el.className = "flytext"; el.textContent = text; el.style.color = color || "#6BDB84"; document.body.appendChild(el);
      const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 140, my = Math.min(y0, y1) - 160;
      const kf = [0, 0.2, 0.45, 0.7, 1].map((t) => {
        const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1;
        const s = t < 0.2 ? 0.7 + t * 3 : 1.3 - t * 0.6;
        return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(2)})`, opacity: t > 0.95 ? 0.3 : 1 };
      });
      const an = el.animate(kf, { duration: 950, easing: "cubic-bezier(.45,0,.3,1)", fill: "forwards" });
      const iv = setInterval(() => { const r = el.getBoundingClientRect(); add({ kind: "star", x: r.left + r.width / 2, y: r.top + r.height / 2, vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6, c: "#FFE38A", w: 6, life: 0.55, fade: true }); }, 32);
      an.onfinish = () => { clearInterval(iv); el.remove(); if (token !== renderToken) return res(); burst(x1, y1, { n: 16, speed: 5, g: 0.1, life: 0.8 }); ring(x1, y1, PAL.safran, 42, 4); SFX.coin(); res(); };
    });
  }
  async function wipe(fn, colors) {
    if (reduced) { fn(); return; }
    const [c1, c2] = colors || [PAL.safran, PAL.udongo];
    const el = document.createElement("div"); el.className = "wipe"; el.style.backgroundColor = c1; el.style.backgroundImage = kangaPattern(c1, c2);
    el.innerHTML = `<div class="wipe-logo"><span>Gipfel</span><b>quiz</b></div>`;
    document.body.appendChild(el); Sound.whoosh();
    const A0 = "polygon(0% 0%, 0% 0%, -25% 100%, -25% 100%)", A1 = "polygon(0% 0%, 125% 0%, 100% 100%, -25% 100%)", A2 = "polygon(125% 0%, 125% 0%, 100% 100%, 100% 100%)";
    try { await el.animate([{ clipPath: A0 }, { clipPath: A1 }], { duration: 430, easing: "cubic-bezier(.75,0,.25,1)", fill: "forwards" }).finished; } catch { /* ignore */ }
    try { fn(); } catch (e) { console.error(e); }
    await sleep(120);
    try { await el.animate([{ clipPath: A1 }, { clipPath: A2 }], { duration: 470, easing: "cubic-bezier(.75,0,.25,1)", fill: "forwards" }).finished; } catch { /* ignore */ }
    el.remove();
  }
  function pulse(el, color) { if (!el || reduced) return; el.animate([{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(1.12)", filter: "brightness(1.6)" }, { transform: "scale(1)", filter: "brightness(1)" }], { duration: 520, easing: "cubic-bezier(.2,.9,.3,1.3)" }); ringEl(el, color || PAL.good, 60); }
  function clear() { $$(".callout, .flytext, .qbig, .roundslam, .cdim").forEach((e) => e.remove()); P.length = 0; }
  return { burst, burstEl, ring, ringEl, firework, fireworksShow, shake, flash, callout, flyText, wipe, pulse, clear, mid };
})();

/* ---------- Per-screen mood, music and stale effects (runs before each view is drawn) ---------- */
let ambWanted = false;
function screenFX() {
  FX.clear();
  document.body.classList.remove("urgent", "spot-1", "spot-2", "spot-3");
  const ph = view === "game" && game ? game.phase : view;
  const p = view === "game" && game && game.plan ? game.plan[game.r] : null;
  const isFinal = !!p && p.round === "final";
  const mood = ph === "podium" || ph === "awards" ? "gold" : isFinal && (ph === "intro" || ph === "wager" || ph === "question") ? "tension" : ph === "question" || view === "player" ? "calm" : "night";
  BG.mood(mood);
  ambWanted = !isPhone() && (view === "title" || view === "setup" || ph === "intro" || ph === "board" || ph === "awards");
  SFX.ambient(ambWanted);
}
// browsers only allow sound after the first tap: start the background music right then
{ const ul = Sound.unlock; Sound.unlock = () => { ul(); if (ambWanted) SFX.ambient(true); }; }
const altPct = (s) => clamp(((s - BASE) / (SUMMIT - BASE)) * 100, 0, 100).toFixed(1);

/* film grain: a small noise tile, shifted a few times per second */
(() => {
  const g = document.getElementById("grain"); if (!g) return;
  if (reduced) { g.remove(); return; }
  try {
    const c = document.createElement("canvas"); c.width = c.height = 160; const x = c.getContext("2d"); const im = x.createImageData(160, 160);
    for (let i = 0; i < im.data.length; i += 4) { const v = (Math.random() * 255) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); g.style.backgroundImage = `url(${c.toDataURL()})`;
  } catch { g.remove(); }
})();

/* ---------- Stats for streaks and awards ---------- */
function statOf(id) { game.stats = game.stats || {}; return (game.stats[id] = game.stats[id] || { ok: 0, ans: 0, streak: 0, best: 0, fast: 0, est: 0, zoom: 0, jok: 0, big: 0, ranks: [] }); }
function leaderId() { if (!game) return null; const l = ranked(game.teams); return l.length && (l.length === 1 || l[0].t.score > l[1].t.score) ? l[0].t.id : null; }
function recordStats(kind, gains, cur) {
  const teams = activeTeams(); const correct = teams.filter((t) => (gains[t.id] || 0) > 0);
  let fastest = null;
  if (game.mode === "live" && correct.length > 1 && (kind === "mc" || kind === "tf" || kind === "zoom")) fastest = correct.slice().sort((a, b) => (cur.times[a.id] ?? 9) - (cur.times[b.id] ?? 9))[0];
  for (const t of teams) {
    const s = statOf(t.id); const g = gains[t.id] || 0;
    const did = kind === "est" ? String(cur.est[t.id] ?? "").trim() !== "" : cur.picks[t.id] !== undefined;
    if (did) s.ans++;
    if (g > 0) { s.ok++; s.streak++; s.best = Math.max(s.best, s.streak); s.big = Math.max(s.big, g); if (kind === "est") s.est++; if (kind === "zoom") s.zoom += g; if (cur.jokers[t.id]) s.jok++; }
    else if (kind !== "final") s.streak = 0;
  }
  if (fastest) statOf(fastest.id).fast++;
  return { correct, fastest };
}
const AWARDS = [
  { t: "Blitzmerker", icon: "bolt", d: (s) => `${s.fast}× am schnellsten richtig`, v: (s) => s.fast },
  { t: "Serienkletterer", icon: "fire", d: (s) => `${s.best} richtige Antworten am Stück`, v: (s) => (s.best >= 3 ? s.best : 0) },
  { t: "Schätzmeister", icon: "target", d: (s) => `${s.est}× am nächsten dran`, v: (s) => s.est },
  { t: "Adlerauge", icon: "eye", d: (s) => `${fmt(s.zoom)} m in der Zoom-Safari`, v: (s) => s.zoom },
  { t: "Rückenwind-Profi", icon: "wind", d: () => "Den Joker genau richtig eingesetzt", v: (s) => s.jok },
  { t: "Comeback des Abends", icon: "up", d: (s) => `${s.cb} ${s.cb === 1 ? "Platz" : "Plätze"} nach oben geklettert`, v: (s) => s.cb || 0 },
  { t: "Raketenstart", icon: "rocket", d: (s) => `+${fmt(s.big)} m mit einer einzigen Antwort`, v: (s) => s.big },
  { t: "Wissensdurst", icon: "bulb", d: (s) => `${s.ok} richtige Antworten`, v: (s) => s.ok }
];
const FALLBACK_AWARDS = [{ t: "Teamgeist", icon: "heart", d: "Zusammen bis zum Schluss geklettert" }, { t: "Pole-pole-Meister", icon: "snail", d: "Langsam, aber stetig nach oben" }, { t: "Gute-Laune-Seilschaft", icon: "smile", d: "Die beste Stimmung am Berg" }];
function computeAwards() {
  const res = {}; const list = ranked(game.teams);
  for (const x of list) if (x.rank === 1) res[x.t.id] = { t: "Gipfelstürmer", icon: "crown", d: `Ganz oben auf ${fmt(x.t.score)} m` };
  if (!game.stats) game.stats = {};
  for (const t of game.teams) { const s = statOf(t.id); let cb = 0; for (let i = 0; i < s.ranks.length; i++) for (let j = i + 1; j < s.ranks.length; j++) cb = Math.max(cb, s.ranks[i] - s.ranks[j]); s.cb = cb; }
  for (const a of AWARDS) {
    const c = game.teams.filter((t) => !res[t.id]).map((t) => ({ t, v: a.v(statOf(t.id)) })).filter((x) => x.v > 0).sort((x, y) => y.v - x.v);
    if (c.length) res[c[0].t.id] = { t: a.t, icon: a.icon, d: a.d(statOf(c[0].t.id)) };
  }
  let k = 0; for (const t of game.teams) if (!res[t.id]) res[t.id] = Object.assign({}, FALLBACK_AWARDS[k++ % FALLBACK_AWARDS.length]);
  return res;
}

/* ---------- HUD (team panels in the top bar) ---------- */
function rankMap() { const m = {}; for (const x of ranked(game.teams)) m[x.t.id] = x.rank; return m; }
function allTied() { return game.teams.every((t) => t.score === game.teams[0].score); }
function hudBadges() {
  if (!game) return; const rk = rankMap(); const tied = allTied();
  for (const t of game.teams) {
    const el = $("#ts-" + t.id); if (!el) continue;
    const r = $(".rk", el); if (r) { r.textContent = rk[t.id]; r.classList.toggle("first", rk[t.id] === 1); r.classList.toggle("hide", tied); }
    const s = statOf(t.id).streak; let sk = $(".sk", el);
    if (s >= 2) { if (!sk) { el.insertAdjacentHTML("beforeend", `<i class="sk">${I.fire}<b></b></i>`); sk = $(".sk", el); } $("b", sk).textContent = s; } else if (sk) sk.remove();
  }
}
function hudCount(t) {
  const em = $(`#ts-${t.id} em`); if (!em) return;
  const from = parseInt(String(em.textContent).replace(/\D/g, ""), 10) || t.score; const to = t.score;
  $("#ts-" + t.id)?.style.setProperty("--p", altPct(to) + "%");
  if (reduced || from === to) { em.textContent = `${fmt(to)} m`; return; }
  const t0 = performance.now(), dur = 650;
  const step = (now) => { const k = clamp((now - t0) / dur, 0, 1); em.textContent = `${fmt(from + (to - from) * (1 - Math.pow(1 - k, 3)))} m`; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- Question entrance: read first, then the answers fly in ---------- */
function questionIntro(start) {
  const scr = $(".screen.q"); const { Q, kind, p } = current();
  if (!scr || reduced) { start(); return; }
  scr.classList.add("prep");
  const big = document.createElement("div"); big.className = "qbig";
  const label = p.round === "final" ? (game.tiebreak ? "Stechfrage" : "Finalfrage") : `Frage ${game.i + 1} von ${p.qs.length}`;
  big.innerHTML = `<span class="qbig-k gtitle">${label}</span><span class="qbig-t">${esc(Q.q)}</span><span class="qbig-bar"><i></i></span>`;
  document.body.appendChild(big);
  SFX.impact(); FX.shake(5, 300);
  const readMs = kind === "zoom" ? 1700 : kind === "final" ? 3800 : clamp(1700 + Q.q.length * 24, 2200, 4200);
  big.animate([{ opacity: 0, transform: "translate(-50%, -50%) scale(.8)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }], { duration: 380, easing: "cubic-bezier(.2,.9,.3,1.25)", fill: "forwards" });
  $(".qbig-bar i", big).animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration: readMs, easing: "linear", fill: "forwards" });
  const token = renderToken;
  setTimeout(() => {
    if (token !== renderToken) { big.remove(); return; }
    big.animate([{ opacity: 1, transform: "translate(-50%, -50%) scale(1)" }, { opacity: 0, transform: "translate(-50%, -64%) scale(.7)" }], { duration: 320, easing: "ease-in", fill: "forwards" }).onfinish = () => big.remove();
    scr.classList.remove("prep");
    $$(".qimg, .zoomframe", scr).forEach((el) => el.animate([{ opacity: 0, transform: "translateX(-3rem) rotate(-3deg) scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 560, easing: "cubic-bezier(.2,.9,.3,1.15)", fill: "backwards" }));
    $$(".qtext, .qkicker, .qunit", scr).forEach((el) => el.animate([{ opacity: 0, transform: "translateY(-1rem)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "ease-out", fill: "backwards" }));
    $$(".tile", scr).forEach((el, i) => {
      el.animate([{ opacity: 0, transform: "perspective(900px) translateY(3rem) rotateX(45deg) scale(.9)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: 120 + i * 95, easing: "cubic-bezier(.2,.9,.3,1.3)", fill: "backwards" });
      setTimeout(() => { if (token === renderToken) Sound.click(); }, 120 + i * 95);
    });
    $$(".timer, .qfoot", scr).forEach((el) => el.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 380, easing: "cubic-bezier(.2,.9,.3,1.4)", fill: "backwards" }));
    SFX.go();
    start();
  }, readMs);
}

/* ---------- Reveal: suspense, the big moment, points flying to the teams ---------- */
async function revealSuspense(kind) {
  const tiles = $$("#tiles .tile");
  SFX.riser(1.45); Sound.drumroll(reduced ? 0.3 : 1.45);
  if (reduced) { await sleep(300); return; }
  if (tiles.length > 1) {
    const t0 = performance.now(); let i = 0;
    while (performance.now() - t0 < 1380) { const el = tiles[i % tiles.length]; el.classList.add("scan"); await sleep(Math.max(65, 175 - i * 11)); el.classList.remove("scan"); i++; }
  } else { await sleep(500); SFX.heartbeat(); await sleep(480); SFX.heartbeat(); await sleep(420); }
}
async function revealFX(kind, gains, prevLeader, info) {
  const token = renderToken; const alive = () => token === renderToken;
  const cur = game.cur; const ct = $("#tile-" + cur.correct);
  if (ct && kind !== "est") { FX.flash("#fff", 300, 0.32); FX.burstEl(ct, { n: 90, speed: 12 }); FX.ringEl(ct, "#fff"); FX.shake(9, 380); SFX.stamp(); if (!$(".stamp", ct)) ct.insertAdjacentHTML("beforeend", `<span class="stamp">Richtig!</span>`); }
  if (kind === "est") { const win = $(".estline .pin.win"); if (win) setTimeout(() => { if (alive()) { FX.burstEl(win, { n: 60, speed: 9 }); SFX.stamp(); } }, 1250); }
  $$("#tiles .tile:not(.correct)").forEach((el, i) => setTimeout(() => { if (alive() && i === 0) SFX.thud(); }, 260));
  await sleep(kind === "est" ? 1500 : 650); if (!alive()) return;
  const teams = activeTeams(); const n = teams.length;
  const right = info.correct;
  if (kind === "mc" || kind === "tf" || kind === "zoom") {
    if (!right.length) { if (!(await FX.callout("Keiner wusste es!", { sub: "Puh – das war eine harte Nuss.", sound: SFX.thud, shakeAmt: 4, ring: false }))) return; }
    else if (right.length === n && n > 1) { if (!(await FX.callout("Alle richtig!", { sub: "Die ganze Familie klettert mit.", burst: true, sound: SFX.shimmer }))) return; }
  }
  if (info.fastest && game.mode === "live") { if (!(await FX.callout("Blitzschnell!", { kicker: info.fastest.name, sub: "am schnellsten richtig geantwortet", cls: "co-bolt", sound: SFX.sting }))) return; }
  if (kind === "est") { const u = game.unit; const vt = teams.find((t) => (gains[t.id] || 0) >= 2 * u); if (vt && !game.tiebreak) { if (!(await FX.callout("Volltreffer!", { kicker: vt.name, sub: "höchstens 5 % daneben", burst: true }))) return; } }
  const flights = [];
  teams.forEach((t, i) => {
    const d = gains[t.id] || 0; if (!d) return;
    const from = $(`.tile-chips img[data-team="${t.id}"]`) || $(`.estline .pin[data-team="${t.id}"]`) || $(`.rchip[data-team="${t.id}"]`) || ct;
    flights.push(sleep(i * 170).then(() => FX.flyText(from, $("#ts-" + t.id), `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))} m`, d > 0 ? "#7CF29A" : "#FF8A8A")).then(() => { hudCount(t); hudBadges(); }));
  });
  await Promise.all(flights); if (!alive()) return;
  for (const t of teams) { game.teams.forEach((x) => x.id === t.id && hudCount(x)); }
  hudBadges();
  const MILESTONES = [3, 5, 7, 10, 15, 20];
  const hot = teams.filter((t) => (gains[t.id] || 0) > 0 && MILESTONES.includes(statOf(t.id).streak)).sort((a, b) => statOf(b.id).streak - statOf(a.id).streak)[0];
  if (hot) { if (!(await FX.callout(`${statOf(hot.id).streak}er-Serie!`, { kicker: hot.name, sub: "brennt gerade richtig!", cls: "co-fire", sound: SFX.streak }))) return; }
  const now = leaderId();
  if (prevLeader && now && prevLeader !== now) await FX.callout("Führungswechsel!", { kicker: teamById(now).name, sub: "übernimmt die Spitze", sound: SFX.sting, cls: "co-gold" });
}

/* ---------- Round intro: the big title slam ---------- */
function introFX(R, isFinal) {
  if (reduced) return;
  const token = renderToken; const at = (ms, fn) => setTimeout(() => { if (token === renderToken) fn(); }, ms);
  const d = $(".wipe") ? 400 : 0; // after a wipe, let the screen clear before the title lands
  const big = document.createElement("div"); big.className = "roundslam" + (isFinal ? " final" : "");
  big.innerHTML = `<span class="gtitle">${isFinal ? "Finale" : `Runde ${game.r + 1}`}</span>`;
  document.body.appendChild(big);
  at(d, () => SFX.whip());
  at(d + 300, () => { SFX.boom(); FX.shake(isFinal ? 18 : 12, 480); FX.flash(isFinal ? "#FF6A3C" : "#FFF3D6", 320, 0.35); });
  const bl = (v) => (lowFX() ? {} : { filter: `blur(${v}px)` });
  big.animate([
    { transform: "translate(-50%, -50%) scale(3)", opacity: 0, ...bl(16) },
    { transform: "translate(-50%, -50%) scale(.96)", opacity: 1, ...bl(0), offset: 0.22 },
    { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.6 },
    { transform: "translate(-50%, -260%) scale(.45)", opacity: 0 }
  ], { duration: 1500, delay: d, easing: "cubic-bezier(.3,.8,.3,1)", fill: "both" }).onfinish = () => big.remove();
  const card = $(".kanga"); if (card) card.animate([{ transform: "perspective(1200px) rotateX(-80deg) translateY(5rem)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 760, delay: d + 820, easing: "cubic-bezier(.2,.9,.3,1.15)", fill: "backwards" });
  const img = $(".intro-img"); if (img) img.animate([{ transform: "scale(0) rotate(-220deg)" }, { transform: "none" }], { duration: 760, delay: d + 1180, easing: "cubic-bezier(.2,.9,.3,1.3)", fill: "backwards" });
  const jina = $(".jina"); if (jina) jina.animate([{ transform: "scaleX(0)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 620, delay: d + 1450, easing: "cubic-bezier(.2,.9,.3,1)", fill: "backwards" });
  const btn = $(".intro-actions"); if (btn) btn.animate([{ opacity: 0, transform: "translateY(2rem)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: d + 1700, easing: "ease-out", fill: "backwards" });
  at(d + 1200, () => { SFX.whip(); if (img) FX.ringEl(img, PAL.safran); });
  if (isFinal) at(d + 380, () => { SFX.thunder(); FX.flash("#fff", 160, 0.75); setTimeout(() => FX.flash("#fff", 120, 0.5), 220); });
}

/* ---------- Title: logo slam and a living scene ---------- */
let titleShown = false;
function titleFX() {
  if (reduced) return;
  const row = $(".wordmark-row"); const logo = $(".wordmark"); if (!row || !logo) return;
  const first = !titleShown; titleShown = true; const token = renderToken;
  row.animate([{ transform: "scale(2.4)", opacity: 0, filter: "blur(12px)" }, { transform: "scale(.96)", opacity: 1, filter: "blur(0px)", offset: 0.7 }, { transform: "none", opacity: 1, filter: "blur(0px)" }], { duration: first ? 700 : 450, delay: first ? 250 : 0, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "backwards" });
  setTimeout(() => { if (token !== renderToken) return; FX.ringEl(logo, PAL.safran, 260); FX.burstEl(logo, { n: 40, speed: 8, kind: "star", g: 0.05, life: 1.2 }); FX.shake(7, 360); SFX.boom(); }, first ? 700 : 300);
  $$(".title-wrap > :not(.wordmark-row)").forEach((el, i) => el.animate([{ opacity: 0, transform: "translateY(1.4rem)" }, { opacity: 1, transform: "none" }], { duration: 520, delay: (first ? 750 : 250) + i * 90, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
}

/* ---------- Board: camera ride up the mountain, rank shuffle ---------- */
function boardFX(prev) {
  const token = renderToken; const alive = () => token === renderToken;
  const svg = $(".mtn svg"); const rank = $(".rank"); if (!svg || !rank) return;
  const sc = (t) => prev[t.id] ?? BASE;
  const prevSorted = game.teams.slice().sort((a, b) => sc(b) - sc(a));
  const prevRank = {}; prevSorted.forEach((t) => (prevRank[t.id] = 1 + prevSorted.filter((o) => sc(o) > sc(t)).length));
  const rows = $$(".rrow", rank); const foot = $(".board-foot", rank);
  prevSorted.forEach((t) => { const r = rows.find((x) => x.dataset.team === t.id); if (r) rank.insertBefore(r, foot); });
  rows.forEach((r) => { $(".pos", r).textContent = prevRank[r.dataset.team]; r.classList.remove("first"); });
  // remember ranks (once per board) for the comeback award, and who led before
  const list = ranked(game.teams); const lid = leaderId(); const before = game.lastLeader;
  game.rankLog = game.rankLog || {};
  if (!game.rankLog[game.r]) { game.rankLog[game.r] = 1; for (const x of list) statOf(x.t.id).ranks.push(x.rank); }
  game.lastLeader = lid || game.lastLeader; save();
  // camera
  const full = [0, 0, 1000, 720]; const n = game.teams.length;
  const lead = game.teams.slice().sort((a, b) => b.score - a.score)[0];
  const li = game.teams.indexOf(lead); const pts = routePts(li, n);
  const focus = (alt) => { const [x, y] = pointAt(pts, Math.min(alt, SUMMIT + 300), li, n); const w = 560, h = 403; return [clamp(x - w / 2, 0, 1000 - w), clamp(y - h * 0.55, 0, 720 - h), w, h]; };
  if (!reduced) {
    const t0 = performance.now() + 450, dur = 2600, from = sc(lead), to = lead.score;
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const cam = (now) => {
      if (!alive()) return;
      const k = clamp((now - t0) / dur, 0, 1); const alt = from + (to - from) * ease(k);
      const f = focus(alt); const z = clamp((k - 0.62) / 0.38, 0, 1); const e = z * z * (3 - 2 * z);
      const vb = f.map((v, i) => v + (full[i] - v) * e);
      svg.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" "));
      if (k < 1) requestAnimationFrame(cam); else svg.setAttribute("viewBox", full.join(" "));
    };
    svg.setAttribute("viewBox", focus(from).join(" "));
    requestAnimationFrame(cam);
  }
  setTimeout(async () => {
    if (!alive()) return;
    rows.forEach((r) => (r.style.animation = "none"));
    const first = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
    list.forEach(({ t }) => { const r = rows.find((x) => x.dataset.team === t.id); if (r) rank.insertBefore(r, foot); });
    rows.forEach((r) => {
      const dy = first.get(r) - r.getBoundingClientRect().top;
      if (dy && !reduced) r.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.2,.9,.3,1.1)" });
      const id = r.dataset.team; const x = list.find((y) => y.t.id === id); const d = prevRank[id] - x.rank;
      $(".pos", r).textContent = x.rank; r.classList.toggle("first", x.rank === 1);
      if (d) r.insertAdjacentHTML("beforeend", `<i class="delta ${d > 0 ? "up" : "down"}">${d > 0 ? "▲" : "▼"}${Math.abs(d)}</i>`);
      if (d > 0 && !reduced) FX.ringEl($("img", r), PAL.good, 50);
    });
    if (rows.some((r) => $(".delta", r))) SFX.whip();
    const p = game.plan[game.r];
    if (p.round === "final") { await FX.callout(lid ? "Endstand!" : "Gleichstand!", { kicker: lid ? `${teamById(lid).name} ganz oben` : "an der Spitze", cls: "co-gold", sound: SFX.sting }); }
    else if (lid && before && before !== lid) await FX.callout("Neue Führung!", { kicker: teamById(lid).name, sub: "klettert an die Spitze", sound: SFX.sting, cls: "co-gold" });
    else if (list.length > 1 && list[0].t.score - list[1].t.score <= game.unit) await FX.callout("Kopf-an-Kopf!", { sub: `${list[0].t.name} und ${list[1].t.name} trennen nur ${fmt(list[0].t.score - list[1].t.score)} m`, sound: SFX.sting });
  }, reduced ? 50 : 3200);
}

/* ---------- Award ceremony ---------- */
function viewPodium() {
  setScene("off"); Sky.snow(false);
  const list = ranked(game.teams);
  game.awards = game.awards || computeAwards();
  const order = [list[1], list[0], list[2]].filter(Boolean);
  const cols = order.map((x) => {
    const place = x === list[0] ? 1 : x === list[1] ? 2 : 3;
    const [c1, c2] = place === 1 ? [PAL.safran, PAL.udongo] : place === 2 ? [PAL.theluji, PAL.mawingu] : [PAL.udongo, PAL.safran];
    return `<div class="pcol p${place} ${reduced ? "show" : ""}" style="--tc:${teamColor(x.t)}"><span class="crown">${I.crown}</span><img class="pav" src="${avatarSrc(x.t)}" alt=""><span class="pn">${esc(x.t.name)}</span><span class="pm">${esc(x.t.members)}</span><span class="pa">${fmt(x.t.score)} m</span>
      <div class="pblock" style="--c1:${c1};background-image:${kangaPattern(c1, c2)}"><span>${x.rank}</span></div></div>`;
  }).join("");
  const others = list.slice(3).map((x) => `<span class="rchip" style="--tc:${teamColor(x.t)};--n:0"><img src="${avatarSrc(x.t)}" alt=""><span>${x.rank}. ${esc(x.t.name)}</span><b>${fmt(x.t.score)} m</b></span>`).join("");
  mount(`<section class="screen podium-screen ceremony">
    <header class="topbar" style="width:100%;justify-content:flex-end">${ctrls()}</header>
    <div class="spots" aria-hidden="true"><i class="spot sp2"></i><i class="spot sp1"></i><i class="spot sp3"></i></div>
    <div class="podium-head"><p class="eyebrow">Hongera! · Herzlichen Glückwunsch</p><h2 class="gtitle">Siegerehrung</h2></div>
    <div class="podium">${cols}</div>
    ${others ? `<div class="others">${others}</div>` : ""}
    <div class="podium-actions row ${reduced ? "" : "hidden"}" id="pfoot"><button class="btn primary big" data-act="awards" data-primary ${reduced ? "" : "disabled"}>Auszeichnungen ${I.arrow}</button><button class="btn" data-act="showBoard">Höhenprofil</button><button class="btn ghost" data-act="again">Neues Spiel</button></div>
  </section>`);
  game.finished = true; store.del(SAVE_KEY);
  if (reduced) game.cerDone = true; else ceremony(list);
}
async function ceremony(list) {
  const token = renderToken; const alive = () => token === renderToken;
  SFX.boom(); FX.shake(10, 420);
  await sleep(1000); if (!alive()) return;
  for (const n of [3, 2]) {
    const el = $(".pcol.p" + n); if (!el) continue;
    Sound.drumroll(0.95); await sleep(1000); if (!alive()) return;
    el.classList.add("show"); document.body.classList.add("spot-" + n);
    SFX.impact(); FX.shake(8, 360); FX.burstEl($(".pav", el), { n: 36, speed: 7 }); SFX.applause(1.8);
    await sleep(1300); if (!alive()) return;
  }
  const p1 = $(".pcol.p1"); if (!p1) return;
  SFX.heartbeat(); await sleep(750); SFX.heartbeat(); await sleep(650); if (!alive()) return;
  SFX.riser(2.2); Sound.drumroll(2.2); await sleep(2300); if (!alive()) return;
  p1.classList.add("show"); document.body.classList.add("spot-1");
  game.cerDone = true; broadcast();
  FX.flash("#fff", 450, 0.85); FX.shake(20, 650); SFX.boom(); Sound.fanfare(); SFX.applause(5);
  FX.burstEl($(".pav", p1), { n: 160, speed: 14 }); FX.fireworksShow(10); Confetti.fire(9);
  const top = list.filter((x) => x.rank === 1);
  await sleep(900); if (!alive()) return;
  await FX.callout(top.length > 1 ? "Gemeinsam ganz oben!" : top[0].t.name, { kicker: "Gipfelstürmer", sub: `${fmt(top[0].t.score)} m – Hongera!`, cls: "co-gold", hold: 2000, sound: SFX.shimmer, ring: false });
  if (!alive()) return;
  $("#pfoot")?.classList.remove("hidden"); $("#pfoot [data-act=awards]")?.removeAttribute("disabled");
  $("#pfoot")?.animate([{ opacity: 0, transform: "translateY(1.5rem)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "ease-out" });
}
function viewAwards() {
  setScene("dim"); Sky.snow(true);
  game.cerDone = true;
  const aw = game.awards || (game.awards = computeAwards());
  const list = ranked(game.teams);
  const winners = list.filter((x) => x.rank === 1).map((x) => x.t); const w = winners[0];
  const date = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const names = winners.map((t) => `<b>${esc(t.name)}</b>${t.members ? ` (${esc(t.members)})` : ""}`).join(" und ");
  const verb = winners.length > 1 ? "haben" : "hat";
  const height = w.score > SUMMIT ? `eine Höhe von <b>${fmt(w.score)} m</b> erreicht ${verb} – sogar höher als der Uhuru Peak, das Dach Afrikas` : w.score === SUMMIT ? `den Uhuru Peak auf <b>5.895 m</b> erreicht ${verb} – das Dach Afrikas` : `eine Höhe von <b>${fmt(w.score)} m</b> erreicht ${verb} – nur noch ${fmt(SUMMIT - w.score)} m bis zum Uhuru Peak`;
  const cards = list.map(({ t, rank }, i) => { const a = aw[t.id] || FALLBACK_AWARDS[0]; return `<div class="award" style="--tc:${teamColor(t)};--n:${i}"><div class="award-in"><img class="award-av" src="${avatarSrc(t)}" alt=""><span class="award-ic">${AI[a.icon] || AI.heart}</span><b class="award-t">${esc(a.t)}</b><span class="award-team">${esc(t.name)} · Platz ${rank}</span><span class="award-d">${esc(a.d)}</span></div></div>`; }).join("");
  const cols = list.length <= 4 ? list.length : 3;
  mount(`<section class="screen awards-screen">
    <header class="topbar" style="width:100%;justify-content:flex-end">${ctrls()}</header>
    <div class="podium-head"><p class="eyebrow">Für jede Seilschaft</p><h2 class="gtitle">Auszeichnungen</h2></div>
    <div class="awards ${list.length > 4 ? "many" : ""}" style="--cols:${cols}">${cards}</div>
    <div class="podium-foot">
      <div class="cert" style="background-image:${kangaPattern(PAL.safran, PAL.udongo)}"><div class="cert-in"><span class="seal">${I.peak}</span><div>
        <h3>Gipfelurkunde</h3>
        <p>Hiermit wird bestätigt, dass ${winners.length > 1 ? "die Seilschaften" : "die Seilschaft"} ${names} am <b>${date}</b> beim Gipfelquiz ${height}.</p>
        <p class="hongera">Hongera! Herzlichen Glückwunsch!</p></div></div></div>
      <div class="podium-actions"><button class="btn primary" data-act="again" data-primary>Neues Spiel ${I.arrow}</button><button class="btn" data-act="podium">Siegerehrung</button></div>
    </div>
  </section>`);
  if (!reduced) {
    const token = renderToken;
    $$(".award").forEach((el, i) => {
      el.animate([{ transform: "perspective(900px) rotateY(-100deg) scale(.8)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 700, delay: 300 + i * 420, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "backwards" });
      setTimeout(() => { if (token === renderToken) { SFX.shimmer(); FX.burstEl(el, { n: 24, speed: 6, kind: "star", g: 0.04, life: 1 }); } }, 650 + i * 420);
    });
  }
}

/* ---------- Phones: the big moments in the hand ---------- */
function phoneFX(st) {
  const q = st.q;
  if (st.ph === "question" && q && q.sg === "revealed" && q.rev && PS.fxq !== q.id) {
    PS.fxq = q.id;
    if (q.act && !q.act.includes(P.team)) return;
    const g = (q.rev.g && q.rev.g[P.team]) || 0; const el = $(".pres");
    el?.animate([{ transform: "scale(.55)", opacity: 0 }, { transform: "scale(1.06)", opacity: 1, offset: 0.7 }, { transform: "none", opacity: 1 }], { duration: 560, easing: "cubic-bezier(.2,.9,.3,1.3)" });
    if (g > 0) { FX.flash("#6BDB84", 560, 0.55); FX.burstEl(el, { n: 90, speed: 11 }); FX.ringEl(el, "#fff"); vibrate([40, 50, 40, 50, 180]); }
    else { FX.flash("#FF5A6A", 480, 0.42); FX.shake(12, 420); vibrate(280); }
  }
  if ((st.ph === "podium" || st.ph === "awards") && st.cd && PS.fxp !== st.gid) {
    PS.fxp = st.gid; const rank = rankIn(st.sc || {}, P.team);
    if (rank === 1) { FX.flash("#FFD45A", 600, 0.6); FX.fireworksShow(7); Confetti.fire(6); vibrate([60, 60, 60, 60, 320]); }
    else { FX.burst(innerWidth / 2, innerHeight * 0.32, { n: 70 }); vibrate([40, 60, 40]); }
  }
}
for (const name of ["pAnswer", "pEst", "pWager"]) {
  const f = A[name];
  A[name] = (...a) => { f(...a); const c = $(".pmsg .pcheck"); if (c) { FX.ringEl(c, PAL.good, 140); FX.burstEl(c, { n: 30, speed: 7, kind: "star", g: 0.06, life: 0.9 }); } };
}

/* ---------- Transitions between big moments ---------- */
{ const at = A.addTime; A.addTime = (...a) => { at(...a); SFX.whip(); if (timer && timer.remaining > 10.5) { document.body.classList.remove("urgent"); const p = game.plan[game.r]; BG.mood(p && p.round === "final" ? "tension" : "calm"); } }; }
(() => {
  const wrap = (name, colors) => { const f = A[name]; A[name] = (...a) => FX.wipe(() => f(...a), typeof colors === "function" ? colors() : colors); };
  wrap("start", [PAL.safran, PAL.udongo]);
  wrap("nextRound", () => { const p = game.plan[game.r + 1]; const R = p && roundById(p.round); return R ? roundColors(R) : [PAL.safran, PAL.udongo]; });
  wrap("podium", [PAL.safran, PAL.hibiskus]);
  wrap("tiebreak", [PAL.hibiskus, PAL.safran]);
  A.awards = () => FX.wipe(() => { game.phase = "awards"; render(); }, [PAL.majani, PAL.safran]);
  const next = A.next;
  A.next = (...a) => { const p = game.plan[game.r]; const toBoard = p.round === "final" || game.i >= p.qs.length - 1; if (toBoard) FX.wipe(() => next(...a), [PAL.anga, PAL.theluji]); else next(...a); };
})();
