// Yoga renovado: figura 3D animada (frente / perfil / girar), versión fácil, estilos,
// clase guiada con voz y videos favoritos opcionales. Reemplaza solo las pantallas de yoga.
'use strict';
const YFIG = {
  cache: {},
  steps(id, ver, side){
    const d = window.YP3 && YP3[id]; if (!d) return null;
    let st = (ver === 'easy' ? d.easy : d.full).map(([pose, txt]) => ({pose, d: txt}));
    if (side === 'R') st = st.map(s => ({pose: YF3.mirror(s.pose), d: s.d}));
    return st;
  },
  view: id => (window.YP3 && YP3[id] && YP3[id].view) || 0,
  // Miniatura de la postura final, guardada como imagen para que la lista sea liviana.
  thumb(id, cls){
    if (!this.cache[id]) {
      const d = window.YP3 && YP3[id]; if (!d) return `<div class="anim noimg thumb" aria-hidden="true"></div>`;
      const P = d.full[d.full.length - 1][0];
      const svg = YF3.svg(P, {w: 120, h: 96, yaw: d.view, clean: true});
      try { this.cache[id] = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'})); } catch(e){ this.cache[id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
    }
    return `<img class="ythumb ${cls || ''}" src="${this.cache[id]}" alt="" aria-hidden="true">`;
  }
};
(function(){
  const st = document.createElement('style');
  st.textContent = `.ythumb{width:64px;height:52px;flex:none;border-radius:10px;background:#fff;border:1px solid var(--line);object-fit:contain}
  .yfig{flex:none;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;touch-action:pan-y;min-height:120px}
  .yfig svg{display:block;width:100%;height:auto}
  .ynum{display:inline-flex;width:22px;height:22px;border-radius:50%;background:#FAEEDA;color:#633806;font-size:12px;font-weight:700;align-items:center;justify-content:center;flex:none}
  .ycue{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.4}
  .ydots{display:flex;gap:6px;justify-content:center}.ydots i{width:8px;height:8px;border-radius:50%;background:var(--line)}.ydots i.on{background:var(--yoga)}
  .ybreath{font-family:var(--f-display);font-size:30px;font-weight:800;text-align:center;letter-spacing:.02em}
  .ystyles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .ystyle{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;display:flex;flex-direction:column;gap:4px;text-align:left}
  .ylegend{font-size:12px;color:var(--muted)}.ylegend b{color:#378ADD}.ylegend s{color:#BA7517;text-decoration:none}`;
  document.head.appendChild(st);
})();
const yLevel = n => ['', 'Principiante', 'Intermedio', 'Avanzado'][n || 1];
const yLevelPill = n => `<span class="pill ${n === 3 ? 'warn' : n === 2 ? 'run' : 'ok'}">${yLevel(n)}</span>`;
function yVideos(p, filter){ return ((p && p.yVideos) || []).filter(v => !filter || Object.keys(filter).every(k => v[k] === filter[k])); }
function yCuesHTML(id, ver){
  const I = YPI[id]; if (!I) return '';
  const list = ver === 'easy' ? (I.easy || []).concat(I.cues.slice(1)) : I.cues;
  const d = YP3[id]; const last = (ver === 'easy' ? d.easy : d.full).slice(-1)[0][0];
  const n = Math.max(1, (last.marks || []).length);
  return list.map((c, i) => `<div class="ycue">${i < n ? `<span class="ynum">${i + 1}</span>` : `<span class="ynum" style="background:var(--surface2);color:var(--muted)">·</span>`}<span>${esc(c)}</span></div>`).join('');
}

// ---------- montaje de las figuras animadas ----------
function mountYoga(){
  document.querySelectorAll('[data-yfig]').forEach(el => {
    if (el.__pl) return;
    let cfg; try { cfg = JSON.parse(el.dataset.yfig); } catch(e){ return; }
    let steps = YFIG.steps(cfg.id, cfg.ver, cfg.side); if (!steps) return;
    if (cfg.prev) { const ps = YFIG.steps(cfg.prev.id, cfg.prev.ver, cfg.prev.side); if (ps) steps = [{pose: ps[ps.length - 1].pose, d: ''}, steps[steps.length - 1]]; }
    const timed = steps.map((s, i) => ({pose: s.pose, d: s.d, hold: i === steps.length - 1 ? (cfg.once ? 1e9 : 3400) : (cfg.prev ? 80 : 1100), move: cfg.prev ? 900 : 1500}));
    const cap = cfg.cap && document.getElementById(cfg.cap), dots = cfg.dots && document.getElementById(cfg.dots);
    if (dots) dots.innerHTML = timed.map(() => '<i></i>').join('');
    el.__pl = YF3.player(el, timed, {w: 260, h: 220, yaw: cfg.yaw != null ? cfg.yaw : YFIG.view(cfg.id), once: !!cfg.once,
      onStep: i => { if (cap) cap.textContent = cfg.prev ? '' : (timed.length > 1 ? (i + 1) + '. ' : '') + timed[i].d; if (dots) dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === i)); }});
    if (S.yPaused) el.__pl.pause(true);
  });
}
const _renderOverlay = App.renderOverlay;
App.renderOverlay = function(){ _renderOverlay.apply(this, arguments); try { mountYoga(); yVoiceCheck(); } catch(e){ console.warn(e); } };
const _render = App.render;
App.render = function(){ _render.apply(this, arguments); try { mountYoga(); } catch(e){ console.warn(e); } };
const figBox = (cfg, id) => `<div class="yfig" id="${id || 'yfig'}" data-yfig='${esc(JSON.stringify(cfg))}' role="img" aria-label="Figura animada de la postura"></div>`;
const viewCtrls = (yaw) => `<div class="row" style="gap:6px"><div class="seg" role="group" aria-label="Vista" style="flex:none"><button data-act="yfYaw" data-arg="0" aria-pressed="${yaw === 0}">Frente</button><button data-act="yfYaw" data-arg="-90" aria-pressed="${yaw === -90}">Perfil</button></div>
  <input type="range" class="grow" min="-180" max="180" step="5" value="${yaw}" data-bind="yfYawR" aria-label="Girar la figura"><button class="iconbtn" data-act="yfPause" aria-label="Pausa" style="width:34px;height:34px">${S.yPaused ? '▶' : '❚❚'}</button></div>`;
