// Grabar una salida con el GPS del teléfono (solo en la app de Android).
// Pausa, GPS apagable (sigue el tiempo y el pulso del reloj) y modo ahorro. Al terminar: mapa, parciales,
// altura corregida con mapa de relieve y pulso de la pulsera desde Health Connect.
'use strict';
const REC_KEY = 'bl_rec';
const REC = {st: null, watcher: null, tick: null, saveAt: 0, confirm: false};
const recPlugin = () => capPlugin('BackgroundGeolocation');
const REC_GPS = {normal: {label: 'Normal', filter: 5, acc: 25}, ahorro: {label: 'Ahorro', filter: 20, acc: 40}, off: {label: 'Apagado'}};
const REC_MAXV = {run: 12, hike: 6, ride: 40}; // m/s: más rápido que esto es un salto del GPS
const REC_TIPS = {
  run: ['La mayoría de tus km deberían ser a ritmo de charla: así entrenan los de élite (Seiler 2010).', 'Subir más de 30% los km de una semana a otra se asoció con más lesiones en corredores nuevos (Nielsen 2014).', 'Una cadencia un poco más alta (+5–10%) baja el impacto en rodillas y cadera (Heiderscheit 2011).', 'En salidas de menos de 1 h con clima templado alcanza con tomar agua según la sed (Hew-Butler 2015).'],
  ride: ['En bici, la mayor parte del tiempo suave construye la base aeróbica (Seiler 2010).', 'En salidas de más de 90 min sumá 30–60 g de carbohidratos por hora (Jeukendrup 2014).', 'Si podés hablar en frases completas, estás en intensidad suave (prueba del habla, Foster 2008).'],
  hike: ['Regla de Naismith: 1 hora cada 5 km en llano, más 1 hora cada 600 m de subida.', 'En bajada, pasos cortos y rodillas apenas flexionadas cuidan las articulaciones.', 'Fijate a qué hora se pone el sol y calculá la vuelta con margen.', 'El cuádriceps trabaja más en las bajadas: el dolor del día siguiente es normal.']
};

const recNow = st => st.endAt || Date.now();
const recMoving = st => Math.max(0, Math.round((recNow(st) - st.start - st.pausedMs - (st.paused ? recNow(st) - st.pauseAt : 0)) / 1000));
function recSave(force){ if (!REC.st) return; if (force || Date.now() - REC.saveAt > 8000) { REC.saveAt = Date.now(); ls.set(REC_KEY, REC.st); } }

// ---------- GPS ----------
async function recWatch(){
  const BG = recPlugin(), st = REC.st; if (!BG || !st) return;
  await recUnwatch();
  if (st.gps === 'off') return;
  const cfg = REC_GPS[st.gps];
  try {
    REC.watcher = await BG.addWatcher({backgroundTitle: 'Barra Libre está grabando tu salida', backgroundMessage: 'Tocá para volver a la app.', requestPermissions: true, stale: false, distanceFilter: cfg.filter}, (loc, err) => {
      if (err) { if (err.code === 'NOT_AUTHORIZED') { toast('Sin permiso de ubicación: activalo en Ajustes → Apps → Barra Libre → Permisos.'); try { BG.openSettings(); } catch(e){} } return; }
      if (loc) recPoint(loc);
    });
  } catch(e){ console.warn(e); toast('No se pudo encender el GPS'); }
}
async function recUnwatch(){ const BG = recPlugin(); if (BG && REC.watcher) { try { await BG.removeWatcher({id: REC.watcher}); } catch(e){} } REC.watcher = null; }
function recPoint(loc){
  const st = REC.st; if (!st) return;
  st.fix = {acc: Math.round(loc.accuracy || 999), at: Date.now()};
  if (st.paused || st.gps === 'off') return;
  if ((loc.accuracy || 999) > REC_GPS[st.gps].acc) return;
  const t = loc.time || Date.now();
  const q = [+loc.latitude.toFixed(6), +loc.longitude.toFixed(6), loc.altitude != null ? Math.round(loc.altitude * 10) / 10 : null, t, recMoving(st)];
  const last = st.pts[st.pts.length - 1];
  if (last && st.newLeg) { st.newLeg = false; }
  else if (last) {
    const d = hav(last, q) * 1000, dt = Math.max(1, (t - last[3]) / 1000);
    if (!st.gap && d / dt > REC_MAXV[st.sport]) return; // salto del GPS
    if (d < Math.max(3, (loc.accuracy || 10) / 2) && dt < 15) return; // quieto: no sumar ruido
    st.dist += d;
    if (q[2] != null && st.altRef != null) { if (q[2] - st.altRef >= 5) { st.gain += q[2] - st.altRef; st.altRef = q[2]; } else if (st.altRef - q[2] >= 5) st.altRef = q[2]; }
  }
  if (q[2] != null && st.altRef == null) st.altRef = q[2];
  st.gap = false;
  st.pts.push(q);
  recSave();
}

