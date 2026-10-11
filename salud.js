// Health Connect (solo dentro de la app de Android): pasos, sueño, frecuencia cardíaca, peso y entrenamientos del reloj.
// En la web no cambia nada: solo se ven los datos que ya se sincronizaron (sueño y FC en Progreso).
'use strict';
if (!COLS.includes('health')) COLS.push('health');
Store.data.health = Store.data.health || {};

const HC = {
  plugin: (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.Health) || null,
  READ: ['steps', 'heartRate', 'restingHeartRate', 'sleep', 'weight', 'workouts', 'vo2Max'],
  APK: 'https://github.com/matiasignaciomarquez-ops/barra-libre/releases/latest/download/barra-libre.apk',
  busy: false,
  get last(){ return ls.get('bl_hc_last_' + S.pid, null); },
  set last(v){ ls.set('bl_hc_last_' + S.pid, v); },
  get on(){ return ls.get('bl_hc_on_' + S.pid, false); },
  set on(v){ ls.set('bl_hc_on_' + S.pid, v); },
  ignored(){ return ls.get('bl_hc_ign_' + S.pid, []); },
  ignore(id){ const a = this.ignored(); if (!a.includes(id)) { a.push(id); ls.set('bl_hc_ign_' + S.pid, a.slice(-500)); } }
};
const hcDay = iso => localDay(iso);
const hcToday = () => todayISO();
const hOf = (pid, d) => Store.get('health', pid + '_' + d);
const healthOf = pid => Store.list('health', pid).sort((a, b) => a.date.localeCompare(b.date));