App.acts.yfYaw = el => { const y = +el.dataset.arg; S.yYaw = y; const f = document.getElementById('yfig'); if (f && f.__pl) f.__pl.view(y); el.parentNode.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === el)); const r = el.closest('.row').querySelector('input[type=range]'); if (r) r.value = y; };
App.binds.yfYawR = el => { const y = +el.value; S.yYaw = y; const f = document.getElementById('yfig'); if (f && f.__pl) f.__pl.view(y); el.closest('.row').querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.arg === y)); };
App.acts.yfPause = el => { S.yPaused = !S.yPaused; const f = document.getElementById('yfig'); if (f && f.__pl) f.__pl.pause(S.yPaused); el.textContent = S.yPaused ? '▶' : '❚❚'; };
const LEGEND = `<p class="ylegend"><b>●···</b> hacia dónde mirar &nbsp; <s>- - -</s> línea de alineación &nbsp; <span class="ynum" style="width:16px;height:16px;font-size:10px">1</span> punto clave</p>`;

// ---------- ficha de la postura ----------
App.views.sh_pose = (p, sh) => {
  const id = sh.id, I = YPI[id], d = YP3[id]; if (!I || !d) return '<p>Postura no encontrada.</p>';
  const ver = sh.ver || 'full', side = sh.side || 'L';
  const yaw = sh.yaw != null ? sh.yaw : d.view;
  const vids = yVideos(p, {pose: id});
  return `<div class="row between"><div><h2>${esc(S.namesFirst === 'en' ? I.en : I.es)}</h2><p class="exalt" style="font-size:14px">${esc(S.namesFirst === 'en' ? I.es : I.en)} · ${esc(I.sa)}</p></div>${yLevelPill(I.level)}</div>
  <div class="row" style="gap:6px"><div class="seg grow" role="group" aria-label="Versión"><button data-act="ySheetSet" data-k="ver" data-v="full" aria-pressed="${ver === 'full'}">Completa</button><button data-act="ySheetSet" data-k="ver" data-v="easy" aria-pressed="${ver === 'easy'}">Más fácil</button></div>
  ${I.sides ? `<div class="seg" role="group" aria-label="Lado" style="flex:none"><button data-act="ySheetSet" data-k="side" data-v="L" aria-pressed="${side === 'L'}">Izq.</button><button data-act="ySheetSet" data-k="side" data-v="R" aria-pressed="${side === 'R'}">Der.</button></div>` : ''}</div>
  ${figBox({id, ver, side, yaw, cap: 'ycap', dots: 'ydots'})}
  ${viewCtrls(yaw)}
  <div class="ydots" id="ydots"></div>
  <p id="ycap" class="small" style="text-align:center;min-height:40px"></p>
  <div class="stack-s">${yCuesHTML(id, ver)}</div>
  <div class="banner small"><div><b>Error común:</b> ${esc(I.err)}</div></div>
  <p class="small muted">Mantené ${esc(I.hold)}${I.sides ? ' y repetí del otro lado' : ''}. No fuerces: buscá tensión cómoda y respiración tranquila; si aparece dolor punzante, salí de la postura.</p>
  ${LEGEND}
  <div class="card flat stack-s"><div class="row between"><b>Video (opcional)</b><button class="btn sm" data-act="yVidNew" data-pose="${id}">+ Agregar</button></div>
    ${vids.length ? vids.map(v => `<div class="row"><button class="btn sm grow" data-act="yVidOpen" data-arg="${v.id}" style="justify-content:flex-start">▶ ${esc(v.title || 'Ver video')}</button><button class="btn sm ghost danger" data-act="yVidDel" data-arg="${v.id}" aria-label="Quitar video">✕</button></div>`).join('') : `<p class="tiny muted">Pegá un link de YouTube (por ejemplo de tu profe) para ver esta postura con internet.</p>`}</div>
  <p class="tiny muted">Indicaciones: ${I.ref.map(r => esc(REFS[r].split('.')[0] + ' (' + (REFS[r].match(/\d{4}/) || [''])[0] + ')')).join(' · ')}</p>`;
};
App.acts.ySheetSet = el => { S.sheet[el.dataset.k] = el.dataset.v; S.sheet.yaw = S.yYaw != null ? S.yYaw : S.sheet.yaw; App.renderOverlay(); };
const _openSheet = App.openSheet.bind(App);
App.openSheet = function(type, extra){ if (type === 'pose') S.yYaw = null; return _openSheet(type, extra); };

