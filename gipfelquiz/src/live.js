/* =====================================================================
   Version 2: Live-Modus mit Handys, Antwortkarte, Flaggen, neue Bilder.
   Die Handys und der Fernseher tauschen sich über die `room`-Fähigkeit
   von claude.ai aus: Der Fernseher veröffentlicht den Spielstand als
   „presence“, jedes Handy veröffentlicht Team und Antwort als „presence“.
   ===================================================================== */
const QR_SVG = window.__QR || "";
I.phone = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>';
I.tv = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
const isPhone = () => { try { return matchMedia("(max-width: 760px)").matches; } catch { return false; } };

/* ---------- Flags (drawn, so they stay sharp on the TV) ---------- */
const FLAG_NAMES = { tz: "Tansania", na: "Namibia", cg: "Republik Kongo", tt: "Trinidad und Tobago", ie: "Irland", ci: "Elfenbeinküste", it: "Italien", hu: "Ungarn", no: "Norwegen", dk: "Dänemark", is: "Island", fi: "Finnland", at: "Österreich", lv: "Lettland", pl: "Polen", pe: "Peru" };
const NA_SUN = (() => {
  const pts = []; for (let k = 0; k < 24; k++) { const a = (k * 15 - 90) * Math.PI / 180, r = k % 2 ? 1.75 : 3.1; pts.push(`${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`); }
  return `<polygon points="${pts.join(" ")}" fill="#FFCE00"/><circle r="1.45" fill="#FFCE00" stroke="#003580" stroke-width=".35"/>`;
})();
const tri3 = (a, b, c, hz) => (hz ? `<rect width="30" height="20" fill="${b}"/><rect width="30" height="6.67" fill="${a}"/><rect y="13.33" width="30" height="6.67" fill="${c}"/>` : `<rect width="30" height="20" fill="${b}"/><rect width="10" height="20" fill="${a}"/><rect x="20" width="10" height="20" fill="${c}"/>`);
const nordic = (bg, fg, inner) => `<rect width="30" height="20" fill="${bg}"/><rect x="8" width="4" height="20" fill="${fg}"/><rect y="8" width="30" height="4" fill="${fg}"/>${inner ? `<rect x="9" width="2" height="20" fill="${inner}"/><rect y="9" width="30" height="2" fill="${inner}"/>` : ""}`;
const FLAGS = {
  ie: tri3("#169B62", "#FFFFFF", "#FF883E"), ci: tri3("#F77F00", "#FFFFFF", "#009E60"), it: tri3("#009246", "#FFFFFF", "#CE2B37"),
  hu: tri3("#CE2939", "#FFFFFF", "#477050", true), at: tri3("#ED2939", "#FFFFFF", "#ED2939", true), pe: tri3("#D91023", "#FFFFFF", "#D91023"),
  lv: '<rect width="30" height="20" fill="#9E3039"/><rect y="8" width="30" height="4" fill="#FFFFFF"/>',
  pl: '<rect width="30" height="20" fill="#FFFFFF"/><rect y="10" width="30" height="10" fill="#DC143C"/>',
  no: nordic("#BA0C2F", "#FFFFFF", "#00205B"), is: nordic("#02529C", "#FFFFFF", "#DC1E35"), fi: nordic("#FFFFFF", "#002F6C"),
  dk: '<rect width="30" height="20" fill="#C8102E"/><rect x="9" width="3" height="20" fill="#FFFFFF"/><rect y="8.5" width="30" height="3" fill="#FFFFFF"/>',
  tz: '<rect width="30" height="20" fill="#1EB53A"/><path d="M30 0V20H0Z" fill="#00A3DD"/><path d="M-2 21.4 32 -1.4" stroke="#FCD116" stroke-width="7.4"/><path d="M-2 21.4 32 -1.4" stroke="#000000" stroke-width="4.8"/>',
  na: `<rect width="30" height="20" fill="#009543"/><path d="M0 0H30L0 20Z" fill="#003580"/><path d="M-2 21.4 32 -1.4" stroke="#FFFFFF" stroke-width="7.6"/><path d="M-2 21.4 32 -1.4" stroke="#D21034" stroke-width="5.4"/><g transform="translate(6.4 5.6)">${NA_SUN}</g>`,
  cg: '<rect width="30" height="20" fill="#DC241F"/><path d="M0 0H30L0 20Z" fill="#009543"/><path d="M-2 21.4 32 -1.4" stroke="#FBDE4A" stroke-width="6.6"/>',
  tt: '<rect width="30" height="20" fill="#CE1126"/><path d="M-2 -1.4 32 21.4" stroke="#FFFFFF" stroke-width="7.4"/><path d="M-2 -1.4 32 21.4" stroke="#000000" stroke-width="5.2"/>'
};
function flagSVG(code) { return `<svg class="flag" viewBox="0 0 30 20" preserveAspectRatio="none" role="img" aria-label="Flagge">${FLAGS[code] || ""}</svg>`; }

