// /// <reference types="@sveltejs/kit" />
// import { build, files, version } from "$service-worker";

// const CACHE = `cache-${version}`;
// const DEBUG = false;
// const EXCLUDED = ["ffmpeg-core.js", "ffmpeg-core.wasm", "cube-texture.jpg", "cube-texture1.jpg"];
// const ASSETS = [...build, ...files].filter(name => !EXCLUDED.some(e => name.endsWith(e)));

// self.addEventListener("install", event => {
//   async function addFilesToCache() {
//     const cache = await caches.open(CACHE);
//     await cache.addAll(ASSETS);
//   }

//   DEBUG && console.log("installing service worker for version", version);
//   DEBUG && console.log("ASSETS: ", ASSETS);
//   event.waitUntil(addFilesToCache());
// });

// self.addEventListener("activate", event => {
//   async function deleteOldCaches() {
//     for (const key of await caches.keys()) {
//       if (key !== CACHE) await caches.delete(key);
//     }
//   }

//   event.waitUntil(deleteOldCaches());
// });

// self.addEventListener("fetch", event => {
//   if (event.request.method !== "GET") return;

//   DEBUG && console.log("FETCH: ", event);

//   async function respond() {
//     const url = new URL(event.request.url);
//     const cache = await caches.open(CACHE);

//     if (ASSETS.includes(url.pathname)) {
//       const response = await cache.match(url.pathname);

//       if (response) {
//         return response;
//       }
//     }

//     try {
//       const response = await fetch(event.request);

//       if (!(response instanceof Response)) {
//         throw new Error("invalid response from fetch");
//       }

//       if (response.status === 200) {
//         cache.put(event.request, response.clone());
//       }

//       return response;
//     } catch (err) {
//       const response = await cache.match(event.request);

//       if (response) {
//         DEBUG && console.log(`Returning from Cache`, event.request.url);
//         return response;
//       }

//       throw err;
//     }
//   }

//   event.respondWith(respond());
// });
