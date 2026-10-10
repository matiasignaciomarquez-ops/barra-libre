// Mis rutinas: crear, guardar y elegir rutinas propias en Fuerza, Cardio, Yoga y Clases.
// Se guardan en una colección nueva ("routines"). No modifica el plan que genera la app:
// las rutinas de la app se muestran al lado, y al entrenar se usa la misma pantalla de siempre.
'use strict';
if (!COLS.includes('routines')) COLS.push('routines');
Store.data.routines = Store.data.routines || {};

const RUT_TABS = [['lift','Fuerza'],['cardio','Cardio'],['yoga','Yoga'],['class','Clases']];
const rutTab = kind => kind === 'run' || kind === 'ride' ? 'cardio' : kind;
const myRoutines = (p, tab) => Store.list('routines', p.id).filter(r => rutTab(r.kind) === tab).sort((a,b) => (b.lastUsed || b.createdAt || '').localeCompare(a.lastUsed || a.createdAt || ''));
const rutBtn = tab => `<button class="btn block" data-act="openRut" data-arg="${tab}" style="justify-content:space-between"><span>★ Mis rutinas</span><span class="small muted">${Store.list('routines', S.pid).filter(r => rutTab(r.kind) === tab).length} guardadas ›</span></button>`;
const yogaPose = id => (typeof YP !== 'undefined' && YP[id]) || null;

function rutSummary(r){
  if (r.kind === 'lift') return `${(r.items||[]).length} ejercicios · ${(r.items||[]).slice(0,3).map(i => EX[i.ex] ? nm(EX[i.ex])[0] : '?').join(', ')}${(r.items||[]).length > 3 ? '…' : ''}`;
  if (r.kind === 'run' || r.kind === 'ride') { const t = (r.kind === 'run' ? L.RUN_TYPES : L.RIDE_TYPES)[r.type] || ''; return [r.kind === 'run' ? 'Running' : 'Ciclismo', t, r.distKm ? fmtNum(r.distKm, 1) + ' km' : '', r.durMin ? r.durMin + ' min' : ''].filter(Boolean).join(' · '); }
  if (r.kind === 'yoga') { const mins = Math.round((r.steps||[]).reduce((t,s) => t + s.s * (yogaPose(s.p) && yogaPose(s.p).sides ? 2 : 1), 0) / 60); return `${(r.steps||[]).length} posturas · ${mins} min${r.style && YSTYLES[r.style] ? ' · ' + YSTYLES[r.style] : ''}`; }
  if (r.kind === 'class') return [classTypes(curProfile())[r.ctype] || r.title || 'Clase', r.min ? r.min + ' min' : '', r.rpe ? 'RPE ' + r.rpe : ''].filter(Boolean).join(' · ');
  return '';
}
const rutAction = r => r.kind === 'lift' || r.kind === 'yoga' ? 'Empezar' : 'Registrar';

