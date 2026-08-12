/* 企业办公物资管理系统 - Service Worker（v3）
 * 修复：用户长期停留在旧版（图表空白）index.html 的缓存问题。
 *
 * 关键设计：
 * 1) 注册时使用带版本号的脚本 URL（index.html 里 register('./sw.js?v=3')），
 *    浏览器会把它当作“新的 SW 脚本”强制重新网络拉取，从而绕开旧版 SW 的缓存、
 *    让已被卡住的用户也能拿到本文件并自我更新。
 * 2) sw.js 自身走 network-first：保证本文件后续每次部署都能可靠地让浏览器检测到更新。
 * 3) 安装时预缓存导航页 './'（即 /wms-platform/）与 ./index.html，
 *    使 SW 更新后首屏即返回最新版 HTML（既快又正确，不再停留在旧破损版）。
 * 4) 其余同源 GET（JS/CSS/字体/图片）统一 stale-while-revalidate：二次打开秒开、后台静默刷新。
 *
 * 后续部署如需强制清旧缓存：把下方 CACHE 版本号 +1（wms-v3 -> wms-v4），
 * 并在 index.html 的 register 里同步把 ?v=3 改成 ?v=4。
 */
const CACHE = 'wms-v3';
const CORE = [
  './',
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
  if (url.origin !== self.location.origin) return; // 只处理同源资源

  // sw.js 自身：network-first，保证 SW 能可靠自我更新（不被旧缓存挡住）
  if (url.pathname.indexOf('sw.js') !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // 其余资源：stale-while-revalidate（先秒回本地缓存，后台静默刷新）
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
