// Cuerpo: peso, IMC, composición corporal (balanza de bioimpedancia) y medidas con cinta.
// Indicadores con puntos de corte validados (OMS, Ashwell, Gallagher) y fórmulas publicadas (Hodgdon-Beckett, Mifflin-St Jeor).
// Lo mínimo sigue siendo un toque: el peso. Todo lo demás es opcional.
'use strict';
Object.assign(window.REFS, {
  who2000: 'World Health Organization. Obesity: preventing and managing the global epidemic. WHO Technical Report Series 894. Geneva: WHO; 2000.',
  who2008: 'World Health Organization. Waist circumference and waist–hip ratio: report of a WHO expert consultation. Geneva: WHO; 2008.',
  ashwell2012: 'Ashwell M, Gunn P, Gibson S. Waist-to-height ratio is a better screening tool than waist circumference and BMI for adult cardiometabolic risk factors: systematic review and meta-analysis. Obes Rev. 2012;13(3):275-286.',
  gallagher2000: 'Gallagher D, Heymsfield SB, Heo M, et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. Am J Clin Nutr. 2000;72(3):694-701.',
  hodgdon1984: 'Hodgdon JA, Beckett MB. Prediction of percent body fat for U.S. Navy men and women from body circumferences and height. Naval Health Research Center, Report No. 84-11/84-29; 1984.',
  mifflin1990: 'Mifflin MD, St Jeor ST, Hill LA, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.',
  kouri1995: 'Kouri EM, Pope HG Jr, Katz DL, Oliva P. Fat-free mass index in users and nonusers of anabolic-androgenic steroids. Clin J Sport Med. 1995;5(4):223-228.',
  kyle2004: 'Kyle UG, Bosaeus I, De Lorenzo AD, et al. Bioelectrical impedance analysis—part II: utilization in clinical practice. Clin Nutr. 2004;23(6):1430-1453.',
  helms2014: 'Helms ER, Aragon AA, Fitschen PJ. Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation. J Int Soc Sports Nutr. 2014;11:20.'
});