// ---------- empezar / pausar / terminar ----------
async function recStart(sport){
  const p = curProfile(); if (!p) return;
  if (!recPlugin()) { toast('Para grabar con GPS usá la app de Android'); return; }
  // permiso para mostrar el aviso de "grabando" (Android 13 o más nuevo)
  const LN = capPlugin('LocalNotifications'); if (LN) { try { const s = await LN.checkPermissions(); if (s.display !== 'granted') await LN.requestPermissions(); } catch(e){} }
  REC.st = {pid: p.id, sport, start: Date.now(), pausedMs: 0, paused: false, pauseAt: 0, gps: ls.get('bl_rec_gps', 'normal'), pts: [], dist: 0, gain: 0, altRef: null, fix: null, gap: false};
  REC.confirm = false; recSave(true);
  App.setOv({type: 'rec'}); recTick(); await recWatch();
  if (!ls.get('bl_rec_tip', false)) { ls.set('bl_rec_tip', true); App.openSheet('recTip'); }
}
function recTick(){ clearInterval(REC.tick); REC.tick = setInterval(recPaint, 1000); recPaint(); }
App.acts.recStart = el => recStart(el.dataset.arg);
App.acts.recPause = () => { const st = REC.st; if (!st) return; if (st.paused) { st.pausedMs += Date.now() - st.pauseAt; st.paused = false; st.newLeg = true; } else { st.paused = true; st.pauseAt = Date.now(); } REC.confirm = false; recSave(true); App.renderOverlay(); };
App.acts.recGps = async el => { const st = REC.st; if (!st) return; const m = el.dataset.arg; if (m === st.gps) return; st.gps = m; if (m !== 'off') { st.gap = true; ls.set('bl_rec_gps', m); } recSave(true); App.renderOverlay(); await recWatch(); toast(m === 'off' ? 'GPS apagado: sigue el tiempo; la distancia se retoma al prenderlo' : m === 'ahorro' ? 'Modo ahorro: menos puntos, menos batería' : 'GPS normal'); };
App.acts.recFinish = () => { if (!REC.confirm) { REC.confirm = true; App.renderOverlay(); setTimeout(() => { REC.confirm = false; if (S.ov && S.ov.type === 'rec') App.renderOverlay(); }, 4000); return; } recFinish(); };
App.acts.recMin = () => { App.setOv(null); App.render(); };
App.acts.recOpen = () => { App.setOv({type: 'rec'}); recTick(); };
async function recFinish(){
  const st = REC.st; if (!st) return;
  if (!st.endAt) { st.endAt = Date.now(); if (st.paused) { st.pausedMs += st.endAt - st.pauseAt; st.paused = false; } }
  recSave(true); await recUnwatch(); clearInterval(REC.tick);
  const durSec = Math.max(1, Math.round((st.endAt - st.start - st.pausedMs) / 1000));
  const elapsedSec = Math.round((st.endAt - st.start) / 1000);
  // parciales por km con tiempo en movimiento
  const splits = []; let acc = 0, nextKm = 1, lastM = 0;
  for (let i = 1; i < st.pts.length; i++) { acc += hav(st.pts[i - 1], st.pts[i]); if (acc >= nextKm) { splits.push(st.pts[i][4] - lastM); lastM = st.pts[i][4]; nextKm++; } }
  const step = Math.max(1, Math.ceil(st.pts.length / 300));
  const track = st.pts.length > 1 ? st.pts.filter((_, i) => i % step === 0 || i === st.pts.length - 1).map(q => [+q[0].toFixed(5), +q[1].toFixed(5), q[2], Math.round((q[3] - st.start) / 1000), null]) : null;
  const a = {id: 'gps_' + uid(), pid: st.pid, sport: st.sport, date: toLocalStr(st.start), type: st.sport === 'hike' ? 'trekking' : 'suave', distKm: +(st.dist / 1000).toFixed(2), durSec, elapsedSec, elev: Math.round(st.gain) || null, track, splits, src: 'gps', notes: '', rpe: null, hr: null};
  App.setOv(null); App.openSheet('recDone', {a});
}

