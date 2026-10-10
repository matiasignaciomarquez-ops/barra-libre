// Sesión de entrenamiento en vivo: registro de series, sugerencias, descanso con lecturas.
'use strict';

function wKey(){ return 'bl_active_' + S.pid; }
let cloudT = null;
function saveActive(){
  if (!(S.ov && S.ov.type === 'workout')) return;
  const w = S.ov.w; w.updatedAt = Date.now(); ls.set(wKey(), w);
  clearTimeout(cloudT); cloudT = setTimeout(() => { if ((Store.mode === 'db' || Store.mode === 'cloud') && !Store.readOnly && S.ov && S.ov.w === w) Store.put('active', {id: w.pid, pid: w.pid, w: JSON.parse(JSON.stringify(w))}); }, 2500);
}
function getActive(pid){
  const loc = ls.get('bl_active_' + pid, null); const cl = Store.get('active', pid);
  if (loc && cl && cl.w) return (cl.w.updatedAt || 0) > (loc.updatedAt || 0) ? cl.w : loc;
  return loc || (cl && cl.w) || null;
}
function clearActive(pid){ clearTimeout(cloudT); ls.del('bl_active_' + pid); if (Store.get('active', pid)) Store.del('active', pid); }
const round = (x, st) => Math.round(x / st) * st;

function buildExEntry(p, item, deload){
  const ex = EX[item.ex];
  const hist = exHistory(p.id, ex.id);
  const sug = L.suggest(ex, item, hist, deload);
  const prevSets = hist[0] ? hist[0].sets.filter(s => s.t !== 'w') : [];
  const nSets = deload ? Math.max(1, Math.ceil(item.sets / 2)) : item.sets;
  const sets = [];
  if (item.warm && sug.kg) { const st = ex.eq === 'dumbbell' ? 2 : 2.5; sets.push({t:'w', kg: round(sug.kg*0.5, st), reps: 8, done:false}); if (item.warm > 1) sets.push({t:'w', kg: round(sug.kg*0.75, st), reps: 3, done:false}); }
  for (let i = 0; i < nSets; i++) sets.push({t:'n', kg: sug.kg != null ? sug.kg : '', reps:'', rir:'', done:false, prev: prevSets[i] ? {kg: prevSets[i].kg, reps: prevSets[i].reps} : null});
  return {ex: ex.id, role: item.role || 'A', lo: item.lo, hi: item.hi, rir: deload ? item.rir + 2 : item.rir, rest: item.rest || 90, note: item.note || '', sug, sets};
}

App.acts.startPlanDay = el => {
  const p = curProfile(); const key = el.dataset.kind || 'plan'; const plan = p[key] || p.plan; const day = plan.days[+el.dataset.arg];
  if (getActive(p.id)) { toast('Ya hay un entrenamiento en curso. Terminalo o descartalo primero.'); App.acts.resumeWorkout(); return; }
  const deload = !!(p.deloadUntil && new Date(p.deloadUntil) > new Date());
  const w = {id: uid(), pid: p.id, date: new Date().toISOString(), name: day.name, planKind: plan.kind, planKey: key, planCreated: plan.createdAt, planDay: day.id, goal: plan.goal, deload,
    exercises: day.items.filter(it => EX[it.ex]).map(it => buildExEntry(p, it, deload))};
  startW(w);
};
App.acts.emptyWorkout = () => {
  const p = curProfile();
  if (getActive(p.id)) { App.acts.resumeWorkout(); return; }
  startW({id: uid(), pid: p.id, date: new Date().toISOString(), name: 'Entrenamiento libre', planKind: 'libre', goal: p.goal, exercises: []});
};
function startW(w){
  S.ov = {type:'workout', w}; saveActive(); App.renderOverlay();
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => S.wakeLock = l).catch(() => {}); } catch(e){}
}
App.acts.resumeWorkout = () => { const w = getActive(S.pid); if (w) startW(w); };
function workoutAddExercise(id){
  const p = curProfile(); const goal = S.ov.w.goal || p.goal || 'hipertrofia';
  const item = {ex: id, role: 'A', ...L.prescribe(goal, 'A', p.level || 'beg', EX[id]), warm: 0};
  S.ov.w.exercises.push(buildExEntry(p, item, S.ov.w.deload)); saveActive(); App.renderOverlay();
}
function workoutSwapExercise(j, id){
  const p = curProfile(); const old = S.ov.w.exercises[j];
  S.ov.w.exercises[j] = buildExEntry(p, {ex: id, role: old.role, sets: old.sets.filter(s => s.t !== 'w').length, lo: old.lo, hi: old.hi, rir: old.rir, rest: old.rest, warm: 0}, false);
  saveActive(); App.renderOverlay();
}

