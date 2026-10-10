// Importador de Hevy (CSV) y ejercicios propios.
'use strict';

// Nombres de Hevy → ejercicios de la biblioteca
const HEVY_MAP = {
  'squat (barbell)':'Barbell_Squat','full squat':'Barbell_Squat','front squat (barbell)':'Front_Squat_Clean_Grip','goblet squat':'Goblet_Squat','goblet squat (kettlebell)':'Goblet_Squat','goblet squat (dumbbell)':'Goblet_Squat',
  'leg press (machine)':'Leg_Press','leg press horizontal (machine)':'Leg_Press','hack squat (machine)':'Hack_Squat','hack squat':'Hack_Squat','squat (smith machine)':'Smith_Machine_Squat','squat (bodyweight)':'Bodyweight_Squat','air squat':'Bodyweight_Squat',
  'deadlift (barbell)':'Barbell_Deadlift','romanian deadlift (barbell)':'Romanian_Deadlift','romanian deadlift (dumbbell)':'Stiff-Legged_Dumbbell_Deadlift','stiff leg deadlift':'Stiff-Legged_Dumbbell_Deadlift','straight leg deadlift':'Stiff-Legged_Dumbbell_Deadlift','trap bar deadlift':'Trap_Bar_Deadlift','sumo deadlift':'Sumo_Deadlift','sumo deadlift (barbell)':'Sumo_Deadlift',
  'back extension (hyperextension)':'Hyperextensions_Back_Extensions','back extension':'Hyperextensions_Back_Extensions','hip thrust (barbell)':'Barbell_Hip_Thrust','hip thrust (machine)':'Barbell_Hip_Thrust','hip thrust':'Barbell_Hip_Thrust','glute bridge':'Butt_Lift_Bridge','single leg glute bridge':'Single_Leg_Glute_Bridge',
  'bulgarian split squat':'Split_Squat_with_Dumbbells','split squat (dumbbell)':'Split_Squat_with_Dumbbells','lunge (dumbbell)':'Dumbbell_Lunges','lunge':'Bodyweight_Walking_Lunge','walking lunge':'Bodyweight_Walking_Lunge','walking lunge (dumbbell)':'Dumbbell_Lunges','step up':'Dumbbell_Step_Ups','dumbbell step up':'Dumbbell_Step_Ups',
  'leg extension (machine)':'Leg_Extensions','lying leg curl (machine)':'Lying_Leg_Curls','seated leg curl (machine)':'Seated_Leg_Curl','nordic hamstrings curls':'Glute_Ham_Raise','glute ham raise':'Glute_Ham_Raise',
  'standing calf raise (machine)':'Standing_Calf_Raises','standing calf raise':'Standing_Calf_Raises','calf press (machine)':'Standing_Calf_Raises','seated calf raise':'Seated_Calf_Raise','seated calf raise (machine)':'Seated_Calf_Raise',
  'bench press (barbell)':'Barbell_Bench_Press_-_Medium_Grip','bench press (dumbbell)':'Dumbbell_Bench_Press','incline bench press (dumbbell)':'Incline_Dumbbell_Press','incline bench press (barbell)':'Barbell_Incline_Bench_Press_-_Medium_Grip','chest press (machine)':'Machine_Bench_Press','bench press (smith machine)':'Machine_Bench_Press',
  'chest dip':'Dips_-_Chest_Version','chest dip (weighted)':'Dips_-_Chest_Version','push up':'Pushups','decline push up':'Push-Ups_With_Feet_Elevated','diamond push up':'Push-Ups_-_Close_Triceps_Position','handstand push up':'Handstand_Push-Ups',
  'overhead press (barbell)':'Barbell_Shoulder_Press','shoulder press (dumbbell)':'Dumbbell_Shoulder_Press','seated overhead press (dumbbell)':'Dumbbell_Shoulder_Press','overhead press (dumbbell)':'Dumbbell_Shoulder_Press','shoulder press (machine plates)':'Machine_Shoulder_Military_Press','shoulder press (machine)':'Machine_Shoulder_Military_Press',
  'chest fly (dumbbell)':'Dumbbell_Flyes','cable fly crossovers':'Cable_Crossover','cable crossover':'Cable_Crossover','butterfly (pec deck)':'Butterfly','chest fly (machine)':'Butterfly',
  'lateral raise (dumbbell)':'Side_Lateral_Raise','lateral raise (cable)':'Cable_Seated_Lateral_Raise','single arm lateral raise (cable)':'Cable_Seated_Lateral_Raise','rear delt reverse fly (dumbbell)':'Reverse_Flyes','rear delt reverse fly (machine)':'Reverse_Flyes','rear delt reverse fly (cable)':'Reverse_Flyes','face pull':'Face_Pull','face pull (cable)':'Face_Pull','band pullaparts':'Band_Pull_Apart',
  'pull up':'Pullups','pull up (weighted)':'Pullups','pull up (assisted)':'Pullups','chin up':'Chin-Up','chin up (weighted)':'Chin-Up','scapular pull ups':'Scapular_Pull-Up','muscle up':'Muscle_Up',
  'lat pulldown (cable)':'Wide-Grip_Lat_Pulldown','lat pulldown (machine)':'Wide-Grip_Lat_Pulldown','lat pulldown - close grip (cable)':'Close-Grip_Front_Lat_Pulldown','close grip lat pulldown':'Close-Grip_Front_Lat_Pulldown',
  'bent over row (barbell)':'Bent_Over_Barbell_Row','dumbbell row':'One-Arm_Dumbbell_Row','single arm dumbbell row':'One-Arm_Dumbbell_Row','seated cable row - v grip (cable)':'Seated_Cable_Rows','seated cable row - bar grip':'Seated_Cable_Rows','seated row (machine)':'Seated_Cable_Rows','t bar row':'T-Bar_Row_with_Handle','inverted row':'Inverted_Row',
  'shrug (dumbbell)':'Dumbbell_Shrug','shrug (barbell)':'Dumbbell_Shrug',
  'bicep curl (barbell)':'Barbell_Curl','bicep curl (dumbbell)':'Dumbbell_Alternate_Bicep_Curl','ez bar biceps curl':'EZ-Bar_Curl','hammer curl (dumbbell)':'Hammer_Curls','incline curl (dumbbell)':'Incline_Dumbbell_Curl','preacher curl (machine)':'Machine_Preacher_Curls','preacher curl (barbell)':'Machine_Preacher_Curls','preacher curl (dumbbell)':'Machine_Preacher_Curls','bicep curl (cable)':'Barbell_Curl',
  'triceps pushdown':'Triceps_Pushdown_-_Rope_Attachment','triceps rope pushdown':'Triceps_Pushdown_-_Rope_Attachment','skullcrusher (barbell)':'EZ-Bar_Skullcrusher','skullcrusher (dumbbell)':'EZ-Bar_Skullcrusher','triceps extension (cable)':'Cable_Rope_Overhead_Triceps_Extension','overhead triceps extension (cable)':'Cable_Rope_Overhead_Triceps_Extension','triceps dip':'Dips_-_Triceps_Version','triceps dip (weighted)':'Dips_-_Triceps_Version','bench dip':'Dips_-_Triceps_Version',
  'plank':'Plank','side plank':'Side_Bridge','dead bug':'Dead_Bug','hanging leg raise':'Hanging_Leg_Raise','hanging knee raise':'Hanging_Leg_Raise','toes to bar':'Hanging_Pike','cable crunch':'Cable_Crunch','ab wheel':'Ab_Roller','crunch':'Crunches','mountain climber':'Mountain_Climbers','superman':'Superman',
  'kettlebell swing':'One-Arm_Kettlebell_Swings','box jump':'Front_Box_Jump','jump squat':'Freehand_Jump_Squat','pistol squat':'Kettlebell_Pistol_Squat'
};
const EQ_FROM = [[/barbell|ez bar|trap bar|t bar/i,'barbell'],[/dumbbell/i,'dumbbell'],[/machine|smith|plate/i,'machine'],[/cable/i,'cable'],[/kettlebell/i,'kettlebell'],[/band/i,'bands'],[/bodyweight|push up|pull up|chin up|dip|plank|crunch/i,'bodyweight']];
const MUS_FROM = [[/bench|chest|fly|pec|push up|dip/i,'pecho','hpush'],[/row|pulldown|pull up|chin|lat /i,'espalda','hpull'],[/shoulder|overhead press|military|arnold|upright/i,'hombros','vpush'],[/lateral raise|rear delt|face pull/i,'hombros','latdelt'],[/curl(?!.*leg)/i,'bíceps','biceps'],[/tricep|skull|pushdown|kickback/i,'tríceps','triceps'],[/leg curl|hamstring|romanian|rdl|good morning/i,'isquios','ham'],[/hip thrust|glute|kickback|abduct/i,'glúteos','glute'],[/squat|leg press|leg extension|lunge|step up/i,'cuádriceps','squat'],[/deadlift/i,'isquios','hinge'],[/calf/i,'gemelos','calf'],[/shrug/i,'trapecio','traps'],[/crunch|plank|ab |abs|sit up|leg raise|russian|oblique|core/i,'core','core']];
function slug(s){ return s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,80); }
function guessCustom(name){
  const eq = (EQ_FROM.find(([r]) => r.test(name)) || [0,'machine'])[1];
  const mm = MUS_FROM.find(([r]) => r.test(name));
  return {id: 'c_' + slug(name), es: name, en: name, p: mm ? mm[2] : 'other', eq, cat: 'gym', u: /plank|hold|hang/i.test(name) ? 'sec' : 'reps', m: mm ? [mm[1]] : [], m2: [], lvl: '', mech: '', cues: ['Ejercicio propio importado de Hevy.'], ins: [], img: [], custom: true};
}
function matchExercise(name){
  const k = name.trim().toLowerCase();
  if (HEVY_MAP[k]) return HEVY_MAP[k];
  const norm = s => s.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w => w.length > 2 && !['the','with','and'].includes(w));
  const a = new Set(norm(name)); let best = null, bs = 0;
  for (const e of Object.values(EX)) { if (e.custom) continue; const b = norm(e.en); const inter = b.filter(w => a.has(w)).length; const sc = inter / Math.max(a.size, b.length); if (sc > bs) { bs = sc; best = e.id; } }
  return bs >= 0.75 ? best : null;
}
function syncCustomEx(){ Store.list('customEx').forEach(c => { if (!EX[c.id] || EX[c.id].custom) EX[c.id] = c; }); }

