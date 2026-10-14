// Logros, desafío de la semana, "Tu año en Barra Libre" e imágenes para compartir (historia de Instagram, WhatsApp).
'use strict';

// ---------- logros ----------
const LOGROS = [
  ['f1', 'Primer entrenamiento', 'Tu primera sesión de fuerza', s => s.lift >= 1],
  ['f10', '10 entrenamientos', '10 sesiones de fuerza', s => s.lift >= 10],
  ['f50', '50 entrenamientos', '50 sesiones de fuerza', s => s.lift >= 50],
  ['f100', '100 entrenamientos', '100 sesiones de fuerza', s => s.lift >= 100],
  ['pr10', '10 récords', '10 récords de fuerza', s => s.prs >= 10],
  ['r5', 'Primeros 5 km', 'Una carrera de 5 km o más', s => s.maxRun >= 5],
  ['r10', '10 km', 'Una carrera de 10 km o más', s => s.maxRun >= 10],
  ['r21', 'Media maratón', '21,1 km en una carrera', s => s.maxRun >= 21.0],
  ['r42', 'Maratón', '42,2 km en una carrera', s => s.maxRun >= 42.0],
  ['rm100', '100 km en un mes', 'Corriendo', s => s.runMonth >= 100],
  ['b50', '50 km en bici', 'En una sola salida', s => s.maxRide >= 50],
  ['b100', '100 km en bici', 'En una sola salida', s => s.maxRide >= 100],
  ['h500', '+500 m', 'De subida en una caminata', s => s.maxHikeUp >= 500],
  ['h1000', '+1000 m', 'De subida en una caminata', s => s.maxHikeUp >= 1000],
  ['y10', '10 de yoga', '10 sesiones de yoga', s => s.yoga >= 10],
  ['c20', '20 clases', '20 clases de gimnasio', s => s.cls >= 20],
  ['st4', '4 semanas', 'Seguidas con 2 o más sesiones', s => s.streak >= 4],
  ['st12', '12 semanas', 'Seguidas: ya es un hábito', s => s.streak >= 12],
  ['st26', '6 meses', 'Seguidos entrenando', s => s.streak >= 26]
];
// recorre todo en orden y anota la fecha en que se cumplió cada logro
function logrosOf(p){
  const ev = [...workoutsOf(p.id).map(w => ({d: w.date, w})), ...actsOf(p.id).map(a => ({d: a.date, a}))].sort((x, y) => x.d.localeCompare(y.d));
  const s = {lift: 0, prs: 0, maxRun: 0, runMonth: 0, maxRide: 0, maxHikeUp: 0, yoga: 0, cls: 0, streak: 0};
  const month = {}, weeks = {}; const got = {};
  const wkKey = d => L.weekStart(new Date(d)).toISOString().slice(0, 10);
  const streakAt = d => { let n = 0; const ws0 = L.weekStart(new Date(d)); for (let i = 0; i < 60; i++) { const k = new Date(ws0); k.setDate(k.getDate() - 7 * i); if ((weeks[k.toISOString().slice(0, 10)] || 0) >= 2) n++; else if (i) break; } return n; };
  for (const e of ev) {
    weeks[wkKey(e.d)] = (weeks[wkKey(e.d)] || 0) + 1;
    if (e.w) { s.lift++; s.prs += (e.w.prs || []).length; }
    else { const a = e.a;
      if (a.sport === 'run') { s.maxRun = Math.max(s.maxRun, a.distKm || 0); const m = a.date.slice(0, 7); month[m] = (month[m] || 0) + (a.distKm || 0); s.runMonth = Math.max(s.runMonth, month[m]); }
      if (a.sport === 'ride') s.maxRide = Math.max(s.maxRide, a.distKm || 0);
      if (a.sport === 'hike') s.maxHikeUp = Math.max(s.maxHikeUp, a.elev || 0);
      if (a.sport === 'yoga') s.yoga++; if (a.sport === 'class') s.cls++; }
    s.streak = Math.max(s.streak, streakAt(e.d));
    for (const [id, , , f] of LOGROS) if (!got[id] && f(s)) got[id] = e.d;
  }
  return got;
}
// desafío de la semana (rota cada semana)
function challenge(p){
  const who = whoWeek(p); const wsn = Math.floor(L.weekStart(new Date()).getTime() / 6048e5);
  const s = L.weekStart(new Date()); const inW = d => new Date(d) >= s;
  const cardio = actsOf(p.id).filter(a => inW(a.date) && ['run', 'ride', 'hike', 'class'].includes(a.sport)).length;
  const steps = Array.from({length: 7}, (_, i) => { const d = new Date(s); d.setDate(d.getDate() + i); const x = Store.get('steps', p.id + '_' + localDay(d)); return d <= new Date() && x ? x.steps : null; }).filter(x => x != null);
  const C = [
    {t: '150 minutos de actividad', b: 'La recomendación de la OMS: moderados cuentan 1, vigorosos cuentan 2.', v: who.eq, goal: 150, u: 'min'},
    {t: '2 de fuerza + 1 de cardio', b: 'La combinación que más beneficios suma para la salud.', v: Math.min(2, who.strengthDays) + Math.min(1, cardio), goal: 3, u: 'sesiones'},
    ...(steps.length ? [{t: `${fmtNum(p.stepGoal || 8000)} pasos por día`, b: 'Promedio de la semana.', v: Math.round(steps.reduce((a, b) => a + b, 0) / steps.length), goal: p.stepGoal || 8000, u: 'pasos'}] : [])
  ];
  return C[wsn % C.length];
}
function logrosFold(p){
  const got = logrosOf(p), n = Object.keys(got).length, ch = challenge(p), pct = Math.min(100, Math.round(ch.v / ch.goal * 100));
  return `<details class="card" data-keep="logOpen" ${S.logOpen ? 'open' : ''}><summary><b>Logros y desafío</b><span class="pill" style="font-size:11px;margin-left:6px">${n} de ${LOGROS.length}</span>${pct >= 100 ? '<span class="pill ok" style="font-size:11px;margin-left:4px">Desafío ✓</span>' : ''}</summary>
    <div class="stack-s" style="margin-top:10px">
      <div class="card flat stack-s"><div class="row between"><b>Desafío de la semana</b><span class="small num">${fmtNum(ch.v)} / ${fmtNum(ch.goal)} ${ch.u}</span></div><span class="small">${esc(ch.t)}</span>
        <div class="progress" style="height:8px"><i style="width:${pct}%;background:${pct >= 100 ? 'var(--ok)' : 'var(--fg)'}"></i></div><p class="tiny muted">${esc(ch.b)}</p></div>
      ${n ? `<span class="label">Conseguidos</span><div class="chips">${LOGROS.filter(([id]) => got[id]).sort((x, y) => got[y[0]].localeCompare(got[x[0]])).map(([id, t]) => `<span class="chip" style="cursor:default" title="${fmtDate(got[id], {day: 'numeric', month: 'short', year: 'numeric'})}">🏅 ${esc(t)}</span>`).join('')}</div>` : ''}
      <span class="label">Próximos</span><div class="stack-s">${LOGROS.filter(([id]) => !got[id]).slice(0, 4).map(([, t, b]) => `<div class="row between"><span class="small">🔒 ${esc(t)}</span><span class="tiny muted">${esc(b)}</span></div>`).join('')}</div>
      <button class="btn" data-act="sheet" data-arg="year">Tu año en Barra Libre</button></div></details>`;
}
const _progLogros = App.views.prog;
App.views.prog = (p) => {
  const html = _progLogros(p), card = logrosFold(p);
  const mark = '<div class="section"><h3>Historial de fuerza</h3>'; const i = html.indexOf(mark);
  return i >= 0 ? html.slice(0, i) + card + html.slice(i) : html + card;
};
// logro nuevo: aparece como mensaje de aliento en Bienestar
if (typeof cheers === 'function') {
  const _cheersL = cheers;
  window.cheers = p => { const out = _cheersL(p); const got = logrosOf(p); const nw = LOGROS.filter(([id]) => got[id] && Date.now() - new Date(got[id]) < 3 * 864e5); if (nw.length) out.unshift({t: `Nuevo logro: ${nw[0][1]}`, b: `${nw[0][2]}. Lo ves en Progreso → Logros.`}); return out; };
}