/* ---------- Pictures for the new rounds ---------- */
function svgURI(s) { return "data:image/svg+xml," + encodeURIComponent(s); }
const STARS = Array.from({ length: 34 }, (_, k) => `<circle cx="${(k * 89) % 400}" cy="${(k * 61) % 400}" r="${k % 5 ? 1.1 : 2}" fill="#fff" opacity="${0.35 + (k % 4) * 0.15}"/>`).join("");
IMG.ill_allgemein = IMG.ill_allgemein || svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><radialGradient id="g" cx=".5" cy=".42" r=".65"><stop offset="0" stop-color="#2A3A86"/><stop offset="1" stop-color="#0D1330"/></radialGradient><radialGradient id="h"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".85"/><stop offset="1" stop-color="#FFE7A0" stop-opacity="0"/></radialGradient></defs>
  <rect width="400" height="400" fill="url(#g)"/>${STARS}<circle cx="200" cy="165" r="160" fill="url(#h)"/>
  ${Array.from({ length: 9 }, (_, k) => { const a = (-170 + k * 20) * Math.PI / 180; return `<line x1="${(200 + Math.cos(a) * 112).toFixed(1)}" y1="${(160 + Math.sin(a) * 112).toFixed(1)}" x2="${(200 + Math.cos(a) * 146).toFixed(1)}" y2="${(160 + Math.sin(a) * 146).toFixed(1)}" stroke="${PAL.safran}" stroke-width="10" stroke-linecap="round"/>`; }).join("")}
  <path d="M162 244 C162 218 120 202 120 160 A80 80 0 1 1 280 160 C280 202 238 218 238 244 Z" fill="#FFD45A"/>
  <path d="M176 240 V204 L188 178 L200 198 L212 178 L224 204 V240" fill="none" stroke="#B07A0C" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M146 134 A58 58 0 0 1 192 100" fill="none" stroke="#FFF6D6" stroke-width="11" stroke-linecap="round" opacity=".85"/>
  <rect x="160" y="246" width="80" height="17" rx="7" fill="#AAB4D8"/><rect x="164" y="267" width="72" height="15" rx="7" fill="#8E99C2"/><rect x="170" y="286" width="60" height="15" rx="7" fill="#AAB4D8"/><path d="M186 305 h28 l-7 14 h-14 Z" fill="#5E6A9A"/></svg>`);
IMG.ill_kino = IMG.ill_kino || svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><radialGradient id="g" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#4A2457"/><stop offset="1" stop-color="#0D1330"/></radialGradient></defs>
  <rect width="400" height="400" fill="url(#g)"/>${STARS}
  <g transform="translate(150 175)"><circle r="96" fill="#2A387A" stroke="${PAL.theluji}" stroke-width="8"/>${Array.from({ length: 6 }, (_, k) => { const a = k * 60 * Math.PI / 180; return `<circle cx="${(Math.cos(a) * 54).toFixed(1)}" cy="${(Math.sin(a) * 54).toFixed(1)}" r="21" fill="#0D1330"/>`; }).join("")}<circle r="15" fill="${PAL.theluji}"/></g>
  <g fill="${PAL.safran}"><path d="M262 104 L352 84 L352 108 L262 128 Z"/><rect x="262" y="104" width="10" height="150"/><rect x="342" y="84" width="10" height="150"/><ellipse cx="246" cy="256" rx="30" ry="21" transform="rotate(-20 246 256)"/><ellipse cx="326" cy="236" rx="30" ry="21" transform="rotate(-20 326 236)"/></g>
  <g transform="translate(0 304)"><rect width="400" height="62" fill="#05081A"/>${Array.from({ length: 13 }, (_, k) => `<rect x="${k * 32 + 6}" y="6" width="16" height="9" rx="2" fill="${PAL.theluji}" opacity=".75"/><rect x="${k * 32 + 6}" y="47" width="16" height="9" rx="2" fill="${PAL.theluji}" opacity=".75"/>`).join("")}${Array.from({ length: 5 }, (_, k) => `<rect x="${k * 82 + 4}" y="20" width="72" height="22" rx="3" fill="${[PAL.hibiskus, PAL.bahari, PAL.safran, PAL.majani, PAL.anga][k]}" opacity=".9"/>`).join("")}</g></svg>`);

/* ---------- Connection (room) ---------- */
const Net = (() => {
  let room = null, status = "init", started = false, connected = false, peers = [], last = null, lastStr = "";
  const subs = new Set();
  const notify = () => subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
  async function init() {
    if (!window.claude || typeof window.claude.use !== "function") { status = "off"; notify(); return; }
    try { room = await window.claude.use("room"); } catch { room = null; }
    if (!room) { status = "off"; notify(); return; }
    status = "on";
    try {
      room.onPeers((ch) => { peers = ch.peers || []; notify(); }, () => { status = "off"; notify(); });
      room.onConnection((c) => { connected = !!c; notify(); }, () => { status = "off"; notify(); });
    } catch { status = "off"; }
    if (last) { const p = last; last = null; lastStr = ""; setPresence(p); }
    notify();
  }
  function setPresence(obj) {
    const str = JSON.stringify(obj);
    if (str === lastStr) return;
    if (!room || status !== "on") { last = obj; return; }
    const patch = Object.assign({}, obj);
    if (last) for (const k of Object.keys(last)) if (!(k in obj)) patch[k] = null;
    last = obj; lastStr = str;
    room.presence(patch).catch(() => { lastStr = ""; });
  }
  return {
    ensure() { if (!started) { started = true; init(); } },
    get status() { return status; },
    get connected() { return connected; },
    peers: () => peers,
    sub(fn) { subs.add(fn); return () => subs.delete(fn); },
    setPresence
  };
})();

