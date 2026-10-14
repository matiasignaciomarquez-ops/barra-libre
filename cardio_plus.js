// Cardio avanzado: zonas de FC personales, tiempo en zonas por sesión, carga (TRIMP de Edwards),
// curva de pulso, perfil de altimetría (de GPX/TCX con GPS), cadencia y VO2máx estimado.
// Funciona en la web con lo importado; con la app de Android se completa con el pulso del reloj.
'use strict';
Object.assign(window.REFS, {
  karvonen1957: 'Karvonen MJ, Kentala E, Mustala O. The effects of training on heart rate; a longitudinal study. Ann Med Exp Biol Fenn. 1957;35(3):307-315.',
  edwards1993: 'Edwards S. The Heart Rate Monitor Book. Sacramento: Fleet Feet Press; 1993.',
  uth2004: 'Uth N, Sørensen H, Overgaard K, Pedersen PK. Estimation of VO2max from the ratio between HRmax and HRrest – the Heart Rate Ratio Method. Eur J Appl Physiol. 2004;91(1):111-115.'
});
const ZPCT = [.5, .6, .7, .8, .9, 1];
const ZCOL = ['#85B7EB', '#5DCAA5', '#EF9F27', '#D85A30', '#A32D2D'];
const ZNAME = ['Z1 recuperación', 'Z2 base aeróbica', 'Z3 tempo', 'Z4 umbral', 'Z5 máximo'];
const hav = (a, b) => { const R = 6371, r = x => x * Math.PI / 180; const dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

// ---------- zonas personales ----------
function restHrOf(p){
  if (p.hrRestUser) return +p.hrRestUser;
  const hs = Store.list('health', p.id).filter(h => (Date.now() - new Date(h.date + 'T12:00:00')) < 21 * 864e5).map(h => h.hrRest || h.hrMin).filter(Boolean).sort((a, b) => a - b);
  return hs.length >= 3 ? hs[Math.floor(hs.length / 2)] : null;
}
function myZones(p){
  const est = L.hrMax(p.age);
  const max = +p.hrMaxUser || est; if (!max) return null;
  const rest = restHrOf(p);
  const method = p.zoneMethod === 'max' || !rest ? 'max' : 'reserve';
  const at = f => Math.round(method === 'reserve' ? rest + (max - rest) * f : max * f);
  return {max, rest, method, est, z: [0, 1, 2, 3, 4].map(i => ({z: i + 1, lo: at(ZPCT[i]), hi: at(ZPCT[i + 1])}))};
}
const zoneOf = (Z, bpm) => { for (let i = 4; i >= 0; i--) if (bpm >= Z.z[i].lo) return i; return 0; };

// ---------- series de datos de una actividad ----------
// track enriquecido: [lat, lon, ele, segundos, fc] (ver parseTrack más abajo)
function actStreams(a){
  const out = {hr: [], prof: []};
  const t = a.track || [];
  if (t.length > 3 && t[0].length >= 4) {
    let km = 0;
    t.forEach((p, i) => { if (i) km += hav(t[i - 1], p); if (p[2] != null) out.prof.push([km, p[2]]); if (p[4] && p[3] != null) out.hr.push([p[3], p[4]]); });
  }
  if (out.hr.length < 10 && a.hrS && a.hrS.length) out.hr = a.hrS;
  return out;
}
function zoneTimes(a, Z){
  const s = actStreams(a).hr; if (s.length < 5 || !Z) return null;
  const sec = [0, 0, 0, 0, 0];
  for (let i = 0; i < s.length; i++) { const dt = i + 1 < s.length ? Math.min(120, Math.max(0, s[i + 1][0] - s[i][0])) : 10; sec[zoneOf(Z, s[i][1])] += dt; }
  return sec;
}
const trimp = sec => sec ? Math.round(sec.reduce((t, s, i) => t + s / 60 * (i + 1), 0)) : null;

// ---------- importación: guardar altitud, tiempo y FC en cada punto ----------
const _parseTrack = window.parseTrack;
window.parseTrack = function(text, defSport){
  const r = _parseTrack(text, defSport);
  try {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    const tag = (n, t) => { const x = n.getElementsByTagName(t)[0]; return x ? x.textContent : null; };
    const pts = [];
    const trk = xml.getElementsByTagName('trkpt');
    if (trk.length) for (const n of trk) { const h = n.getElementsByTagNameNS('*', 'hr')[0]; pts.push([+n.getAttribute('lat'), +n.getAttribute('lon'), tag(n, 'ele') != null ? +tag(n, 'ele') : null, tag(n, 'time') ? Date.parse(tag(n, 'time')) : null, h ? +h.textContent : null]); }
    else for (const n of xml.getElementsByTagName('Trackpoint')) { const la = tag(n, 'LatitudeDegrees'), lo = tag(n, 'LongitudeDegrees'); const h = n.getElementsByTagName('HeartRateBpm')[0]; if (la != null && lo != null) pts.push([+la, +lo, tag(n, 'AltitudeMeters') != null ? +tag(n, 'AltitudeMeters') : null, tag(n, 'Time') ? Date.parse(tag(n, 'Time')) : null, h ? +tag(h, 'Value') : null]); }
    if (pts.length > 1 && r.res) {
      const t0 = pts.find(p => p[3]) ? pts.find(p => p[3])[3] : null;
      const step = Math.max(1, Math.ceil(pts.length / 300));
      r.res.track = pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(p => [+p[0].toFixed(5), +p[1].toFixed(5), p[2] != null ? Math.round(p[2] * 10) / 10 : null, t0 && p[3] ? Math.round((p[3] - t0) / 1000) : null, p[4] > 30 && p[4] < 230 ? p[4] : null]);
    }
  } catch(e){ console.warn(e); }
  return r;
};

// ---------- detalle de la actividad ----------
function zoneBars(sec){
  const tot = sec.reduce((a, b) => a + b, 0) || 1;
  return `<div class="stack-s">${sec.map((s, i) => `<div class="row" style="gap:8px;flex-wrap:nowrap"><span class="tiny" style="width:112px;flex:none">${ZNAME[i]}</span><div style="flex:1;height:12px;background:var(--surface2);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${s / tot * 100}%;background:${ZCOL[i]}"></i></div><span class="tiny num" style="width:64px;text-align:right;flex:none">${Math.round(s / 60)}′ · ${Math.round(s / tot * 100)}%</span></div>`).join('')}</div>`;
}
function cardioExtras(p, a){
  const Z = myZones(p), st = actStreams(a), sec = zoneTimes(a, Z);
  const native = typeof HC !== 'undefined' && HC.plugin;
  let html = '';
  if (sec) {
    const col = cssv('--lift');
    const hrS = st.hr;
    chartLater('hrch', () => ({type:'line', data:{labels: hrS.map(x => Math.round(x[0] / 60) + '′'), datasets:[{data: hrS.map(x => x[1]), borderColor: col, backgroundColor: col, pointRadius: 0, borderWidth: 1.6, tension: .25}]},
      options: baseOpts({scales:{x:{grid:{display:false}, ticks:{maxTicksLimit:6}}, y:{beginAtZero:false, grid:{color:cssv('--line')}, ticks:{maxTicksLimit:4}}}, plugins:{legend:{display:false}, tooltip:{intersect:false, mode:'index', callbacks:{label: c => c.parsed.y + ' lpm'}}}})}));
    html += `<div class="card flat stack-s"><div class="row between"><b>Zonas de frecuencia cardíaca</b><span class="pill">Carga ${trimp(sec)}</span></div>${zoneBars(sec)}
      <div class="chartbox" style="height:150px"><canvas id="hrch"></canvas></div>
      <p class="tiny muted">${Z.method === 'reserve' ? `Zonas por FC de reserva (Karvonen): máx. ${Z.max}, reposo ${Z.rest}.` : `Zonas por % de FC máx. (${Z.max} lpm).`} Carga = minutos × número de zona (TRIMP de Edwards).${a.hrSrc === 'hc' || a.hrS ? ' Pulso tomado del reloj.' : ''}</p></div>`;
  } else if (native && ['run', 'ride', 'hike', 'class', 'yoga'].includes(a.sport)) {
    html += `<button class="btn" data-act="hcEnrich" data-arg="${a.id}">Traer pulso y zonas del reloj</button>`;
  }
  if (a.cad) html += `<p class="small">Cadencia media: <b class="num">${a.cad}</b> pasos/min <span class="tiny muted">(referencia habitual en corredores recreativos: 160–180)</span></p>`;
  if (st.prof.length > 5) {
    const eles = st.prof.map(x => x[1]), mn = Math.min(...eles), mx = Math.max(...eles), col = cssv('--ride');
    chartLater('elch', () => ({type:'line', data:{labels: st.prof.map(x => fmtNum(x[0], 1)), datasets:[{data: eles, borderColor: col, backgroundColor: col + '33', fill: true, pointRadius: 0, borderWidth: 1.5, tension: .3}]},
      options: baseOpts({scales:{x:{grid:{display:false}, ticks:{maxTicksLimit:6, callback: function(v){ return this.getLabelForValue(v) + ' km'; }}}, y:{beginAtZero:false, grid:{color:cssv('--line')}, ticks:{maxTicksLimit:4}}}, plugins:{legend:{display:false}, tooltip:{intersect:false, mode:'index', callbacks:{title: c => c[0].label + ' km', label: c => Math.round(c.parsed.y) + ' m'}}}})}));
    html += `<div class="card flat stack-s"><div class="row between"><b>Altimetría</b><span class="small muted num">${Math.round(mn)}–${Math.round(mx)} m${a.elev ? ' · +' + a.elev + ' m' : ''}</span></div><div class="chartbox" style="height:140px"><canvas id="elch"></canvas></div></div>`;
  }
  return html;
}
const _actDetail3 = App.views.sh_actDetail;
App.views.sh_actDetail = (p, sh) => {
  const html = _actDetail3(p, sh); const a = Store.get('activities', sh.id);
  if (!a || !['run', 'ride', 'hike', 'class', 'yoga'].includes(a.sport)) return html;
  const ex = cardioExtras(p, a); if (!ex) return html;
  const marks = ['<div class="row"><button class="btn grow" data-act="editAct"', '<div class="row"><button class="btn grow" data-act="classRepeat"', '<button class="btn danger" data-act="askDelA"', '<button class="btn danger" data-act="delAct"'];
  for (const m of marks) { const i = html.indexOf(m); if (i > 0) return html.slice(0, i) + ex + html.slice(i); }
  return html + ex;
};

// ---------- pestaña Cardio: zonas personales e intensidad real ----------
const _cardioView2 = App.views.cardio;
App.views.cardio = (p) => {
  const html = _cardioView2(p);
  if (!['run', 'ride', 'hike'].includes(S.cardio)) return html;
  const Z = myZones(p);
  const acts = actsOf(p.id).filter(a => ['run', 'ride', 'hike'].includes(a.sport) && (Date.now() - new Date(a.date)) < 28 * 864e5);
  const tot = [0, 0, 0, 0, 0]; let n = 0, load = 0;
  if (Z) acts.forEach(a => { const s = zoneTimes(a, Z); if (s) { n++; s.forEach((x, i) => tot[i] += x); load += trimp(s); } });
  const all = tot.reduce((a, b) => a + b, 0);
  const low = all ? Math.round((tot[0] + tot[1]) / all * 100) : null;
  const rest = Z && Z.rest;
  const vo2 = Z && rest ? Math.round(15.3 * Z.max / rest) : null;
  const hcVo2 = (() => { const h = Store.list('health', p.id).filter(x => x.vo2).sort((a, b) => b.date.localeCompare(a.date))[0]; return h ? h.vo2 : null; })();
  const card = `<div class="card stack-s"><div class="row between"><h3>Zonas de FC (28 días)</h3><button class="btn sm ghost" data-act="sheet" data-arg="zones">Mis zonas</button></div>
    ${n ? `<div class="row between"><span class="small muted">${n} sesi${n === 1 ? 'ón' : 'ones'} con pulso · carga total <b class="num">${load}</b></span><span class="pill ${low >= 75 ? 'ok' : 'warn'}">${low}% en Z1–Z2</span></div>${zoneBars(tot)}
      <p class="tiny muted">Con pulso real: en corredores y ciclistas de resistencia, alrededor del 80% del tiempo en intensidad baja (Z1–Z2) y el resto alta da buenos resultados (Seiler 2010).</p>`
      : `<p class="small muted">${typeof HC !== 'undefined' && HC.plugin ? 'Sincronizá el reloj para ver tus minutos en cada zona.' : 'Importá actividades con pulso (GPX/TCX) o usá la app de Android con tu reloj para ver tus minutos en cada zona.'}</p>`}
    ${Z ? `<p class="small">${Z.z.map(z => `<span style="display:inline-block;margin:0 8px 4px 0"><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ZCOL[z.z - 1]};margin-right:4px"></i>Z${z.z} ${z.lo}–${z.hi}</span>`).join('')}</p>` : ''}
    ${vo2 || hcVo2 ? `<div class="row"><span class="small">VO2máx ${hcVo2 ? 'del reloj' : 'estimado'}: <b class="num">${hcVo2 || vo2}</b> ml/kg/min</span>${!hcVo2 ? '<span class="tiny muted">(FC máx./FC reposo, Uth 2004)</span>' : ''}</div>` : ''}</div>`;
  const mark = '<div class="section"><h3>Historial</h3>';
  return html.includes(mark) ? html.replace(mark, card + mark) : html;
};
App.views.sh_zones = (p) => {
  const Z = myZones(p) || {};
  const seenMax = Math.max(0, ...actsOf(p.id).map(a => a.hrMax || 0), ...workoutsOf(p.id).map(w => w.hrMax || 0));
  return `<h2>Mis zonas de frecuencia cardíaca</h2>
  <div class="grid2"><div class="field"><label for="z_max">FC máxima</label><input id="z_max" type="number" inputmode="numeric" placeholder="${Z.est || ''}" value="${esc(p.hrMaxUser || '')}"></div>
  <div class="field"><label for="z_rest">FC en reposo</label><input id="z_rest" type="number" inputmode="numeric" placeholder="${restHrOf({...p, hrRestUser: null}) || ''}" value="${esc(p.hrRestUser || '')}"></div></div>
  <p class="tiny muted">Vacío = automático. FC máx. estimada por edad: ${Z.est || '–'} lpm (Tanaka 2001)${seenMax ? `; la más alta registrada: ${seenMax} lpm` : ''}. FC en reposo: mediana de las últimas 3 semanas del reloj${restHrOf({...p, hrRestUser: null}) ? '' : ' (todavía sin datos)'}.</p>
  <div class="field"><label>Método</label><div class="chips"><button class="chip" data-act="zMethod" data-arg="reserve" aria-pressed="${(p.zoneMethod || 'reserve') === 'reserve'}">FC de reserva (Karvonen)</button><button class="chip" data-act="zMethod" data-arg="max" aria-pressed="${p.zoneMethod === 'max'}">% de FC máxima</button></div>
  <p class="tiny muted">Karvonen usa tu FC en reposo y suele ajustar mejor las zonas a tu estado físico. Si no hay FC en reposo, se usa % de FC máxima.</p></div>
  ${Z.z ? `<div class="stack-s">${Z.z.map(z => `<div class="row between"><span class="small"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${ZCOL[z.z - 1]};margin-right:6px"></i>${ZNAME[z.z - 1]}</span><b class="num small">${z.lo}–${z.hi} lpm</b></div>`).join('')}</div>` : ''}
  <button class="btn primary" data-act="zSave">Guardar</button>
  <p class="tiny muted">${esc(REFS.karvonen1957)} · ${esc(REFS.edwards1993)}</p>`;
};
App.acts.zMethod = async el => { const p = curProfile(); await Store.put('profiles', {...p, zoneMethod: el.dataset.arg}); App.renderOverlay(); };
App.acts.zSave = async () => {
  const p = curProfile(); const mx = +$('#z_max').value || null, rs = +$('#z_rest').value || null;
  if (mx && (mx < 120 || mx > 230)) { toast('La FC máxima tiene que estar entre 120 y 230'); return; }
  if (rs && (rs < 30 || rs > 110)) { toast('La FC en reposo tiene que estar entre 30 y 110'); return; }
  await Store.put('profiles', {...p, hrMaxUser: mx, hrRestUser: rs}); App.closeSheet(); App.render(); toast('Zonas guardadas');
};

// ---------- completar con el reloj (lo usa salud.js) ----------
async function hcEnrichAct(a, H){
  if (!H || !a || !a.durSec) return false;
  const span = a.elapsedSec || a.durSec; // con pausas, el pulso se busca en todo el tiempo transcurrido
  const end = new Date(new Date(a.date).getTime() + span * 1000 + 60000).toISOString();
  const t0 = new Date(a.date).getTime() - 60000;
  const r = await H.readSamples({dataType: 'heartRate', startDate: new Date(t0).toISOString(), endDate: end, limit: 10000, ascending: true});
  const s = (r && r.samples || []).filter(x => x.value > 30 && x.value < 230).map(x => [Math.round((new Date(x.startDate).getTime() - new Date(a.date).getTime()) / 1000), Math.round(x.value)]).filter(x => x[0] >= 0 && x[0] <= span);
  if (s.length < 5) return false;
  const step = Math.max(1, Math.ceil(s.length / 300));
  const hrS = s.filter((_, i) => i % step === 0 || i === s.length - 1);
  const v = s.map(x => x[1]);
  const upd = {...a, hrS, hrSrc: 'hc', hr: a.hr || Math.round(v.reduce((x, y) => x + y, 0) / v.length), hrMax: a.hrMax || Math.max(...v)};
  if (a.sport === 'run' && !a.cad) {
    try { const st = await H.readSamples({dataType: 'steps', startDate: a.date, endDate: new Date(new Date(a.date).getTime() + span * 1000).toISOString(), limit: 2000, ascending: true}); const tot = (st.samples || []).reduce((t, x) => t + x.value, 0); const c = Math.round(tot / (a.durSec / 60)); if (c >= 100 && c <= 230) upd.cad = c; } catch(e){}
  }
  await Store.put('activities', upd);
  return true;
}
App.acts.hcEnrich = async el => {
  const a = Store.get('activities', el.dataset.arg);
  try { const ok = await hcEnrichAct(a, HC.plugin); toast(ok ? 'Pulso agregado' : 'El reloj no tiene pulso para ese horario'); } catch(e){ toast('No se pudo leer el reloj'); }
  App.renderOverlay(); flushCharts();
};
