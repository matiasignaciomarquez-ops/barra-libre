// Pestaña Yoga: secuencias guiadas con temporizador, registro de clases, posturas bilingües.
'use strict';
const seqMin = s => Math.round(s.steps.reduce((t, st) => t + st.s * (YP[st.p].sides ? 2 : 1), 0) / 60);
const YSTYLES = {hatha:'Hatha', vinyasa:'Vinyasa', yin:'Yin', restaurativo:'Restaurativo', ashtanga:'Ashtanga', otro:'Otro'};

App.views.yoga = (p) => {
  const acts = actsOf(p.id, 'yoga');
  const ws = L.weekStart(new Date());
  const weeks = []; for (let i = 7; i >= 0; i--) { const s = new Date(ws); s.setDate(s.getDate() - 7*i); weeks.push(s); }
  const mins = weeks.map(s => { const e = new Date(s); e.setDate(e.getDate() + 7); return Math.round(acts.filter(a => { const d = new Date(a.date); return d >= s && d < e; }).reduce((t,a) => t + (a.durSec||0)/60, 0)); });
  const col = cssv('--yoga');
  chartLater('ych', () => ({type:'bar', data:{labels: weeks.map(s => fmtDate(s,{day:'numeric',month:'numeric'})), datasets:[{data: mins, backgroundColor: mins.map((_,i) => i === 7 ? col : col + '88'), borderRadius:4}]}, options: baseOpts()}));
  const legDay = workoutsOf(p.id)[0];
  const suggest = legDay && (Date.now() - new Date(legDay.date)) < 36*3600000 && /pierna|leg|completo/i.test(legDay.name) ? 'post_piernas' : (actsOf(p.id).find(a => a.sport !== 'yoga' && (Date.now() - new Date(a.date)) < 36*3600000) ? 'cardio' : null);
  return `<div class="stack">
    <div class="row"><button class="btn grow" data-act="logYoga">Registrar clase o práctica</button></div>
    <div class="kpis"><div class="kpi"><b style="color:var(--yoga)">${mins[7]}</b><span>min esta semana</span></div><div class="kpi"><b>${Math.round(mins.slice(4).reduce((a,b)=>a+b,0)/4)}</b><span>min/sem promedio</span></div><div class="kpi"><b>${acts.length}</b><span>prácticas</span></div><div class="kpi"><b>${YOGA.seqs.length}</b><span>secuencias</span></div></div>
    ${suggest ? `<div class="banner info"><div class="grow"><b>Sugerida para hoy</b><div class="small">${esc(YOGA.seqs.find(s => s.id === suggest).name)}: ayuda a recuperar después de tu última sesión.</div></div><button class="btn sm primary" data-act="startSeq" data-arg="${suggest}">Empezar</button></div>` : ''}
    <div class="section" style="margin-top:4px"><h3>Secuencias guiadas</h3>
      ${YOGA.seqs.map(s => `<div class="card stack-s"><div class="row between"><div class="grow"><b>${esc(s.name)}</b><p class="small muted">${esc(s.desc)}</p></div><span class="pill yoga">${seqMin(s)} min</span></div>
      <p class="tiny muted">${s.steps.map(st => esc(YP[st.p].es)).join(' → ')}</p><button class="btn sm primary" data-act="startSeq" data-arg="${s.id}">Empezar</button></div>`).join('')}</div>
    <div class="card stack-s"><h3>Minutos por semana</h3><div class="chartbox"><canvas id="ych"></canvas></div></div>
    <div class="section"><h3>Posturas</h3><p class="small muted">Nombre en español, inglés y sánscrito.</p>
      <div class="card list">${YOGA.poses.map(ps => `<div class="it" data-act="sheet" data-arg="pose" data-extra='${esc(JSON.stringify({id:ps.id}))}'>${animHTML(ps.img,'thumb',ps.es)}<div class="grow"><div class="exname">${esc(S.namesFirst==='en'?ps.en:ps.es)}</div><div class="exalt">${esc(S.namesFirst==='en'?ps.es:ps.en)} · ${esc(ps.sa)}</div></div></div>`).join('')}</div></div>
    ${acts.length ? `<div class="section"><h3>Historial</h3><div class="card list">${acts.slice(0,20).map(activityItem).join('')}</div></div>` : ''}
    <details class="card flat"><summary>Qué dice la evidencia</summary><div class="stack-s" style="margin-top:8px">${TIPS.filter(t => t.cat === 'yoga').map(t => `<p class="small"><b>${esc(t.t)}.</b> ${esc(t.b)}</p><p class="tiny muted">${t.r.map(r => esc(REFS[r])).join(' · ')}</p>`).join('')}</div></details>
  </div>`;
};

