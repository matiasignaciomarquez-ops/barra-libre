// Extras: notificaciones activables por tipo (app de Android), enviar peso y grasa a Health Connect,
// "Actualizar la app de Android" desde el menú, y cambio de ejercicios colgados en el plan de principiantes.
'use strict';
const NOTIF_DEF = {entreno: {on: false, days: [1, 3, 5], h: '18:00'}, checkin: {on: false, h: '08:00'}, semana: {on: false}};
const notifCfg = p => ({...NOTIF_DEF, ...(p.notif || {}), entreno: {...NOTIF_DEF.entreno, ...((p.notif || {}).entreno || {})}, checkin: {...NOTIF_DEF.checkin, ...((p.notif || {}).checkin || {})}});
const WD = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
async function notifSchedule(){
  const LN = capPlugin('LocalNotifications'), p = curProfile(); if (!LN || !p) return;
  try {
    const pend = await LN.getPending(); const mine = (pend.notifications || []).filter(n => n.id >= 7000 && n.id < 7100);
    if (mine.length) await LN.cancel({notifications: mine.map(n => ({id: n.id}))});
    const c = notifCfg(p); const list = []; let id = 7000;
    const at = (d, hhmm) => { const [h, m] = hhmm.split(':').map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
    const plan = p.plan; let ni = plan ? nextPlanDay(p, plan) : null;
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      if (c.entreno.on && c.entreno.days.includes(d.getDay())) { const t = at(d, c.entreno.h); if (t > new Date()) { const day = plan && ni != null ? plan.days[ni % plan.days.length] : null; list.push({id: id++, title: 'Hoy toca entrenar', body: day ? `${day.name}: ${day.items.length} ejercicios. ¡Vamos!` : 'Abrí Barra Libre y arrancá tu entrenamiento.', schedule: {at: t, allowWhileIdle: true}}); if (ni != null) ni++; } }
      if (c.checkin.on) { const t = at(d, c.checkin.h); if (t > new Date()) list.push({id: id++, title: '¿Cómo estás hoy?', body: 'Mirá tu "Listo hoy" y contanos cómo te sentís.', schedule: {at: t, allowWhileIdle: true}}); }
      if (c.semana.on && d.getDay() === 0) { const t = at(d, '20:00'); if (t > new Date()) list.push({id: id++, title: 'Tu semana en Barra Libre', body: 'Mirá tu carga, tus minutos de actividad y el desafío de la semana.', schedule: {at: t, allowWhileIdle: true}}); }
    }
    if (list.length) await LN.schedule({notifications: list});
  } catch(e){ console.warn('notif', e); }
}
App.views.sh_notif = (p) => {
  const c = notifCfg(p); const LN = capPlugin('LocalNotifications');
  if (!LN) return '<h2>Notificaciones</h2><p class="small muted">Las notificaciones funcionan en la app de Android (Menú → App de Android).</p>';
  const tog = (k, l) => `<button class="opt" data-act="nfTog" data-arg="${k}" aria-pressed="${c[k].on}"><span class="tick"></span><span><b>${l}</b></span></button>`;
  return `<h2>Notificaciones</h2><p class="small muted">Elegí cuáles querés. Se pueden apagar cuando quieras.</p>
    ${tog('entreno', 'Recordatorio de entrenamiento')}
    ${c.entreno.on ? `<div class="chips">${WD.map((l, i) => `<button class="chip" data-act="nfDay" data-arg="${i}" aria-pressed="${c.entreno.days.includes(i)}">${l}</button>`).join('')}</div><div class="field"><label for="nf_h1">Hora</label><input id="nf_h1" type="time" value="${c.entreno.h}" data-change="nfHour" data-k="entreno"></div>` : ''}
    ${tog('checkin', 'Mañana: ¿cómo estás hoy? y Listo hoy')}
    ${c.checkin.on ? `<div class="field"><label for="nf_h2">Hora</label><input id="nf_h2" type="time" value="${c.checkin.h}" data-change="nfHour" data-k="checkin"></div>` : ''}
    ${tog('semana', 'Resumen semanal (domingo 20 h)')}
    <p class="tiny muted">Si no llegan: Ajustes del teléfono → Apps → Barra Libre → Notificaciones → permitir. En Xiaomi, además, Ahorro de batería → Sin restricciones.</p>`;
};
async function nfSave(c){ const p = curProfile(); await Store.put('profiles', {...p, notif: c}); const LN = capPlugin('LocalNotifications'); if (LN) { try { const s = await LN.checkPermissions(); if (s.display !== 'granted') await LN.requestPermissions(); } catch(e){} } await notifSchedule(); App.renderOverlay(); }
App.acts.nfTog = el => { const c = notifCfg(curProfile()); c[el.dataset.arg].on = !c[el.dataset.arg].on; nfSave(c); };
App.acts.nfDay = el => { const c = notifCfg(curProfile()); const d = +el.dataset.arg; c.entreno.days = c.entreno.days.includes(d) ? c.entreno.days.filter(x => x !== d) : [...c.entreno.days, d]; nfSave(c); };
App.binds.nfHour = el => { const c = notifCfg(curProfile()); if (/^\d\d:\d\d$/.test(el.value)) { c[el.dataset.k].h = el.value; nfSave(c); } };
// reprogramar al abrir la app (los textos usan tu próximo día del plan)
if (capPlugin('LocalNotifications')) { const _b = setInterval(() => { if (Store.mode !== 'loading' && curProfile()) { clearInterval(_b); notifSchedule(); } }, 1500); setTimeout(() => clearInterval(_b), 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden && curProfile()) notifSchedule(); }); }