// CSV con comillas
function parseCSV(text){
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i+1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i+1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r[0] && r[0].trim()));
}
const MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,ene:0,abr:3,ago:7,dic:11};
function parseHevyDate(s){
  if (!s) return null;
  let m = s.match(/(\d{1,2})\s+([A-Za-zé]{3})[a-z]*\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/i);
  if (m && MONTHS[m[2].toLowerCase().slice(0,3)] != null) return new Date(+m[3], MONTHS[m[2].toLowerCase().slice(0,3)], +m[1], +m[4], +m[5]);
  const d = new Date(s); return isNaN(d) ? null : d;
}

// Analiza el CSV y devuelve la vista previa
function hevyAnalyze(text){
  const rows = parseCSV(text.replace(/^﻿/, ''));
  const h = rows[0].map(x => x.trim().toLowerCase());
  const col = n => h.indexOf(n);
  const need = ['title','start_time','exercise_title','set_type','reps'];
  if (need.some(n => col(n) < 0)) throw new Error('formato');
  const wcol = col('weight_kg') >= 0 ? col('weight_kg') : col('weight_lbs'); const lbs = col('weight_kg') < 0 && col('weight_lbs') >= 0;
  const W = {}; const names = {};
  for (const r of rows.slice(1)) {
    const title = r[col('title')], st = r[col('start_time')]; if (!title || !st) continue;
    const key = st + '|' + title;
    const d = parseHevyDate(st); if (!d) continue;
    const end = col('end_time') >= 0 ? parseHevyDate(r[col('end_time')]) : null;
    const w = W[key] || (W[key] = {title, date: d, end, notes: col('description') >= 0 ? r[col('description')] : '', ex: []});
    const en = r[col('exercise_title')]; names[en] = (names[en] || 0) + 1;
    let e = w.ex[w.ex.length - 1]; if (!e || e.name !== en) { e = {name: en, sets: []}; w.ex.push(e); }
    let kg = wcol >= 0 ? parseFloat(r[wcol]) || 0 : 0; if (lbs) kg = Math.round(kg * 0.4536 * 4) / 4;
    const dur = col('duration_seconds') >= 0 ? parseFloat(r[col('duration_seconds')]) || 0 : 0;
    let reps = parseFloat(r[col('reps')]) || 0; if (!reps && dur) reps = dur;
    const rpe = col('rpe') >= 0 ? parseFloat(r[col('rpe')]) : NaN;
    e.sets.push({t: /warm/i.test(r[col('set_type')]) ? 'w' : 'n', kg, reps, rir: isNaN(rpe) ? null : Math.max(0, Math.round(10 - rpe)), done: true});
  }
  const workouts = Object.values(W).sort((a,b) => a.date - b.date);
  const map = {}; Object.keys(names).forEach(n => map[n] = matchExercise(n));
  return {workouts, map, names};
}