// ---------- conexión y sincronización ----------
async function hcConnect(){
  const H = HC.plugin; if (!H) return;
  try {
    const av = await H.isAvailable();
    if (!av || !av.available) {
      toast('Health Connect no está disponible. En Android 13 o anterior instalá "Health Connect" desde Play Store.');
      try { await H.openHealthConnectSettings(); } catch(e){}
      return;
    }
    const st = await H.requestAuthorization({read: HC.READ, write: [], requestHistoryAccess: true});
    const ok = (st.readAuthorized || []);
    if (!ok.length) { toast('No diste permisos. Podés activarlos en Health Connect → Permisos de apps → Barra Libre.'); return; }
    HC.on = true; HC.hist = !!st.historyAccessAuthorized;
    toast('Conectado. Sincronizando…');
    await hcSync(true);
  } catch(e){ console.warn(e); toast('No se pudo conectar con Health Connect: ' + ((e && e.message) || e)); }
}
async function hcSync(manual){
  const H = HC.plugin, p = curProfile(); if (!H || !p || HC.busy) return;
  HC.busy = true; if (manual) App.refresh();
  const now = new Date();
  const first = !HC.last;
  const from = new Date(first ? now - (HC.hist ? 90 : 30) * 864e5 : Math.min(new Date(HC.last) - 2 * 864e5, now - 3 * 864e5));
  from.setHours(0, 0, 0, 0);
  const range = {startDate: from.toISOString(), endDate: now.toISOString()};
  const res = {steps: 0, sleep: 0, hr: 0, w: 0, wk: 0};
  const days = {};
  const day = d => days[d] || (days[d] = {});
  const safe = async (f) => { try { return await f(); } catch(e){ console.warn('HC', e); return null; } };
  // pasos por día
  const st = await safe(() => H.queryAggregated({dataType: 'steps', ...range, bucket: 'day', aggregation: 'sum'}));
  (st && st.samples || []).forEach(s => { if (s.value > 0) { day(hcDay(s.startDate)).steps = Math.round(s.value); } });
  // frecuencia cardíaca por día
  const hr = await safe(() => H.queryAggregated({dataType: 'heartRate', ...range, bucket: 'day', aggregation: ['average', 'min', 'max']}));
  (hr && hr.samples || []).forEach(s => { const v = s.values || {}; if (v.average) { const d = day(hcDay(s.startDate)); d.hrAvg = Math.round(v.average); d.hrMin = Math.round(v.min || 0) || null; d.hrMax = Math.round(v.max || 0) || null; } });
  const rh = await safe(() => H.readSamples({dataType: 'restingHeartRate', ...range, limit: 500, ascending: true}));
  (rh && rh.samples || []).forEach(s => { day(hcDay(s.startDate)).hrRest = Math.round(s.value); });
  const vo = await safe(() => H.readSamples({dataType: 'vo2Max', ...range, limit: 200, ascending: true}));
  (vo && vo.samples || []).forEach(s => { if (s.value > 10) day(hcDay(s.startDate)).vo2 = Math.round(s.value * 10) / 10; });
  // sueño: se asigna al día en que te despertás
  const sl = await safe(() => H.readSamples({dataType: 'sleep', ...range, limit: 500, ascending: true}));
  (sl && sl.samples || []).forEach(s => {
    const d = day(hcDay(s.endDate));
    const total = Math.round((new Date(s.endDate) - new Date(s.startDate)) / 60000);
    const g = {deep: 0, light: 0, rem: 0, awake: 0};
    (s.stages || []).forEach(x => { if (g[x.stage] != null) g[x.stage] += x.durationMinutes; else if (x.stage === 'asleep') g.light += x.durationMinutes; });
    const asleep = s.hasStageData ? g.deep + g.light + g.rem : (s.sleepState === 'awake' ? 0 : total);
    if (!d.sleepMin || asleep > d.sleepMin) Object.assign(d, {sleepMin: Math.round(asleep), sleepStart: s.startDate, sleepEnd: s.endDate, deep: Math.round(g.deep), light: Math.round(g.light), rem: Math.round(g.rem), awake: Math.round(g.awake)});
  });
  // guardar por día (sin pisar con valores vacíos)
  for (const [d, v] of Object.entries(days)) {
    const id = p.id + '_' + d, prev = Store.get('health', id) || {};
    const out = {...prev, ...Object.fromEntries(Object.entries(v).filter(([, x]) => x != null)), id, pid: p.id, date: d, src: 'hc', updatedAt: new Date().toISOString()};
    if (JSON.stringify({...prev, updatedAt: 0}) !== JSON.stringify({...out, updatedAt: 0})) { await Store.put('health', out); }
    if (v.sleepMin) res.sleep++; if (v.hrAvg) res.hr++;
    if (v.steps) { const sid = p.id + '_' + d, ps = Store.get('steps', sid); if (!ps || (ps.steps || 0) < v.steps) { await Store.put('steps', {id: sid, pid: p.id, date: d, steps: v.steps, src: 'hc'}); res.steps++; } }
  }
  // peso
  const wt = await safe(() => H.readSamples({dataType: 'weight', ...range, limit: 200, ascending: true}));
  for (const s of (wt && wt.samples || [])) { const d = hcDay(s.startDate), id = p.id + '_' + d; if (!Store.get('body', id) && s.value > 20) { await Store.put('body', {id, pid: p.id, date: d, kg: Math.round(s.value * 10) / 10, src: 'hc'}); res.w++; } }
  // FC durante los entrenamientos de fuerza que no la tienen
  for (const w of workoutsOf(p.id).filter(w => new Date(w.date) >= from && !w.hrAvg && w.durSec)) {
    const end = new Date(new Date(w.date).getTime() + w.durSec * 1000).toISOString();
    const r = await safe(() => H.readSamples({dataType: 'heartRate', startDate: w.date, endDate: end, limit: 5000, ascending: true}));
    const v = (r && r.samples || []).map(x => x.value).filter(x => x > 30);
    if (v.length >= 5) { await Store.put('workouts', {...w, hrAvg: Math.round(v.reduce((a, b) => a + b, 0) / v.length), hrMax: Math.round(Math.max(...v)), hrSrc: 'hc'}); res.wk++; }
  }
  // pulso, zonas y cadencia en running, bici, clases y yoga
  for (const a of actsOf(p.id).filter(a => new Date(a.date) >= from && a.durSec && !a.hrS && ['run', 'ride', 'class', 'yoga'].includes(a.sport))) {
    const s = actStreams(a).hr; if (s.length >= 10) continue;
    if (await safe(() => hcEnrichAct(a, H))) res.wk++;
  }
  // entrenamientos del reloj: quedan para revisar
  const wk = await safe(() => H.queryWorkouts({...range, limit: 200, ascending: false}));
  HC.pending = (wk && wk.workouts || []).filter(x => x.duration >= 300).map(x => ({...x, _id: x.platformId || (x.workoutType + x.startDate)}));
  ls.set('bl_hc_pend_' + p.id, HC.pending);
  HC.last = now.toISOString(); HC.busy = false;
  if (manual) toast(`Sincronizado: ${Object.keys(days).length} días${res.sleep ? ` · ${res.sleep} noches de sueño` : ''}${res.wk ? ` · pulso en ${res.wk} entrenamientos` : ''}`);
  App.refresh();
}
// sincroniza sola al abrir la app (cada 30 minutos como máximo)
function hcAuto(){ if (HC.plugin && HC.on && curProfile() && (!HC.last || Date.now() - new Date(HC.last) > 30 * 60000)) hcSync(false); }
document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(hcAuto, 1500); });