/* ---------- Host (TV) side ---------- */
function liveActive() { return (view === "setup" && setup.mode === "live") || (view === "game" && !!game && game.mode === "live"); }
function qid() { return game ? `${game.id}:${game.r}:${game.i}${game.tiebreak ? ":tb" : ""}` : ""; }
function wagerSteps() { const u = game.unit; return [0, 2 * u, 4 * u, 6 * u]; }
function answered(t) { const c = game && game.cur; if (!c) return false; return current().kind === "est" ? c.est[t.id] !== undefined && String(c.est[t.id]).trim() !== "" : c.picks[t.id] !== undefined; }
function livePlayers() { return Net.peers().filter((p) => p.kind === "viewer" && !p.sameTab && p.presence && p.presence.role === "player" && p.presence.code === setup.code); }
function devicesByTeam() { const m = {}; for (const p of livePlayers()) { const t = p.presence.team; if (t) (m[t] = m[t] || []).push(String(p.presence.name || "").slice(0, 24)); } return m; }
function hostState() {
  const p = game.plan[game.r];
  const st = { ph: game.phase, gid: game.id, r: game.r + 1, rof: game.plan.length, ri: p.round, u: game.unit,
    sc: Object.fromEntries(game.teams.map((t) => [t.id, t.score])), jk: game.teams.filter((t) => t.joker).map((t) => t.id) };
  if (game.phase === "question" && game.cur) {
    const { kind } = current(); const cur = game.cur;
    const q = { id: qid(), k: kind, ri: p.round, qi: p.round === "final" ? 0 : p.qs[game.i], tb: game.tiebreak ? 1 : 0, n: game.i + 1, of: p.qs.length,
      ord: cur.order || null, sg: cur.stage === "revealing" ? "entry" : cur.stage, tot: timer ? timer.total : durationFor(kind),
      left: timer ? Math.max(0, timer.remaining) : (cur.stage === "run" ? (cur.remaining ?? durationFor(kind)) : 0), run: !!(timer && timer.running),
      ans: activeTeams().filter(answered).map((t) => t.id), act: activeTeams().map((t) => t.id) };
    q.rd = cur.started || cur.stage !== "run" ? 1 : 0;
    if (cur.stage === "revealed") q.rev = { c: cur.correct ?? null, g: cur.gains || {}, p: cur.picks, e: kind === "est" ? cur.est : null };
    st.q = q;
  }
  if (game.phase === "wager") st.w = { opts: wagerSteps(), set: Object.keys(game.wagerLocked || {}) };
  if (game.phase === "podium" || game.phase === "awards") {
    st.cd = game.cerDone ? 1 : 0;
    if (game.awards) st.aw = Object.fromEntries(Object.entries(game.awards).map(([id, a]) => [id, { t: a.t, d: String(a.d).slice(0, 70), i: a.icon }]));
  }
  return st;
}
let hostPresenceOn = false;
function broadcast() {
  if (view === "player") return;
  if (!liveActive()) { if (hostPresenceOn) { hostPresenceOn = false; Net.setPresence({}); } return; }
  const teams = view === "setup" ? setup.teams : game.teams;
  hostPresenceOn = true;
  Net.setPresence({ role: "host", code: setup.code, v: 2, teams: teams.map((t) => ({ id: t.id, n: String(t.name || animal(t.animal).name).slice(0, 18), a: t.animal })), st: view === "setup" ? { ph: "lobby" } : hostState() });
}
function render() {
  renderView();
  try {
    hudBadges();
    if (view === "setup" && setup.mode === "live") { Net.ensure(); updateSetupDevices(); }
    if (view === "game" && game && game.mode === "live") { Net.ensure(); updateDeviceBadges(); }
    broadcast();
  } catch (e) { console.error(e); }
}
function onLivePeers() {
  if (view === "setup") { if (setup.mode === "live") updateSetupDevices(); return; }
  if (view !== "game" || !game || game.mode !== "live") return;
  const list = livePlayers(); let changed = false;
  if (game.phase === "question" && game.cur && (game.cur.stage === "run" || game.cur.stage === "entry")) {
    const id = qid(); const { kind } = current(); const cur = game.cur; const nOpt = kind === "tf" ? 2 : 4; const fresh = [];
    for (const pl of list) {
      const pr = pl.presence; const a = pr.ans; if (!a || a.id !== id) continue;
      const t = activeTeams().find((x) => x.id === pr.team); if (!t || answered(t)) continue;
      if (kind === "est") { const v = String(a.v ?? "").slice(0, 24); if (!Number.isFinite(parseNum(v))) continue; cur.est[t.id] = v; }
      else { const k = Number(a.k); if (!Number.isInteger(k) || k < 0 || k >= nOpt) continue; cur.picks[t.id] = k; if (a.j && t.joker && (kind === "mc" || kind === "tf")) cur.jokers[t.id] = true; }
      cur.times[t.id] = timer ? clamp(1 - timer.remaining / timer.total, 0, 1) : 1; changed = true; fresh.push(t.id);
    }
    if (changed) {
      save(); SFX.lockIn(); updateLiveStatus(); broadcast();
      fresh.forEach((tid) => FX.pulse($("#ts-" + tid), PAL.good));
      if (cur.stage === "run" && activeTeams().every(answered)) stopTimeEarly(); else if (cur.stage === "entry") renderFoot();
    } else updateLiveStatus();
  } else if (game.phase === "wager") {
    game.wagerLocked = game.wagerLocked || {}; game.wagers = game.wagers || {};
    for (const pl of list) {
      const pr = pl.presence; const t = game.teams.find((x) => x.id === pr.team);
      if (!t || !pr.wg || pr.wg.gid !== game.id || game.wagerLocked[t.id]) continue;
      const v = Number(pr.wg.v); if (!wagerSteps().includes(v)) continue;
      game.wagers[t.id] = v; game.wagerLocked[t.id] = true; changed = true;
    }
    if (changed) { save(); SFX.lockIn(); broadcast(); }
    renderWagerCards();
  }
  updateDeviceBadges();
}
function updateDeviceBadges() { if (!game) return; const d = devicesByTeam(); for (const t of game.teams) $("#ts-" + t.id)?.classList.toggle("dev", (d[t.id] || []).length > 0); }
function liveStatusHTML() {
  const devs = devicesByTeam();
  return activeTeams().map((t) => {
    const done = answered(t); const n = (devs[t.id] || []).length;
    return `<span class="lchip ${done ? "done" : ""}" style="--tc:${teamColor(t)}"><img src="${avatarSrc(t)}" alt=""><b>${esc(t.name)}</b><i>${done ? `${I.check} drin` : n ? "tippt …" : "ohne Handy"}</i></span>`;
  }).join("");
}
function updateLiveStatus() { const el = $("#livestat"); if (el) el.innerHTML = liveStatusHTML(); }
function renderLiveFoot() {
  const { kind } = current(); const cur = game.cur; const foot = $("#qfoot"); if (!foot) return;
  const run = cur.stage === "run";
  const missing = activeTeams().filter((t) => !answered(t));
  const showManual = missing.length && (cur.manual || !run);
  foot.innerHTML = `<div class="runbar live">
      ${run ? `<button class="btn" data-act="pause" id="pausebtn">${timer && !timer.running ? `${I.play} Weiter` : `${I.pause} Pause`}</button>${kind !== "zoom" ? `<button class="btn" data-act="addTime">${I.plus} 10 s</button>` : ""}` : ""}
      <div class="livestat" id="livestat">${liveStatusHTML()}</div>
      ${run ? `<button class="btn primary" data-act="stopTime" data-primary>${I.stop} Zeit stoppen</button>` : `<button class="btn primary big pulse" data-act="reveal" data-primary id="revealbtn">Auflösen ${I.arrow}</button>`}
    </div>
    ${showManual ? entryHTML(kind, missing, false) : missing.length ? `<div><button class="linkbtn" data-act="toggleManual">Team ohne Handy? Antwort hier eintragen</button></div>` : ""}`;
  updateEntryState();
}
function liveTimeUp(kind, cur) {
  cur.stage = "entry"; cur.remaining = 0; save();
  if (kind === "zoom") applyZoom(0, current().Q);
  broadcast();
  if (activeTeams().every(answered)) {
    FX.callout("Alle haben getippt!", { sub: "Jetzt wird’s spannend …", sound: SFX.lockIn, shakeAmt: 5, hold: 450 })
      .then((ok) => { if (ok && game && game.cur === cur && cur.stage === "entry") reveal(); });
  } else { renderFoot(); FX.callout("Zeit ist um!", { cls: "co-fire", sound: SFX.boom, shakeAmt: 12, hold: 500 }); }
}
function wagerCardsHTML() {
  const u = game.unit; const steps = wagerSteps(); const devs = game.mode === "live" ? devicesByTeam() : {};
  game.wagers = game.wagers || {};
  return game.teams.map((t) => {
    if (game.wagers[t.id] === undefined) game.wagers[t.id] = 2 * u;
    const w = game.wagers[t.id]; const locked = !!(game.wagerLocked && game.wagerLocked[t.id]);
    const onPhone = game.mode === "live" && (devs[t.id] || []).length > 0;
    const body = locked ? `<div class="wstat on">${I.check} Einsatz am Handy gesetzt</div>` : onPhone ? `<div class="wstat">${I.phone} wählt am Handy …</div>`
      : `<div class="wager" aria-label="Einsatz in Metern">${steps.map((s) => `<button data-act="wager" data-team="${t.id}" data-v="${s}" aria-pressed="${w === s}" aria-label="${fmt(s)} Meter">${fmt(s)}</button>`).join("")}</div><span class="zt">Einsatz in Höhenmetern</span>`;
    return `<div class="eteam set" style="--tc:${teamColor(t)}"><div class="eteam-id"><img src="${avatarSrc(t)}" alt=""><b>${esc(t.name)}</b><span class="res" style="color:var(--mawingu)">${fmt(t.score)} m</span></div>${body}</div>`;
  }).join("");
}
function renderWagerCards() { const el = $("#wagerteams"); if (el) el.innerHTML = wagerCardsHTML(); }

