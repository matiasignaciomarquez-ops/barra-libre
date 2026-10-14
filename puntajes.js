// Puntajes de cardio (cálculo propio, inspirado en lo que muestran Garmin y TrainingPeaks):
// efecto del entrenamiento 1–5, recuperación sugerida, eficiencia aeróbica y desacople, récords dentro de cualquier salida,
// velocidad de ascenso (VAM), potencia y FTP estimados en bici, y clima y viento de cada salida.
'use strict';
Object.assign(window.REFS, {
  friel2009: 'Friel J. The Cyclist’s Training Bible. 4th ed. Boulder: VeloPress; 2009 (factor de eficiencia y desacople aeróbico, Pa:HR).',
  allen2010: 'Allen H, Coggan A. Training and Racing with a Power Meter. 2nd ed. Boulder: VeloPress; 2010 (FTP ≈ 95% de la mejor potencia de 20 min).',
  martin1998: 'Martin JC, Milliken DL, Cobb JE, McFadden KL, Coggan AR. Validation of a mathematical model for road cycling power. J Appl Biomech. 1998;14(3):276-291.',
  roberts2021: 'Roberts WO, Armstrong LE, Sawka MN, et al. ACSM expert consensus statement on exertional heat illness: recognition, management, and return to activity. Curr Sports Med Rep. 2021;20(9):470-484.'
});

