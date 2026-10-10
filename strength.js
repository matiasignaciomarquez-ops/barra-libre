// Pestaña Fuerza: plan, calistenia, biblioteca, detalle de ejercicio, editor de rutinas.
'use strict';

App.views.lift = (p) => {
  const seg = `<div class="seg" role="group" aria-label="Sección">${[['plan','Mi plan'],['calis','Calistenia'],['lib','Biblioteca']].map(([k,l]) => `<button data-act="seg" data-key="fz" data-arg="${k}" aria-pressed="${S.fz===k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (S.fz === 'plan') body = planView(p, p.plan, 'plan');
  else if (S.fz === 'calis') body = (p.equip === 'bw') ? `<div class="banner info small">Tu plan principal ya es de calistenia: lo ves en “Mi plan”.</div>` + (p.calisPlan ? planView(p, p.calisPlan, 'calisPlan') : '') : (p.calisPlan ? planView(p, p.calisPlan, 'calisPlan') : calisSetup(p));
  else body = libraryView(p);
  return `<div class="stack">${seg}${body}</div>`;
};

function planView(p, plan, key){
  if (!plan) return `<div class="empty">No hay plan todavía.<button class="btn primary" data-act="redoQuiz">Hacer el cuestionario</button></div>`;
  const vol = L.weeklyVolume(EX, plan);
  const vt = L.VOL_TARGET[plan.level || 'beg'];
  const big = ['pecho','espalda','hombros','cuádriceps','isquios','glúteos','bíceps','tríceps','gemelos'];
  const maxV = Math.max(vt[1] + 4, ...big.map(m => vol[m] || 0));
  const ni = nextPlanDay(p, plan);
  const deloadOn = p.deloadUntil && new Date(p.deloadUntil) > new Date();
  return `
  <div class="card stack-s">
    <div class="row between"><span class="pill ${plan.kind==='calis'?'calis':'lift'}">${esc(plan.split)}</span><span class="small muted">${esc(L.LEVEL_LABEL[plan.level]||'')}</span></div>
    <h2>${esc((L.GOALS[plan.goal]||{}).label||'')}</h2>
    <details><summary>Por qué este plan</summary><div class="why" style="margin-top:10px">${(plan.why||[]).map(w => `<div><b>${esc(w.t)}</b><p class="small">${esc(w.b)}</p><p class="ref">${w.r.map(r => esc(REFS[r])).join(' · ')}</p></div>`).join('')}</div></details>
  </div>
  ${deloadOn ? `<div class="banner small"><div>Semana de descarga hasta el ${fmtDate(p.deloadUntil)}: las sugerencias usan la mitad de series.</div></div>` : ''}
  <div class="stack">${plan.days.map((d, i) => `
    <div class="card stack-s">
      <div class="row between"><div><span class="label">Día ${i+1}${i===ni?' · sigue':''}</span><h3>${esc(d.name)}</h3></div>
        <div class="row"><button class="btn sm" data-act="editDay" data-key="${key}" data-arg="${i}">Editar</button><button class="btn sm primary" data-act="startPlanDay" data-kind="${key}" data-arg="${i}">Empezar</button></div></div>
      <div class="list">${d.items.map(it => { const ex = EX[it.ex]; if (!ex) return ''; const [a,b] = nm(ex); return `
        <div class="it" data-act="exInfo" data-arg="${ex.id}">${animHTML(ex.img, 'thumb', a)}
          <div class="grow"><div class="exname">${esc(a)}</div><div class="exalt">${esc(b)}</div>
          <div class="small muted num">${it.warm?it.warm+' aprox. + ':''}${it.sets} × ${it.lo}–${it.hi}${ex.u==='sec'?' s':''} · RIR ${it.rir} · ${fmtNum(it.rest/60, it.rest%60?1:0)} min</div></div>
          <span class="pill">${{M:'Principal',S:'Secundario',A:'Accesorio'}[it.role]||''}</span></div>`; }).join('')}</div>
    </div>`).join('')}</div>
  <div class="card stack-s"><h3>Series por músculo por semana</h3>
    <p class="small muted">Franja verde: rango orientativo para tu nivel (${vt[0]}–${vt[1]} series). Músculos secundarios cuentan media serie.</p>
    <div class="vol">${big.map(m => { const v = vol[m]||0; return `<span>${esc(m[0].toUpperCase()+m.slice(1))}</span><div class="track"><div class="band" style="left:${vt[0]/maxV*100}%;width:${(vt[1]-vt[0])/maxV*100}%"></div><div class="fill" style="width:${Math.min(100, v/maxV*100)}%"></div></div><b class="num small">${fmtNum(v,v%1?1:0)}</b>`; }).join('')}</div>
  </div>
  <div class="row"><button class="btn grow" data-act="emptyWorkout">Entrenamiento libre</button>${key==='plan'?`<button class="btn grow" data-act="redoQuiz">Rehacer plan</button>`:`<button class="btn grow danger" data-act="delCalis">Quitar plan de calistenia</button>`}</div>`;
}

