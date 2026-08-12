/* 企业办公物资管理系统 - Service Worker
 * 策略：HTML 走 network-first（保证更新即时可见）；JS/CSS/字体等静态资源走 stale-while-revalidate（二次打开秒回缓存，后台静默刷新）。
 * 修改站点后如需强制清空旧缓存，把下方 CACHE 版本号 +1 即可（如 wms-v1 -> wms-v2）。
 */
const CACHE = 'wms-v1';
const CORE = [
  './index.html',
  './chart.umd.min.js',
  './xlsx.bundle.js'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 只缓存同源资源（字体已本地化，不再跨域）

  // HTML 导航：network-first，失败回退缓存（保证更新可见 + 离线可用）
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
      })
    );
    return;
  }

  // 静态资源：stale-while-revalidate（先返回缓存，同时后台更新）
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