// ---------- entrenamientos del reloj ----------
const HC_MAP = {running:['run','suave'], runningTreadmill:['run','suave'], trackAndField:['run','series'], cycling:['ride','suave'], bikingStationary:['ride','rodillo'], handCycling:['ride','suave'],
  yoga:['yoga','hatha'], pilates:['class','pilates'], highIntensityIntervalTraining:['class','hiit'], crossTraining:['class','cross'], functionalStrengthTraining:['class','funcional'], bootCamp:['class','funcional'],
  boxing:['class','box'], kickboxing:['class','box'], martialArts:['class','box'], dance:['class','baile'], dancing:['class','baile'], cardioDance:['class','baile'], socialDance:['class','baile'],
  mixedCardio:['class','funcional'], exerciseClass:['class','funcional'], stepTraining:['class','funcional'], elliptical:['class','otra'], rowingMachine:['class','otra'], walking:['class','otra'], hiking:['class','otra'], swimming:['class','otra'], swimmingPool:['class','otra']};
const HC_NAME = {walking:'Caminata', hiking:'Caminata / trekking', elliptical:'Elíptico', rowingMachine:'Remo (máquina)', swimming:'Natación', swimmingPool:'Natación'};
const isStrength = t => /strength|weightlifting|calisthenics|coreTraining/i.test(t);
function hcDup(x){
  const p = curProfile(), t = new Date(x.startDate).getTime();
  const near = d => Math.abs(new Date(d).getTime() - t) < 25 * 60000;
  return actsOf(p.id).some(a => near(a.date)) || workoutsOf(p.id).some(w => near(w.date));
}
function hcPending(){
  const p = curProfile(); if (!p) return [];
  const list = HC.pending || ls.get('bl_hc_pend_' + p.id, []);
  const ign = HC.ignored();
  const out = [];
  list.filter(x => !ign.includes(x._id) && !hcDup(x)).forEach(x => {
    // el mismo entrenamiento grabado por Strava y por el reloj: queda uno solo (el que tiene distancia)
    const t = new Date(x.startDate).getTime();
    const j = out.findIndex(y => Math.abs(new Date(y.startDate).getTime() - t) < 15 * 60000);
    if (j < 0) out.push(x); else if ((x.totalDistance || 0) > (out[j].totalDistance || 0)) out[j] = x;
  });
  return out;
}
function hcLabel(x){
  const m = HC_MAP[x.workoutType];
  if (isStrength(x.workoutType)) return 'Fuerza';
  if (!m) return 'Otro';
  if (m[0] === 'run') return 'Running'; if (m[0] === 'ride') return 'Ciclismo'; if (m[0] === 'yoga') return 'Yoga';
  return HC_NAME[x.workoutType] || CLASS_TYPES[m[1]] || 'Clase';
}
App.views.sh_hcWorkouts = () => {
  const list = hcPending();
  return `<h2>Del reloj</h2><p class="small muted">Entrenamientos que grabó tu reloj y todavía no están en Barra Libre. Elegí cuáles agregar.</p>
  ${list.length ? list.map(x => { const st = isStrength(x.workoutType);
    return `<div class="card flat stack-s"><div class="row between"><div class="grow"><b>${esc(hcLabel(x))}</b><div class="small muted num">${fmtDate(x.startDate, {weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})} · ${Math.round(x.duration / 60)} min${x.totalDistance ? ' · ' + fmtNum(x.totalDistance / 1000, 2) + ' km' : ''}${x.totalEnergyBurned ? ' · ' + Math.round(x.totalEnergyBurned) + ' kcal' : ''}${x.sourceName ? ' · ' + esc(/strava/i.test(x.sourceName) ? 'Strava' : /mi|xiaomi/i.test(x.sourceName) ? 'Mi Fitness' : x.sourceName) : ''}</div></div></div>
    ${st ? `<p class="tiny muted">Las sesiones de fuerza se registran en Fuerza con series y pesos. Si ya lo hiciste, ignorala: la FC se completa sola en ese entrenamiento.</p>` : ''}
    <div class="row">${st ? '' : `<button class="btn sm primary grow" data-act="hcAdd" data-arg="${esc(x._id)}">Agregar</button>`}<button class="btn sm ${st ? 'grow' : ''}" data-act="hcIgnore" data-arg="${esc(x._id)}">Ignorar</button></div></div>`; }).join('')
    : '<div class="empty small">No hay entrenamientos nuevos del reloj.</div>'}`;
};
App.acts.hcIgnore = el => { HC.ignore(el.dataset.arg); App.renderOverlay(); App.refresh(); };
App.acts.hcAdd = async el => {
  const x = hcPending().find(y => y._id === el.dataset.arg); if (!x) return;
  const p = curProfile(), H = HC.plugin;
  const m = HC_MAP[x.workoutType] || ['class', 'otra'];
  const base = {id: 'hc_' + String(x._id).replace(/[^a-zA-Z0-9]/g, '').slice(-40), pid: p.id, date: x.startDate, durSec: Math.round(x.duration), src: 'hc', notes: 'Importado del reloj'};
  let a;
  if (m[0] === 'run' || m[0] === 'ride') a = {...base, sport: m[0], type: m[1], distKm: x.totalDistance ? Math.round(x.totalDistance / 10) / 100 : 0};
  else if (m[0] === 'yoga') a = {...base, sport: 'yoga', style: m[1], title: 'Yoga (reloj)', distKm: 0};
  else { const title = HC_NAME[x.workoutType] || (classTypes(p)[m[1]] || 'Clase'); a = {...base, sport: 'class', ctype: m[1], title, kcal: x.totalEnergyBurned ? Math.round(x.totalEnergyBurned) : null, distKm: 0}; }
  await Store.put('activities', a); try { await hcEnrichAct(a, H); } catch(e){} HC.ignore(x._id); App.renderOverlay(); App.refresh();
  toast(a.sport === 'class' ? 'Agregada. Podés marcar el esfuerzo (RPE) desde el historial.' : 'Agregado');
};