// ---------- pantalla de grabación ----------
function recNumbers(st){
  const mov = recMoving(st), km = st.dist / 1000;
  const pts = st.pts; let cur = null;
  if (!st.paused && pts.length > 2) { const now = pts[pts.length - 1]; let j = pts.length - 2; while (j > 0 && now[3] - pts[j][3] < 30000) j--; let d = 0; for (let i = j + 1; i < pts.length; i++) d += hav(pts[i - 1], pts[i]); const dt = (now[3] - pts[j][3]) / 1000; if (dt > 5 && d > .01) cur = d / (dt / 3600); }
  const fmtV = v => v == null || !isFinite(v) || v <= 0 || v > (st.sport === 'ride' ? 90 : 30) ? '–' : st.sport === 'ride' ? fmtNum(v, 1) : L.paceStr(3600 / v);
  return {time: L.durStr(mov), km: fmtNum(km, 2), cur: fmtV(cur), avg: fmtV(mov && km > .02 ? km / (mov / 3600) : null), unit: st.sport === 'ride' ? 'km/h' : 'min/km', gain: Math.round(st.gain)};
}
function recGpsLabel(st){
  if (st.gps === 'off') return ['GPS apagado', 'warn'];
  if (!st.fix || Date.now() - st.fix.at > 20000) return ['Buscando señal…', 'warn'];
  return st.fix.acc <= 15 ? [`GPS bueno · ±${st.fix.acc} m`, 'ok'] : [`GPS débil · ±${st.fix.acc} m`, 'warn'];
}
function recPaint(){
  const st = REC.st; if (!st || !S.ov || S.ov.type !== 'rec') return;
  const n = recNumbers(st), g = recGpsLabel(st);
  const set = (id, v) => { const e = document.getElementById(id); if (e && e.textContent !== String(v)) e.textContent = v; };
  set('rec_t', n.time); set('rec_km', n.km); set('rec_cur', n.cur); set('rec_avg', n.avg); set('rec_up', n.gain);
  const gp = document.getElementById('rec_gps'); if (gp) { gp.textContent = g[0]; gp.className = 'pill ' + g[1]; }
  const rt = document.getElementById('rec_route'); if (rt && st.pts.length > 1 && (!REC.routeAt || Date.now() - REC.routeAt > 10000)) { REC.routeAt = Date.now(); rt.innerHTML = routeSVG(st.pts.map(q => [q[0], q[1]]), SP[st.sport].color, 'bigroute'); }
}
App.views.ov_rec = () => {
  const st = REC.st; if (!st) return '';
  if (st.recovered) return `<div class="overlay" role="dialog" aria-modal="true"><div class="wrap stack" style="padding-top:calc(24px + env(safe-area-inset-top,0px))">
    <h2>Tenés una salida sin terminar</h2><p class="small muted">${esc(SP[st.sport].label)} desde las ${new Date(st.start).toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit'})} · ${fmtNum(st.dist / 1000, 2)} km. La app se cerró mientras grababa.</p>
    <button class="btn primary" data-act="recResume">Seguir grabando</button><button class="btn" data-act="recFinishNow">Terminar y guardar</button><button class="btn ghost danger" data-act="recDiscard">Descartar</button></div></div>`;
  const n = recNumbers(st), g = recGpsLabel(st);
  const tips = REC_TIPS[st.sport] || [];
  const tip = st.paused && tips.length ? tips[Math.floor(st.pauseAt / 1000) % tips.length] : '';
  return `<div class="overlay" role="dialog" aria-modal="true" aria-label="Grabando salida"><div class="bar"><div class="in">
    <button class="iconbtn" data-act="recMin" aria-label="Minimizar">${ICON.back}</button>
    <div class="grow"><b>${esc(SP[st.sport].label)}</b><div class="small muted">${st.paused ? 'En pausa' : 'Grabando'}</div></div>
    <span class="pill ${g[1]}" id="rec_gps">${g[0]}</span></div></div>
  <div class="wrap stack" style="padding-top:14px;padding-bottom:40px">
    <div style="text-align:center"><div class="big" id="rec_t">${n.time}</div><span class="label">tiempo en movimiento</span></div>
    <div class="kpis"><div class="kpi"><b id="rec_km">${n.km}</b><span>km</span></div><div class="kpi"><b id="rec_cur">${n.cur}</b><span>${n.unit} ahora</span></div><div class="kpi"><b id="rec_avg">${n.avg}</b><span>${n.unit} promedio</span></div><div class="kpi"><b id="rec_up">${n.gain}</b><span>m de subida (aprox.)</span></div></div>
    <div class="mapbox" id="rec_route" style="height:200px">${st.pts.length > 1 ? routeSVG(st.pts.map(q => [q[0], q[1]]), SP[st.sport].color, 'bigroute') : '<div class="empty small" style="padding-top:80px">El recorrido aparece acá</div>'}</div>
    ${tip ? `<div class="banner info small"><div><b>Dato:</b> ${esc(tip)}</div></div>` : ''}
    <div class="field"><label>GPS</label><div class="seg" role="group" aria-label="GPS">${Object.entries(REC_GPS).map(([k, v]) => `<button data-act="recGps" data-arg="${k}" aria-pressed="${st.gps === k}">${v.label}</button>`).join('')}</div>
      <p class="tiny muted">${st.gps === 'off' ? 'Sin GPS gasta mucho menos batería. Siguen el tiempo y el pulso del reloj; la distancia se retoma en línea recta al prenderlo.' : st.gps === 'ahorro' ? 'Toma menos puntos: el recorrido queda un poco menos preciso en las curvas.' : 'Máxima precisión del recorrido.'}</p></div>
    <div class="row"><button class="btn grow ${st.paused ? 'primary' : ''}" data-act="recPause" style="min-height:56px">${st.paused ? 'Reanudar' : 'Pausar'}</button>
      <button class="btn grow ${REC.confirm ? 'danger' : ''}" data-act="recFinish" style="min-height:56px">${REC.confirm ? '¿Terminar? Tocá de nuevo' : 'Terminar'}</button></div>
  </div></div>`;
};
App.views.sh_recTip = () => `<h2>Para que no se corte</h2>
  <p class="small">Android puede cerrar apps que gastan batería. Si tu teléfono es Xiaomi, Redmi o POCO, hacé esto una vez:</p>
  <p class="small">1. Mantené apretado el ícono de Barra Libre → <b>Información de la app</b>.</p>
  <p class="small">2. <b>Ahorro de batería</b> → <b>Sin restricciones</b>.</p>
  <p class="small">3. Activá <b>Inicio automático</b> si aparece.</p>
  <p class="small muted">En otros teléfonos: Ajustes → Batería → Barra Libre → No optimizar. Mientras graba vas a ver un aviso fijo de Barra Libre: es lo que la mantiene funcionando.</p>
  <button class="btn primary" data-act="closeSheet">Entendido</button>`;