// ---------- serie de tiempo de una salida ----------
const _serC = new WeakMap();
function series(a){ if (a.track && _serC.has(a.track) && _serC.get(a.track).hs === a.hrS) return _serC.get(a.track).v; const v = series0(a); if (a.track) _serC.set(a.track, {v, hs: a.hrS}); return v; }
function series0(a){
  const t = a.track; if (!t || t.length < 10 || t[0].length < 4 || t.filter(q => q[3] != null).length < t.length * .8) return null;
  const hrS = (a.hrS || []);
  const hrAt = (sec, q) => { if (q[4]) return q[4]; if (!hrS.length) return null; let lo = 0, hi = hrS.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (hrS[m][0] < sec) lo = m + 1; else hi = m; } const h = hrS[lo]; return h && Math.abs(h[0] - sec) < 120 ? h[1] : null; };
  const out = []; let d = 0;
  t.forEach((q, i) => { if (q[3] == null) return; if (out.length) d += hav(t[i - 1], q) * 1000; out.push({d, s: q[3], e: q[2], h: hrAt(q[3], q)}); });
  for (let i = 1; i < out.length; i++) if (out[i].s < out[i - 1].s) return null;
  return out;
}
// mejor tiempo para una distancia (m) dentro de la salida
function bestEffort(S2, dist){
  if (!S2 || S2[S2.length - 1].d < dist) return null;
  let best = Infinity, j = 0;
  for (let i = 0; i < S2.length; i++) {
    while (j < S2.length && S2[j].d - S2[i].d < dist) j++;
    if (j >= S2.length) break;
    const over = (S2[j].d - S2[i].d) - dist, seg = S2[j].d - S2[j - 1].d || 1;
    const tt = S2[j].s - S2[i].s - over / seg * (S2[j].s - S2[j - 1].s);
    if (tt > 0 && tt < best) best = tt;
  }
  return isFinite(best) ? Math.round(best) : null;
}
// eficiencia aeróbica (metros por latido) y desacople entre la primera y la segunda mitad
function efficiency(a){
  const S2 = series(a); if (!S2 || (a.durSec || 0) < 1800) return null;
  const half = (from, to) => { const pts = S2.filter(x => x.s >= from && x.s <= to); const hs = pts.map(x => x.h).filter(Boolean); if (pts.length < 5 || hs.length < pts.length * .6) return null; const dist = pts[pts.length - 1].d - pts[0].d, min = (pts[pts.length - 1].s - pts[0].s) / 60; return min > 0 ? dist / min / (hs.reduce((x, y) => x + y, 0) / hs.length) : null; };
  const T = S2[S2.length - 1].s, start = Math.min(600, T * .1); // se descartan los primeros minutos (entrada en calor)
  const e1 = half(start, (start + T) / 2), e2 = half((start + T) / 2, T), all = half(start, T);
  if (!all) return null;
  return {ef: Math.round(all * 100) / 100, dec: e1 && e2 ? Math.round((e1 - e2) / e1 * 1000) / 10 : null};
}
// velocidad de ascenso: la mejor subida sostenida de al menos 10 minutos (m/h)
function bestVam(a){
  const S2 = series(a); if (!S2 || S2.filter(x => x.e != null).length < S2.length * .8) return null;
  let best = 0, j = 0;
  for (let i = 0; i < S2.length; i++) {
    while (j < S2.length && S2[j].s - S2[i].s < 600) j++;
    if (j >= S2.length) break;
    const up = S2[j].e - S2[i].e, h = (S2[j].s - S2[i].s) / 3600;
    if (up > 30 && up / h > best) best = up / h;
  }
  return best ? Math.round(best) : null;
}
// potencia estimada en bici (modelo físico: pendiente, rodadura y aire; Martin 1998)
function bikePower(a, kg){
  const S2 = series(a); if (!S2 || !kg) return null;
  const m = kg + 9, g = 9.81, crr = .005, cda = .32, rho = 1.2, eta = .976;
  const P = []; // [segundo, vatios]
  for (let i = 1; i < S2.length; i++) {
    const dd = S2[i].d - S2[i - 1].d, dt = S2[i].s - S2[i - 1].s; if (dt <= 0) continue;
    const v = dd / dt; if (v < 1.5) { P.push([S2[i].s, 0, dt]); continue; }
    const gr = S2[i].e != null && S2[i - 1].e != null && dd > 5 ? Math.max(-.15, Math.min(.15, (S2[i].e - S2[i - 1].e) / dd)) : 0;
    const w = Math.max(0, v * (m * g * (crr + gr) + .5 * rho * cda * v * v) / eta);
    P.push([S2[i].s, Math.min(1500, w), dt]);
  }
  const moving = P.filter(x => x[1] > 0); if (moving.length < 10) return null;
  const tot = moving.reduce((t, x) => t + x[2], 0), avg = moving.reduce((t, x) => t + x[1] * x[2], 0) / tot;
  // mejor promedio de 20 minutos (energía acumulada / tiempo)
  const cumE = [0], cumT = [0]; P.forEach((x, i) => { cumE.push(cumE[i] + x[1] * x[2]); cumT.push(cumT[i] + x[2]); });
  let best20 = null, j = 0;
  for (let i = 0; i < cumT.length; i++) { while (j < cumT.length && cumT[j] - cumT[i] < 1200) j++; if (j >= cumT.length) break; best20 = Math.max(best20 || 0, (cumE[j] - cumE[i]) / (cumT[j] - cumT[i])); }
  return {avg: Math.round(avg), best20: best20 ? Math.round(best20) : null};
}
// efecto del entrenamiento (1–5) según la carga de la sesión contra tu sesión promedio
function effectOf(p, a){
  const avg = avgSessLoad(p), l = sessionLoad(a, 'a'); if (!avg || !l) return null;
  const r = l / avg;
  const n = r < .5 ? 1 : r < .9 ? 2 : r < 1.3 ? 3 : r < 1.8 ? 4 : 5;
  const lab = ['', 'Recuperación', 'Mantiene', 'Mejora', 'Mejora mucho', 'Muy exigente'][n];
  const sec = typeof zoneTimes === 'function' ? zoneTimes(a, myZones(p)) : null; let foco = '';
  if (sec) { const tot = sec.reduce((x, y) => x + y, 0) || 1; foco = (sec[3] + sec[4]) / tot >= .2 ? 'alta intensidad' : sec[2] / tot >= .35 ? 'tempo' : 'base aeróbica'; }
  return {n, lab, foco};
}