// ---------- cálculos ----------
const BODY_F = {kg: 'Peso', fat: 'Grasa', muscle: 'Masa muscular', water: 'Agua', visceral: 'Grasa visceral', bone: 'Masa ósea', bmr: 'Metabolismo basal', waist: 'Cintura', hip: 'Cadera', neck: 'Cuello'};
const bodyOf = pid => Store.list('body', pid).sort((a, b) => a.date.localeCompare(b.date));
const lastWith = (list, k) => { for (let i = list.length - 1; i >= 0; i--) if (list[i][k] != null) return list[i]; return null; };
function bmiOf(kg, cm){ return kg && cm ? kg / ((cm / 100) ** 2) : null; }
function bmiCat(b){ // OMS 2000, adultos
  if (b == null) return null;
  if (b < 18.5) return ['Bajo peso', 'warn']; if (b < 25) return ['Normal', 'ok']; if (b < 30) return ['Sobrepeso', 'warn']; if (b < 35) return ['Obesidad I', 'bad']; if (b < 40) return ['Obesidad II', 'bad']; return ['Obesidad III', 'bad'];
}
function fatRanges(sex, age){ // Gallagher 2000: [bajo, saludable hasta, alto hasta] (desde ahí, muy alto)
  if (!sex || !age || age < 20) return null;
  const T = {f: [[39, 21, 32, 38], [59, 23, 33, 39], [200, 24, 35, 41]], m: [[39, 8, 19, 24], [59, 11, 21, 27], [200, 13, 24, 29]]}[sex];
  const r = T.find(x => age <= x[0]); return {lo: r[1], hi: r[2], over: r[3]};
}
function fatCat(f, sex, age){
  const r = fatRanges(sex, age); if (f == null || !r) return null;
  if (f < r.lo) return ['Baja', 'warn']; if (f <= r.hi) return ['Saludable', 'ok']; if (f <= r.over) return ['Alta', 'warn']; return ['Muy alta', 'bad'];
}
function waistCat(w, sex){ // OMS 2008
  if (!w || !sex) return null; const [a, b] = sex === 'f' ? [80, 88] : [94, 102];
  return w >= b ? ['Riesgo muy aumentado', 'bad'] : w >= a ? ['Riesgo aumentado', 'warn'] : ['Sin riesgo aumentado', 'ok'];
}
function whtrCat(r){ if (!r) return null; return r >= .6 ? ['Riesgo alto', 'bad'] : r >= .5 ? ['Riesgo aumentado', 'warn'] : r < .4 ? ['Bajo', 'warn'] : ['Saludable', 'ok']; } // Ashwell 2012
function whrCat(r, sex){ if (!r || !sex) return null; return r >= (sex === 'f' ? .85 : .90) ? ['Riesgo aumentado', 'warn'] : ['Sin riesgo aumentado', 'ok']; } // OMS 2008
function navyFat(sex, cm, waist, neck, hip){ // Hodgdon-Beckett 1984, medidas en cm
  if (!sex || !cm || !waist || !neck) return null;
  let v;
  if (sex === 'm') { if (waist - neck <= 0) return null; v = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(cm)) - 450; }
  else { if (!hip || waist + hip - neck <= 0) return null; v = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(cm)) - 450; }
  return v > 2 && v < 70 ? Math.round(v * 10) / 10 : null;
}
function mifflin(sex, kg, cm, age){ if (!sex || !kg || !cm || !age) return null; return Math.round(10 * kg + 6.25 * cm - 5 * age + (sex === 'm' ? 5 : -161)); }
function ffmiOf(kg, fat, cm){ if (!kg || fat == null || !cm) return null; const h = cm / 100; const v = kg * (1 - fat / 100) / (h * h); return {v: Math.round(v * 10) / 10, norm: Math.round((v + 6.1 * (1.8 - h)) * 10) / 10}; } // Kouri 1995
const avg7 = (list, k, date) => { const from = new Date(date + 'T12:00'); from.setDate(from.getDate() - 6); const w = list.filter(x => x[k] != null && new Date(x.date + 'T12:00') >= from && x.date <= date); return w.length ? w.reduce((t, x) => t + x[k], 0) / w.length : null; };
function bodyNow(p){
  const L1 = bodyOf(p.id); const lk = lastWith(L1, 'kg');
  const kg = lk ? avg7(L1, 'kg', lk.date) : (p.weight || null);
  const cm = p.height || null; const age = p.age || null; const sex = p.sex || null;
  const lf = lastWith(L1, 'fat'), lm = lastWith(L1, 'muscle'), lw = lastWith(L1, 'waist'), lh = lastWith(L1, 'hip'), ln = lastWith(L1, 'neck'), lv = lastWith(L1, 'visceral');
  const navy = navyFat(sex, cm, lw && lw.waist, ln && ln.neck, lh && lh.hip);
  const fat = lf ? lf.fat : navy; const fatSrc = lf ? 'balanza' : navy != null ? 'medidas' : null;
  const bmi = bmiOf(kg, cm);
  return {list: L1, kg, lastKg: lk, cm, age, sex, bmi, fat, fatSrc, muscle: lm && lm.muscle, waist: lw && lw.waist, hip: lh && lh.hip, neck: ln && ln.neck, visceral: lv && lv.visceral,
    whtr: lw && cm ? Math.round(lw.waist / cm * 100) / 100 : null, whr: lw && lh ? Math.round(lw.waist / lh.hip * 100) / 100 : null,
    ffmi: kg && fat != null ? ffmiOf(kg, fat, cm) : null, bmr: mifflin(sex, kg, cm, age), bmrScale: (lastWith(L1, 'bmr') || {}).bmr};
}
// cambio en las últimas 4 semanas (promedios de 7 días)
function bodyTrend(list){
  const lk = lastWith(list, 'kg'); if (!lk) return null;
  const d0 = new Date(lk.date + 'T12:00'); d0.setDate(d0.getDate() - 28); const back = localDay(d0);
  const old = list.filter(x => x.kg != null && x.date <= back).pop(); if (!old) return null;
  const now = avg7(list, 'kg', lk.date), then = avg7(list, 'kg', old.date);
  const weeks = Math.max(1, (new Date(lk.date) - new Date(old.date)) / (7 * 864e5));
  const out = {dKg: now - then, pctWeek: (now - then) / then * 100 / weeks, weeks};
  const fN = lastWith(list, 'fat'), fO = list.filter(x => x.fat != null && x.date <= back).pop();
  if (fN && fO && fN.kg && fO.kg) out.dFatKg = fN.kg * fN.fat / 100 - fO.kg * fO.fat / 100;
  const mN = lastWith(list, 'muscle'), mO = list.filter(x => x.muscle != null && x.date <= back).pop();
  if (mN && mO) out.dMuscle = mN.muscle - mO.muscle;
  return out;
}
const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtNum(Math.abs(v), d);

