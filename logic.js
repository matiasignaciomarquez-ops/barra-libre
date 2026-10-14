// Lógica pura: generación de planes, progresión, running. Sin DOM.
(function (G) {
'use strict';

const EQUIP_SETS = {
  gym: ['barbell','dumbbell','machine','cable','bodyweight','bands','kettlebell'],
  home: ['dumbbell','bodyweight','bands','kettlebell'],
  bw: ['bodyweight','bands']
};

// Preferencias por patrón (orden = prioridad). Variante A/B toma índices distintos.
const PREF = {
  squat: ['Barbell_Squat','Hack_Squat','Leg_Press','Front_Squat_Clean_Grip','Smith_Machine_Squat','Goblet_Squat','Kettlebell_Pistol_Squat','Bodyweight_Squat'],
  hinge: ['Romanian_Deadlift','Barbell_Deadlift','Trap_Bar_Deadlift','Stiff-Legged_Dumbbell_Deadlift','One-Arm_Kettlebell_Swings','Single_Leg_Glute_Bridge','Glute_Ham_Raise'],
  glute: ['Barbell_Hip_Thrust','Single_Leg_Glute_Bridge','Butt_Lift_Bridge'],
  lunge: ['Split_Squat_with_Dumbbells','Dumbbell_Lunges','Dumbbell_Step_Ups','Bodyweight_Walking_Lunge','Kettlebell_Pistol_Squat'],
  quad: ['Leg_Extensions','Goblet_Squat','Bodyweight_Walking_Lunge'],
  ham: ['Seated_Leg_Curl','Lying_Leg_Curls','Stiff-Legged_Dumbbell_Deadlift','Glute_Ham_Raise'],
  calf: ['Standing_Calf_Raises','Seated_Calf_Raise'],
  hpush: ['Barbell_Bench_Press_-_Medium_Grip','Incline_Dumbbell_Press','Dumbbell_Bench_Press','Barbell_Incline_Bench_Press_-_Medium_Grip','Machine_Bench_Press','Dips_-_Chest_Version','Pushups','Push-Ups_With_Feet_Elevated'],
  vpush: ['Dumbbell_Shoulder_Press','Barbell_Shoulder_Press','Machine_Shoulder_Military_Press','Handstand_Push-Ups'],
  chest_iso: ['Cable_Crossover','Dumbbell_Flyes','Butterfly','Push-Ups_With_Feet_Elevated'],
  latdelt: ['Side_Lateral_Raise','Cable_Seated_Lateral_Raise','Band_Pull_Apart'],
  reardelt: ['Face_Pull','Reverse_Flyes','Band_Pull_Apart'],
  vpull: ['Wide-Grip_Lat_Pulldown','Pullups','Close-Grip_Front_Lat_Pulldown','Chin-Up','Scapular_Pull-Up'],
  hpull: ['Seated_Cable_Rows','One-Arm_Dumbbell_Row','Bent_Over_Barbell_Row','T-Bar_Row_with_Handle','Inverted_Row'],
  traps: ['Dumbbell_Shrug'],
  biceps: ['Incline_Dumbbell_Curl','Barbell_Curl','Hammer_Curls','EZ-Bar_Curl','Dumbbell_Alternate_Bicep_Curl','Machine_Preacher_Curls','Chin-Up'],
  triceps: ['Cable_Rope_Overhead_Triceps_Extension','Triceps_Pushdown_-_Rope_Attachment','EZ-Bar_Skullcrusher','Dips_-_Triceps_Version','Push-Ups_-_Close_Triceps_Position'],
  core: ['Cable_Crunch','Hanging_Leg_Raise','Plank','Ab_Roller','Dead_Bug','Side_Bridge'],
  plyo: ['Front_Box_Jump','Freehand_Jump_Squat','Knee_Tuck_Jump']
};

// Plantillas: [patrón, rol(M principal / S secundario / A accesorio), variante]
const T = {
  FA: ['Cuerpo completo A',[['squat','M',0],['hpush','M',0],['hpull','S',0],['ham','A',0],['latdelt','A',0],['core','A',0],['biceps','A',0]]],
  FB: ['Cuerpo completo B',[['hinge','M',0],['vpush','M',0],['vpull','S',0],['lunge','S',0],['triceps','A',0],['calf','A',0],['reardelt','A',0]]],
  FC: ['Cuerpo completo C',[['squat','S',1],['hpush','S',1],['vpull','M',1],['glute','A',0],['latdelt','A',1],['core','A',1],['biceps','A',1]]],
  UA: ['Torso A',[['hpush','M',0],['hpull','M',0],['vpush','S',0],['vpull','S',0],['latdelt','A',0],['biceps','A',0],['triceps','A',0],['reardelt','A',0]]],
  LA: ['Piernas A',[['squat','M',0],['hinge','S',0],['quad','A',0],['ham','A',0],['calf','A',0],['core','A',0],['glute','A',0]]],
  UB: ['Torso B',[['vpull','M',1],['hpush','S',1],['hpull','S',1],['vpush','S',1],['chest_iso','A',0],['triceps','A',1],['biceps','A',1],['latdelt','A',1]]],
  LB: ['Piernas B',[['hinge','M',1],['lunge','S',0],['glute','S',0],['ham','A',1],['calf','A',1],['core','A',1],['quad','A',0]]],
  PU: ['Empuje',[['hpush','M',0],['vpush','S',0],['hpush','S',1],['latdelt','A',0],['triceps','A',0],['chest_iso','A',0],['triceps','A',1]]],
  PL: ['Tirón',[['vpull','M',0],['hpull','M',1],['reardelt','A',0],['biceps','A',0],['hpull','S',0],['biceps','A',2],['traps','A',0]]],
  LG: ['Piernas',[['squat','M',1],['hinge','S',0],['lunge','S',0],['ham','A',0],['quad','A',0],['calf','A',0],['core','A',0]]],
  PU2:['Empuje B',[['vpush','M',1],['hpush','S',2],['chest_iso','A',1],['latdelt','A',1],['triceps','A',2],['hpush','S',0]]],
  PL2:['Tirón B',[['hpull','M',2],['vpull','S',2],['reardelt','A',1],['biceps','A',1],['hpull','S',0],['core','A',1]]],
  LG2:['Piernas B',[['hinge','M',1],['squat','S',2],['glute','S',0],['ham','A',1],['calf','A',1],['lunge','A',1]]]
};
const SPLITS = {2:['FA','FB'],3:['FA','FB','FC'],4:['UA','LA','UB','LB'],5:['UA','LA','PU','PL','LG'],6:['PU','PL','LG','PU2','PL2','LG2']};
const SPLIT_NAMES = {2:'Cuerpo completo ×2',3:'Cuerpo completo ×3',4:'Torso / Piernas',5:'Torso / Piernas + Empuje / Tirón / Piernas',6:'Empuje / Tirón / Piernas ×2'};

const GOALS = {
  hipertrofia:{label:'Hipertrofia (ganar músculo)', M:[3,6,10,2,150], S:[3,8,12,2,120], A:[3,10,15,1,75]},
  fuerza:{label:'Fuerza', M:[4,3,5,2,210], S:[3,6,8,2,150], A:[2,8,12,2,90]},
  recomp:{label:'Recomposición / perder grasa', M:[3,6,10,2,150], S:[3,8,12,2,120], A:[2,10,15,1,75]},
  salud:{label:'Salud y bienestar', M:[2,8,12,3,120], S:[2,10,12,3,90], A:[2,12,15,2,60]},
  resistencia:{label:'Resistencia muscular', M:[3,12,15,2,75], S:[3,15,20,2,60], A:[2,15,25,1,45]}
};
const LEVEL_LABEL = {beg:'Principiante', int:'Intermedio', adv:'Avanzado'};
const VOL_TARGET = {beg:[8,12], int:[10,16], adv:[12,20]};

function allowed(ex, equip){ return EQUIP_SETS[equip].includes(ex.eq); }

function pick(EX, pattern, variant, equip, used, goal){
  let pref = PREF[pattern] || [];
  if (goal === 'fuerza' && pattern === 'hinge') pref = ['Barbell_Deadlift','Romanian_Deadlift', ...pref.slice(2)];
  const avail = pref.filter(id => EX[id] && allowed(EX[id], equip));
  if (!avail.length) return null;
  for (let k = 0; k < avail.length; k++) {
    const id = avail[(variant + k) % avail.length];
    if (!used.has(id)) return id;
  }
  return null;
}

// Prescripción según objetivo, rol, nivel
function prescribe(goal, role, level, ex){
  const g = GOALS[goal] || GOALS.hipertrofia;
  let [sets, lo, hi, rir, rest] = g[role];
  if (level === 'beg') { rir = Math.min(rir + 1, 4); if (role === 'A') sets = Math.max(2, sets - 1); }
  if (level === 'adv' && (goal === 'hipertrofia' || goal === 'recomp') && role !== 'A') sets += 1;
  if (ex && ex.u === 'sec') { lo = 20; hi = 45; }
  if (ex && ex.p === 'plyo') { lo = 3; hi = 6; rir = 3; rest = 90; }
  if (ex && ex.p === 'calf' && lo < 8) { lo = 8; hi = 12; }
  return {sets, lo, hi, rir, rest, warm: role === 'M' && ex && ex.eq !== 'bodyweight' ? 2 : 0};
}

const MAX_EX = {45:5, 60:6, 75:7, 90:8};
const PRIORITY_MUSCLES = {pecho:['pecho'], espalda:['espalda'], hombros:['hombros'], brazos:['bíceps','tríceps'], piernas:['cuádriceps','isquios'], gluteos:['glúteos']};

function buildPlan(EX, prof){
  const equip = prof.equip || 'gym';
  if (equip === 'bw') return buildCalisPlan(EX, prof);
  const days = Math.min(6, Math.max(2, +prof.days || 3));
  const level = prof.level || 'beg';
  const goal = prof.goal || 'hipertrofia';
  const keys = SPLITS[days];
  const maxEx = MAX_EX[prof.duration || 60] || 6;
  const prio = (prof.priorities || []).flatMap(p => PRIORITY_MUSCLES[p] || []);
  const plan = {kind:'pesas', split: SPLIT_NAMES[days], goal, level, createdAt: new Date().toISOString(), days: []};
  keys.forEach(k => {
    const [name, slots] = T[k];
    const used = new Set();
    const items = [];
    for (const [pat, role, v] of slots) {
      if (items.length >= maxEx) break;
      let id = pick(EX, pat, v, equip, used, goal);
      if (!id) continue;
      // principiantes: sin ejercicios colgados de la barra en el core (exigen agarre y control avanzado)
      if (level === 'beg' && pat === 'core' && /^Hanging_/.test(id)) id = !used.has('Plank') && EX.Plank ? 'Plank' : (!used.has('Dead_Bug') && EX.Dead_Bug ? 'Dead_Bug' : id);
      used.add(id);
      const ex = EX[id];
      const pr = prescribe(goal, role, level, ex);
      if (prio.length && ex.m.some(m => prio.includes(m)) && role !== 'M') pr.sets += 1;
      items.push({ex: id, role, ...pr});
    }
    plan.days.push({id: k, name, items});
  });
  plan.why = explainPlan(plan, prof);
  return plan;
}

// ---------- Calistenia ----------
const LADDERS = {
  push: ['Pushups','Push-Ups_With_Feet_Elevated','Dips_-_Chest_Version','Handstand_Push-Ups'],
  pull: ['Scapular_Pull-Up','Inverted_Row','Chin-Up','Pullups','Muscle_Up'],
  legs: ['Bodyweight_Squat','Bodyweight_Walking_Lunge','Kettlebell_Pistol_Squat'],
  hinge: ['Butt_Lift_Bridge','Single_Leg_Glute_Bridge','Glute_Ham_Raise'],
  core: ['Dead_Bug','Plank','Hanging_Leg_Raise','Hanging_Pike'],
  arms: ['Push-Ups_-_Close_Triceps_Position','Dips_-_Triceps_Version'],
  power: ['Freehand_Jump_Squat','Front_Box_Jump','Knee_Tuck_Jump']
};
function ladderIndex(kind, n){
  n = +n || 0;
  if (kind === 'push') return n < 5 ? 0 : n < 15 ? 0 : n < 25 ? 1 : 2;
  if (kind === 'pull') return n === 0 ? 1 : n < 5 ? 2 : n < 12 ? 3 : 3;
  return 0;
}
function buildCalisPlan(EX, prof){
  const level = prof.level || 'beg';
  const goal = prof.goal || 'hipertrofia';
  const days = Math.min(5, Math.max(2, +prof.calisDays || +prof.days || 3));
  const pi = ladderIndex('push', prof.maxPush), li = ladderIndex('pull', prof.maxPull);
  const legI = level === 'beg' ? 0 : level === 'int' ? 1 : 2;
  const coreI = level === 'beg' ? 0 : level === 'int' ? 1 : 2;
  const lo = goal === 'fuerza' ? 4 : goal === 'resistencia' ? 12 : 6;
  const hi = goal === 'fuerza' ? 8 : goal === 'resistencia' ? 25 : 15;
  const sets = level === 'beg' ? 3 : 4;
  const it = (id, role, extra) => ({ex:id, role, sets: role==='A'?Math.max(2,sets-1):sets, lo: EX[id].u==='sec'?20:(EX[id].p==='plyo'?3:lo), hi: EX[id].u==='sec'?60:(EX[id].p==='plyo'?6:hi), rir: 2, rest: role==='M'?120:75, warm:0, ...(extra||{})});
  const A = {id:'CA', name:'Calistenia A', items:[
    it(LADDERS.push[pi],'M', pi===0 && (+prof.maxPush||0) < 5 ? {note:'Hacelas con manos elevadas (banco o pared) hasta lograr 3×8 en el piso.'} : null),
    it(LADDERS.pull[li],'M', li===2 && (+prof.maxPull||0) < 5 ? {note:'Si no completás reps, hacé negativas: subí con salto y bajá en 3–5 s.'} : null),
    it(LADDERS.legs[legI],'S'),
    it(LADDERS.core[coreI],'A'),
    it(LADDERS.arms[level==='beg'?0:1],'A')
  ]};
  const B = {id:'CB', name:'Calistenia B', items:[
    it(LADDERS.pull[Math.max(1,li)],'M'),
    it(LADDERS.push[Math.min(pi+ (level==='beg'?0:1), 3)],'M'),
    it(LADDERS.hinge[legI],'S'),
    it(LADDERS.legs[Math.min(legI+1,2)],'S'),
    it(LADDERS.core[Math.min(coreI+1,3)],'A')
  ]};
  const C = {id:'CC', name:'Calistenia C (potencia + habilidad)', items:[
    it(LADDERS.power[legI],'S'),
    it(LADDERS.push[Math.min(pi+1,3)],'M'),
    it(LADDERS.pull[Math.min(li+1,4)],'M', li+1>=4?{note:'Habilidad: practicá transiciones con pocas reps de calidad.'}:null),
    it(LADDERS.core[Math.min(coreI+2,3)],'A'),
    it('Side_Bridge','A')
  ]};
  const order = {2:[A,B],3:[A,B,C],4:[A,B,A,C],5:[A,B,C,A,B]}[days];
  const plan = {kind:'calis', split:'Calistenia ' + days + ' días', goal, level, createdAt:new Date().toISOString(),
    days: order.map((d,i)=>({...JSON.parse(JSON.stringify(d)), id: 'C' + (i+1)}))};
  plan.why = explainPlan(plan, prof);
  return plan;
}

// Siguiente paso en la escalera de calistenia
function nextProgression(exId){
  for (const k in LADDERS){ const L = LADDERS[k]; const i = L.indexOf(exId); if (i >= 0 && i < L.length - 1) return L[i+1]; }
  return null;
}
function prevProgression(exId){
  for (const k in LADDERS){ const L = LADDERS[k]; const i = L.indexOf(exId); if (i > 0) return L[i-1]; }
  return null;
}
function alternatives(EX, exId){
  const ex = EX[exId]; if (!ex) return [];
  return Object.values(EX).filter(e => e.id !== exId && (e.p === ex.p || (e.m[0] && e.m[0] === ex.m[0]))).map(e=>e.id);
}

// Volumen semanal: primarios 1 serie, secundarios 0,5
function weeklyVolume(EX, plan){
  const v = {};
  (plan.days||[]).forEach(d => d.items.forEach(it => {
    const ex = EX[it.ex]; if (!ex) return;
    ex.m.forEach(m => v[m] = (v[m]||0) + it.sets);
    ex.m2.forEach(m => v[m] = (v[m]||0) + it.sets * 0.5);
  }));
  return v;
}

function explainPlan(plan, prof){
  const g = GOALS[plan.goal] || GOALS.hipertrofia;
  const lines = [];
  const days = plan.days.length;
  lines.push({t:'División', b:`${plan.split}: con ${days} días cada músculo se entrena ${days>=4||days===3?'unas 2 veces':'2 veces'} por semana, la frecuencia que mejor reparte el volumen.`, r:['schoenfeld2016freq']});
  const M = g.M;
  lines.push({t:'Series y repeticiones', b:`Objetivo ${g.label.toLowerCase()}: básicos en ${M[1]}–${M[2]} reps y accesorios en rangos más altos. Las series se hacen cerca del fallo (RIR ${M[3]} en básicos), suficiente estímulo sin fatiga innecesaria.`, r:['schoenfeld2017load','refalo2023']});
  const vt = VOL_TARGET[plan.level || 'beg'];
  lines.push({t:'Volumen semanal', b:`Para nivel ${LEVEL_LABEL[plan.level||'beg'].toLowerCase()} apuntamos a ~${vt[0]}–${vt[1]} series efectivas por músculo grande por semana. Si te recuperás bien y te estancás, sumá 1–2 series.`, r:['schoenfeld2017vol']});
  lines.push({t:'Progresión', b:'Doble progresión: cuando completás el rango alto de reps en todas las series, la app sugiere subir el peso. Si caés por debajo del rango dos sesiones seguidas, sugiere bajar un 10% y reconstruir.', r:['kraemer2004','plotkin2022']});
  lines.push({t:'Descansos', b:`${M[4]>=150?'2–3,5 min':'1,5–2,5 min'} en básicos y 1–1,5 min en aislamiento. Descansar lo suficiente sostiene la calidad de cada serie.`, r:['grgic2018rest','schoenfeld2016rest']});
  if (plan.goal === 'recomp') lines.push({t:'Recomposición', b:'Mantené cargas pesadas aunque estés en déficit, proteína ~1,6–2,2 g/kg/día y 2–3 sesiones aeróbicas suaves por semana.', r:['morton2018','who2020']});
  if (plan.goal === 'salud') lines.push({t:'Salud', b:'Cumple con la recomendación de la OMS de fuerza al menos 2 días por semana. Combiná con 150–300 min de actividad aeróbica moderada.', r:['who2020']});
  if (plan.kind === 'calis') lines.push({t:'Calistenia', b:'Cada ejercicio es un escalón de una progresión. Al lograr todas las series en el rango alto, la app te propone la variante siguiente.', r:['kotarsky2018','calatayud2015']});
  return lines;
}

// ---------- Progresión ----------
function e1rm(kg, reps){ if (!kg || !reps) return 0; if (reps === 1) return kg; return kg * (1 + reps / 30); }
function roundTo(x, step){ return Math.round(x / step) * step; }
function stepFor(ex){ return ex.eq === 'dumbbell' ? 2 : ex.eq === 'kettlebell' ? 4 : 2.5; }

// history: array de sesiones previas de este ejercicio (más reciente primero): [{date, sets:[{kg,reps,rir,t}]}]
function suggest(ex, item, history, deload){
  const res = {kg:null, reps:item.hi, text:'', action:'first', next:null};
  const work = s => (s.sets||[]).filter(x => x.t !== 'w' && x.done !== false && x.reps > 0);
  const last = history[0] ? work(history[0]) : [];
  const isBW = ex.eq === 'bodyweight' || ex.eq === 'bands';
  if (!last.length) {
    res.text = isBW ? `Primera vez: hacé ${item.lo}–${item.hi} ${ex.u==='sec'?'segundos':'reps'} dejando ${item.rir} en reserva.` :
      `Primera vez: elegí un peso con el que llegues a ${item.hi} reps dejando ~${item.rir} en reserva. La próxima ajustamos.`;
    res.reps = item.lo; return res;
  }
  const kg = Math.max(...last.map(s => s.kg || 0));
  const allTop = last.length >= Math.min(item.sets, 2) && last.every(s => s.reps >= item.hi);
  const below = last.some(s => s.reps < item.lo);
  const prevBelow = history[1] ? work(history[1]).some(s => s.reps < item.lo) : false;
  if (deload) {
    res.kg = kg || null; res.reps = item.lo; res.action = 'deload';
    res.text = 'Semana de descarga: mismo peso, la mitad de series, dejando 3–4 reps en reserva.'; return res;
  }
  if (isBW) {
    if (allTop) {
      const nx = nextProgression(ex.id);
      res.action = 'level'; res.next = nx; res.reps = item.hi;
      res.text = ex.u === 'sec' ? `Llegaste a ${item.hi}s. Sumá 5–10 s o pasá a una variante más difícil.` :
        nx ? `Completaste el rango alto. Probá pasar a la siguiente progresión.` : `Completaste el rango alto: sumá peso (mochila/chaleco) o más reps.`;
    } else {
      const best = Math.max(...last.map(s=>s.reps));
      res.reps = Math.min(item.hi, best + 1); res.action = 'reps';
      res.text = `Apuntá a ${res.reps} ${ex.u==='sec'?'s':'reps'} por serie (1 más que la última vez).`;
    }
    return res;
  }
  if (allTop) {
    const st = stepFor(ex);
    const big = ['squat','hinge'].includes(ex.p) && ex.eq === 'barbell';
    const inc = Math.max(big ? 5 : st, roundTo(kg * 0.025, st));
    res.kg = +(kg + inc).toFixed(2); res.reps = item.lo; res.action = 'up';
    res.text = `Completaste ${item.hi} reps en todas las series: subí a ${fmtKg(res.kg)} kg y volvé a ${item.lo} reps.`;
  } else if (below && prevBelow) {
    const st = stepFor(ex);
    res.kg = Math.max(0, roundTo(kg * 0.9, st)); res.reps = item.lo + 1; res.action = 'down';
    res.text = `Dos sesiones por debajo de ${item.lo} reps: bajá a ${fmtKg(res.kg)} kg y reconstruí. Es normal, no es retroceso.`;
  } else {
    const best = Math.max(...last.filter(s=>s.kg===kg).map(s=>s.reps));
    res.kg = kg; res.reps = Math.min(item.hi, best + 1); res.action = 'reps';
    res.text = `Mismo peso (${fmtKg(kg)} kg), intentá ${res.reps} reps o 1 más en alguna serie.`;
  }
  return res;
}
function fmtKg(x){ return (Math.round(x * 100) / 100).toString().replace('.', ','); }

// Detectar necesidad de descarga: semanas entrenadas desde la última descarga y estancamientos
function deloadCheck(workouts, prof){
  const since = prof.lastDeload ? new Date(prof.lastDeload) : (prof.plan ? new Date(prof.plan.createdAt) : null);
  const weeks = new Set(workouts.filter(w => !since || new Date(w.date) > since).map(w => isoWeek(w.date)));
  return {weeks: weeks.size, recommend: weeks.size >= 6};
}
function isoWeek(d){
  const dt = new Date(d); const t = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(),0,1));
  return t.getUTCFullYear() + '-W' + String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2,'0');
}
function weekStart(d){ const x = new Date(d); x.setHours(0,0,0,0); const k = (x.getDay()+6)%7; x.setDate(x.getDate()-k); return x; }

