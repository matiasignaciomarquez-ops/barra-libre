// Clases de gimnasio: Funcional, GAP, Cross training, Box, Spinning, Pilates, HIIT y propias.
// Se guardan como actividades con sport: 'class'. La carga de cada clase = RPE × minutos (Foster 2001).
// Este archivo solo agrega: no cambia el funcionamiento de fuerza, running, ciclismo ni yoga.
'use strict';
(function(){
  const st = document.createElement('style');
  st.textContent = `:root{--class:#d46b1f}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--class:#f0904a}}
  :root[data-theme="dark"]{--class:#f0904a}
  .pill.class{background:color-mix(in srgb,var(--class) 16%,transparent);color:var(--class)}`;
  document.head.appendChild(st);
})();

const CLASS_TYPES = {funcional:'Funcional', gap:'GAP', cross:'Cross training', box:'Box', spinning:'Spinning', pilates:'Pilates', hiit:'HIIT', baile:'Zumba / baile', otra:'Otra'};
const slugTxt = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function classTypes(p){ const o = {...CLASS_TYPES}; delete o.otra; ((p && p.classTypes) || []).forEach(t => { o['c_' + slugTxt(t)] = t; }); o.otra = 'Otra'; return o; }
const classLabel = a => a.title || classTypes(curProfile())[a.ctype] || 'Clase';
const classLoad = a => a.rpe && a.durSec ? Math.round(a.rpe * a.durSec / 60) : null;

// La pestaña Cardio muestra "Clases" como tercera opción, al lado de Running y Ciclismo.
SP.class = {label:'Clases', color:'--class', types: () => classTypes(curProfile())};

window.REFS.foster2001 = 'Foster C, Florhaug JA, Franklin J, Gottschall L, Hrovatin LA, Parker S, Doleshal P, Dodge C. A new approach to monitoring exercise training. J Strength Cond Res. 2001;15(1):109-115.';
window.TIPS.push({cat:'clases', t:'Cómo medir una clase', b:'Para clases sin series ni kilómetros, la carga se estima multiplicando tu esfuerzo percibido (RPE de 1 a 10) por los minutos. Es un método simple y validado que sirve para comparar semanas y subir la carga de a poco.', r:['foster2001']});
if (typeof CAT_LABEL !== 'undefined') CAT_LABEL.clases = 'Clases';

// ---------- vista ----------
const _cardioView = App.views.cardio;
App.views.cardio = (p) => S.cardio === 'class' ? classView(p) : _cardioView(p);

