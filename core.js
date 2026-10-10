// Núcleo: almacenamiento, estado, utilidades, render y eventos.
'use strict';
const L = window.Logic;
const EX = {}; (window.EXDATA || []).forEach(e => EX[e.id] = e);
const YP = {}; (window.YOGA.poses || []).forEach(p => YP[p.id] = p);
const COLS = ['profiles','workouts','activities','body','customEx','steps','active'];
const STANDALONE = !(window.claude && window.claude.use);

// ---------- utilidades ----------
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { if (v == null || v === '') return NaN; const n = parseFloat(String(v).trim().replace(/\s/g,'').replace(',', '.')); return n; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const localDay = d => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const fmtDate = (d, opts) => new Date(d).toLocaleDateString('es-AR', opts || {weekday:'short', day:'numeric', month:'short'});
const fmtNum = (x, dec = 0) => (x == null || isNaN(x)) ? '–' : Number(x).toLocaleString('es-AR', {minimumFractionDigits: dec, maximumFractionDigits: dec});
const ls = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const COLORS = ['#d63b2f','#2f6fc7','#2c9a5b','#c99a12','#7a5bd6','#d46b1f','#1f8f9a','#b0407a'];
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

// ---------- almacenamiento: db compartida (si está disponible) o este dispositivo ----------
const Store = {
  mode: 'loading', db: null, readOnly: false,
  data: {profiles:{}, workouts:{}, activities:{}, body:{}, customEx:{}, steps:{}, active:{}},
  queue: {},
  async init(){
    let db = null;
    try { if (window.claude && window.claude.use) db = await window.claude.use('db'); } catch(e){ db = null; }
    if (db) {
      this.db = db; this.mode = 'db';
      let firstLoads = 0;
      await new Promise(resolve => {
        const done = () => { if (++firstLoads === COLS.length) resolve(); };
        COLS.forEach(c => {
          let first = true;
          db.collection(c).onSnapshot(snap => {
            const m = {}; snap.docs.forEach(d => { if (d.exists) m[d.id] = d.data(); });
            this.data[c] = m;
            if (first) { first = false; done(); } else App.refresh();
          }, err => { console.warn('db', c, err); if (first) { first = false; done(); } });
        });
        setTimeout(resolve, 8000);
      });
      try {
        const u = window.claude.use ? await window.claude.use('user') : null;
        if (u && u.can) { const w = await u.can('data.write'); if (w === false) this.readOnly = true; }
        if (u && u.id) this.uid = await u.id();
      } catch(e){}
    } else {
      this.mode = 'local';
      const saved = ls.get('bl_data', null);
      if (saved) COLS.forEach(c => this.data[c] = saved[c] || {});
    }
  },
  list(col, pid){ const v = Object.values(this.data[col] || {}); return pid ? v.filter(x => x.pid === pid) : v; },
  get(col, id){ return (this.data[col] || {})[id]; },
  async put(col, obj){
    this.data[col] = {...this.data[col], [obj.id]: obj};
    if (this.mode === 'db') {
      const key = col + '/' + obj.id;
      const prev = this.queue[key] || Promise.resolve();
      const clean = JSON.parse(JSON.stringify(obj));
      const attempt = async () => {
        for (let i = 0; i < 4; i++) {
          try { await this.db.collection(col).doc(obj.id).set(clean); return true; }
          catch(e){ const retry = !e || ['unavailable','resource_exhausted'].includes(e.code) || !e.code; if (!retry || i === 3) { this.fail(e); return false; } await new Promise(r => setTimeout(r, 800 * (i + 1) + Math.random() * 400)); }
        }
      };
      this.queue[key] = prev.then(attempt, attempt);
      return this.queue[key];
    }
    this.saveLocal(); return true;
  },
  async del(col, id){
    const m = {...this.data[col]}; delete m[id]; this.data[col] = m;
    if (this.mode === 'db') { try { await this.db.collection(col).doc(id).delete(); return true; } catch(e){ this.fail(e); return false; } }
    this.saveLocal(); return true;
  },
  saveLocal(){ ls.set('bl_data', this.data); },
  fail(e){
    console.warn(e);
    if (e && e.code === 'invalid_argument') { this.readOnly = true; toast('No tenés permiso para guardar. Pedile al dueño de la app que te invite como editor.'); App.refresh(); }
    else if (e && e.code === 'quota_exceeded') toast('Se llenó el almacenamiento. Exportá y borrá registros viejos.');
    else { const t = Date.now(); if (!this.lastFail || t - this.lastFail > 5000) toast('Sin conexión: no se pudo guardar. Probá de nuevo cuando vuelva la señal.'); this.lastFail = t; }
  }
};

// ---------- estado de la interfaz ----------
const S = {
  tab: ls.get('bl_tab', 'home'), fz: 'plan', cardio: 'run', pid: ls.get('bl_pid', null),
  libQ: '', libM: '', sheet: null, ov: null, q: null, progEx: null, namesFirst: ls.get('bl_names', 'es'), anim: ls.get('bl_anim', true)
};
const curProfile = () => Store.get('profiles', S.pid) || null;
const profiles = () => Store.list('profiles').sort((a,b) => (a.createdAt||'').localeCompare(b.createdAt||''));
const pColor = p => COLORS[(profiles().findIndex(x => x.id === p.id) + 8) % 8];

function nm(ex){ if (!ex) return ['?','?']; return S.namesFirst === 'en' ? [ex.en, ex.es] : [ex.es, ex.en]; }
function animHTML(imgs, cls, label){
  if (!imgs || !imgs.length) return `<div class="anim noimg ${cls||''}" aria-hidden="true">${esc((label||'').slice(0,1))}</div>`;
  return `<div class="anim ${cls||''}">${imgs.map((s,i) => `<img src="${esc((window.IMG && window.IMG[s]) || s)}" alt="${i ? '' : esc(label||'')}" loading="lazy">`).join('')}</div>`;
}
const ICON = {
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  lift:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12h20M5 7v10M8 5v14M16 5v14M19 7v10"/></svg>',
  cardio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v5M6 12l3-4 4 1 2 4 3 1"/></svg>',
  yoga:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="2"/><path d="M12 7v6M4 11l8 2 8-2M7 20l5-7 5 7M5 20h14"/></svg>',
  prog:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M6 16l4-5 3 3 5-7"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  check:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>'
};

function toast(msg){
  document.querySelectorAll('.toast').forEach(x => x.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role','status');
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}

// ---------- gráficos ----------
const Charts = {inst: {}, queue: []};
function chartLater(id, cfgFn){ Charts.queue.push([id, cfgFn]); }
function flushCharts(){
  Object.keys(Charts.inst).forEach(k => { if (!document.getElementById(k)) { Charts.inst[k].destroy(); delete Charts.inst[k]; } });
  const q = Charts.queue; Charts.queue = [];
  if (!window.Chart) return;
  const fg = cssv('--muted'), grid = cssv('--line');
  Chart.defaults.color = fg; Chart.defaults.locale = 'es-AR'; Chart.defaults.font.family = cssv('--f-body'); Chart.defaults.borderColor = grid;
  q.forEach(([id, fn]) => {
    const el = document.getElementById(id); if (!el) return;
    if (Charts.inst[id]) { Charts.inst[id].destroy(); }
    try { Charts.inst[id] = new Chart(el, fn()); } catch(e){ console.warn(e); }
  });
}
const baseOpts = (extra) => Object.assign({responsive:true, maintainAspectRatio:false, animation:false,
  plugins:{legend:{display:false}, tooltip:{intersect:false, mode:'index'}},
  scales:{x:{grid:{display:false}, ticks:{maxRotation:0, autoSkipPadding:10}}, y:{beginAtZero:true, grid:{color:cssv('--line')}, ticks:{maxTicksLimit:5}}}}, extra||{});

// ---------- app ----------
const App = {
  views: {}, acts: {}, binds: {},
  refreshPending: false,
  refresh(){
    if (this.refreshPending) return;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'file') { if (!this.deferred) { this.deferred = true; a.addEventListener('blur', () => setTimeout(() => { this.deferred = false; this.refresh(); }, 250), {once: true}); } return; }
    this.refreshPending = true; requestAnimationFrame(() => { this.refreshPending = false; this.render(); });
  },
  render(){
    if (typeof syncCustomEx === 'function') syncCustomEx();
    const root = $('#app');
    const p = curProfile();
    if (!p && profiles().length) { const mine = Store.uid && profiles().find(x => x.owner === Store.uid); S.pid = (mine || profiles()[0]).id; ls.set('bl_pid', S.pid); return this.render(); }
    if (Store.mode === 'login' && this.views.login) { root.innerHTML = this.views.login(); this.renderOverlay(); return; }
    let main;
    if (Store.mode === 'loading') main = `<div class="empty">Cargando…</div>`;
    else if (!p) main = this.views.welcome();
    else main = (this.views[S.tab] || this.views.home)(p);
    const scroll = window.scrollY;
    root.innerHTML = `<div class="wrap">${this.header(p)}${this.banners()}${main}</div>${p ? this.nav() : ''}`;
    this.renderOverlay();
    window.scrollTo(0, scroll);
    flushCharts();
  },
  header(p){
    return `<header class="top"><div class="brand"><span class="plate" aria-hidden="true"></span>Barra Libre</div>
      ${p ? `<button class="who" data-act="sheet" data-arg="profiles" aria-label="Cambiar de perfil"><span class="avatar" style="background:${pColor(p)}">${esc(p.name.slice(0,1).toUpperCase())}</span><b class="small">${esc(p.name)}</b></button>` : '<span class="grow"></span>'}
      <button class="iconbtn" data-act="sheet" data-arg="menu" aria-label="Menú">${ICON.menu}</button></header>`;
  },
  banners(){
    let b = '';
    if (Store.mode === 'local' && !STANDALONE) b += `<div class="banner info small" style="margin-bottom:10px"><div>Los datos se guardan solo en este dispositivo. Abrí la app desde Claude con tu cuenta para sincronizar entre personas y equipos. Exportá un respaldo de vez en cuando.</div></div>`;
    if (STANDALONE && Store.mode === 'local' && S.tab === 'home') {
      const has = Store.list('workouts').length + Store.list('activities').length > 0;
      const last = ls.get('bl_lastExport', null);
      const days = last ? Math.floor((Date.now() - last) / 86400000) : null;
      if (has && (days == null || days >= 14)) b += `<div class="banner info small" style="margin-bottom:10px"><div class="grow">Tus datos viven en este teléfono. ${days == null ? 'Todavía no hiciste un respaldo.' : 'Último respaldo hace ' + days + ' días.'} Guardá uno por si cambiás de teléfono o se borra el navegador.</div><button class="btn sm" data-act="expAll">Respaldar</button></div>`;
    }
    if (Store.readOnly) b += `<div class="banner small" style="margin-bottom:10px"><div>Estás en modo lectura. Para registrar entrenamientos, pedile al dueño de la app que te invite como editor.</div></div>`;
    return b;
  },
  nav(){
    const items = [['home','Inicio'],['lift','Fuerza'],['cardio','Cardio'],['yoga','Yoga'],['prog','Progreso']];
    return `<nav class="nav" aria-label="Secciones"><div class="in">${items.map(([k,l]) => `<button data-act="tab" data-arg="${k}" ${S.tab===k?'aria-current="page"':''}>${ICON[k]}<span>${l}</span><span class="dot"></span></button>`).join('')}</div></nav>`;
  },
  renderOverlay(){
    const ov = $('#ov');
    let html = '';
    if (S.ov && this.views['ov_' + S.ov.type]) html += this.views['ov_' + S.ov.type](curProfile());
    if (S.sheet && this.views['sh_' + S.sheet.type]) html += `<div class="sheet-bg" data-act="closeSheet" data-self="1"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${this.views['sh_' + S.sheet.type](curProfile(), S.sheet)}</div></div>`;
    const keepScroll = ov.firstElementChild && ov.firstElementChild.classList.contains('overlay') ? ov.firstElementChild.scrollTop : 0;
    const sheetScroll = ov.querySelector('.sheet') ? ov.querySelector('.sheet').scrollTop : 0;
    ov.innerHTML = html;
    if (ov.firstElementChild && ov.firstElementChild.classList.contains('overlay')) ov.firstElementChild.scrollTop = keepScroll;
    if (ov.querySelector('.sheet')) ov.querySelector('.sheet').scrollTop = sheetScroll;
    document.body.style.overflow = (S.ov || S.sheet) ? 'hidden' : '';
    if (this.afterOverlay) { const f = this.afterOverlay; this.afterOverlay = null; f(); }
  },
  openSheet(type, extra){ S.sheet = Object.assign({type}, extra || {}); this.renderOverlay(); flushCharts(); },
  closeSheet(){ S.sheet = null; this.renderOverlay(); },
  setOv(ov){ S.ov = ov; this.renderOverlay(); flushCharts(); }
};
App.acts.tab = (el) => { S.tab = el.dataset.arg; ls.set('bl_tab', S.tab); window.scrollTo(0,0); App.render(); };
App.acts.sheet = (el) => App.openSheet(el.dataset.arg, el.dataset.extra ? JSON.parse(el.dataset.extra) : null);
App.acts.closeSheet = (el, ev) => { if (el.dataset.self && ev.target !== el) return; App.closeSheet(); };
App.acts.seg = (el) => { S[el.dataset.key] = el.dataset.arg; App.render(); };

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const f = App.acts[el.dataset.act]; if (!f) return;
  if (el.dataset.self && ev.target !== el) return;
  ev.preventDefault(); f(el, ev);
});
document.addEventListener('input', ev => { const el = ev.target; const b = el.dataset && el.dataset.bind; if (b && App.binds[b]) App.binds[b](el, ev); });
document.addEventListener('change', ev => { const el = ev.target; const b = el.dataset && el.dataset.change; if (b && App.binds[b]) App.binds[b](el, ev); });
document.addEventListener('submit', ev => ev.preventDefault());
setInterval(() => { if (S.anim) document.body.classList.toggle('f1'); }, 1100);