// ---------- tarjeta en Inicio ----------
const _stepsCard = window.stepsCard;
window.stepsCard = function(p){
  const base = _stepsCard(p);
  if (!HC.plugin) return base;
  const yest = localDay(new Date(Date.now() - 864e5));
  const h = hOf(p.id, hcToday()) || {}, hy = hOf(p.id, yest) || {};
  const sl = h.sleepMin ? h : hy.sleepMin ? hy : null;
  const pend = hcPending().length;
  const hm = m => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
  if (!HC.on) return base + `<div class="card stack-s"><div class="row between"><h3>Tu reloj</h3><span class="pill">Health Connect</span></div>
    <p class="small muted">Conectá Health Connect para cargar solos tus pasos, sueño y frecuencia cardíaca desde Mi Fitness.</p>
    <button class="btn primary" data-act="hcConnect">Conectar</button></div>`;
  return base + `<div class="card stack-s"><div class="row between"><h3>Tu reloj</h3><span class="small muted">${HC.busy ? 'Sincronizando…' : HC.last ? 'Actualizado ' + new Date(HC.last).toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}) : ''}</span></div>
    <div class="kpis">
      <div class="kpi"><b>${sl ? hm(sl.sleepMin) : '–'}</b><span>dormiste anoche</span></div>
      <div class="kpi"><b>${h.hrRest || hy.hrRest || '–'}</b><span>FC en reposo</span></div>
      <div class="kpi"><b>${h.hrAvg || '–'}</b><span>FC media hoy</span></div>
      <div class="kpi"><b>${sl && sl.deep != null && sl.sleepMin ? Math.round(sl.deep / sl.sleepMin * 100) + '%' : '–'}</b><span>sueño profundo</span></div>
    </div>
    ${pend ? `<button class="btn" data-act="sheet" data-arg="hcWorkouts">${pend} entrenamiento${pend > 1 ? 's' : ''} del reloj para revisar</button>` : ''}
    <div class="row"><button class="btn sm grow" data-act="hcSyncNow">${HC.busy ? 'Sincronizando…' : 'Sincronizar ahora'}</button><button class="btn sm ghost" data-act="hcSettings">Permisos</button></div></div>`;
};
App.acts.hcConnect = () => hcConnect();
App.acts.hcSyncNow = () => hcSync(true);
App.acts.hcSettings = async () => { try { await HC.plugin.openHealthConnectSettings(); } catch(e){ toast('No se pudo abrir Health Connect'); } };