// ---------- en el detalle de cada salida ----------
const RUN_D = [[1000, '1 km'], [5000, '5 km'], [10000, '10 km'], [21097, 'Media maratón']];
function perfBlock(p, a){
  const rows = [];
  const ef = effectOf(p, a);
  if (ef) rows.push(`<div class="row between"><span class="small">Efecto del entrenamiento</span><span class="row" style="gap:6px"><b class="num">${ef.n}/5</b><span class="pill">${ef.lab}${ef.foco ? ' · ' + ef.foco : ''}</span></span></div>`);
  const rh = recoveryHours(p, a, 'a'); if (rh) rows.push(`<div class="row between"><span class="small">Recuperación sugerida</span><b class="num">~${rh} h</b></div>`);
  const e = efficiency(a);
  if (e) rows.push(`<div class="row between"><span class="small">Eficiencia aeróbica ${qBtn('eficiencia')}</span><b class="num">${fmtNum(e.ef, 2)} m por latido</b></div>${e.dec != null ? `<div class="row between"><span class="small">Desacople (2ª mitad vs 1ª)</span><span class="row" style="gap:6px"><b class="num">${fmtNum(e.dec, 1)}%</b><span class="pill ${e.dec < 5 ? 'ok' : e.dec < 10 ? 'warn' : 'bad'}">${e.dec < 5 ? 'Base aeróbica sólida' : e.dec < 10 ? 'Moderado' : 'Alto'}</span></span></div>` : ''}`);
  if (a.sport === 'run') { const S2 = series(a); const bs = RUN_D.map(([d, l]) => [l, bestEffort(S2, d), d]).filter(x => x[1]); if (bs.length) rows.push(`<div class="row between" style="align-items:flex-start"><span class="small">Mejores tiempos en esta salida</span><span class="small num" style="text-align:right">${bs.map(([l, t, d]) => `${l}: <b>${L.durStr(t)}</b> (${L.paceStr(t / d * 1000)}/km)`).join('<br>')}</span></div>`); }
  if (a.sport !== 'ride') { const v = bestVam(a); if (v) rows.push(`<div class="row between"><span class="small">Mejor subida (VAM, ≥10 min)</span><b class="num">${v} m/h</b></div>`); }
  if (a.sport === 'ride') { const pw = bikePower(a, p.weight); if (pw) rows.push(`<div class="row between"><span class="small">Potencia estimada</span><b class="num">${pw.avg} W prom.${pw.best20 ? ` · ${pw.best20} W en 20 min` : ''}</b></div>`); }
  if (!rows.length) return '';
  return `<div class="card flat stack-s"><b>Rendimiento</b>${rows.join('')}<p class="tiny muted">Cálculos propios con tu pulso, ritmo y altura. Efecto y recuperación comparan esta sesión con tus sesiones habituales. Potencia de bici estimada con un modelo físico (Martin 1998), sin medidor: es aproximada.</p></div>`;
}
// clima y viento (Open-Meteo)
async function fetchWeather(a){
  const q = a.track[0], day = a.date.slice(0, 10), hour = a.date.slice(0, 13) + ':00';
  const old = Date.now() - new Date(day) > 80 * 864e5;
  const base = old ? 'https://archive-api.open-meteo.com/v1/archive' : 'https://api.open-meteo.com/v1/forecast';
  const r = await fetch(`${base}?latitude=${q[0]}&longitude=${q[1]}&start_date=${day}&end_date=${day}&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m&timezone=auto`);
  if (!r.ok) throw new Error('wx'); const j = await r.json(); const H = j.hourly; const i = H.time.indexOf(hour); if (i < 0) throw new Error('wx');
  return {t: Math.round(H.temperature_2m[i]), app: Math.round(H.apparent_temperature[i]), rh: Math.round(H.relative_humidity_2m[i]), ws: Math.round(H.wind_speed_10m[i]), wd: Math.round(H.wind_direction_10m[i])};
}
function windShare(a){
  const w = a.wx, t = a.track; if (!w || !t || t.length < 3 || w.ws < 5) return null;
  let head = 0, tail = 0, tot = 0;
  for (let i = 1; i < t.length; i++) {
    const d = hav(t[i - 1], t[i]); if (d <= 0) continue;
    const y = Math.sin((t[i][1] - t[i - 1][1]) * Math.PI / 180) * Math.cos(t[i][0] * Math.PI / 180), x = Math.cos(t[i - 1][0] * Math.PI / 180) * Math.sin(t[i][0] * Math.PI / 180) - Math.sin(t[i - 1][0] * Math.PI / 180) * Math.cos(t[i][0] * Math.PI / 180) * Math.cos((t[i][1] - t[i - 1][1]) * Math.PI / 180);
    const brg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; let diff = Math.abs(brg - w.wd); if (diff > 180) diff = 360 - diff; // el viento "viene de" wd
    if (diff < 60) head += d; else if (diff > 120) tail += d; tot += d;
  }
  return tot ? {head: Math.round(head / tot * 100), tail: Math.round(tail / tot * 100)} : null;
}
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
function wxBlock(a){
  if (!a.track || !a.track.length) return '';
  if (!a.wx) return '';
  const w = a.wx, sh = windShare(a);
  return `<div class="card flat stack-s"><b>Clima</b><div class="row between"><span class="small">Temperatura</span><b class="num">${w.t}° (sensación ${w.app}°) · humedad ${w.rh}%</b></div>
    <div class="row between"><span class="small">Viento</span><b class="num">${w.ws} km/h del ${DIRS[Math.round(w.wd / 45) % 8]}</b></div>
    ${sh ? `<p class="small">Viento de frente en el <b>${sh.head}%</b> del recorrido y a favor en el ${sh.tail}%.${sh.head >= 40 ? ' Eso explica parte de un ritmo más lento.' : ''}</p>` : ''}
    ${w.app >= 27 ? '<p class="small" style="color:var(--warn)">Con calor el pulso sube y el ritmo baja aunque hagas el mismo esfuerzo: es esperable. Hidratate y no compares esta salida con una de clima fresco (Roberts 2021).</p>' : ''}
    <p class="tiny muted">Datos de Open-Meteo para la hora de salida.</p></div>`;
}
App.acts.wxGet = async el => {
  const a = Store.get('activities', el.dataset.arg); el.disabled = true; el.textContent = 'Buscando…';
  try { const wx = await fetchWeather(a); await Store.put('activities', {...Store.get('activities', a.id), wx}); } catch(e){ toast('No se pudo: hace falta conexión'); }
  App.renderOverlay(); flushCharts();
};
const _detailPerf = App.views.sh_actDetail;
App.views.sh_actDetail = (p, sh) => {
  let html = _detailPerf(p, sh); const a = Store.get('activities', sh.id);
  if (!a || !['run', 'ride', 'hike'].includes(a.sport)) return html;
  const extra = perfBlock(p, a) + wxBlock(a);
  const sm = (a.track && a.track.length && !a.wx) ? `<button class="btn sm grow" data-act="wxGet" data-arg="${esc(a.id)}">Clima</button>` : '';
  const gx = '<button class="btn sm grow" data-act="gpxOut"';
  if (sm && html.includes(gx)) html = html.replace(gx, sm + gx); else if (sm) html = html.replace('<div class="row"><button class="btn grow" data-act="editAct"', `<div class="row">${sm}</div><div class="row"><button class="btn grow" data-act="editAct"`);
  if (!extra) return html;
  const mark = '<div class="row"><button class="btn grow" data-act="editAct"'; const i = html.indexOf(mark);
  return i > 0 ? html.slice(0, i) + extra + html.slice(i) : html + extra;
};