// ---------- tu año ----------
function yearStats(p, y){
  const inY = d => d.slice(0, 4) === String(y);
  const ws = workoutsOf(p.id).filter(w => inY(w.date)), as = actsOf(p.id).filter(a => inY(a.date));
  const km = sp => as.filter(a => a.sport === sp).reduce((t, a) => t + (a.distKm || 0), 0);
  const secs = ws.reduce((t, w) => t + (w.durSec || 0), 0) + as.reduce((t, a) => t + (a.durSec || 0), 0);
  const byM = {}; [...ws, ...as].forEach(x => { const m = x.date.slice(5, 7); byM[m] = (byM[m] || 0) + 1; });
  const bestM = Object.entries(byM).sort((a, b) => b[1] - a[1])[0];
  const got = logrosOf(p); const logY = LOGROS.filter(([id]) => got[id] && inY(got[id]));
  return {y, sessions: ws.length + as.length, hours: Math.round(secs / 3600), lift: ws.length, tons: Math.round(ws.reduce((t, w) => t + wVolume(w).kg, 0) / 100) / 10, prs: ws.reduce((t, w) => t + (w.prs || []).length, 0),
    run: Math.round(km('run')), ride: Math.round(km('ride')), hike: Math.round(km('hike')), up: Math.round(as.filter(a => a.sport === 'hike' || a.sport === 'run').reduce((t, a) => t + (a.elev || 0), 0)),
    cls: as.filter(a => a.sport === 'class').length, yogaMin: Math.round(as.filter(a => a.sport === 'yoga').reduce((t, a) => t + (a.durSec || 0), 0) / 60),
    bestM: bestM ? [new Date(y, +bestM[0] - 1, 1).toLocaleDateString('es-AR', {month: 'long'}), bestM[1]] : null, logros: logY.map(x => x[1])};
}
App.views.sh_year = (p, sh) => {
  const y = sh.y || new Date().getFullYear(), s = yearStats(p, y);
  const k = (v, l) => v ? `<div class="kpi"><b>${v}</b><span>${l}</span></div>` : '';
  return `<span class="label">Tu año en Barra Libre</span><div class="row between"><h2>${y}</h2><div class="chips">${[y - 1, new Date().getFullYear()].filter((v, i, a) => a.indexOf(v) === i).map(v => `<button class="chip" data-act="yearSet" data-arg="${v}" aria-pressed="${v === y}">${v}</button>`).join('')}</div></div>
    ${s.sessions ? `<div class="kpis">${k(s.sessions, 'entrenamientos')}${k(s.hours, 'horas')}${k(s.lift, 'de fuerza')}${k(fmtNum(s.tons, 1), 'toneladas')}${k(s.prs, 'récords')}${k(s.run, 'km corriendo')}${k(s.ride, 'km en bici')}${k(s.hike, 'km caminando')}${k(s.up, 'm de subida')}${k(s.cls, 'clases')}${k(s.yogaMin, 'min de yoga')}</div>
    ${s.bestM ? `<p class="small">Tu mejor mes fue <b>${s.bestM[0]}</b>, con ${s.bestM[1]} entrenamientos.</p>` : ''}
    ${s.logros.length ? `<p class="small">Logros del año: ${s.logros.map(esc).join(' · ')}.</p>` : ''}
    <button class="btn primary" data-act="shareYear" data-arg="${y}">Compartir como imagen</button>` : '<div class="empty small">Sin registros en este año.</div>'}`;
};
App.acts.yearSet = el => { S.sheet.y = +el.dataset.arg; App.renderOverlay(); };