App.views.ov_workout = (p) => {
  const w = S.ov.w;
  if (S.ov.finish) return finishView(p, w);
  const elapsed = Math.floor((Date.now() - new Date(w.date)) / 1000);
  return `<div class="overlay" role="dialog" aria-modal="true" aria-label="Entrenamiento en curso"><div class="bar"><div class="in">
    <button class="iconbtn" data-act="minimizeW" aria-label="Minimizar">${ICON.back}</button>
    <div class="grow"><b>${esc(w.name)}</b><div class="small muted num" id="wtime">${L.durStr(elapsed)}</div></div>
    <button class="btn primary sm" data-act="finishW">Terminar</button></div></div>
  <div class="wrap stack" style="padding-top:14px;padding-bottom:${S.rest?220:110}px">
    ${w.deload ? '<div class="banner small"><div>Descarga: la mitad de series y RIR más alto.</div></div>' : ''}
    ${w.exercises.map((e, j) => exCard(w, e, j)).join('')}
    <button class="btn block" data-act="wAddEx">Agregar ejercicio</button>
    <details class="card flat"><summary>¿Qué es RIR?</summary><p class="small" style="margin-top:6px">Repeticiones en reserva: cuántas reps más podrías haber hecho con buena técnica. RIR 0 = fallo; RIR 2 = te quedaban 2. Anotarlo ayuda a que las sugerencias sean más precisas.</p></details>
  </div>${S.rest ? restView() : ''}</div>`;
};

