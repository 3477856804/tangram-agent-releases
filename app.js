/* 檀阁瑞木 TANGRAM 官网交互脚本
   只负责三件事：深浅主题、移动导航、读取真实构建信息。
   不读取也不展示任何应用源码、版本号或构建细节。 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* ---- 主题切换 ---- */
  var root = document.documentElement;
  var themeBtn = $('themeToggle');
  function syncThemeBtn() {
    if (!themeBtn) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    themeBtn.setAttribute('aria-pressed', String(dark));
    themeBtn.setAttribute('aria-label', dark ? '切换到浅色' : '切换到深色');
  }
  syncThemeBtn();
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('tga-theme', next); } catch (e) {}
      syncThemeBtn();
    });
  }

  /* ---- 移动导航 ---- */
  var menuBtn = $('menuBtn');
  var nav = $('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- 读取真实构建信息（仅文件大小与日期，不含版本号）----
     数据来自公开的产物仓库 Release API；失败时保持占位，不影响下载。 */
  function humanSize(bytes) {
    if (!bytes || bytes <= 0) return '—';
    var mb = bytes / 1048576;
    return mb >= 100 ? Math.round(mb) + ' MB' : mb.toFixed(1) + ' MB';
  }
  function dateOnly(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }

  var metaEl = $('buildMeta');
  var dateEl = $('buildDateInline');
  var API = 'https://api.github.com/repos/3477856804/tangram-agent-releases/releases/latest';

  function fail() {
    if (metaEl) metaEl.textContent = '链接始终指向最新构建，App 内会自动检查更新。';
    if (dateEl) dateEl.textContent = '最近一次构建';
  }

  try {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 7000) : null;
    var opts = { headers: { 'Accept': 'application/vnd.github+json' } };
    if (ctrl) opts.signal = ctrl.signal;

    fetch(API, opts)
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (data) {
        if (timer) clearTimeout(timer);
        var assets = {};
        (data.assets || []).forEach(function (a) { assets[a.name] = a.size; });

        // 填充各平台真实文件大小
        Array.prototype.forEach.call(document.querySelectorAll('.dl-row[data-asset]'), function (row) {
          var cell = row.querySelector('[data-size]');
          if (!cell) return;
          var size = assets[row.getAttribute('data-asset')];
          cell.textContent = size ? humanSize(size) : '—';
        });

        // 只显示构建日期，不暴露版本号
        var when = dateOnly(data.published_at || data.created_at);
        if (metaEl) {
          metaEl.textContent = when
            ? '最近一次构建 ' + when + ' · 共 ' + (data.assets ? data.assets.length : 5) + ' 个安装包 · 由自动构建产出'
            : '链接始终指向最新构建，App 内会自动检查更新。';
        }
        if (dateEl && when) dateEl.textContent = when;
      })
      .catch(function () { if (timer) clearTimeout(timer); fail(); });
  } catch (e) {
    fail();
  }
})();