// ---------- pantalla Mis rutinas ----------
App.acts.openRut = el => { S.rutK = el.dataset.arg || 'lift'; App.closeSheet(); App.setOv({type:'rut'}); };
App.acts.rutTab = el => { S.rutK = el.dataset.arg; App.renderOverlay(); };
App.views.ov_rut = (p) => {
  const tab = S.rutK || 'lift';
  const mine = myRoutines(p, tab);
  return `<div class="overlay" role="dialog" aria-modal="true" aria-label="Mis rutinas"><div class="bar"><div class="in">
    <button class="iconbtn" data-act="closeOv" aria-label="Cerrar">${ICON.close}</button><div class="grow"><b>Mis rutinas</b><div class="small muted">Tuyas, las de la app y tu historial</div></div></div></div>
  <div class="wrap stack" style="padding-top:12px">
    <div class="seg" role="group" aria-label="Disciplina">${RUT_TABS.map(([k,l]) => `<button data-act="rutTab" data-arg="${k}" aria-pressed="${tab===k}">${l}</button>`).join('')}</div>
    <button class="btn primary" data-act="rutNew" data-arg="${tab}">+ Crear rutina${tab === 'class' ? ' de clase' : ''}</button>
    <div class="section" style="margin-top:4px"><h3>Mis rutinas</h3>
      ${mine.length ? mine.map(r => `<div class="card stack-s"><div class="row between"><div class="grow"><b>${esc(r.name)}</b><div class="small muted">${esc(rutSummary(r))}</div></div><span class="pill ${r.kind === 'lift' ? 'lift' : r.kind}">Mía</span></div>
        <div class="row"><button class="btn sm primary grow" data-act="rutUse" data-arg="${r.id}">${rutAction(r)}</button><button class="btn sm" data-act="rutEdit" data-arg="${r.id}">Editar</button></div></div>`).join('')
        : `<div class="empty small">Todavía no guardaste rutinas acá. Creá una desde cero o guardá una de tu historial.</div>`}
    </div>
    ${appRoutines(p, tab)}
    ${historyRoutines(p, tab)}
  </div></div>`;
};
function appRoutines(p, tab){
  if (tab === 'lift') {
    const plans = [['plan', p.plan], ['calisPlan', p.calisPlan]].filter(([,pl]) => pl && pl.days && pl.days.length);
    if (!plans.length) return '';
    return `<div class="section"><h3>De la app</h3>${plans.map(([key, pl]) => pl.days.map((d, i) => `<div class="card stack-s"><div class="row between"><div class="grow"><b>${esc(d.name)}</b><div class="small muted">${d.items.length} ejercicios · ${d.items.slice(0,3).map(it => EX[it.ex] ? esc(nm(EX[it.ex])[0]) : '').join(', ')}…</div></div><span class="pill ${key === 'calisPlan' ? 'calis' : ''}">De la app</span></div>
      <div class="row"><button class="btn sm primary grow" data-act="rutStartPlan" data-arg="${i}" data-kind="${key}">Empezar</button><button class="btn sm" data-act="rutCopyPlan" data-arg="${i}" data-kind="${key}">Copiar a mis rutinas</button></div></div>`).join('')).join('')}</div>`;
  }
  if (tab === 'yoga') {
    const seqs = (window.YOGA && YOGA.seqs) || [];
    return `<div class="section"><h3>De la app</h3>${seqs.map(s => `<div class="card stack-s"><div class="row between"><div class="grow"><b>${esc(s.name)}</b><div class="small muted">${esc(s.desc || '')}</div></div><span class="pill yoga">${seqMin(s)} min</span></div>
      <div class="row"><button class="btn sm primary grow" data-act="startSeq" data-arg="${s.id}">Empezar</button><button class="btn sm" data-act="rutCopySeq" data-arg="${s.id}">Copiar a mis rutinas</button></div></div>`).join('')}</div>`;
  }
  if (tab === 'cardio') {
    const parts = [];
    if (p.runPlan) parts.push(`<div class="card tap" data-act="rutGoCardio" data-arg="run"><b>Tu plan de running</b><div class="small muted">Ver las sesiones de esta semana en Cardio ›</div></div>`);
    if (p.ridePlan) parts.push(`<div class="card tap" data-act="rutGoCardio" data-arg="ride"><b>Tu plan de ciclismo</b><div class="small muted">Ver las sesiones de esta semana en Cardio ›</div></div>`);
    return parts.length ? `<div class="section"><h3>De la app</h3>${parts.join('')}</div>` : '';
  }
  return '';
}
function historyRoutines(p, tab){
  let items = [];
  if (tab === 'lift') items = workoutsOf(p.id).slice(0, 6).map(w => ({t: w.name, s: `${fmtDate(w.date)} · ${(w.exercises||[]).length} ejercicios`, rep: `data-act="rutRepeatW" data-arg="${w.id}"`, save: `data-act="rutFromW" data-arg="${w.id}"`}));
  if (tab === 'cardio') items = actsOf(p.id).filter(a => a.sport === 'run' || a.sport === 'ride').slice(0, 6).map(a => ({t: SP[a.sport].types()[a.type] || SP[a.sport].label, s: `${fmtDate(a.date)} · ${fmtNum(a.distKm,1)} km · ${L.durStr(a.durSec)}`, rep: `data-act="rutRepeatA" data-arg="${a.id}"`, save: `data-act="rutFromAct" data-arg="${a.id}"`}));
  if (tab === 'yoga') items = actsOf(p.id, 'yoga').filter(a => a.seq).slice(0, 6).map(a => ({t: a.title || 'Yoga', s: `${fmtDate(a.date)} · ${Math.round((a.durSec||0)/60)} min`, rep: `data-act="rutRepeatA" data-arg="${a.id}"`, save: `data-act="rutFromAct" data-arg="${a.id}"`}));
  if (tab === 'class') items = actsOf(p.id, 'class').slice(0, 6).map(a => ({t: classLabel(a), s: `${fmtDate(a.date)} · ${Math.round((a.durSec||0)/60)} min`, rep: `data-act="classRepeat" data-arg="${a.id}"`, save: `data-act="rutFromAct" data-arg="${a.id}"`}));
  if (!items.length) return '';
  return `<div class="section"><h3>De tu historial</h3><div class="card list">${items.map(x => `<div class="it" style="cursor:default"><div class="grow"><b>${esc(x.t)}</b><div class="small muted num">${x.s}</div></div><button class="btn sm" ${x.rep}>Repetir</button><button class="btn sm ghost" ${x.save} aria-label="Guardar como rutina">★</button></div>`).join('')}</div>
    <p class="tiny muted">★ guarda ese entrenamiento como rutina tuya para elegirlo cuando quieras.</p></div>`;
}
App.acts.rutGoCardio = el => { S.ov = null; S.tab = 'cardio'; S.cardio = el.dataset.arg; ls.set('bl_tab','cardio'); App.renderOverlay(); App.render(); };
App.acts.rutStartPlan = el => { S.ov = null; App.acts.startPlanDay(el); };