function weekRanges(n){ const ws = L.weekStart(new Date()); const out = []; for (let i = n - 1; i >= 0; i--) { const s = new Date(ws); s.setDate(s.getDate() - 7*i); const e = new Date(s); e.setDate(e.getDate() + 7); out.push([s, e]); } return out; }
function classView(p){
  const acts = actsOf(p.id, 'class');
  const wr = weekRanges(8);
  const inR = (a, r) => { const d = new Date(a.date); return d >= r[0] && d < r[1]; };
  const wLoad = wr.map(r => acts.filter(a => inR(a, r)).reduce((t,a) => t + (classLoad(a) || 0), 0));
  const thisW = acts.filter(a => inR(a, wr[7]));
  const prev4 = (wLoad[3] + wLoad[4] + wLoad[5] + wLoad[6]) / 4;
  const col = cssv('--class');
  chartLater('clch', () => ({type:'bar', data:{labels: wr.map(r => fmtDate(r[0],{day:'numeric',month:'numeric'})), datasets:[{data: wLoad, backgroundColor: wLoad.map((_,i) => i === 7 ? col : col + '88'), borderRadius:4}]}, options: baseOpts()}));
  const last30 = acts.filter(a => (Date.now() - new Date(a.date)) < 30*86400000);
  const byType = {}; last30.forEach(a => { const k = classLabel(a); byType[k] = (byType[k] || 0) + 1; });
  const saved = Store.list('routines', p.id).filter(r => r.kind === 'class');
  const jump = prev4 > 0 && wLoad[7] > prev4 * 1.5;
  return `<div class="stack">
    <div class="seg" role="group" aria-label="Deporte">${Object.entries(SP).map(([k,v]) => `<button data-act="seg" data-key="cardio" data-arg="${k}" aria-pressed="${S.cardio===k}">${v.label}</button>`).join('')}</div>
    <div class="row"><button class="btn primary grow" data-act="logClass">Registrar clase</button><button class="btn" data-act="openRut" data-arg="class">Mis rutinas</button></div>
    ${saved.length ? `<div class="stack-s"><span class="label">Tus clases guardadas · tocá para registrar</span><div class="chips">${saved.map(r => `<button class="chip" data-act="rutUse" data-arg="${r.id}">${esc(r.name)}</button>`).join('')}</div></div>` : ''}
    <div class="kpis">
      <div class="kpi"><b style="color:var(--class)">${thisW.length}</b><span>clases esta semana</span></div>
      <div class="kpi"><b>${Math.round(thisW.reduce((t,a) => t + (a.durSec||0)/60, 0))}</b><span>minutos</span></div>
      <div class="kpi"><b>${fmtNum(wLoad[7])}</b><span>carga semanal</span></div>
      <div class="kpi"><b>${fmtNum(prev4)}</b><span>carga prom. 4 sem.</span></div>
    </div>
    ${jump ? `<div class="banner"><div><b>Subiste bastante la carga</b><div class="small">Esta semana llevás más de un 50% sobre tu promedio. Conviene aumentar de a poco y dormir bien.</div></div></div>` : ''}
    <div class="card stack-s"><div class="row between"><h3>Carga por semana</h3><span class="tiny muted">RPE × minutos</span></div><div class="chartbox"><canvas id="clch"></canvas></div></div>
    ${Object.keys(byType).length ? `<div class="card stack-s"><h3>Últimos 30 días</h3><div class="chips">${Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([k,n]) => `<span class="pill class">${esc(k)} · ${n}</span>`).join('')}</div></div>` : ''}
    ${acts.length ? `<div class="section"><h3>Historial</h3><div class="card list">${acts.slice(0,30).map(activityItem).join('')}</div></div>`
      : `<div class="empty">Registrá tu primera clase: funcional, GAP, cross, box, spinning o la que hagas.</div>`}
    <details class="card flat"><summary>Cómo se calcula la carga</summary><div class="stack-s" style="margin-top:8px"><p class="small">Al terminar, marcá qué tan dura fue la clase del 1 (muy suave) al 10 (máximo). La app multiplica ese número por los minutos: una clase de 50 minutos con esfuerzo 7 suma 350. Así podés comparar semanas y evitar subir la carga de golpe.</p><p class="tiny muted">${esc(REFS.foster2001)}</p></div></details>
  </div>`;
}

// ---------- historial y detalle ----------
const _activityItem = activityItem;
window.activityItem = function(a){
  if (a.sport !== 'class') return _activityItem(a);
  const ld = classLoad(a);
  return `<div class="it" data-act="sheet" data-arg="actDetail" data-extra='${esc(JSON.stringify({id:a.id}))}'>
    <span class="pill class">Clase</span>
    <div class="grow"><b>${esc(classLabel(a))}</b><div class="small muted num">${fmtDate(a.date)} · ${Math.round((a.durSec||0)/60)} min${a.rpe ? ' · RPE ' + a.rpe : ''}${ld ? ' · carga ' + ld : ''}</div></div></div>`;
};
const _actDetail = App.views.sh_actDetail;
App.views.sh_actDetail = (p, sh) => {
  const a = Store.get('activities', sh.id);
  if (!a || a.sport !== 'class') return _actDetail(p, sh);
  const ld = classLoad(a);
  return `<div><span class="label">${fmtDate(a.date,{weekday:'long',day:'numeric',month:'long'})}</span><h2>${esc(classLabel(a))}</h2></div>
  <div class="kpis"><div class="kpi"><b>${Math.round((a.durSec||0)/60)}</b><span>minutos</span></div><div class="kpi"><b>${a.rpe || '–'}</b><span>RPE</span></div><div class="kpi"><b>${ld || '–'}</b><span>carga</span></div><div class="kpi"><b>${a.hr || '–'}</b><span>FC media</span></div></div>
  <p class="small muted">${[a.hrMax ? `FC máxima ${a.hrMax}` : '', a.kcal ? `${a.kcal} kcal` : ''].filter(Boolean).join(' · ')}</p>
  ${a.notes ? `<p class="small"><b>Notas:</b> ${esc(a.notes)}</p>` : ''}
  <div class="row"><button class="btn grow" data-act="classRepeat" data-arg="${a.id}">Repetir hoy</button><button class="btn grow" data-act="rutFromAct" data-arg="${a.id}">Guardar como rutina</button></div>
  <div class="row"><button class="btn grow" data-act="editClass" data-arg="${a.id}">Editar</button>
  ${sh.confirm ? `<button class="btn grow danger" data-act="delAct" data-arg="${a.id}">Confirmar borrado</button>` : `<button class="btn grow danger" data-act="askDelA">Borrar</button>`}</div>`;
};