function exCard(w, e, j){
  const ex = EX[e.ex]; const [a,b] = nm(ex);
  const sec = ex.u === 'sec', bw0 = ex.eq === 'bodyweight' || ex.eq === 'bands';
  const bw = bw0 && (sec || !['vpull','hpush','hpull','triceps','lunge','squat','glute'].includes(ex.p));
  const kgLbl = bw0 ? '+kg' : ex.eq === 'dumbbell' ? 'kg c/u' : 'kg';
  let n = 0; const total = e.sets.filter(s => s.t !== 'w').length;
  const firstOpen = e.sets.findIndex(s => !s.done);
  let wn = 0;
  const rows = e.sets.map((s, k) => {
    const isW = s.t === 'w'; if (isW) wn++; else n++;
    const lbl = isW ? 'A' + wn : n;
    const prev = s.prev ? `${s.prev.kg ? L.fmtKg(s.prev.kg) + '×' : ''}${s.prev.reps}` : '–';
    const tgt = e.sug && e.sug.reps ? e.sug.reps : e.hi;
    return `<tr class="${s.done?'done':''}">
      <td><span class="sn ${isW?'w':''}" data-act="setInfo" data-e="${j}" data-s="${k}" title="Objetivo de la serie">${lbl}</span></td>
      <td class="prev">${isW ? '' : prev}</td>
      ${bw ? '' : `<td><input type="text" inputmode="decimal" autocomplete="off" aria-label="kg serie ${lbl}" value="${s.kg===''||s.kg==null?'':s.kg}" placeholder="${e.sug&&e.sug.kg!=null?e.sug.kg:(bw0?'0':'kg')}" data-bind="wset" data-e="${j}" data-s="${k}" data-k="kg"></td>`}
      <td><input type="number" inputmode="numeric" aria-label="${sec?'segundos':'reps'} serie ${lbl}" value="${s.reps===''||s.reps==null?'':s.reps}" placeholder="${isW ? s.reps : tgt}" data-bind="wset" data-e="${j}" data-s="${k}" data-k="reps"></td>
      <td>${isW ? '' : `<input type="number" inputmode="numeric" aria-label="RIR serie ${lbl}" value="${s.rir===''||s.rir==null?'':s.rir}" placeholder="${e.rir}" data-bind="wset" data-e="${j}" data-s="${k}" data-k="rir">`}</td>
      <td><button class="check" data-act="wDone" data-e="${j}" data-s="${k}" aria-label="Completar serie ${lbl}" aria-pressed="${!!s.done}">${s.done?ICON.check:''}</button></td></tr>`;
  }).join('');
  let purpose = '';
  if (firstOpen >= 0) {
    const s = e.sets[firstOpen];
    const idx = s.t === 'w' ? e.sets.slice(0, firstOpen).filter(x => x.t === 'w').length : e.sets.slice(0, firstOpen).filter(x => x.t !== 'w').length;
    purpose = `<div class="purpose"><b>${s.t==='w'?'Aproximación':'Serie ' + (idx+1) + ' de ' + total}:</b> ${esc(L.setPurpose(w.goal, e.role, idx, total, s.t==='w', ex.u))}</div>`;
  } else purpose = `<div class="purpose" style="border-color:var(--ok)"><b>Ejercicio completo.</b> ${esc(doneMsg(e))}</div>`;
  const sg = e.sug;
  const nx = sg && sg.action === 'level' && sg.next ? sg.next : null;
  return `<div class="card stack-s">
    <div class="exrow"><div style="width:96px;flex:none" data-act="exInfo" data-arg="${ex.id}">${animHTML(ex.img,'',a)}</div>
      <div class="grow"><div class="exname">${esc(a)}</div><div class="exalt">${esc(b)}</div>
      <div class="small muted num">${total} × ${e.lo}–${e.hi}${sec?' s':''} · RIR ${e.rir} · descanso ${L.durStr(e.rest)}</div></div></div>
    ${sg && sg.text ? `<div class="sugg ${sg.action==='up'||sg.action==='level'?'up':sg.action==='down'?'down':''}">${esc(sg.text)}</div>` : ''}
    ${nx ? `<button class="btn sm" data-act="wLevel" data-e="${j}">Pasar a ${esc(nm(EX[nx])[0])}</button>` : ''}
    ${e.note ? `<p class="small muted">${esc(e.note)}</p>` : ''}
    <table class="sets"><thead><tr><th>Serie</th><th>Anterior</th>${bw?'':`<th>${kgLbl}</th>`}<th>${sec?'Seg':'Reps'}</th><th>RIR</th><th><span class="sr" style="position:absolute;left:-9999px">Hecha</span></th></tr></thead><tbody>${rows}</tbody></table>
    ${purpose}
    <div class="row"><button class="btn sm" data-act="wAddSet" data-e="${j}">+ Serie</button><button class="btn sm ghost" data-act="wSwap" data-e="${j}">Cambiar</button>
    <button class="btn sm ghost" data-act="wMove" data-e="${j}" data-d="-1" aria-label="Subir ejercicio">↑</button><button class="btn sm ghost" data-act="wMove" data-e="${j}" data-d="1" aria-label="Bajar ejercicio">↓</button>
    <span class="grow"></span><button class="btn sm ghost danger" data-act="wDelEx" data-e="${j}">Quitar</button></div>
  </div>`;
}
function doneMsg(e){
  const ws = e.sets.filter(s => s.t !== 'w' && s.done);
  if (!ws.length) return '';
  if (ws.every(s => +s.reps >= e.hi)) return 'Llegaste al tope del rango en todas las series: la próxima vez la app te sugiere subir.';
  if (ws.some(s => +s.reps < e.lo)) return 'Quedaste debajo del rango en alguna serie. Si se repite, la app sugiere bajar un poco el peso.';
  return 'Dentro del rango. La próxima vez buscá sumar una repetición.';
}

