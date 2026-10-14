// Lector de archivos FIT (Garmin, Coros, Wahoo, Suunto y los que vienen en el ZIP de Strava).
// Devuelve lo mismo que parseTrack (GPX/TCX): deporte, resumen, recorrido con altura, tiempo y pulso.
'use strict';
const FIT_EPOCH = 631065600; // 31/12/1989 en segundos Unix
const FIT_SPORT = {1: 'run', 2: 'ride', 11: 'hike', 17: 'hike'};

function fitDecode(u8){
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const hdr = u8[0];
  if (hdr < 12 || String.fromCharCode(u8[8], u8[9], u8[10], u8[11]) !== '.FIT') throw new Error('fit');
  const end = Math.min(u8.length, hdr + dv.getUint32(4, true));
  const defs = {}; const records = []; const sessions = []; let lastTs = 0; let fileStart = null;
  let i = hdr;
  const read = (base, off, size, le) => {
    const t = base & 0x1f;
    if (size === 1) { const v = t === 1 ? dv.getInt8(off) : dv.getUint8(off); return (t === 1 ? v === 0x7f : v === 0xff) ? null : v; }
    if (size === 2) { const v = t === 3 ? dv.getInt16(off, le) : dv.getUint16(off, le); return (t === 3 ? v === 0x7fff : v === 0xffff) ? null : v; }
    if (size === 4) { if (t === 8) { const v = dv.getFloat32(off, le); return isFinite(v) ? v : null; } const v = t === 5 ? dv.getInt32(off, le) : dv.getUint32(off, le); return (t === 5 ? v === 0x7fffffff : v === 0xffffffff) ? null : v; }
    return null;
  };
  while (i < end) {
    const h = u8[i++];
    if (h & 0x80) { // encabezado comprimido con marca de tiempo
      const lt = (h >> 5) & 3, off = h & 0x1f; const d = defs[lt]; if (!d) throw new Error('fitdef');
      let ts = (lastTs & ~0x1f) + off; if (off < (lastTs & 0x1f)) ts += 0x20; lastTs = ts;
      const m = readMsg(d, i); m[253] = ts; i += d.size; take(d.gnum, m); continue;
    }
    const lt = h & 0x0f;
    if (h & 0x40) { // definición
      const le = u8[i + 1] === 0; const gnum = le ? dv.getUint16(i + 2, true) : dv.getUint16(i + 2, false); const n = u8[i + 4];
      let p = i + 5; const fields = []; let size = 0;
      for (let k = 0; k < n; k++) { fields.push([u8[p], u8[p + 1], u8[p + 2]]); size += u8[p + 1]; p += 3; }
      if (h & 0x20) { const nd = u8[p]; p++; for (let k = 0; k < nd; k++) { size += u8[p + 1]; p += 3; } }
      defs[lt] = {le, gnum, fields, size}; i = p; continue;
    }
    const d = defs[lt]; if (!d) throw new Error('fitdef');
    const m = readMsg(d, i); i += d.size; if (m[253] != null) lastTs = m[253]; take(d.gnum, m);
  }
  function readMsg(d, at){ const m = {}; let p = at; for (const [num, size, base] of d.fields) { m[num] = read(base, p, size, d.le); p += size; } return m; }
  function take(g, m){
    if (g === 20) records.push(m);
    else if (g === 18) sessions.push(m);
    else if (g === 0 && m[4] != null) fileStart = m[4];
  }
  return {records, sessions, fileStart};
}

function parseFit(u8, defSport){
  const {records, sessions, fileStart} = fitDecode(u8);
  const ses = sessions[0] || {};
  let sport = FIT_SPORT[ses[5]] || defSport || 'run';
  const SC = 180 / 2147483648;
  const pts = []; const hrs = [];
  for (const r of records) {
    const hr = r[3]; if (hr > 30 && hr < 230) hrs.push(hr);
    if (r[0] == null || r[1] == null || r[253] == null) continue;
    const altRaw = r[78] != null ? r[78] : r[2];
    pts.push({lat: r[0] * SC, lon: r[1] * SC, ele: altRaw != null ? altRaw / 5 - 500 : null, time: (r[253] + FIT_EPOCH) * 1000, hr: hr > 30 && hr < 230 ? hr : null});
  }
  const startTs = ses[2] != null ? ses[2] : records.length && records[0][253] != null ? records[0][253] : fileStart;
  const date = startTs != null ? new Date((startTs + FIT_EPOCH) * 1000).toISOString() : null;
  let res;
  if (pts.length > 1) {
    res = L.analyzeTrack(pts);
    res.track = fitTrack(pts);
  } else {
    res = {distKm: 0, durSec: 0, elev: null, splits: [], track: null, date};
  }
  // el resumen de la sesión manda (tiempo en movimiento y distancia del reloj)
  if (ses[9] != null) res.distKm = +(ses[9] / 100000).toFixed(2);
  if (ses[8] != null) res.durSec = Math.round(ses[8] / 1000); else if (ses[7] != null) res.durSec = Math.round(ses[7] / 1000);
  if (ses[22] != null) res.elev = ses[22];
  if (!res.date) res.date = date;
  if (!res.distKm && !res.durSec) throw new Error('empty');
  const hrAvg = ses[16] || (hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null);
  const hrMax = ses[17] || (hrs.length ? Math.max(...hrs) : null);
  const out = {sport, res, hrAvg, hrMax};
  if (ses[18] && sport === 'run') out.cad = ses[18] * 2; // FIT guarda zancadas por minuto
  return out;
}
// recorrido liviano: hasta 300 puntos [lat, lon, altura, segundos desde el inicio, pulso]
function fitTrack(pts){
  const t0 = pts.find(p => p.time) ? pts.find(p => p.time).time : null;
  const step = Math.max(1, Math.ceil(pts.length / 300));
  return pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(p => [+p.lat.toFixed(5), +p.lon.toFixed(5), p.ele != null ? Math.round(p.ele * 10) / 10 : null, t0 && p.time ? Math.round((p.time - t0) / 1000) : null, p.hr || null]);
}

// parseTrack acepta también {fit: bytes}
const _parseTrackFit = window.parseTrack;
window.parseTrack = function(text, defSport){
  if (text && typeof text === 'object' && text.fit) return parseFit(text.fit, defSport);
  return _parseTrackFit(text, defSport);
};

// importar un solo archivo .fit o .fit.gz desde Cardio
const _importTrackFit = App.binds.importTrack;
App.binds.importTrack = async el => {
  const files = el.files ? [...el.files] : [];
  if (files.length !== 1 || !/\.fit(\.gz)?$/i.test(files[0].name)) return _importTrackFit(el);
  const f = files[0];
  try {
    const u8 = /\.gz$/i.test(f.name) ? await gunzipBytes(f) : new Uint8Array(await f.arrayBuffer());
    const t = parseFit(u8, S.cardio);
    const loc = t.res.date ? toLocalStr(t.res.date) : todayISO() + 'T12:00:00';
    App.openSheet('act', {f: {id: null, sport: t.sport, date: loc.slice(0, 10), time: loc.slice(10, 19), type: t.sport === 'hike' ? 'trekking' : 'suave', distKm: t.res.distKm, dur: L.durStr(t.res.durSec), hr: t.hrAvg || '', rpe: '', elev: t.res.elev || '', notes: f.name, power: '', track: t.res.track, splits: t.res.splits}});
  } catch(e){ console.warn(e); toast('No pude leer el archivo FIT. Probá exportarlo de nuevo o como GPX.'); }
  el.value = '';
};