// ---------- Progreso: sueño y frecuencia cardíaca (se ve también en la web) ----------
const _progView2 = App.views.prog;
App.views.prog = (p) => {
  const html = _progView2(p);
  const hs = healthOf(p.id).filter(h => (Date.now() - new Date(h.date + 'T12:00:00')) < 31 * 864e5);
  if (!hs.length) return html;
  const days = []; for (let i = 29; i >= 0; i--) days.push(localDay(new Date(Date.now() - i * 864e5)));
  const by = Object.fromEntries(hs.map(h => [h.date, h]));
  const sleepH = days.map(d => by[d] && by[d].sleepMin ? Math.round(by[d].sleepMin / 6) / 10 : null);
  const rest = days.map(d => by[d] && (by[d].hrRest || by[d].hrMin) ? (by[d].hrRest || by[d].hrMin) : null);
  const ok = sleepH.filter(x => x != null), avgS = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
  const okR = rest.filter(x => x != null), avgR = okR.length ? Math.round(okR.reduce((a, b) => a + b, 0) / okR.length) : null;
  const colS = cssv('--calis'), colR = cssv('--lift');
  chartLater('hcch', () => ({type:'bar', data:{labels: days.map(d => fmtDate(d + 'T12:00:00', {day:'numeric', month:'numeric'})), datasets:[
    {type:'bar', label:'Sueño (h)', data: sleepH, backgroundColor: colS + 'aa', borderRadius:3, yAxisID:'y'},
    {type:'line', label:'FC reposo', data: rest, borderColor: colR, backgroundColor: colR, pointRadius:2, tension:.3, spanGaps:true, yAxisID:'y1'}]},
    options: baseOpts({plugins:{legend:{display:true, labels:{boxWidth:10}}, tooltip:{intersect:false, mode:'index'}}, scales:{x:{grid:{display:false}, ticks:{maxTicksLimit:6}}, y:{beginAtZero:true, suggestedMax:9, grid:{color:cssv('--line')}, ticks:{maxTicksLimit:5}}, y1:{position:'right', beginAtZero:false, grid:{display:false}, ticks:{maxTicksLimit:4}}}})}));
  const card = `<div class="card stack-s"><div class="row between"><h3>Sueño y FC en reposo (30 días)</h3><span class="tiny muted">del reloj</span></div>
    <div class="row"><span class="small muted">Promedio de sueño: <b class="num">${avgS != null ? fmtNum(avgS, 1) + ' h' : '–'}</b></span><span class="small muted">FC en reposo: <b class="num">${avgR || '–'}</b></span></div>
    <div class="chartbox"><canvas id="hcch"></canvas></div>
    <p class="tiny muted">Dormir 7 horas o más se asocia con mejor recuperación y salud en adultos (Watson 2015). Si tu FC en reposo sube varios latidos sobre lo habitual varios días seguidos, puede ser señal de fatiga: conviene una semana más liviana.</p></div>`;
  const mark = '<div class="card stack-s"><h3>Peso corporal</h3>';
  return html.includes(mark) ? html.replace(mark, card + mark) : html;
};
window.REFS.watson2015 = 'Watson NF, Badr MS, Belenky G, et al. Recommended amount of sleep for a healthy adult: a joint consensus statement of the AASM and SRS. Sleep. 2015;38(6):843-844.';

