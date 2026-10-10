// Versión web: sincronización gratuita con Firebase (Firestore + inicio de sesión).
// Solo se activa si config.js define window.FIREBASE_CONFIG.
'use strict';
(function(){
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !window.firebase || ls.get('bl_nocloud', false)) return;
  let app, auth, fdb;
  try {
    app = firebase.initializeApp(cfg); auth = firebase.auth(); fdb = firebase.firestore();
    fdb.enablePersistence({synchronizeTabs: true}).catch(() => {});
  } catch(e){ console.warn('firebase', e); return; }

  const userCol = (uid, c) => fdb.collection('users').doc(uid).collection(c);
  const enc = o => ({j: JSON.stringify(o), pid: o.pid || null, t: Date.now()});
  const dec = d => { try { return JSON.parse(d.data().j); } catch(e){ return null; } };
  let unsubs = [];

  Store.init = async function(){
    this.mode = 'loading';
    const user = await new Promise(res => { const u = auth.onAuthStateChanged(x => { u(); res(x); }); });
    auth.onAuthStateChanged(x => { const a = x ? x.uid : null, b = Store.user ? Store.user.uid : null; if (a !== b) location.reload(); });
    if (!user) { this.mode = 'login'; return; }
    this.user = user; this.uid = user.uid; this.mode = 'cloud';
    let firstLoads = 0;
    await new Promise(resolve => {
      const done = () => { if (++firstLoads === COLS.length) resolve(); };
      COLS.forEach(c => {
        let first = true;
        unsubs.push(userCol(user.uid, c).onSnapshot(snap => {
          const m = {}; snap.docs.forEach(d => { const o = dec(d); if (o && o.id) m[o.id] = o; });
          Store.data[c] = m; Store.pending = snap.metadata.hasPendingWrites;
          if (first) { first = false; done(); } else App.refresh();
        }, err => { console.warn(c, err); if (first) { first = false; done(); } toast('No se pudo leer la nube: ' + (err.code || err.message)); }));
      });
      setTimeout(resolve, 6000);
    });
  };
  // Escribe en la caché del teléfono al instante y sincroniza cuando hay señal.
  Store.put = async function(col, obj){
    this.data[col] = {...this.data[col], [obj.id]: obj};
    if (this.mode !== 'cloud') { this.saveLocal(); return true; }
    try {
      const clean = JSON.parse(JSON.stringify(obj));
      userCol(this.uid, col).doc(obj.id).set(enc(clean)).catch(e => this.fail(e));
      return true;
    } catch(e){ this.fail(e); return false; }
  };
  Store.del = async function(col, id){
    const m = {...this.data[col]}; delete m[id]; this.data[col] = m;
    if (this.mode !== 'cloud') { this.saveLocal(); return true; }
    userCol(this.uid, col).doc(id).delete().catch(e => this.fail(e));
    return true;
  };
  Store.fail = function(e){
    console.warn(e);
    if (e && e.code === 'permission-denied') toast('La base de datos rechazó el guardado. Revisá las reglas de Firestore (paso 5 del LEEME).');
    else if (e && e.code === 'resource-exhausted') toast('Se alcanzó el límite gratuito diario de Firebase. Mañana se normaliza.');
    else toast('No se pudo guardar en la nube.');
  };

  // ---------- ingreso ----------
  App.views.login = () => {
    const f = S.lg || (S.lg = {mode: 'in', email: '', pass: ''});
    return `<div class="wrap"><div class="top"><div class="brand"><span class="plate" aria-hidden="true"></span>Barra Libre</div></div>
    <div class="stack" style="margin-top:12px">
      <div class="hero"><h2>Entrá a tu cuenta</h2><p class="muted">Tus entrenamientos se guardan en la nube y los ves igual en el celu y en la PC. Si no hay señal en el gimnasio, se guardan en el teléfono y se suben solos después.</p>
        <button class="btn primary" data-act="lgGoogle">Entrar con Google</button></div>
      <div class="card stack">
        <div class="seg"><button data-act="lgMode" data-arg="in" aria-pressed="${f.mode==='in'}">Tengo cuenta</button><button data-act="lgMode" data-arg="up" aria-pressed="${f.mode==='up'}">Crear cuenta</button></div>
        <div class="field"><label for="lg_e">Email</label><input id="lg_e" type="text" inputmode="email" autocomplete="email" value="${esc(f.email)}" data-bind="lg" data-k="email"></div>
        <div class="field"><label for="lg_p">Contraseña${f.mode==='up'?' (mínimo 6 caracteres)':''}</label><input id="lg_p" type="password" autocomplete="${f.mode==='up'?'new-password':'current-password'}" data-bind="lg" data-k="pass"></div>
        <button class="btn dark" data-act="lgEmail">${f.mode==='up' ? 'Crear cuenta' : 'Entrar'}</button>
        ${f.mode==='in' ? '<button class="btn ghost sm" data-act="lgReset">Olvidé mi contraseña</button>' : ''}
      </div>
      <button class="btn ghost" data-act="lgLocal">Usar sin cuenta (solo en este teléfono)</button>
    </div></div>`;
  };
  App.binds.lg = el => { S.lg[el.dataset.k] = el.value; };
  App.acts.lgMode = el => { S.lg.mode = el.dataset.arg; App.render(); };
  const authErr = e => ({'auth/invalid-email':'El email no es válido.','auth/missing-password':'Escribí la contraseña.','auth/weak-password':'La contraseña tiene que tener al menos 6 caracteres.','auth/email-already-in-use':'Ese email ya tiene cuenta: tocá "Tengo cuenta".','auth/invalid-credential':'Email o contraseña incorrectos.','auth/wrong-password':'Contraseña incorrecta.','auth/user-not-found':'No hay cuenta con ese email.','auth/too-many-requests':'Demasiados intentos. Esperá unos minutos.','auth/unauthorized-domain':'Falta autorizar este sitio en Firebase (paso 6 del LEEME).','auth/operation-not-allowed':'Este método de ingreso no está activado en Firebase (paso 3 del LEEME).','auth/network-request-failed':'Sin conexión. Probá de nuevo con señal.'})[e && e.code] || ('No se pudo entrar: ' + ((e && (e.code || e.message)) || 'error'));
  App.acts.lgGoogle = async () => {
    const prov = new firebase.auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(prov); }
    catch(e){
      if (e && /popup-blocked|operation-not-supported|cancelled-popup/.test(e.code || '')) { try { await auth.signInWithRedirect(prov); return; } catch(e2){ toast(authErr(e2)); return; } }
      if (e && e.code === 'auth/popup-closed-by-user') return;
      toast(authErr(e));
    }
  };
  App.acts.lgEmail = async () => {
    const f = S.lg; const email = (f.email || '').trim();
    try { if (f.mode === 'up') await auth.createUserWithEmailAndPassword(email, f.pass); else await auth.signInWithEmailAndPassword(email, f.pass); }
    catch(e){ toast(authErr(e)); }
  };
  App.acts.lgReset = async () => { const email = (S.lg.email || '').trim(); if (!email) { toast('Escribí tu email arriba primero'); return; } try { await auth.sendPasswordResetEmail(email); toast('Te mandamos un email para cambiar la contraseña'); } catch(e){ toast(authErr(e)); } };
  App.acts.lgLocal = () => { ls.set('bl_nocloud', true); location.reload(); };
  App.acts.logout = async () => { unsubs.forEach(u => u()); await auth.signOut(); location.reload(); };

  // ---------- menú: cuenta y migración de datos locales ----------
  const baseMenu = App.views.sh_menu;
  App.views.sh_menu = (p, sh) => {
    const local = ls.get('bl_data', null);
    const localN = local ? Object.values(local.workouts || {}).length + Object.values(local.activities || {}).length : 0;
    return baseMenu(p, sh) + `<div class="card flat stack-s"><span class="label">Cuenta</span><p class="small">${esc((Store.user && (Store.user.email || Store.user.displayName)) || '')}</p>
      <p class="tiny muted">Tus datos se sincronizan entre todos los dispositivos donde entres con esta cuenta.</p>
      ${localN ? `<button class="btn sm" data-act="migrateLocal">Subir ${localN} registros guardados solo en este teléfono</button>` : ''}
      <button class="btn sm danger" data-act="logout">Cerrar sesión</button></div>`;
  };
  App.acts.migrateLocal = async () => {
    const local = ls.get('bl_data', null); if (!local) return; let n = 0;
    for (const c of COLS) for (const o of Object.values(local[c] || {})) { if (o && o.id && !Store.get(c, o.id)) { await Store.put(c, o); n++; } }
    ls.set('bl_data_migrated', local); ls.del('bl_data'); App.closeSheet(); App.render(); toast(`Subidos ${n} registros a tu cuenta`);
  };
})();

// En modo sin cuenta, ofrecer volver a la nube
(function(){
  if (!window.FIREBASE_CONFIG || !ls.get('bl_nocloud', false)) return;
  const baseMenu = App.views.sh_menu;
  App.views.sh_menu = (p, sh) => baseMenu(p, sh) + `<div class="card flat stack-s"><span class="label">Cuenta</span><p class="small muted">Estás usando la app sin cuenta: los datos quedan solo en este teléfono.</p><button class="btn sm primary" data-act="goCloud">Entrar y sincronizar</button></div>`;
  App.acts.goCloud = () => { ls.del('bl_nocloud'); location.reload(); };
})();
