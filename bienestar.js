// Bienestar: edad física, chequeo diario opcional, alertas de salud, mensajes de aliento,
// "Entendé tus números" (fichas con "?") y datitos cortos para el descanso.
// Las alertas no diagnostican: dicen qué se vio, qué hacer y cuándo consultar. Máximo una alerta y un aliento por día.
'use strict';
Object.assign(window.REFS, {
  loe2013: 'Loe H, Rognmo Ø, Saltin B, Wisløff U. Aerobic capacity reference data in 3816 healthy men and women 20–90 years. PLoS One. 2013;8(5):e64319.',
  nes2011: 'Nes BM, Janszky I, Vatten LJ, Nilsen TIL, Aspenes ST, Wisløff U. Estimating VO2peak from a nonexercise prediction model: the HUNT Study, Norway. Med Sci Sports Exerc. 2011;43(11):2024-2030.',
  kurtze2008: 'Kurtze N, Rangul V, Hustvedt BE, Flanders WD. Reliability and validity of self-reported physical activity in the Nord-Trøndelag Health Study: HUNT 1. Scand J Public Health. 2008;36(1):52-61.',
  nes2014: 'Nes BM, Vatten LJ, Nauman J, Janszky I, Wisløff U. A simple nonexercise model of cardiorespiratory fitness predicts long-term mortality. Med Sci Sports Exerc. 2014;46(6):1159-1165.',
  kodama2009: 'Kodama S, Saito K, Tanaka S, et al. Cardiorespiratory fitness as a quantitative predictor of all-cause mortality and cardiovascular events in healthy men and women: a meta-analysis. JAMA. 2009;301(19):2024-2035.',
  helgerud2007: 'Helgerud J, Høydal K, Wang E, et al. Aerobic high-intensity intervals improve VO2max more than moderate training. Med Sci Sports Exerc. 2007;39(4):665-671.',
  buchheit2014: 'Buchheit M. Monitoring training status with HR measures: do all roads lead to Rome? Front Physiol. 2014;5:73.',
  impellizzeri2020: 'Impellizzeri FM, Tenan MS, Kempton T, Novak A, Coutts AJ. Acute:chronic workload ratio: conceptual issues and fundamental pitfalls. Int J Sports Physiol Perform. 2020;15(6):907-913.',
  silbernagel2007: 'Silbernagel KG, Thomeé R, Eriksson BI, Karlsson J. Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy. Am J Sports Med. 2007;35(6):897-906.',
  riebe2015: 'Riebe D, Franklin BA, Thompson PD, et al. Updating ACSM’s recommendations for exercise preparticipation health screening. Med Sci Sports Exerc. 2015;47(11):2473-2479.',
  eichner1993: 'Eichner ER. Infection, immunity, and exercise: what to tell patients? Phys Sportsmed. 1993;21(1):125-135.',
  lally2010: 'Lally P, van Jaarsveld CHM, Potts HWW, Wardle J. How are habits formed: modelling habit formation in the real world. Eur J Soc Psychol. 2010;40(6):998-1009.',
  hewbutler2015: 'Hew-Butler T, Rosner MH, Fowkes-Godek S, et al. Statement of the Third International Exercise-Associated Hyponatremia Consensus Development Conference, Carlsbad, California, 2015. Clin J Sport Med. 2015;25(4):303-320.',
  jeukendrup2014: 'Jeukendrup A. A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Med. 2014;44(Suppl 1):S25-S33.'
});

