// Choose a cache name
const cacheName = "cache-v1";

// List the files to precache
const precacheResources = [
  //basicamente colocar todos os meu arquivos pra dar load antes e icar salvo, mesmo offiline

  "./assets/abertura-fundo.png",
  "./assets/audio/intro.mp3",
  "./assets/logo/128.png",
  "./assets/ui/botao-play.png",
  "./assets/mapa/mapa1.json",
  "./main.css",
  "./index.html",
  "./js/index.js",
];

self.addEventListener("install", (event) => {
  console.log("Service worker install event!");
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(precacheResources))
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service worker activate event!");
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});