// ---------- pestaña Yoga ----------
App.views.yoga = (p) => {
  const acts = actsOf(p.id, 'yoga');
  const ws = L.weekStart(new Date());
  const weeks = []; for (let i = 7; i >= 0; i--) { const s = new Date(ws); s.setDate(s.getDate() - 7*i); weeks.push(s); }
  const mins = weeks.map(s => { const e = new Date(s); e.setDate(e.getDate() + 7); return Math.round(acts.filter(a => { const d = new Date(a.date); return d >= s && d < e; }).reduce((t,a) => t + (a.durSec||0)/60, 0)); });
  const col = cssv('--yoga');
  chartLater('ych', () => ({type:'bar', data:{labels: weeks.map(s => fmtDate(s,{day:'numeric',month:'numeric'})), datasets:[{data: mins, backgroundColor: mins.map((_,i) => i === 7 ? col : col + '88'), borderRadius:4}]}, options: baseOpts()}));
  const legDay = workoutsOf(p.id)[0];
  const suggest = legDay && (Date.now() - new Date(legDay.date)) < 36*3600000 && /pierna|leg|completo/i.test(legDay.name) ? 'post_piernas' : (actsOf(p.id).find(a => a.sport !== 'yoga' && (Date.now() - new Date(a.date)) < 36*3600000) ? 'cardio' : null);
  const sty = S.yStyle || 'todos';
  const seqs = YOGA.seqs.filter(s => sty === 'todos' || s.style === sty);
  const favs = yVideos(p).filter(v => !v.pose);
  return `<div class="stack">
    <div class="row"><button class="btn grow" data-act="logYoga">Registrar clase o práctica</button></div>
    <div class="kpis"><div class="kpi"><b style="color:var(--yoga)">${mins[7]}</b><span>min esta semana</span></div><div class="kpi"><b>${Math.round(mins.slice(4).reduce((a,b)=>a+b,0)/4)}</b><span>min/sem promedio</span></div><div class="kpi"><b>${acts.length}</b><span>prácticas</span></div><div class="kpi"><b>${YOGA.poses.length}</b><span>posturas</span></div></div>
    ${suggest ? `<div class="banner info"><div class="grow"><b>Sugerida para hoy</b><div class="small">${esc(YOGA.seqs.find(s => s.id === suggest).name)}: ayuda a recuperar después de tu última sesión.</div></div><button class="btn sm primary" data-act="startSeq" data-arg="${suggest}">Empezar</button></div>` : ''}
    <div class="section" style="margin-top:4px"><h3>Estilos</h3>
      <div class="ystyles">${Object.entries(YSTYLE_INFO).map(([k, v]) => `<button class="ystyle" data-act="sheet" data-arg="ystyle" data-extra='${esc(JSON.stringify({k}))}'><b>${esc(v.name)}</b>${yLevelPill(v.level)}<span class="tiny muted">${esc(v.hold)}</span></button>`).join('')}</div></div>
    <div class="section"><div class="row between"><h3>Clases guiadas</h3><span class="small muted">${seqs.length}</span></div>
      <div class="chips"><button class="chip" data-act="yStyleF" data-arg="todos" aria-pressed="${sty === 'todos'}">Todas</button>${Object.entries(YSTYLE_INFO).map(([k, v]) => `<button class="chip" data-act="yStyleF" data-arg="${k}" aria-pressed="${sty === k}">${esc(v.name)}</button>`).join('')}</div>
      ${seqs.map(s => `<div class="card stack-s"><div class="row between"><div class="grow"><b>${esc(s.name)}</b><p class="small muted">${esc(s.desc)}</p></div><div class="stack-s" style="align-items:flex-end"><span class="pill yoga">${seqMin(s)} min</span><span class="tiny muted">${esc((YSTYLE_INFO[s.style] || {}).name || '')}</span></div></div>
        <div class="row" style="gap:4px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:2px">${[...new Set(s.steps.map(x => x.p))].slice(0, 8).map(id => YFIG.thumb(id)).join('')}</div>
        <button class="btn sm primary" data-act="startSeq" data-arg="${s.id}">Empezar</button></div>`).join('')}</div>
    <div class="section"><div class="row between"><h3>Videos favoritos</h3><button class="btn sm" data-act="yVidNew">+ Agregar</button></div>
      ${favs.length ? `<div class="card list">${favs.map(v => `<div class="it" style="cursor:default"><div class="grow"><b>${esc(v.title || 'Video')}</b><div class="small muted">${esc((YSTYLE_INFO[v.style] || {}).name || '')}${v.min ? ' · ' + v.min + ' min' : ''}</div></div><button class="btn sm" data-act="yVidOpen" data-arg="${v.id}">▶ Ver</button><button class="btn sm ghost" data-act="yVidLog" data-arg="${v.id}">Registrar</button></div>`).join('')}</div>`
        : `<p class="small muted">Opcional: guardá clases de YouTube que te gusten (por ejemplo, de tu profe) para abrirlas rápido. Necesitan internet; todo lo demás funciona sin señal.</p>`}</div>
    <div class="card stack-s"><h3>Minutos por semana</h3><div class="chartbox"><canvas id="ych"></canvas></div></div>
    <div class="section"><h3>Posturas</h3><p class="small muted">Tocá una para verla animada, de frente o de perfil, con su versión más fácil.</p>
      <div class="card list">${YOGA.poses.map(ps => { const I = YPI[ps.id] || {}; return `<div class="it" data-act="sheet" data-arg="pose" data-extra='${esc(JSON.stringify({id:ps.id}))}'>${YFIG.thumb(ps.id)}<div class="grow"><div class="exname">${esc(S.namesFirst==='en'?ps.en:ps.es)}</div><div class="exalt">${esc(S.namesFirst==='en'?ps.es:ps.en)} · ${esc(ps.sa)}</div></div>${I.level > 1 ? yLevelPill(I.level) : ''}</div>`; }).join('')}</div></div>
    ${acts.length ? `<div class="section"><h3>Historial</h3><div class="card list">${acts.slice(0,20).map(activityItem).join('')}</div></div>` : ''}
    <details class="card flat"><summary>Qué dice la evidencia</summary><div class="stack-s" style="margin-top:8px">${TIPS.filter(t => t.cat === 'yoga').map(t => `<p class="small"><b>${esc(t.t)}.</b> ${esc(t.b)}</p><p class="tiny muted">${t.r.map(r => esc(REFS[r])).join(' · ')}</p>`).join('')}
      <p class="tiny muted">Indicaciones de las posturas y secuencias basadas en: ${['iyengar1966','kaminoff2012','stephens2012','clark2012'].map(r => esc(REFS[r])).join(' · ')}</p></div></details>
  </div>`;
};
App.acts.yStyleF = el => { S.yStyle = el.dataset.arg; App.render(); };