// ---------- fichas "Entendé tus números" y datitos ----------
CAT_LABEL.numeros = 'Entendé tus números';
CAT_LABEL.datos = 'Datitos';
const FICHAS = [
  {id: 'edadfisica', t: 'Edad física', b: 'Es la edad en la que una persona promedio de tu sexo tiene tu mismo VO2máx. Si tenés 40 años y el VO2máx promedio de alguien de 32, tu edad física es 32. El VO2máx (la capacidad máxima de usar oxígeno) es uno de los mejores predictores de salud y longevidad: cada 3,5 ml/kg/min más se asoció con 13% menos riesgo de muerte por cualquier causa. Se mejora sobre todo con entrenamiento aeróbico, en especial con intervalos intensos.', r: ['loe2013', 'nes2014', 'kodama2009', 'helgerud2007']},
  {id: 'vo2', t: 'VO2máx', b: 'Cuánto oxígeno puede usar tu cuerpo por minuto y por kilo en un esfuerzo máximo (ml/kg/min). El valor más exacto sale de una prueba de laboratorio; el del reloj y el de la app son estimaciones (la app usa la relación entre tu FC máxima y en reposo, método de Uth). Sirven para ver tendencia: si sube, mejoró tu forma aeróbica.', r: ['uth2004', 'kodama2009']},
  {id: 'fcreposo', t: 'FC en reposo', b: 'Los latidos por minuto en reposo total, idealmente al despertar o durante el sueño. Con el entrenamiento aeróbico tiende a bajar. Si sube 7 o más latidos sobre tu valor habitual varios días seguidos, puede ser cansancio acumulado, estrés, poco sueño o un virus que empieza: conviene un día suave.', r: ['buchheit2014']},
  {id: 'zonas', t: 'Zonas de frecuencia cardíaca', b: 'Dividen tu pulso en 5 franjas según el esfuerzo. Z1–Z2: suave, podés charlar; construye la base aeróbica. Z3: moderado. Z4–Z5: intenso, frases cortas o nada. Con tu FC en reposo, la app usa el método de reserva (Karvonen), que ajusta mejor a tu estado físico.', r: ['karvonen1957', 'seiler2010']},
  {id: 'carga', t: 'Carga de entrenamiento', b: 'Suma cuánto y qué tan fuerte entrenaste. En running y bici con pulso se usa el TRIMP (minutos × zona); en clases y gimnasio, esfuerzo percibido (RPE 1–10) × minutos. Lo importante es comparar tu semana con tus semanas anteriores: subir de golpe es lo que más se relaciona con lesiones; subir de a poco te hace progresar.', r: ['edwards1993', 'foster2001', 'gabbett2016', 'impellizzeri2020']},
  {id: 'ochentaveinte', t: 'La regla 80/20', b: 'Los deportistas de resistencia de élite hacen cerca del 80% de su entrenamiento suave y el 20% intenso. Para la mayoría, el error común es correr todo a ritmo medio: ni lo bastante suave para recuperar ni lo bastante fuerte para mejorar.', r: ['seiler2010']},
  {id: 'sueno', t: 'Sueño', b: 'Los adultos necesitan 7 horas o más por noche. Dormir menos de forma repetida empeora el rendimiento, la recuperación muscular y el humor. Las fases que muestra el reloj (profundo, REM) son estimaciones: mirá sobre todo las horas totales y la regularidad.', r: ['watson2015']},
  {id: 'imc', t: 'IMC', b: 'Peso dividido por la altura al cuadrado. Normal: 18,5 a 24,9. No distingue músculo de grasa: en personas musculosas puede marcar sobrepeso sin exceso de grasa. Miralo junto con la cintura.', r: ['who2000']},
  {id: 'cintura', t: 'Cintura y cintura/altura', b: 'La cintura mide la grasa abdominal, la más ligada a enfermedad cardiovascular y diabetes. Meta simple para todos: que mida menos de la mitad de tu altura. Medila de pie, al final de una exhalación, a mitad de camino entre la última costilla y el hueso de la cadera.', r: ['who2008', 'ashwell2012']},
  {id: 'grasa', t: '% de grasa corporal', b: 'El rango saludable depende de la edad y el sexo: por ejemplo, 8–19% en hombres y 21–32% en mujeres de 20 a 39 años. Las balanzas de bioimpedancia cambian con el agua del cuerpo: pesate siempre en las mismas condiciones y mirá la tendencia de semanas, no un día.', r: ['gallagher2000', 'kyle2004']},
  {id: 'rir', t: 'RIR y 1RM estimado', b: 'RIR: repeticiones que te quedaban en reserva. 1RM estimado: el peso máximo que podrías levantar una vez, calculado con el peso y las repeticiones que hiciste (fórmula de Epley). Sirve para ver si te estás haciendo más fuerte sin tener que probar tu máximo.', r: ['helms2016rir', 'epley1985']},
  {id: 'recuperacion', t: 'Recuperación', b: 'Entre una sesión fuerte del mismo grupo muscular y la siguiente suelen hacer falta 48–72 horas. Después de una carrera larga o de series intensas, 1–2 días suaves. El dolor muscular del día siguiente es normal; un dolor que empeora al entrenar o no se va al día siguiente, no.', r: ['silbernagel2007']},
  {id: 'naismith', t: 'Tiempo en montaña (Naismith)', b: 'Regla clásica: 1 hora cada 5 km en llano, más 1 hora cada 600 m de subida. Sirve para planear la vuelta antes de que oscurezca. Con mochila pesada, calor o terreno técnico, sumá margen.', r: ['naismith1892']}
];
FICHAS.forEach(f => TIPS.push({...f, cat: 'numeros'}));
const DATITOS = [
  ['Descanso entre series', 'En ejercicios grandes, descansar 2–3 minutos da más fuerza y músculo que 1 minuto.', ['schoenfeld2016rest']],
  ['No hace falta ir al fallo', 'Dejar 1 a 3 repeticiones en reserva da casi el mismo músculo, con menos cansancio.', ['refalo2023']],
  ['Ritmo de charla', 'La mayor parte de tus km deberían ser a ritmo cómodo, en el que podés hablar.', ['seiler2010']],
  ['Subí de a poco', 'Aumentar más de 30% los km de una semana a otra se asoció con más lesiones en corredores nuevos.', ['nielsen2014']],
  ['Pasos cortos', 'Subir la cadencia un 5–10% baja el impacto en rodillas y cadera.', ['heiderscheit2011']],
  ['Proteína', 'Con 1,6 g por kilo por día alcanza para ganar músculo a la mayoría.', ['morton2018']],
  ['Forma aeróbica', 'Cada 3,5 ml/kg/min más de VO2máx se asoció con 13% menos riesgo de muerte por cualquier causa.', ['kodama2009']],
  ['Intervalos 4×4', '4 series de 4 min fuerte (85–95% de tu FC máx.) con 3 min suaves, 2 veces por semana, subieron el VO2máx más que el trote continuo.', ['helgerud2007']],
  ['Dormir', 'Menos de 7 horas varias noches seguidas empeora el rendimiento y la recuperación.', ['watson2015']],
  ['Pesarte bien', 'Al levantarte, después del baño y antes de tomar nada: así la balanza compara días parecidos.', ['kyle2004']],
  ['Hábito', 'En promedio, un hábito tarda unos 66 días en volverse automático. Faltar un día no lo arruina.', ['lally2010']],
  ['Agua', 'En salidas de menos de 1 hora con clima templado alcanza con tomar según la sed.', ['hewbutler2015']],
  ['Fondos largos', 'En salidas de más de 90 minutos, sumá 30–60 g de carbohidratos por hora.', ['jeukendrup2014']],
  ['Dolor que avisa', 'Un dolor de hasta 5 de 10 al entrenar puede ser aceptable si al otro día vuelve a lo normal. Si no vuelve, bajá la carga.', ['silbernagel2007']],
  ['Pulso al despertar', 'Si tu FC en reposo sube 7 o más latidos varios días seguidos, hacé un día suave.', ['buchheit2014']],
  ['Cintura', 'Que tu cintura mida menos de la mitad de tu altura es una meta simple para la salud del corazón.', ['ashwell2012']]
];
DATITOS.forEach(([t, b, r]) => TIPS.push({cat: 'datos', t, b, r}));
App.acts.ficha = el => App.openSheet('ficha', {id: el.dataset.arg});
App.views.sh_ficha = (p, sh) => {
  const f = FICHAS.find(x => x.id === sh.id); if (!f) return '<p>No encontrado.</p>';
  return `<span class="label">Entendé tus números</span><h2>${esc(f.t)}</h2><p class="small">${esc(f.b)}</p>
    <p class="tiny muted">${f.r.map(k => esc(REFS[k] || k)).join('<br>')}</p><button class="btn" data-act="closeSheet">Entendido</button>`;
};
const refShort = k => { const m = String(k).match(/^([a-z]+)(\d{4})/i); return m ? m[1][0].toUpperCase() + m[1].slice(1).replace(/butler$/, '-Butler') + ' ' + m[2] : k; };
const qBtn = id => `<button class="iconbtn" data-act="ficha" data-arg="${id}" aria-label="Qué significa" style="width:26px;height:26px;min-height:26px;font-size:13px;font-weight:700;border-radius:50%;padding:0">?</button>`;