/* ---------- Setup: choose how to play ---------- */
function modePickHTML() {
  const m = setup.mode;
  return `<div class="mode-pick" role="group" aria-label="Spielweise">
    <button class="mode" data-act="mode" data-v="screen" aria-pressed="${m !== "live"}"><b>${I.tv} Ein Bildschirm</b><span>Teams zeigen ihre Antwort mit Fingern oder der Antwortkarte am Handy. Die Spielleitung tippt ein.</span></button>
    <button class="mode" data-act="mode" data-v="live" aria-pressed="${m === "live"}"><b>${I.phone} Live mit Handys</b><span>Jedes Team tippt auf dem eigenen Handy – wer schneller richtig liegt, bekommt Bonus-Meter.</span></button>
  </div>`;
}
function liveBoxHTML() {
  return `<div class="livebox">
    ${QR_SVG ? `<div class="qr" aria-label="QR-Code zum Quiz">${QR_SVG}</div>` : ""}
    <div class="livebox-text">
      <b>Handys verbinden</b>
      <ol><li>QR-Code scannen – auf dem Handy bei claude.ai angemeldet.</li><li>„Am Handy mitspielen“ tippen und das Team wählen.</li></ol>
      <p class="code">Spiel-Code <b>${esc(setup.code)}</b></p>
      <p class="hint" id="netstate">${netStateText()}</p>
    </div>
  </div>`;
}
function netStateText(devs) {
  if (Net.status === "off") return `<span class="warn">Live-Verbindung ist hier nicht verfügbar, zum Beispiel in der Offline-Datei. Öffnet das Quiz bei claude.ai. Ohne Verbindung dienen die Handys als Antwortkarte.</span>`;
  if (Net.status !== "on") return "Verbinde …";
  const n = Object.values(devs || devicesByTeam()).reduce((s, a) => s + a.length, 0);
  return n ? `<b>${n} ${n === 1 ? "Gerät" : "Geräte"} verbunden.</b> Startet, wenn alle drin sind.` : "Noch kein Handy verbunden.";
}
function updateSetupDevices() {
  const devs = devicesByTeam();
  for (const t of setup.teams) {
    const el = $("#dev-" + t.id); if (!el) continue;
    const names = devs[t.id] || [];
    el.innerHTML = names.length ? `${I.phone}${names.length}` : ""; el.title = names.filter(Boolean).join(", ");
  }
  const ns = $("#netstate"); if (ns) ns.innerHTML = netStateText(devs);
}

