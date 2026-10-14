// Durante la salida: avisos por voz (cada km, intervalos, agua, puesta del sol, subidas de la ruta planificada)
// y "Planificar ruta": cargás un GPX y ves distancia, desnivel, subidas, ritmo objetivo por km y tiempo estimado.
'use strict';
Object.assign(window.REFS, {
  minetti2002: 'Minetti AE, Moia C, Roi GS, Susta D, Ferretti G. Energy cost of walking and running at extreme uphill and downhill slopes. J Appl Physiol. 2002;93(3):1039-1046.'
});

// ---------- voz ----------
const VOZ = {voice: null};
function say(txt){
  try {
    if (!window.speechSynthesis) return;
    if (!VOZ.voice) { const vs = speechSynthesis.getVoices(); VOZ.voice = vs.find(v => /^es[-_]AR/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null; }
    const u = new SpeechSynthesisUtterance(txt); u.lang = 'es-AR'; if (VOZ.voice) u.voice = VOZ.voice; u.rate = 1.02; speechSynthesis.speak(u);
  } catch(e){}
}
const recOpts = () => ls.get('bl_rec_opts', {km: true, agua: false});
const setRecOpt = (k, v) => { const o = recOpts(); o[k] = v; ls.set('bl_rec_opts', o); };
const INTERVALS = {i44: ['4 × 4 min (3 suaves)', 4, 240, 180], i63: ['6 × 3 min (2 suaves)', 6, 180, 120], i81: ['8 × 1 min (1 suave)', 8, 60, 60], i1030: ['10 × 30 s (30 s suaves)', 10, 30, 30]};
const spoken = s => { const m = Math.floor(s / 60), x = Math.round(s % 60); return m ? `${m} ${x ? 'minutos ' + x : (m === 1 ? 'minuto' : 'minutos')}` : `${x} segundos`; };
const paceSpoken = sPerKm => { const m = Math.floor(sPerKm / 60), x = Math.round(sPerKm % 60); return `${m} ${String(x).padStart(2, '0')}`; };

// ---------- puesta del sol (ecuación solar de la NOAA, simplificada) ----------
function sunset(lat, lon, date){
  const r = Math.PI / 180, JD = date.getTime() / 864e5 + 2440587.5;
  const n = Math.round(JD - 2451545 - .0009), Js = n - lon / 360;
  const M = (357.5291 + .98560028 * Js) % 360, C = 1.9148 * Math.sin(M * r) + .02 * Math.sin(2 * M * r) + .0003 * Math.sin(3 * M * r);
  const lam = (M + C + 180 + 102.9372) % 360, Jt = 2451545 + Js + .0053 * Math.sin(M * r) - .0069 * Math.sin(2 * lam * r);
  const dec = Math.asin(Math.sin(lam * r) * Math.sin(23.4397 * r));
  const cw = (Math.sin(-.833 * r) - Math.sin(lat * r) * Math.sin(dec)) / (Math.cos(lat * r) * Math.cos(dec)); if (cw < -1 || cw > 1) return null;
  return new Date((Jt + Math.acos(cw) / r / 360 - 2440587.5) * 864e5);
}
const hm = d => d.toLocaleTimeString('es-AR', {hour: '2-digit', minute: '2-digit', hour12: false});

// ---------- avisos mientras grabás ----------
function recVoiceCheck(){
  const st = REC.st; if (!st || st.recovered || st.endAt) return;
  const o = recOpts(), mov = recMoving(st); st.v = st.v || {km: 0, kmAt: 0, agua: 0, sun: false, climb: -1};
  // cada kilómetro (en bici, cada 5)
  const step = st.sport === 'ride' ? 5 : 1, k = Math.floor(st.dist / 1000 / step);
  if (o.km && k > st.v.km) { const secs = mov - st.v.kmAt; st.v.km = k; st.v.kmAt = mov; say(st.sport === 'ride' ? `${k * step} kilómetros. Promedio de los últimos 5: ${Math.round(5 / (secs / 3600))} kilómetros por hora.` : `Kilómetro ${k}. Ritmo ${paceSpoken(secs)}.`); }
  else if (k > st.v.km) { st.v.km = k; st.v.kmAt = mov; }
  // agua cada 20 minutos
  if (o.agua && Math.floor(mov / 1200) > st.v.agua) { st.v.agua = Math.floor(mov / 1200); say('Tomá agua.'); }
  // intervalos
  const iv = st.iv; if (iv && !iv.done && !st.paused) {
    const el = mov - iv.start, per = iv.work + iv.rest; const idx = Math.floor(el / per), inWork = el % per < iv.work;
    const ph = idx >= iv.n ? 'fin' : (inWork ? 'w' : 'r') + idx;
    if (ph !== iv.ph) { iv.ph = ph; if (ph === 'fin') { iv.done = true; say('Terminaste los intervalos. Ahora trotá suave para enfriar.'); } else if (inWork) say(`Serie ${idx + 1} de ${iv.n}. Fuerte, ${spoken(iv.work)}.`); else say(`Suave, ${spoken(iv.rest)}.`); }
  }
  // puesta del sol
  if (st.sunAt && !st.v.sun && st.sunAt - Date.now() < 30 * 60000 && st.sunAt > Date.now()) { st.v.sun = true; say('Faltan 30 minutos para que se ponga el sol.'); }
  // subidas de la ruta planificada
  const rt = st.route; const q = st.pts[st.pts.length - 1];
  if (rt && q && rt.climbs && rt.climbs.length) {
    let bi = 0, bd = Infinity; for (let i = 0; i < rt.pts.length; i++) { const d = hav(q, rt.pts[i]); if (d < bd) { bd = d; bi = i; } }
    st.v.pos = bd < .3 ? bi : null;
    if (st.v.pos != null) { const c = rt.climbs.find((c, j) => j > st.v.climb && c.i0 >= bi); if (c) { const dTo = (rt.cum[c.i0] - rt.cum[bi]) / 1000; st.v.next = {c, dTo}; if (dTo < .3 && rt.climbs.indexOf(c) > st.v.climb) { st.v.climb = rt.climbs.indexOf(c); say(`En ${Math.max(50, Math.round(dTo * 1000 / 50) * 50)} metros empieza una subida de ${fmtNum(c.len / 1000, 1)} kilómetros al ${Math.round(c.grade)} por ciento.`); } } else st.v.next = null; }
  }
}
if (typeof window.recPoint === 'function') { const _rp = window.recPoint; window.recPoint = loc => { _rp(loc); try { recVoiceCheck(); } catch(e){} }; }
if (typeof window.recPaint === 'function') {
  const _rpaint = window.recPaint;
  window.recPaint = () => { _rpaint(); try { recVoiceCheck(); const st = REC.st; if (!st) return; const n = document.getElementById('rec_extra'); if (n) n.innerHTML = recExtraLine(st); } catch(e){} };
}
function recExtraLine(st){
  const bits = [];
  if (st.iv && !st.iv.done) { const el = recMoving(st) - st.iv.start, per = st.iv.work + st.iv.rest, idx = Math.floor(el / per), inW = el % per < st.iv.work, left = inW ? st.iv.work - el % per : per - el % per; bits.push(`<b>${inW ? 'Fuerte' : 'Suave'}</b> ${L.durStr(Math.max(0, Math.round(left)))} · serie ${Math.min(idx + 1, st.iv.n)}/${st.iv.n}`); }
  if (st.v && st.v.next) bits.push(`Próxima subida en ${fmtNum(st.v.next.dTo, 1)} km: ${fmtNum(st.v.next.c.len / 1000, 1)} km al ${Math.round(st.v.next.c.grade)}%`);
  if (st.sunAt) bits.push(`Puesta del sol ${hm(new Date(st.sunAt))}`);
  return bits.length ? `<div class="banner info small"><div>${bits.join('<br>')}</div></div>` : '';
}
// pantalla de grabación: opciones de voz, intervalos y "avisar dónde estoy"
const _ovRec = App.views.ov_rec;
App.views.ov_rec = () => {
  const html = _ovRec(); const st = REC.st; if (!st || st.recovered) return html;
  if (!st.sunAt) { const q = st.pts[0]; if (q) { const s = sunset(q[0], q[1], new Date()); st.sunAt = s ? s.getTime() : null; if (st.sunAt && st.sunAt - Date.now() < 60 * 60000 && st.sunAt > Date.now() && st.sport === 'hike') toast('El sol se pone a las ' + hm(s) + ': calculá la vuelta.'); } }
  const o = recOpts();
  const opts = `<div id="rec_extra">${recExtraLine(st)}</div>
    <details class="card flat"><summary>Voz, intervalos y seguridad</summary><div class="stack-s" style="margin-top:8px">
      <div class="chips"><button class="chip" data-act="recOpt" data-arg="km" aria-pressed="${!!o.km}">Voz ${st.sport === 'ride' ? 'cada 5 km' : 'cada km'}</button><button class="chip" data-act="recOpt" data-arg="agua" aria-pressed="${!!o.agua}">Agua cada 20 min</button></div>
      ${st.sport !== 'hike' ? `<span class="small muted">Intervalos (te avisa por voz):</span><div class="chips">${Object.entries(INTERVALS).map(([k, v]) => `<button class="chip" data-act="recIv" data-arg="${k}" aria-pressed="${st.iv && st.iv.k === k && !st.iv.done}">${v[0]}</button>`).join('')}${st.iv && !st.iv.done ? '<button class="chip" data-act="recIv" data-arg="stop">Cortar</button>' : ''}</div>` : ''}
      ${st.route ? `<p class="small">Ruta: <b>${esc(st.route.name)}</b> · ${st.route.climbs.length} subidas marcadas.</p>` : ''}
      <button class="btn sm" data-act="recWhere">Avisar dónde estoy (WhatsApp)</button>
      <p class="tiny muted">La voz usa el lector del teléfono. Para que te sigan en vivo, en WhatsApp usá "Compartir ubicación en tiempo real".</p></div></details>`;
  const mark = '<div class="field"><label>GPS</label>'; return html.includes(mark) ? html.replace(mark, opts + mark) : html;
};
App.acts.recOpt = el => { const k = el.dataset.arg; setRecOpt(k, !recOpts()[k]); App.renderOverlay(); };
App.acts.recIv = el => {
  const st = REC.st, k = el.dataset.arg;
  if (k === 'stop') { if (st.iv) st.iv.done = true; App.renderOverlay(); return; }
  const v = INTERVALS[k]; st.iv = {k, n: v[1], work: v[2], rest: v[3], start: recMoving(st) + 10, ph: null};
  say(`Intervalos: ${v[1]} series. Empezamos en 10 segundos.`); recSave(true); App.renderOverlay();
};
App.acts.recWhere = () => {
  const q = REC.st && REC.st.pts[REC.st.pts.length - 1]; if (!q) { toast('Todavía no hay ubicación'); return; }
  location.href = 'https://wa.me/?text=' + encodeURIComponent(`Estoy acá (${hm(new Date())}): https://maps.google.com/?q=${q[0]},${q[1]}`);
};
// ruta planificada: se usa al empezar a grabar
if (App.acts.recStart) { const _rs = App.acts.recStart; App.acts.recStart = async el => { await _rs(el); const r = ls.get('bl_route', null); if (REC.st && r && r.use && r.sport === el.dataset.arg) { REC.st.route = r; recSave(true); App.renderOverlay(); } }; }

// ---------- planificar ruta ----------
// costo energético de correr (Cr) y caminar (Cw) según la pendiente i (Minetti 2002), en J/kg/m
const minettiR = i => 155.4 * i ** 5 - 30.4 * i ** 4 - 43.3 * i ** 3 + 46.3 * i ** 2 + 19.5 * i + 3.6;
function routeOf(name, sport, track){
  const pts = track.map(q => [q[0], q[1], q[2]]); const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + hav(pts[i - 1], pts[i]) * 1000);
  // altura suavizada para encontrar subidas
  const ele = pts.map((_, i) => { const w = pts.slice(Math.max(0, i - 2), i + 3).map(q => q[2]).filter(x => x != null); return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null; });
  const climbs = []; let i0 = null;
  for (let i = 1; i < pts.length; i++) {
    const up = ele[i] != null && ele[i - 1] != null && ele[i] > ele[i - 1];
    if (up && i0 == null) i0 = i - 1;
    if ((!up || i === pts.length - 1) && i0 != null) { // cierre de una subida (tolera bajadas cortas)
      let j = i; while (j + 1 < pts.length && ele[j + 1] != null && ele[j + 1] >= ele[j] - 2 && cum[j + 1] - cum[i] < 150) j++;
      if (ele[j] == null || ele[i0] == null) { i0 = null; continue; }
      const gain = ele[j] - ele[i0], len = cum[j] - cum[i0];
      if (gain >= 25 && len >= 300 && gain / len >= .03) climbs.push({i0, i1: j, gain: Math.round(gain), len: Math.round(len), grade: gain / len * 100, at: cum[i0]});
      i0 = null; i = j;
    }
  }
  return {name, sport, pts, cum, climbs, dist: cum[cum.length - 1], gain: gainOf(ele), hasEle: ele.some(x => x != null)};
}
function flatPace(p){ const r = actsOf(p.id, 'run').filter(a => a.distKm >= 3 && a.durSec && Date.now() - new Date(a.date) < 120 * 864e5).map(a => a.durSec / a.distKm); return r.length ? r.sort((a, b) => a - b)[Math.floor(r.length / 2)] : 360; }
function paceTable(rt, base){ // ritmo objetivo por km según la pendiente media de ese km
  const out = []; const kms = Math.ceil(rt.dist / 1000);
  for (let k = 0; k < kms; k++) {
    const a = k * 1000, b = Math.min(rt.dist, (k + 1) * 1000);
    const ia = rt.cum.findIndex(x => x >= a), ib = rt.cum.findIndex(x => x >= b); const i0 = Math.max(0, ia), i1 = ib < 0 ? rt.pts.length - 1 : ib;
    const e0 = rt.pts[i0][2], e1 = rt.pts[i1][2], len = rt.cum[i1] - rt.cum[i0] || 1;
    const g = e0 != null && e1 != null ? Math.max(-.3, Math.min(.3, (e1 - e0) / len)) : 0;
    const f = Math.max(.85, Math.min(2.2, minettiR(g) / 3.6));
    out.push({k: k + 1, g: g * 100, pace: base * f, sec: base * f * (b - a) / 1000});
  }
  return out;
}
App.views.sh_route = (p, sh) => {
  const rt = sh.rt || ls.get('bl_route', null);
  const input = `<label class="btn" for="rtf">${rt ? 'Cargar otra ruta' : 'Elegir archivo GPX o FIT'}</label><input id="rtf" type="file" accept=".gpx,.tcx,.fit,application/gpx+xml,application/xml,text/xml,application/octet-stream" hidden data-change="routeFile">`;
  if (!rt) return `<h2>Planificar ruta</h2><p class="small muted">Cargá el recorrido que pensás hacer (de Wikiloc, Strava, Komoot o Garmin). Te muestro las subidas, el tiempo estimado y, si corrés, el ritmo para cada km según la pendiente.</p>${input}`;
  const base = sh.base || flatPace(p);
  const sp = rt.sport;
  const tbl = sp === 'run' ? paceTable(rt, base) : null;
  const tEst = sp === 'run' ? tbl.reduce((t, x) => t + x.sec, 0) : sp === 'hike' ? (rt.dist / 1000 / 5 + rt.gain / 600) * 3600 : null;
  const ss = rt.pts[0] ? sunset(rt.pts[0][0], rt.pts[0][1], new Date()) : null, endAt = tEst ? new Date(Date.now() + tEst * 1000) : null;
  return `<h2>${esc(rt.name)}</h2>
    <div class="chips">${['run', 'ride', 'hike'].map(k => `<button class="chip" data-act="routeSport" data-arg="${k}" aria-pressed="${sp === k}">${SP[k].label}</button>`).join('')}</div>
    <div class="kpis"><div class="kpi"><b>${fmtNum(rt.dist / 1000, 1)}</b><span>km</span></div><div class="kpi"><b>${rt.hasEle ? '+' + rt.gain : '–'}</b><span>m de subida</span></div><div class="kpi"><b>${rt.climbs.length}</b><span>subidas</span></div><div class="kpi"><b style="font-size:20px">${tEst ? L.durStr(Math.round(tEst)) : '–'}</b><span>tiempo estimado</span></div></div>
    ${!rt.hasEle ? '<button class="btn sm" data-act="routeDem">Agregar altura con mapa de relieve</button>' : ''}
    ${ss && endAt ? `<p class="small ${endAt > ss ? '' : 'muted'}" style="${endAt > ss ? 'color:var(--warn)' : ''}">Si salís ahora terminás cerca de las ${hm(endAt)}; el sol se pone a las ${hm(ss)}.${endAt > ss ? ' Saliendo ahora, terminarías de noche.' : ''}</p>` : ''}
    ${rt.climbs.length ? `<div class="stack-s"><span class="label">Subidas</span>${rt.climbs.map((c, i) => `<div class="row between"><span class="small">${i + 1}. km ${fmtNum(c.at / 1000, 1)}</span><span class="small num"><b>${fmtNum(c.len / 1000, 1)} km</b> al ${fmtNum(c.grade, 1)}% · +${c.gain} m</span></div>`).join('')}</div>` : ''}
    ${tbl ? `<div class="field"><label for="rt_b">Tu ritmo en llano (min:seg por km)</label><input id="rt_b" type="text" inputmode="numeric" value="${L.paceStr(base)}" data-change="routeBase"></div>
      <details class="card flat"><summary>Ritmo objetivo por km</summary><div class="stack-s" style="margin-top:8px">${tbl.map(x => `<div class="row between"><span class="small">km ${x.k} · ${x.g >= 0 ? '+' : ''}${fmtNum(x.g, 1)}%</span><b class="small num">${L.paceStr(x.pace)}/km</b></div>`).join('')}</div>
      <p class="tiny muted">Mismo esfuerzo en subida y bajada, según el costo energético de correr en pendiente (Minetti 2002). En bajadas fuertes el límite es la técnica, no el corazón.</p></details>` : ''}
    ${sp === 'hike' ? '<p class="tiny muted">Tiempo por regla de Naismith: 1 h cada 5 km + 1 h cada 600 m de subida, sin paradas.</p>' : ''}
    <button class="btn primary" data-act="routeUse">${rt.use ? '✓ Se usa en la próxima salida' : 'Usar en la próxima salida (avisos de subidas)'}</button>
    <div class="row">${input}<button class="btn ghost danger" data-act="routeDel">Borrar ruta</button></div>`;
};
App.binds.routeFile = async el => {
  const f = el.files && el.files[0]; if (!f) return;
  try {
    const t = /\.fit$/i.test(f.name) ? parseTrack({fit: new Uint8Array(await f.arrayBuffer())}, S.cardio) : parseTrack(await f.text(), S.cardio);
    if (!t.res.track || t.res.track.length < 2) throw new Error('sin recorrido');
    const rt = routeOf(f.name.replace(/\.(gpx|tcx|fit)$/i, ''), ['run', 'ride', 'hike'].includes(t.sport) ? t.sport : 'run', t.res.track);
    ls.set('bl_route', rt); S.sheet.rt = rt; App.renderOverlay();
  } catch(e){ toast('No pude leer la ruta. Probá con un GPX.'); }
  el.value = '';
};
App.binds.routeBase = el => { const v = L.parseDur(el.value); if (v > 120 && v < 1200) { S.sheet.base = v; App.renderOverlay(); } };
App.acts.routeSport = el => { const rt = S.sheet.rt || ls.get('bl_route', null); rt.sport = el.dataset.arg; ls.set('bl_route', rt); S.sheet.rt = rt; App.renderOverlay(); };
App.acts.routeUse = () => { const rt = S.sheet.rt || ls.get('bl_route', null); rt.use = !rt.use; ls.set('bl_route', rt); S.sheet.rt = rt; App.renderOverlay(); if (rt.use) toast(typeof recPlugin === 'function' && recPlugin() ? 'Listo: al grabar ' + SP[rt.sport].label.toLowerCase() + ' te aviso antes de cada subida' : 'Para los avisos durante la salida usá la app de Android'); };
App.acts.routeDel = () => { ls.del('bl_route'); S.sheet.rt = null; App.renderOverlay(); };
App.acts.routeDem = async el => {
  const rt = S.sheet.rt || ls.get('bl_route', null); el.disabled = true; el.textContent = 'Buscando alturas…';
  try { const e = await demElevation(rt.pts.map(q => [q[0], q[1]])); const tr = rt.pts.map((q, i) => [q[0], q[1], Math.round(e[i])]); const nr = {...routeOf(rt.name, rt.sport, tr), use: rt.use}; ls.set('bl_route', nr); S.sheet.rt = nr; } catch(e){ toast('Hace falta conexión'); }
  App.renderOverlay();
};
// botón en Cardio, dentro de "Tus recorridos" (o solo, si todavía no hay recorridos)
const _cardioRoute = App.views.cardio;
App.views.cardio = (p) => {
  const html = _cardioRoute(p); if (!['run', 'ride', 'hike'].includes(S.cardio)) return html;
  const btn = `<button class="btn sm ghost" data-act="sheet" data-arg="route">Planificar ruta</button>`;
  const a = '<button class="btn sm" data-act="sheet" data-arg="heat">Mapa de calor</button>';
  if (html.includes(a)) return html.replace(a, `<div class="row" style="gap:6px">${btn}${a}</div>`);
  const mark = '<div class="section"><h3>Historial</h3>';
  return html.includes(mark) ? html.replace(mark, `<div class="card row between"><div><h3>Ruta</h3><span class="small muted">Subidas, tiempo y ritmo por km</span></div>${btn}</div>` + mark) : html;
};