// ---------- tarjeta en Progreso ----------
function bodyCard(p){
  const b = bodyNow(p), tr = bodyTrend(b.list);
  const metrics = [['kg', 'Peso', 'kg'], ['fat', 'Grasa', '%'], ['muscle', 'Músculo', 'kg'], ['waist', 'Cintura', 'cm']].filter(([k]) => b.list.filter(x => x[k] != null).length > 1);
  if (!metrics.some(m => m[0] === S.bodyM)) S.bodyM = metrics.length ? metrics[0][0] : null;
  if (S.bodyM) {
    const k = S.bodyM, pts = b.list.filter(x => x[k] != null);
    chartLater('bcch', () => {
      const ds = [{label: 'Registro', data: pts.map(x => x[k]), borderColor: 'transparent', backgroundColor: cssv('--muted'), pointRadius: 3, showLine: false}];
      if (k === 'kg') ds.push({label: 'Promedio 7 días', data: pts.map(x => +avg7(b.list, 'kg', x.date).toFixed(1)), borderColor: cssv('--fg'), pointRadius: 0, borderWidth: 2, tension: .3});
      else ds[0] = {label: BODY_F[k], data: pts.map(x => x[k]), borderColor: cssv('--fg'), backgroundColor: cssv('--fg'), pointRadius: 3, borderWidth: 2, tension: .3};
      return {type: 'line', data: {labels: pts.map(x => fmtDate(x.date + 'T12:00', {day: 'numeric', month: 'numeric'})), datasets: ds},
        options: baseOpts({scales: {x: {grid: {display: false}, ticks: {maxTicksLimit: 6}}, y: {beginAtZero: false, ticks: {maxTicksLimit: 4}}}, plugins: {legend: {display: k === 'kg', position: 'bottom', labels: {boxWidth: 10}}}})};
    });
  }
  const pill = c => c ? `<span class="pill ${c[1]}" style="font-size:11px">${c[0]}</span>` : '';
  const kpi = (v, label, c) => `<div class="kpi"><b>${v}</b><span>${label}</span>${c ? `<div style="margin-top:4px">${pill(c)}</div>` : ''}</div>`;
  const kp = [];
  kp.push(kpi(b.kg ? fmtNum(b.kg, 1) : '–', 'kg (prom. 7 días)'));
  kp.push(kpi(b.bmi ? fmtNum(b.bmi, 1) : '–', b.cm ? 'IMC' : 'IMC (falta altura)', b.age >= 18 ? bmiCat(b.bmi) : null));
  if (b.fat != null) kp.push(kpi(fmtNum(b.fat, 1) + '%', 'grasa' + (b.fatSrc === 'medidas' ? ' (por medidas)' : ''), fatCat(b.fat, b.sex, b.age)));
  if (b.muscle != null) kp.push(kpi(fmtNum(b.muscle, 1), 'kg de músculo'));
  if (b.whtr) kp.push(kpi(fmtNum(b.whtr, 2), 'cintura / altura', whtrCat(b.whtr)));
  if (kp.length % 2) kp.push(kpi(b.waist ? fmtNum(b.waist, 0) : '–', b.waist ? 'cm de cintura' : 'cintura (cinta)', b.waist ? waistCat(b.waist, b.sex) : null));
  let trTxt = '';
  if (tr) {
    const parts = [`peso ${sgn(tr.dKg)} kg`]; if (tr.dFatKg != null) parts.push(`grasa ${sgn(tr.dFatKg)} kg`); if (tr.dMuscle != null) parts.push(`músculo ${sgn(tr.dMuscle)} kg`);
    trTxt = `<p class="small">Últimas ${Math.round(tr.weeks)} semanas: <b>${parts.join(' · ')}</b>.</p>`;
    if (tr.dFatKg != null && tr.dMuscle != null && tr.dFatKg < -.2 && tr.dMuscle > .1) trTxt += `<p class="small" style="color:var(--ok)">Bajás grasa y sumás músculo: recomposición corporal. ¡Seguí así!</p>`;
    else if (tr.pctWeek < -1) trTxt += `<p class="small" style="color:var(--warn)">Estás bajando más de 1% del peso por semana: a ese ritmo se pierde más músculo. Para cuidarlo, apuntá a 0,5–1% por semana (Helms 2014).</p>`;
  }
  return `<div class="card stack-s"><div class="row between"><h3>Cuerpo</h3><div class="row" style="gap:6px"><button class="btn sm ghost" data-act="sheet" data-arg="bodyInfo">Qué significa</button><button class="btn sm" data-act="bodyAdd">+ Medición</button></div></div>
    <div class="row"><input id="bwin" type="text" inputmode="decimal" autocomplete="off" placeholder="kg hoy" style="max-width:140px" aria-label="Peso de hoy en kg"><button class="btn" data-act="addBW">Agregar</button></div>
    <div class="kpis" style="grid-template-columns:repeat(2,1fr)">${kp.join('')}</div>
    ${trTxt}
    ${metrics.length ? `<div class="chips">${metrics.map(([k, l, u]) => `<button class="chip" data-act="bodyM" data-arg="${k}" aria-pressed="${S.bodyM === k}">${l} (${u})</button>`).join('')}</div><div class="chartbox"><canvas id="bcch"></canvas></div>` : ''}
    ${!b.cm ? '<p class="small muted">Cargá tu altura en "+ Medición" para ver el IMC.</p>' : ''}
    <p class="tiny muted">Pesate siempre igual: al levantarte, después de ir al baño, antes de comer o tomar y sin haber entrenado. La balanza de bioimpedancia cambia con el agua del cuerpo: mirá la tendencia, no un día (Kyle 2004).</p></div>`;
}
App.acts.bodyM = el => { S.bodyM = el.dataset.arg; App.render(); };
// reemplaza la tarjeta "Peso corporal" de Progreso
function cutCard(html, mark){
  const i = html.indexOf(mark); if (i < 0) return null;
  let depth = 0, j = i; const re = /<\/?div\b/g; re.lastIndex = i;
  let m; while ((m = re.exec(html))) { depth += m[0] === '<div' ? 1 : -1; if (depth === 0) { j = html.indexOf('>', m.index) + 1; break; } }
  return [i, j];
}
const _progBody = App.views.prog;
App.views.prog = (p) => {
  const html = _progBody(p);
  const r = cutCard(html, '<div class="card stack-s"><h3>Peso corporal</h3>');
  return r ? html.slice(0, r[0]) + bodyCard(p) + html.slice(r[1]) : html;
};
// el peso rápido no borra lo demás que cargaste ese día
App.acts.addBW = async () => {
  const v = num($('#bwin').value); if (!v || v < 20 || v > 400) { toast('Ingresá un peso válido en kg'); return; }
  const p = curProfile(), id = p.id + '_' + todayISO();
  await Store.put('body', {...(Store.get('body', id) || {}), id, pid: p.id, date: todayISO(), kg: v});
  await Store.put('profiles', {...p, weight: v}); App.render(); toast('Peso registrado');
};