// ---------- enviar peso, grasa y altura a Health Connect ----------
const hcWriteOn = () => ls.get('bl_hc_write', false);
async function hcWriteBody(entry, p){
  if (!hcWriteOn() || typeof HC === 'undefined' || !HC.plugin) return;
  const at = new Date(entry.date + 'T08:00:00').toISOString(), H = HC.plugin;
  try { if (entry.kg) await H.saveSample({dataType: 'weight', value: entry.kg, startDate: at, endDate: at}); if (entry.fat != null) await H.saveSample({dataType: 'bodyFat', value: entry.fat, startDate: at, endDate: at}); if (p && p.height) await H.saveSample({dataType: 'height', value: p.height / 100, startDate: at, endDate: at}); } catch(e){ console.warn('hc write', e); }
}
App.acts.hcWriteTog = async () => {
  if (hcWriteOn()) { ls.set('bl_hc_write', false); App.renderOverlay(); return; }
  try { const st = await HC.plugin.requestAuthorization({read: HC.READ, write: ['weight', 'bodyFat', 'height'], requestHistoryAccess: true}); if ((st.writeAuthorized || []).length) { ls.set('bl_hc_write', true); toast('Listo: tus mediciones se envían a Health Connect'); } else toast('No diste permiso de escritura'); } catch(e){ toast('No se pudo pedir el permiso'); }
  App.renderOverlay();
};
if (App.views.sh_bodyAdd) {
  const _ba = App.views.sh_bodyAdd;
  App.views.sh_bodyAdd = (p, sh) => { const html = _ba(p, sh); if (typeof HC === 'undefined' || !HC.plugin || !HC.on) return html; const b = `<button class="opt" data-act="hcWriteTog" aria-pressed="${hcWriteOn()}"><span class="tick"></span><span><b>Enviar también a Health Connect</b><span class="small muted">Peso, grasa y altura (los ven Mi Fitness, Google y otras apps)</span></span></button>`; const mark = '<button class="btn primary" data-act="bodySave">'; return html.includes(mark) ? html.replace(mark, b + mark) : html; };
  const _bs = App.acts.bodySave; App.acts.bodySave = async () => { const p = curProfile(), d = S.sheet && S.sheet.f && S.sheet.f.date; await _bs(); if (d) await hcWriteBody(Store.get('body', p.id + '_' + d) || {date: d}, curProfile()); };
  const _bw = App.acts.addBW; App.acts.addBW = async () => { await _bw(); const p = curProfile(); const e = Store.get('body', p.id + '_' + todayISO()); if (e) await hcWriteBody({date: e.date, kg: e.kg}, null); };
}

