/* 企业办公物资管理系统 - Service Worker（v5）
 * v4 修复：跨设备架构不同步（HTML 改为 network-first）。
 * v5 修复（本次）：GitHub Pages / Fastly 偶发「HTTP 200 但 0 字节」空响应 → v4 在 res.status===200 时
 *   无条件缓存，把空页锁死成永久白屏（网络恢复后用户仍拿空页）。这是「部署后网页打不开」的根因。
 *
 * v5 关键变更：
 * 1) 新增 isUsable(res)：空响应（content-length=0 / body 为空 / 非 2xx）一律视为不可用，绝不缓存。
 * 2) 导航请求 network-first：网络拿到空/坏响应时不缓存、不返回空页，回退到「上一版正常缓存」的 index.html；
 *    仅当网络健康时才用最新页并刷新缓存 —— 空响应不再能污染缓存。
 * 3) 静态资源 SWR：网络返回空响应时不覆盖本地缓存（保留上次正常副本），杜绝空 JS/CSS 把页面打挂。
 * 4) sw.js 自身 network-first 同样加 isUsable 守卫。
 * 5) CACHE wms-v4 -> wms-v5：activate 删除旧缓存，已被空页卡住的用户升级 SW 后自动自愈。
 * 6) 注册 URL 升 ?v=5（见 index.html），强制旧浏览器重新拉取本脚本。
 */
const CACHE = 'wms-v5';
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

// 空/坏响应判定：GitHub Pages + Fastly 偶发「200 但 0 字节」，content-length 常显式标 0。
// 这类响应一旦被缓存就会永久白屏，必须整体拒绝。
function isUsable(res) {
  if (!res || !res.ok) return false;          // 非 2xx
  if (!res.body) return false;                // 无响应体
  var cl = res.headers.get('content-length');
  if (cl !== null && cl !== '' && parseInt(cl, 10) === 0) return false; // 明确 0 字节
  return true;
}
// 离线/无缓存时的最小兜底页（极少用到，仅首访即遇空响应的极端情况）
function offlineFallback() {
  return new Response('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
    '<title>物资管理系统</title><style>body{font-family:sans-serif;background:#0f2147;color:#fff;' +
    'display:flex;align-items:center;justify-content:center;height:100vh;margin:0}' +
    '.b{padding:32px 40px;border-radius:16px;background:rgba(255,255,255,.08);text-align:center}' +
    '</style></head><body><div class="b"><h2>正在重新连接…</h2>' +
    '<p>网络暂时不稳定，请刷新一次页面。</p></div></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
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

function isNavigation(req, url) {
  if (req.mode === 'navigate') return true;
  var p = url.pathname;
  if (p === '/' || p.endsWith('/') || p.indexOf('index.html') !== -1) return true;
  return false;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // sw.js 自身：network-first（带空响应守卫）
  if (url.pathname.indexOf('sw.js') !== -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (isUsable(res)) {
          caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // 导航请求（HTML）：network-first，但空/坏响应绝不缓存、回退到上一版正常缓存
  if (isNavigation(req, url)) {
    e.respondWith(
      fetch(req).then(async function (res) {
        if (isUsable(res)) {
          caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
          return res;
        }
        // 空/坏响应：保留旧缓存（不覆盖），优先返回此前正常的页面
        var hit = await caches.match(req) || await caches.match('./index.html') || await caches.match('./');
        return hit || res;
      }).catch(async function () {
        return (await caches.match(req)) || (await caches.match('./index.html')) ||
               (await caches.match('./')) || offlineFallback();
      })
    );
    return;
  }

  // 其余静态资源：SWR，但网络返回空响应时不覆盖本地缓存
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (isUsable(res)) {
          caches.open(CACHE).then(function (c) { c.put(req, res.clone()); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