App.views.sh_pose = (p, sh) => { const ps = YP[sh.id]; return `${animHTML(ps.img,'',ps.es)}<div><h2>${esc(ps.es)}</h2><p class="exalt" style="font-size:15px">${esc(ps.en)} · ${esc(ps.sa)}</p></div>
  ${ps.sides ? '<span class="pill yoga">Se hace de ambos lados</span>' : ''}<div class="stack-s">${ps.cues.map(c => `<p class="small">• ${esc(c)}</p>`).join('')}</div>
  <p class="tiny muted">No fuerces: buscá tensión cómoda y respiración tranquila. Si hay dolor punzante, salí de la postura.</p>`; };

// ---------- reproductor ----------
function seqFlat(s){ const out = []; s.steps.forEach(st => { const ps = YP[st.p]; if (ps.sides) { out.push({p: st.p, s: st.s, side: 'Lado derecho'}); out.push({p: st.p, s: st.s, side: 'Lado izquierdo'}); } else out.push({p: st.p, s: st.s}); }); return out; }
App.acts.startSeq = el => {
  const s = YOGA.seqs.find(x => x.id === el.dataset.arg);
  S.ov = {type:'yoga', seq: s, steps: seqFlat(s), i: 0, left: seqFlat(s)[0].s, paused: true, started: Date.now(), elapsed: 0};
  App.renderOverlay();
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => S.wakeLock = l).catch(() => {}); } catch(e){}
};
App.views.ov_yoga = () => {
  const o = S.ov; if (o.done) return yogaDoneView(o);
  const st = o.steps[o.i], ps = YP[st.p], nx = o.steps[o.i + 1];
  const tot = o.steps.reduce((t,x) => t + x.s, 0), past = o.steps.slice(0, o.i).reduce((t,x) => t + x.s, 0) + (st.s - o.left);
  return `<div class="overlay" role="dialog" aria-modal="true" aria-label="${esc(o.seq.name)}"><div class="bar"><div class="in">
    <button class="iconbtn" data-act="yQuit" aria-label="Salir">${ICON.close}</button><div class="grow"><b>${esc(o.seq.name)}</b><div class="small muted num">Postura ${o.i+1} de ${o.steps.length}</div></div></div>
    <div style="max-width:560px;margin:0 auto;padding:0 16px 8px"><div class="progress"><i id="ybar" style="width:${past/tot*100}%"></i></div></div></div>
  <div class="wrap stack" style="padding-top:14px">
    ${animHTML(ps.img,'',ps.es)}
    <div><h2>${esc(ps.es)}</h2><p class="exalt" style="font-size:15px">${esc(ps.en)} · ${esc(ps.sa)}${st.side ? ' · <b style="font-style:normal">' + st.side + '</b>' : ''}</p></div>
    <div class="row between"><div class="big" id="yT">${L.durStr(o.left)}</div>
      <div class="row"><button class="iconbtn" data-act="yStep" data-arg="-1" aria-label="Postura anterior">${ICON.back}</button>
      <button class="btn primary" data-act="yToggle" style="min-width:110px">${o.paused ? (o.i === 0 && o.left === st.s ? 'Comenzar' : 'Seguir') : 'Pausa'}</button>
      <button class="iconbtn" data-act="yStep" data-arg="1" aria-label="Postura siguiente" style="transform:scaleX(-1)">${ICON.back}</button></div></div>
    <div class="stack-s">${ps.cues.map(c => `<p class="small">• ${esc(c)}</p>`).join('')}</div>
    ${nx ? `<p class="small muted">Sigue: <b>${esc(YP[nx.p].es)}</b>${nx.side ? ' (' + nx.side.toLowerCase() + ')' : ''}</p>` : '<p class="small muted">Última postura.</p>'}
  </div></div>`;
};
App.acts.yToggle = () => { ensureAudio(); S.ov.paused = !S.ov.paused; if (!S.ov.paused) S.ov.last = Date.now(); App.renderOverlay(); };
App.acts.yStep = el => { const o = S.ov; const k = o.i + +el.dataset.arg; if (k < 0) return; if (k >= o.steps.length) { o.done = true; } else { o.i = k; o.left = o.steps[k].s; } App.renderOverlay(); };
App.acts.yQuit = () => { const o = S.ov; if (o.elapsed > 60) { o.done = true; App.renderOverlay(); return; } S.ov = null; relWake(); App.renderOverlay(); App.render(); };
setInterval(() => {
  const o = S.ov; if (!o || o.type !== 'yoga' || o.paused || o.done) return;
  const now = Date.now(); const dt = (now - (o.last || now)) / 1000; o.last = now;
  o.left -= dt; o.elapsed += dt;
  if (o.left <= 0) {
    beep();
    if (o.i + 1 >= o.steps.length) { o.done = true; App.renderOverlay(); return; }
    o.i++; o.left = o.steps[o.i].s; App.renderOverlay(); return;
  }
  const t = document.getElementById('yT'); if (t) t.textContent = L.durStr(Math.ceil(o.left));
  const b = document.getElementById('ybar'); if (b) { const tot = o.steps.reduce((t,x) => t + x.s, 0); const past = o.steps.slice(0, o.i).reduce((t,x) => t + x.s, 0) + (o.steps[o.i].s - o.left); b.style.width = past/tot*100 + '%'; }
}, 250);
function yogaDoneView(o){
  const mins = Math.max(1, Math.round(o.elapsed / 60));
  return `<div class="overlay" role="dialog" aria-modal="true"><div class="wrap stack" style="padding-top:40px;text-align:center;align-items:center">
    <span class="plate" style="background:var(--yoga);width:44px;height:44px"></span><h2>Namasté</h2>
    <p class="muted">${esc(o.seq.name)} · ${mins} min</p>
    <div class="field" style="width:100%;text-align:left"><label>¿Cómo te sentiste? (RPE 1–10)</label><div class="chips">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button class="chip" data-act="yRpe" data-arg="${n}" aria-pressed="${o.rpe===n}">${n}</button>`).join('')}</div></div>
    <button class="btn primary block" data-act="ySave">Guardar práctica</button><button class="btn ghost block" data-act="yDiscard">No guardar</button></div></div>`;
}
App.acts.yRpe = el => { S.ov.rpe = +el.dataset.arg; App.renderOverlay(); };
App.acts.ySave = async () => { const o = S.ov, p = curProfile(); await Store.put('activities', {id: uid(), pid: p.id, sport:'yoga', date: new Date().toISOString(), title: o.seq.name, seq: o.seq.id, style:'guiada', durSec: Math.round(o.elapsed), rpe: o.rpe || null, distKm: 0}); S.ov = null; relWake(); App.renderOverlay(); App.render(); toast('Práctica guardada'); };
App.acts.yDiscard = () => { S.ov = null; relWake(); App.renderOverlay(); App.render(); };

// ---------- registro manual ----------
App.acts.logYoga = () => App.openSheet('yogaLog', {f: {date: todayISO(), style:'hatha', min: 60, rpe:'', notes:''}});
App.views.sh_yogaLog = (p, sh) => { const f = sh.f; return `<h2>Registrar yoga</h2>
  <div class="grid2"><div class="field"><label for="y_d">Fecha</label><input id="y_d" type="date" value="${esc(f.date)}" data-bind="yf" data-k="date"></div>
  <div class="field"><label for="y_m">Minutos</label><input id="y_m" type="number" inputmode="numeric" value="${esc(f.min)}" data-bind="yf" data-k="min"></div></div>
  <div class="field"><label>Estilo</label><div class="chips">${Object.entries(YSTYLES).map(([k,v]) => `<button class="chip" data-act="yfSet" data-k="style" data-v="${k}" aria-pressed="${f.style===k}">${v}</button>`).join('')}</div></div>
  <div class="field"><label>Intensidad (RPE 1–10)</label><div class="chips">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button class="chip" data-act="yfSet" data-k="rpe" data-v="${n}" aria-pressed="${+f.rpe===n}">${n}</button>`).join('')}</div></div>
  <div class="field"><label for="y_n">Notas</label><textarea id="y_n" data-bind="yf" data-k="notes">${esc(f.notes)}</textarea></div>
  <button class="btn primary" data-act="saveYoga">Guardar</button>`; };
