// Carga total (todas las disciplinas en una escala), estado de entrenamiento, minutos de actividad (OMS),
// choque entre fuerza y cardio, y "Listo hoy": un puntaje de cada mañana que puede aliviar la rutina del día.
// Todo es orientativo: se calcula con lo que registrás y con el reloj si lo tenés.
'use strict';
Object.assign(window.REFS, {
  garber2011: 'Garber CE, Blissmer B, Deschenes MR, et al. ACSM position stand: quantity and quality of exercise for developing and maintaining cardiorespiratory, musculoskeletal, and neuromotor fitness in apparently healthy adults. Med Sci Sports Exerc. 2011;43(7):1334-1359.',
  bull2020: 'Bull FC, Al-Ansari SS, Biddle S, et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med. 2020;54(24):1451-1462.',
  ainsworth2011: 'Ainsworth BE, Haskell WL, Herrmann SD, et al. 2011 Compendium of Physical Activities: a second update of codes and MET values. Med Sci Sports Exerc. 2011;43(8):1575-1581.'
});

// ---------- carga por disciplina ----------
const DISC = [['lift', 'Fuerza', '--lift'], ['run', 'Running', '--run'], ['ride', 'Bici', '--ride'], ['hike', 'Senderismo', '--hike'], ['class', 'Clases', '--class'], ['yoga', 'Yoga', '--yoga']];
function weekLoads(p, weeks = 8){
  const ws0 = L.weekStart(new Date()); const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const s = new Date(ws0); s.setDate(s.getDate() - 7 * i); const e = new Date(s); e.setDate(e.getDate() + 7);
    const inW = d => { const x = new Date(d); return x >= s && x < e; };
    const row = {start: s, lift: 0, run: 0, ride: 0, hike: 0, class: 0, yoga: 0};
    workoutsOf(p.id).filter(w => inW(w.date)).forEach(w => row.lift += sessionLoad(w, 'w'));
    actsOf(p.id).filter(a => inW(a.date)).forEach(a => { if (row[a.sport] != null) row[a.sport] += sessionLoad(a, 'a'); });
    row.total = DISC.reduce((t, [k]) => t + row[k], 0);
    out.push(row);
  }
  return out;
}
// estado de entrenamiento: carga de los últimos 7 días contra el promedio semanal de las 4 anteriores
function trainingState(p){
  const days = sessionsDays(p); if (!days.length) return null;
  if (Date.now() - new Date(days[0] + 'T12:00') < 21 * 864e5) return {k: 'nuevo', t: 'Juntando datos', c: '', b: 'Con 3 semanas de registros aparece tu estado de entrenamiento.'};
  const acute = loadBetween(p, 7, 0), chronic = loadBetween(p, 35, 7) / 4;
  if (!chronic) return {k: 'volviendo', t: 'Volviendo', c: '', b: 'Después de una pausa: subí de a poco, alrededor de 10% por semana.'};
  const r = acute / chronic;
  const S1 = r > 1.5 ? ['sobrecarga', 'Sobrecarga', 'bad', 'Esta semana cargaste mucho más que tu promedio. Sumá descanso o días suaves para no lesionarte.']
    : r > 1.3 ? ['cargando', 'Cargando fuerte', 'warn', 'Estás subiendo la carga rápido. Está bien por una semana; después conviene estabilizar.']
    : r >= .8 ? ['productivo', 'Productivo', 'ok', 'Carga parecida o un poco mayor que tu promedio: es la zona donde se progresa con menos riesgo.']
    : r >= .5 ? ['mantenimiento', 'Mantenimiento', '', 'Entrenás menos que tu promedio. Sirve para recuperar; si dura varias semanas, se empieza a perder forma.']
    : ['desentrenando', 'Perdiendo forma', 'warn', 'Hace días que entrenás mucho menos de lo habitual. Volvé de a poco.'];
  return {k: S1[0], t: S1[1], c: S1[2], b: S1[3], r};
}