// ---------- ficha de estilo ----------
App.views.sh_ystyle = (p, sh) => {
  const v = YSTYLE_INFO[sh.k]; const seqs = YOGA.seqs.filter(s => s.style === sh.k); const vids = yVideos(p, {style: sh.k}).filter(x => !x.pose);
  return `<div class="row between"><h2>${esc(v.name)}</h2>${yLevelPill(v.level)}</div>
  <p class="small">${esc(v.desc)}</p><p class="small muted">Duración de cada postura: ${esc(v.hold)}.</p>
  ${seqs.length ? `<span class="label">Clases guiadas</span>${seqs.map(s => `<div class="card flat row"><div class="grow"><b>${esc(s.name)}</b><div class="small muted">${seqMin(s)} min</div></div><button class="btn sm primary" data-act="startSeq" data-arg="${s.id}">Empezar</button></div>`).join('')}` : ''}
  <span class="label">Tus videos de ${esc(v.name)}</span>
  ${vids.length ? vids.map(x => `<div class="card flat row"><div class="grow"><b>${esc(x.title || 'Video')}</b></div><button class="btn sm" data-act="yVidOpen" data-arg="${x.id}">▶ Ver</button></div>`).join('') : '<p class="tiny muted">Todavía no guardaste videos de este estilo.</p>'}
  <div class="row"><button class="btn grow" data-act="yVidNew" data-style="${sh.k}">+ Agregar video</button><button class="btn grow" data-act="logYogaStyle" data-arg="${sh.k}">Registrar clase</button></div>
  <p class="tiny muted">${esc(sh.k === 'yin' ? REFS.clark2012 : REFS.stephens2012)}</p>`;
};
App.acts.logYogaStyle = el => App.openSheet('yogaLog', {f: {date: todayISO(), style: el.dataset.arg, min: 60, rpe: '', notes: ''}});

