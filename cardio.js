// Pestaña Cardio: running y ciclismo. Registro, importación GPX/TCX, estadísticas, planes.
'use strict';
const SP = {run:{label:'Running', color:'--run', types: () => L.RUN_TYPES}, ride:{label:'Ciclismo', color:'--ride', types: () => L.RIDE_TYPES}};
const EASY = {suave:1, largo:1, rodillo:0, otro:0};
const isEasy = a => a.rpe ? a.rpe <= 5 : !!EASY[a.type];

function routeSVG(track, color, cls){
  if (!track || track.length < 2) return `<div class="route ${cls||''}" aria-hidden="true"></div>`;
  const lat0 = track.reduce((t,p) => t + p[0], 0) / track.length; const k = Math.cos(lat0 * Math.PI / 180);
  const xs = track.map(p => p[1] * k), ys = track.map(p => -p[0]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const span = Math.max(maxx - minx, maxy - miny) || 1; const pad = 8, W = 100;
  const sx = x => pad + (x - minx) / span * (W - 2*pad) + ((W - 2*pad) - (maxx - minx) / span * (W - 2*pad)) / 2;
  const sy = y => pad + (y - miny) / span * (W - 2*pad) + ((W - 2*pad) - (maxy - miny) / span * (W - 2*pad)) / 2;
  const d = xs.map((x, i) => (i ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(ys[i]).toFixed(1)).join('');
  return `<svg class="route ${cls||''}" viewBox="0 0 100 100" aria-hidden="true"><path d="${d}" fill="none" stroke="var(${color})" stroke-width="${cls==='bigroute'?1.6:2.6}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${sx(xs[0]).toFixed(1)}" cy="${sy(ys[0]).toFixed(1)}" r="2.6" fill="var(--ok)"/><circle cx="${sx(xs[xs.length-1]).toFixed(1)}" cy="${sy(ys[ys.length-1]).toFixed(1)}" r="2.6" fill="var(--fg)"/></svg>`;
}
const speed = a => a.durSec ? a.distKm / (a.durSec / 3600) : 0;
function actMetric(a){
  if (a.sport === 'run') return a.distKm ? `${L.paceStr(a.durSec / a.distKm)} /km` : '';
  if (a.sport === 'ride' || a.sport === 'hike') return a.durSec && a.distKm ? `${fmtNum(speed(a),1)} km/h` : '';
  return '';
}
function activityItem(a){
  const sp = a.sport;
  const title = sp === 'yoga' ? (a.title || 'Yoga') : (SP[sp].types()[a.type] || SP[sp].label);
  const main = sp === 'yoga' ? `${Math.round((a.durSec||0)/60)} min` : `${fmtNum(a.distKm, 1)} km · ${L.durStr(a.durSec)}`;
  return `<div class="it" data-act="sheet" data-arg="actDetail" data-extra='${esc(JSON.stringify({id:a.id}))}'>
    ${sp !== 'yoga' ? routeSVG(a.track, SP[sp].color) : `<span class="pill yoga">Yoga</span>`}
    <div class="grow"><b>${esc(title)}</b><div class="small muted num">${fmtDate(a.date)} · ${main}${actMetric(a) ? ' · ' + actMetric(a) : ''}</div></div>
    ${sp !== 'yoga' ? `<span class="pill ${sp}">${sp==='run'?'Running':sp==='hike'?'Trekking':'Bici'}</span>` : ''}</div>`;
}

App.views.cardio = (p) => {
  const sp = S.cardio; const cfg = SP[sp];
  const acts = actsOf(p.id, sp);
  const now = new Date(); const ws = L.weekStart(now);
  const weeks = []; for (let i = 11; i >= 0; i--) { const s = new Date(ws); s.setDate(s.getDate() - 7*i); weeks.push(s); }
  const weekKm = weeks.map(s => { const e = new Date(s); e.setDate(e.getDate() + 7); return acts.filter(a => { const d = new Date(a.date); return d >= s && d < e; }).reduce((t,a) => t + (a.distKm||0), 0); });
  const thisW = weekKm[11], avg4 = (weekKm[8] + weekKm[9] + weekKm[10] + weekKm[11]) / 4;
  const monthKm = acts.filter(a => { const d = new Date(a.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((t,a) => t + (a.distKm||0), 0);
  const last28 = acts.filter(a => (now - new Date(a.date)) < 28*86400000);
  const tMin = last28.reduce((t,a) => t + (a.durSec||0), 0);
  const easyPct = tMin ? Math.round(last28.filter(isEasy).reduce((t,a) => t + (a.durSec||0), 0) / tMin * 100) : null;
  const col = cssv(cfg.color);
  chartLater('wkch', () => ({type:'bar', data:{labels: weeks.map(s => fmtDate(s,{day:'numeric',month:'numeric'})), datasets:[{data: weekKm.map(x => +x.toFixed(1)), backgroundColor: weekKm.map((_,i) => i === 11 ? col : col + '88'), borderRadius:4}]}, options: baseOpts()}));
  const trend = acts.filter(a => a.distKm && a.durSec).slice(0, 15).reverse();
  if (trend.length > 1) chartLater('trch', () => ({type:'line', data:{labels: trend.map(a => fmtDate(a.date,{day:'numeric',month:'numeric'})), datasets:[{data: trend.map(a => sp === 'run' ? +(a.durSec/a.distKm/60).toFixed(2) : +speed(a).toFixed(1)), borderColor: col, backgroundColor: col, tension:.3, pointRadius:3}]},
    options: baseOpts({scales:{x:{grid:{display:false}}, y:{reverse: sp === 'run', beginAtZero:false, ticks:{maxTicksLimit:4, callback: v => sp === 'run' ? L.paceStr(v*60) : v}}}, plugins:{legend:{display:false}, tooltip:{callbacks:{label: c => sp === 'run' ? L.paceStr(c.parsed.y*60) + ' /km' : c.parsed.y + ' km/h'}}}})}));
  let pred = '';
  if (sp === 'run') {
    const recent = acts.filter(a => a.distKm >= 3 && a.durSec && (now - new Date(a.date)) < 90*86400000);
    if (recent.length) {
      const best = recent.reduce((b, a) => L.riegel(a.durSec, a.distKm, 10) < L.riegel(b.durSec, b.distKm, 10) ? a : b);
      pred = `<div class="card stack-s"><div class="row between"><h3>Tiempos estimados</h3><span class="tiny muted">Riegel, desde tus ${fmtNum(best.distKm,1)} km del ${fmtDate(best.date,{day:'numeric',month:'short'})}</span></div>
        <div class="kpis">${[[5,'5 K'],[10,'10 K'],[21.0975,'21 K'],[42.195,'42 K']].map(([d,l]) => `<div class="kpi"><b style="font-size:20px">${L.durStr(L.riegel(best.durSec, best.distKm, d))}</b><span>${l} · ${L.paceStr(L.riegel(best.durSec, best.distKm, d)/d)}/km</span></div>`).join('')}</div>
        <p class="tiny muted">Estimación orientativa: es más precisa para distancias cercanas a la que corriste y si entrenás para esa distancia.</p></div>`;
    }
  }
  const zones = L.hrZones(p.age);
  return `<div class="stack">
    <div class="seg" role="group" aria-label="Deporte">${Object.entries(SP).map(([k,v]) => `<button data-act="seg" data-key="cardio" data-arg="${k}" aria-pressed="${sp===k}">${v.label}</button>`).join('')}</div>
    <div class="row"><button class="btn primary grow" data-act="logAct" data-arg="${sp}">Registrar ${sp==='run'?'carrera':'salida'}</button>
      <label class="btn grow" for="trk">Importar archivos</label><input id="trk" type="file" accept=".gpx,.tcx,.fit,.zip,.gz,application/gpx+xml,application/xml,text/xml,application/zip,application/vnd.ant.fit,application/octet-stream" multiple hidden data-change="importTrack"></div>
    <div class="kpis"><div class="kpi"><b style="color:var(${cfg.color})">${fmtNum(thisW,1)}</b><span>km esta semana</span></div><div class="kpi"><b>${fmtNum(avg4,1)}</b><span>km/sem promedio (4 sem.)</span></div><div class="kpi"><b>${fmtNum(monthKm,0)}</b><span>km este mes</span></div><div class="kpi"><b>${acts.length}</b><span>${sp==='run'?'carreras':'salidas'} totales</span></div></div>
    <div class="card stack-s"><h3>Kilómetros por semana</h3><div class="chartbox"><canvas id="wkch" aria-label="Kilómetros por semana, últimas 12 semanas"></canvas></div></div>
    ${trend.length > 1 ? `<div class="card stack-s"><h3>${sp==='run'?'Ritmo (min/km, arriba = más rápido)':'Velocidad media (km/h)'}</h3><div class="chartbox"><canvas id="trch"></canvas></div></div>` : ''}
    ${pred}
    <div class="card stack-s"><div class="row between"><h3>Intensidad (últimos 28 días)</h3>${easyPct != null ? `<span class="pill ${easyPct >= 70 ? 'ok' : 'warn'}">${easyPct}% suave</span>` : ''}</div>
      ${easyPct != null ? `<div class="progress" style="height:12px;position:relative"><i style="width:${easyPct}%;background:var(${cfg.color})"></i><span style="position:absolute;left:80%;top:-3px;bottom:-3px;width:2px;background:var(--fg)" title="Referencia 80%"></span></div>
      <p class="small muted">La línea marca la referencia 80/20 (Seiler 2010). Se considera suave lo que registraste con RPE 5 o menos, o como rodaje/fondo.</p>` : '<p class="small muted">Registrá actividades con RPE para ver cuánto entrenás suave vs intenso.</p>'}
      ${zones ? `<details><summary>Tus zonas de frecuencia cardíaca</summary><p class="small" style="margin-top:6px">FC máx. estimada ${L.hrMax(p.age)} lpm (Tanaka 2001): ${zones.map(z => `Z${z.z} ${z.lo}–${z.hi}`).join(' · ')}</p></details>` : ''}</div>
    ${cardioPlanView(p, sp)}
    <div class="section"><h3>Historial</h3>${acts.length ? `<div class="card list">${acts.slice(0, 30).map(activityItem).join('')}</div>` : `<div class="empty">Sin ${sp==='run'?'carreras':'salidas'} todavía. Registrá una a mano o importá el archivo de tu reloj.</div>`}</div>
  </div>`;
};

function cardioPlanView(p, sp){
  if (sp === 'hike') return '';
  const key = sp === 'run' ? 'runPlan' : 'ridePlan'; const rp = p[key];
  if (!rp) return `<div class="card stack-s"><h3>Plan de ${sp==='run'?'running':'ciclismo'}</h3><p class="small muted">Armá un plan progresivo: aumentos de volumen graduales, semana liviana cada cuatro y la mayor parte del tiempo a ritmo suave.</p><button class="btn" data-act="sheet" data-arg="planBuild" data-extra='{"sp":"${sp}"}'>Armar plan</button></div>`;
  const cw = curPlanWeek(rp);
  const start = new Date(rp.startDate + 'T00:00:00');
  const wk = cw ? cw.week : null;
  let doneN = 0;
  if (cw) { const s = L.weekStart(new Date()); doneN = actsOf(p.id, sp).filter(a => new Date(a.date) >= s).length; }
  const unit = w => sp === 'run' ? `${fmtNum(w.km,1)} km` : `${fmtNum(w.hours,2)} h`;
  const sess = s => sp === 'run' ? `${fmtNum(s.km,1)} km` : `${s.min}′`;
  return `<div class="card stack-s">
    <div class="row between"><h3>${esc(rp.label)}</h3><span class="small muted">${rp.weeks} semanas · ${rp.days} días</span></div>
    ${cw ? `<div class="row between"><span class="pill ${sp}">Semana ${cw.week} · ${esc(cw.label)}</span><span class="small num">${unit(cw)} · ${doneN}/${cw.sessions.length} hechas</span></div>
      ${cw.sessions.map(s => `<div class="sess"><span class="k">${sess(s)}</span><div class="grow"><b class="small">${esc((sp==='run'?L.RUN_TYPES:L.RIDE_TYPES)[s.type]||s.type)}</b><p class="small muted">${esc(s.desc)}</p></div><button class="btn sm" data-act="logAct" data-arg="${sp}" data-type="${s.type}" data-km="${s.km||''}">Registrar</button></div>`).join('')}`
      : `<p class="small muted">${new Date() < start ? 'El plan empieza el ' + fmtDate(start) : 'El plan terminó. ¡Felicitaciones!'}</p>`}
    <details><summary>Ver todas las semanas</summary><div style="margin-top:6px">${rp.plan.map(w => `<div class="weekrow ${w.week===wk?'':''}"><b class="num" style="min-width:56px">Sem ${w.week}</b><span class="small grow">${esc(w.label)}</span><b class="small num">${unit(w)}</b></div>`).join('')}</div></details>
    <p class="tiny muted">Basado en distribución 80/20 (Seiler 2010) y aumentos graduales de volumen (Nielsen 2014).</p>
    <button class="btn sm ghost danger" data-act="delCardioPlan" data-arg="${key}">Borrar plan</button></div>`;
}
App.acts.delCardioPlan = el => { const p = curProfile(); Store.put('profiles', {...p, [el.dataset.arg]: null}); App.render(); };

App.views.sh_planBuild = (p, sh) => {
  const sp = sh.sp; const G = sp === 'run' ? L.RUN_GOALS : L.RIDE_GOALS;
  const f = sh.f || (sh.f = {goal: Object.keys(G)[sp==='run'?1:0], days: 3, weeks: '', cur: sp === 'run' ? 10 : 3, start: todayISO()});
  return `<h2>Plan de ${sp==='run'?'running':'ciclismo'}</h2>
  <div class="field"><label>Objetivo</label><div class="stack-s">${Object.entries(G).map(([k,g]) => `<button class="opt" data-act="pbSet" data-k="goal" data-v="${k}" aria-pressed="${f.goal===k}"><span class="tick"></span><span><b>${esc(g.label)}</b><span class="small muted">${g.weeks} semanas sugeridas</span></span></button>`).join('')}</div></div>
  <div class="grid2"><div class="field"><label for="pb_cur">${sp==='run'?'Km por semana actuales':'Horas por semana actuales'}</label><input id="pb_cur" type="text" inputmode="decimal" autocomplete="off" value="${esc(f.cur)}" data-bind="pb" data-k="cur"></div>
  <div class="field"><label for="pb_w">Semanas (opcional)</label><input id="pb_w" type="number" inputmode="numeric" placeholder="${G[f.goal].weeks}" value="${esc(f.weeks)}" data-bind="pb" data-k="weeks"></div></div>
  <div class="field"><label>Días por semana</label><div class="chips">${[2,3,4,5,6].map(n => `<button class="chip" data-act="pbSet" data-k="days" data-v="${n}" aria-pressed="${f.days===n}">${n}</button>`).join('')}</div></div>
  <div class="field"><label for="pb_s">Empieza</label><input id="pb_s" type="date" value="${esc(f.start)}" data-bind="pb" data-k="start"></div>
  ${sp==='run' && (+f.cur||0) < 10 && ['21k','42k'].includes(f.goal) ? '<div class="banner small"><div>Partís de poco volumen para esta distancia. Considerá un plan más largo o empezar por 10 K.</div></div>' : ''}
  <button class="btn primary" data-act="pbMake">Crear plan</button>`;
};
App.binds.pb = el => { S.sheet.f[el.dataset.k] = el.value; };
App.acts.pbSet = el => { let v = el.dataset.v; if (/^\d+$/.test(v)) v = +v; S.sheet.f[el.dataset.k] = v; App.renderOverlay(); };
App.acts.pbMake = () => {
  const p = curProfile(); const sh = S.sheet, f = sh.f;
  const plan = sh.sp === 'run' ? L.buildRunPlan({goal: f.goal, currentKm: num(f.cur) || 10, days: f.days, weeks: f.weeks, startDate: f.start}) : L.buildRidePlan({goal: f.goal, currentH: num(f.cur) || 3, days: f.days, weeks: f.weeks, startDate: f.start});
  Store.put('profiles', {...p, [sh.sp === 'run' ? 'runPlan' : 'ridePlan']: plan}); App.closeSheet(); App.render(); toast('Plan creado');
};

// ---------- registrar / editar ----------
App.acts.logAct = el => {
  const sp = el.dataset.arg;
  App.openSheet('act', {f: {id: null, sport: sp, date: todayISO(), type: el.dataset.type || (sp === 'hike' ? 'caminata' : 'suave'), distKm: el.dataset.km || '', dur: '', hr: '', rpe: '', elev: '', notes: '', power: ''}});
};
App.views.sh_act = (p, sh) => {
  const f = sh.f; const types = SP[f.sport] ? SP[f.sport].types() : L.RIDE_TYPES;
  const durS = L.parseDur(f.dur), dist = num(f.distKm) || 0;
  const live = durS && dist ? (f.sport === 'run' ? `${L.paceStr(durS/dist)} /km` : `${fmtNum(dist/(durS/3600),1)} km/h`) : '';
  return `<h2>${f.id ? 'Editar' : 'Registrar'} ${f.sport==='run'?'carrera':f.sport==='hike'?'caminata o trekking':'salida en bici'}</h2>
  ${f.track ? `<div class="row">${routeSVG(f.track, SP[f.sport].color)}<p class="small muted grow">Importado del archivo: recorrido${f.splits && f.splits.length ? ', parciales por km' : ''}${f.hr ? ', frecuencia cardíaca' : ''}.</p></div>` : ''}
  <div class="grid2"><div class="field"><label for="a_date">Fecha</label><input id="a_date" type="date" value="${esc(f.date.slice(0,10))}" data-bind="af" data-k="date"></div>
  <div class="field"><label for="a_type">Tipo</label><select id="a_type" data-change="af" data-k="type">${Object.entries(types).map(([k,v]) => `<option value="${k}" ${f.type===k?'selected':''}>${v}</option>`).join('')}</select></div>
  <div class="field"><label for="a_dist">Distancia (km)</label><input id="a_dist" type="text" inputmode="decimal" autocomplete="off" value="${esc(f.distKm)}" data-bind="af" data-k="distKm"></div>
  <div class="field"><label for="a_dur">Tiempo (h:mm:ss o mm:ss)</label><input id="a_dur" type="text" inputmode="numeric" placeholder="45:30" value="${esc(f.dur)}" data-bind="af" data-k="dur"></div>
  <div class="field"><label for="a_hr">FC media (lpm)</label><input id="a_hr" type="number" inputmode="numeric" value="${esc(f.hr)}" data-bind="af" data-k="hr"></div>
  <div class="field"><label for="a_elev">Desnivel (m)</label><input id="a_elev" type="number" inputmode="numeric" value="${esc(f.elev)}" data-bind="af" data-k="elev"></div>
  ${f.sport==='ride' ? `<div class="field"><label for="a_pow">Potencia media (W, opcional)</label><input id="a_pow" type="number" inputmode="numeric" value="${esc(f.power)}" data-bind="af" data-k="power"></div>` : ''}</div>
  <p class="small num" id="a_live">${live ? (f.sport==='run'?'Ritmo: ':'Velocidad: ') + live : ''}</p>
  <div class="field"><label>Esfuerzo percibido (RPE 1–10)</label><div class="chips">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button class="chip" data-act="afRpe" data-arg="${n}" aria-pressed="${+f.rpe===n}">${n}</button>`).join('')}</div>
  <p class="tiny muted">1–3 muy fácil · 4–5 conversás cómodo · 6–7 frases cortas · 8–10 muy duro</p></div>
  <div class="field"><label for="a_notes">Notas</label><textarea id="a_notes" data-bind="af" data-k="notes">${esc(f.notes)}</textarea></div>
  <button class="btn primary" data-act="saveAct">Guardar</button>`;
};
App.binds.af = el => {
  S.sheet.f[el.dataset.k] = el.value;
  const f = S.sheet.f, d = L.parseDur(f.dur), k = num(f.distKm) || 0, o = $('#a_live');
  if (o) o.textContent = d && k ? (f.sport === 'run' ? 'Ritmo: ' + L.paceStr(d/k) + ' /km' : 'Velocidad: ' + fmtNum(k/(d/3600),1) + ' km/h') : '';
};
App.acts.afRpe = el => { S.sheet.f.rpe = +el.dataset.arg; App.renderOverlay(); };
App.acts.saveAct = async () => {
  const p = curProfile(); const f = S.sheet.f;
  const durSec = L.parseDur(f.dur);
  const dKm = num(f.distKm) || 0;
  if (!dKm && !durSec) { toast('Cargá al menos distancia o tiempo'); return; }
  const date = f.date.length === 10 ? f.date + (f.time || 'T12:00:00') : f.date;
  const a = {id: f.id || uid(), pid: p.id, sport: f.sport, date, type: f.type, distKm: dKm, durSec, hr: +f.hr || null, rpe: +f.rpe || null, elev: +f.elev || null, power: +f.power || null, notes: f.notes || '', track: f.track || null, splits: f.splits || null};
  await Store.put('activities', a); App.closeSheet(); App.render(); toast('Actividad guardada');
};

// ---------- importar GPX / TCX ----------
// Lee un GPX o TCX y devuelve resumen + recorrido. Lanza error si no se puede.
function parseTrack(text, defSport){
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length) throw new Error('xml');
  const pts = []; let hrs = []; let sport = defSport;
  const tag = (n, t) => { const x = n.getElementsByTagName(t)[0]; return x ? x.textContent : null; };
  const trk = xml.getElementsByTagName('trkpt');
  if (trk.length) {
    for (const n of trk) { pts.push({lat: +n.getAttribute('lat'), lon: +n.getAttribute('lon'), ele: tag(n,'ele') != null ? +tag(n,'ele') : null, time: tag(n,'time') ? Date.parse(tag(n,'time')) : null});
      const h = n.getElementsByTagNameNS('*','hr')[0]; if (h) hrs.push(+h.textContent); }
    const ty = tag(xml, 'type'); if (ty && /bik|cycl|ride/i.test(ty)) sport = 'ride'; if (ty && /run/i.test(ty)) sport = 'run'; if (ty && /hik|walk|trek/i.test(ty)) sport = 'hike';
  } else {
    const act = xml.getElementsByTagName('Activity')[0];
    if (act) { const s = act.getAttribute('Sport') || ''; if (/bik/i.test(s)) sport = 'ride'; if (/run/i.test(s)) sport = 'run'; if (/hik|walk/i.test(s)) sport = 'hike'; }
    for (const n of xml.getElementsByTagName('Trackpoint')) {
      const la = tag(n,'LatitudeDegrees'), lo = tag(n,'LongitudeDegrees');
      const h = n.getElementsByTagName('HeartRateBpm')[0]; if (h) hrs.push(+tag(h,'Value'));
      if (la != null && lo != null) pts.push({lat: +la, lon: +lo, ele: tag(n,'AltitudeMeters') != null ? +tag(n,'AltitudeMeters') : null, time: tag(n,'Time') ? Date.parse(tag(n,'Time')) : null});
    }
  }
  let res = pts.length > 1 ? L.analyzeTrack(pts) : null;
  if (!res) {
    let dist = 0, dur = 0; for (const lap of xml.getElementsByTagName('Lap')) { dist += +(tag(lap,'DistanceMeters')||0); dur += +(tag(lap,'TotalTimeSeconds')||0); }
    const id = tag(xml,'Id');
    if (!dist && !dur) throw new Error('empty');
    res = {distKm: +(dist/1000).toFixed(2), durSec: Math.round(dur), elev: null, splits: [], track: null, date: id ? new Date(id).toISOString() : null};
  }
  hrs = hrs.filter(x => x > 30 && x < 230);
  return {sport, res, hrAvg: hrs.length ? Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length) : null, hrMax: hrs.length ? Math.max(...hrs) : null};
}
const toLocalStr = d => new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset()*60000).toISOString().slice(0,19);

App.binds.importTrack = el => {
  const files = el.files ? [...el.files] : []; if (!files.length) return;
  if (files.length > 1 || !/\.(gpx|tcx)$/i.test(files[0].name)) { bulkImport(files); el.value = ''; return; }
  const file = files[0];
  const r = new FileReader();
  r.onload = () => {
    try {
      const {sport, res, hrAvg} = parseTrack(r.result, S.cardio);
      const loc = res.date ? toLocalStr(res.date) : todayISO() + 'T12:00:00';
      App.openSheet('act', {f: {id: null, sport, date: loc.slice(0,10), time: loc.slice(10,19), type: 'suave', distKm: res.distKm, dur: L.durStr(res.durSec), hr: hrAvg || '', rpe: '', elev: res.elev || '', notes: file.name, power: '', track: res.track, splits: res.splits}});
    } catch(e){ toast('No pude leer el archivo. Probá exportar como GPX o TCX desde tu reloj o Strava.'); }
    el.value = '';
  };
  r.readAsText(file);
};

// ---------- detalle ----------
App.views.sh_actDetail = (p, sh) => {
  const a = Store.get('activities', sh.id); if (!a) return '<p>No encontrado.</p>';
  if (a.sport === 'yoga') return yogaDetail(a, sh);
  const cfg = SP[a.sport]; const col = cssv(cfg.color);
  if (a.splits && a.splits.length > 1) chartLater('spch', () => ({type:'bar', data:{labels: a.splits.map((_,i) => 'km ' + (i+1)), datasets:[{data: a.splits.map(s => a.sport !== 'ride' ? +(s/60).toFixed(2) : +(3600/s).toFixed(1)), backgroundColor: col, borderRadius:3}]},
    options: baseOpts({scales:{x:{grid:{display:false}, ticks:{maxTicksLimit:8}}, y:{beginAtZero:false, ticks:{maxTicksLimit:4, callback: v => a.sport !== 'ride' ? L.paceStr(v*60) : v}}}, plugins:{legend:{display:false}, tooltip:{callbacks:{label: c => a.sport !== 'ride' ? L.paceStr(c.parsed.y*60) + ' /km' : c.parsed.y + ' km/h'}}}})}));
  return `<div><span class="label">${fmtDate(a.date,{weekday:'long',day:'numeric',month:'long'})}</span><h2>${esc(cfg.types()[a.type] || cfg.label)}</h2></div>
  ${a.track ? routeSVG(a.track, cfg.color, 'bigroute').replace('class="route bigroute"', 'class="route bigroute" style="width:100%;height:auto;aspect-ratio:1.4;max-height:260px"') : ''}
  <div class="kpis"><div class="kpi"><b>${fmtNum(a.distKm,2)}</b><span>km</span></div><div class="kpi"><b style="font-size:20px">${L.durStr(a.durSec)}</b><span>tiempo</span></div><div class="kpi"><b style="font-size:20px">${actMetric(a).split(' ')[0] || '–'}</b><span>${a.sport==='run'?'min/km':'km/h'}</span></div><div class="kpi"><b>${a.hr || '–'}</b><span>FC media</span></div></div>
  <p class="small muted">${[a.elev ? `Desnivel +${a.elev} m` : '', a.rpe ? `RPE ${a.rpe}` : '', a.power ? `${a.power} W` : ''].filter(Boolean).join(' · ')}</p>
  ${a.splits && a.splits.length > 1 ? `<div class="stack-s"><span class="label">Parciales por km</span><div class="chartbox"><canvas id="spch"></canvas></div></div>` : ''}
  ${a.notes ? `<p class="small"><b>Notas:</b> ${esc(a.notes)}</p>` : ''}
  <div class="row"><button class="btn grow" data-act="editAct" data-arg="${a.id}">Editar</button>
  ${sh.confirm ? `<button class="btn grow danger" data-act="delAct" data-arg="${a.id}">Confirmar borrado</button>` : `<button class="btn grow danger" data-act="askDelA">Borrar</button>`}</div>`;
};
App.acts.askDelA = () => { S.sheet.confirm = true; App.renderOverlay(); };
App.acts.delAct = el => { Store.del('activities', el.dataset.arg); App.closeSheet(); App.render(); toast('Actividad borrada'); };
App.acts.editAct = el => { const a = Store.get('activities', el.dataset.arg); const loc = a.date; App.openSheet('act', {f: {...a, date: loc.slice(0,10), time: loc.slice(10,19), dur: L.durStr(a.durSec), hr: a.hr||'', rpe: a.rpe||'', elev: a.elev||'', power: a.power||''}}); };