/* =====================================================================
   Phone side: live player and offline answer card
   ===================================================================== */
const P = Object.assign({ team: null, name: "", code: null }, store.get(PLAYER_KEY) || {});
const PS = { mode: "search", since: 0, ans: null, wg: null, joker: null, key: "", card: { tab: "abcd", show: null } };
function savePlayer() { store.set(PLAYER_KEY, { team: P.team, name: P.name, code: P.code }); }
function liveHosts() { return Net.peers().filter((p) => p.kind === "viewer" && !p.sameTab && p.presence && p.presence.role === "host" && Array.isArray(p.presence.teams)); }
function myHost() { const hs = liveHosts(); if (P.code) { const h = hs.find((x) => x.presence.code === P.code); if (h) return h; } return hs.length === 1 ? hs[0] : null; }
function playerPresence() {
  const pres = { role: "player", code: P.code || "", team: P.team || "", name: String(P.name || "").slice(0, 24) };
  if (PS.ans) pres.ans = PS.ans;
  if (PS.wg) pres.wg = PS.wg;
  Net.setPresence(pres);
}
function localQuestion(q) {
  if (!q) return null;
  if (q.ri === "final") return q.tb ? TIEBREAK : FINAL;
  const R = ROUNDS.find((r) => r.id === q.ri); return R ? R.questions[q.qi] : null;
}
function playerKey() {
  if (PS.mode === "card") return "card:" + JSON.stringify(PS.card);
  const h = myHost();
  if (!h) return `search:${liveHosts().map((x) => x.presence.code).join(",")}:${Date.now() - PS.since > 6000}:${Net.status}`;
  const st = h.presence.st || {}; const q = st.q || {};
  return [h.peer, P.team, JSON.stringify(h.presence.teams), st.ph, st.r, q.id, q.sg, (q.ans || []).includes(P.team), PS.ans && PS.ans.id, PS.joker,
    st.ph === "wager" ? (st.w && st.w.set || []).includes(P.team) + ":" + (PS.wg && PS.wg.gid) : "", st.ph === "board" || st.ph === "podium" || st.ph === "awards" || q.sg === "revealed" ? JSON.stringify(st.sc) : "", (st.jk || []).includes(P.team), q.rd, st.cd, st.aw ? 1 : 0].join("|");
}
function playerUpdate() {
  if (view !== "player") return;
  const k = playerKey();
  if (k !== PS.key) { PS.key = k; renderView(); } else tickPlayer();
}
function tickPlayer() {
  const bar = $("#pbar"); if (!bar) return;
  const h = myHost(); const q = h && h.presence.st && h.presence.st.q; if (!q) return;
  let left = q.left || 0; if (q.run) left -= (Date.now() - h.updatedAt) / 1000;
  left = Math.max(0, left);
  bar.style.width = `${clamp(left / (q.tot || 1), 0, 1) * 100}%`;
  const s = $("#psec"); if (s) s.textContent = String(Math.ceil(left));
}
setInterval(() => { if (view === "player") playerUpdate(); }, 300);
Net.sub(() => { if (view === "player") playerUpdate(); else onLivePeers(); });