// ---------- videos ----------
App.acts.yVidNew = el => App.openSheet('yvid', {back: S.sheet ? {type: S.sheet.type, id: S.sheet.id, k: S.sheet.k} : null, f: {url: '', title: '', style: el.dataset.style || 'hatha', pose: el.dataset.pose || '', min: ''}});
App.views.sh_yvid = (p, sh) => { const f = sh.f; return `<h2>Agregar video</h2>
  <div class="field"><label for="yv_u">Link de YouTube</label><input id="yv_u" type="url" inputmode="url" placeholder="https://youtu.be/…" value="${esc(f.url)}" data-bind="yvf" data-k="url"></div>
  <div class="field"><label for="yv_t">Nombre</label><input id="yv_t" type="text" placeholder="Ej.: Elena Malova · yoga para principiantes 20 min" value="${esc(f.title)}" data-bind="yvf" data-k="title"></div>
  ${f.pose ? `<p class="small muted">Para la postura: <b>${esc((YPI[f.pose] || {}).es || '')}</b></p>` : `<div class="field"><label>Estilo</label><div class="chips">${Object.entries(YSTYLE_INFO).map(([k, v]) => `<button class="chip" data-act="yvSet" data-k="style" data-v="${k}" aria-pressed="${f.style === k}">${esc(v.name)}</button>`).join('')}</div></div>
  <div class="field"><label for="yv_m">Duración (min)</label><input id="yv_m" type="number" inputmode="numeric" value="${esc(f.min)}" data-bind="yvf" data-k="min"></div>`}
  <button class="btn primary" data-act="yVidSave">Guardar</button><button class="btn ghost" data-act="yVidBack">Cancelar</button>`; };