// ---------- actualizar la app de Android ----------
const APK_API = 'https://api.github.com/repos/matiasignaciomarquez-ops/barra-libre/releases/latest';
App.views.sh_apkUpd = (p, sh) => {
  if (!sh.loaded) { sh.loaded = true; fetch(APK_API).then(r => r.json()).then(j => { S.sheet.rel = j; App.renderOverlay(); }).catch(() => { S.sheet.err = true; App.renderOverlay(); }); }
  const r = sh.rel, mine = ls.get('bl_apk_tag', null);
  const old = !capPlugin('BackgroundGeolocation');
  return `<h2>Actualizar la app de Android</h2>
    <p class="small muted">Casi todas las novedades llegan solas, sin reinstalar. Solo hace falta bajar la app de nuevo cuando cambia algo del teléfono (GPS, permisos, notificaciones).</p>
    ${sh.err ? '<p class="small">No pude consultar la última versión (¿sin conexión?).</p>' : !r ? '<p class="small muted">Buscando la última versión…</p>'
      : `<div class="card flat stack-s"><b>${esc(r.name || r.tag_name)}</b><span class="small muted">Publicada el ${fmtDate(r.published_at, {day: 'numeric', month: 'long', year: 'numeric'})}</span>
        ${old ? '<span class="pill warn">Tu app es una versión anterior: actualizala</span>' : mine === r.tag_name ? '<span class="pill ok">Ya tenés esta versión</span>' : ''}</div>`}
    <button class="btn primary" data-act="apkGet">Descargar la última versión</button>
    <p class="tiny muted">Se abre el navegador y baja barra-libre.apk. Abrilo e instalalo encima (no desinstales): tus datos y permisos quedan.</p>`;
};
App.acts.apkGet = () => { const r = S.sheet && S.sheet.rel; if (r && r.tag_name) ls.set('bl_apk_tag', r.tag_name); location.href = 'https://github.com/matiasignaciomarquez-ops/barra-libre/releases/latest/download/barra-libre.apk'; };
// menú: notificaciones y actualizar (solo dentro de la app de Android)
if (App.views.sh_menu && typeof HC !== 'undefined' && HC.plugin) {
  const _mn = App.views.sh_menu;
  App.views.sh_menu = (p, sh) => _mn(p, sh).replace('<div class="it" data-act="sheet" data-arg="settings">', `<div class="it" data-act="sheet" data-arg="notif"><div class="grow"><b>Notificaciones</b><div class="small muted">Entrenamiento, ¿cómo estás hoy?, resumen semanal</div></div></div><div class="it" data-act="sheet" data-arg="apkUpd"><div class="grow"><b>Actualizar la app de Android</b><div class="small muted">Ver si hay una versión nueva</div></div></div><div class="it" data-act="sheet" data-arg="settings">`);
}

// ---------- plan de principiantes: cambiar ejercicios colgados por plancha ----------
const _liftHang = App.views.lift;
App.views.lift = (p) => {
  const html = _liftHang(p); const plan = p.plan;
  if (!plan || plan.level !== 'beg' || ls.get('bl_hang_ok_' + p.id, false)) return html;
  const has = (plan.days || []).some(d => d.items.some(it => /^Hanging_/.test(it.ex)));
  if (!has) return html;
  const b = `<div class="banner small"><div class="grow"><b>Sugerencia para tu plan</b><div>La elevación de piernas colgado exige mucho agarre y control. Para empezar, la plancha trabaja el abdomen con menos riesgo.</div></div><div class="stack-s"><button class="btn sm primary" data-act="hangSwap">Cambiar</button><button class="btn sm ghost" data-act="hangKeep">Dejar</button></div></div>`;
  return html.replace('<div class="stack">', '<div class="stack">' + b);
};
App.acts.hangSwap = async () => { const p = curProfile(); const plan = JSON.parse(JSON.stringify(p.plan)); plan.days.forEach(d => d.items.forEach(it => { if (/^Hanging_/.test(it.ex)) { const used = d.items.map(x => x.ex); it.ex = !used.includes('Plank') ? 'Plank' : 'Dead_Bug'; if (EX[it.ex] && EX[it.ex].u === 'sec') { it.lo = 20; it.hi = 60; } } })); await Store.put('profiles', {...p, plan}); ls.set('bl_hang_ok_' + p.id, true); App.render(); toast('Plan actualizado: plancha en lugar de elevación colgado'); };
App.acts.hangKeep = () => { ls.set('bl_hang_ok_' + curProfile().id, true); App.render(); };

// versión visible al pie del menú (para saber si ya tenés la última)
if (App.views.sh_menu) { const _mv = App.views.sh_menu; App.views.sh_menu = (p, sh) => _mv(p, sh) + `<p class="tiny muted" style="text-align:center;margin-top:10px">Versión ${esc(window.APP_VERSION || '')}</p>`; }