// ---------- minutos de actividad de la semana (OMS 2020: 150 moderados o 75 vigorosos; 2 días de fuerza) ----------
function intensityMinutes(p, a){ // {mod, vig} en minutos
  const min = (a.durSec || 0) / 60; if (!min) return {mod: 0, vig: 0};
  const hr = typeof actStreams === 'function' ? actStreams(a).hr : [];
  const Z = typeof myZones === 'function' ? myZones(p) : null;
  if (hr.length >= 10 && Z) { // % de FC de reserva (ACSM: moderada 40–59%, vigorosa ≥60%) o % FC máx. (64–76% / ≥77%)
    let mod = 0, vig = 0;
    for (let i = 0; i < hr.length; i++) {
      const dt = i + 1 < hr.length ? Math.min(120, Math.max(0, hr[i + 1][0] - hr[i][0])) : 10; const h = hr[i][1];
      const f = Z.rest ? (h - Z.rest) / (Z.max - Z.rest) : h / Z.max;
      const [m0, v0] = Z.rest ? [.4, .6] : [.64, .77];
      if (f >= v0) vig += dt; else if (f >= m0) mod += dt;
    }
    return {mod: mod / 60, vig: vig / 60};
  }
  if (a.rpe) return a.rpe >= 7 ? {mod: 0, vig: min} : a.rpe >= 5 ? {mod: min, vig: 0} : {mod: 0, vig: 0};
  const kmh = a.distKm && a.durSec ? a.distKm / (a.durSec / 3600) : 0;
  if (a.sport === 'run') return {mod: 0, vig: min};
  if (a.sport === 'ride') return kmh >= 19 ? {mod: 0, vig: min} : {mod: min, vig: 0};
  if (a.sport === 'hike') return a.elev && a.durSec && a.elev / (a.durSec / 3600) >= 300 ? {mod: 0, vig: min} : {mod: min, vig: 0};
  if (a.sport === 'class') return ['hiit', 'cross', 'spinning', 'box'].includes(a.ctype) ? {mod: 0, vig: min} : {mod: min, vig: 0};
  if (a.sport === 'yoga') return ['vinyasa', 'power'].includes(a.style) ? {mod: min, vig: 0} : {mod: 0, vig: 0};
  return {mod: min, vig: 0};
}
function whoWeek(p){
  const s = L.weekStart(new Date()); const e = new Date(s); e.setDate(e.getDate() + 7);
  const inW = d => { const x = new Date(d); return x >= s && x < e; };
  let mod = 0, vig = 0;
  actsOf(p.id).filter(a => inW(a.date)).forEach(a => { const m = intensityMinutes(p, a); mod += m.mod; vig += m.vig; });
  const strengthDays = new Set(workoutsOf(p.id).filter(w => inW(w.date)).map(w => localDay(w.date))).size;
  return {mod: Math.round(mod), vig: Math.round(vig), eq: Math.round(mod + 2 * vig), strengthDays};
}

// ---------- choque entre fuerza y cardio ----------
const LEG_P = ['squat', 'hinge', 'lunge', 'quad', 'ham', 'glute'];
const hoursAgo = d => (Date.now() - new Date(d)) / 36e5;
function legSets(w){ return (w.exercises || []).reduce((t, e) => t + (EX[e.ex] && LEG_P.includes(EX[e.ex].p) ? (e.sets || []).filter(s => s.done !== false && s.t !== 'w').length : 0), 0); }
function hardCardio(p, a){
  if (!['run', 'ride', 'hike', 'class'].includes(a.sport)) return false;
  if (a.rpe >= 7) return true;
  if (['series', 'tempo', 'carrera', 'intervalos'].includes(a.type)) return true;
  if ((a.durSec || 0) >= 90 * 60 && a.sport !== 'hike') return true;
  if (a.sport === 'class' && ['hiit', 'cross', 'spinning'].includes(a.ctype)) return true;
  const sec = typeof zoneTimes === 'function' ? zoneTimes(a, myZones(p)) : null; return !!(sec && sec[3] + sec[4] >= 600);
}
function clashes(p){
  const out = [];
  const legs = workoutsOf(p.id).find(w => hoursAgo(w.date) < 30 && legSets(w) >= 6);
  const hard = actsOf(p.id).find(a => hoursAgo(a.date) < 30 && hardCardio(p, a));
  if (legs) out.push({k: 'legs', t: `${hoursAgo(legs.date) < 14 ? 'Hoy' : 'Ayer'} hiciste piernas pesadas`, b: 'Si corrés o pedaleás, que sea suave. Las series, el tempo o el fondo largo rinden más con 24–48 h de distancia de las piernas pesadas.', ref: 'wilson2012'});
  if (hard) out.push({k: 'cardio', t: `${hoursAgo(hard.date) < 14 ? 'Hoy' : 'Ayer'} hiciste ${a2txt(hard)}`, b: 'Si hoy te toca fuerza de piernas, bajá una serie por ejercicio o dejá 1–2 repeticiones más en reserva. El tren superior lo podés entrenar normal.', ref: 'schumann2022'});
  return out;
}
const a2txt = a => a.sport === 'class' ? 'una clase intensa' : a.type === 'series' || a.type === 'intervalos' ? 'series' : a.type === 'tempo' ? 'un tempo' : a.type === 'carrera' ? 'una carrera' : (a.durSec || 0) >= 5400 ? 'un fondo largo' : 'cardio intenso';

