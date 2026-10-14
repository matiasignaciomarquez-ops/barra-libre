// Caché para que la app funcione sin conexión. Cambia VERSION en cada actualización.
const VERSION = 'bl-2026-10-14e';
const FILES = ["./", "index.html", "manifest.webmanifest", "import.js", "web-config.js", "core.js", "strength.js", "workout.js", "chart.umd.js", "yoga.js", "tips.js", "jszip.min.js", "progress.js", "exercises.js", "cardio.js", "home.js", "main.js", "logic.js", "yoga_ui.js", "cloud.js", "clases.js", "rutinas.js", "yoga3d.js", "yoga_poses.js", "yoga_data.js", "yoga_ui2.js", "cardio_plus.js", "fit.js", "mapas.js", "grabar.js", "leaflet.js", "leaflet.css", "salud.js", "cuerpo.js", "bienestar.js", "carga.js", "puntajes.js", "ruta.js", "logros.js", "extras.js", "privacidad.html", "firebase-firestore-compat.js", "firestore.rules.txt", "firebase-app-compat.js", "firebase-auth-compat.js", "config.js", "images.js", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    if (!/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return; // Firebase y el resto van directo a internet
    // Fuentes de Google: caché a medida que se usan
    e.respondWith(caches.open(VERSION + '-ext').then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }).catch(() => r))));
    return;
  }
  e.respondWith(caches.match(e.request, {ignoreSearch:true}).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(VERSION).then(c => c.put(e.request, cp)); return res; })));
});