// ---------- tarjeta "Tu rendimiento" en Cardio ----------
function perfCard(p, sp){
  const acts = actsOf(p.id, sp).filter(a => a.track && a.track.length > 9);
  const rows = []; let chart = false;
  if (sp === 'run') {
    const recs = RUN_D.map(([d, l]) => { let best = null; acts.forEach(a => { const t = bestEffort(series(a), d); if (t && (!best || t < best.t)) best = {t, a}; }); return best ? [l, best, d] : null; }).filter(Boolean);
    if (recs.length) rows.push(`<div class="stack-s"><span class="label">Récords (dentro de cualquier salida)</span>${recs.map(([l, b, d]) => `<div class="row between"><span class="small">${l}</span><span class="small num"><b>${L.durStr(b.t)}</b> · ${L.paceStr(b.t / d * 1000)}/km · ${fmtDate(b.a.date, {day: 'numeric', month: 'short', year: '2-digit'})}</span></div>`).join('')}</div>`);
  }
  if (sp === 'run' || sp === 'ride') {
    const efs = acts.filter(a => Date.now() - new Date(a.date) < 180 * 864e5).map(a => ({a, e: efficiency(a)})).filter(x => x.e && x.e.ef).reverse();
    if (efs.length >= 3) {
      chart = true; const col = cssv(SP[sp].color);
      chartLater('efch', () => ({type: 'line', data: {labels: efs.map(x => fmtDate(x.a.date, {day: 'numeric', month: 'numeric'})), datasets: [{data: efs.map(x => x.e.ef), borderColor: col, backgroundColor: col, tension: .3, pointRadius: 3}]}, options: baseOpts({scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 6}}, y: {beginAtZero: false, ticks: {maxTicksLimit: 4}}}})}));
      rows.push(`<div class="stack-s"><div class="row" style="gap:6px"><span class="label">Eficiencia aeróbica (m por latido)</span>${qBtn('eficiencia')}</div><div class="chartbox" style="height:140px"><canvas id="efch"></canvas></div><p class="tiny muted">Si sube con el tiempo, corrés o pedaleás más rápido con el mismo pulso: tu forma aeróbica mejora. Compará salidas parecidas (suaves y en llano).</p></div>`);
    }
  }
  if (sp === 'ride') {
    const pws = acts.filter(a => Date.now() - new Date(a.date) < 42 * 864e5).map(a => bikePower(a, p.weight)).filter(x => x && x.best20);
    if (pws.length) { const b20 = Math.max(...pws.map(x => x.best20)); rows.push(`<div class="row between"><span class="small">FTP estimado (95% de tu mejor 20 min, 6 semanas)</span><b class="num">${Math.round(b20 * .95)} W${p.weight ? ` · ${fmtNum(b20 * .95 / p.weight, 1)} W/kg` : ''}</b></div><p class="tiny muted">Estimado sin medidor de potencia (Allen y Coggan 2010; Martin 1998): sirve como referencia, no como valor de laboratorio.</p>`); }
    else if (!p.weight) rows.push('<p class="small muted">Cargá tu peso en Progreso para estimar la potencia.</p>');
  }
  if (sp === 'hike' || sp === 'run') {
    const vs = acts.filter(a => Date.now() - new Date(a.date) < 365 * 864e5).map(a => ({a, v: bestVam(a)})).filter(x => x.v);
    if (vs.length) { const b = vs.reduce((x, y) => y.v > x.v ? y : x); rows.push(`<div class="row between"><span class="small">Mejor subida (VAM, 12 meses)</span><span class="small num"><b>${b.v} m/h</b> · ${fmtDate(b.a.date, {day: 'numeric', month: 'short'})}</span></div>`); }
  }
  const long = actsOf(p.id, sp).filter(a => Date.now() - new Date(a.date) < 28 * 864e5).reduce((m, a) => (a.durSec || 0) > (m ? m.durSec : 0) ? a : m, null);
  if (long) rows.push(`<div class="row between"><span class="small">Salida más larga (4 semanas)</span><span class="small num"><b>${L.durStr(long.durSec)}</b>${long.distKm ? ' · ' + fmtNum(long.distKm, 1) + ' km' : ''}</span></div>`);
  if (!rows.length) return '';
  return `<div class="card stack-s"><h3>Tu rendimiento</h3>${rows.join('')}</div>`;
}
const _cardioPerf = App.views.cardio;
App.views.cardio = (p) => {
  const html = _cardioPerf(p); if (!['run', 'ride', 'hike'].includes(S.cardio)) return html;
  const card = perfCard(p, S.cardio); if (!card) return html;
  const mark = '<div class="section"><h3>Historial</h3>'; return html.includes(mark) ? html.replace(mark, card + mark) : html;
};
// ficha de eficiencia
if (typeof FICHAS !== 'undefined') {
  const f = {id: 'eficiencia', t: 'Eficiencia aeróbica y desacople', b: 'Eficiencia: cuántos metros avanzás por cada latido (velocidad ÷ pulso). Si sube con las semanas en salidas parecidas, tu forma aeróbica mejora. Desacople: cuánto empeora esa eficiencia en la segunda mitad de una salida larga y pareja. Menos de 5% indica una base aeróbica sólida para esa duración; si es mayor, conviene sumar más salidas largas suaves.', r: ['friel2009']};
  FICHAS.push(f); TIPS.push({...f, cat: 'numeros'});
}
