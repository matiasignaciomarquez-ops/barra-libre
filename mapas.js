// Mapas y senderismo: recorrido de cada salida pintado por ritmo, pulso o altura; mapa de calor de todas tus rutas;
// senderismo como deporte; exportar GPX; altura corregida con un mapa de relieve (Open-Meteo, Copernicus 90 m).
// El mapa (Leaflet) se carga recién cuando abrís una salida o el mapa de calor: la app abre igual de rápido.
'use strict';
Object.assign(window.REFS, {
  copernicusDem: 'Copernicus DEM GLO-90 (ESA, 2021), vía Open-Meteo Elevation API. doi:10.5270/ESA-c5d3d65.',
  naismith1892: 'Naismith WW (1892), regla de tiempo de marcha en montaña; ajuste por pendiente: Tobler W. Three presentations on geographical analysis and modeling. NCGIA Technical Report 93-1, 1993.'
});

// ---------- senderismo ----------
L.HIKE_TYPES = {caminata: 'Caminata', trekking: 'Trekking / senderismo', montana: 'Montaña', otro: 'Otro'};
SP.hike = {label: 'Senderismo', color: '--hike', types: () => L.HIKE_TYPES};

// ---------- estilos ----------
(() => {
  const st = document.createElement('style');
  st.textContent = `
  :root{--hike:#b06a2c}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--hike:#e0954f}}
  :root[data-theme="dark"]{--hike:#e0954f}
  .pill.hike{background:color-mix(in srgb,var(--hike) 16%,transparent);color:var(--hike)}
  .mapbox{position:relative;height:260px;border-radius:12px;overflow:hidden;background:var(--surface2);isolation:isolate}
  .mapbox.tall{height:min(62vh,560px)}
  .mapbox > svg.route{position:absolute;inset:0;width:100%;height:100%}
  .mapbox .leaflet-container{background:var(--surface2);font-family:var(--f-body)}
  .mapbox .leaflet-control-attribution{font-size:10px;background:color-mix(in srgb,var(--surface) 80%,transparent);color:var(--muted)}
  .mapbox .leaflet-control-attribution a{color:var(--muted)}
  .mapbox .leaflet-bar a{background:var(--surface);color:var(--fg);border-color:var(--line)}
  .maplegend{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}
  .maplegend .ramp{flex:1;height:8px;border-radius:4px}
  .maplegend .z{display:inline-flex;align-items:center;gap:4px;margin-right:8px}
  .maplegend .z i{width:8px;height:8px;border-radius:50%;display:inline-block}`;
  document.head.appendChild(st);
})();