App.binds.yvf = el => { S.sheet.f[el.dataset.k] = el.value; };
App.acts.yvSet = el => { S.sheet.f[el.dataset.k] = el.dataset.v; App.renderOverlay(); };
App.acts.yVidBack = () => { const b = S.sheet && S.sheet.back; if (b && b.type) App.openSheet(b.type, b); else App.closeSheet(); };
App.acts.yVidSave = async () => {
  const f = S.sheet.f, p = curProfile(); const url = (f.url || '').trim();
  if (!/^https?:\/\/\S+\.\S+/.test(url)) { toast('Pegá un link que empiece con https://'); return; }
  const v = {id: uid(), url, title: (f.title || '').trim() || 'Video', style: f.pose ? null : f.style, pose: f.pose || null, min: +f.min || null};
  await Store.put('profiles', {...p, yVideos: [...(p.yVideos || []), v]});
  toast('Video guardado'); App.acts.yVidBack(); App.render();
};
App.acts.yVidOpen = el => { const v = yVideos(curProfile()).find(x => x.id === el.dataset.arg); if (!v) return; if (!navigator.onLine) toast('Sin conexión: el video necesita internet'); window.open(v.url, '_blank', 'noopener'); };
App.acts.yVidDel = async el => { const p = curProfile(); await Store.put('profiles', {...p, yVideos: (p.yVideos || []).filter(x => x.id !== el.dataset.arg)}); App.renderOverlay(); toast('Video quitado'); };
App.acts.yVidLog = el => { const v = yVideos(curProfile()).find(x => x.id === el.dataset.arg); App.openSheet('yogaLog', {f: {date: todayISO(), style: v.style || 'hatha', min: v.min || 30, rpe: '', notes: v.title}}); };