App.binds.wset = el => { const s = S.ov.w.exercises[+el.dataset.e].sets[+el.dataset.s]; const v = num(el.value); s[el.dataset.k] = isNaN(v) ? '' : v; saveActive(); };
App.acts.setInfo = el => { const e = S.ov.w.exercises[+el.dataset.e]; const s = e.sets[+el.dataset.s]; const ex = EX[e.ex]; const idx = e.sets.slice(0, +el.dataset.s).filter(x => x.t === s.t).length; const total = e.sets.filter(x => x.t !== 'w').length; toast(L.setPurpose(S.ov.w.goal, e.role, idx, total, s.t === 'w', ex.u)); };
App.acts.wDone = el => {
  const e = S.ov.w.exercises[+el.dataset.e]; const s = e.sets[+el.dataset.s]; const ex = EX[e.ex];
  if (!s.done) {
    if ((s.kg === '' || s.kg == null) && e.sug && e.sug.kg != null && !(ex.eq === 'bodyweight' || ex.eq === 'bands')) s.kg = s.t === 'w' ? s.kg : e.sug.kg;
    if (s.reps === '' || s.reps == null) { const ph = s.t === 'w' ? s.reps : (e.sug && e.sug.reps) || e.hi; s.reps = ph; }
    if (s.reps === '' || s.reps == null || s.reps === 0) { toast('Anotá las repeticiones primero'); return; }
    const bwx = ex.eq === 'bodyweight' || ex.eq === 'bands';
    if (!bwx && (s.kg === '' || s.kg == null)) { toast('Anotá el peso primero'); return; }
    s.done = true; s.at = Date.now();
    ensureAudio(); startRest(s.t === 'w' ? 60 : e.rest, ex);
  } else { s.done = false; }
  saveActive(); App.renderOverlay();
};
App.acts.wAddSet = el => { const e = S.ov.w.exercises[+el.dataset.e]; const last = [...e.sets].reverse().find(s => s.t !== 'w'); e.sets.push({t:'n', kg: last ? last.kg : '', reps:'', rir:'', done:false}); saveActive(); App.renderOverlay(); };
App.acts.wDelEx = el => { S.ov.w.exercises.splice(+el.dataset.e, 1); saveActive(); App.renderOverlay(); };
App.acts.wMove = el => { const a = S.ov.w.exercises, j = +el.dataset.e, k = j + +el.dataset.d; if (k < 0 || k >= a.length) return; [a[j], a[k]] = [a[k], a[j]]; saveActive(); App.renderOverlay(); };
App.acts.wAddEx = () => App.openSheet('pick', {pickFor:'wAdd', back:null, pickQ:''});
App.acts.wSwap = el => App.openSheet('pick', {pickFor:'wSwap', swapJ: +el.dataset.e, back:null, pickQ:''});
App.acts.wLevel = el => {
  const j = +el.dataset.e; const w = S.ov.w; const e = w.exercises[j]; const nx = e.sug.next; const old = e.ex;
  workoutSwapExercise(j, nx);
  const p = curProfile(); const key = w.planKey;
  if (key && p[key]) { const plan = JSON.parse(JSON.stringify(p[key])); plan.days.forEach(d => d.items.forEach(it => { if (it.ex === old) it.ex = nx; })); Store.put('profiles', {...p, [key]: plan}); }
  toast('¡Subiste de nivel! Tu plan se actualizó.');
};
App.acts.minimizeW = () => { S.ov = null; App.renderOverlay(); App.render(); };