function phoneShell(inner, head = "") { return `<section class="screen pscreen">${head}<div class="pbody">${inner}</div></section>`; }
function teamOf(h) { return h.presence.teams.find((t) => t.id === P.team); }
function rankIn(sc, id) { const mine = sc[id] ?? BASE; return 1 + Object.values(sc).filter((v) => v > mine).length; }
function viewPlayer() {
  setScene("off"); Sky.snow(false);
  if (PS.mode === "card") return viewCard();
  const h = myHost();
  if (!h) return viewSearch();
  if (P.code !== h.presence.code) { P.code = h.presence.code; savePlayer(); }
  const teams = h.presence.teams;
  if (!P.team || !teams.some((t) => t.id === P.team)) return viewPickTeam(teams);
  playerPresence();
  const st = h.presence.st || { ph: "lobby" }; const team = teamOf(h);
  const sc = st.sc || {}; const my = sc[P.team];
  const head = `<header class="phead" style="--tc:${animal(team.a).color}"><img src="${avatarSrc({ animal: team.a })}" alt=""><span><b>${esc(team.n)}</b><em>${my !== undefined ? `${fmt(my)} m · Platz ${rankIn(sc, P.team)}` : "Seilschaft"}</em></span>${st.ph === "lobby" ? `<button class="linkbtn" data-act="changeTeam">Team wechseln</button>` : ""}</header>`;
  let body = "";
  if (st.ph === "lobby") {
    body = `<div class="pmsg"><div class="pcheck">${I.check}</div><div class="pbig">Ihr seid dabei!</div><p>Gleich startet die Spielleitung das Quiz. Die Fragen erscheinen auf dem Fernseher, getippt wird hier.</p></div>`;
  } else if (st.ph === "intro") {
    const R = roundById(st.ri) || { title: "", sub: "", colors: ["safran", "udongo"] };
    body = `<div class="pkanga" style="${roundStyle(R)}"><div class="pkanga-in"><p class="intro-num">${st.ri === "final" ? "Finale" : `Runde ${st.r} von ${st.rof}`}</p><h2>${esc(R.title)}</h2><p>${esc(R.sub || "")}</p></div></div><p class="pnote">Schaut auf den Fernseher – gleich geht’s los.</p>`;
  } else if (st.ph === "question" && st.q) {
    body = playerQuestionHTML(st, st.q);
  } else if (st.ph === "wager" && st.w) {
    const set = (st.w.set || []).includes(P.team) || (PS.wg && PS.wg.gid === st.gid);
    body = set ? `<div class="pmsg"><div class="pcheck">${I.check}</div><div class="pbig">Einsatz gesetzt</div>${PS.wg ? `<p><b>${fmt(PS.wg.v)} m</b></p>` : ""}<p class="pnote">Gleich kommt die Finalfrage.</p></div>`
      : `<p class="pq-k">Gipfelsturm · Kategorie</p><h2 class="pq">${esc(FINAL.cat)}</h2><p>Wie viele Höhenmeter setzt ihr? Richtig: Meter rauf. Falsch: Meter runter.</p><div class="pwager">${st.w.opts.map((v) => `<button class="btn big" data-act="pWager" data-v="${v}">${fmt(v)} m</button>`).join("")}</div>`;
  } else if ((st.ph === "podium" || st.ph === "awards") && !st.cd) {
    body = `<div class="pmsg pwait"><div class="pdrum" aria-hidden="true">${I.crown}</div><div class="pbig">Siegerehrung!</div><p>Schaut auf den Fernseher – gleich wird enthüllt, wer ganz oben steht …</p></div>`;
  } else if (st.ph === "board" || st.ph === "podium" || st.ph === "awards") {
    const order = Object.entries(sc).sort((a, b) => b[1] - a[1]);
    const rank = rankIn(sc, P.team); const next = CAMPS.find((c) => c.a > (my ?? BASE));
    const end = st.ph !== "board"; const aw = end && st.aw && st.aw[P.team];
    const msg = end ? (rank === 1 ? "Hongera! Ihr steht ganz oben!" : `Platz ${rank} – stark geklettert!`) : `Platz ${rank}`;
    body = `<div class="pmsg ${end && rank === 1 ? "pwin" : ""}"><div class="pbig">${msg}</div><p><b>${fmt(my ?? BASE)} m</b>${next && !end ? ` · noch ${fmt(next.a - (my ?? BASE))} m bis ${esc(next.n)}` : ""}</p></div>
      ${aw ? `<div class="paward"><span class="award-ic">${AI[aw.i] || AI.heart}</span><span><b>${esc(aw.t)}</b><em>${esc(aw.d)}</em></span></div>` : ""}
      <ol class="pranks">${order.map(([id, v]) => { const t = h.presence.teams.find((x) => x.id === id) || { n: "?", a: "simba" }; return `<li class="${id === P.team ? "me" : ""}" style="--tc:${animal(t.a).color}"><img src="${avatarSrc({ animal: t.a })}" alt=""><b>${esc(t.n)}</b><span>${fmt(v)} m</span></li>`; }).join("")}</ol>`;
  }
  mount(phoneShell(body, head));
  tickPlayer();
  phoneFX(st);
}
function playerQuestionHTML(st, q) {
  const Q = localQuestion(q); if (!Q) return `<div class="pmsg"><p>Diese Frage kennt das Handy nicht. Bitte die Seite neu laden.</p></div>`;
  const kind = q.k;
  const labels = kind === "tf" ? ["Wahr", "Falsch"] : kind === "est" ? [] : (q.ord || [0, 1, 2, 3]).map((k) => Q.o[k]);
  const labelText = (k) => (kind === "tf" ? labels[k] : Q.flags ? (FLAG_NAMES[labels[k]] || labels[k]) : labels[k]);
  if (q.act && !q.act.includes(P.team)) return `<div class="pmsg"><div class="pbig">Stechen!</div><p>Zwei Teams kämpfen um Platz 1 – ihr schaut zu.</p></div>`;
  if (q.sg === "revealed" && q.rev) {
    const g = (q.rev.g && q.rev.g[P.team]) || 0;
    const ours = kind === "est" ? (q.rev.e && q.rev.e[P.team]) : (q.rev.p && q.rev.p[P.team]);
    const none = ours === undefined || ours === null || ours === "";
    const right = kind === "est" ? `${fmtNum(Q.a)} ${Q.u}` : labelText(q.rev.c);
    const title = g > 0 ? "Richtig!" : g < 0 ? "Leider falsch" : none ? "Keine Antwort" : kind === "est" ? "Nicht am nächsten dran" : "Leider falsch";
    return `<div class="pres ${g > 0 ? "good" : g < 0 ? "neg" : "bad"}"><div class="pbig">${title}</div><div class="pgain">${g > 0 ? "+" : g < 0 ? "−" : ""}${fmt(Math.abs(g))} m</div>
      <p>Richtig: <b>${esc(right)}</b>${kind === "est" && !none ? `<br>Ihr: ${esc(ours)} ${esc(Q.u)}` : ""}</p></div><p class="pnote">${esc(Q.f)}</p>`;
  }
  const mine = PS.ans && PS.ans.id === q.id;
  if (mine || (q.ans || []).includes(P.team)) {
    const what = mine ? (kind === "est" ? `${PS.ans.v} ${Q.u}` : labelText(PS.ans.k)) : "";
    return `<div class="pmsg locked"><div class="pcheck">${I.check}</div><div class="pbig">Eingeloggt!</div><p>${mine ? `Eure Antwort: <b>${esc(what)}</b>${PS.ans.j ? " · mit Rückenwind" : ""}` : "Euer Team hat schon geantwortet."}</p><p class="pnote">Warte auf die anderen Teams …</p></div>`;
  }
  if (q.sg !== "run") return `<div class="pmsg"><div class="pbig">Zeit ist um!</div><p>Gleich kommt die Auflösung.</p></div>`;
  if (q.rd === 0) return `<p class="pq-k">${q.ri === "final" ? (q.tb ? "Stechfrage" : "Finalfrage") : `Frage ${q.n} von ${q.of}`}</p><h2 class="pq">${esc(Q.q)}</h2><div class="pmsg pready"><div class="pready-ring" aria-hidden="true"></div><div class="pbig">Gleich geht’s los …</div><p>Lest die Frage auf dem Fernseher.</p></div>`;
  const timerBar = `<div class="ptimer"><i id="pbar"></i><span id="psec"></span></div>`;
  const head = `<p class="pq-k">${q.ri === "final" ? (q.tb ? "Stechfrage" : "Finalfrage") : `Frage ${q.n} von ${q.of}`}</p><h2 class="pq">${esc(Q.q)}</h2>`;
  if (kind === "est") return `${timerBar}${head}<div class="pest"><input id="pestv" inputmode="decimal" autocomplete="off" placeholder="Eure Schätzung" aria-label="Eure Schätzung in ${esc(Q.u)}"><span>${esc(Q.u)}</span></div><button class="btn primary big pfull" data-act="pEst">Abschicken</button>`;
  const jok = (kind === "mc" || kind === "tf") && (st.jk || []).includes(P.team) ? `<button class="joker pj ${PS.joker === q.id ? "on" : ""}" data-act="pJoker">${I.wind} ${PS.joker === q.id ? "Rückenwind ×2 ist an" : "Rückenwind ×2 einsetzen"}</button>` : "";
  const btns = labels.map((l, k) => {
    const kk = kind === "tf" ? (k === 0 ? 3 : 0) : k; const num = kind === "tf" ? (k === 0 ? I.thumbUp : I.thumbDown) : k + 1;
    const inner = Q.flags ? `<span class="tile-flag">${flagSVG(l)}</span>` : `<span class="tile-text">${esc(l)}</span>`;
    return `<button class="tile ptile k${kk}" data-act="pAnswer" data-k="${k}" style="--n:${k}"><span class="tile-num">${num}</span>${inner}</button>`;
  }).join("");
  return `${timerBar}${head}${kind === "zoom" ? `<p class="pnote">Schaut genau aufs Bild am Fernseher!</p>` : ""}${jok}<div class="ptiles ${kind === "tf" ? "tf" : ""}">${btns}</div>`;
}
function viewSearch() {
  const hs = liveHosts(); const waited = Date.now() - PS.since > 6000;
  let inner;
  if (Net.status === "off") inner = `<div class="pmsg"><div class="pbig">Kein Live-Spiel möglich</div><p>Die Live-Verbindung gibt es nur, wenn das Quiz bei claude.ai geöffnet ist und jemand angemeldet ist. Ihr könnt das Handy trotzdem als Antwortkarte benutzen.</p></div>`;
  else if (hs.length > 1) inner = `<div class="pmsg"><div class="pbig">Welches Spiel?</div><p>Wählt den Spiel-Code, der auf dem Fernseher steht.</p></div><div class="pwager">${hs.map((x) => `<button class="btn big" data-act="pHost" data-code="${esc(x.presence.code)}">${esc(x.presence.code)}</button>`).join("")}</div>`;
  else inner = `<div class="pmsg"><div class="spinner" aria-hidden="true"></div><div class="pbig">Suche das Spiel …</div><p>Auf dem Fernseher muss bei „Expedition planen“ die Spielweise <b>Live mit Handys</b> gewählt sein.</p></div>`;
  mount(phoneShell(`${inner}<div class="pactions">${Net.status === "off" || waited ? `<button class="btn primary big pfull" data-act="useCard">Antwortkarte benutzen</button>` : `<button class="btn big pfull" data-act="useCard">Stattdessen Antwortkarte</button>`}<button class="linkbtn" data-act="leavePlayer">Zurück zum Start</button></div>`,
    `<header class="phead plain"><b>Gipfel<span>quiz</span></b><em>am Handy</em></header>`));
}
function viewPickTeam(teams) {
  const devs = {}; for (const p of Net.peers()) { const pr = p.presence || {}; if (pr.role === "player" && pr.code === P.code && pr.team && !p.sameTab) devs[pr.team] = (devs[pr.team] || 0) + 1; }
  mount(phoneShell(`<h2 class="pq">Welche Seilschaft seid ihr?</h2>
    <div class="pteams">${teams.map((t) => `<button class="pteam" data-act="pickTeam" data-team="${esc(t.id)}" style="--tc:${animal(t.a).color}"><img src="${avatarSrc({ animal: t.a })}" alt=""><b>${esc(t.n)}</b><span>${devs[t.id] ? `${devs[t.id]} Handy${devs[t.id] > 1 ? "s" : ""}` : "noch frei"}</span></button>`).join("")}</div>
    <label class="pname" for="pname">Dein Name (freiwillig)<input id="pname" maxlength="24" autocomplete="off" value="${esc(P.name)}" placeholder="z. B. Lea"></label>
    <div class="pactions"><button class="linkbtn" data-act="leavePlayer">Zurück zum Start</button></div>`,
    `<header class="phead plain"><b>Gipfel<span>quiz</span></b><em>Spiel-Code ${esc(P.code || "")}</em></header>`));
}
function viewCard() {
  const c = PS.card;
  if (c.show) {
    mount(`<section class="screen pscreen"><button class="pshow k${c.show.kk}" data-act="cardBack" aria-label="Neue Antwort wählen"><span class="pshow-big">${c.show.big}</span><span class="pshow-lbl">${esc(c.show.lbl)}</span><span class="pshow-hint">Hochhalten! · Antippen für neue Antwort</span></button></section>`);
    return;
  }
  const tabs = [["abcd", "1 – 4"], ["tf", "Wahr / Falsch"], ["num", "Zahl"]];
  let pad;
  if (c.tab === "tf") pad = `<div class="ptiles tf">${[["Wahr", 3, I.thumbUp], ["Falsch", 0, I.thumbDown]].map(([l, kk, ic]) => `<button class="tile ptile k${kk}" data-act="cardPick" data-kk="${kk}" data-big="${l === "Wahr" ? "👍" : "👎"}" data-lbl="${l}"><span class="tile-num">${ic}</span><span class="tile-text">${l}</span></button>`).join("")}</div>`;
  else if (c.tab === "num") pad = `<div class="pest"><input id="cardv" inputmode="decimal" autocomplete="off" placeholder="Eure Schätzung" aria-label="Eure Schätzung"></div><button class="btn primary big pfull" data-act="cardNum">Groß anzeigen</button>`;
  else pad = `<div class="ptiles grid">${[0, 1, 2, 3].map((k) => `<button class="tile ptile k${k}" data-act="cardPick" data-kk="${k}" data-big="${k + 1}" data-lbl="Antwort ${k + 1}"><span class="tile-num">${k + 1}</span></button>`).join("")}</div>`;
  mount(phoneShell(`<div class="seg ptabs" role="group">${tabs.map(([v, l]) => `<button data-act="cardTab" data-v="${v}" aria-pressed="${c.tab === v}">${l}</button>`).join("")}</div>
    <p class="pnote">Wählt geheim eure Antwort und haltet das Handy hoch, wenn das Spiel „Zeigen!“ ruft.</p>${pad}
    <div class="pactions"><button class="joker pj" data-act="cardJoker">${I.wind} Rückenwind-Joker zeigen</button>${Net.status === "on" ? `<button class="linkbtn" data-act="searchLive">Live-Spiel suchen</button>` : ""}<button class="linkbtn" data-act="leavePlayer">Zurück zum Start</button></div>`,
    `<header class="phead plain"><b>Antwort<span>karte</span></b><em>Gipfelquiz</em></header>`));
}
const vibrate = (p = 35) => { try { navigator.vibrate && navigator.vibrate(p); } catch { /* not allowed */ } };