// ---------- datos derivados ----------
function workoutsOf(pid){ return Store.list('workouts', pid).sort((a,b) => b.date.localeCompare(a.date)); }
function actsOf(pid, sport){ return Store.list('activities', pid).filter(a => !sport || a.sport === sport).sort((a,b) => b.date.localeCompare(a.date)); }
function exHistory(pid, exId, beforeId){
  const out = [];
  for (const w of workoutsOf(pid)) { if (w.id === beforeId) continue; const e = (w.exercises||[]).find(x => x.ex === exId); if (e && e.sets.some(s => s.done)) out.push({date: w.date, sets: e.sets.filter(s => s.done)}); }
  return out;
}
function wVolume(w){ let v = 0, n = 0; (w.exercises||[]).forEach(e => e.sets.forEach(s => { if (s.done && s.t !== 'w') { v += (s.kg||0) * (s.reps||0); n++; } })); return {kg: v, sets: n}; }
function bestE1rm(sets){ return Math.max(0, ...sets.filter(s => s.t !== 'w').map(s => L.e1rm(s.kg, s.reps))); }
function nextPlanDay(p, plan){
  if (!plan || !plan.days.length) return null;
  const ws = workoutsOf(p.id).filter(w => w.planKind === plan.kind && w.planCreated === plan.createdAt);
  if (!ws.length) return 0;
  const idx = plan.days.findIndex(d => d.id === ws[0].planDay);
  return idx < 0 ? 0 : (idx + 1) % plan.days.length;
}
function weekStats(pid, start){
  const s = start || L.weekStart(new Date()); const e = new Date(s); e.setDate(e.getDate() + 7);
  const inW = d => { const x = new Date(d); return x >= s && x < e; };
  const ws = workoutsOf(pid).filter(w => inW(w.date));
  const as = actsOf(pid).filter(a => inW(a.date));
  const km = sp => as.filter(a => a.sport === sp).reduce((t,a) => t + (a.distKm||0), 0);
  return {workouts: ws.length, vol: ws.reduce((t,w) => t + wVolume(w).kg, 0), run: km('run'), ride: km('ride'),
    yogaMin: as.filter(a => a.sport === 'yoga').reduce((t,a) => t + (a.durSec||0)/60, 0), sessions: ws.length + as.length};
}

async function saveFile(name, text){
  if (name.endsWith('.json')) ls.set('bl_lastExport', Date.now());
  if (STANDALONE) {
    try {
      const type = name.endsWith('.csv') ? 'text/csv' : 'application/json';
      const file = new File([text], name, {type});
      if (navigator.canShare && navigator.canShare({files:[file]}) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        try { await navigator.share({files:[file], title: name}); toast('Archivo listo'); App.refresh(); return; } catch(e){ if (e && e.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Archivo descargado'); App.refresh(); return;
    } catch(e){}
  }
  let d = null;
  try { if (window.claude && window.claude.use) d = await window.claude.use('downloads'); } catch(e){}
  if (d) {
    try { await d.save({filename: name, data: text}); toast('Archivo guardado'); return; }
    catch(e){ if (e && (e.code === 'declined' || e.code === 'rate_limited')) return; }
  }
  App.openSheet('textout', {name, text});
}