// ---------- clase guiada con figura y voz ----------
const yVoiceOn = () => ls.get('bl_voice', true);
function ySpeak(txt){
  try {
    if (!yVoiceOn() || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(txt);
    const vs = speechSynthesis.getVoices();
    const v = vs.find(x => /^es[-_]AR/i.test(x.lang)) || vs.find(x => /^es[-_](419|US|MX)/i.test(x.lang)) || vs.find(x => /^es/i.test(x.lang));
    if (v) u.voice = v; u.lang = v ? v.lang : 'es-AR'; u.rate = 0.95;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch(e){}
}
function yVoiceCheck(){
  const o = S.ov; if (!o || o.type !== 'yoga' || o.done) return;
  if (o.paused && o.i === 0 && !o._spokeAny) return;
  if (o._spoken === o.i) return;
  o._spoken = o.i; o._spokeAny = true; o._half = false;
  const st = o.steps[o.i], I = YPI[st.p] || {};
  const br = st.br === 'in' ? 'Inhalá.' : st.br === 'ex' ? 'Exhalá.' : '';
  ySpeak(st.s <= 8 ? `${I.es}. ${br}` : `${I.es}${st.side ? ', ' + st.side.toLowerCase() : ''}. ${br} ${(st.v === 'easy' ? (I.easy || [])[0] : (I.cues || [])[0]) || ''}.`);
}
setInterval(() => {
  const o = S.ov; if (!o || o.type !== 'yoga' || o.paused || o.done) return;
  const st = o.steps[o.i]; if (st.s >= 60 && !o._half && o.left < st.s / 2) { o._half = true; ySpeak(st.s >= 150 ? 'Quedate quieto y respirá lento.' : 'Respirá lento.'); }
}, 1000);
App.acts.gView = () => { S.gYaw = S.gYaw == null ? 0 : S.gYaw === 0 ? -90 : null; const f = document.getElementById('yfig'); if (f && f.__pl) f.__pl.view(S.gYaw != null ? S.gYaw : YFIG.view(S.ov.steps[S.ov.i].p)); const b = document.querySelector('[data-act=gView]'); if (b) b.textContent = '↻ ' + (S.gYaw == null ? 'Vista automática' : S.gYaw === 0 ? 'De frente' : 'De perfil'); };
App.acts.yVoice = () => { ls.set('bl_voice', !yVoiceOn()); if (!yVoiceOn()) { try { speechSynthesis.cancel(); } catch(e){} } else { S.ov._spoken = null; } App.renderOverlay(); };
const _yToggle = App.acts.yToggle;
App.acts.yToggle = (el) => { _yToggle(el); if (!S.ov.paused && !S.ov._spokeAny) { S.ov._spoken = null; yVoiceCheck(); } };
const _ySave = App.acts.ySave;
App.acts.ySave = async () => { const o = S.ov; try { speechSynthesis.cancel(); } catch(e){} const r = await _ySave(); try { const last = actsOf(curProfile().id, 'yoga').find(a => a.seq === (o && o.seq && o.seq.id)); if (last && o.seq.style && last.style === 'guiada') { await Store.put('activities', {...last, style: o.seq.style}); App.render(); } } catch(e){} return r; };
App.views.ov_yoga = () => {
  const o = S.ov; if (o.done) { try { speechSynthesis.cancel(); } catch(e){} return yogaDoneView(o); }
  const st = o.steps[o.i], I = YPI[st.p] || {es: st.p, en: '', sa: '', cues: []}, nx = o.steps[o.i + 1];
  const side = st.side === 'Lado derecho' ? 'R' : 'L';
  const tot = o.steps.reduce((t,x) => t + x.s, 0), past = o.steps.slice(0, o.i).reduce((t,x) => t + x.s, 0) + (st.s - o.left);
  const quick = st.s <= 8;
  return `<div class="overlay" role="dialog" aria-modal="true" aria-label="${esc(o.seq.name)}"><div class="bar"><div class="in">
    <button class="iconbtn" data-act="yQuit" aria-label="Salir">${ICON.close}</button><div class="grow"><b>${esc(o.seq.name)}</b><div class="small muted num">Postura ${o.i+1} de ${o.steps.length}</div></div>
    <button class="iconbtn" data-act="yVoice" aria-label="${yVoiceOn() ? 'Apagar voz' : 'Encender voz'}" title="Voz guiada" style="width:auto;padding:0 10px;font-size:13px;font-weight:600">${yVoiceOn() ? '🔊 Voz' : '🔇 Voz'}</button></div>
    <div style="max-width:560px;margin:0 auto;padding:0 16px 8px"><div class="progress"><i id="ybar" style="width:${past/tot*100}%"></i></div></div></div>
  <div class="wrap stack" style="padding-top:12px">
    ${(() => { const pv = o.steps[o.i - 1]; const prev = (quick || st.br) && pv ? {id: pv.p, ver: pv.v || 'full', side: pv.side === 'Lado derecho' ? 'R' : 'L'} : null; return figBox({id: st.p, ver: st.v || 'full', side, once: true, cap: 'ycap', prev, yaw: S.gYaw != null ? S.gYaw : YFIG.view(st.p)}); })()}
    <div class="row between"><p id="ycap" class="small muted grow" style="min-height:20px;margin:0"></p><button class="btn sm ghost" data-act="gView">↻ ${S.gYaw == null ? 'Vista automática' : S.gYaw === 0 ? 'De frente' : 'De perfil'}</button></div>
    <div><h2>${esc(S.namesFirst === 'en' ? I.en : I.es)}</h2><p class="exalt" style="font-size:14px">${esc(S.namesFirst === 'en' ? I.es : I.en)} · ${esc(I.sa)}${st.side ? ' · <b style="font-style:normal">' + st.side + '</b>' : ''}${st.v === 'easy' ? ' · <b style="font-style:normal">versión fácil</b>' : ''}</p></div>
    ${st.br ? `<div class="ybreath" style="color:${st.br === 'in' ? 'var(--run)' : 'var(--yoga)'}">${st.br === 'in' ? 'Inhalá' : 'Exhalá'}</div>` : ''}
    <div class="row between"><div class="big" id="yT">${L.durStr(o.left)}</div>
      <div class="row"><button class="iconbtn" data-act="yStep" data-arg="-1" aria-label="Postura anterior">${ICON.back}</button>
      <button class="btn primary" data-act="yToggle" style="min-width:110px">${o.paused ? (o.i === 0 && o.left === st.s ? 'Comenzar' : 'Seguir') : 'Pausa'}</button>
      <button class="iconbtn" data-act="yStep" data-arg="1" aria-label="Postura siguiente" style="transform:scaleX(-1)">${ICON.back}</button></div></div>
    ${quick ? '' : `<div class="stack-s">${yCuesHTML(st.p, st.v || 'full')}</div>`}
    ${nx ? `<div class="row" style="gap:10px">${YFIG.thumb(nx.p)}<p class="small muted grow">Sigue: <b>${esc((YPI[nx.p] || {}).es || nx.p)}</b>${nx.side ? ' (' + nx.side.toLowerCase() + ')' : ''}</p></div>` : '<p class="small muted">Última postura.</p>'}
  </div></div>`;
};