// ---------- descanso ----------
function startRest(sec, ex){
  const cats = ['fundamentos','tecnica','recuperacion', S.ov.w.goal === 'fuerza' ? 'fuerza' : 'hipertrofia', S.ov.w.goal === 'recomp' ? 'nutricion' : 'hipertrofia', S.ov.w.planKind === 'calis' ? 'calistenia' : 'fundamentos'];
  const pool = TIPS.filter(t => cats.includes(t.cat));
  S.restTipI = (S.restTipI == null ? Math.floor(Math.random() * pool.length) : S.restTipI + 1) % pool.length;
  S.rest = {end: Date.now() + sec * 1000, total: sec, tip: pool[S.restTipI], cue: ex.cues[Math.floor(Math.random() * ex.cues.length)], exName: nm(ex)[0], beeped: false};
}
function restView(){
  const r = S.rest; const left = Math.max(0, Math.ceil((r.end - Date.now()) / 1000));
  return `<div class="rest" role="timer" aria-live="off"><div class="in">
    <div class="row between"><div><span class="label" style="color:inherit;opacity:.7">Descanso</span><div class="t" id="restT">${L.durStr(left)}</div></div>
    <div class="row"><button class="btn sm" data-act="restAdj" data-arg="-15">−15</button><button class="btn sm" data-act="restAdj" data-arg="15">+15</button><button class="btn sm" data-act="restSkip">Saltar</button></div></div>
    <div class="restbar"><i id="restBar" style="width:${(1 - left / r.total) * 100}%"></i></div>
    <div class="tip"><b>${esc(r.tip.t)}.</b> ${esc(r.tip.b)}</div>
    <div class="tip"><b>Técnica · ${esc(r.exName)}:</b> ${esc(r.cue)}</div></div></div>`;
}
App.acts.restAdj = el => { S.rest.end += (+el.dataset.arg) * 1000; S.rest.total = Math.max(1, S.rest.total + +el.dataset.arg); App.renderOverlay(); };
App.acts.restSkip = () => { S.rest = null; App.renderOverlay(); };
function beep(){
  try { const C = window.AudioContext || window.webkitAudioContext; const ac = S.ac || (S.ac = new C()); [0, .25].forEach(t => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(.2, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + t + .2); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + .22); }); } catch(e){}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e){}
}
setInterval(() => {
  if (!S.ov || S.ov.type !== 'workout') return;
  const wt = document.getElementById('wtime'); if (wt) wt.textContent = L.durStr((Date.now() - new Date(S.ov.w.date)) / 1000);
  if (S.rest) {
    const left = Math.max(0, Math.ceil((S.rest.end - Date.now()) / 1000));
    const t = document.getElementById('restT'), b = document.getElementById('restBar');
    if (t) t.textContent = left ? L.durStr(left) : '¡Vamos!';
    if (b) b.style.width = (1 - left / S.rest.total) * 100 + '%';
    if (!left && !S.rest.beeped) { S.rest.beeped = true; beep(); setTimeout(() => { if (S.rest && S.rest.beeped) { S.rest = null; App.renderOverlay(); } }, 4000); }
  }
}, 250);