// Texto educativo del objetivo de cada serie
function setPurpose(goal, role, idx, total, isWarm, unit){
  if (isWarm) return idx === 0 ? 'Aproximación ~50%: lubrica articulaciones y ensaya la técnica, sin fatiga.' : 'Aproximación ~75%: prepara al sistema nervioso para la carga real.';
  const last = idx === total - 1;
  if (unit === 'sec') return last ? 'Última serie: mantené la posición perfecta hasta que la técnica empiece a fallar.' : 'Sostené tensión con cuerpo alineado. Calidad antes que segundos.';
  const map = {
    fuerza: role==='M' ? 'Serie pesada: velocidad e intención máximas, técnica idéntica en cada rep. Dejá ~2 en reserva.' : 'Fuerza en el patrón: reps sólidas, sin llegar al fallo.',
    hipertrofia: role==='A' ? (last ? 'Última serie de aislamiento: podés llevarla al fallo, el riesgo es bajo.' : 'Aislamiento: controlá la bajada y buscá el estiramiento, a 1–2 del fallo.') : 'Serie efectiva: lo que cuenta son las últimas 5 reps cerca del fallo. Dejá 1–2 en reserva.',
    recomp: 'Mantené la carga alta aunque estés en déficit: es la señal que protege tu músculo.',
    salud: 'Esfuerzo moderado: terminá sintiendo que podías hacer 2–3 más. Constancia > intensidad.',
    resistencia: 'Reps altas con descanso corto: entrenás la tolerancia a la fatiga local.'
  };
  return map[goal] || map.hipertrofia;
}