// ---------- ingreso dentro de la app de Android ----------
if (HC.plugin && App.views.login) {
  const _login = App.views.login;
  App.views.login = () => _login().replace(/<button class="btn primary" data-act="lgGoogle">[^<]*<\/button>/, `<p class="small" style="opacity:.85">En la app de Android entrá con tu email y contraseña. Si tu cuenta es de Google y todavía no tiene contraseña, creala primero desde la web: <b>Menú → Cuenta → Crear contraseña para la app</b>.</p>`);
}
// En la web: crear una contraseña para la cuenta de Google (para entrar en la app de Android)
if (window.FIREBASE_CONFIG && App.views.sh_menu) {
  const _menu = App.views.sh_menu;
  App.views.sh_menu = (p, sh) => {
    let html = _menu(p, sh);
    const u = Store.user;
    const android = /Android/i.test(navigator.userAgent);
    if (u && !HC.plugin && !(u.providerData || []).some(x => x.providerId === 'password')) {
      html = html.replace('<button class="btn sm danger" data-act="logout">', `<button class="btn sm" data-act="sheet" data-arg="hcPass">Crear contraseña para la app de Android</button><button class="btn sm danger" data-act="logout">`);
    }

    return html;
  };
  App.views.sh_hcPass = () => `<h2>Contraseña para la app</h2><p class="small muted">La app de Android no permite "Entrar con Google". Creá una contraseña para tu misma cuenta (${esc((Store.user && Store.user.email) || '')}); vas a seguir pudiendo entrar con Google en la web.</p>
    <div class="field"><label for="hp1">Contraseña nueva (mínimo 6 caracteres)</label><input id="hp1" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="hp2">Repetila</label><input id="hp2" type="password" autocomplete="new-password"></div>
    <p id="hperr" class="small" style="color:var(--bad)"></p>
    <button class="btn primary" data-act="hcPassSave">Crear contraseña</button>`;
  App.acts.hcPassSave = async () => {
    const a = $('#hp1').value, b = $('#hp2').value, err = $('#hperr');
    if (a.length < 6) { err.textContent = 'Tiene que tener al menos 6 caracteres.'; return; }
    if (a !== b) { err.textContent = 'Las contraseñas no coinciden.'; return; }
    try {
      const u = firebase.auth().currentUser;
      await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, a));
      App.closeSheet(); toast('Listo: en la app entrá con ' + u.email + ' y esa contraseña');
    } catch(e){
      err.textContent = e && e.code === 'auth/requires-recent-login' ? 'Por seguridad, cerrá sesión, volvé a entrar con Google y repetí este paso.'
        : e && e.code === 'auth/operation-not-allowed' ? 'Falta activar "Correo/contraseña" en Firebase → Authentication → Método de acceso.'
        : e && e.code === 'auth/provider-already-linked' ? 'Tu cuenta ya tiene contraseña.' : 'No se pudo: ' + ((e && (e.code || e.message)) || e);
    }
  };
}
// Links externos (videos de YouTube) dentro de la app de Android
if (HC.plugin) {
  App.acts.yVidOpen = el => { const v = (curProfile().yVideos || []).find(x => x.id === el.dataset.arg); if (v) location.href = v.url; };
}
// primera sincronización al abrir
if (HC.plugin) { const _boot = setInterval(() => { if (Store.mode !== 'loading' && curProfile()) { clearInterval(_boot); hcAuto(); App.refresh(); } }, 1000); setTimeout(() => clearInterval(_boot), 60000); }