// ---------- usar una rutina ----------
function workoutFromItems(p, name, items, extra){
  if (getActive(p.id)) { toast('Ya hay un entrenamiento en curso. Terminalo o descartalo primero.'); S.ov = null; App.acts.resumeWorkout(); return; }
  const deload = !!(p.deloadUntil && new Date(p.deloadUntil) > new Date());
  const w = Object.assign({id: uid(), pid: p.id, date: new Date().toISOString(), name, planKind: 'rutina', goal: p.goal || 'hipertrofia', deload,
    exercises: items.filter(it => EX[it.ex]).map(it => buildExEntry(p, it, deload))}, extra || {});
  startW(w);
}
function startYogaSteps(name, id, steps){
  const seq = {id, name, steps: steps.filter(st => yogaPose(st.p))};
  if (!seq.steps.length) { toast('La rutina no tiene posturas'); return; }
  const flat = seqFlat(seq);
  S.ov = {type:'yoga', seq, steps: flat, i: 0, left: flat[0].s, paused: true, started: Date.now(), elapsed: 0};
  App.renderOverlay();
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => S.wakeLock = l).catch(() => {}); } catch(e){}
}
App.acts.rutUse = el => {
  const r = Store.get('routines', el.dataset.arg), p = curProfile(); if (!r) return;
  Store.put('routines', {...r, lastUsed: new Date().toISOString()});
  if (r.kind === 'lift') { workoutFromItems(p, r.name, r.items || [], {routineId: r.id}); return; }
  if (r.kind === 'yoga') { startYogaSteps(r.name, r.id, r.steps || []); return; }
  S.ov = null; App.renderOverlay();
  if (r.kind === 'class') { App.openSheet('classLog', {f: classForm({ctype: r.ctype || 'otra', title: r.ctype === 'otra' ? (r.title || r.name) : '', min: r.min || 50, notes: r.notes || ''})}); return; }
  App.openSheet('act', {f: {id: null, sport: r.kind, date: todayISO(), type: r.type || 'suave', distKm: r.distKm || '', dur: r.durMin ? L.durStr(r.durMin * 60) : '', hr: '', rpe: '', elev: '', notes: r.notes || '', power: ''}});
};

