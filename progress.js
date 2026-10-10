// Pestaña Progreso: constancia, volumen, músculos, récords, peso corporal, historial, grupo.
'use strict';
App.views.prog = (p) => {
  const ws = workoutsOf(p.id), acts = actsOf(p.id);
  const now = new Date(); const wk0 = L.weekStart(now);
  const weeks = []; for (let i = 11; i >= 0; i--) { const s = new Date(wk0); s.setDate(s.getDate() - 7*i); weeks.push(s); }
  const inRange = (d, s) => { const e = new Date(s); e.setDate(e.getDate() + 7); const x = new Date(d); return x >= s && x < e; };
  const vol = weeks.map(s => Math.round(ws.filter(w => inRange(w.date, s)).reduce((t,w) => t + wVolume(w).kg, 0)));
  const monthW = ws.filter(w => { const d = new Date(w.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const monthPR = monthW.reduce((t,w) => t + (w.prs||[]).length, 0);
  let streak = 0; for (let i = 0; i < 104; i++) { const s = new Date(wk0); s.setDate(s.getDate() - 7*i); const any = ws.some(w => inRange(w.date, s)) || acts.some(a => inRange(a.date, s)); if (any) streak++; else if (i > 0) break; }
  const col = cssv('--lift');
  chartLater('volch', () => ({type:'bar', data:{labels: weeks.map(s => fmtDate(s,{day:'numeric',month:'numeric'})), datasets:[{data: vol, backgroundColor: vol.map((_,i) => i === 11 ? col : col + '88'), borderRadius:4}]}, options: baseOpts({plugins:{legend:{display:false}, tooltip:{callbacks:{label: c => fmtNum(c.parsed.y) + ' kg'}}}})}));

  // series reales por músculo esta semana
  const mus = {}; ws.filter(w => inRange(w.date, wk0)).forEach(w => (w.exercises||[]).forEach(e => { const ex = EX[e.ex]; if (!ex) return; const n = e.sets.filter(s => s.t !== 'w').length; ex.m.forEach(m => mus[m] = (mus[m]||0) + n); ex.m2.forEach(m => mus[m] = (mus[m]||0) + n*0.5); }));
  const vt = L.VOL_TARGET[p.level || 'beg']; const big = ['pecho','espalda','hombros','cuádriceps','isquios','glúteos','bíceps','tríceps'];
  const maxV = Math.max(vt[1] + 4, ...big.map(m => mus[m] || 0));

  // ejercicios con historial
  const exIds = [...new Set(ws.flatMap(w => (w.exercises||[]).map(e => e.ex)))].filter(id => EX[id]);
  if (!S.progEx || !exIds.includes(S.progEx)) S.progEx = exIds[0] || null;
  const hist = S.progEx ? exHistory(p.id, S.progEx) : [];
  if (hist.length > 1) chartLater('pexch', () => exChartCfg(hist));
  const best = hist.length ? hist.reduce((b, h) => Math.max(b, bestE1rm(h.sets)), 0) : 0;

  // peso corporal
  const body = Store.list('body', p.id).sort((a,b) => a.date.localeCompare(b.date));
  if (body.length > 1) chartLater('bwch', () => {
    const ma = body.map((b, i) => { const from = new Date(b.date); from.setDate(from.getDate() - 6); const win = body.filter(x => new Date(x.date) >= from && x.date <= b.date); return +(win.reduce((t,x) => t + x.kg, 0) / win.length).toFixed(1); });
    return {type:'line', data:{labels: body.map(b => fmtDate(b.date + 'T12:00',{day:'numeric',month:'numeric'})), datasets:[{label:'Registro', data: body.map(b => b.kg), borderColor: 'transparent', backgroundColor: cssv('--muted'), pointRadius:3, showLine:false},{label:'Promedio 7 días', data: ma, borderColor: cssv('--fg'), pointRadius:0, tension:.3, borderWidth:2}]},
      options: baseOpts({scales:{x:{grid:{display:false}, ticks:{maxTicksLimit:6}}, y:{beginAtZero:false, ticks:{maxTicksLimit:4}}}, plugins:{legend:{display:true, position:'bottom', labels:{boxWidth:10}}}})};
  });

  // pasos 30 días
  const sdays = []; for (let i = 29; i >= 0; i--) { const x = new Date(); x.setDate(x.getDate() - i); const k = localDay(x); const s = Store.get('steps', p.id + '_' + k); sdays.push({k, v: s ? s.steps : null}); }
  const sGoal = p.stepGoal || 8000; const sHas = sdays.filter(d => d.v != null);
  if (sHas.length) chartLater('stch', () => ({type:'bar', data:{labels: sdays.map(d => fmtDate(d.k + 'T12:00',{day:'numeric',month:'numeric'})), datasets:[
    {type:'line', data: sdays.map(() => sGoal), borderColor: cssv('--ok'), borderDash:[5,4], borderWidth:1.5, pointRadius:0},
    {data: sdays.map(d => d.v), backgroundColor: sdays.map(d => d.v >= sGoal ? cssv('--ok') : cssv('--muted')), borderRadius:3}]},
    options: baseOpts({scales:{x:{grid:{display:false}, ticks:{maxTicksLimit:6}}, y:{beginAtZero:true, ticks:{maxTicksLimit:4}}}, plugins:{legend:{display:false}, tooltip:{callbacks:{label: c => c.datasetIndex ? fmtNum(c.parsed.y) + ' pasos' : 'Meta ' + fmtNum(c.parsed.y)}}}})}));
  const sAvg = sHas.length ? Math.round(sHas.reduce((t,d) => t + d.v, 0) / sHas.length) : 0;
  const sMet = sHas.filter(d => d.v >= sGoal).length;
  // grupo
  const group = profiles().map(x => ({x, s: weekStats(x.id)}));
  return `<div class="stack">
    <div class="kpis"><div class="kpi"><b>${monthW.length}</b><span>fuerza este mes</span></div><div class="kpi"><b>${streak}</b><span>semanas activas seguidas</span></div><div class="kpi"><b>${fmtNum(vol[11]/1000,1)}</b><span>toneladas esta semana</span></div><div class="kpi"><b style="color:var(--ok)">${monthPR}</b><span>récords este mes</span></div></div>
    <div class="card stack-s"><h3>Constancia (16 semanas)</h3>${heatmap(ws, acts)}
      <div class="legend"><span><i style="background:var(--lift)"></i>Fuerza</span><span><i style="background:var(--run)"></i>Running</span><span><i style="background:var(--ride)"></i>Ciclismo</span><span><i style="background:var(--yoga)"></i>Yoga</span></div></div>
    <div class="card stack-s"><h3>Volumen de fuerza por semana</h3><p class="small muted">Kilos totales levantados (peso × reps) en series efectivas.</p><div class="chartbox"><canvas id="volch"></canvas></div></div>
    <div class="card stack-s"><h3>Series por músculo esta semana</h3><p class="small muted">Lo que registraste, contra el rango orientativo para tu nivel (${vt[0]}–${vt[1]}).</p>
      <div class="vol">${big.map(m => { const v = mus[m]||0; return `<span>${m[0].toUpperCase()+m.slice(1)}</span><div class="track"><div class="band" style="left:${vt[0]/maxV*100}%;width:${(vt[1]-vt[0])/maxV*100}%"></div><div class="fill" style="width:${Math.min(100, v/maxV*100)}%"></div></div><b class="num small">${fmtNum(v, v%1?1:0)}</b>`; }).join('')}</div></div>
    <div class="card stack-s"><h3>Progreso por ejercicio</h3>
      ${exIds.length ? `<select id="pex" data-change="progEx" aria-label="Ejercicio">${exIds.map(id => `<option value="${id}" ${id===S.progEx?'selected':''}>${esc(nm(EX[id])[0])} · ${esc(nm(EX[id])[1])}</option>`).join('')}</select>
        <div class="row"><span class="small muted">Mejor 1RM estimado:</span><b class="num">${best ? L.fmtKg(Math.round(best*10)/10) + ' kg' : '–'}</b><span class="small muted">· ${hist.length} sesiones</span></div>
        ${hist.length > 1 ? '<div class="chartbox"><canvas id="pexch"></canvas></div>' : '<p class="small muted">Con dos sesiones de este ejercicio aparece el gráfico.</p>'}` : '<p class="small muted">Registrá entrenamientos para ver tu evolución.</p>'}</div>
    <div class="card stack-s"><div class="row between"><h3>Pasos (30 días)</h3>${sHas.length ? `<span class="small muted num">Promedio ${fmtNum(sAvg)} · meta cumplida ${sMet} de ${sHas.length} días</span>` : ''}</div>
      ${sHas.length ? '<div class="chartbox"><canvas id="stch"></canvas></div>' : '<p class="small muted">Cargá tus pasos desde Inicio para ver la tendencia.</p>'}
      <p class="tiny muted">Más pasos diarios se asocian con menor mortalidad, con beneficio que se estabiliza cerca de 6.000–8.000 en mayores de 60 y 8.000–10.000 en menores (Paluch 2022).</p></div>
    <div class="card stack-s"><h3>Peso corporal</h3>
      <div class="row"><input id="bwin" type="text" inputmode="decimal" autocomplete="off" placeholder="kg hoy" style="max-width:140px" aria-label="Peso de hoy en kg"><button class="btn" data-act="addBW">Agregar</button>
      ${body.length ? `<span class="small muted">Último: <b class="num">${fmtNum(body[body.length-1].kg,1)} kg</b></span>` : ''}</div>
      ${body.length > 1 ? '<div class="chartbox"><canvas id="bwch"></canvas></div><p class="tiny muted">El peso diario fluctúa por agua y comida: mirá la línea del promedio de 7 días.</p>' : ''}</div>
    ${group.length > 1 ? `<div class="card stack-s"><h3>El grupo esta semana</h3><div class="list">${group.sort((a,b) => b.s.sessions - a.s.sessions).map(({x,s}) => `<div class="it" style="cursor:default"><span class="avatar" style="background:${pColor(x)}">${esc(x.name.slice(0,1).toUpperCase())}</span><div class="grow"><b>${esc(x.name)}</b><div class="small muted num">${s.workouts} fuerza · ${fmtNum(s.run,1)} km corriendo · ${fmtNum(s.ride,0)} km bici · ${Math.round(s.yogaMin)} min yoga</div></div><b class="num">${s.sessions}</b></div>`).join('')}</div></div>` : ''}
    <div class="section"><h3>Historial de fuerza</h3>${ws.length ? `<div class="card list">${ws.slice(0, 40).map(workoutItem).join('')}</div>` : '<div class="empty">Tus entrenamientos guardados aparecen acá.</div>'}</div>
  </div>`;
};
function heatmap(ws, acts){
  const end = L.weekStart(new Date()); const start = new Date(end); start.setDate(start.getDate() - 7*15);
  const day = {}; const key = d => { const x = new Date(d); return x.getFullYear() + '-' + x.getMonth() + '-' + x.getDate(); };
  acts.forEach(a => { const k = key(a.date); day[k] = day[k] || a.sport; });
  ws.forEach(w => day[key(w.date)] = 'lift');
  const colv = {lift:'--lift', run:'--run', ride:'--ride', yoga:'--yoga'};
  let html = '<div class="heat" role="img" aria-label="Días con actividad en las últimas 16 semanas">';
  for (let c = 0; c < 16; c++) { html += '<div class="col">'; for (let r = 0; r < 7; r++) { const d = new Date(start); d.setDate(d.getDate() + c*7 + r); const s = day[key(d)]; const fut = d > new Date(); html += `<i style="${s ? `background:var(${colv[s]})` : ''}${fut ? ';opacity:.35' : ''}"></i>`; } html += '</div>'; }
  return html + '</div>';
}
App.binds.progEx = el => { S.progEx = el.value; App.render(); };
App.acts.addBW = () => { const v = num($('#bwin').value); if (!v || v < 20 || v > 400) { toast('Ingresá un peso válido en kg'); return; } const p = curProfile(); Store.put('body', {id: p.id + '_' + todayISO(), pid: p.id, date: todayISO(), kg: v}); Store.put('profiles', {...p, weight: v}); App.render(); toast('Peso registrado'); };