// recuperar una salida si la app se cerró
App.acts.recResume = async () => { const st = REC.st; st.recovered = false; st.gap = true; if (st.endAt) { st.pausedMs += Date.now() - st.endAt; st.endAt = null; st.newLeg = true; } recSave(true); App.renderOverlay(); recTick(); await recWatch(); };
App.acts.recFinishNow = () => { const st = REC.st; st.recovered = false; if (!st.endAt && st.pts.length) st.endAt = Math.max(st.start + 1000, st.pts[st.pts.length - 1][3]); recFinish(); };
App.acts.recDiscard = () => { REC.st = null; ls.del(REC_KEY); App.setOv(null); App.render(); toast('Salida descartada'); };

// ---------- guardar ----------
App.views.sh_recDone = (p, sh) => {
  const a = sh.a; const types = SP[a.sport].types();
  return `<h2>${esc(SP[a.sport].label)} terminada</h2>
  ${a.track ? routeSVG(a.track, SP[a.sport].color, 'bigroute').replace('class="route bigroute"', 'class="route bigroute" style="width:100%;height:auto;aspect-ratio:1.6;max-height:220px"') : ''}
  <div class="kpis"><div class="kpi"><b>${fmtNum(a.distKm, 2)}</b><span>km</span></div><div class="kpi"><b style="font-size:20px">${L.durStr(a.durSec)}</b><span>en movimiento</span></div><div class="kpi"><b style="font-size:20px">${actMetric(a).split(' ')[0] || '–'}</b><span>${a.sport === 'run' ? 'min/km' : 'km/h'}</span></div><div class="kpi"><b>${a.elev || '–'}</b><span>m subida</span></div></div>
  <div class="field"><label>Tipo</label><div class="chips">${Object.entries(types).map(([k, v]) => `<button class="chip" data-act="rdSet" data-k="type" data-v="${k}" aria-pressed="${a.type === k}">${v}</button>`).join('')}</div></div>
  <div class="field"><label>Esfuerzo percibido (RPE 1–10)</label><div class="chips">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="chip" data-act="rdSet" data-k="rpe" data-v="${n}" aria-pressed="${a.rpe === n}">${n}</button>`).join('')}</div>
    <p class="tiny muted">1–3 muy fácil · 4–5 conversás cómodo · 6–7 frases cortas · 8–10 muy duro</p></div>
  <div class="field"><label for="rd_n">Notas</label><textarea id="rd_n" data-bind="rdNotes">${esc(a.notes)}</textarea></div>
  <p class="tiny muted">Al guardar se corrige la altura con un mapa de relieve y, cuando tu reloj sincronice, se suma el pulso.</p>
  <button class="btn primary" data-act="rdSave">Guardar</button>
  <button class="btn ghost danger" data-act="rdDiscard">${sh.confirm ? '¿Descartar? Tocá de nuevo' : 'Descartar'}</button>`;
};
App.acts.rdSet = el => { const v = el.dataset.v; S.sheet.a[el.dataset.k] = /^\d+$/.test(v) ? +v : v; App.renderOverlay(); };
App.binds.rdNotes = el => { S.sheet.a.notes = el.value; };
App.acts.rdSave = async () => {
  const a = S.sheet.a; await Store.put('activities', a);
  REC.st = null; ls.del(REC_KEY); App.closeSheet(); App.render(); toast('Salida guardada');
  if (a.track) { try { await fixElevation(a.id); } catch(e){} }
  if (typeof HC !== 'undefined' && HC.plugin && HC.on) { try { await hcEnrichAct(Store.get('activities', a.id), HC.plugin); } catch(e){} }
  App.refresh();
};
App.acts.rdDiscard = () => { if (!S.sheet.confirm) { S.sheet.confirm = true; App.renderOverlay(); return; } REC.st = null; ls.del(REC_KEY); App.closeSheet(); toast('Salida descartada'); };
// cerrar la hoja sin guardar no pierde la salida: vuelve a ofrecerse
const _closeSheetRec = App.closeSheet;
App.closeSheet = function(){ const was = S.sheet && S.sheet.type === 'recDone' && REC.st; _closeSheetRec.apply(this, arguments); if (was) { REC.st.recovered = true; App.setOv({type: 'rec'}); } };

// ---------- botón en Cardio ----------
const _cardioViewRec = App.views.cardio;
App.views.cardio = (p) => {
  const html = _cardioViewRec(p);
  if (!recPlugin()) return html;
  const sp = S.cardio, lbl = {run: 'Grabar carrera', ride: 'Grabar salida en bici', hike: 'Grabar caminata'}[sp];
  const btn = REC.st && !REC.st.recovered ? `<button class="btn primary block" data-act="recOpen" style="min-height:52px">● Grabando · volver</button>`
    : `<button class="btn primary block" data-act="recStart" data-arg="${sp}" style="min-height:52px">● ${lbl}</button>`;
  const mark = '<div class="row"><button class="btn primary grow" data-act="logAct"';
  return html.includes(mark) ? html.replace(mark, btn + mark.replace('btn primary grow', 'btn grow')) : html;
};

// ---------- al abrir la app: retomar lo que estaba grabando ----------
if (recPlugin()) {
  const saved = ls.get(REC_KEY, null);
  if (saved && saved.pts) {
    REC.st = saved;
    const _boot = setInterval(() => { if (Store.mode !== 'loading' && curProfile()) { clearInterval(_boot); REC.st.recovered = true; App.setOv({type: 'rec'}); } }, 800);
    setTimeout(() => clearInterval(_boot), 60000);
  }
}