// ---------- Running ----------
function paceStr(secPerKm){ if (!isFinite(secPerKm) || secPerKm <= 0) return '–'; const m = Math.floor(secPerKm/60), s = Math.round(secPerKm%60); return `${m}:${String(s===60?0:s).padStart(2,'0')}`; }
function durStr(sec){ sec = Math.round(sec||0); const h = Math.floor(sec/3600), m = Math.floor(sec%3600/60), s = sec%60; return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`; }
function parseDur(str){ const p = String(str).trim().replace(/\s/g,'').split(/[:.,'h]/).filter(x => x !== '').map(Number); if (p.some(isNaN)) return 0; return p.length===3 ? p[0]*3600+p[1]*60+p[2] : p.length===2 ? p[0]*60+p[1] : p[0]*60; }
function riegel(t1, d1, d2){ return t1 * Math.pow(d2/d1, 1.06); }
function hrMax(age){ return age ? Math.round(208 - 0.7 * age) : null; }
function hrZones(age){ const m = hrMax(age); if (!m) return null; return [[.5,.6],[.6,.7],[.7,.8],[.8,.9],[.9,1]].map(([a,b],i)=>({z:i+1,lo:Math.round(m*a),hi:Math.round(m*b)})); }

function haversine(a, b){ const R = 6371, toR = x => x*Math.PI/180; const dLa = toR(b[0]-a[0]), dLo = toR(b[1]-a[1]); const h = Math.sin(dLa/2)**2 + Math.cos(toR(a[0]))*Math.cos(toR(b[0]))*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }

// pts: [{lat,lon,ele,time(ms)}]
function analyzeTrack(pts){
  let dist = 0, gain = 0; const splits = []; let nextKm = 1, lastSplitT = pts[0] && pts[0].time;
  for (let i = 1; i < pts.length; i++){
    const d = haversine([pts[i-1].lat,pts[i-1].lon],[pts[i].lat,pts[i].lon]);
    dist += d;
    if (pts[i].ele != null && pts[i-1].ele != null && pts[i].ele > pts[i-1].ele) gain += pts[i].ele - pts[i-1].ele;
    if (dist >= nextKm && pts[i].time && lastSplitT) { splits.push(Math.round((pts[i].time - lastSplitT)/1000)); lastSplitT = pts[i].time; nextKm++; }
  }
  const t0 = pts[0] && pts[0].time, t1 = pts[pts.length-1] && pts[pts.length-1].time;
  const step = Math.max(1, Math.ceil(pts.length / 300));
  const track = pts.filter((_, i) => i % step === 0 || i === pts.length-1).map(p => [+p.lat.toFixed(5), +p.lon.toFixed(5)]);
  return {distKm: +dist.toFixed(2), durSec: t0 && t1 ? Math.round((t1 - t0)/1000) : 0, elev: Math.round(gain), splits, track, date: t0 ? new Date(t0).toISOString() : null};
}

const RUN_GOALS = {
  salud:{label:'Salud / base aeróbica', peak:25, long:8, weeks:8},
  '5k':{label:'5 K', peak:30, long:10, weeks:8},
  '10k':{label:'10 K', peak:40, long:14, weeks:10},
  '21k':{label:'Media maratón (21 K)', peak:50, long:20, weeks:12},
  '42k':{label:'Maratón (42 K)', peak:65, long:32, weeks:16}
};
// Plan de running: progresión ≤10%, descarga cada 4ª semana, taper final, 80/20
function buildRunPlan(opts){
  const g = RUN_GOALS[opts.goal] || RUN_GOALS['5k'];
  const weeks = Math.max(4, Math.min(20, +opts.weeks || g.weeks));
  const days = Math.max(2, Math.min(6, +opts.days || 3));
  let base = Math.max(5, +opts.currentKm || 10);
  const peak = Math.max(base, g.peak);
  const taper = opts.goal === 'salud' ? 0 : (weeks >= 12 ? 2 : 1);
  const out = [];
  let vol = base;
  for (let w = 1; w <= weeks; w++){
    let wk, label = 'Construcción';
    if (w > weeks - taper) { wk = vol * (w === weeks ? 0.55 : 0.75); label = w === weeks ? 'Semana de carrera' : 'Afinamiento'; }
    else if (w % 4 === 0) { wk = vol * 0.75; label = 'Recuperación'; }
    else { if (w > 1) vol = Math.min(peak, vol * 1.08); wk = vol; }
    wk = Math.round(wk * 2) / 2;
    out.push({week: w, label, km: wk, sessions: weekSessions(wk, days, g, opts.goal, label, w === weeks)});
  }
  return {goal: opts.goal, label: g.label, days, weeks, startKm: base, createdAt: new Date().toISOString(), startDate: opts.startDate || new Date().toISOString().slice(0,10), plan: out};
}
function weekSessions(km, days, g, goal, label, raceWeek){
  const longKm = Math.min(g.long, Math.round(km * (days <= 3 ? 0.35 : 0.3) * 2) / 2);
  const quality = days >= 3 && label !== 'Recuperación' && goal !== 'salud';
  const S = [];
  let rest = km - longKm;
  if (quality){
    const q = Math.round(Math.min(rest * 0.35, 10) * 2) / 2;
    const isTempo = ['10k','21k','42k'].includes(goal);
    S.push({type: isTempo ? 'tempo' : 'series', km: q,
      desc: isTempo ? `Calentá 10–15 min suave, ${Math.max(10, Math.round(q*3))} min a ritmo "cómodamente duro" (RPE 7, podés decir pocas palabras), enfriá.` :
        `Calentá 10–15 min, ${q >= 6 ? '6' : '5'} × 3 min fuerte (RPE 8) con 2 min trotando suave, enfriá.`});
    rest -= q;
  }
  const easyN = Math.max(1, days - 1 - (quality ? 1 : 0));
  for (let i = 0; i < easyN; i++) S.push({type:'suave', km: Math.max(2, Math.round(rest / easyN * 2) / 2), desc:'Rodaje suave: tenés que poder conversar en frases completas (RPE 3–4, zona 2).'});
  if (raceWeek && goal !== 'salud') S.push({type:'carrera', km: ({'5k':5,'10k':10,'21k':21.1,'42k':42.2})[goal], desc:'Día de carrera. Empezá algo más lento que tu ritmo objetivo los primeros km.'});
  else S.push({type:'largo', km: longKm, desc:'Fondo: ritmo suave y constante. Es la sesión más importante de la semana para la resistencia.'});
  return S;
}
const RUN_TYPES = {suave:'Rodaje suave', largo:'Fondo / largo', tempo:'Tempo / umbral', series:'Series / intervalos', carrera:'Carrera', otro:'Otro'};

G.Logic = {EQUIP_SETS, PREF, GOALS, LEVEL_LABEL, VOL_TARGET, SPLIT_NAMES, buildPlan, buildCalisPlan, prescribe, nextProgression, prevProgression, alternatives,
  weeklyVolume, e1rm, suggest, fmtKg, deloadCheck, isoWeek, weekStart, setPurpose, paceStr, durStr, parseDur, riegel, hrMax, hrZones, analyzeTrack,
  buildRunPlan, RUN_GOALS, RUN_TYPES, LADDERS};
})(typeof window !== 'undefined' ? window : globalThis);

// ---------- Ciclismo (plan por tiempo, 80/20) ----------
(function(G){
const RIDE_GOALS = {
  salud:{label:'Salud / base aeróbica', peakH:5, longH:2, weeks:8},
  fondo:{label:'Fondos largos / cicloturismo', peakH:8, longH:4, weeks:10},
  granfondo:{label:'Gran fondo (100+ km)', peakH:10, longH:5, weeks:12},
  velocidad:{label:'Más velocidad / potencia', peakH:7, longH:2.5, weeks:8}
};
function buildRidePlan(o){
  const g = RIDE_GOALS[o.goal] || RIDE_GOALS.salud;
  const weeks = Math.max(4, Math.min(20, +o.weeks || g.weeks));
  const days = Math.max(2, Math.min(6, +o.days || 3));
  let vol = Math.max(1.5, +o.currentH || 3); const peak = Math.max(vol, g.peakH);
  const out = [];
  for (let w = 1; w <= weeks; w++){
    let h, label = 'Construcción';
    if (w % 4 === 0) { h = vol * 0.7; label = 'Recuperación'; }
    else { if (w > 1) vol = Math.min(peak, vol * 1.08); h = vol; }
    h = Math.round(h * 4) / 4;
    const longH = Math.min(g.longH, Math.round(h * 0.4 * 4) / 4);
    const S = [];
    let rest = h - longH;
    const quality = days >= 3 && label !== 'Recuperación' && o.goal !== 'salud';
    if (quality) {
      const q = Math.min(1.5, Math.round(rest * 0.35 * 4) / 4);
      S.push({type:'intervalos', min: Math.round(q*60), desc: o.goal === 'velocidad' ? 'Calentá 15 min, 5 × 4 min muy fuerte (RPE 8–9) con 4 min suaves, enfriá.' : 'Calentá 15 min, 3 × 10–12 min a ritmo sostenido exigente (RPE 7, "sweet spot") con 5 min suaves, enfriá.'});
      rest -= q;
    }
    const easyN = Math.max(1, days - 1 - (quality ? 1 : 0));
    for (let i = 0; i < easyN; i++) S.push({type:'suave', min: Math.max(30, Math.round(rest / easyN * 60 / 5) * 5), desc:'Salida suave en zona 2: podés conversar, cadencia ágil (85–95 rpm).'});
    S.push({type:'largo', min: Math.round(longH * 60), desc:'Fondo a ritmo suave y constante. Comé y tomá algo cada 30–45 min si pasa de 90 min.'});
    out.push({week: w, label, hours: h, sessions: S});
  }
  return {goal:o.goal, label:g.label, days, weeks, startH: +o.currentH || 3, createdAt:new Date().toISOString(), startDate: o.startDate || new Date().toISOString().slice(0,10), plan: out};
}
const RIDE_TYPES = {suave:'Salida suave', largo:'Fondo', intervalos:'Intervalos', carrera:'Carrera / evento', rodillo:'Rodillo / indoor', otro:'Otro'};
Object.assign(G.Logic, {buildRidePlan, RIDE_GOALS, RIDE_TYPES});
})(typeof window !== 'undefined' ? window : globalThis);
