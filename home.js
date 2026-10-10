// Inicio, bienvenida, cuestionario, perfiles, menú, aprender, exportar.
'use strict';

App.views.welcome = () => `
  <div class="stack" style="margin-top:16px">
    <div class="hero"><span class="label" style="color:inherit;opacity:.7">Entrenamiento personal, sin suscripción</span>
      <h2>Tu plan, tu registro, con fundamento.</h2>
      <p class="muted">Respondé un cuestionario corto y la app arma tu rutina de fuerza, calistenia, running, ciclismo y yoga. Cada persona tiene su propio perfil.</p>
      <button class="btn primary" data-act="newProfile">Crear el primer perfil</button></div>
    <div class="card flat stack-s"><b>Qué incluye</b>
      <p class="small muted">Registro de series al estilo de las apps de gimnasio, imágenes de cada ejercicio, nombres en español e inglés, sugerencias de peso según tu última sesión, temporizador de descanso con lecturas cortas, gráficos de progreso, planes de running y ciclismo, secuencias de yoga guiadas e importación de archivos GPX/TCX de tu reloj.</p></div>
  </div>`;

App.views.home = (p) => {
  const plan = p.plan;
  const ni = nextPlanDay(p, plan);
  const day = plan && ni != null ? plan.days[ni] : null;
  const ws = weekStats(p.id);
  const target = plan ? plan.days.length : 3;
  const dl = plan ? L.deloadCheck(workoutsOf(p.id), p) : {recommend:false};
  const deloadOn = p.deloadUntil && new Date(p.deloadUntil) > new Date();
  const active = getActive(p.id);
  const tipIdx = Math.floor(Date.now() / 86400000) % TIPS.length;
  const tip = TIPS[tipIdx];
  const recent = [...workoutsOf(p.id).slice(0,5).map(w => ({k:'w', d:w.date, o:w})), ...actsOf(p.id).slice(0,5).map(a => ({k:'a', d:a.date, o:a}))].sort((a,b) => b.d.localeCompare(a.d)).slice(0,5);
  const runPlanWeek = curPlanWeek(p.runPlan), ridePlanWeek = curPlanWeek(p.ridePlan);
  return `
  <div class="stack">
    ${active ? `<div class="banner info"><div class="grow"><b>Tenés un entrenamiento en curso</b><div class="small">${esc(active.name)} · empezado ${fmtDate(active.date,{hour:'2-digit',minute:'2-digit'})}</div></div><button class="btn sm primary" data-act="resumeWorkout">Continuar</button></div>` : ''}
    <div class="hero">
      <span class="label" style="color:inherit;opacity:.7">${day ? 'Próximo entrenamiento' : 'Empezá'}</span>
      ${day ? `<h2>${esc(day.name)}</h2><p class="muted small">${day.items.length} ejercicios · ${day.items.map(i => esc(nm(EX[i.ex])[0])).slice(0,3).join(', ')}…</p>
        <div class="row"><button class="btn primary grow" data-act="startPlanDay" data-arg="${ni}" data-kind="plan">Empezar ahora</button><button class="btn sm" style="background:transparent;color:inherit;border-color:currentColor" data-act="tab" data-arg="lift">Ver plan</button></div>`
        : `<h2>Generá tu plan</h2><button class="btn primary" data-act="redoQuiz">Hacer el cuestionario</button>`}
    </div>
    ${deloadOn ? `<div class="banner"><div><b>Semana de descarga activa</b><div class="small">Hasta el ${fmtDate(p.deloadUntil)}: la mitad de series y esfuerzo moderado.</div></div></div>`
      : dl.recommend ? `<div class="banner"><div class="grow"><b>Toca una semana de descarga</b><div class="small">Llevás ${dl.weeks} semanas entrenando seguidas. Una semana más liviana ayuda a disipar fatiga y seguir progresando.</div></div><button class="btn sm" data-act="startDeload">Activar</button></div>` : ''}
    <div class="section" style="margin-top:6px">
      <div class="row between"><h3>Esta semana</h3><span class="small muted">${fmtDate(L.weekStart(new Date()),{day:'numeric',month:'short'})} →</span></div>
      <div class="kpis">
        <div class="kpi"><b>${ws.workouts}<small class="muted" style="font-size:14px">/${target}</small></b><span>Fuerza</span></div>
        <div class="kpi"><b style="color:var(--run)">${fmtNum(ws.run,1)}</b><span>km corriendo</span></div>
        <div class="kpi"><b style="color:var(--ride)">${fmtNum(ws.ride,0)}</b><span>km en bici</span></div>
        <div class="kpi"><b style="color:var(--yoga)">${fmtNum(ws.yogaMin,0)}</b><span>min de yoga</span></div>
      </div>
    </div>
    ${stepsCard(p)}
    ${runPlanWeek || ridePlanWeek ? `<div class="section"><h3>Cardio planificado</h3>
      ${runPlanWeek ? planWeekMini(runPlanWeek, 'run', p.runPlan) : ''}${ridePlanWeek ? planWeekMini(ridePlanWeek, 'ride', p.ridePlan) : ''}</div>` : ''}
    <div class="section"><div class="row between"><h3>Para leer</h3><button class="btn ghost sm" data-act="sheet" data-arg="learn">Ver todo</button></div>
      <div class="card stack-s"><span class="pill">${esc(catLabel(tip.cat))}</span><b>${esc(tip.t)}</b><p class="small">${esc(tip.b)}</p>
      <p class="tiny muted">${tip.r.map(r => esc(REFS[r])).join(' · ')}</p></div></div>
    <div class="section"><h3>Actividad reciente</h3>
      ${recent.length ? `<div class="card list">${recent.map(r => r.k === 'w' ? workoutItem(r.o) : activityItem(r.o)).join('')}</div>` : `<div class="empty">Todavía no hay registros. Tu primer entrenamiento va a aparecer acá.</div>`}
    </div>
  </div>`;
};
function stepsCard(p){
  const goal = p.stepGoal || 8000; const d = S.stepDate || todayISO();
  const cur = Store.get('steps', p.id + '_' + d);
  const last7 = []; for (let i = 0; i < 7; i++) { const x = new Date(); x.setDate(x.getDate() - i); const s = Store.get('steps', p.id + '_' + localDay(x)); if (s) last7.push(s.steps); }
  const avg = last7.length ? Math.round(last7.reduce((a,b) => a+b, 0) / last7.length) : null;
  const v = cur ? cur.steps : 0; const pct = Math.min(100, v / goal * 100);
  return `<div class="card stack-s"><div class="row between"><h3>Pasos</h3><span class="small muted num">Meta ${fmtNum(goal)}${avg != null ? ' · promedio 7 días ' + fmtNum(avg) : ''}</span></div>
    <div class="row"><input id="stepd" type="date" value="${d}" max="${todayISO()}" data-change="stepDate" aria-label="Fecha" style="max-width:150px"><input id="stepin" type="number" inputmode="numeric" placeholder="${cur ? fmtNum(cur.steps) : 'pasos'}" aria-label="Pasos" style="max-width:120px"><button class="btn" data-act="saveSteps">${cur ? 'Actualizar' : 'Guardar'}</button></div>
    <div class="progress" style="height:8px"><i style="width:${pct}%;background:${v >= goal ? 'var(--ok)' : 'var(--fg)'}"></i></div>
    <div class="row between"><span class="small num">${cur ? fmtNum(v) + ' pasos' + (v >= goal ? ' · ¡meta cumplida!' : ' · faltan ' + fmtNum(goal - v)) : 'Mirá tu reloj y cargá el número del día.'}</span>
    <span class="chips">${[6000,8000,10000].map(g => `<button class="chip" style="padding:3px 9px;font-size:12px" data-act="stepGoal" data-arg="${g}" aria-pressed="${goal===g}">${g/1000}k</button>`).join('')}</span></div></div>`;
}
App.binds.stepDate = el => { S.stepDate = el.value; App.render(); };
App.acts.saveSteps = () => { const n = parseInt($('#stepin').value, 10); if (!n || n < 0 || n > 100000) { toast('Ingresá la cantidad de pasos'); return; } const p = curProfile(); const d = S.stepDate || todayISO(); Store.put('steps', {id: p.id + '_' + d, pid: p.id, date: d, steps: n}); App.render(); toast('Pasos guardados'); };
App.acts.stepGoal = el => { const p = curProfile(); Store.put('profiles', {...p, stepGoal: +el.dataset.arg}); App.render(); };
function curPlanWeek(rp){
  if (!rp) return null;
  const start = new Date(rp.startDate + 'T00:00:00');
  const w = Math.floor((L.weekStart(new Date()) - L.weekStart(start)) / (7*86400000));
  return w >= 0 && w < rp.plan.length ? rp.plan[w] : null;
}
function planWeekMini(w, sport, rp){
  const unit = sport === 'run' ? `${fmtNum(w.km,1)} km` : `${fmtNum(w.hours,2)} h`;
  return `<div class="card tap" data-act="goCardio" data-arg="${sport}"><div class="row between"><span class="pill ${sport}">${sport==='run'?'Running':'Ciclismo'} · semana ${w.week}/${rp.weeks}</span><span class="small muted">${esc(w.label)}</span></div>
  <div class="row" style="margin-top:8px"><b class="num">${unit}</b><span class="small muted">${w.sessions.map(s => sport==='run' ? `${fmtNum(s.km,1)} ${s.type}` : `${s.min}′ ${s.type}`).join(' · ')}</span></div></div>`;
}
const CAT_LABEL = {fundamentos:'Fundamentos', hipertrofia:'Hipertrofia', fuerza:'Fuerza', recuperacion:'Recuperación', nutricion:'Nutrición', running:'Running', ciclismo:'Ciclismo', yoga:'Yoga', calistenia:'Calistenia', tecnica:'Técnica'};
const catLabel = c => CAT_LABEL[c] || c;

