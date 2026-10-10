// Arranque
'use strict';
(async function boot(){
  App.render();
  await Store.init();
  if (STANDALONE) { try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch(e){} }
  App.render();
  if (S.pid && ls.get('bl_active_' + S.pid, null) && S.tab === 'home') {/* banner en inicio ofrece continuar */}
})();