App.binds.yf = el => { S.sheet.f[el.dataset.k] = el.value; };
App.acts.yfSet = el => { let v = el.dataset.v; if (/^\d+$/.test(v)) v = +v; S.sheet.f[el.dataset.k] = v; App.renderOverlay(); };
App.acts.saveYoga = async () => { const f = S.sheet.f, p = curProfile(); if (!+f.min) { toast('Cargá los minutos'); return; } await Store.put('activities', {id: uid(), pid: p.id, sport:'yoga', date: f.date + 'T12:00:00', title: 'Yoga ' + YSTYLES[f.style], style: f.style, durSec: +f.min * 60, rpe: +f.rpe || null, notes: f.notes, distKm: 0}); App.closeSheet(); App.render(); toast('Práctica guardada'); };
function yogaDetail(a, sh){
  return `<div><span class="label">${fmtDate(a.date,{weekday:'long',day:'numeric',month:'long'})}</span><h2>${esc(a.title||'Yoga')}</h2></div>
  <div class="kpis"><div class="kpi"><b>${Math.round((a.durSec||0)/60)}</b><span>minutos</span></div><div class="kpi"><b>${a.rpe||'–'}</b><span>RPE</span></div></div>
  ${a.notes ? `<p class="small">${esc(a.notes)}</p>` : ''}
  ${sh.confirm ? `<button class="btn danger" data-act="delAct" data-arg="${a.id}">Confirmar borrado</button>` : `<button class="btn danger" data-act="askDelA">Borrar</button>`}`;
}