// ---------- terminar ----------
App.acts.finishW = () => { S.ov.finish = true; S.rest = null; App.renderOverlay(); };
App.acts.backToW = () => { S.ov.finish = false; S.ov.confirmDiscard = false; App.renderOverlay(); };
function finishView(p, w){
  const done = w.exercises.map(e => ({...e, sets: e.sets.filter(s => s.done)})).filter(e => e.sets.length);
  const v = wVolume({exercises: done});
  const prs = done.filter(e => { const prev = exHistory(p.id, e.ex, w.id); if (!prev.length) return false; const before = Math.max(...prev.map(h => bestE1rm(h.sets))); return bestE1rm(e.sets) > before && before > 0; }).map(e => e.ex);
  w._prs = prs;
  const mins = Math.round(realDuration(w) / 60);
  return `<div class="overlay" role="dialog" aria-modal="true"><div class="bar"><div class="in"><button class="iconbtn" data-act="backToW" aria-label="Volver">${ICON.back}</button><b class="grow">Resumen</b></div></div>
  <div class="wrap stack" style="padding-top:16px">
    <h2>${esc(w.name)}</h2>
    <div class="kpis"><div class="kpi"><b>${mins}</b><span>minutos</span></div><div class="kpi"><b>${v.sets}</b><span>series efectivas</span></div><div class="kpi"><b>${fmtNum(v.kg)}</b><span>kg totales</span></div><div class="kpi"><b style="color:var(--ok)">${prs.length}</b><span>récords</span></div></div>
    ${prs.length ? `<div class="card stack-s"><b>Nuevos récords de 1RM estimado</b>${prs.map(id => `<p class="small">${esc(nm(EX[id])[0])}</p>`).join('')}</div>` : ''}
    ${!done.length ? '<div class="banner small"><div>No marcaste ninguna serie como hecha.</div></div>' : ''}
    <div class="grid2"><div class="field"><label for="whr">FC promedio (lpm)</label><input id="whr" type="number" inputmode="numeric" placeholder="de tu pulsera" value="${esc(w.hrAvg||'')}" data-bind="whr" data-k="hrAvg"></div>
    <div class="field"><label for="whrm">FC máxima (lpm)</label><input id="whrm" type="number" inputmode="numeric" placeholder="opcional" value="${esc(w.hrMax||'')}" data-bind="whr" data-k="hrMax"></div></div>
    <p class="tiny muted">Iniciá un entrenamiento de "fuerza" en tu pulsera al empezar y copiá acá lo que muestra al terminar.</p>
    <div class="field"><label for="wnotes">Notas (cómo te sentiste, molestias, etc.)</label><textarea id="wnotes" data-bind="wnotes">${esc(w.notes||'')}</textarea></div>
    <button class="btn primary block" data-act="saveW" ${done.length?'':'disabled style="opacity:.5"'}>Guardar entrenamiento</button>
    ${S.ov.confirmDiscard ? `<div class="banner"><div class="grow"><b>¿Descartar este entrenamiento?</b><div class="small">Se pierden las series registradas.</div></div></div><div class="row"><button class="btn grow" data-act="backToW">Seguir entrenando</button><button class="btn grow danger" data-act="discardW">Descartar</button></div>` : `<button class="btn block ghost danger" data-act="askDiscard">Descartar</button>`}
  </div></div>`;
}
App.binds.whr = el => { S.ov.w[el.dataset.k] = el.value === '' ? '' : +el.value; saveActive(); };
App.binds.wnotes = el => { S.ov.w.notes = el.value; saveActive(); };
App.acts.askDiscard = () => { S.ov.confirmDiscard = true; App.renderOverlay(); };
App.acts.discardW = () => { clearActive(S.pid); S.ov = null; S.rest = null; relWake(); App.renderOverlay(); App.render(); toast('Entrenamiento descartado'); };
function realDuration(w){
  const ats = w.exercises.flatMap(e => e.sets.filter(s => s.done && s.at).map(s => s.at));
  const start = new Date(w.date).getTime();
  const end = ats.length ? Math.max(...ats) + 90000 : Date.now();
  return Math.max(60, Math.round((Math.min(end, Date.now()) - start) / 1000));
}
App.acts.saveW = async () => {
  const w = S.ov.w; if (S.saving) return; S.saving = true;
  const out = {id: w.id, pid: w.pid, date: w.date, durSec: realDuration(w), name: w.name, planKind: w.planKind, planKey: w.planKey || null, planCreated: w.planCreated || null, planDay: w.planDay || null, goal: w.goal, notes: w.notes || '', prs: w._prs || [], hrAvg: +w.hrAvg || null, hrMax: +w.hrMax || null,
    exercises: w.exercises.map(e => ({ex: e.ex, role: e.role, lo: e.lo, hi: e.hi, rir: e.rir, sets: e.sets.filter(s => s.done).map(s => ({t: s.t, kg: +s.kg || 0, reps: +s.reps || 0, rir: s.rir === '' || s.rir == null ? null : +s.rir, done: true}))})).filter(e => e.sets.length)};
  const btn = document.querySelector('[data-act=saveW]'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  const ok = await Store.put('workouts', out); S.saving = false;
  if (!ok) { if (btn) { btn.disabled = false; btn.textContent = 'Reintentar guardado'; } toast('No se pudo guardar por falta de conexión. Tu entrenamiento sigue a salvo en este teléfono: probá de nuevo en un rato.'); return; }
  clearActive(w.pid); S.ov = null; S.rest = null; relWake();
  App.renderOverlay(); S.tab = 'home'; ls.set('bl_tab','home'); App.render();
  toast(out.prs.length ? `¡Guardado con ${out.prs.length} récord${out.prs.length>1?'s':''}!` : 'Entrenamiento guardado');
};
function ensureAudio(){ try { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; S.ac = S.ac || new C(); if (S.ac.state === 'suspended') S.ac.resume(); } catch(e){} }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.ov && (S.ov.type === 'workout' || S.ov.type === 'yoga')) { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => S.wakeLock = l).catch(() => {}); } catch(e){} }
});
function relWake(){ try { S.wakeLock && S.wakeLock.release(); } catch(e){} S.wakeLock = null; }