App.acts.openHevy = () => App.openSheet('hevy', {});
App.views.sh_hevy = (p, sh) => {
  const a = sh.an;
  if (!a) return `<h2>Importar desde Hevy</h2>
    <p class="small">En Hevy: <b>Perfil → Configuración → Exportar e importar datos → Exportar entrenamientos</b>. Después elegí acá ese archivo CSV.</p>
    <div class="field"><label for="hevyf">Archivo CSV de Hevy</label><input id="hevyf" type="file" accept=".csv,text/csv" data-change="hevyFile"></div>
    <p class="small muted">Se importa en el perfil de <b>${esc(p.name)}</b>. Si lo importás dos veces, no se duplica.</p>`;
  const known = Object.entries(a.map).filter(([,v]) => v), unknown = Object.entries(a.map).filter(([,v]) => !v);
  const from = a.workouts[0].date, to = a.workouts[a.workouts.length - 1].date;
  const titles = [...new Set(a.workouts.slice().reverse().map(w => w.title))];
  return `<h2>Importar desde Hevy</h2>
    <div class="kpis"><div class="kpi"><b>${a.workouts.length}</b><span>entrenamientos</span></div><div class="kpi"><b>${Object.keys(a.map).length}</b><span>ejercicios</span></div><div class="kpi"><b style="color:var(--ok)">${known.length}</b><span>reconocidos</span></div><div class="kpi"><b>${unknown.length}</b><span>nuevos propios</span></div></div>
    <p class="small muted">Del ${fmtDate(from,{day:'numeric',month:'short',year:'numeric'})} al ${fmtDate(to,{day:'numeric',month:'short',year:'numeric'})}.</p>
    <details class="card flat"><summary>Cómo se emparejaron los ejercicios</summary><div class="stack-s" style="margin-top:8px">
      ${known.map(([n,id]) => `<p class="small">${esc(n)} → <b>${esc(EX[id].es)}</b></p>`).join('')}
      ${unknown.map(([n]) => `<p class="small">${esc(n)} → <span class="muted">se crea como ejercicio propio</span></p>`).join('')}</div></details>
    <button class="opt" data-act="hevyTogPlan" aria-pressed="${!!sh.usePlan}"><span class="tick"></span><span><b>Usar mis rutinas de Hevy como plan</b><span class="small muted">${titles.length} rutina${titles.length>1?'s':''}: ${titles.slice(0,6).map(esc).join(', ')}${titles.length>6?'…':''}. Reemplaza el plan actual; el plan generado se puede volver a crear con el cuestionario.</span></span></button>
    ${sh.busy ? `<div class="progress"><i style="width:${sh.busy}%;background:var(--accent)"></i></div><p class="small muted">Importando… no cierres la app.</p>` : `<button class="btn primary" data-act="hevyGo">Importar</button>`}`;
};
App.binds.hevyFile = el => {
  const f = el.files && el.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => { try { const an = hevyAnalyze(r.result); if (!an.workouts.length) throw new Error('vacío'); S.sheet.an = an; S.sheet.usePlan = true; App.renderOverlay(); } catch(e){ toast('No reconozco el archivo. Tiene que ser el CSV de "Exportar entrenamientos" de Hevy.'); } };
  r.readAsText(f);
};
App.acts.hevyTogPlan = () => { S.sheet.usePlan = !S.sheet.usePlan; App.renderOverlay(); };
App.acts.hevyGo = async () => {
  const sh = S.sheet, a = sh.an; const p = curProfile();
  sh.busy = 1; App.renderOverlay();
  // ejercicios propios
  const idOf = {};
  for (const [n, id] of Object.entries(a.map)) {
    if (id) { idOf[n] = id; continue; }
    const c = guessCustom(n); idOf[n] = c.id;
    if (!Store.get('customEx', c.id)) await Store.put('customEx', c);
    EX[c.id] = c;
  }
  // plan desde las rutinas
  let plan = null; const dayOf = {};
  if (sh.usePlan) {
    const recent = a.workouts.filter(w => (a.workouts[a.workouts.length-1].date - w.date) < 70 * 86400000);
    const lastBy = {}; recent.forEach(w => lastBy[w.title] = w);
    const order = Object.values(lastBy).sort((x,y) => x.date - y.date);
    const goal = p.goal || 'hipertrofia', level = p.level || 'int';
    plan = {kind:'pesas', split:'Mis rutinas de Hevy', goal, level, createdAt: new Date().toISOString(), days: order.map((w, i) => {
      dayOf[w.title] = 'h' + (i+1);
      return {id: 'h' + (i+1), name: w.title, items: w.ex.map((e, j) => {
        const ex = EX[idOf[e.name]]; const ws = e.sets.filter(s => s.t !== 'w'); const reps = ws.map(s => s.reps).filter(Boolean);
        const role = j === 0 ? 'M' : j < 3 ? 'S' : 'A'; const base = L.prescribe(goal, role, level, ex);
        let lo = reps.length ? Math.min(...reps) : base.lo, hi = reps.length ? Math.max(...reps) : base.hi; if (hi - lo < 2) hi = lo + 2; if (ex.u === 'sec' && hi - lo < 10) hi = lo + 15;
        return {ex: ex.id, role, sets: Math.max(1, ws.length), lo, hi, rir: base.rir, rest: base.rest, warm: e.sets.some(s => s.t === 'w') ? Math.min(2, e.sets.filter(s => s.t === 'w').length) : 0};
      })};
    })};
    plan.why = [{t:'Tus rutinas de Hevy', b:'Este plan copia tus rutinas tal como las venías haciendo: mismos ejercicios, cantidad de series y rango de repeticiones de tu última sesión de cada una. Las sugerencias de peso siguen desde tus registros importados.', r:['kraemer2004','plotkin2022']}].concat(L.buildPlan(EX, {...p, equip: p.equip || 'gym'}).why.slice(1));
  }
  // entrenamientos
  let n = 0;
  for (const w of a.workouts) {
    const id = 'hevy_' + slug(w.date.toISOString() + '_' + w.title);
    const doc = {id, pid: p.id, date: w.date.toISOString(), durSec: w.end ? Math.max(0, Math.round((w.end - w.date) / 1000)) : null, name: w.title, planKind: 'pesas', source: 'hevy', goal: p.goal, notes: w.notes || '', prs: [],
      planKey: plan && dayOf[w.title] ? 'plan' : null, planCreated: plan && dayOf[w.title] ? plan.createdAt : null, planDay: plan ? dayOf[w.title] || null : null,
      exercises: w.ex.map(e => ({ex: idOf[e.name], role: 'A', sets: e.sets.filter(s => s.reps > 0)})).filter(e => e.sets.length)};
    await Store.put('workouts', doc); n++;
    if (n % 5 === 0) { sh.busy = Math.round(n / a.workouts.length * 100); App.renderOverlay(); }
  }
  if (plan) await Store.put('profiles', {...curProfile(), plan});
  App.closeSheet(); S.tab = plan ? 'lift' : 'prog'; S.fz = 'plan'; App.render();
  toast(`Importados ${n} entrenamientos de Hevy`);
};