// ---------- imagen para compartir (1080 × 1920, formato historia) ----------
function storyCanvas(o){
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16181c'); g.addColorStop(1, '#0b0c0e'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const disp = '"Saira Condensed","Arial Narrow",sans-serif', body = '"Figtree",system-ui,sans-serif';
  x.fillStyle = '#ef5a4c'; x.beginPath(); x.arc(110, 140, 26, 0, 7); x.fill();
  x.fillStyle = '#ecebe6'; x.font = `800 54px ${disp}`; x.fillText('BARRA LIBRE', 155, 160);
  x.fillStyle = '#9aa0a8'; x.font = `500 40px ${body}`; x.fillText(o.date || '', 80, 270);
  x.fillStyle = '#ecebe6'; x.font = `800 104px ${disp}`; wrap(x, o.title || '', 80, 390, W - 160, 110);
  let y = 520;
  if (o.track && o.track.length > 1) { // recorrido
    const t = o.track, la = t.map(q => q[0]), lo = t.map(q => q[1]); const k = Math.cos(la.reduce((a, b) => a + b, 0) / la.length * Math.PI / 180);
    const xs = lo.map(v => v * k), ys = la.map(v => -v); const mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys); const sp = Math.max(mxx - mnx, mxy - mny) || 1;
    const box = 760, ox = (W - box) / 2 + (box - (mxx - mnx) / sp * box) / 2, oy = y + (box - (mxy - mny) / sp * box) / 2;
    x.strokeStyle = o.color || '#5b97ea'; x.lineWidth = 12; x.lineJoin = 'round'; x.lineCap = 'round'; x.beginPath();
    xs.forEach((v, i) => { const px = ox + (v - mnx) / sp * box, py = oy + (ys[i] - mny) / sp * box; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    y += box + 80;
  }
  const kp = (o.kpis || []).slice(0, 6); const cols = kp.length > 4 ? 3 : 2; const cw = (W - 160) / cols;
  kp.forEach(([v, l], i) => { const cx = 80 + (i % cols) * cw, cy = y + Math.floor(i / cols) * 210; x.fillStyle = '#ecebe6'; x.font = `800 ${String(v).length > 6 ? 84 : 110}px ${disp}`; x.fillText(String(v), cx, cy + 100); x.fillStyle = '#9aa0a8'; x.font = `500 38px ${body}`; x.fillText(l, cx, cy + 150); });
  y += Math.ceil(kp.length / cols) * 210 + 20;
  if (o.lines) { x.fillStyle = '#ecebe6'; x.font = `500 42px ${body}`; o.lines.slice(0, 8).forEach((l, i) => wrap(x, l, 80, y + i * 64, W - 160, 52)); }
  x.fillStyle = '#5e636b'; x.font = `500 32px ${body}`; x.fillText('Registrado con Barra Libre · gratis', 80, H - 90);
  return c;
}
function wrap(x, txt, X, Y, maxW, lh){ const words = String(txt).split(' '); let line = '', y = Y; for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { x.fillText(line, X, y); line = w; y += lh; } else line = t; } x.fillText(line, X, y); }
async function shareCanvas(c, name){
  const FS = capPlugin('Filesystem'), SH = capPlugin('Share');
  const url = c.toDataURL('image/png');
  if (FS && SH) { try { const w = await FS.writeFile({path: name, data: url.split(',')[1], directory: 'CACHE'}); await SH.share({title: name, files: [w.uri]}); return; } catch(e){ if (/cancel/i.test((e && e.message) || '')) return; } }
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); const file = new File([blob], name, {type: 'image/png'});
  if (navigator.canShare && navigator.canShare({files: [file]})) { try { await navigator.share({files: [file], title: 'Barra Libre'}); return; } catch(e){ if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Imagen descargada');
}
App.acts.shareAct = async el => {
  const a = Store.get('activities', el.dataset.arg); if (!a) return;
  const cfg = SP[a.sport] || {label: a.title || 'Actividad', color: '--run', types: () => ({})};
  const kpis = [[fmtNum(a.distKm, a.distKm >= 100 ? 0 : 1), 'km'], [L.durStr(a.durSec), 'tiempo']];
  if (a.sport === 'run' && a.distKm) kpis.push([L.paceStr(a.durSec / a.distKm), 'min/km']); else if (a.distKm && a.durSec) kpis.push([fmtNum(a.distKm / (a.durSec / 3600), 1), 'km/h']);
  if (a.elev) kpis.push(['+' + a.elev, 'm de subida']); if (a.hr) kpis.push([a.hr, 'pulso medio']);
  await shareCanvas(storyCanvas({date: fmtDate(a.date, {weekday: 'long', day: 'numeric', month: 'long'}), title: (cfg.types()[a.type] || cfg.label), track: a.track, color: cssv(cfg.color) || '#5b97ea', kpis}), `barra-libre-${localDay(a.date)}.png`);
};
App.acts.shareW = async el => {
  const w = Store.get('workouts', el.dataset.arg); if (!w) return; const v = wVolume(w);
  const lines = (w.exercises || []).filter(e => EX[e.ex]).slice(0, 7).map(e => { const ss = e.sets.filter(s => s.done !== false && s.t !== 'w'); const top = ss.reduce((m, s) => (+s.kg || 0) > (+m.kg || 0) ? s : m, ss[0] || {}); return `${nm(EX[e.ex])[0]}: ${ss.length} × ${top.reps || ''}${top.kg ? ' · ' + L.fmtKg(top.kg) + ' kg' : ''}`; });
  await shareCanvas(storyCanvas({date: fmtDate(w.date, {weekday: 'long', day: 'numeric', month: 'long'}), title: w.name, kpis: [[w.durSec ? Math.round(w.durSec / 60) : '–', 'minutos'], [v.sets, 'series'], [fmtNum(v.kg), 'kg totales'], ...((w.prs || []).length ? [[w.prs.length, 'récords']] : [])], lines}), `barra-libre-fuerza-${localDay(w.date)}.png`);
};
App.acts.shareYear = async el => {
  const p = curProfile(), s = yearStats(p, +el.dataset.arg);
  const kpis = [[s.sessions, 'entrenamientos'], [s.hours, 'horas'], ...(s.run ? [[s.run, 'km corriendo']] : []), ...(s.ride ? [[s.ride, 'km en bici']] : []), ...(s.tons ? [[fmtNum(s.tons, 1), 'toneladas']] : []), ...(s.prs ? [[s.prs, 'récords']] : []), ...(s.hike ? [[s.hike, 'km caminando']] : [])];
  await shareCanvas(storyCanvas({date: 'Mi año en Barra Libre', title: String(s.y), kpis, lines: [s.bestM ? `Mejor mes: ${s.bestM[0]} (${s.bestM[1]} entrenamientos)` : '', s.logros.length ? `Logros: ${s.logros.slice(0, 4).join(', ')}` : ''].filter(Boolean)}), `barra-libre-${s.y}.png`);
};
// botones "Compartir" en los detalles
const _detailShare = App.views.sh_actDetail;
App.views.sh_actDetail = (p, sh) => { const html = _detailShare(p, sh); const b = `<button class="btn sm grow" data-act="shareAct" data-arg="${esc(sh.id)}">Compartir</button>`; const gx = '<button class="btn sm grow" data-act="gpxOut"'; if (html.includes(gx)) return html.replace(gx, b + gx); const mark = '<div class="row"><button class="btn grow" data-act="editAct"'; const i = html.indexOf(mark); return i > 0 ? html.slice(0, i) + `<div class="row">${b}</div>` + html.slice(i) : html; };
if (App.views.sh_workoutDetail) { const _wd = App.views.sh_workoutDetail; App.views.sh_workoutDetail = (p, sh) => { const html = _wd(p, sh); const b = `<button class="btn" data-act="shareW" data-arg="${esc(sh.id)}">Compartir como imagen</button>`; const i = html.lastIndexOf('<div class="row">'); return i > 0 ? html.slice(0, i) + b + html.slice(i) : html + b; }; }