// ---------- cargar una medición ----------
const BODY_FIELDS = {
  main: [['kg', 'Peso (kg)', 20, 400], ['fat', 'Grasa corporal (%)', 2, 70], ['muscle', 'Masa muscular (kg)', 5, 150]],
  scale: [['water', 'Agua corporal (%)', 20, 80], ['visceral', 'Grasa visceral (nivel)', 1, 60], ['bone', 'Masa ósea (kg)', .5, 8], ['bmr', 'Metabolismo basal (kcal)', 600, 5000]],
  tape: [['waist', 'Cintura (cm)', 40, 200], ['hip', 'Cadera (cm)', 50, 200], ['neck', 'Cuello (cm)', 20, 70]],
  seg: [['segAI', 'Brazo izquierdo', .3, 15], ['segAD', 'Brazo derecho', .3, 15], ['segPI', 'Pierna izquierda', 2, 40], ['segPD', 'Pierna derecha', 2, 40], ['segT', 'Tronco', 5, 80]]
};
App.acts.bodyAdd = () => {
  const p = curProfile(), d = todayISO(), prev = Store.get('body', p.id + '_' + d) || {};
  const f = {date: d, height: p.height || '', sex: p.sex || ''};
  Object.values(BODY_FIELDS).flat().forEach(([k]) => f[k] = prev[k] != null ? String(prev[k]).replace('.', ',') : '');
  App.openSheet('bodyAdd', {f});
};
App.views.sh_bodyAdd = (p, sh) => {
  const f = sh.f;
  const inp = ([k, l]) => `<div class="field"><label for="bd_${k}">${l}</label><input id="bd_${k}" type="text" inputmode="decimal" autocomplete="off" value="${esc(f[k])}" data-bind="bd" data-k="${k}"></div>`;
  const hc = typeof HC !== 'undefined' && HC.plugin && HC.on && !ls.get('bl_hc_body', false);
  return `<h2>Medición</h2><p class="small muted">Todo es opcional menos lo que quieras seguir. Cargá lo que te da tu balanza o una cinta métrica.</p>
  <div class="grid2"><div class="field"><label for="bd_date">Fecha</label><input id="bd_date" type="date" value="${esc(f.date)}" data-bind="bd" data-k="date"></div>
    <div class="field"><label for="bd_height">Altura (cm)</label><input id="bd_height" type="number" inputmode="numeric" value="${esc(f.height)}" data-bind="bd" data-k="height"></div></div>
  ${!p.sex ? `<div class="field"><label>Sexo (para los rangos de referencia)</label><div class="chips">${[['m', 'Masculino'], ['f', 'Femenino']].map(([v, l]) => `<button class="chip" data-act="bdSex" data-arg="${v}" aria-pressed="${f.sex === v}">${l}</button>`).join('')}</div></div>` : ''}
  <div class="grid2">${BODY_FIELDS.main.map(inp).join('')}</div>
  <details class="card flat"><summary>Más datos de la balanza</summary><div class="grid2" style="margin-top:8px">${BODY_FIELDS.scale.map(inp).join('')}</div>
    <details style="margin-top:6px"><summary class="small">Músculo por segmento (kg)</summary><div class="grid2" style="margin-top:6px">${BODY_FIELDS.seg.map(inp).join('')}</div>
    <p class="tiny muted">Lo dan las balanzas con manijas (8 electrodos). Sirve para ver diferencias entre izquierda y derecha.</p></details></details>
  <details class="card flat"><summary>Medidas con cinta</summary><div class="grid2" style="margin-top:8px">${BODY_FIELDS.tape.map(inp).join('')}</div>
    <p class="tiny muted">Cintura: de pie, al final de una exhalación normal, a mitad de camino entre la última costilla y el hueso de la cadera. Cadera: en la parte más ancha de los glúteos. Cuello: justo debajo de la nuez. Cinta horizontal, sin apretar (OMS 2008).</p></details>
  ${hc ? `<button class="btn sm" data-act="hcBodyPerm">Traer grasa corporal y altura de Health Connect</button>` : ''}
  <button class="btn primary" data-act="bodySave">Guardar</button>`;
};
App.binds.bd = el => { S.sheet.f[el.dataset.k] = el.value; };
App.acts.bdSex = el => { S.sheet.f.sex = el.dataset.arg; App.renderOverlay(); };
App.acts.bodySave = async () => {
  const p = curProfile(), f = S.sheet.f;
  if (!f.date) { toast('Elegí la fecha'); return; }
  const id = p.id + '_' + f.date; const out = {...(Store.get('body', id) || {}), id, pid: p.id, date: f.date};
  for (const [k, l, lo, hi] of Object.values(BODY_FIELDS).flat()) {
    if (f[k] === '' || f[k] == null) { delete out[k]; continue; }
    const v = num(f[k]); if (isNaN(v) || v < lo || v > hi) { toast(`${l}: revisá el valor`); return; }
    out[k] = Math.round(v * 10) / 10;
  }
  if (Object.keys(out).filter(k => !['id', 'pid', 'date', 'src'].includes(k)).length === 0) { toast('Cargá al menos un dato'); return; }
  await Store.put('body', out);
  const h = num(f.height), upd = {};
  if (h && h >= 100 && h <= 250 && h !== p.height) upd.height = h;
  if (f.sex && f.sex !== p.sex) upd.sex = f.sex;
  if (out.kg && f.date === todayISO()) upd.weight = out.kg;
  if (Object.keys(upd).length) await Store.put('profiles', {...p, ...upd});
  App.closeSheet(); App.render(); toast('Medición guardada');
};
App.acts.hcBodyPerm = async () => {
  try { await HC.plugin.requestAuthorization({read: HC.READ, write: [], requestHistoryAccess: true}); ls.set('bl_hc_body', true); App.closeSheet(); await hcSync(true); }
  catch(e){ toast('No se pudo pedir el permiso'); }
};

