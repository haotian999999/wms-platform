/* 企业办公物资管理系统 - Service Worker（v4）
 * 修复：不同电脑/多次刷新后出现「架构不同步、表格滚动条表现不一致」——根因是
 * 旧版对 index.html 也用了 stale-while-revalidate，导致页面总是先返回“上次缓存的旧 HTML”，
 * 后台才静默刷新，换电脑/换时间加载到的版本各不相同。
 *
 * 关键设计（v4 变更）：
 * 1) 导航请求（HTML 页面：./ 与 ./index.html）改为 network-first：
 *    每次加载都优先向网络请求最新 HTML，仅当离线时才回退到缓存。
 *    → 部署新版本后，任何电脑“刷新一次”即可拿到最新页面，跨设备表现一致。
 * 2) 静态资源（JS/CSS/字体/图片）保持 stale-while-revalidate：二次打开秒开、离线可用。
 * 3) 注册 URL 带版本号（index.html 里 register('./sw.js?v=4')），让浏览器强制重新拉取本脚本，
 *    已被旧缓存卡住的用户也能拿到本文件并自我更新。部署时同步把 ?v=N 递增。
 * 4) CACHE 版本号 wms-v3 -> wms-v4：activate 时会删除旧缓存，清掉其中可能滞留的旧 HTML。
 * 5) sw.js 自身仍走 network-first，保证后续部署能可靠检测更新。
 *
 * 后续部署如需强制清旧缓存：把下方 CACHE 版本号 +1（wms-v4 -> wms-v5），
 * 并在 index.html 的 register 里同步把 ?v=4 改成 ?v=5。
 */
const CACHE = 'wms-v4';
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

// 是否为“导航请求”（即 HTML 页面本身）：用于区分配 network-first 还是 SWR
function isNavigation(req, url) {
  if (req.mode === 'navigate') return true;
  var p = url.pathname;
  // 仓库根路径（/wms-platform/）或显式 index.html
  if (p === '/' || p.endsWith('/') || p.indexOf('index.html') !== -1) return true;
  return false;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 只处理同源资源（GitHub API 等跨域请求不受影响）

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

  // 导航请求（HTML 页面）：network-first —— 始终优先最新，离线才用缓存
  // 这是修复“跨设备架构不同步”的核心：部署后任何电脑刷新一次即见最新页面
  if (isNavigation(req, url)) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }
        return res;
      }).catch(function () {
        // 离线兜底：优先当前请求缓存，再回退到预缓存的 index.html / 根路径
        return caches.match(req).then(function (hit) {
          return hit || caches.match('./index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  // 其余静态资源：stale-while-revalidate（先秒回本地缓存，后台静默刷新）
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