/* ---------- Actions for the new parts ---------- */
Object.assign(A, {
  mode(b) { setup.mode = b.dataset.v === "live" ? "live" : "screen"; saveSetup(); render(); },
  toggleManual() { if (game && game.cur) { game.cur.manual = !game.cur.manual; renderFoot(); } },
  playerJoin() { view = "player"; Net.ensure(); PS.mode = "search"; PS.since = Date.now(); PS.key = ""; render(); },
  useCard() { PS.mode = "card"; PS.card.show = null; PS.key = ""; render(); },
  searchLive() { PS.mode = "search"; PS.since = Date.now(); PS.key = ""; render(); },
  leavePlayer() { Net.setPresence({}); view = "title"; PS.key = ""; render(); },
  pHost(b) { P.code = b.dataset.code; savePlayer(); PS.key = ""; render(); },
  pickTeam(b) { const n = $("#pname"); if (n) P.name = n.value.trim().slice(0, 24); P.team = b.dataset.team; savePlayer(); PS.ans = null; PS.wg = null; playerPresence(); PS.key = ""; render(); },
  changeTeam() { P.team = null; savePlayer(); playerPresence(); PS.key = ""; render(); },
  pAnswer(b) {
    const h = myHost(); const q = h && h.presence.st && h.presence.st.q; if (!q || q.sg !== "run" || q.rd === 0) return;
    PS.ans = { id: q.id, k: Number(b.dataset.k), j: PS.joker === q.id ? 1 : 0 }; PS.joker = null;
    playerPresence(); vibrate(); PS.key = ""; render();
  },
  pJoker() { const h = myHost(); const q = h && h.presence.st && h.presence.st.q; if (!q) return; PS.joker = PS.joker === q.id ? null : q.id; PS.key = ""; render(); },
  pEst() {
    const h = myHost(); const q = h && h.presence.st && h.presence.st.q; const inp = $("#pestv"); const v = ((inp && inp.value) || "").trim();
    if (!q || q.sg !== "run" || q.rd === 0) return;
    if (!Number.isFinite(parseNum(v))) { if (inp) { inp.classList.remove("shake"); void inp.offsetWidth; inp.classList.add("shake"); inp.focus(); } return; }
    PS.ans = { id: q.id, v }; playerPresence(); vibrate(); PS.key = ""; render();
  },
  pWager(b) { const h = myHost(); const st = h && h.presence.st; if (!st || st.ph !== "wager") return; PS.wg = { gid: st.gid, v: Number(b.dataset.v) }; playerPresence(); vibrate(); PS.key = ""; render(); },
  cardTab(b) { PS.card.tab = b.dataset.v; render(); },
  cardPick(b) { PS.card.show = { kk: Number(b.dataset.kk), big: b.dataset.big, lbl: b.dataset.lbl }; vibrate(); render(); },
  cardNum() { const v = (($("#cardv") || {}).value || "").trim(); if (!v) return; PS.card.show = { kk: 2, big: esc(v), lbl: "Unsere Schätzung" }; render(); },
  cardJoker() { PS.card.show = { kk: 2, big: "×2", lbl: "Rückenwind!" }; render(); },
  cardBack() { PS.card.show = null; render(); }
});