// ---------- qué significa cada número ----------
App.views.sh_bodyInfo = (p) => {
  const b = bodyNow(p); const fr = fatRanges(b.sex, b.age);
  const row = (name, val, cat, txt) => `<div class="card flat stack-s"><div class="row between"><b>${name}</b><span class="row" style="gap:6px"><b class="num">${val}</b>${cat ? `<span class="pill ${cat[1]}">${cat[0]}</span>` : ''}</span></div><p class="small muted">${txt}</p></div>`;
  const need = [];
  if (!b.cm) need.push('altura'); if (!b.sex) need.push('sexo'); if (!b.age) need.push('edad');
  return `<h2>Tu cuerpo en números</h2>
  ${need.length ? `<div class="banner small"><div>Para ver todos los rangos falta: ${need.join(', ')}. La altura y el sexo se cargan en "+ Medición"; la edad, en tu perfil.</div></div>` : ''}
  ${row('Índice de masa corporal (IMC)', b.bmi ? fmtNum(b.bmi, 1) : '–', b.age >= 18 ? bmiCat(b.bmi) : null, 'Peso dividido por la altura al cuadrado. Normal: 18,5 a 24,9 (OMS). Ojo: no distingue músculo de grasa; en personas musculosas puede marcar sobrepeso sin exceso de grasa. Por eso conviene mirarlo junto con la cintura o el % de grasa.')}
  ${row('Grasa corporal', b.fat != null ? fmtNum(b.fat, 1) + '%' : '–', fatCat(b.fat, b.sex, b.age), `${fr ? `Rango saludable para tu edad y sexo: ${fr.lo}–${fr.hi}% (Gallagher 2000).` : 'El rango saludable depende de la edad y el sexo (Gallagher 2000).'} ${b.fatSrc === 'medidas' ? 'Estimado con cintura, cuello' + (b.sex === 'f' ? ', cadera' : '') + ' y altura (fórmula de la Marina de EE. UU., Hodgdon y Beckett 1984; error típico de ±3–4 puntos).' : 'Las balanzas de bioimpedancia pueden errar varios puntos contra un DEXA: sirven para ver cómo cambia en semanas.'}`)}
  ${row('Cintura', b.waist ? fmtNum(b.waist, 0) + ' cm' : '–', waistCat(b.waist, b.sex), `Mide la grasa abdominal, la que más se relaciona con riesgo cardiovascular y diabetes. Riesgo aumentado desde ${b.sex === 'f' ? '80 cm (muy aumentado desde 88)' : b.sex === 'm' ? '94 cm (muy aumentado desde 102)' : '94 cm en hombres y 80 en mujeres'} (OMS 2008).`)}
  ${row('Cintura / altura', b.whtr ? fmtNum(b.whtr, 2) : '–', whtrCat(b.whtr), 'Meta simple: que tu cintura mida menos de la mitad de tu altura (menos de 0,5). Predice riesgo cardiometabólico mejor que el IMC y sirve igual para hombres y mujeres (Ashwell 2012).')}
  ${row('Cintura / cadera', b.whr ? fmtNum(b.whr, 2) : '–', whrCat(b.whr, b.sex), `Riesgo aumentado desde ${b.sex === 'f' ? '0,85' : b.sex === 'm' ? '0,90' : '0,90 en hombres y 0,85 en mujeres'} (OMS 2008).`)}
  ${b.muscle != null ? row('Masa muscular', fmtNum(b.muscle, 1) + ' kg', null, 'Cada marca de balanza la calcula distinto (algunas incluyen agua y órganos), así que no la compares con otra balanza: compará tus propios números en el tiempo. Si entrenás fuerza y comés suficiente proteína, debería subir de a poco.') : ''}
  ${b.ffmi ? row('Índice de masa libre de grasa (FFMI)', fmtNum(b.ffmi.norm, 1), null, `Tu masa sin grasa según tu altura (ajustado a 1,80 m). En un estudio con hombres que entrenaban fuerza sin anabólicos, el promedio rondó 20 y el máximo fue cerca de 25 (Kouri 1995). En mujeres los valores típicos son más bajos.`) : ''}
  ${b.visceral != null ? row('Grasa visceral', 'nivel ' + fmtNum(b.visceral, 0), null, 'Grasa alrededor de los órganos. La escala depende de la marca: en Tanita, de 1 a 12 es saludable y desde 13, alto. Seguí tu tendencia y, sobre todo, tu cintura.') : ''}
  ${(() => { const ls2 = lastWith(b.list, 'segAI') || lastWith(b.list, 'segPI'); if (!ls2) return ''; const pair = (l, r, n) => l && r ? `${n}: izq. ${fmtNum(l, 1)} · der. ${fmtNum(r, 1)} kg (${fmtNum(Math.abs(l - r) / Math.max(l, r) * 100, 0)}% de diferencia)` : '';
    const t = [pair(ls2.segAI, ls2.segAD, 'Brazos'), pair(ls2.segPI, ls2.segPD, 'Piernas'), ls2.segT ? `Tronco: ${fmtNum(ls2.segT, 1)} kg` : ''].filter(Boolean).join('<br>');
    return row('Músculo por segmento', '', null, t + '<br>Es normal que el lado dominante tenga un poco más. Como referencia orientativa, si la diferencia pasa de 10% y se mantiene, sumá trabajo unilateral (con mancuernas, un lado por vez) para el lado más débil.'); })()}
  ${b.bmr ? row('Metabolismo basal estimado', fmtNum(b.bmr) + ' kcal/día', null, `Lo que gasta tu cuerpo en reposo, calculado con la ecuación de Mifflin-St Jeor (1990), la más precisa en adultos.${b.bmrScale ? ` Tu balanza dice ${fmtNum(b.bmrScale)} kcal.` : ''} Tu gasto total del día es mayor: se suma lo que caminás y entrenás.`) : ''}
  <p class="small">Estos números sirven para seguir tu evolución, no para diagnosticar. Si el IMC o la cintura marcan riesgo, o si bajás de peso sin buscarlo, consultá con tu médico.</p>
  <details><summary class="small">Referencias</summary><p class="tiny muted">${['who2000', 'who2008', 'ashwell2012', 'gallagher2000', 'hodgdon1984', 'mifflin1990', 'kouri1995', 'kyle2004', 'helms2014'].map(k => esc(REFS[k])).join('<br>')}</p></details>`;
};

// ---------- exportar todo ----------
App.acts.expBody = () => {
  const cols = ['kg', 'fat', 'muscle', 'water', 'visceral', 'bone', 'bmr', 'waist', 'hip', 'neck', 'segAI', 'segAD', 'segPI', 'segPD', 'segT'];
  const rows = [['fecha', 'perfil', 'peso_kg', 'grasa_%', 'musculo_kg', 'agua_%', 'grasa_visceral', 'hueso_kg', 'metab_basal_kcal', 'cintura_cm', 'cadera_cm', 'cuello_cm', 'brazo_izq_kg', 'brazo_der_kg', 'pierna_izq_kg', 'pierna_der_kg', 'tronco_kg']];
  Store.list('body').sort((a, b) => a.date.localeCompare(b.date)).forEach(b => rows.push([b.date, pname(b.pid), ...cols.map(k => b[k] != null ? b[k] : '')]));
  saveFile('barra-libre-cuerpo.csv', '﻿' + csv(rows));
};
