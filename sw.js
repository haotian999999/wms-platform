/* 企业办公物资管理系统 - Service Worker（v2）
 * 策略：所有同源 GET 资源统一 stale-while-revalidate（先秒回本地缓存、后台静默刷新）。
 * 关键修复：HTML 不再走 network-first（之前每次刷新都等 github 慢响应），现在刷新/二次打开均从本地缓存秒开。
 * 修改站点后如需强制清空旧缓存，把下方 CACHE 版本号 +1 即可（如 wms-v2 -> wms-v3）。
 */
const CACHE = 'wms-v2';
const CORE = [
  './index.html',
  './chart.umd.min.js',
  './xlsx.bundle.js',
  './fonts/HarmonyOS_Sans_Light.ttf',
  './fonts/HarmonyOS_Sans_Regular.ttf',
  './fonts/HarmonyOS_Sans_Medium.ttf',
  './fonts/HarmonyOS_Sans_Bold.ttf'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 逐个缓存，避免单个资源失败导致整体安装失败
      return Promise.all(CORE.map(function (u) {
        return c.add(u).catch(function () {});
      }));
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
  if (url.origin !== self.location.origin) return; // 只缓存同源资源

  // 统一 stale-while-revalidate：先返回缓存（秒开），同时后台更新
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