// ---------- Leaflet bajo demanda ----------
const MAPS = {lf: null, loading: null, act: null, heat: null};
function loadLeaflet(){
  if (MAPS.lf) return Promise.resolve(MAPS.lf);
  if (MAPS.loading) return MAPS.loading;
  MAPS.loading = new Promise((ok, bad) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'leaflet.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'leaflet.js';
    s.onload = () => { MAPS.lf = window.leaflet; ok(MAPS.lf); };
    s.onerror = () => { MAPS.loading = null; bad(new Error('leaflet')); };
    document.head.appendChild(s);
  });
  return MAPS.loading;
}
const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); return t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); };
function baseLayer(LF, kind){
  if (kind === 'relieve') return LF.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {maxZoom: 17, subdomains: 'abc', attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://opentopomap.org">OpenTopoMap</a>'});
  return LF.tileLayer(`https://{s}.basemaps.cartocdn.com/${isDark() ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`, {maxZoom: 19, subdomains: 'abcd', attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>'});
}
function newMap(LF, el){
  const m = LF.map(el, {zoomControl: true, attributionControl: true, preferCanvas: true, scrollWheelZoom: false, tapTolerance: 20});
  m.attributionControl.setPrefix(false);
  return m;
}

// ---------- colores del recorrido ----------
const RAMP_PACE = ['#3b82c4', '#3fb68b', '#e3c341', '#ef8a3a', '#d6453d'];
const RAMP_ALT = ['#2c9a5b', '#8fbf4d', '#e0c35a', '#c98b3c', '#8a5a2b'];
const hasTime = t => t && t.length > 3 && t[0].length >= 4 && t.filter(p => p[3] != null).length > t.length / 2;
const hasHr = t => t && t.length > 3 && t[0].length >= 5 && t.filter(p => p[4]).length > t.length / 3;
const hasEle = t => t && t.length > 3 && t[0].length >= 3 && t.filter(p => p[2] != null).length > t.length / 2;
function quant(arr, q){ const s = arr.filter(x => x != null && isFinite(x)).sort((a, b) => a - b); if (!s.length) return null; return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]; }
// velocidad (m/s) suavizada por tramo
function segSpeeds(t){
  const v = [];
  for (let i = 1; i < t.length; i++) {
    let d = 0, dt = 0;
    for (let j = Math.max(1, i - 2); j <= Math.min(t.length - 1, i + 2); j++) { if (t[j][3] != null && t[j - 1][3] != null) { d += hav(t[j - 1], t[j]) * 1000; dt += t[j][3] - t[j - 1][3]; } }
    v.push(dt > 0 ? d / dt : null);
  }
  return v;
}
function routeColors(a, mode, p){
  const t = a.track, n = t.length - 1;
  if (mode === 'pulso' && hasHr(t)) {
    const Z = myZones(p); if (!Z) return null;
    return {cols: t.slice(1).map((q, i) => { const h = q[4] || t[i][4]; return h ? ZCOL[zoneOf(Z, h)] : '#8a8f98'; }), legend: `<div class="maplegend">${Z.z.map(z => `<span class="z"><i style="background:${ZCOL[z.z - 1]}"></i>Z${z.z}</span>`).join('')}</div>`};
  }
  if (mode === 'altura' && hasEle(t)) {
    const e = t.map(q => q[2]); const lo = quant(e, 0), hi = quant(e, 1); const sp = (hi - lo) || 1;
    return {cols: t.slice(1).map((q, i) => { const x = q[2] != null ? q[2] : t[i][2]; return x == null ? '#8a8f98' : RAMP_ALT[Math.min(4, Math.floor((x - lo) / sp * 5))]; }),
      legend: `<div class="maplegend"><span class="num">${Math.round(lo)} m</span><span class="ramp" style="background:linear-gradient(90deg,${RAMP_ALT.join(',')})"></span><span class="num">${Math.round(hi)} m</span></div>`};
  }
  if (mode === 'ritmo' && hasTime(t)) {
    const v = segSpeeds(t); let lo = quant(v, .1), hi = quant(v, .9); if (lo == null) return null;
    const mid = (lo + hi) / 2; if (hi - lo < mid * .1) { lo = mid * .95; hi = mid * 1.05; } // ritmo parejo: colores parejos, no ruido
    const sp = (hi - lo) || 1;
    const lab = x => a.sport === 'run' || a.sport === 'hike' ? L.paceStr(1000 / x) + '/km' : fmtNum(x * 3.6, 1) + ' km/h';
    return {cols: v.map(x => x == null ? '#8a8f98' : RAMP_PACE[Math.max(0, Math.min(4, Math.floor((x - lo) / sp * 5)))]),
      legend: `<div class="maplegend"><span class="num">${lab(lo)}</span><span class="ramp" style="background:linear-gradient(90deg,${RAMP_PACE.join(',')})"></span><span class="num">${lab(hi)}</span></div><p class="tiny muted" style="margin-top:2px">Azul más lento · rojo más rápido</p>`};
  }
  return null;
}
function mapModes(a){ const t = a.track; return [['ritmo', 'Ritmo', hasTime(t)], ['pulso', 'Pulso', hasHr(t)], ['altura', 'Altura', hasEle(t)]].filter(x => x[2]); }

// ---------- mapa de una salida ----------
function drawRoute(st){
  const {LF, map, a} = st; const p = curProfile();
  if (st.group) st.group.remove();
  const g = st.group = LF.layerGroup().addTo(map);
  const ll = a.track.map(q => [q[0], q[1]]);
  LF.polyline(ll, {color: isDark() ? '#000' : '#fff', weight: 8, opacity: .55, interactive: false}).addTo(g);
  const c = routeColors(a, S.mapMode, p);
  if (c) {
    let start = 0;
    for (let i = 1; i <= c.cols.length; i++) {
      if (i === c.cols.length || c.cols[i] !== c.cols[start]) { LF.polyline(ll.slice(start, i + 1), {color: c.cols[start], weight: 4.5, opacity: 1, lineCap: 'round', lineJoin: 'round', interactive: false}).addTo(g); start = i; }
    }
  } else LF.polyline(ll, {color: cssv(SP[a.sport] ? SP[a.sport].color : '--run'), weight: 4.5, interactive: false}).addTo(g);
  LF.circleMarker(ll[0], {radius: 6, color: '#fff', weight: 2, fillColor: '#2f8f5b', fillOpacity: 1}).addTo(g);
  LF.circleMarker(ll[ll.length - 1], {radius: 6, color: '#fff', weight: 2, fillColor: '#16181c', fillOpacity: 1}).addTo(g);
  const lg = document.getElementById('maplegend'); if (lg) lg.innerHTML = c ? c.legend : '';
}
function mountActMap(){
  const el = document.getElementById('actmap');
  if (MAPS.act && (!el || MAPS.act.el !== el)) { try { MAPS.act.map.remove(); } catch(e){} MAPS.act = null; }
  if (!el || MAPS.act) return;
  const a = Store.get('activities', el.dataset.id); if (!a || !a.track || a.track.length < 2) return;
  loadLeaflet().then(LF => {
    if (!document.body.contains(el) || MAPS.act) return;
    el.querySelectorAll('svg').forEach(s => s.remove());
    const map = newMap(LF, el);
    const st = MAPS.act = {LF, map, a, el, base: baseLayer(LF, S.mapBase || (a.sport === 'hike' ? 'relieve' : 'calle')).addTo(map)};
    drawRoute(st);
    map.fitBounds(LF.latLngBounds(a.track.map(q => [q[0], q[1]])), {padding: [18, 18]});
    setTimeout(() => map.invalidateSize(), 60);
  }).catch(() => {});
}
App.acts.mapMode = el => {
  S.mapMode = el.dataset.arg;
  document.querySelectorAll('[data-act="mapMode"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.arg === S.mapMode));
  if (MAPS.act) drawRoute(MAPS.act);
};
App.acts.mapBase = el => {
  S.mapBase = el.dataset.arg;
  document.querySelectorAll('[data-act="mapBase"]').forEach(b => b.setAttribute('aria-pressed', b.dataset.arg === S.mapBase));
  for (const st of [MAPS.act, MAPS.heat]) if (st) { st.base.remove(); st.base = baseLayer(st.LF, S.mapBase).addTo(st.map); }
};
const baseChips = def => { const cur = S.mapBase || def; return `<button class="chip" data-act="mapBase" data-arg="calle" aria-pressed="${cur === 'calle'}">Calles</button><button class="chip" data-act="mapBase" data-arg="relieve" aria-pressed="${cur === 'relieve'}">Relieve</button>`; };

const _actDetailMap = App.views.sh_actDetail;
App.views.sh_actDetail = (p, sh) => {
  let html = _actDetailMap(p, sh);
  const a = Store.get('activities', sh.id);
  if (!a || !['run', 'ride', 'hike'].includes(a.sport)) return html;
  if (a.track && a.track.length > 1) {
    const modes = mapModes(a);
    if (!modes.some(m => m[0] === S.mapMode)) S.mapMode = modes.length ? (modes.find(m => m[0] === (a.sport === 'hike' ? 'altura' : 'ritmo')) || modes[0])[0] : null;
    const box = `<div class="stack-s"><div class="mapbox" id="actmap" data-id="${esc(a.id)}">${routeSVG(a.track, SP[a.sport].color, 'bigroute')}</div>
      <div class="row between" style="gap:6px"><div class="chips">${modes.map(([k, l]) => `<button class="chip" data-act="mapMode" data-arg="${k}" aria-pressed="${S.mapMode === k}">${l}</button>`).join('')}</div><div class="chips">${baseChips(a.sport === 'hike' ? 'relieve' : 'calle')}</div></div>
      <div id="maplegend"></div></div>`;
    const re = /<svg class="route bigroute"[\s\S]*?<\/svg>/;
    html = re.test(html) ? html.replace(re, box) : html;
  }
  // acciones: exportar GPX y corregir altura
  const acts = [];
  if (a.track && a.track.length > 1) acts.push(`<button class="btn sm grow" data-act="gpxOut" data-arg="${esc(a.id)}">Exportar GPX</button>`);
  if (a.track && a.track.length > 1 && a.eleSrc !== 'dem' && (a.src === 'gps' || !hasEle(a.track))) acts.push(`<button class="btn sm grow" data-act="demFix" data-arg="${esc(a.id)}">Corregir altura</button>`);
  if (a.sport === 'hike' && a.distKm && a.durSec) {
    const est = naismith(a); if (est) acts.unshift(`<p class="small muted" style="width:100%">Tiempo estimado por la regla de Naismith: <b class="num">${L.durStr(est)}</b>. Lo tuyo: <b class="num">${L.durStr(a.durSec)}</b>${a.durSec < est ? ' (más rápido)' : ''}.</p>`);
  }
  if (acts.length) {
    const mark = '<div class="row"><button class="btn grow" data-act="editAct"';
    const i = html.indexOf(mark);
    const row = `<div class="row" style="flex-wrap:wrap">${acts.join('')}</div>`;
    html = i > 0 ? html.slice(0, i) + row + html.slice(i) : html + row;
  }
  return html;
};
// Naismith: 5 km/h en llano + 1 hora cada 600 m de subida
function naismith(a){ if (!a.distKm) return null; return Math.round((a.distKm / 5 + (a.elev || 0) / 600) * 3600); }

// ---------- mapa de calor ----------
App.views.sh_heat = (p, sh) => {
  const f = sh.f || (sh.f = {sp: S.cardio || 'all', per: 365});
  const n = heatActs(p, f).length;
  return `<h2>Mapa de calor</h2><p class="small muted">Todos tus recorridos juntos: donde más pasás, más intenso el color.</p>
    <div class="chips">${[['all', 'Todo'], ['run', 'Running'], ['ride', 'Bici'], ['hike', 'Senderismo']].map(([k, l]) => `<button class="chip" data-act="heatSet" data-k="sp" data-v="${k}" aria-pressed="${f.sp === k}">${l}</button>`).join('')}</div>
    <div class="chips">${[[90, '3 meses'], [365, '12 meses'], [0, 'Todo']].map(([k, l]) => `<button class="chip" data-act="heatSet" data-k="per" data-v="${k}" aria-pressed="${f.per === k}">${l}</button>`).join('')}</div>
    ${n ? `<div class="mapbox tall" id="heatmap"></div><div class="row between"><span class="small muted">${n} recorrido${n > 1 ? 's' : ''}</span><div class="chips">${baseChips('calle')}</div></div>` : '<div class="empty small">No hay recorridos con mapa en este período.</div>'}`;
};
function heatActs(p, f){ return actsOf(p.id).filter(a => ['run', 'ride', 'hike'].includes(a.sport) && (f.sp === 'all' || a.sport === f.sp) && a.track && a.track.length > 1 && (!f.per || Date.now() - new Date(a.date) < f.per * 864e5)); }
App.acts.heatSet = el => { const v = el.dataset.v; S.sheet.f[el.dataset.k] = /^\d+$/.test(v) ? +v : v; App.renderOverlay(); };
function mountHeat(){
  const el = document.getElementById('heatmap');
  if (MAPS.heat && (!el || MAPS.heat.el !== el)) { try { MAPS.heat.map.remove(); } catch(e){} MAPS.heat = null; }
  if (!el || MAPS.heat || !S.sheet || S.sheet.type !== 'heat') return;
  const acts = heatActs(curProfile(), S.sheet.f); if (!acts.length) return;
  loadLeaflet().then(LF => {
    if (!document.body.contains(el) || MAPS.heat) return;
    const map = newMap(LF, el);
    const st = MAPS.heat = {LF, map, el, base: baseLayer(LF, S.mapBase || 'calle').addTo(map)};
    const dark = isDark();
    const col = S.sheet.f.sp === 'all' ? (dark ? '#ff6a3d' : '#d6332a') : cssv(SP[S.sheet.f.sp].color);
    const op = Math.max(.12, Math.min(.5, 3 / Math.sqrt(acts.length)));
    for (const a of acts) LF.polyline(a.track.map(q => [q[0], q[1]]), {color: col, weight: 3, opacity: op, interactive: false}).addTo(map);
    // encuadre: tu zona habitual (las salidas a más de 60 km de lo habitual se dibujan igual, pero no alejan el mapa)
    const mLat = quant(acts.map(a => a.track[0][0]), .5), mLon = quant(acts.map(a => a.track[0][1]), .5);
    const near = acts.filter(a => hav([mLat, mLon], a.track[0]) < 60);
    const pts = (near.length ? near : acts).flatMap(a => a.track.map(q => [q[0], q[1]]));
    map.fitBounds(LF.latLngBounds(pts), {padding: [14, 14]});
    setTimeout(() => map.invalidateSize(), 60);
  }).catch(() => { el.innerHTML = '<div class="empty small">El mapa necesita conexión la primera vez.</div>'; });
}

// montar mapas después de cada dibujo de la hoja
const _renderOverlayMap = App.renderOverlay;
App.renderOverlay = function(){ const r = _renderOverlayMap.apply(this, arguments); setTimeout(() => { mountActMap(); mountHeat(); }, 0); return r; };

// tarjeta en Cardio
const _cardioViewMap = App.views.cardio;
App.views.cardio = (p) => {
  const html = _cardioViewMap(p);
  const n = actsOf(p.id).filter(a => ['run', 'ride', 'hike'].includes(a.sport) && a.track && a.track.length > 1).length;
  if (!n) return html;
  const card = `<div class="card row between"><div><h3>Tus recorridos</h3><span class="small muted">${n} salida${n > 1 ? 's' : ''} con mapa</span></div><button class="btn sm" data-act="sheet" data-arg="heat">Mapa de calor</button></div>`;
  const mark = '<div class="section"><h3>Historial</h3>';
  return html.includes(mark) ? html.replace(mark, card + mark) : html;
};

// ---------- exportar archivos (en la app de Android, con el menú Compartir) ----------
function capPlugin(name){
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
  if (C.isPluginAvailable && !C.isPluginAvailable(name)) return null;
  return (C.Plugins && C.Plugins[name]) || null;
}
async function exportFile(name, text, mime){
  const FS = capPlugin('Filesystem'), SH = capPlugin('Share');
  if (FS && SH) {
    try {
      const w = await FS.writeFile({path: name, data: text, directory: 'CACHE', encoding: 'utf8'});
      await SH.share({title: name, files: [w.uri]});
      return true;
    } catch(e){ if (/cancel/i.test((e && e.message) || '')) return true; console.warn(e); }
  }
  try {
    const file = new File([text], name, {type: mime});
    if (navigator.canShare && navigator.canShare({files: [file]}) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try { await navigator.share({files: [file], title: name}); return true; } catch(e){ if (e && e.name === 'AbortError') return true; }
    }
    const url = URL.createObjectURL(file); const x = document.createElement('a'); x.href = url; x.download = name; document.body.appendChild(x); x.click(); x.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast('Archivo descargado'); return true;
  } catch(e){ toast('No se pudo exportar'); return false; }
}
// respaldos y CSV también funcionan dentro de la app de Android
if (capPlugin('Filesystem') && capPlugin('Share')) {
  window.saveFile = async (name, text) => {
    if (name.endsWith('.json')) ls.set('bl_lastExport', Date.now());
    await exportFile(name, text, name.endsWith('.csv') ? 'text/csv' : 'application/json'); App.refresh();
  };
}
function buildGPX(a){
  const t0 = new Date(a.date).getTime();
  const type = {run: 'running', ride: 'cycling', hike: 'hiking'}[a.sport] || 'running';
  const name = (SP[a.sport] && SP[a.sport].types()[a.type]) || (SP[a.sport] && SP[a.sport].label) || 'Actividad';
  const x = s => String(s).replace(/[<&>]/g, c => ({'<': '&lt;', '&': '&amp;', '>': '&gt;'}[c]));
  const pts = a.track.map(q => `<trkpt lat="${q[0]}" lon="${q[1]}">${q[2] != null ? `<ele>${q[2]}</ele>` : ''}${q[3] != null ? `<time>${new Date(t0 + q[3] * 1000).toISOString()}</time>` : ''}${q[4] ? `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${q[4]}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>` : ''}</trkpt>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Barra Libre" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
<metadata><name>${x(name)}</name><time>${new Date(t0).toISOString()}</time></metadata>
<trk><name>${x(name)}</name><type>${type}</type><trkseg>
${pts}
</trkseg></trk></gpx>`;
}
App.acts.gpxOut = async el => {
  const a = Store.get('activities', el.dataset.arg); if (!a || !a.track) return;
  const ok = await exportFile(`barra-libre-${localDay(a.date)}-${a.sport}.gpx`, buildGPX(a), 'application/gpx+xml');
  if (ok) toast('Para subirlo a Strava: strava.com/upload/select');
};

// ---------- altura corregida (mapa de relieve) ----------
async function demElevation(track){
  const out = [];
  for (let i = 0; i < track.length; i += 100) {
    const ch = track.slice(i, i + 100);
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${ch.map(q => q[0]).join(',')}&longitude=${ch.map(q => q[1]).join(',')}`);
    if (!r.ok) throw new Error('dem');
    const j = await r.json(); if (!j.elevation || j.elevation.length !== ch.length) throw new Error('dem');
    out.push(...j.elevation);
  }
  return out;
}
// desnivel positivo con umbral de 3 m para no sumar ruido
function gainOf(eles, thr = 3){ let g = 0, ref = null; for (const e of eles) { if (e == null) continue; if (ref == null) { ref = e; continue; } if (e - ref >= thr) { g += e - ref; ref = e; } else if (ref - e >= thr) ref = e; } return Math.round(g); }
async function fixElevation(id){
  const a = Store.get('activities', id); if (!a || !a.track || a.track.length < 2) return false;
  const el = await demElevation(a.track);
  const tr = a.track.map((q, i) => { const r = q.slice(); while (r.length < 5) r.push(null); r[2] = Math.round(el[i]); return r; });
  await Store.put('activities', {...Store.get('activities', id), track: tr, elev: gainOf(el), eleSrc: 'dem'});
  return true;
}
App.acts.demFix = async el => {
  el.disabled = true; el.textContent = 'Corrigiendo…';
  try { await fixElevation(el.dataset.arg); toast('Altura corregida con el mapa de relieve'); } catch(e){ toast('No se pudo: hace falta conexión a internet'); }
  App.renderOverlay(); flushCharts();
};
