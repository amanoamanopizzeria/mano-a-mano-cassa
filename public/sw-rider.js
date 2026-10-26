// L'app dei rider installata sul telefono (PWA). Non tiene niente in memoria: le consegne e i conti
// devono essere sempre quelli veri del momento, quindi ogni richiesta va in rete. Serve solo a
// rendere l'app installabile, e a dire qualcosa invece della pagina bianca quando la rete manca.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font-family:system-ui;background:#f6efe3;padding:24px;text-align:center">' +
    '<h2>Niente rete</h2><p>Le consegne tornano appena il telefono si ricollega.</p>' +
    '<p><a href="/rider" style="color:#8a1538;font-weight:700">Riprova</a></p></body>',
    { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