function workoutItem(w){
  const v = wVolume(w);
  return `<div class="it" data-act="sheet" data-arg="workoutDetail" data-extra='${esc(JSON.stringify({id:w.id}))}'>
    <span class="pill ${w.planKind==='calis'?'calis':'lift'}">${w.planKind==='calis'?'Calistenia':'Fuerza'}</span>
    <div class="grow"><b>${esc(w.name)}</b><div class="small muted">${fmtDate(w.date)} · ${v.sets} series · ${fmtNum(v.kg)} kg</div></div></div>`;
}
App.acts.goCardio = el => { S.tab = 'cardio'; S.cardio = el.dataset.arg; ls.set('bl_tab','cardio'); App.render(); };
App.acts.startDeload = () => { const p = curProfile(); const d = new Date(); d.setDate(d.getDate() + 7); Store.put('profiles', {...p, deloadUntil: d.toISOString(), lastDeload: new Date().toISOString()}); toast('Semana de descarga activada'); App.render(); };

// ---------- cuestionario ----------
const Q_STEPS = ['datos','nivel','objetivo','tiempo','equipo','prioridades','otros'];
App.acts.newProfile = () => { S.q = {step:0, pid:null, d:{days:3, duration:60, equip:'gym', priorities:[], interests:[], maxPush:'', maxPull:''}}; App.setOv({type:'quiz'}); };
App.acts.redoQuiz = () => { const p = curProfile(); S.q = {step:0, pid:p.id, d:{...p, priorities:[...(p.priorities||[])], interests:[...(p.interests||[])]}}; App.closeSheet(); App.setOv({type:'quiz'}); };
App.views.ov_quiz = () => {
  const q = S.q, d = q.d, st = Q_STEPS[q.step];
  const opt = (key, val, title, desc) => `<button class="opt" data-act="qset" data-k="${key}" data-v="${val}" aria-pressed="${String(d[key])===String(val)}"><span class="tick"></span><span><b>${title}</b>${desc?`<span class="small muted">${desc}</span>`:''}</span></button>`;
  const chip = (key, val, label, multi) => `<button class="chip" data-act="${multi?'qtog':'qset'}" data-k="${key}" data-v="${val}" aria-pressed="${multi ? (d[key]||[]).includes(val) : String(d[key])===String(val)}">${label}</button>`;
  let body = '';
  if (st === 'datos') body = `<h2>¿Quién va a entrenar?</h2>
    <div class="field"><label for="q_name">Nombre</label><input id="q_name" type="text" data-bind="q" data-k="name" value="${esc(d.name||'')}" autocomplete="off"></div>
    <div class="grid2"><div class="field"><label for="q_age">Edad</label><input id="q_age" type="number" inputmode="numeric" data-bind="q" data-k="age" value="${esc(d.age||'')}"></div>
    <div class="field"><label for="q_sex">Sexo</label><select id="q_sex" data-change="q" data-k="sex">${[['','Prefiero no decir'],['m','Masculino'],['f','Femenino']].map(([v,l]) => `<option value="${v}" ${d.sex===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="q_w">Peso (kg)</label><input id="q_w" type="text" inputmode="decimal" autocomplete="off" data-bind="q" data-k="weight" value="${esc(d.weight||'')}"></div>
    <div class="field"><label for="q_h">Altura (cm)</label><input id="q_h" type="number" inputmode="numeric" data-bind="q" data-k="height" value="${esc(d.height||'')}"></div></div>
    <p class="small muted">La edad se usa para estimar tu frecuencia cardíaca máxima. El peso, para tu proteína diaria orientativa y el seguimiento.</p>`;
  if (st === 'nivel') body = `<h2>¿Cuánta experiencia tenés con pesas?</h2>
    ${opt('level','beg','Principiante','Menos de 6 meses entrenando de forma constante.')}${opt('level','int','Intermedio','Entre 6 meses y 2 años; conocés los básicos.')}${opt('level','adv','Avanzado','Más de 2 años; ya progresás lento y conocés tu esfuerzo.')}`;
  if (st === 'objetivo') body = `<h2>¿Cuál es tu objetivo ahora?</h2><p class="small muted">Lo podés cambiar cuando quieras; tu historial se conserva.</p>
    ${opt('goal','hipertrofia','Ganar músculo','Hipertrofia: series cerca del fallo, volumen moderado-alto.')}
    ${opt('goal','fuerza','Ganar fuerza','Básicos pesados en pocas reps y descansos largos.')}
    ${opt('goal','recomp','Perder grasa y mantener músculo','Recomposición: seguir entrenando pesado + cardio suave.')}
    ${opt('goal','salud','Salud y bienestar','Volumen moderado, esfuerzo cómodo, constancia.')}
    ${opt('goal','resistencia','Resistencia muscular','Más repeticiones y descansos cortos.')}`;
  if (st === 'tiempo') body = `<h2>¿Cuánto tiempo tenés?</h2>
    <div class="field"><label>Días de fuerza por semana</label><div class="chips">${[2,3,4,5,6].map(n => chip('days', n, n + ' días')).join('')}</div></div>
    <div class="field"><label>Duración de cada sesión</label><div class="chips">${[45,60,75,90].map(n => chip('duration', n, n + ' min')).join('')}</div></div>
    <p class="small muted">${({2:'2 días: cuerpo completo; cubre el mínimo recomendado de fuerza.',3:'3 días: cuerpo completo, ideal para empezar y muy eficiente.',4:'4 días: torso/piernas, cada músculo 2 veces por semana.',5:'5 días: torso/piernas + empuje/tirón/piernas.',6:'6 días: empuje/tirón/piernas dos veces. Requiere buena recuperación.'})[d.days]||''}</p>`;
  if (st === 'equipo') body = `<h2>¿Dónde entrenás?</h2>
    ${opt('equip','gym','Gimnasio completo','Barras, máquinas, poleas y mancuernas.')}
    ${opt('equip','home','En casa con mancuernas','Mancuernas, bandas y, si tenés, barra de dominadas.')}
    ${opt('equip','bw','Solo peso corporal (calistenia)','Barra de dominadas, paralelas o un banco.')}
    <div class="grid2"><div class="field"><label for="q_mp">¿Cuántas flexiones seguidas hacés?</label><input id="q_mp" type="number" inputmode="numeric" data-bind="q" data-k="maxPush" value="${esc(d.maxPush)}"></div>
    <div class="field"><label for="q_mpu">¿Y dominadas?</label><input id="q_mpu" type="number" inputmode="numeric" data-bind="q" data-k="maxPull" value="${esc(d.maxPull)}"></div></div>
    <p class="small muted">Se usa para elegir el escalón de partida en calistenia. Si no sabés, dejalo vacío.</p>`;
  if (st === 'prioridades') body = `<h2>¿Querés priorizar algo?</h2><p class="small muted">Opcional. Suma una serie a los ejercicios de esos músculos.</p>
    <div class="chips">${[['pecho','Pecho'],['espalda','Espalda'],['hombros','Hombros'],['brazos','Brazos'],['piernas','Piernas'],['gluteos','Glúteos']].map(([v,l]) => chip('priorities', v, l, true)).join('')}</div>`;
  if (st === 'otros') body = `<h2>¿Qué más hacés o querés hacer?</h2>
    <div class="chips">${[['run','Running'],['ride','Ciclismo'],['yoga','Yoga'],['calis','Calistenia además de pesas']].map(([v,l]) => chip('interests', v, l, true)).join('')}</div>
    <p class="small muted">Activa sugerencias en el inicio. Los planes de running y ciclismo se arman en la pestaña Cardio.</p>
    <div class="card flat small"><b>Aviso</b><p class="muted">Esta app da recomendaciones generales basadas en evidencia. Si tenés alguna condición médica, consultá a un profesional antes de empezar.</p></div>`;
  const last = q.step === Q_STEPS.length - 1;
  const okNext = st !== 'datos' || (d.name && d.name.trim()) ;
  const okLevel = st !== 'nivel' || d.level; const okGoal = st !== 'objetivo' || d.goal;
  return `<div class="overlay" role="dialog" aria-modal="true" aria-label="Cuestionario"><div class="bar"><div class="in">
    <button class="iconbtn" data-act="${q.step ? 'qprev' : 'closeOv'}" aria-label="${q.step ? 'Atrás' : 'Cerrar'}">${q.step ? ICON.back : ICON.close}</button>
    <div class="grow"><div class="progress"><i style="width:${(q.step+1)/Q_STEPS.length*100}%;background:var(--accent)"></i></div></div>
    <span class="small muted num">${q.step+1}/${Q_STEPS.length}</span></div></div>
    <div class="wrap stack" style="padding-top:18px">${body}
    <button class="btn primary block" data-act="${last ? 'qfinish' : 'qnext'}" ${okNext && okLevel && okGoal ? '' : 'disabled style="opacity:.5"'}>${last ? 'Generar mi plan' : 'Siguiente'}</button></div></div>`;
};
App.binds.q = el => { S.q.d[el.dataset.k] = el.value; if (el.dataset.k === 'name') { const b = document.querySelector('.overlay .btn.primary.block'); if (b) { const ok = !!el.value.trim(); b.disabled = !ok; b.style.opacity = ok ? '' : '.5'; } } };
App.acts.qset = el => { let v = el.dataset.v; if (/^\d+$/.test(v)) v = +v; S.q.d[el.dataset.k] = v; App.renderOverlay(); };
App.acts.qtog = el => { const a = S.q.d[el.dataset.k] = S.q.d[el.dataset.k] || []; const i = a.indexOf(el.dataset.v); i >= 0 ? a.splice(i,1) : a.push(el.dataset.v); App.renderOverlay(); };
App.acts.qnext = () => { S.q.step++; App.renderOverlay(); const o = $('.overlay'); if (o) o.scrollTop = 0; };
App.acts.qprev = () => { S.q.step--; App.renderOverlay(); };
App.acts.closeOv = () => { S.ov = null; App.renderOverlay(); App.render(); };
App.acts.qfinish = async () => {
  const d = S.q.d; const old = S.q.pid ? Store.get('profiles', S.q.pid) : null;
  const p = {...(old||{}), ...d, id: S.q.pid || uid(), name: d.name.trim(), createdAt: (old && old.createdAt) || new Date().toISOString()};
  ['age','weight','height','days','duration'].forEach(k => { const v = num(p[k]); p[k] = isNaN(v) ? null : v; });
  if (!p.owner && Store.uid) p.owner = Store.uid;
  p.plan = L.buildPlan(EX, p);
  if (p.equip !== 'bw' && (p.interests||[]).includes('calis')) p.calisPlan = L.buildCalisPlan(EX, {...p, calisDays: 2});
  else if (p.equip === 'bw') p.calisPlan = null;
  if (p.weight) await Store.put('body', {id: p.id + '_' + todayISO(), pid: p.id, date: todayISO(), kg: p.weight});
  await Store.put('profiles', p);
  S.pid = p.id; ls.set('bl_pid', p.id); S.q = null; S.ov = null; S.tab = 'lift'; S.fz = 'plan'; ls.set('bl_tab','lift');
  App.renderOverlay(); App.render(); toast(old ? 'Plan actualizado' : '¡Plan listo!');
};

// ---------- hojas: perfiles y menú ----------
App.views.sh_profiles = (p) => `<h2>Perfiles</h2>
  <div class="list">${profiles().map(x => `<div class="it" data-act="pickProfile" data-arg="${x.id}"><span class="avatar" style="background:${pColor(x)}">${esc(x.name.slice(0,1).toUpperCase())}</span>
  <div class="grow"><b>${esc(x.name)}</b><div class="small muted">${esc((L.GOALS[x.goal]||{}).label||'')} · ${x.days||'–'} días</div></div>${x.id===S.pid?'<span class="pill ok">Activo</span>':''}</div>`).join('')}</div>
  <button class="btn block" data-act="newProfileFromSheet">Agregar perfil</button>
  <p class="small muted">${STANDALONE ? 'Para sumar amigos: pasales el link de la app. Cada uno la instala en su teléfono y crea su perfil ahí.' : 'Para sumar amigos: compartí esta app desde el menú de compartir de Claude e invitalos por email como editores. Cada uno crea su perfil acá.'}</p>`;
App.acts.pickProfile = el => { S.pid = el.dataset.arg; ls.set('bl_pid', S.pid); App.closeSheet(); App.render(); };
App.acts.newProfileFromSheet = () => { S.sheet = null; App.acts.newProfile(); };

App.views.sh_menu = (p) => `<h2>Menú</h2>
  <div class="list">
    <div class="it" data-act="sheet" data-arg="learn"><div class="grow"><b>Aprender</b><div class="small muted">Lecturas cortas con referencias científicas</div></div></div>
    <div class="it" data-act="goLib"><div class="grow"><b>Biblioteca de ejercicios</b><div class="small muted">${Object.keys(EX).length} ejercicios con imágenes, en español e inglés</div></div></div>
    ${p ? `<div class="it" data-act="redoQuiz"><div class="grow"><b>Cambiar objetivo o rehacer cuestionario</b><div class="small muted">Genera un plan nuevo; el historial se conserva</div></div></div>
    <div class="it" data-act="sheet" data-arg="profileEdit"><div class="grow"><b>Perfil de ${esc(p.name)}</b><div class="small muted">Datos, borrar perfil</div></div></div>` : ''}
    <div class="it" data-act="sheet" data-arg="export"><div class="grow"><b>Exportar e importar</b><div class="small muted">Importar de Hevy, CSV para planillas, respaldo completo</div></div></div>
    <div class="it" data-act="sheet" data-arg="settings"><div class="grow"><b>Ajustes</b><div class="small muted">Idioma de los nombres, animaciones</div></div></div>
    <div class="it" data-act="sheet" data-arg="about"><div class="grow"><b>Relojes, fuentes y créditos</b></div></div>
  </div>`;
App.acts.goLib = () => { S.tab = 'lift'; S.fz = 'lib'; ls.set('bl_tab','lift'); App.closeSheet(); App.render(); };

App.views.sh_settings = () => `<h2>Ajustes</h2>
  <div class="field"><label>Mostrar primero el nombre en</label><div class="seg"><button data-act="setNames" data-arg="es" aria-pressed="${S.namesFirst==='es'}">Español</button><button data-act="setNames" data-arg="en" aria-pressed="${S.namesFirst==='en'}">English</button></div></div>
  <div class="field"><label>Animación de las imágenes</label><div class="seg"><button data-act="setAnim" data-arg="1" aria-pressed="${S.anim}">Activada</button><button data-act="setAnim" data-arg="0" aria-pressed="${!S.anim}">Pausada</button></div></div>`;
App.acts.setNames = el => { S.namesFirst = el.dataset.arg; ls.set('bl_names', S.namesFirst); App.render(); };
App.acts.setAnim = el => { S.anim = el.dataset.arg === '1'; ls.set('bl_anim', S.anim); if (!S.anim) document.body.classList.remove('f1'); App.renderOverlay(); };

App.views.sh_profileEdit = (p) => `<h2>${esc(p.name)}</h2>
  <div class="grid2"><div class="field"><label for="pe_name">Nombre</label><input id="pe_name" type="text" value="${esc(p.name)}"></div>
  <div class="field"><label for="pe_age">Edad</label><input id="pe_age" type="number" value="${esc(p.age||'')}"></div></div>
  <button class="btn primary" data-act="saveProfileEdit">Guardar</button>
  <div class="card flat stack-s"><b>Proteína orientativa</b><p class="small muted">${p.weight ? `Con ${fmtNum(p.weight)} kg: ~${fmtNum(p.weight*1.6)}–${fmtNum(p.weight*2.2)} g de proteína por día.` : 'Cargá tu peso en Progreso para calcularla.'} (Morton 2018)</p></div>
  ${S.sheet.confirmDel ? `<div class="banner"><div class="grow"><b>¿Borrar el perfil y todos sus registros?</b><div class="small">No se puede deshacer. Exportá un respaldo antes.</div></div></div><div class="row"><button class="btn grow" data-act="sheet" data-arg="profileEdit">Cancelar</button><button class="btn grow danger" data-act="deleteProfile">Borrar definitivamente</button></div>`
    : `<button class="btn danger" data-act="askDelProfile">Borrar perfil</button>`}`;
App.acts.saveProfileEdit = () => { const p = curProfile(); const n = $('#pe_name').value.trim(); if (!n) return; Store.put('profiles', {...p, name: n, age: +$('#pe_age').value || null}); App.closeSheet(); App.render(); };
App.acts.askDelProfile = () => { S.sheet.confirmDel = true; App.renderOverlay(); };
App.acts.deleteProfile = async () => {
  const p = curProfile();
  for (const c of ['workouts','activities','body','steps']) for (const x of Store.list(c, p.id)) await Store.del(c, x.id);
  await Store.del('profiles', p.id); clearActive(p.id);
  S.pid = null; ls.del('bl_pid'); App.closeSheet(); App.render(); toast('Perfil borrado');
};

App.views.sh_learn = () => {
  const cats = [...new Set(TIPS.map(t => t.cat))];
  return `<h2>Aprender</h2><p class="small muted">Resúmenes propios de estudios y guías. No reemplazan la consulta con un profesional.</p>
  ${cats.map(c => `<div class="stack-s"><span class="label">${esc(catLabel(c))}</span>${TIPS.filter(t => t.cat === c).map(t => `<details class="card flat"><summary>${esc(t.t)}</summary><p class="small" style="margin-top:8px">${esc(t.b)}</p><p class="tiny muted" style="margin-top:6px">${t.r.map(r => esc(REFS[r])).join('<br>')}</p></details>`).join('')}</div>`).join('')}`;
};

App.views.sh_about = () => `<h2>Relojes, fuentes y créditos</h2>
  <div class="card flat stack-s"><b>Smartwatch y Strava</b><p class="small">Exportá cada actividad como GPX o TCX desde la app de tu reloj (Garmin Connect, Coros, Polar Flow, Zepp, Huawei Salud) o desde Strava (actividad → ⋯ → Exportar GPX). Después usá “Importar archivo” en Cardio. El TCX suele incluir la frecuencia cardíaca.</p>
  <p class="small muted">La sincronización automática necesita una app nativa con Health Connect o Apple Health. Google Fit dejó de aceptar desarrolladores nuevos en 2024 y se da de baja en 2026.</p></div>
  <div class="card flat stack-s"><b>Imágenes de ejercicios</b><p class="small">Proyecto free-exercise-db (github.com/yuhonas/free-exercise-db), de dominio público.</p></div>
  <div class="card flat stack-s"><b>Referencias</b><p class="tiny muted">${Object.values(REFS).map(esc).join('<br>')}</p></div>`;

// ---------- exportar / importar ----------
App.views.sh_export = (p) => `<h2>Exportar e importar</h2>
  <button class="btn block primary" data-act="openHevy">Importar desde Hevy (CSV)</button>
  <div class="stack-s"><button class="btn block" data-act="expSets">Series de fuerza (CSV)</button>
  <button class="btn block" data-act="expActs">Running, ciclismo y yoga (CSV)</button>
  <button class="btn block" data-act="expBody">Peso corporal (CSV)</button>
  <button class="btn block" data-act="expSteps">Pasos (CSV)</button>
  <button class="btn block dark" data-act="expAll">Respaldo completo (JSON)</button></div>
  <p class="small muted">Los CSV se abren en Excel o Google Sheets e incluyen a todos los perfiles. El respaldo JSON sirve para restaurar todo.</p>
  <div class="field"><label for="imp">Restaurar desde un respaldo JSON</label><input id="imp" type="file" accept=".json,application/json" data-change="importJSON"></div>`;
const csv = rows => rows.map(r => r.map(v => { const s = String(v == null ? '' : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }).join(',')).join('\n');
const pname = id => (Store.get('profiles', id) || {}).name || '';
App.acts.expSets = () => {
  const rows = [['fecha','perfil','entrenamiento','ejercicio_es','exercise_en','serie','tipo','kg','reps','rir','1rm_estimado']];
  Store.list('workouts').sort((a,b) => a.date.localeCompare(b.date)).forEach(w => (w.exercises||[]).forEach(e => { let n = 0; e.sets.filter(s => s.done).forEach(s => { if (s.t !== 'w') n++; const ex = EX[e.ex] || {}; rows.push([localDay(w.date), pname(w.pid), w.name, ex.es, ex.en, s.t==='w'?'A':n, s.t==='w'?'aproximación':'efectiva', s.kg, s.reps, s.rir, s.t==='w'?'':L.e1rm(s.kg,s.reps).toFixed(1)]); }); }));
  saveFile('barra-libre-series.csv', '﻿' + csv(rows));
};
App.acts.expActs = () => {
  const rows = [['fecha','perfil','deporte','tipo','distancia_km','duracion','ritmo_min_km','velocidad_kmh','fc_media','rpe','desnivel_m','notas']];
  Store.list('activities').sort((a,b) => a.date.localeCompare(b.date)).forEach(a => rows.push([localDay(a.date), pname(a.pid), {run:'running',ride:'ciclismo',yoga:'yoga'}[a.sport], a.type||a.style||'', a.distKm||'', L.durStr(a.durSec), a.sport==='run'&&a.distKm?L.paceStr(a.durSec/a.distKm):'', a.sport==='ride'&&a.durSec?(a.distKm/(a.durSec/3600)).toFixed(1):'', a.hr||'', a.rpe||'', a.elev||'', a.notes||'']));
  saveFile('barra-libre-actividades.csv', '﻿' + csv(rows));
};
App.acts.expBody = () => { const rows = [['fecha','perfil','kg']]; Store.list('body').sort((a,b) => a.date.localeCompare(b.date)).forEach(b => rows.push([b.date, pname(b.pid), b.kg])); saveFile('barra-libre-peso.csv', '﻿' + csv(rows)); };
App.acts.expSteps = () => { const rows = [['fecha','perfil','pasos']]; Store.list('steps').sort((a,b) => a.date.localeCompare(b.date)).forEach(s => rows.push([s.date, pname(s.pid), s.steps])); saveFile('barra-libre-pasos.csv', '\ufeff' + csv(rows)); };
App.acts.expAll = () => saveFile('barra-libre-respaldo-' + todayISO() + '.json', JSON.stringify({app:'barra-libre', v:1, exported:new Date().toISOString(), data: Store.data}, null, 1));
App.binds.importJSON = el => {
  const f = el.files && el.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = async () => {
    try {
      const j = JSON.parse(r.result); const d = j.data || j; let n = 0;
      for (const c of COLS) for (const o of Object.values(d[c] || {})) { if (o && o.id) { await Store.put(c, o); n++; } }
      toast(`Restaurados ${n} registros`); App.closeSheet(); App.render();
    } catch(e){ toast('El archivo no es un respaldo válido de Barra Libre.'); }
  };
  r.readAsText(f);
};
App.views.sh_textout = (p, sh) => `<h2>${esc(sh.name)}</h2><p class="small muted">No se pudo descargar el archivo. Copiá el contenido y pegalo en un archivo nuevo o en una planilla.</p>
  <textarea class="textout" id="txo" readonly>${esc(sh.text)}</textarea><button class="btn primary" data-act="copyTxo">Copiar</button>`;
App.acts.copyTxo = async () => { const t = $('#txo'); try { await navigator.clipboard.writeText(t.value); toast('Copiado'); } catch(e){ t.focus(); t.select(); toast('Seleccionado: usá Copiar del teléfono'); } };