// ---------- edad física ----------
// Valores de referencia del estudio HUNT 3 (Noruega, 1929 hombres y 1881 mujeres sanos, VO2máx medido en cinta):
// promedio ± desvío por grupo de edad, Tabla 2 de Loe 2013. Centro de cada grupo: 25, 35, 45, 55, 65 y 75 (70+) años.
// La edad física es la edad en la que el promedio de tu sexo iguala tu VO2máx (interpolación lineal entre grupos).
const VO2_REF = {
  m: [[25, 54.4, 8.4], [35, 49.1, 7.5], [45, 47.2, 7.7], [55, 42.6, 7.4], [65, 39.2, 6.7], [75, 35.3, 6.5]],
  f: [[25, 43.0, 7.7], [35, 40.0, 6.8], [45, 38.4, 6.9], [55, 34.4, 5.7], [65, 31.1, 5.1], [75, 28.3, 5.2]]
};
function vo2Ref(sex, age){ // {mean, sd} interpolados para una edad
  const T = VO2_REF[sex]; if (!T) return null;
  let k = 0; while (k < T.length - 2 && age > T[k + 1][0]) k++;
  const [a0, m0, s0] = T[k], [a1, m1, s1] = T[k + 1]; const f = (age - a0) / (a1 - a0);
  const g = Math.max(0, f); // antes de los 25 años se usa el valor de 20–29
  return {mean: m0 + (m1 - m0) * (age < a0 ? 0 : f), sd: s0 + (s1 - s0) * Math.min(1, g)};
}
const vo2Norm = (sex, age) => { const r = vo2Ref(sex, age); return r ? r.mean : null; };
function fitnessAgeOf(sex, vo2){
  const T = VO2_REF[sex]; if (!T || !vo2) return null;
  if (vo2 >= T[0][1]) return 20;
  for (let k = 0; k < T.length - 1; k++) { const [a0, m0] = T[k], [a1, m1] = T[k + 1]; if (vo2 <= m0 && vo2 >= m1) return Math.round(a0 + (m0 - vo2) / (m0 - m1) * (a1 - a0)); }
  const [a0, m0] = T[T.length - 2], [a1, m1] = T[T.length - 1]; // por debajo del promedio de 70+: se extiende la última pendiente
  return Math.min(90, Math.round(a1 + (m1 - vo2) / (m0 - m1) * (a1 - a0)));
}
function yearsPerMl(sex, fa){ const T = VO2_REF[sex]; let k = 0; while (k < T.length - 2 && fa > T[k + 1][0]) k++; return (T[k + 1][0] - T[k][0]) / (T[k][1] - T[k + 1][1]); }
function normCdf(z){ const t = 1 / (1 + 0.2316419 * Math.abs(z)); const d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
// VO2máx sin reloj ni prueba de esfuerzo: modelo de la Universidad NTNU (estudio HUNT), versión con IMC (Nes 2014; derivado en Nes 2011).
// Mujeres: 70,77 − 0,244·edad − 0,749·IMC − 0,107·FC reposo + 0,213·PAI · Hombres: 92,05 − 0,327·edad − 0,933·IMC − 0,167·FC reposo + 0,257·PAI
// PAI = frecuencia × intensidad × duración (pesos de Kurtze 2008 / Nes 2011). Error típico ±5–6 ml/kg/min.
const PAI_Q = {
  f: {q: '¿Cada cuánto hacés ejercicio?', o: [['Nunca', 0], ['Menos de 1 vez por semana', 0], ['1 vez por semana', 1], ['2 o 3 veces por semana', 2.5], ['Casi todos los días', 5]]},
  i: {q: '¿Qué tan fuerte te exigís?', o: [['Sin transpirar ni agitarme', 1], ['Transpiro y me agito', 5], ['Hasta quedar agotado', 10]]},
  d: {q: '¿Cuánto dura cada vez?', o: [['Menos de 15 min', 0.1], ['15 a 30 min', 0.38], ['30 a 60 min', 0.75], ['Más de 60 min', 1]]}
};
function paiOf(p){ const a = p.pai; if (!a || a.f == null || a.i == null || a.d == null) return null; return PAI_Q.f.o[a.f][1] * PAI_Q.i.o[a.i][1] * PAI_Q.d.o[a.d][1]; }
function rhrOf(p){ if (p.hrRestUser) return +p.hrRestUser; return median(Array.from({length: 21}, (_, i) => restOf(hDay(p, i)))); }
function nesVo2(p){
  const pai = paiOf(p), rhr = rhrOf(p), b = typeof bodyNow === 'function' ? bodyNow(p) : null, bmi = b && b.bmi, age = p.age;
  if (pai == null || !rhr || !bmi || !age || !p.sex) return null;
  const v = p.sex === 'f' ? 70.77 - 0.244 * age - 0.749 * bmi - 0.107 * rhr + 0.213 * pai : 92.05 - 0.327 * age - 0.933 * bmi - 0.167 * rhr + 0.257 * pai;
  return v > 10 && v < 90 ? Math.round(v * 10) / 10 : null;
}
function vo2Of(p){
  const hs = Store.list('health', p.id).filter(h => h.vo2 && Date.now() - new Date(h.date + 'T12:00') < 180 * 864e5).sort((a, b) => b.date.localeCompare(a.date));
  if (hs.length) return {v: hs[0].vo2, src: 'reloj', date: hs[0].date};
  const Z = typeof myZones === 'function' ? myZones(p) : null;
  if (Z && Z.rest && Z.max && p.hrMaxUser) return {v: Math.round(15.3 * Z.max / Z.rest * 10) / 10, src: 'uth'};
  const n = nesVo2(p); if (n) return {v: n, src: 'nes'};
  if (Z && Z.rest && Z.max) return {v: Math.round(15.3 * Z.max / Z.rest * 10) / 10, src: 'uth', est: true};
  return null;
}
App.views.sh_paiQ = (p, sh) => {
  const a = sh.a || (sh.a = {...(p.pai || {})});
  const rhrAuto = median(Array.from({length: 21}, (_, i) => restOf(hDay(p, i))));
  return `<h2>VO2máx sin reloj</h2><p class="small muted">3 preguntas del estudio HUNT (Universidad NTNU). Con tu edad, IMC y pulso en reposo estima tu VO2máx con un error típico de ±5–6 ml/kg/min.</p>
  ${Object.entries(PAI_Q).map(([k, x]) => `<div class="field"><label>${x.q}</label><div class="stack-s">${x.o.map(([l], j) => `<button class="opt" data-act="paiSet" data-k="${k}" data-v="${j}" aria-pressed="${a[k] === j}"><span class="tick"></span><span>${l}</span></button>`).join('')}</div></div>`).join('')}
  ${!rhrAuto ? `<div class="field"><label for="pai_rhr">Pulso en reposo (latidos por minuto)</label><input id="pai_rhr" type="number" inputmode="numeric" value="${esc(p.hrRestUser || '')}" placeholder="ej. 62"><p class="tiny muted">Medilo sentado, después de 5 minutos quieto, idealmente a la mañana: contá los latidos en 30 segundos y multiplicá por 2.</p></div>` : `<p class="small muted">Pulso en reposo del reloj: <b class="num">${rhrAuto}</b> lpm.</p>`}
  ${typeof bodyNow === 'function' && !bodyNow(p).bmi ? '<p class="small" style="color:var(--warn)">Falta tu peso y altura para el IMC: cargalos en Progreso → Cuerpo.</p>' : ''}
  <button class="btn primary" data-act="paiSave">Calcular</button>
  <p class="tiny muted">${esc(REFS.nes2014)}<br>${esc(REFS.nes2011)}</p>`;
};
App.acts.paiSet = el => { S.sheet.a[el.dataset.k] = +el.dataset.v; App.renderOverlay(); };
App.acts.paiSave = async () => {
  const p = curProfile(), a = S.sheet.a; if (a.f == null || a.i == null || a.d == null) { toast('Respondé las 3 preguntas'); return; }
  const upd = {...p, pai: {f: a.f, i: a.i, d: a.d}}; const r = $('#pai_rhr');
  if (r && r.value) { const v = +r.value; if (v < 30 || v > 110) { toast('El pulso en reposo tiene que estar entre 30 y 110'); return; } upd.hrRestUser = v; }
  await Store.put('profiles', upd); App.closeSheet(); App.render(); toast(nesVo2(upd) ? 'Listo: edad física calculada' : 'Guardado. Falta algún dato (peso, altura o pulso en reposo).');
};
function fitnessCard(p){
  const sex = p.sex, age = p.age, vo = vo2Of(p);
  if (!sex || !age || !vo) {
    const need = []; if (!age) need.push('tu edad (en el perfil)'); if (!sex) need.push('tu sexo (Progreso → Cuerpo → + Medición)'); if (!vo) need.push('tu VO2máx: conectá un reloj que lo mida o respondé 3 preguntas');
    return `<div class="card stack-s"><div class="row between"><h3>Edad física</h3>${qBtn('edadfisica')}</div><p class="small muted">Para calcularla falta: ${need.join('; ')}.</p>${!vo ? '<button class="btn sm" data-act="sheet" data-arg="paiQ">Calcular sin reloj (3 preguntas)</button>' : ''}</div>`;
  }
  const fa = fitnessAgeOf(sex, vo.v); const diff = age - fa;
  const yPerMl = yearsPerMl(sex, Math.max(25, Math.min(75, fa))); // años por cada ml/kg/min alrededor de tu edad física
  const ref = vo2Ref(sex, age), norm = ref.mean; const pct = Math.round(normCdf((vo.v - ref.mean) / ref.sd) * 100);
  return `<div class="card stack-s"><div class="row between"><h3>Edad física</h3>${qBtn('edadfisica')}</div>
    <div class="row" style="align-items:flex-end;gap:14px"><div><div class="big" style="font-size:52px">${fa >= 90 ? '90+' : fa <= 20 ? '≤20' : fa}</div><span class="small muted">años · tu edad: ${age}</span></div>
      <div class="grow"><span class="pill ${diff >= 0 ? 'ok' : 'warn'}">${diff > 0 ? diff + (diff === 1 ? ' año menos' : ' años menos') : diff < 0 ? -diff + (diff === -1 ? ' año más' : ' años más') : 'igual a tu edad'}</span>
      <p class="small muted" style="margin-top:6px">VO2máx ${vo.src === 'reloj' ? 'del reloj' : 'estimado'}: <b class="num">${fmtNum(vo.v, 1)}</b> ml/kg/min · promedio para tu edad: ${fmtNum(norm, 1)} · <b>percentil ${Math.max(1, Math.min(99, pct))}</b> (mejor que ${Math.max(1, Math.min(99, pct))} de cada 100 personas sanas de tu edad y sexo)</p></div></div>
    ${diff < 0 ? '<p class="small"><b>Buena noticia:</b> el VO2máx es de lo que más rápido responde al entrenamiento; en un estudio subió ~7% en 8 semanas de intervalos.</p>' : ''}
    <p class="small">Cada 1 ml/kg/min más de VO2máx ≈ <b>${fmtNum(yPerMl, 1)} años menos</b> de edad física. Lo que más lo sube: intervalos intensos, por ejemplo 4×4 minutos al 85–95% de tu FC máx. con 3 minutos suaves entre medio, 2 veces por semana (Helgerud 2007), sumados a tus salidas suaves.</p>
    <p class="tiny muted">${vo.src === 'uth' ? `Estimación con tu FC máx. y en reposo (Uth 2004)${vo.est ? '; la FC máx. sale de tu edad: si la conocés, cargala en Cardio → Mis zonas, o usá las 3 preguntas' : ''}. ` : vo.src === 'nes' ? 'Estimación sin prueba de esfuerzo (modelo NTNU, Nes 2014): error típico ±5–6 ml/kg/min. ' : ''}${vo.src !== 'reloj' ? `<a href="#" data-act="sheet" data-arg="paiQ">${vo.src === 'nes' ? 'Cambiar respuestas' : 'Calcular con 3 preguntas'}</a>. ` : ''}Referencia: VO2máx medido en 3816 adultos sanos de Noruega, por edad y sexo (estudio HUNT 3, Loe 2013). Es una población muy activa, así que la comparación es exigente.</p></div>`;
}
const _progFit = App.views.prog;
App.views.prog = (p) => { const html = _progFit(p); const i = html.indexOf('<div class="stack">'); return i < 0 ? html : html.slice(0, i + 19) + fitnessCard(p) + html.slice(i + 19); };

// ---------- datos para alertas ----------
const median = a => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const dayKey = n => localDay(new Date(Date.now() - n * 864e5));
const hDay = (p, n) => Store.get('health', p.id + '_' + dayKey(n)) || {};
const restOf = h => h.hrRest || h.hrMin || null;
function sessionLoad(x, kind){ // carga aproximada = minutos × RPE (Foster 2001)
  const min = (x.durSec || 0) / 60; if (!min) return 0;
  if (x.rpe) return min * x.rpe;
  if (kind === 'a' && typeof zoneTimes === 'function') { const s = zoneTimes(x, myZones(curProfile())); if (s) return trimp(s) * 2; }
  if (kind === 'w') return min * 7;
  return min * (typeof isEasy === 'function' && isEasy(x) ? 4 : 6);
}
function loadBetween(p, d0, d1){ // días atrás: desde d0 hasta d1 (d0 > d1)
  const t0 = Date.now() - d0 * 864e5, t1 = Date.now() - d1 * 864e5;
  const inR = d => { const t = new Date(d).getTime(); return t >= t0 && t < t1; };
  return actsOf(p.id).filter(a => inR(a.date)).reduce((t, a) => t + sessionLoad(a, 'a'), 0) + workoutsOf(p.id).filter(w => inR(w.date)).reduce((t, w) => t + sessionLoad(w, 'w'), 0);
}
function sessionsDays(p){ return [...new Set([...actsOf(p.id).map(a => localDay(a.date)), ...workoutsOf(p.id).map(w => localDay(w.date))])].sort(); }

// ---------- reglas ----------
// cada regla devuelve null o {type, level: 'urgente'|'consulta'|'atencion'|'info', t, b, ref}
const AV_TYPES = {salud: 'Síntomas y pulso', dolor: 'Dolor y molestias', sueno: 'Sueño', carga: 'Carga y kilómetros', peso: 'Peso y cintura', aliento: 'Mensajes de aliento', checkin: 'Pregunta "¿Cómo estás hoy?"'};
function alerts(p){
  const out = []; const t = hDay(p, 0);
  const sick = t.sick || {};
  if (sick.chest) out.push({type: 'salud', level: 'urgente', t: 'No entrenes y consultá a un médico', b: 'Dolor o presión en el pecho, falta de aire desproporcionada, mareo o palpitaciones al hacer esfuerzo son motivo para parar y consultar. Si es fuerte o está pasando ahora, llamá a emergencias (107 o 911).', ref: 'riebe2015'});
  else if (sick.fever) out.push({type: 'salud', level: 'consulta', t: 'Con fiebre, hoy no entrenes', b: 'Con fiebre o síntomas de cuello para abajo (tos de pecho, cuerpo cortado, diarrea) descansá. Volvé de a poco cuando pasen 24–48 h sin fiebre. Si dura más de 3 días o empeora, consultá.', ref: 'eichner1993'});
  else if (sick.below) out.push({type: 'salud', level: 'atencion', t: 'Hoy mejor descanso', b: 'Con síntomas de cuello para abajo (tos de pecho, cuerpo cortado, diarrea), descansá hasta sentirte mejor.', ref: 'eichner1993'});
  else if (sick.above) out.push({type: 'salud', level: 'info', t: 'Solo síntomas de cuello para arriba', b: 'Con moco o dolor de garganta y sin fiebre, podés hacer algo suave si te sentís bien: bajá la intensidad a la mitad. Si empeorás, pará.', ref: 'eichner1993'});
  // dolor: 3 de los últimos 7 días en la misma zona, o intenso hoy
  const pains = []; for (let i = 0; i < 7; i++) { const h = hDay(p, i); if (h.pain && h.pain.zone) pains.push(h.pain); }
  const byZone = {}; pains.forEach(x => byZone[x.zone] = (byZone[x.zone] || 0) + 1);
  const zRep = Object.entries(byZone).find(([, n]) => n >= 3);
  if (t.pain && t.pain.n >= 6) out.push({type: 'dolor', level: 'consulta', t: `Dolor fuerte en ${t.pain.zone.toLowerCase()}`, b: 'Con un dolor de 6 de 10 o más, no entrenes esa zona hoy. Si no mejora en unos días, si hay hinchazón o si te despierta de noche, consultá a un kinesiólogo o médico.', ref: 'silbernagel2007'});
  else if (zRep) out.push({type: 'dolor', level: 'consulta', t: `Dolor repetido en ${zRep[0].toLowerCase()}`, b: `Lo marcaste ${zRep[1]} veces en la última semana. Un dolor que se repite conviene que lo vea un kinesiólogo antes de que se haga crónico. Mientras tanto: bajá la carga de esa zona; un dolor de hasta 5 de 10 al entrenar puede ser aceptable si al otro día vuelve a lo normal.`, ref: 'silbernagel2007'});
  // pulso en reposo
  const r3 = [0, 1, 2].map(i => restOf(hDay(p, i)));
  const base = median(Array.from({length: 28}, (_, i) => restOf(hDay(p, i + 3))));
  const r5 = [0, 1, 2, 3, 4].map(i => restOf(hDay(p, i))).filter(Boolean);
  if (r5.filter(x => x > 100).length >= 3) out.push({type: 'salud', level: 'consulta', t: 'Pulso en reposo alto', b: 'Tu reloj marca más de 100 latidos por minuto en reposo varios días. Puede ser un error del sensor, pero conviene consultarlo con un médico.', ref: 'buchheit2014'});
  else if (base && r3.every(x => x && x >= base + 7)) out.push({type: 'salud', level: 'atencion', t: 'Tu pulso en reposo está alto', b: `Hace 3 días que está ${Math.round(median(r3) - base)} latidos arriba de tu normal (${base}). Puede ser cansancio, estrés, poco sueño o un virus que empieza: hoy mejor un día suave.`, ref: 'buchheit2014'});
  // sueño
  const sl = [0, 1, 2].map(i => hDay(p, i).sleepMin);
  if (sl.every(x => x && x < 420)) out.push({type: 'sueno', level: 'atencion', t: '3 noches con menos de 7 horas', b: 'Dormir poco varias noches seguidas baja el rendimiento y la recuperación. Si podés, hoy priorizá dormir y bajá la intensidad del entrenamiento.', ref: 'watson2015'});
  // kilómetros de running (7 días contra los 7 anteriores)
  const km = (d0, d1) => actsOf(p.id, 'run').filter(a => { const t = Date.now() - new Date(a.date); return t >= d1 * 864e5 && t < d0 * 864e5; }).reduce((s, a) => s + (a.distKm || 0), 0);
  const kNow = km(7, 0), kPrev = km(14, 7);
  if (kPrev >= 5 && kNow > kPrev * 1.3 && kNow >= 10) out.push({type: 'carga', level: 'atencion', t: 'Subiste mucho los kilómetros', b: `Esta semana llevás ${fmtNum(kNow, 1)} km contra ${fmtNum(kPrev, 1)} la anterior (+${Math.round((kNow / kPrev - 1) * 100)}%). Más de 30% de aumento se asoció con más lesiones: mejor subir de a poco.`, ref: 'nielsen2014'});
  // carga total: semana actual contra el promedio de las 4 anteriores
  const span = sessionsDays(p); const hist = span.length && Date.now() - new Date(span[0] + 'T12:00') > 28 * 864e5;
  if (hist) { const acute = loadBetween(p, 7, 0), chronic = loadBetween(p, 35, 7) / 4; if (chronic > 200 && acute > chronic * 1.5) out.push({type: 'carga', level: 'atencion', t: 'Semana muy cargada', b: `Tu carga de estos 7 días es ${Math.round(acute / chronic * 10) / 10} veces tu promedio de las 4 semanas anteriores. Subir de golpe aumenta el riesgo de lesión y cansancio: sumá un día de descanso o uno suave.`, ref: 'gabbett2016'}); }
  // peso y cintura
  if (typeof bodyTrend === 'function') {
    const b = bodyNow(p), tr = bodyTrend(b.list);
    if (tr && tr.weeks >= 3 && tr.pctWeek < -1) out.push({type: 'peso', level: 'atencion', t: 'Bajás de peso muy rápido', b: `Estás bajando ${fmtNum(-tr.pctWeek, 1)}% de tu peso por semana. A más de 1% semanal se pierde más músculo: si buscás bajar, apuntá a 0,5–1% por semana. Si no lo estás buscando, consultá a un médico.`, ref: 'helms2014'});
    else if (b.whtr && b.whtr >= .5 && new Date().getDate() === 1) out.push({type: 'peso', level: 'info', t: 'Tu cintura y tu salud', b: `Tu cintura mide ${fmtNum(b.whtr * 100, 0)}% de tu altura. Llevarla a menos de la mitad baja el riesgo cardiometabólico; la actividad física y la alimentación son lo que más ayuda.`, ref: 'ashwell2012'});
  }
  const ord = {urgente: 0, consulta: 1, atencion: 2, info: 3};
  return out.sort((a, b) => ord[a.level] - ord[b.level]);
}
function cheers(p){
  const out = [];
  const days = sessionsDays(p); const today = todayISO(), yest = dayKey(1);
  // volver después de una pausa
  if (days.length > 1) { const last = days[days.length - 1], prev = days[days.length - 2]; if ((last === today || last === yest) && (new Date(last) - new Date(prev)) / 864e5 >= 10) out.push({t: '¡Bienvenido de vuelta!', b: 'Volver es lo que importa. Arrancá un poco más suave que antes de la pausa y en 2–3 semanas estás donde estabas.'}); }
  // récord de fuerza esta semana
  const ws = workoutsOf(p.id); const wk = Date.now() - 7 * 864e5; let pr = null;
  for (const w of ws.filter(w => new Date(w.date) >= wk)) for (const e of (w.exercises || [])) {
    const now = bestE1rm(e.sets.filter(s => s.done)); if (!now) continue;
    const before = Math.max(0, ...exHistory(p.id, e.ex, w.id).filter(h => new Date(h.date) < new Date(w.date)).map(h => bestE1rm(h.sets)));
    if (before && now > before && (!pr || now / before > pr.r)) pr = {ex: e.ex, kg: now, r: now / before};
  }
  if (pr && EX[pr.ex]) out.push({t: `Nuevo récord en ${nm(EX[pr.ex])[0]}`, b: `1RM estimado: ${L.fmtKg(Math.round(pr.kg * 10) / 10)} kg (+${Math.round((pr.r - 1) * 100)}%). La fuerza sube cuando sos constante: seguí así.`});
  // recomposición
  if (typeof bodyTrend === 'function') { const tr = bodyTrend(bodyOf(p.id)); if (tr && tr.dFatKg != null && tr.dMuscle != null && tr.dFatKg < -.2 && tr.dMuscle > .1) out.push({t: 'Recomposición corporal', b: `En ${Math.round(tr.weeks)} semanas: ${sgn(tr.dFatKg)} kg de grasa y ${sgn(tr.dMuscle)} kg de músculo. Eso es progreso de verdad, aunque la balanza cambie poco.`}); }
  // pulso en reposo que baja
  const now = median(Array.from({length: 14}, (_, i) => restOf(hDay(p, i)))), then = median(Array.from({length: 30}, (_, i) => restOf(hDay(p, i + 60))));
  if (now && then && then - now >= 3) out.push({t: 'Tu corazón está más en forma', b: `Tu FC en reposo bajó de ${then} a ${now} latidos en 2 meses: señal de mejor forma aeróbica.`});
  // edad física
  const vo = vo2Of(p); const fa = vo && p.sex && p.age ? fitnessAgeOf(p.sex, vo.v) : null;
  if (fa && p.age - fa >= 3) out.push({t: `Edad física: ${fa}`, b: `Tu VO2máx es el promedio de alguien de ${fa} años: ${p.age - fa} menos que tu edad.`});
  // constancia
  let streak = 0; const ws0 = L.weekStart(new Date()); for (let i = 1; i < 60; i++) { const s = new Date(ws0); s.setDate(s.getDate() - 7 * i); const e = new Date(s); e.setDate(e.getDate() + 7); const n = days.filter(d => { const x = new Date(d + 'T12:00'); return x >= s && x < e; }).length; if (n >= 2) streak++; else break; }
  if (streak >= 4) out.push({t: `${streak} semanas seguidas entrenando`, b: `Llevás unos ${streak * 7} días de constancia. En promedio un hábito tarda 66 días en volverse automático${streak * 7 >= 66 ? ': ya es parte de tu vida' : ''}.`});
  return out;
}

// ---------- tarjeta "Hoy" en Inicio ----------
const PAIN_Z = ['Cuello', 'Hombro', 'Codo', 'Muñeca/mano', 'Espalda alta', 'Espalda baja', 'Cadera', 'Rodilla', 'Tobillo/pie', 'Otra'];
const avOff = p => p.avisosOff || [];
const disKey = p => 'bl_hoy_dis_' + p.id + '_' + todayISO();
function hoyCard(p){
  const off = avOff(p); const t = hDay(p, 0); const dis = ls.get(disKey(p), []);
  const lvl = {urgente: ['bad', 'Urgente'], consulta: ['bad', 'Consultá'], atencion: ['warn', 'Atención'], info: ['', 'Info']};
  let html = '';
  const ck = S.hoyCk;
  if (!off.includes('checkin') && !t.feel && !dis.includes('checkin')) {
    html += `<div class="stack-s"><b>¿Cómo estás hoy?</b><div class="chips">${[['bien', 'Bien'], ['cansado', 'Cansado'], ['dolor', 'Me duele algo'], ['enfermo', 'Me siento mal']].map(([k, l]) => `<button class="chip" data-act="hoyFeel" data-arg="${k}" aria-pressed="${ck && ck.feel === k}">${l}</button>`).join('')}<button class="chip" data-act="hoyDis" data-arg="checkin" style="border-style:dashed">Hoy no</button></div>`;
    if (ck && ck.feel === 'dolor') html += `<span class="small muted">¿Dónde?</span><div class="chips">${PAIN_Z.map(z => `<button class="chip" data-act="hoyPainZ" data-arg="${z}" aria-pressed="${ck.zone === z}">${z}</button>`).join('')}</div>
      <span class="small muted">¿Cuánto? (0 nada · 10 máximo)</span><div class="chips">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="chip" data-act="hoyPainN" data-arg="${n}" aria-pressed="${ck.n === n}">${n}</button>`).join('')}</div>
      <button class="btn sm primary" data-act="hoySave" ${ck.zone && ck.n ? '' : 'disabled'}>Listo</button>`;
    if (ck && ck.feel === 'enfermo') html += `<span class="small muted">Marcá lo que tengas:</span><div class="chips">${[['above', 'Moco o garganta'], ['fever', 'Fiebre'], ['below', 'Tos de pecho, cuerpo cortado o diarrea'], ['chest', 'Dolor de pecho, falta de aire o palpitaciones']].map(([k, l]) => `<button class="chip" data-act="hoySick" data-arg="${k}" aria-pressed="${!!(ck.sick || {})[k]}">${l}</button>`).join('')}</div>
      <button class="btn sm primary" data-act="hoySave" ${ck.sick && Object.values(ck.sick).some(Boolean) ? '' : 'disabled'}>Listo</button>`;
    html += '</div>';
  }
  const al = alerts(p).filter(a => !off.includes(a.type) && !dis.includes('a:' + a.t))[0];
  if (al) html += `<div class="banner ${al.level === 'info' ? 'info' : ''} small" style="${al.level === 'urgente' || al.level === 'consulta' ? 'border-color:var(--bad)' : ''}"><div class="grow"><span class="pill ${lvl[al.level][0]}" style="font-size:11px">${lvl[al.level][1]}</span> <b>${esc(al.t)}</b><div style="margin-top:4px">${esc(al.b)}</div><div class="tiny muted" style="margin-top:4px">Fuente: ${esc(refShort(al.ref))}</div></div>${al.level === 'urgente' ? '' : `<button class="iconbtn" data-act="hoyDis" data-arg="a:${esc(al.t)}" aria-label="Ocultar por hoy">${ICON.close}</button>`}</div>`;
  const ch = off.includes('aliento') ? null : cheers(p).filter(c => !dis.includes('c:' + c.t))[0];
  if (ch) html += `<div class="banner small" style="border-color:var(--ok)"><div class="grow"><b style="color:var(--ok)">${esc(ch.t)}</b><div style="margin-top:2px">${esc(ch.b)}</div></div><button class="iconbtn" data-act="hoyDis" data-arg="c:${esc(ch.t)}" aria-label="Ocultar por hoy">${ICON.close}</button></div>`;
  if (!html) return '';
  return `<div class="card stack-s"><div class="row between"><h3>Hoy</h3><button class="btn sm ghost" data-act="sheet" data-arg="avisos">Avisos</button></div>${html}
    ${al ? '<p class="tiny muted">Barra Libre no es un dispositivo médico: estos avisos no reemplazan una consulta.</p>' : ''}</div>`;
}
const _homeHoy = App.views.home;
App.views.home = (p) => {
  const html = _homeHoy(p); const card = hoyCard(p); if (!card) return html;
  const mark = '<div class="section" style="margin-top:6px">';
  return html.includes(mark) ? html.replace(mark, card + mark) : html;
};
App.acts.hoyFeel = async el => {
  const k = el.dataset.arg;
  if (k === 'bien' || k === 'cansado') { await hoySaveDay({feel: k}); S.hoyCk = null; App.render(); if (k === 'cansado') toast('Anotado. Si seguís cansado varios días, hacé una semana más liviana.'); return; }
  S.hoyCk = {feel: k}; App.render();
};
App.acts.hoyPainZ = el => { S.hoyCk.zone = el.dataset.arg; App.render(); };
App.acts.hoyPainN = el => { S.hoyCk.n = +el.dataset.arg; App.render(); };
App.acts.hoySick = el => { const s = S.hoyCk.sick = S.hoyCk.sick || {}; s[el.dataset.arg] = !s[el.dataset.arg]; App.render(); };
App.acts.hoySave = async () => {
  const ck = S.hoyCk; if (!ck) return;
  await hoySaveDay(ck.feel === 'dolor' ? {feel: 'dolor', pain: {zone: ck.zone, n: ck.n}} : {feel: 'enfermo', sick: ck.sick});
  S.hoyCk = null; App.render();
};
async function hoySaveDay(v){ const p = curProfile(), d = todayISO(), id = p.id + '_' + d; await Store.put('health', {...(Store.get('health', id) || {}), id, pid: p.id, date: d, ...v}); }
App.acts.hoyDis = el => { const p = curProfile(); const a = ls.get(disKey(p), []); a.push(el.dataset.arg); ls.set(disKey(p), a); S.hoyCk = null; App.render(); };
App.views.sh_avisos = (p) => {
  const off = avOff(p);
  return `<h2>Avisos</h2><p class="small muted">Elegí qué avisos querés ver en Inicio. Como máximo aparece una alerta y un mensaje de aliento por día.</p>
  <div class="stack-s">${Object.entries(AV_TYPES).map(([k, l]) => `<button class="opt" data-act="avToggle" data-arg="${k}" aria-pressed="${!off.includes(k)}"><span class="tick"></span><span><b>${l}</b></span></button>`).join('')}</div>
  <p class="tiny muted">Las alertas se basan en guías y estudios de medicina del deporte y kinesiología (ver Aprender → Entendé tus números). No diagnostican ni reemplazan una consulta.</p>`;
};
App.acts.avToggle = async el => { const p = curProfile(); const k = el.dataset.arg; const off = avOff(p).includes(k) ? avOff(p).filter(x => x !== k) : [...avOff(p), k]; await Store.put('profiles', {...p, avisosOff: off}); App.renderOverlay(); App.refresh(); };

// ---------- botones "?" en los números ----------
const _cardioQ = App.views.cardio;
App.views.cardio = (p) => _cardioQ(p).replace('<h3>Zonas de FC (28 días)</h3>', `<div class="row" style="gap:6px"><h3>Zonas de FC (28 días)</h3>${qBtn('zonas')}</div>`).replace('<h3>Intensidad (últimos 28 días)</h3>', `<div class="row" style="gap:6px"><h3>Intensidad (últimos 28 días)</h3>${qBtn('ochentaveinte')}</div>`);
if (typeof window.stepsCard === 'function') {
  const _stepsQ = window.stepsCard;
  window.stepsCard = p => _stepsQ(p).replace('<span>FC en reposo</span>', `<span>FC en reposo ${qBtn('fcreposo')}</span>`).replace('<span>dormiste anoche</span>', `<span>dormiste anoche ${qBtn('sueno')}</span>`);
}
