/* Pulse service worker (hand-written, no dependencies).
 *
 * Goals: open instantly, replay offline, never serve stale AI.
 *  - shell pages  : network-first (3.5s budget) -> cache -> offline page
 *  - /_next/static, /icons : cache-first (fingerprinted / immutable)
 *  - /matches/*.json : stale-while-revalidate (pre-cached at install)
 *  - /api/*       : NEVER cached (the app falls back to deterministic templates by itself)
 * Bump VERSION to invalidate every cache.
 */
const VERSION = 'v1';
const SHELL = `pulse-shell-${VERSION}`;
const STATIC = `pulse-static-${VERSION}`;
const DATA = `pulse-data-${VERSION}`;
const KEEP = [SHELL, STATIC, DATA];

const PRECACHE_SHELL = ['/', '/match', '/offline.html', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];
const PRECACHE_DATA = ['/matches/1254111.json'];
const NAV_TIMEOUT_MS = 3500;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const put = async (cacheName, urls) => {
        const cache = await caches.open(cacheName);
        // one failure (e.g. a redirect) must not abort the whole install
        await Promise.allSettled(
          urls.map(async (u) => {
            const res = await fetch(u, { cache: 'reload' });
            if (res.ok && !res.redirected) await cache.put(u, res);
          })
        );
      };
      await Promise.all([put(SHELL, PRECACHE_SHELL), put(DATA, PRECACHE_DATA)]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('pulse-') && !KEEP.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function navigate(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if (res.ok && !res.redirected) cache.put(request.url.split('#')[0], res.clone()).catch(() => {});
    return res;
  } catch (_) {
    const url = new URL(request.url);
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (url.pathname.startsWith('/match') ? await cache.match('/match') : null) ||
      (await cache.match('/')) ||
      (await cache.match('/offline.html')) ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);
  if (hit) {
    refresh.catch(() => {}); // update in the background
    return hit;
  }
  return (await refresh) || new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never touch the API, Next.js RSC payloads or this file itself.
  if (url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  if (req.headers.get('RSC') || url.searchParams.has('_rsc')) return;

  if (req.mode === 'navigate') {
    event.respondWith(navigate(req));
    return;
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(req, STATIC));
    return;
  }
  if (url.pathname.startsWith('/matches/')) {
    event.respondWith(staleWhileRevalidate(req, DATA));
    return;
  }
});

// Pulse Ping: tapping a local notification focuses Pulse (or opens it).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/match';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })()
  );
});