// ---------- recuperación sugerida por sesión ----------
function avgSessLoad(p){ const arr = [...actsOf(p.id).filter(a => hoursAgo(a.date) < 24 * 42).map(a => sessionLoad(a, 'a')), ...workoutsOf(p.id).filter(w => hoursAgo(w.date) < 24 * 42).map(w => sessionLoad(w, 'w'))].filter(x => x > 0); return arr.length >= 4 ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function recoveryHours(p, x, kind){ const avg = avgSessLoad(p), l = sessionLoad(x, kind); if (!avg || !l) return null; return Math.max(6, Math.min(72, Math.round(18 * l / avg / 6) * 6)); }
function recoveryLeft(p){
  let left = 0;
  [...actsOf(p.id).filter(a => hoursAgo(a.date) < 72).map(a => [a, 'a']), ...workoutsOf(p.id).filter(w => hoursAgo(w.date) < 72).map(w => [w, 'w'])].forEach(([x, k]) => {
    const h = recoveryHours(p, x, k); if (h) left = Math.max(left, h - hoursAgo(x.date) - (x.durSec || 0) / 3600);
  });
  return Math.round(left);
}

// ---------- Listo hoy ----------
function readiness(p){
  const parts = []; const t = hDay(p, 0);
  // sueño de anoche
  const sl = t.sleepMin || null;
  if (sl) parts.push({k: 'sueño', w: .3, v: Math.max(0, Math.min(1, (sl / 60 - 4.5) / 3)), txt: `${Math.floor(sl / 60)} h ${String(sl % 60).padStart(2, '0')} de sueño`});
  // pulso en reposo contra tu normal
  const today = restOf(t), base = median(Array.from({length: 28}, (_, i) => restOf(hDay(p, i + 3))));
  if (today && base) { const dev = today - base; parts.push({k: 'pulso', w: .3, v: Math.max(.05, Math.min(1, 1 - dev / 9)), txt: `pulso en reposo ${today} (tu normal ${base})`}); }
  // carga y recuperación
  const st = trainingState(p), left = recoveryLeft(p);
  if (st && st.r) { let v = st.r <= 1 ? 1 : Math.max(.2, 1 - (st.r - 1) * 1.1); if (left > 0) v = Math.min(v, left > 24 ? .4 : .65); parts.push({k: 'carga', w: .25, v, txt: left > 0 ? `recuperación pendiente ~${left} h` : `carga ${st.t.toLowerCase()}`}); }
  else if (left > 0) parts.push({k: 'carga', w: .25, v: left > 24 ? .4 : .65, txt: `recuperación pendiente ~${left} h`});
  // cómo te sentís (pregunta de Bienestar)
  const fv = {bien: 1, cansado: .5, dolor: t.pain && t.pain.n >= 6 ? .2 : .55, enfermo: .1}[t.feel];
  if (fv != null) parts.push({k: 'sensación', w: .15, v: fv, txt: {bien: 'te sentís bien', cansado: 'te sentís cansado', dolor: 'te duele algo', enfermo: 'te sentís mal'}[t.feel]});
  if (!parts.some(x => x.k !== 'sensación')) return null;
  const W = parts.reduce((a, x) => a + x.w, 0);
  let score = Math.round(parts.reduce((a, x) => a + x.w * x.v, 0) / W * 100);
  const sick = t.sick || {}; if (sick.fever || sick.chest || sick.below) score = Math.min(score, 20);
  const lvl = score >= 75 ? ['Para darle', 'ok', 'Buen día para un entrenamiento exigente o para intentar superar una marca.']
    : score >= 55 ? ['Normal', '', 'Seguí tu plan como está.']
    : score >= 35 ? ['Mejor liviano', 'warn', 'Hacé tu rutina en versión liviana (una serie menos y 1 repetición más en reserva) o cardio suave.']
    : ['Recuperación', 'bad', 'Hoy priorizá descansar: caminata, movilidad o yoga suave.'];
  return {score, lvl, parts, cl: clashes(p)};
}
function listoLine(p){
  const r = readiness(p);
  if (!r) return '';
  return `<button class="card row between" data-act="sheet" data-arg="listo" style="width:100%;text-align:left;cursor:pointer;padding:12px 14px">
    <span class="row" style="gap:10px;flex-wrap:nowrap"><b class="num" style="font-size:28px;font-family:var(--f-display);color:${r.lvl[1] ? 'var(--' + r.lvl[1] + ')' : 'var(--fg)'}">${r.score}</b><span><b>Listo hoy · ${r.lvl[0]}</b>${r.cl.length ? `<div class="small muted">${esc(r.cl[0].t)}</div>` : ''}</span></span>
    <span class="muted" aria-hidden="true">›</span></button>`;
}
App.views.sh_listo = (p) => {
  const r = readiness(p); if (!r) return '<h2>Listo hoy</h2><p class="small muted">Hace falta el pulso en reposo o el sueño del reloj, o algunos entrenamientos registrados.</p>';
  return `<span class="label">Listo hoy</span><div class="row" style="align-items:flex-end;gap:12px"><div class="big">${r.score}</div><span class="pill ${r.lvl[1]}" style="margin-bottom:10px">${r.lvl[0]}</span></div>
    <p class="small">${r.lvl[2]}</p>
    <div class="stack-s">${r.parts.map(x => `<div class="row between"><span class="small">${esc(x.txt)}</span><div style="width:90px;height:8px;background:var(--surface2);border-radius:4px;overflow:hidden"><i style="display:block;height:100%;width:${Math.round(x.v * 100)}%;background:${x.v >= .75 ? 'var(--ok)' : x.v >= .5 ? 'var(--fg)' : 'var(--warn)'}"></i></div></div>`).join('')}</div>
    ${r.cl.map(c => `<div class="banner small"><div><b>${esc(c.t)}</b><div>${esc(c.b)}</div></div></div>`).join('')}
    <p class="tiny muted">Combina sueño (Watson 2015), pulso en reposo contra tu normal (Buchheit 2014), carga reciente (Gabbett 2016) y cómo te sentís. Es orientativo: si te sentís mal, escuchá a tu cuerpo aunque el número sea alto.</p>`;
};
// en Inicio: una sola línea debajo del próximo entrenamiento
const _homeListo = App.views.home;
App.views.home = (p) => {
  const html = _homeListo(p); const line = listoLine(p); if (!line) return html;
  const r = typeof cutCard === 'function' ? cutCard(html, '<div class="hero">') : null;
  return r ? html.slice(0, r[1]) + line + html.slice(r[1]) : html;
};
// al empezar la rutina: versión liviana si el día viene flojo, y aviso de choque
const _ovWorkoutListo = App.views.ov_workout;
App.views.ov_workout = (p) => {
  const html = _ovWorkoutListo(p); const w = S.ov && S.ov.w; if (!w || S.ov.finish || w.planKind === 'libre') return html;
  const r = readiness(p); const hasLegs = w.exercises.some(e => EX[e.ex] && LEG_P.includes(EX[e.ex].p));
  let b = '';
  if (r && r.score < 55 && !w.light && !w.lightNo) b += `<div class="banner"><div class="grow"><b>Listo hoy: ${r.score} · ${r.lvl[0]}</b><div class="small">Te conviene la versión liviana: una serie menos por ejercicio y 1 repetición más en reserva.</div></div><div class="stack-s"><button class="btn sm primary" data-act="wLight">Aplicar</button><button class="btn sm ghost" data-act="wLightNo">No</button></div></div>`;
  else if (r && r.score >= 75 && !w.lightNo) b += `<div class="banner info small"><div><b>Listo hoy: ${r.score}.</b> Buen día para intentar sumar una repetición o un poco de peso.</div></div>`;
  const cc = r ? r.cl.find(c => c.k === 'cardio') : null;
  if (cc && hasLegs && !w.light) b += `<div class="banner small"><div><b>${esc(cc.t)}.</b> ${esc(cc.b)}</div></div>`;
  if (w.light) b += `<div class="banner info small"><div>Versión liviana aplicada.</div></div>`;
  if (!b) return html;
  const mark = '<div class="wrap stack" style="padding-top:14px;';
  const i = html.indexOf(mark); if (i < 0) return html; const j = html.indexOf('>', i) + 1;
  return html.slice(0, j) + b + html.slice(j);
};
App.acts.wLight = () => {
  const w = S.ov.w;
  w.exercises.forEach(e => { const n = e.sets.filter(s => s.t !== 'w'); if (n.length >= 3) { const k = e.sets.lastIndexOf(n[n.length - 1]); if (!e.sets[k].done) e.sets.splice(k, 1); } e.rir = (e.rir || 2) + 1; });
  w.light = true; saveActive(); App.renderOverlay(); toast('Listo: versión liviana');
};
App.acts.wLightNo = () => { S.ov.w.lightNo = true; saveActive(); App.renderOverlay(); };
// al empezar a grabar una salida después de piernas pesadas
if (App.acts.recStart) { const _recStartC = App.acts.recStart; App.acts.recStart = el => { const p = curProfile(); const c = clashes(p).find(x => x.k === 'legs'); if (c && el.dataset.arg !== 'hike') toast(c.t + ': hoy mejor ritmo suave'); return _recStartC(el); }; }

// ---------- tarjeta "Carga semanal" en Progreso ----------
function cargaCard(p){
  const wk = weekLoads(p, 8); if (!wk.some(w => w.total)) return '';
  const st = trainingState(p), who = whoWeek(p);
  const avg = wk.map((_, i) => { const prev = wk.slice(Math.max(0, i - 4), i); return prev.length ? Math.round(prev.reduce((t, x) => t + x.total, 0) / prev.length) : null; });
  chartLater('cgch', () => ({type: 'bar', data: {labels: wk.map(w => fmtDate(w.start, {day: 'numeric', month: 'numeric'})), datasets: [
    ...DISC.filter(([k]) => wk.some(w => w[k])).map(([k, l, c]) => ({label: l, data: wk.map(w => Math.round(w[k])), backgroundColor: cssv(c), stack: 's', borderRadius: 2})),
    {type: 'line', label: 'Promedio 4 sem.', data: avg, borderColor: cssv('--fg'), borderDash: [4, 3], pointRadius: 0, borderWidth: 1.5, spanGaps: true}]},
    options: baseOpts({scales: {x: {stacked: true, grid: {display: false}}, y: {stacked: true, beginAtZero: true, ticks: {maxTicksLimit: 4}}}, plugins: {legend: {display: true, position: 'bottom', labels: {boxWidth: 10, font: {size: 11}}}}})}));
  const pct = Math.min(100, Math.round(who.eq / 150 * 100));
  return `<div class="card stack-s"><div class="row between"><div class="row" style="gap:6px"><h3>Carga semanal</h3>${qBtn('carga')}</div>${st ? `<span class="pill ${st.c}">${st.t}</span>` : ''}</div>
    ${st ? `<p class="small muted">${esc(st.b)}</p>` : ''}
    <div class="chartbox"><canvas id="cgch" aria-label="Carga por semana y disciplina"></canvas></div>
    <div class="stack-s"><div class="row between"><span class="small"><b>Minutos de actividad esta semana</b></span><span class="small num">${who.eq} / 150 ${who.eq >= 150 ? '✓' : ''}</span></div>
      <div class="progress" style="height:8px"><i style="width:${pct}%;background:${who.eq >= 150 ? 'var(--ok)' : 'var(--fg)'}"></i></div>
      <p class="tiny muted">${who.mod} min moderados + ${who.vig} vigorosos (cuentan doble) · fuerza ${who.strengthDays} de 2 días ${who.strengthDays >= 2 ? '✓' : ''}. Recomendación de la OMS para adultos (Bull 2020).</p></div>
    <p class="tiny muted">Carga = minutos × esfuerzo (RPE o zonas de pulso) en todas tus disciplinas. Subir más de 1,5 veces tu promedio aumenta el riesgo de lesión (Gabbett 2016).</p></div>`;
}
const _progCarga = App.views.prog;
App.views.prog = (p) => {
  const html = _progCarga(p); const card = cargaCard(p); if (!card) return html;
  const mark = '<div class="card stack-s"><h3>Volumen de fuerza por semana</h3>'; const i = html.indexOf(mark);
  return i >= 0 ? html.slice(0, i) + card + html.slice(i) : html;
};