function calisSetup(p){
  const c = S.cs || (S.cs = {days: 2, maxPush: p.maxPush || '', maxPull: p.maxPull || ''});
  return `<div class="card stack">
    <h2>Plan de calistenia</h2><p class="small muted">Rutinas con tu peso corporal que progresan por escalones: cuando completás el rango alto, pasás a la variante más difícil. Podés combinarlas con tu plan de pesas.</p>
    <div class="field"><label>Días por semana</label><div class="chips">${[2,3,4,5].map(n => `<button class="chip" data-act="csDays" data-arg="${n}" aria-pressed="${c.days===n}">${n} días</button>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label for="cs_p">Flexiones seguidas</label><input id="cs_p" type="number" inputmode="numeric" data-bind="cs" data-k="maxPush" value="${esc(c.maxPush)}"></div>
    <div class="field"><label for="cs_u">Dominadas seguidas</label><input id="cs_u" type="number" inputmode="numeric" data-bind="cs" data-k="maxPull" value="${esc(c.maxPull)}"></div></div>
    <button class="btn primary" data-act="makeCalis">Generar plan de calistenia</button></div>
    <div class="card flat stack-s"><b>Escalones de progresión</b>${Object.entries({push:'Empuje',pull:'Tirón',legs:'Piernas',core:'Core'}).map(([k,l]) => `<p class="small"><b>${l}:</b> ${L.LADDERS[k].map(id => esc(nm(EX[id])[0])).join(' → ')}</p>`).join('')}</div>`;
}
App.acts.csDays = el => { S.cs.days = +el.dataset.arg; App.render(); };
App.binds.cs = el => { S.cs[el.dataset.k] = el.value; };
App.acts.makeCalis = () => { const p = curProfile(); const plan = L.buildCalisPlan(EX, {...p, calisDays: S.cs.days, maxPush: S.cs.maxPush, maxPull: S.cs.maxPull}); Store.put('profiles', {...p, calisPlan: plan}); S.cs = null; App.render(); toast('Plan de calistenia listo'); };
App.acts.delCalis = () => { const p = curProfile(); Store.put('profiles', {...p, calisPlan: null}); App.render(); };

// ---------- biblioteca ----------
const MUSCLES = ['pecho','espalda','hombros','bíceps','tríceps','cuádriceps','isquios','glúteos','gemelos','core'];
function libraryView(p){
  const q = S.libQ.trim().toLowerCase();
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  const list = Object.values(EX).filter(e => (!S.libM || e.m.includes(S.libM) || (S.libM==='calis' && e.cat==='calis')) && (!q || norm(e.es).includes(norm(q)) || norm(e.en).includes(norm(q)))).sort((a,b) => nm(a)[0].localeCompare(nm(b)[0]));
  return `<div class="field"><label for="libq" class="label">Buscar en español o inglés</label><input id="libq" type="search" placeholder="sentadilla, bench press…" value="${esc(S.libQ)}" data-bind="libq"></div>
  <div class="chips"><button class="chip" data-act="libM" data-arg="" aria-pressed="${!S.libM}">Todos</button><button class="chip" data-act="libM" data-arg="calis" aria-pressed="${S.libM==='calis'}">Calistenia</button>${MUSCLES.map(m => `<button class="chip" data-act="libM" data-arg="${m}" aria-pressed="${S.libM===m}">${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>
  <div class="card list" id="liblist">${list.map(e => { const [a,b] = nm(e); return `<div class="it" data-act="exInfo" data-arg="${e.id}">${animHTML(e.img,'thumb',a)}<div class="grow"><div class="exname">${esc(a)}</div><div class="exalt">${esc(b)}</div><div class="tiny muted">${e.m.join(', ')}</div></div></div>`; }).join('') || '<p class="muted small">Sin resultados.</p>'}</div>`;
}
let libT;
App.binds.libq = el => { S.libQ = el.value; clearTimeout(libT); libT = setTimeout(() => { App.render(); const i = $('#libq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
App.acts.libM = el => { S.libM = el.dataset.arg; App.render(); };

// ---------- detalle de ejercicio ----------
App.acts.exInfo = el => App.openSheet('ex', {id: el.dataset.arg});
App.views.sh_ex = (p, sh) => {
  const ex = EX[sh.id]; const [a,b] = nm(ex);
  const hist = p ? exHistory(p.id, ex.id) : [];
  const eq = {barbell:'Barra',dumbbell:'Mancuernas',machine:'Máquina',cable:'Polea',bodyweight:'Peso corporal',bands:'Banda elástica',kettlebell:'Pesa rusa'}[ex.eq];
  const nx = L.nextProgression(ex.id), pv = L.prevProgression(ex.id);
  if (hist.length > 1) chartLater('exch', () => exChartCfg(hist));
  return `${animHTML(ex.img, '', a)}
  <div><h2>${esc(a)}</h2><p class="exalt" style="font-size:15px">${esc(b)}</p></div>
  <div class="chips"><span class="pill">${esc(eq)}</span>${ex.m.map(m => `<span class="pill lift">${esc(m)}</span>`).join('')}${ex.m2.map(m => `<span class="pill">${esc(m)}</span>`).join('')}</div>
  <div class="stack-s"><span class="label">Técnica</span>${ex.cues.map(c => `<p class="small">• ${esc(c)}</p>`).join('')}</div>
  ${pv||nx ? `<p class="small muted">${pv?`Más fácil: <b>${esc(nm(EX[pv])[0])}</b>`:''}${pv&&nx?' · ':''}${nx?`Más difícil: <b>${esc(nm(EX[nx])[0])}</b>`:''}</p>` : ''}
  ${hist.length ? `<div class="stack-s"><span class="label">Tu progreso (1RM estimado)</span>${hist.length>1?'<div class="chartbox"><canvas id="exch"></canvas></div>':''}
    <div class="list">${hist.slice(0,5).map(h => `<div class="it" style="cursor:default"><span class="small muted" style="min-width:76px">${fmtDate(h.date,{day:'numeric',month:'short'})}</span><span class="small num">${h.sets.filter(s=>s.t!=='w').map(s => `${s.kg?L.fmtKg(s.kg)+'×':''}${s.reps}`).join(' · ')}</span></div>`).join('')}</div></div>` : ''}
  <details><summary>Instructions (English)</summary><ol class="small" style="padding-left:18px;margin:8px 0 0">${ex.ins.map(i => `<li>${esc(i)}</li>`).join('')}</ol></details>`;
};
function exChartCfg(hist){
  const pts = hist.slice().reverse().map(h => ({x: fmtDate(h.date,{day:'numeric',month:'short'}), y: Math.round(bestE1rm(h.sets) * 10) / 10 || Math.max(...h.sets.map(s => s.reps))}));
  const c = cssv('--accent');
  return {type:'line', data:{labels: pts.map(p=>p.x), datasets:[{data: pts.map(p=>p.y), borderColor:c, backgroundColor: c + '22', fill:true, tension:.3, pointRadius:3, pointBackgroundColor:c}]}, options: baseOpts({scales:{x:{grid:{display:false}}, y:{beginAtZero:false, ticks:{maxTicksLimit:4}}}})};
}

// ---------- editor de día ----------
App.acts.editDay = el => { const p = curProfile(); const plan = JSON.parse(JSON.stringify(p[el.dataset.key])); App.openSheet('editDay', {key: el.dataset.key, i: +el.dataset.arg, plan}); };
App.views.sh_editDay = (p, sh) => {
  const d = sh.plan.days[sh.i];
  return `<div class="row between"><h2>Editar día</h2><button class="btn sm primary" data-act="saveDay">Guardar</button></div>
  <div class="field"><label for="ed_name">Nombre</label><input id="ed_name" type="text" value="${esc(d.name)}" data-bind="edName"></div>
  ${d.items.map((it, j) => { const ex = EX[it.ex]; const [a] = nm(ex); return `<div class="card flat stack-s">
    <div class="row between"><b class="grow">${esc(a)}</b>
      <button class="btn sm ghost" data-act="edMove" data-arg="${j}" data-d="-1" aria-label="Subir">↑</button><button class="btn sm ghost" data-act="edMove" data-arg="${j}" data-d="1" aria-label="Bajar">↓</button>
      <button class="btn sm ghost" data-act="edSwap" data-arg="${j}">Cambiar</button><button class="btn sm ghost danger" data-act="edDel" data-arg="${j}" aria-label="Quitar">✕</button></div>
    <div class="grid3"><div class="field"><label for="ed_s${j}">Series</label><input id="ed_s${j}" type="number" inputmode="numeric" value="${it.sets}" data-bind="edF" data-j="${j}" data-k="sets"></div>
    <div class="field"><label for="ed_l${j}">Reps mín.</label><input id="ed_l${j}" type="number" inputmode="numeric" value="${it.lo}" data-bind="edF" data-j="${j}" data-k="lo"></div>
    <div class="field"><label for="ed_h${j}">Reps máx.</label><input id="ed_h${j}" type="number" inputmode="numeric" value="${it.hi}" data-bind="edF" data-j="${j}" data-k="hi"></div>
    <div class="field"><label for="ed_r${j}">RIR</label><input id="ed_r${j}" type="number" inputmode="numeric" value="${it.rir}" data-bind="edF" data-j="${j}" data-k="rir"></div>
    <div class="field"><label for="ed_d${j}">Descanso (s)</label><input id="ed_d${j}" type="number" inputmode="numeric" value="${it.rest}" data-bind="edF" data-j="${j}" data-k="rest"></div>
    <div class="field"><label for="ed_w${j}">Aproximación</label><input id="ed_w${j}" type="number" inputmode="numeric" value="${it.warm||0}" data-bind="edF" data-j="${j}" data-k="warm"></div></div></div>`; }).join('')}
  <button class="btn" data-act="pickEx" data-arg="edAdd">Agregar ejercicio</button>
  <button class="btn ghost" data-act="closeSheet">Cancelar</button>`;
};
App.binds.edName = el => { S.sheet.plan.days[S.sheet.i].name = el.value; };
App.binds.edF = el => { S.sheet.plan.days[S.sheet.i].items[+el.dataset.j][el.dataset.k] = +el.value || 0; };
App.acts.edMove = el => { const a = S.sheet.plan.days[S.sheet.i].items, j = +el.dataset.arg, k = j + +el.dataset.d; if (k < 0 || k >= a.length) return; [a[j], a[k]] = [a[k], a[j]]; App.renderOverlay(); };
App.acts.edDel = el => { S.sheet.plan.days[S.sheet.i].items.splice(+el.dataset.arg, 1); App.renderOverlay(); };
App.acts.edSwap = el => { S.sheet.swapJ = +el.dataset.arg; S.sheet.back = 'editDay'; S.sheet.pickFor = 'edSwap'; S.sheet.type = 'pick'; S.sheet.pickQ = ''; App.renderOverlay(); };
App.acts.saveDay = () => { const p = curProfile(); const sh = S.sheet; const plan = sh.plan; Store.put('profiles', {...p, [sh.key]: plan}); App.closeSheet(); App.render(); toast('Rutina guardada'); };

// ---------- selector de ejercicios (reutilizable) ----------
App.acts.pickEx = el => { S.sheet.back = S.sheet.type; S.sheet.pickFor = el.dataset.arg; S.sheet.type = 'pick'; S.sheet.pickQ = ''; App.renderOverlay(); };
App.views.sh_pick = (p, sh) => {
  const q = (sh.pickQ||'').toLowerCase();
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
  let base = Object.values(EX);
  let alts = [];
  if (sh.pickFor === 'edSwap') { const cur = sh.plan.days[sh.i].items[sh.swapJ].ex; alts = L.alternatives(EX, cur); }
  if (sh.pickFor === 'wSwap') { alts = L.alternatives(EX, S.ov.w.exercises[sh.swapJ].ex); }
  const list = base.filter(e => !q || norm(e.es).includes(norm(q)) || norm(e.en).includes(norm(q))).sort((a,b) => (alts.includes(b.id) - alts.includes(a.id)) || nm(a)[0].localeCompare(nm(b)[0]));
  return `<div class="row"><button class="iconbtn" data-act="pickBack" aria-label="Volver">${ICON.back}</button><h2 class="grow">Elegí un ejercicio</h2></div>
  <input type="search" id="pickq" placeholder="Buscar…" value="${esc(sh.pickQ||'')}" data-bind="pickq">
  ${alts.length && !q ? '<span class="label">Alternativas que trabajan lo mismo, primero</span>' : ''}
  <div class="list">${list.slice(0, 120).map(e => { const [a,b] = nm(e); return `<div class="it" data-act="pickDo" data-arg="${e.id}">${animHTML(e.img,'thumb',a)}<div class="grow"><div class="exname">${esc(a)}</div><div class="exalt">${esc(b)}</div></div>${alts.includes(e.id)?'<span class="pill ok">Similar</span>':''}</div>`; }).join('')}</div>`;
};
let pickT;
App.binds.pickq = el => { S.sheet.pickQ = el.value; clearTimeout(pickT); pickT = setTimeout(() => { App.renderOverlay(); const i = $('#pickq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
App.acts.pickBack = () => { S.sheet.type = S.sheet.back; App.renderOverlay(); if (!S.sheet.type) App.closeSheet(); };
App.acts.pickDo = el => {
  const id = el.dataset.arg, sh = S.sheet, p = curProfile();
  const goal = (p.plan && p.plan.goal) || p.goal || 'hipertrofia', level = p.level || 'beg';
  if (sh.pickFor === 'edAdd') { sh.plan.days[sh.i].items.push({ex: id, role:'A', ...L.prescribe(goal, 'A', level, EX[id])}); sh.type = 'editDay'; App.renderOverlay(); return; }
  if (sh.pickFor === 'edSwap') { const it = sh.plan.days[sh.i].items[sh.swapJ]; it.ex = id; sh.type = 'editDay'; App.renderOverlay(); return; }
  if (sh.pickFor === 'wAdd') { workoutAddExercise(id); App.closeSheet(); return; }
  if (sh.pickFor === 'wSwap') { workoutSwapExercise(sh.swapJ, id); App.closeSheet(); return; }
};

// ---------- detalle de entrenamiento guardado ----------
App.views.sh_workoutDetail = (p, sh) => {
  const w = Store.get('workouts', sh.id); if (!w) return '<p>No encontrado.</p>';
  const v = wVolume(w);
  return `<div><span class="label">${fmtDate(w.date,{weekday:'long',day:'numeric',month:'long'})}</span><h2>${esc(w.name)}</h2></div>
  <div class="kpis"><div class="kpi"><b>${w.durSec?Math.round(w.durSec/60):'–'}</b><span>minutos</span></div><div class="kpi"><b>${v.sets}</b><span>series</span></div><div class="kpi"><b>${fmtNum(v.kg)}</b><span>kg totales</span></div><div class="kpi"><b>${(w.prs||[]).length}</b><span>récords</span></div></div>
  ${(w.exercises||[]).map(e => { const ex = EX[e.ex]; const [a,b] = nm(ex); const ss = e.sets.filter(s => s.done); if (!ss.length) return ''; return `<div class="card flat stack-s"><div class="exrow">${animHTML(ex.img,'thumb',a)}<div class="grow"><div class="exname">${esc(a)}</div><div class="exalt">${esc(b)}</div></div>${(w.prs||[]).includes(e.ex)?'<span class="pill ok">Récord</span>':''}</div>
    <p class="small num">${ss.map(s => `<span class="${s.t==='w'?'muted':''}">${s.kg?L.fmtKg(s.kg)+' kg × ':''}${s.reps}${ex.u==='sec'?' s':''}${s.rir!=null&&s.rir!==''?` @${s.rir}`:''}</span>`).join(' · ')}</p></div>`; }).join('')}
  ${w.hrAvg || w.hrMax ? `<p class="small">Frecuencia cardíaca: ${w.hrAvg ? `<b class="num">${w.hrAvg}</b> promedio` : ''}${w.hrAvg && w.hrMax ? ' · ' : ''}${w.hrMax ? `<b class="num">${w.hrMax}</b> máxima` : ''}${p.age && w.hrMax ? ` <span class="muted">(${Math.round(w.hrMax / L.hrMax(p.age) * 100)}% de tu máx. estimada)</span>` : ''}</p>` : ''}
  ${w.notes ? `<p class="small"><b>Notas:</b> ${esc(w.notes)}</p>` : ''}
  ${sh.confirm ? `<div class="row"><button class="btn grow" data-act="sheet" data-arg="workoutDetail" data-extra='${esc(JSON.stringify({id:w.id}))}'>Cancelar</button><button class="btn grow danger" data-act="delWorkout" data-arg="${w.id}">Borrar definitivamente</button></div>` : `<button class="btn danger" data-act="askDelW">Borrar entrenamiento</button>`}`;
};
App.acts.askDelW = () => { S.sheet.confirm = true; App.renderOverlay(); };
App.acts.delWorkout = el => { Store.del('workouts', el.dataset.arg); App.closeSheet(); App.render(); toast('Entrenamiento borrado'); };