// ---------- crear y editar ----------
const newRoutine = (kind, p) => ({id: null, pid: p.id, kind, name: '', items: kind === 'lift' ? [] : undefined, steps: kind === 'yoga' ? [] : undefined, style: kind === 'yoga' ? 'hatha' : undefined,
  type: kind === 'run' || kind === 'ride' ? 'suave' : undefined, ctype: kind === 'class' ? 'funcional' : undefined, min: kind === 'class' ? 50 : undefined, notes: ''});
App.acts.rutNew = el => { const p = curProfile(); const tab = el.dataset.arg; App.openSheet('rtEdit', {r: newRoutine(tab === 'cardio' ? 'run' : tab, p)}); };
App.acts.rutEdit = el => { const r = Store.get('routines', el.dataset.arg); App.openSheet('rtEdit', {r: JSON.parse(JSON.stringify(r))}); };
App.views.sh_rtEdit = (p, sh) => {
  const r = sh.r;
  const title = r.id ? 'Editar rutina' : 'Nueva rutina';
  let body = '';
  if (r.kind === 'lift') body = `
    ${(r.items||[]).length ? '' : '<p class="small muted">Agregá ejercicios de la biblioteca. Para cada uno elegís series, repeticiones, RIR y descanso. Al entrenar, la app te sugiere el peso con la misma doble progresión de siempre.</p>'}
    ${(r.items||[]).map((it, j) => { const ex = EX[it.ex]; const [a] = nm(ex); return `<div class="card flat stack-s">
      <div class="row between"><b class="grow">${esc(a)}</b>
        <button class="btn sm ghost" data-act="rtMove" data-arg="${j}" data-d="-1" aria-label="Subir">↑</button><button class="btn sm ghost" data-act="rtMove" data-arg="${j}" data-d="1" aria-label="Bajar">↓</button>
        <button class="btn sm ghost" data-act="rtSwap" data-arg="${j}">Cambiar</button><button class="btn sm ghost danger" data-act="rtDel" data-arg="${j}" aria-label="Quitar">✕</button></div>
      <div class="grid3">${[['sets','Series'],['lo','Reps mín.'],['hi','Reps máx.'],['rir','RIR'],['rest','Descanso (s)'],['warm','Aproximación']].map(([k,l]) => `<div class="field"><label for="rt_${k}${j}">${l}</label><input id="rt_${k}${j}" type="number" inputmode="numeric" value="${it[k] != null ? it[k] : ''}" data-bind="rtF" data-j="${j}" data-k="${k}"></div>`).join('')}</div></div>`; }).join('')}
    <button class="btn" data-act="pickEx" data-arg="rtAdd">+ Agregar ejercicio</button>`;
  if (r.kind === 'run' || r.kind === 'ride') { const types = r.kind === 'run' ? L.RUN_TYPES : L.RIDE_TYPES; body = `
    <div class="seg" role="group" aria-label="Deporte"><button data-act="rtSet" data-k="kind" data-v="run" aria-pressed="${r.kind==='run'}">Running</button><button data-act="rtSet" data-k="kind" data-v="ride" aria-pressed="${r.kind==='ride'}">Ciclismo</button></div>
    <div class="field"><label>Tipo</label><div class="chips">${Object.entries(types).map(([k,v]) => `<button class="chip" data-act="rtSet" data-k="type" data-v="${k}" aria-pressed="${r.type===k}">${esc(v)}</button>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label for="rt_km">Distancia (km)</label><input id="rt_km" type="text" inputmode="decimal" value="${esc(r.distKm || '')}" data-bind="rtV" data-k="distKm"></div>
    <div class="field"><label for="rt_min">Duración (min)</label><input id="rt_min" type="number" inputmode="numeric" value="${esc(r.durMin || '')}" data-bind="rtV" data-k="durMin"></div></div>
    <div class="field"><label for="rt_no">Cómo es (calentamiento, series, ritmos)</label><textarea id="rt_no" placeholder="Ej.: 10′ suave + 6 × 400 m a ritmo 5K con 90″ trote + 10′ suave" data-bind="rtV" data-k="notes">${esc(r.notes || '')}</textarea></div>
    <p class="tiny muted">Grabá la salida con Strava o tu reloj y registrala acá: la rutina te deja todo precargado.</p>`; }
  if (r.kind === 'yoga') body = `
    <div class="field"><label>Estilo</label><div class="chips">${Object.entries(YSTYLES).map(([k,v]) => `<button class="chip" data-act="rtSet" data-k="style" data-v="${k}" aria-pressed="${r.style===k}">${esc(v)}</button>`).join('')}</div></div>
    ${(r.steps||[]).map((st, j) => { const ps = yogaPose(st.p); return `<div class="card flat row" style="gap:8px"><div class="grow"><b>${esc(ps ? ps.es : st.p)}</b><div class="tiny muted">${ps && ps.sides ? 'Por lado · ' : ''}${st.s} s</div></div>
      <button class="btn sm ghost" data-act="rtSec" data-arg="${j}" data-d="-15" aria-label="Menos tiempo">−15″</button><button class="btn sm ghost" data-act="rtSec" data-arg="${j}" data-d="15" aria-label="Más tiempo">+15″</button>
      <button class="btn sm ghost" data-act="rtMove" data-arg="${j}" data-d="-1" aria-label="Subir">↑</button><button class="btn sm ghost danger" data-act="rtDel" data-arg="${j}" aria-label="Quitar">✕</button></div>`; }).join('')}
    <button class="btn" data-act="rtPickPose">+ Agregar postura</button>
    ${(r.steps||[]).length ? `<p class="small muted">Duración total: <b>${rutSummary(r).split(' · ')[1]}</b></p>` : ''}`;
  if (r.kind === 'class') { const types = classTypes(p); body = `
    <div class="field"><label>Tipo de clase</label><div class="chips">${Object.entries(types).map(([k,v]) => `<button class="chip" data-act="rtSet" data-k="ctype" data-v="${k}" aria-pressed="${r.ctype===k}">${esc(v)}</button>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label for="rt_cm">Minutos habituales</label><input id="rt_cm" type="number" inputmode="numeric" value="${esc(r.min || '')}" data-bind="rtV" data-k="min"></div></div>
    <div class="field"><label for="rt_cn">Notas (día, horario, profe, qué se hace)</label><textarea id="rt_cn" placeholder="Ej.: martes y jueves 19 h con Laura" data-bind="rtV" data-k="notes">${esc(r.notes || '')}</textarea></div>`; }
  return `<div class="row between"><h2>${title}</h2><button class="btn sm primary" data-act="rtSave">Guardar</button></div>
  <div class="field"><label for="rt_name">Nombre</label><input id="rt_name" type="text" placeholder="${r.kind === 'lift' ? 'Ej.: Torso express 40 min' : r.kind === 'yoga' ? 'Ej.: Movilidad mañana' : r.kind === 'class' ? 'Ej.: Funcional martes' : 'Ej.: Fondo suave 8 km'}" value="${esc(r.name || '')}" data-bind="rtV" data-k="name"></div>
  ${body}
  ${r.id ? (sh.confirmDel ? `<button class="btn danger" data-act="rtRemove">Confirmar: borrar rutina</button>` : `<button class="btn ghost danger" data-act="rtAskDel">Borrar rutina</button>`) : ''}
  <button class="btn ghost" data-act="closeSheet">Cancelar</button>`;
};
App.binds.rtV = el => { S.sheet.r[el.dataset.k] = el.value; };
App.binds.rtF = el => { S.sheet.r.items[+el.dataset.j][el.dataset.k] = el.value === '' ? '' : +el.value; };
App.acts.rtSet = el => { const r = S.sheet.r; let v = el.dataset.v; if (/^\d+$/.test(v)) v = +v; r[el.dataset.k] = v; if (el.dataset.k === 'kind') r.type = 'suave'; App.renderOverlay(); };
App.acts.rtMove = el => { const r = S.sheet.r; const a = r.kind === 'yoga' ? r.steps : r.items; const j = +el.dataset.arg, k = j + +el.dataset.d; if (k < 0 || k >= a.length) return; [a[j], a[k]] = [a[k], a[j]]; App.renderOverlay(); };
App.acts.rtDel = el => { const r = S.sheet.r; (r.kind === 'yoga' ? r.steps : r.items).splice(+el.dataset.arg, 1); App.renderOverlay(); };
App.acts.rtSec = el => { const st = S.sheet.r.steps[+el.dataset.arg]; st.s = Math.max(15, Math.min(600, st.s + +el.dataset.d)); App.renderOverlay(); };
App.acts.rtSwap = el => { const sh = S.sheet; sh.swapJ = +el.dataset.arg; sh.back = 'rtEdit'; sh.pickFor = 'rtSwap'; sh.type = 'pick'; sh.pickQ = ''; App.renderOverlay(); };
App.acts.rtAskDel = () => { S.sheet.confirmDel = true; App.renderOverlay(); };
App.acts.rtRemove = async () => { await Store.del('routines', S.sheet.r.id); App.closeSheet(); App.renderOverlay(); toast('Rutina borrada'); };
App.acts.rtSave = async () => {
  const r = S.sheet.r, p = curProfile();
  const name = (r.name || '').trim();
  if (!name) { toast('Ponele un nombre a la rutina'); const i = $('#rt_name'); if (i) i.focus(); return; }
  if (r.kind === 'lift' && !(r.items||[]).length) { toast('Agregá al menos un ejercicio'); return; }
  if (r.kind === 'yoga' && !(r.steps||[]).length) { toast('Agregá al menos una postura'); return; }
  const out = {...r, name, pid: p.id, id: r.id || uid(), createdAt: r.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString()};
  if (out.kind === 'lift') out.items = out.items.map(it => ({...it, sets: Math.max(1, +it.sets || 3), lo: +it.lo || 8, hi: Math.max(+it.hi || 12, +it.lo || 8), rir: it.rir === '' || it.rir == null ? 2 : +it.rir, rest: +it.rest || 90, warm: +it.warm || 0}));
  if (out.kind === 'run' || out.kind === 'ride') { out.distKm = num(out.distKm) || null; out.durMin = +out.durMin || null; }
  if (out.kind === 'class') { out.min = +out.min || null; out.title = classTypes(p)[out.ctype]; }
  Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
  await Store.put('routines', out);
  S.rutK = rutTab(out.kind); App.closeSheet(); if (!S.ov) App.setOv({type:'rut'}); else App.renderOverlay();
  toast('Rutina guardada');
};

// selector de ejercicios: se reutiliza el de la app
const _pickDo = App.acts.pickDo;
App.acts.pickDo = el => {
  const sh = S.sheet;
  if (sh && (sh.pickFor === 'rtAdd' || sh.pickFor === 'rtSwap')) {
    const id = el.dataset.arg, p = curProfile();
    const goal = (p.plan && p.plan.goal) || p.goal || 'hipertrofia', level = p.level || 'beg';
    if (sh.pickFor === 'rtAdd') sh.r.items.push({ex: id, role: 'A', ...L.prescribe(goal, 'A', level, EX[id]), warm: 0});
    else sh.r.items[sh.swapJ].ex = id;
    sh.type = 'rtEdit'; App.renderOverlay(); return;
  }
  return _pickDo(el);
};
// selector de posturas para rutinas de yoga
App.acts.rtPickPose = () => { S.sheet.type = 'rtPose'; App.renderOverlay(); };
App.views.sh_rtPose = (p, sh) => `<div class="row"><button class="iconbtn" data-act="rtPoseBack" aria-label="Volver">${ICON.back}</button><h2 class="grow">Elegí una postura</h2></div>
  <div class="list">${YOGA.poses.map(ps => `<div class="it" data-act="rtPoseDo" data-arg="${ps.id}">${typeof YFIG !== 'undefined' ? YFIG.thumb(ps.id) : ''}<div class="grow"><div class="exname">${esc(ps.es)}</div><div class="exalt">${esc(ps.en)} · ${esc(ps.sa)}${ps.sides ? ' · por lado' : ''}</div></div></div>`).join('')}</div>`;
App.acts.rtPoseBack = () => { S.sheet.type = 'rtEdit'; App.renderOverlay(); };
App.acts.rtPoseDo = el => { const sh = S.sheet; const sec = sh.r.style === 'yin' || sh.r.style === 'restaurativo' ? 180 : 45; sh.r.steps.push({p: el.dataset.arg, s: sec}); sh.type = 'rtEdit'; App.renderOverlay(); };

// ---------- copiar de la app y del historial ----------
async function saveAndEdit(r){ const p = curProfile(); const out = {...r, id: uid(), pid: p.id, createdAt: new Date().toISOString()}; await Store.put('routines', out); App.openSheet('rtEdit', {r: JSON.parse(JSON.stringify(out))}); toast('Guardada en Mis rutinas: podés ajustarla'); }
App.acts.rutCopyPlan = el => { const p = curProfile(); const d = p[el.dataset.kind].days[+el.dataset.arg]; saveAndEdit({kind:'lift', name: d.name, items: JSON.parse(JSON.stringify(d.items))}); };
App.acts.rutCopySeq = el => { const s = YOGA.seqs.find(x => x.id === el.dataset.arg); saveAndEdit({kind:'yoga', name: s.name, style: s.style || 'hatha', steps: s.steps.map(st => ({p: st.p, s: st.s}))}); };
function itemsFromWorkout(w){
  const p = curProfile(); const goal = w.goal || p.goal || 'hipertrofia', level = p.level || 'beg';
  return (w.exercises || []).filter(e => EX[e.ex]).map(e => { const base = L.prescribe(goal, e.role || 'A', level, EX[e.ex]); const n = e.sets.filter(s => s.t !== 'w').length;
    return {ex: e.ex, role: e.role || 'A', sets: n || base.sets, lo: e.lo || base.lo, hi: e.hi || base.hi, rir: e.rir != null ? e.rir : base.rir, rest: base.rest, warm: e.sets.filter(s => s.t === 'w').length}; });
}
App.acts.rutFromW = el => { const w = Store.get('workouts', el.dataset.arg); saveAndEdit({kind:'lift', name: w.name, items: itemsFromWorkout(w)}); };
App.acts.rutRepeatW = el => { const w = Store.get('workouts', el.dataset.arg); App.closeSheet(); workoutFromItems(curProfile(), w.name, itemsFromWorkout(w)); };
App.acts.rutFromAct = el => {
  const a = Store.get('activities', el.dataset.arg); if (!a) return;
  if (a.sport === 'class') return saveAndEdit({kind:'class', name: classLabel(a), ctype: a.ctype || 'otra', title: a.title, min: Math.round((a.durSec||0)/60), notes: a.notes || ''});
  if (a.sport === 'yoga') {
    const src = (YOGA.seqs.find(s => s.id === a.seq)) || Store.get('routines', a.seq);
    if (!src) { toast('Esta práctica no tiene secuencia guardada'); return; }
    return saveAndEdit({kind:'yoga', name: src.name, style: src.style || 'hatha', steps: src.steps.map(st => ({p: st.p, s: st.s}))});
  }
  saveAndEdit({kind: a.sport, name: (SP[a.sport].types()[a.type] || SP[a.sport].label) + (a.distKm ? ' ' + fmtNum(a.distKm, 1) + ' km' : ''), type: a.type || 'suave', distKm: a.distKm || null, durMin: a.durSec ? Math.round(a.durSec / 60) : null, notes: a.notes || ''});
};
App.acts.rutRepeatA = el => {
  const a = Store.get('activities', el.dataset.arg); if (!a) return;
  if (a.sport === 'yoga') { const src = (YOGA.seqs.find(s => s.id === a.seq)) || Store.get('routines', a.seq); if (!src) { toast('Esta práctica no tiene secuencia guardada'); return; } App.closeSheet(); startYogaSteps(src.name, src.id, src.steps); return; }
  S.ov = null; App.renderOverlay();
  App.openSheet('act', {f: {id: null, sport: a.sport, date: todayISO(), type: a.type || 'suave', distKm: a.distKm || '', dur: a.durSec ? L.durStr(a.durSec) : '', hr: '', rpe: '', elev: '', notes: a.notes || '', power: ''}});
};

// ---------- botones en las pantallas existentes ----------
const _wDetail = App.views.sh_workoutDetail;
App.views.sh_workoutDetail = (p, sh) => {
  const html = _wDetail(p, sh); const w = Store.get('workouts', sh.id); if (!w) return html;
  const btns = `<div class="row"><button class="btn grow" data-act="rutRepeatW" data-arg="${w.id}">Repetir</button><button class="btn grow" data-act="rutFromW" data-arg="${w.id}">Guardar como rutina</button></div>`;
  const i = html.lastIndexOf('<div class="row"><button class="btn grow" data-act="sheet" data-arg="workoutDetail"'), j = html.lastIndexOf('<button class="btn danger" data-act="askDelW"');
  const at = Math.max(i, j); return at > 0 ? html.slice(0, at) + btns + html.slice(at) : html + btns;
};
const _actDetail2 = App.views.sh_actDetail;
App.views.sh_actDetail = (p, sh) => {
  const html = _actDetail2(p, sh); const a = Store.get('activities', sh.id);
  if (!a || a.sport === 'class') return html;
  if (a.sport === 'yoga' && !a.seq) return html;
  const btns = `<div class="row"><button class="btn grow" data-act="rutRepeatA" data-arg="${a.id}">${a.sport === 'yoga' ? 'Repetir secuencia' : 'Repetir'}</button><button class="btn grow" data-act="rutFromAct" data-arg="${a.id}">Guardar como rutina</button></div>`;
  return html + btns;
};
const _homeView = App.views.home;
App.views.home = (p) => {
  const html = _homeView(p);
  const mark = '<div class="section"><div class="row between"><h3>Para leer</h3>';
  const n = Store.list('routines', p.id).length;
  const card = `<div class="section"><div class="row between"><h3>Mis rutinas</h3><button class="btn ghost sm" data-act="openRut" data-arg="lift">Ver todas</button></div>
    <div class="card stack-s"><p class="small muted">${n ? `Tenés ${n} rutina${n > 1 ? 's' : ''} guardada${n > 1 ? 's' : ''}.` : 'Armá tus propias rutinas de fuerza, cardio, yoga o clases, o guardá un entrenamiento de tu historial.'}</p>
    <div class="chips">${RUT_TABS.map(([k,l]) => `<button class="chip" data-act="openRut" data-arg="${k}">${l} · ${Store.list('routines', p.id).filter(r => rutTab(r.kind) === k).length}</button>`).join('')}</div></div></div>`;
  return html.includes(mark) ? html.replace(mark, card + mark) : html;
};
const addRutButton = (view, tab) => { const base = App.views[view]; App.views[view] = (p) => { const html = base(p); const t = typeof tab === 'function' ? tab() : tab; if (!t) return html; return html.replace('<div class="stack">', '<div class="stack">' + rutBtn(t)); }; };
addRutButton('lift', 'lift');
addRutButton('cardio', () => S.cardio === 'class' ? null : 'cardio');
addRutButton('yoga', 'yoga');