// ---------- registro ----------
function classForm(extra){ return Object.assign({id: null, date: todayISO(), ctype: 'funcional', title: '', min: 50, rpe: '', hr: '', hrMax: '', kcal: '', notes: '', adding: false, newType: ''}, extra || {}); }
App.acts.logClass = () => App.openSheet('classLog', {f: classForm()});
App.acts.editClass = el => {
  const a = Store.get('activities', el.dataset.arg);
  App.openSheet('classLog', {f: classForm({id: a.id, date: a.date.slice(0,10), time: a.date.slice(10,19), ctype: a.ctype || 'otra', title: a.ctype === 'otra' ? (a.title || '') : '', min: Math.round((a.durSec||0)/60), rpe: a.rpe || '', hr: a.hr || '', hrMax: a.hrMax || '', kcal: a.kcal || '', notes: a.notes || ''})});
};
App.acts.classRepeat = el => {
  const a = Store.get('activities', el.dataset.arg);
  App.openSheet('classLog', {f: classForm({ctype: a.ctype || 'otra', title: a.ctype === 'otra' ? (a.title || '') : '', min: Math.round((a.durSec||0)/60), notes: a.notes || ''})});
};
App.views.sh_classLog = (p, sh) => {
  const f = sh.f, types = classTypes(p);
  return `<h2>${f.id ? 'Editar clase' : 'Registrar clase'}</h2>
  <div class="field"><label>Tipo de clase</label><div class="chips">${Object.entries(types).map(([k,v]) => `<button class="chip" data-act="clSet" data-k="ctype" data-v="${k}" aria-pressed="${f.ctype===k}">${esc(v)}</button>`).join('')}
    <button class="chip" data-act="clAddType" aria-pressed="${f.adding}">+ Agregar tipo</button></div></div>
  ${f.adding ? `<div class="row"><input id="cl_nt" type="text" class="grow" placeholder="Ej.: Crossfit, Stretching, Aquagym" value="${esc(f.newType)}" data-bind="clf" data-k="newType" aria-label="Nombre del tipo de clase"><button class="btn sm primary" data-act="clSaveType">Agregar</button></div>` : ''}
  ${f.ctype === 'otra' ? `<div class="field"><label for="cl_t">Nombre de la clase</label><input id="cl_t" type="text" value="${esc(f.title)}" data-bind="clf" data-k="title"></div>` : ''}
  <div class="grid2"><div class="field"><label for="cl_d">Fecha</label><input id="cl_d" type="date" value="${esc(f.date)}" data-bind="clf" data-k="date"></div>
  <div class="field"><label for="cl_m">Minutos</label><input id="cl_m" type="number" inputmode="numeric" value="${esc(f.min)}" data-bind="clf" data-k="min"></div></div>
  <div class="field"><label>¿Qué tan dura fue? (RPE 1 = muy suave, 10 = máximo)</label><div class="chips">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button class="chip" data-act="clSet" data-k="rpe" data-v="${n}" aria-pressed="${+f.rpe===n}">${n}</button>`).join('')}</div>
    ${+f.rpe && +f.min ? `<p class="tiny muted">Carga de esta clase: <b class="num">${+f.rpe * +f.min}</b></p>` : ''}</div>
  <div class="grid3"><div class="field"><label for="cl_hr">FC media</label><input id="cl_hr" type="number" inputmode="numeric" value="${esc(f.hr)}" data-bind="clf" data-k="hr"></div>
  <div class="field"><label for="cl_hm">FC máxima</label><input id="cl_hm" type="number" inputmode="numeric" value="${esc(f.hrMax)}" data-bind="clf" data-k="hrMax"></div>
  <div class="field"><label for="cl_k">Calorías</label><input id="cl_k" type="number" inputmode="numeric" value="${esc(f.kcal)}" data-bind="clf" data-k="kcal"></div></div>
  <div class="field"><label for="cl_n">Notas</label><textarea id="cl_n" placeholder="Ej.: circuito de 4 estaciones, burpees, profe Laura" data-bind="clf" data-k="notes">${esc(f.notes)}</textarea></div>
  <button class="btn primary" data-act="saveClass">Guardar</button>`;
};
App.binds.clf = el => { S.sheet.f[el.dataset.k] = el.value; };
App.acts.clSet = el => { let v = el.dataset.v; if (/^\d+$/.test(v)) v = +v; S.sheet.f[el.dataset.k] = v; App.renderOverlay(); };
App.acts.clAddType = () => { S.sheet.f.adding = !S.sheet.f.adding; App.renderOverlay(); const i = $('#cl_nt'); if (i) i.focus(); };
App.acts.clSaveType = async () => {
  const f = S.sheet.f, p = curProfile(); const t = (f.newType || '').trim();
  if (!t) { toast('Escribí el nombre del tipo'); return; }
  const list = [...(p.classTypes || [])]; if (!list.some(x => slugTxt(x) === slugTxt(t))) list.push(t);
  await Store.put('profiles', {...p, classTypes: list});
  f.ctype = 'c_' + slugTxt(t); f.adding = false; f.newType = ''; App.renderOverlay(); toast('Tipo agregado');
};
App.acts.saveClass = async () => {
  const f = S.sheet.f, p = curProfile();
  const min = +f.min;
  if (!min || min < 1) { toast('Cargá los minutos'); return; }
  if (f.ctype === 'otra' && !(f.title || '').trim()) { toast('Escribí el nombre de la clase'); return; }
  const types = classTypes(p);
  const date = f.date.length === 10 ? f.date + (f.time || 'T12:00:00') : f.date;
  const a = {id: f.id || uid(), pid: p.id, sport: 'class', date, ctype: f.ctype, title: f.ctype === 'otra' ? f.title.trim() : types[f.ctype],
    durSec: Math.round(min * 60), rpe: +f.rpe || null, hr: +f.hr || null, hrMax: +f.hrMax || null, kcal: +f.kcal || null, notes: f.notes || '', distKm: 0};
  a.load = classLoad(a);
  await Store.put('activities', a); App.closeSheet(); App.render(); toast('Clase guardada');
};

// ---------- progreso y exportación ----------
window.heatmap = function(ws, acts){
  const end = L.weekStart(new Date()); const start = new Date(end); start.setDate(start.getDate() - 7*15);
  const day = {}; const key = d => { const x = new Date(d); return x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(); };
  acts.forEach(a => { const k = key(a.date); day[k] = day[k] || a.sport; });
  ws.forEach(w => day[key(w.date)] = 'lift');
  const colv = {lift:'--lift', run:'--run', ride:'--ride', yoga:'--yoga', class:'--class'};
  let html = '<div class="heat" role="img" aria-label="Días con actividad en las últimas 16 semanas">';
  for (let c = 0; c < 16; c++) { html += '<div class="col">'; for (let r = 0; r < 7; r++) { const d = new Date(start); d.setDate(d.getDate() + c*7 + r); const s = day[key(d)]; const fut = d > new Date(); html += `<i style="${s && colv[s] ? `background:var(${colv[s]})` : ''}${fut ? ';opacity:.35' : ''}"></i>`; } html += '</div>'; }
  return html + '</div>';
};
App.acts.expActs = () => {
  const pname = id => (Store.get('profiles', id) || {}).name || '';
  const rows = [['fecha','perfil','deporte','tipo','distancia_km','duracion','ritmo_min_km','velocidad_kmh','fc_media','rpe','desnivel_m','carga','notas']];
  Store.list('activities').sort((a,b) => a.date.localeCompare(b.date)).forEach(a => rows.push([localDay(a.date), pname(a.pid), {run:'running',ride:'ciclismo',yoga:'yoga',class:'clase'}[a.sport] || a.sport, a.sport === 'class' ? classLabel(a) : (a.type||a.style||''), a.distKm||'', L.durStr(a.durSec), a.sport==='run'&&a.distKm?L.paceStr(a.durSec/a.distKm):'', a.sport==='ride'&&a.durSec?(a.distKm/(a.durSec/3600)).toFixed(1):'', a.hr||'', a.rpe||'', a.elev||'', a.sport==='class' ? (classLoad(a)||'') : '', a.notes||'']));
  saveFile('barra-libre-actividades.csv', '﻿' + csv(rows));
};
const _progView = App.views.prog;
App.views.prog = (p) => _progView(p).replace('<i style="background:var(--yoga)"></i>Yoga</span>', '<i style="background:var(--yoga)"></i>Yoga</span><span><i style="background:var(--class)"></i>Clases</span>');