// ---------- importación masiva: ZIP de Strava, varios GPX/TCX ----------
const STRAVA_TYPE = t => /run|carrera|correr|trote/i.test(t) ? 'run' : /ride|bik|cycl|bici|ciclismo/i.test(t) ? 'ride' : /yoga/i.test(t) ? 'yoga' : null;
async function gunzipText(blob){
  if (!window.DecompressionStream) throw new Error('gz');
  return await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
function parseStravaDate(s){
  const es = s && s.match(/(\d{1,2}) (?:de )?([A-Za-zé]{3})\w*\.?(?: de)? (\d{4}),? (\d{1,2}):(\d{2}):(\d{2})/i);
  if (es && MONTHS[es[2].toLowerCase()] != null) return new Date(Date.UTC(+es[3], MONTHS[es[2].toLowerCase()], +es[1], +es[4], +es[5], +es[6]));
  const m = s && s.match(/([A-Za-z]{3})\w*\.? (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?/i);
  if (m && MONTHS[m[1].toLowerCase()] != null) { let h = +m[4]; if (m[7]) { if (/pm/i.test(m[7]) && h < 12) h += 12; if (/am/i.test(m[7]) && h === 12) h = 0; } return new Date(Date.UTC(+m[3], MONTHS[m[1].toLowerCase()], +m[2], h, +m[5], +m[6])); }
  const d = new Date(s); return isNaN(d) ? null : d;
}
function stravaCSV(text){
  const rows = parseCSV(text.replace(/^\ufeff/, '')); const h = rows[0].map(x => x.trim().toLowerCase());
  const AL = {'Activity ID':['activity id','id de actividad','id de la actividad'], 'Activity Date':['activity date','fecha de la actividad','fecha de actividad'], 'Activity Name':['activity name','nombre de la actividad','nombre de actividad'],
    'Activity Type':['activity type','tipo de actividad','tipo de la actividad'], 'Elapsed Time':['elapsed time','tiempo transcurrido'], 'Moving Time':['moving time','tiempo en movimiento'], 'Distance':['distance','distancia'],
    'Max Heart Rate':['max heart rate','frecuencia cardíaca máxima','frecuencia cardiaca maxima'], 'Average Heart Rate':['average heart rate','frecuencia cardíaca media','frecuencia cardíaca promedio'], 'Elevation Gain':['elevation gain','desnivel positivo','ganancia de elevación'], 'Filename':['filename','nombre de archivo','nombre del archivo']};
  const first = n => { for (const a of (AL[n] || [n.toLowerCase()])) { const i = h.indexOf(a); if (i >= 0) return i; } return -1; };
  const all = n => h.reduce((acc, x, i) => ((AL[n] || []).includes(x) ? acc.concat(i) : acc), []);
  if (first('Activity ID') < 0) return null;
  const dI = all('Distance'), num = v => { let s = String(v || '').trim(); if (/,\d{1,2}$/.test(s) && !s.includes('.')) s = s.replace(',', '.'); else s = s.replace(/,/g, ''); return parseFloat(s) || 0; };
  const out = [];
  for (const r of rows.slice(1)) {
    const id = r[first('Activity ID')]; if (!id) continue;
    const date = parseStravaDate(r[first('Activity Date')]);
    const dist = dI.length > 1 ? num(r[dI[dI.length-1]]) / 1000 : num(r[dI[0]]);
    const mov = first('Moving Time') >= 0 ? num(r[first('Moving Time')]) : 0;
    out.push({id, date, name: r[first('Activity Name')], type: r[first('Activity Type')], distKm: +dist.toFixed(2), durSec: Math.round(mov || num(r[first('Elapsed Time')])),
      hr: Math.round(num(r[first('Average Heart Rate')])) || null, hrMax: Math.round(num(r[first('Max Heart Rate')])) || null, elev: Math.round(num(r[first('Elevation Gain')])) || null, file: (r[first('Filename')] || '').trim()});
  }
  return out;
}
async function bulkImport(files){
  App.openSheet('bulk', {loading: true});
  const items = []; const skipped = {}; let noRoute = 0; const fileTexts = {};
  let csvRows = null;
  try {
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) {
        const zip = await JSZip.loadAsync(f);
        const csvF = Object.keys(zip.files).find(n => /(^|\/)activities\.csv$/i.test(n));
        if (csvF) csvRows = stravaCSV(await zip.file(csvF).async('string')) || null;
        for (const n of Object.keys(zip.files)) {
          if (!/\.(gpx|tcx)(\.gz)?$/i.test(n)) { if (/\.fit(\.gz)?$/i.test(n)) noRoute++; continue; }
          const u8 = await zip.file(n).async('uint8array');
          try { fileTexts[n.replace(/^.*?(activities\/)/i, '$1')] = /\.gz$/i.test(n) ? await gunzipText(new Blob([u8])) : new TextDecoder().decode(u8); } catch(e){}
        }
      } else if (/\.gz$/i.test(f.name)) { try { fileTexts[f.name] = await gunzipText(f); } catch(e){} }
      else if (/\.(gpx|tcx)$/i.test(f.name)) fileTexts[f.name] = await f.text();
      else if (/activities\.csv$/i.test(f.name)) csvRows = stravaCSV(await f.text()) || null;
    }
    if (csvRows) {
      for (const r of csvRows) {
        const sport = STRAVA_TYPE(r.type || '');
        if (!sport) { skipped[r.type || 'Otro'] = (skipped[r.type || 'Otro'] || 0) + 1; continue; }
        const it = {id: 'strava_' + r.id, sport, date: r.date ? toLocalStr(r.date) : null, title: r.name, distKm: r.distKm, durSec: r.durSec, hr: r.hr, hrMax: r.hrMax, elev: r.elev, track: null, splits: null};
        const key = Object.keys(fileTexts).find(k => r.file && (r.file === k || r.file.endsWith(k) || k.endsWith(r.file.replace(/^activities\//,''))));
        if (key && sport !== 'yoga') { try { const t = parseTrack(fileTexts[key], sport); it.track = t.res.track; it.splits = t.res.splits; } catch(e){} }
        if (it.date) items.push(it);
      }
    } else {
      for (const [name, text] of Object.entries(fileTexts)) {
        try { const t = parseTrack(text, S.cardio); const d = t.res.date ? toLocalStr(t.res.date) : null; if (!d) continue;
          items.push({id: 'file_' + slug(d + '_' + t.res.distKm), sport: t.sport, date: d, title: name, distKm: t.res.distKm, durSec: t.res.durSec, hr: t.hrAvg, hrMax: t.hrMax, elev: t.res.elev, track: t.res.track, splits: t.res.splits}); } catch(e){}
      }
    }
  } catch(e){ console.warn(e); }
  if (!S.sheet || S.sheet.type !== 'bulk') return;
  S.sheet = {type:'bulk', items: items.sort((a,b) => a.date.localeCompare(b.date)), skipped, noRoute, fromCsv: !!csvRows};
  App.renderOverlay();
}
App.views.sh_bulk = (p, sh) => {
  if (sh.loading) return `<h2>Leyendo archivos…</h2><p class="small muted">Un ZIP grande de Strava puede tardar un poco.</p>`;
  const it = sh.items || [];
  if (!it.length) return `<h2>No encontré actividades</h2><p class="small">Probá con el ZIP completo que manda Strava por email, o con archivos GPX/TCX.</p>`;
  const c = s => it.filter(x => x.sport === s).length;
  const already = it.filter(x => Store.get('activities', x.id)).length;
  const sk = Object.entries(sh.skipped || {});
  return `<h2>Importar actividades</h2>
    <div class="kpis"><div class="kpi"><b style="color:var(--run)">${c('run')}</b><span>carreras</span></div><div class="kpi"><b style="color:var(--ride)">${c('ride')}</b><span>en bici</span></div><div class="kpi"><b style="color:var(--yoga)">${c('yoga')}</b><span>yoga</span></div><div class="kpi"><b>${it.filter(x => x.track).length}</b><span>con recorrido</span></div></div>
    <p class="small muted">Del ${fmtDate(it[0].date,{day:'numeric',month:'short',year:'numeric'})} al ${fmtDate(it[it.length-1].date,{day:'numeric',month:'short',year:'numeric'})}.${already ? ` ${already} ya estaban y se actualizan, sin duplicarse.` : ''}</p>
    ${sk.length ? `<p class="small muted">No se importan (otros deportes): ${sk.map(([k,v]) => esc(k) + ' ' + v).join(', ')}.</p>` : ''}
    ${sh.noRoute ? `<p class="small muted">${sh.noRoute} archivos FIT: se importan los datos (distancia, tiempo, FC) pero sin el mapa del recorrido.</p>` : ''}
    <p class="small">Se cargan en el perfil de <b>${esc(p.name)}</b>. Después podés editar el tipo (rodaje, fondo, series…) y el esfuerzo de cada una.</p>
    ${sh.busy ? `<div class="progress"><i style="width:${sh.busy}%;background:var(--accent)"></i></div><p class="small muted">Importando…</p>` : `<button class="btn primary" data-act="bulkGo">Importar ${it.length} actividades</button>`}`;
};
App.acts.bulkGo = async () => {
  const sh = S.sheet, p = curProfile(); sh.busy = 1; App.renderOverlay(); let n = 0;
  for (const x of sh.items) {
    const prev = Store.get('activities', x.id);
    await Store.put('activities', {...(prev || {}), id: x.id, pid: p.id, sport: x.sport, date: x.date, type: (prev && prev.type) || (x.sport === 'yoga' ? null : 'suave'), title: x.sport === 'yoga' ? (x.title || 'Yoga') : (prev && prev.title) || x.title,
      distKm: x.distKm || 0, durSec: x.durSec || 0, hr: x.hr || null, hrMax: x.hrMax || null, elev: x.elev || null, rpe: (prev && prev.rpe) || null, notes: (prev && prev.notes) || x.title || '', track: x.track || (prev && prev.track) || null, splits: x.splits || (prev && prev.splits) || null, source: 'strava'});
    n++; if (n % 10 === 0) { sh.busy = Math.round(n / sh.items.length * 100); App.renderOverlay(); }
  }
  App.closeSheet(); App.render(); toast(`Importadas ${n} actividades`);
};
