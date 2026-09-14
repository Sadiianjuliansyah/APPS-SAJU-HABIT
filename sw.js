"use strict";

const CACHE_PREFIX = "saju-habit-private-cache";
const CACHE_VERSION = "v4";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const APP_SHELL = [
    "./",
    "./index.html",
   "./style.css",
"./storage.js",
"./security.js",
"./app.js",
    "./manifest.json",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter(
                            (cacheName) =>
                                cacheName.startsWith(CACHE_PREFIX) &&
                                cacheName !== CACHE_NAME
                        )
                        .map((cacheName) =>
                            caches.delete(cacheName)
                        )
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (
        request.method !== "GET" ||
        request.headers.has("range")
    ) {
        return;
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((networkResponse) => {
                if (
                    networkResponse &&
                    networkResponse.ok
                ) {
                    const responseCopy =
                        networkResponse.clone();

                    caches
                        .open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(
                                request,
                                responseCopy
                            );
                        });
                }

                return networkResponse;
            })
            .catch(async () => {
                const cachedResponse =
                    await caches.match(request);

                if (cachedResponse) {
                    return cachedResponse;
                }

                if (request.mode === "navigate") {
                    const cache =
                        await caches.open(CACHE_NAME);

                    return cache.match("./index.html");
                }

                return new Response(
                    "Konten tidak tersedia saat offline.",
                    {
                        status: 503,
                        headers: {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        }
                    }
                );
            })
    );
});