// ---------- ofrecer la app de Android desde la web ----------
if (!HC.plugin) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const needsPass = () => { const u = Store.user; return !!(u && !(u.providerData || []).some(x => x.providerId === 'password')); };
  // Menú: siempre visible en la web (en la PC sirve para ver el link y pasarlo al teléfono)
  const _menu2 = App.views.sh_menu;
  App.views.sh_menu = (p, sh) => _menu2(p, sh).replace('<div class="it" data-act="sheet" data-arg="settings">', `<div class="it" data-act="sheet" data-arg="apkInfo"><div class="grow"><b>App de Android</b><div class="small muted">Conectá tu reloj: pasos, sueño y pulso automáticos</div></div></div><div class="it" data-act="sheet" data-arg="settings">`);
  // Inicio: aviso en teléfonos Android, se puede ocultar
  const _home3 = App.views.home;
  App.views.home = (p) => {
    const html = _home3(p);
    if (!isAndroid || ls.get('bl_apk_hide', false)) return html;
    const b = `<div class="banner info"><div class="grow"><b>¿Usás reloj o pulsera?</b><div class="small">Instalá la app de Android y se cargan solos tus pasos, sueño y frecuencia cardíaca.</div></div><div class="stack-s"><button class="btn sm primary" data-act="sheet" data-arg="apkInfo">Ver</button><button class="btn sm ghost" data-act="apkHide">Ocultar</button></div></div>`;
    return html.replace('<div class="stack">', '<div class="stack">' + b);
  };
  App.acts.apkHide = () => { ls.set('bl_apk_hide', true); App.render(); toast('Listo. La encontrás en Menú → App de Android'); };
  App.views.sh_apkInfo = () => `<h2>App de Android</h2>
    <p class="small">Es la misma Barra Libre, con tus mismos datos, pero además lee tu reloj o pulsera a través de <b>Health Connect</b>: pasos, sueño, frecuencia cardíaca, entrenamientos y zonas de pulso.</p>
    <p class="small muted">Funciona con relojes que sincronizan con Health Connect (Mi Fitness, Samsung Health, Fitbit, Garmin Connect, Strava y otros). Solo Android 8 o más nuevo. Es opcional: la web sigue funcionando igual.</p>
    ${needsPass() ? `<div class="banner small"><div class="grow"><b>Primero:</b> en la app no se puede "Entrar con Google". Creá una contraseña para tu cuenta y después entrá en la app con tu email y esa contraseña.</div></div><button class="btn" data-act="sheet" data-arg="hcPass">1. Crear contraseña</button>` : ''}
    ${isAndroid ? `<a class="btn primary" style="text-decoration:none" href="${HC.APK}">${needsPass() ? '2. ' : ''}Descargar la app (.apk)</a>` : `<p class="small">Abrí esta página desde el teléfono Android para descargarla, o usá este link:</p><input type="text" readonly value="${HC.APK}" onclick="this.select()" aria-label="Link de descarga">
      <button class="btn" data-act="apkCopy">Copiar link</button>`}
    <div class="stack-s"><span class="label">Cómo instalarla</span>
      <p class="small">1. Abrí el archivo descargado. Android te va a pedir permiso para <b>instalar apps de este origen</b>: aceptá (es normal en apps que no vienen de Play Store).</p>
      <p class="small">2. Abrí Barra Libre desde el ícono nuevo y entrá con tu email y contraseña.</p>
      <p class="small">3. En la app de tu reloj activá Health Connect (en Mi Fitness: Perfil → Ajustes → Health Connect).</p>
      <p class="small">4. En Barra Libre: Inicio → <b>Tu reloj</b> → Conectar.</p></div>
    <p class="tiny muted">Tus datos de salud solo los ves vos. <a href="privacidad.html" target="_blank" rel="noopener">Política de privacidad</a></p>`;
  App.acts.apkCopy = async () => { try { await navigator.clipboard.writeText(HC.APK); toast('Link copiado'); } catch(e){ toast('Mantené apretado el link para copiarlo'); } };
}
