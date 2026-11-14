/* =============================================================================
   檀阁瑞木 TANGRAM — 官网交互脚本
   -----------------------------------------------------------------------------
   模块：
     A. 工具与全局状态
     B. 主题切换
     C. 导航（移动端抽屉 / 滚动高亮 / 滚动进度）
     D. 滚动渐入与数字滚动
     E. 点击涟漪
     F. 工作台（聊天 / 训练 / 成长 / 设置）
     G. 角色选择
     H. 成就系统
     I. 语音波形
     J. 快捷操作栏 / 每日签到 / 音景播放器
     K. 命令面板
     L. 打字机
   ========================================================================== */
(function () {
  'use strict';

  /* =======================================================================
     A. 工具与全局状态
     ======================================================================= */
  var doc = document;
  var html = doc.documentElement;
  var win = window;

  var $ = function (id) { return doc.getElementById(id); };
  var reduceMQ = win.matchMedia('(prefers-reduced-motion: reduce)');
  var clamp = function (n, min, max) { return Math.max(min, Math.min(max, n)); };

  var nav = $('nav');
  var navToggle = $('navToggle');
  var navMenu = $('nav-menu');
  var themeBtn = $('themeToggle');
  var themeMeta = doc.querySelector('meta[name="theme-color"]');

  /* =======================================================================
     B. 主题切换
     ======================================================================= */
  function applyTheme(theme, fromUser) {
    var t = theme === 'light' ? 'light' : 'dark';
    html.setAttribute('data-theme', t);
    try { localStorage.setItem('xl-theme', t); } catch (e) {}
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#000000' : '#FFFFFF');
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', t === 'dark' ? '切换到浅色主题' : '切换到深色主题');
      themeBtn.setAttribute('aria-pressed', t === 'dark' ? 'false' : 'true');
    }
    if (fromUser) unlockAch('theme');
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
    applyTheme(html.getAttribute('data-theme') || 'dark', false);
  }

  /* =======================================================================
     C. 导航
     ======================================================================= */

  /* --- C1 移动端抽屉 --- */
  if (nav && navToggle && navMenu) {
    var isOpen = false;

    function setOpen(open) {
      isOpen = open;
      nav.setAttribute('data-open', open ? 'true' : 'false');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
      html.classList.toggle('is-menu-open', open);
    }

    navToggle.addEventListener('click', function () { setOpen(!isOpen); });

    navMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { setOpen(false); navToggle.focus(); }
    });

    win.addEventListener('resize', function () {
      if (win.innerWidth > 900 && isOpen) setOpen(false);
    });
  }

  /* --- C2 滚动高亮：顺序与导航栏、DOM 顺序一致 --- */
  var SECTION_ORDER = ['manifesto', 'features', 'skills-lib', 'studio', 'arch', 'plugins', 'models', 'achievements', 'download'];
  var hero = doc.querySelector('.hero');
  var seenSections = {};
  var linkMap = {};
  /* 判定线与 scroll-padding-top 对齐，即导航栏正下方 */
  var SPY_LINE = 88;

  function heroLimit() { return hero ? Math.max(0, hero.offsetHeight - 120) : 0; }

  function setActive(id) {
    for (var key in linkMap) {
      if (!Object.prototype.hasOwnProperty.call(linkMap, key)) continue;
      var list = linkMap[key];
      for (var m = 0; m < list.length; m++) {
        if (key === id) list[m].setAttribute('aria-current', 'true');
        else list[m].removeAttribute('aria-current');
      }
    }
    if (id && !seenSections[id]) {
      seenSections[id] = true;
      bumpAch('explore', 1);
    }
  }

  function updateActive() {
    if (win.pageYOffset < heroLimit()) { setActive(null); return; }
    var current = null;
    /* 容差 2px：避免亚像素高度导致边界判定抖动 */
    var line = win.pageYOffset + SPY_LINE + 2;
    for (var i = 0; i < SECTION_ORDER.length; i++) {
      var sec = doc.getElementById(SECTION_ORDER[i]);
      if (!sec) continue;
      var top = sec.getBoundingClientRect().top + win.pageYOffset;
      if (top <= line) current = SECTION_ORDER[i];
    }
    setActive(current);
  }

  if (navMenu) {
    var navAnchors = navMenu.querySelectorAll('a[href^="#"]');
    for (var li = 0; li < navAnchors.length; li++) {
      var id = navAnchors[li].getAttribute('href').slice(1);
      (linkMap[id] = linkMap[id] || []).push(navAnchors[li]);
    }
  }

  /* --- C3 滚动进度条 + 导航阴影 --- */
  var progressBar = $('scrollProgress');
  var ticking = false;

  function updateScrollUI() {
    if (progressBar) {
      var max = html.scrollHeight - win.innerHeight;
      var pct = max > 0 ? (win.pageYOffset / max) * 100 : 0;
      progressBar.style.width = clamp(pct, 0, 100) + '%';
    }
    if (nav) nav.classList.toggle('scrolled', win.pageYOffset > 40);
    updateActive();
    ticking = false;
  }

  win.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; win.requestAnimationFrame(updateScrollUI); }
  }, { passive: true });
  win.addEventListener('resize', updateScrollUI);
  updateScrollUI();

  /* =======================================================================
     D. 滚动渐入与数字滚动
     ======================================================================= */
  (function () {
    var reveals = doc.querySelectorAll('.reveal');
    if (!reveals.length) return;

    if (reduceMQ.matches || !('IntersectionObserver' in win)) {
      for (var r = 0; r < reveals.length; r++) reveals[r].classList.add('in');
      return;
    }

    var revealIO = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('in');
          revealIO.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

    for (var ri = 0; ri < reveals.length; ri++) revealIO.observe(reveals[ri]);
  })();

  (function () {
    var counters = doc.querySelectorAll('.num[data-count]');
    if (!counters.length || reduceMQ.matches || !('IntersectionObserver' in win)) {
      for (var c0 = 0; c0 < counters.length; c0++) {
        counters[c0].textContent = counters[c0].getAttribute('data-count');
      }
      return;
    }

    function countUp(el) {
      var raw = el.getAttribute('data-count');
      var m = /^(\d+)(\D*)$/.exec(raw || '');
      if (!m) return;
      var target = parseInt(m[1], 10);
      var suffix = m[2] || '';
      var t0 = null;
      var dur = 1100;

      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        p = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * p) + suffix;
        if (p < 1) win.requestAnimationFrame(step);
      }
      win.requestAnimationFrame(step);
    }

    var countIO = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          countUp(entries[i].target);
          countIO.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.5 });

    for (var c = 0; c < counters.length; c++) countIO.observe(counters[c]);
  })();

  /* =======================================================================
     E. 点击涟漪
     ======================================================================= */
  doc.addEventListener('pointerdown', function (e) {
    if (reduceMQ.matches) return;
    var host = e.target && e.target.closest ? e.target.closest('.ripple') : null;
    if (!host) return;

    var r = host.getBoundingClientRect();
    var d = Math.max(r.width, r.height) * 1.15;
    var fx = doc.createElement('span');
    fx.className = 'ripple-fx';
    fx.style.width = fx.style.height = d + 'px';
    fx.style.left = (e.clientX - r.left - d / 2) + 'px';
    fx.style.top = (e.clientY - r.top - d / 2) + 'px';
    host.appendChild(fx);
    win.setTimeout(function () { if (fx.parentNode) fx.parentNode.removeChild(fx); }, 650);
  }, { passive: true });

  /* =======================================================================
     F. 工作台
     ======================================================================= */
  var studioTabs = doc.querySelectorAll('.studio-tab');
  var studioPanels = doc.querySelectorAll('.panel');

  function switchTab(name) {
    for (var i = 0; i < studioTabs.length; i++) {
      studioTabs[i].setAttribute('aria-selected', studioTabs[i].getAttribute('data-tab') === name ? 'true' : 'false');
    }
    for (var j = 0; j < studioPanels.length; j++) {
      studioPanels[j].classList.toggle('on', studioPanels[j].id === 'panel-' + name);
    }
  }

  for (var st = 0; st < studioTabs.length; st++) {
    (function (tab) {
      tab.addEventListener('click', function () { switchTab(tab.getAttribute('data-tab')); });
    })(studioTabs[st]);
  }

  /* --- F1 陪伴计时 --- */
  var clockEl = $('statClock');
  if (clockEl) {
    var startTime = Date.now();
    function tickClock() {
      var elapsed = Math.floor((Date.now() - startTime) / 1000);
      var mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      var ss = String(elapsed % 60).padStart(2, '0');
      clockEl.textContent = mm + ':' + ss;
    }
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* --- F2 聊天演示 --- */
  var chatForm = $('chatForm');
  var chatInput = $('chatInput');
  var chatList = $('chatList');
  var hintBtns = doc.querySelectorAll('.hint');
  var chatBusy = false;
  var chatCount = 0;

  var REPLIES = [
    { keys: ['你好', '嗨', 'hi', 'hello', '在吗'], reply: '你好呀～我一直都在。今天过得怎么样？' },
    { keys: ['名字', '叫什么', '你是谁'], reply: '我叫檀阁瑞木，是你桌面上的数字生命。你可以随时给我改名字哦。' },
    { keys: ['成长', '长大', '变强'], reply: '每次和你对话，我都会把新的语气、词汇、偏好记下来。LoRA 训练会让我越来越像"你的"檀阁瑞木。' },
    { keys: ['模型', '什么模型', 'qwen'], reply: '我跑在本地 Qwen2.5 上，模型大小会跟着你的内存自动挑。所有推理都在你自己的电脑里完成。' },
    { keys: ['笑话', '讲个笑话', '搞笑'], reply: '为什么程序员分不清万圣节和圣诞节？因为 Oct 31 等于 Dec 25 呀～' },
    { keys: ['离线', '联网', '网络'], reply: '我默认是完全离线的。只有你主动打开"联网搜索"插件，我才会去外面看看。' },
    { keys: ['声音', '语音', 'tts'], reply: '我用 edge-tts 说话，9 个角色各自绑定了不同的声音，切换角色时声音也会跟着变。' },
    { keys: ['插件', '扩展'], reply: '万物皆插件。你想让我做什么，都可以写一个 Python 文件丢进插件目录里，重启就能用。' },
    { keys: ['主题', '颜色', '色调'], reply: '点右上角的圆形按钮可以切换深浅主题，整套配色会跟着换。' },
    { keys: ['成就', '徽章'], reply: '往下翻有个成就区，你多和我聊几句，或者跑一次训练，徽章就会一个个亮起来。' },
    { keys: ['命令', '快捷键', 'cmdk'], reply: '按 ⌘K 或 Ctrl+K 可以打开命令面板，所有功能都能从那里跳。' },
    { keys: ['技能', '脚本'], reply: '脚本目录里有 70 多个独立技能，生活、学习、创作都能管，而且完全不需要联网。' },
    { keys: ['谢谢', '感谢', 'thank'], reply: '不客气～能帮到你，我就很开心。' },
    { keys: ['再见', '拜拜', 'bye', '晚安'], reply: '好呀，那我先在这里等你。下次想聊天，随时叫我。' }
  ];

  var GENERIC = [
    '嗯，我记下了。再多说一点？',
    '这个我懂～你想让我从哪个角度展开讲？',
    '有意思。你是不是也在想同一个问题？',
    '我会记住这句话的。等 LoRA 训练下次跑完，我大概会更懂你。',
    '让我想想……嗯，我觉得你说得有道理。'
  ];

  function pickReply(text) {
    var t = text.toLowerCase().trim();
    for (var i = 0; i < REPLIES.length; i++) {
      var item = REPLIES[i];
      for (var k = 0; k < item.keys.length; k++) {
        if (t.indexOf(item.keys[k].toLowerCase()) > -1) return item.reply;
      }
    }
    return GENERIC[Math.floor(Math.random() * GENERIC.length)];
  }

  function addMsg(role, text) {
    var div = doc.createElement('div');
    div.className = 'chat-msg ' + role;
    if (role === 'ai') {
      div.innerHTML = '<span class="who">檀阁瑞木</span>';
      div.appendChild(doc.createTextNode(text));
    } else {
      div.textContent = text;
    }
    chatList.appendChild(div);
    chatList.scrollTop = chatList.scrollHeight;
    return div;
  }

  function addTyping() {
    var div = doc.createElement('div');
    div.className = 'chat-msg ai typing';
    div.innerHTML = '<i></i><i></i><i></i>';
    chatList.appendChild(div);
    chatList.scrollTop = chatList.scrollHeight;
    return div;
  }

  function sendChat(text) {
    text = (text || '').trim();
    if (!text || chatBusy || !chatList) return;
    chatBusy = true;
    addMsg('user', text);
    chatCount++;
    bumpAch('first', 1);
    if (chatCount >= 10) unlockAch('chat10');

    var typing = addTyping();
    var delay = reduceMQ.matches ? 100 : (500 + Math.random() * 500);
    win.setTimeout(function () {
      typing.remove();
      addMsg('ai', pickReply(text));
      chatBusy = false;
    }, delay);
  }

  if (chatForm && chatInput && chatList) {
    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = chatInput.value;
      chatInput.value = '';
      sendChat(v);
    });
  }
  for (var hi = 0; hi < hintBtns.length; hi++) {
    (function (hb) {
      hb.addEventListener('click', function () { sendChat(hb.getAttribute('data-q')); });
    })(hintBtns[hi]);
  }

  /* --- F3 LoRA 训练模拟 --- */
  var trainBtn = $('trainBtn');
  var trFill = $('trFill');
  var trPct = $('trPct');
  var trEpoch = $('trEpoch');
  var trLoss = $('trLoss');
  var trainLog = $('trainLog');
  var training = false;

  function logLine(txt, cls) {
    if (!trainLog) return;
    var div = doc.createElement('div');
    if (cls) div.className = cls;
    div.textContent = txt;
    trainLog.appendChild(div);
    trainLog.scrollTop = trainLog.scrollHeight;
  }

  function startTraining() {
    if (training) return;
    training = true;
    trainBtn.disabled = true;
    trainBtn.textContent = '训练中…';
    trainLog.innerHTML = '';

    logLine('[start] 初始化 LoRA 适配器 (r=4, alpha=8)', 'warn');
    logLine('[data] 加载数据集 · 128 样本', 'dim');
    logLine('[model] 冻结主干权重，注入低秩矩阵', 'dim');

    var total = 3 * 40;
    var step = 0;
    var loss = 2.85;

    var timer = setInterval(function () {
      step++;
      var pct = Math.min(100, step / total * 100);
      var epoch = Math.min(3, Math.ceil(step / 40));
      loss = Math.max(.42, loss - .06 + (Math.random() - .5) * .05);

      trFill.style.width = pct + '%';
      trPct.textContent = Math.round(pct) + '%';
      trEpoch.innerHTML = epoch + '<small>/3</small>';
      trLoss.textContent = loss.toFixed(3);

      if (step % 12 === 0) logLine('[step ' + step + '/' + total + '] loss=' + loss.toFixed(3) + ' lr=' + (2e-4).toExponential(1), 'dim');
      if (step % 40 === 0) logLine('[epoch ' + epoch + '] 保存适配器快照 → adapter_v' + epoch + '.bin', 'ok');

      if (step >= total) {
        clearInterval(timer);
        logLine('[done] 训练完成 · 适配器已合并', 'ok');
        logLine('[hint] 下次对话自动加载新适配器', 'warn');
        trainBtn.disabled = false;
        trainBtn.textContent = '再训一次';
        training = false;
        unlockAch('train');
        addXp(80);
      }
    }, 55);
  }

  if (trainBtn) trainBtn.addEventListener('click', startTraining);

  /* --- F4 成长系统 --- */
  var lvNum = $('lvNum');
  var lvTitle = $('lvTitle');
  var xpNow = $('xpNow');
  var xpMax = $('xpMax');
  var xpFill = $('xpFill');
  var feedBtn = $('feedBtn');
  var resetBtn = $('resetGrowth');
  var xpStatEl = $('statXp');
  var skillEls = doc.querySelectorAll('.skill');

  var TITLES = ['刚认识', '好奇宝宝', '聊得来的朋友', '默契伙伴', '知心好友', '灵魂伴侣', '不可替代'];
  var gState = { lv: 7, xp: 420, max: 600, skills: [72, 54, 38] };

  function renderGrowth() {
    if (!lvNum) return;
    lvNum.textContent = gState.lv;
    lvTitle.textContent = TITLES[Math.min(TITLES.length - 1, Math.floor((gState.lv - 1) / 2))] || '伙伴';
    xpNow.textContent = gState.xp;
    xpMax.textContent = gState.max;
    xpFill.style.width = Math.min(100, gState.xp / gState.max * 100) + '%';
    if (xpStatEl) xpStatEl.textContent = '+' + Math.min(999, Math.floor(gState.xp / 6));

    for (var i = 0; i < skillEls.length; i++) {
      var s = skillEls[i];
      var v = gState.skills[i] || 0;
      var lv = Math.max(1, Math.floor(v / 12) + 1);
      var bar = s.querySelector('.sfill');
      var lvEl = s.querySelector('.slv');
      if (bar) bar.style.width = v + '%';
      if (lvEl) lvEl.textContent = 'Lv. ' + lv;
    }
  }

  function addXp(amount) {
    gState.xp += amount;
    while (gState.xp >= gState.max) {
      gState.xp -= gState.max;
      gState.lv += 1;
      gState.max = Math.round(gState.max * 1.15);
    }
    var idx = Math.floor(Math.random() * 3);
    gState.skills[idx] = Math.min(100, gState.skills[idx] + Math.ceil(amount / 8));
    renderGrowth();

    if (gState.lv >= 10) unlockAch('lv10');

    if (skillEls[idx]) {
      skillEls[idx].classList.add('up');
      win.setTimeout(function () { skillEls[idx].classList.remove('up'); }, 700);
    }
    if (lvNum.animate) {
      lvNum.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
        { duration: 400, easing: 'cubic-bezier(.34,1.25,.58,1)' }
      );
    }
  }

  if (feedBtn) {
    feedBtn.addEventListener('click', function () {
      addXp(40);
      var orig = feedBtn.innerHTML;
      feedBtn.disabled = true;
      feedBtn.textContent = '已投喂 +40 XP';
      win.setTimeout(function () {
        feedBtn.disabled = false;
        feedBtn.innerHTML = orig;
      }, 900);
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      gState = { lv: 1, xp: 0, max: 200, skills: [12, 8, 5] };
      renderGrowth();
    });
  }
  renderGrowth();

  /* --- F5 设置开关 --- */
  var switches = doc.querySelectorAll('.switch');
  for (var sw = 0; sw < switches.length; sw++) {
    (function (s) {
      s.addEventListener('click', function () {
        s.setAttribute('aria-checked', s.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
      });
      s.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); s.click(); }
      });
    })(switches[sw]);
  }

  /* =======================================================================
     G. 角色选择
     ======================================================================= */
  var modelCards = doc.querySelectorAll('.model');

  /* 图片懒加载完成后再淡入，加载期间显示占位首字 */
  doc.querySelectorAll('.model-thumb img').forEach(function (img) {
    if (img.complete && img.naturalWidth > 0) { img.classList.add('is-ready'); return; }
    img.addEventListener('load', function () { img.classList.add('is-ready'); });
  });

  var mnAv = $('mnAv');
  var mnName = $('mnName');
  var mnDesc = $('mnDesc');
  var mnVoice = $('mnVoice');
  var defaultSel = $('defaultModel');
  var vVoice = $('vVoice');
  var vRate = $('vRate');
  var vPitch = $('vPitch');

  function shortVoice(voice) {
    return voice.replace(/^zh-CN-/, '').replace(/Neural$/, '');
  }

  function selectModel(card) {
    for (var i = 0; i < modelCards.length; i++) {
      var on = modelCards[i] === card;
      modelCards[i].classList.toggle('selected', on);
      modelCards[i].setAttribute('aria-checked', on ? 'true' : 'false');
    }

    var name = card.getAttribute('data-model');
    var desc = card.getAttribute('data-desc');
    var voice = card.getAttribute('data-voice') || '';
    var rate = card.getAttribute('data-rate') || '+0%';
    var pitch = card.getAttribute('data-pitch') || '+0Hz';

    mnAv.textContent = name.charAt(0);
    mnName.textContent = name;
    mnDesc.textContent = desc;
    mnVoice.textContent = shortVoice(voice) || 'edge-tts';

    if (vVoice) vVoice.textContent = shortVoice(voice);
    if (vRate) vRate.textContent = rate;
    if (vPitch) vPitch.textContent = pitch;

    mnAv.classList.add('bump');
    win.setTimeout(function () { mnAv.classList.remove('bump'); }, 420);

    if (defaultSel) {
      for (var o = 0; o < defaultSel.options.length; o++) {
        if (defaultSel.options[o].value === name) { defaultSel.selectedIndex = o; break; }
      }
    }
  }

  for (var mc = 0; mc < modelCards.length; mc++) {
    (function (card) {
      card.addEventListener('click', function () { selectModel(card); });
      card.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); selectModel(card); }
      });
    })(modelCards[mc]);
  }

  /* =======================================================================
     H. 成就系统
     ======================================================================= */
  var ACH = {};
  try {
    var savedAch = win.localStorage && win.localStorage.getItem('xl-ach');
    if (savedAch) ACH = JSON.parse(savedAch) || {};
  } catch (e) { ACH = {}; }

  function saveAch() {
    try { win.localStorage && win.localStorage.setItem('xl-ach', JSON.stringify(ACH)); } catch (e) {}
  }

  var achCards = doc.querySelectorAll('.ach');

  function renderAch() {
    for (var i = 0; i < achCards.length; i++) {
      var c = achCards[i];
      var id = c.getAttribute('data-ach');
      var need = parseInt(c.getAttribute('data-need'), 10) || 1;
      var cur = ACH[id] || 0;
      var fill = c.querySelector('.ach-prog i');
      if (fill) fill.style.width = Math.min(100, cur / need * 100) + '%';
      if (cur >= need && c.classList.contains('locked')) {
        c.classList.remove('locked');
        c.classList.add('unlocked', 'pop');
        (function (el) { win.setTimeout(function () { el.classList.remove('pop'); }, 700); })(c);
      }
    }
  }

  function unlockAch(id, inc) {
    if (ACH[id] === undefined) ACH[id] = 0;
    if (inc) ACH[id] += inc;
    else ACH[id] = Math.max(ACH[id], 1);
    saveAch();
    renderAch();
  }

  function bumpAch(id, inc) {
    var card = null;
    for (var i = 0; i < achCards.length; i++) {
      if (achCards[i].getAttribute('data-ach') === id) { card = achCards[i]; break; }
    }
    if (!card) return;
    var need = parseInt(card.getAttribute('data-need'), 10) || 1;
    var cur = ACH[id] || 0;
    if (cur >= need) return;
    ACH[id] = Math.min(need, cur + (inc || 1));
    saveAch();
    renderAch();
  }

  renderAch();

  /* =======================================================================
     I. 语音波形
     ======================================================================= */
  var waveCanvas = $('waveCanvas');
  var voicePlay = $('voicePlay');
  var voiceStatus = $('voiceStatus');
  var waveCtx = null;
  var wavePhase = 0;
  var waveActive = false;

  function sizeCanvas() {
    if (!waveCanvas) return;
    var w = waveCanvas.clientWidth || 200;
    var h = waveCanvas.clientHeight || 120;
    var dpr = win.devicePixelRatio || 1;
    waveCanvas.width = w * dpr;
    waveCanvas.height = h * dpr;
    waveCtx = waveCanvas.getContext('2d');
    waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWave();
  }

  function drawWave() {
    if (!waveCtx || !waveCanvas) return;
    var w = waveCanvas.width / (win.devicePixelRatio || 1);
    var h = waveCanvas.height / (win.devicePixelRatio || 1);

    waveCtx.clearRect(0, 0, w, h);

    var style = getComputedStyle(html);
    var c1 = style.getPropertyValue('--brand').trim() || '#FFFFFF';
    var c2 = style.getPropertyValue('--brand-soft').trim() || '#E4E4E7';
    var c3 = style.getPropertyValue('--cinnabar').trim() || '#E4E4E7';

    var grad = waveCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, c1);
    grad.addColorStop(.5, c2);
    grad.addColorStop(1, c3);

    waveCtx.lineWidth = 2;
    waveCtx.strokeStyle = grad;

    for (var b = 0; b < 3; b++) {
      waveCtx.beginPath();
      var amp = waveActive ? (14 + b * 10) : (4 + b * 3);
      var freq = waveActive ? (.024 + b * .008) : (.012 + b * .004);
      for (var x = 0; x <= w; x += 2) {
        var y = h / 2
          + Math.sin(x * freq + wavePhase * (1 + b * .3)) * (amp * (1 - b * .18))
          + Math.sin(x * .008 - wavePhase * .6) * amp * .4;
        if (x === 0) waveCtx.moveTo(x, y); else waveCtx.lineTo(x, y);
      }
      waveCtx.globalAlpha = waveActive ? (.85 - b * .22) : (.4 - b * .1);
      waveCtx.stroke();
    }
    waveCtx.globalAlpha = 1;

    wavePhase += waveActive ? .14 : .04;
    win.requestAnimationFrame(drawWave);
  }

  if (waveCanvas) {
    sizeCanvas();
    win.addEventListener('resize', sizeCanvas);
    win.setTimeout(sizeCanvas, 400);
  }

  if (voicePlay) {
    voicePlay.addEventListener('click', function () {
      if (waveActive) return;
      waveActive = true;
      voiceStatus.innerHTML = '正在播放 · <b>synthesizing</b>';
      unlockAch('voice');
      win.setTimeout(function () { voiceStatus.innerHTML = '播放中 · <b>speaking</b>'; }, 280);
      win.setTimeout(function () { waveActive = false; voiceStatus.innerHTML = '待机 · <b>idle</b>'; }, 2200);
    });
  }

  /* =======================================================================
     J. 快捷操作栏 / 每日签到 / 音景播放器
     ======================================================================= */
  var fabMain = $('fabMain');
  var fabItems = $('fabItems');
  var fabOpenFlag = false;

  if (fabMain && fabItems) {
    fabMain.addEventListener('click', function () {
      fabOpenFlag = !fabOpenFlag;
      fabMain.setAttribute('aria-expanded', fabOpenFlag ? 'true' : 'false');
      var items = fabItems.querySelectorAll('.fab-item');
      for (var i = 0; i < items.length; i++) items[i].classList.toggle('on', fabOpenFlag);
    });

    fabItems.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.fab-item') : null;
      if (!btn) return;

      var act = btn.getAttribute('data-fab');
      fabOpenFlag = false;
      fabMain.setAttribute('aria-expanded', 'false');
      var items = fabItems.querySelectorAll('.fab-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('on');

      if (act === 'studio') {
        location.hash = '#studio';
        win.setTimeout(function () { switchTab('chat'); }, 420);
      } else if (act === 'theme') {
        applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
      } else if (act === 'cmdk') {
        openCmdk();
      } else if (act === 'signin') {
        openSignin();
      } else if (act === 'top') {
        win.scrollTo({ top: 0, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
      }
    });
  }

  var signin = $('signin');
  var signinBtn = $('signinBtn');
  var signinClaimed = false;

  try {
    var lastSignin = win.localStorage && win.localStorage.getItem('xl-signin');
    if (lastSignin) {
      var d = new Date(lastSignin);
      if (d.toDateString() === new Date().toDateString()) signinClaimed = true;
    }
  } catch (e) {}

  function openSignin() {
    if (!signin) return;
    signin.classList.add('on');
    signin.setAttribute('aria-hidden', 'false');
    if (signinBtn) {
      signinBtn.disabled = signinClaimed;
      signinBtn.textContent = signinClaimed ? '今日已签到' : '领取今日奖励';
    }
  }

  function closeSignin() {
    if (!signin) return;
    signin.classList.remove('on');
    signin.setAttribute('aria-hidden', 'true');
  }

  if (signin) {
    signin.addEventListener('click', function (e) { if (e.target === signin) closeSignin(); });
  }

  if (signinBtn) {
    signinBtn.addEventListener('click', function () {
      if (signinClaimed) return;
      signinClaimed = true;
      signinBtn.disabled = true;
      signinBtn.textContent = '已签到 ✓';
      try { localStorage.setItem('xl-signin', new Date().toISOString()); } catch (e) {}
      addXp(30);
      gState.skills[0] = Math.min(100, gState.skills[0] + 5);
      renderGrowth();
      win.setTimeout(closeSignin, 900);
    });
  }

  /* --- 音景播放器 --- */
  var player = $('player');
  var playerBtn = $('playerBtn');
  var playerIcon = $('playerIcon');
  var playerSub = $('playerSub');
  var playerMute = $('playerMute');
  var muteIcon = $('muteIcon');
  var progressBarEl = $('playerProgressBar');
  var bgm = $('bgm');
  var toast = $('toast');
  var toastText = $('toastText');
  var toastTimer = null;

  var ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
  var ICON_PAUSE = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';
  var ICON_SOUND = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/>';
  var ICON_MUTED = '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/>';

  var BG_VOLUME = 0.45;

  var PLAYER_LABELS = {
    idle: '点击播放音景',
    loading: '正在加载音景…',
    playing: '正在播放 · Lo-Fi',
    paused: '已暂停',
    error: '音景加载失败'
  };

  function setPlayerState(state) {
    if (player) player.setAttribute('data-state', state);
    if (playerSub) playerSub.textContent = PLAYER_LABELS[state] || '';
    if (playerIcon) playerIcon.innerHTML = state === 'playing' ? ICON_PAUSE : ICON_PLAY;
    if (playerBtn) {
      playerBtn.setAttribute('aria-label', state === 'playing' ? '暂停音景' : '播放音景');
      playerBtn.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
    }
  }

  function showToast(msg) {
    if (!toast) return;
    if (toastText) toastText.textContent = msg;
    toast.hidden = false;
    win.requestAnimationFrame(function () { toast.classList.add('on'); });
    if (toastTimer) win.clearTimeout(toastTimer);
    toastTimer = win.setTimeout(hideToast, 6000);
  }

  function hideToast() {
    if (!toast) return;
    toast.classList.remove('on');
    if (toastTimer) { win.clearTimeout(toastTimer); toastTimer = null; }
    win.setTimeout(function () { if (toast && !toast.classList.contains('on')) toast.hidden = true; }, 400);
  }

  function fadeVolumeIn() {
    var target = bgm.muted ? 0 : BG_VOLUME;
    var t0 = null;
    bgm.volume = 0;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / 1200, 1);
      bgm.volume = target * p;
      if (p < 1) win.requestAnimationFrame(step);
    }
    win.requestAnimationFrame(step);
  }

  function tryPlay(fromGesture) {
    if (!bgm) return;
    if (!bgm.paused) return;

    var p;
    try { p = bgm.play(); } catch (e) { setPlayerState('error'); return; }

    if (!p || !p.then) { setPlayerState('playing'); fadeVolumeIn(); return; }

    p.then(function () {
      setPlayerState('playing');
      hideToast();
      fadeVolumeIn();
    }).catch(function (err) {
      var blocked = err && (err.name === 'NotAllowedError' || err.name === 'AbortError');
      if (blocked) {
        setPlayerState('idle');
        if (!fromGesture) showToast('浏览器拦截了自动播放 · 点击页面任意处即可开启桌面音景');
      } else {
        setPlayerState('error');
        if (!fromGesture) showToast('音景加载失败，检查网络后重试');
      }
    });
  }

  if (player && playerBtn && bgm) {
    bgm.volume = 0;
    setPlayerState('idle');

    bgm.addEventListener('play', function () { setPlayerState('playing'); });
    bgm.addEventListener('pause', function () {
      if (!bgm.ended) setPlayerState('paused');
    });
    bgm.addEventListener('waiting', function () { setPlayerState('loading'); });
    bgm.addEventListener('playing', function () { setPlayerState('playing'); });
    bgm.addEventListener('timeupdate', function () {
      if (progressBarEl && bgm.duration) {
        progressBarEl.style.width = (bgm.currentTime / bgm.duration * 100) + '%';
      }
    });
    bgm.addEventListener('error', function () { setPlayerState('error'); });

    playerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (bgm.paused) {
        tryPlay(true);
      } else {
        bgm.pause();
        hideToast();
      }
    });

    if (playerMute && muteIcon) {
      playerMute.addEventListener('click', function (e) {
        e.stopPropagation();
        bgm.muted = !bgm.muted;
        playerMute.setAttribute('aria-pressed', bgm.muted ? 'true' : 'false');
        playerMute.setAttribute('aria-label', bgm.muted ? '取消静音' : '静音');
        muteIcon.innerHTML = bgm.muted ? ICON_MUTED : ICON_SOUND;
        if (!bgm.muted) fadeVolumeIn();
      });
    }

    function onFirstGesture(e) {
      if (e.target && e.target.closest && e.target.closest('#player')) return;
      if (!bgm.paused) return;
      tryPlay(true);
      doc.removeEventListener('pointerdown', onFirstGesture);
      doc.removeEventListener('keydown', onFirstGesture);
      doc.removeEventListener('touchstart', onFirstGesture);
    }
    doc.addEventListener('pointerdown', onFirstGesture);
    doc.addEventListener('keydown', onFirstGesture);
    doc.addEventListener('touchstart', onFirstGesture);

    win.setTimeout(function () { tryPlay(false); }, 600);
  }

  /* =======================================================================
     K. 命令面板
     ======================================================================= */
  var cmdk = $('cmdk');
  var cmdkInput = $('cmdkInput');
  var cmdkList = $('cmdkList');
  var cmdkOpen = $('cmdkOpen');
  var cmdkFiltered = [];
  var cmdkSel = 0;
  var cmdkOpenFlag = false;

  var cmdkItems = [
    { name: '跳转到功能', desc: '查看核心功能', keys: ['g', 'f'], action: function () { location.hash = '#features'; } },
    { name: '打开技能库', desc: '70+ 本地技能', keys: ['g', 's'], action: function () { location.hash = '#skills-lib'; } },
    { name: '打开工作台', desc: '和演示版檀阁瑞木互动', keys: ['g', 'w'], action: function () { location.hash = '#studio'; win.setTimeout(function () { switchTab('chat'); }, 420); } },
    { name: '查看架构', desc: '四层解耦结构', keys: ['g', 'a'], action: function () { location.hash = '#arch'; } },
    { name: '浏览插件', desc: '万物皆插件', keys: ['g', 'p'], action: function () { location.hash = '#plugins'; } },
    { name: '切换角色', desc: '9 个角色可选', keys: ['g', 'm'], action: function () { location.hash = '#models'; } },
    { name: '成就徽章', desc: '解锁记录', keys: ['g', 'h'], action: function () { location.hash = '#achievements'; } },
    { name: '下载', desc: 'Windows / Linux / macOS / Android', keys: ['g', 'd'], action: function () { location.hash = '#download'; } },
    { name: '切换主题', desc: '深浅主题互换', keys: ['t', 't'], action: function () { applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true); } },
    { name: '每日签到', desc: '领取今日奖励', keys: ['a', 's'], action: function () { openSignin(); } },
    { name: '打开训练面板', desc: '启动 LoRA 微调演示', keys: ['a', 't'], action: function () { location.hash = '#studio'; win.setTimeout(function () { switchTab('train'); }, 420); } },
    { name: '打开成长面板', desc: '查看经验与技能', keys: ['a', 'g'], action: function () { location.hash = '#studio'; win.setTimeout(function () { switchTab('growth'); }, 420); } },
    { name: '播放语音波形', desc: '听檀阁瑞木说话', keys: ['a', 'v'], action: function () { if (voicePlay) voicePlay.click(); } },
    { name: '切换音景播放', desc: '桌面 Lo-Fi 音乐', keys: ['a', 'm'], action: function () { if (playerBtn) playerBtn.click(); } },
    { name: '重置成长数据', desc: '回到 Lv.1', keys: ['a', 'r'], action: function () { if (resetBtn) resetBtn.click(); } }
  ];

  function renderCmdk() {
    if (!cmdkList) return;
    if (!cmdkFiltered.length) {
      cmdkList.innerHTML = '<div class="cmdk-empty">没有匹配的命令</div>';
      return;
    }
    var out = '';
    for (var i = 0; i < cmdkFiltered.length; i++) {
      var it = cmdkFiltered[i];
      var sel = i === cmdkSel ? ' sel' : '';
      var kbd = '';
      for (var k = 0; k < it.keys.length; k++) kbd += '<kbd>' + it.keys[k] + '</kbd>';
      out += '<button type="button" class="cmdk-item' + sel + '" data-idx="' + i + '" role="option">'
        + '<span class="cmdk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></span>'
        + '<span class="cmdk-text"><h4>' + it.name + '</h4><p>' + it.desc + '</p></span>'
        + kbd + '</button>';
    }
    cmdkList.innerHTML = out;
  }

  function openCmdk() {
    if (!cmdk) return;
    cmdkOpenFlag = true;
    cmdk.classList.add('on');
    cmdk.setAttribute('aria-hidden', 'false');
    cmdkInput.value = '';
    cmdkFiltered = cmdkItems.slice();
    cmdkSel = 0;
    renderCmdk();
    win.setTimeout(function () { cmdkInput.focus(); }, 80);
    unlockAch('cmdk');
  }

  function closeCmdk() {
    if (!cmdk) return;
    cmdkOpenFlag = false;
    cmdk.classList.remove('on');
    cmdk.setAttribute('aria-hidden', 'true');
  }

  function execCmdk() {
    var it = cmdkFiltered[cmdkSel];
    if (!it) return;
    closeCmdk();
    win.setTimeout(function () { it.action(); }, 120);
  }

  if (cmdkOpen) cmdkOpen.addEventListener('click', openCmdk);
  if (cmdk) cmdk.addEventListener('click', function (e) { if (e.target === cmdk) closeCmdk(); });

  if (cmdkInput) {
    cmdkInput.addEventListener('input', function () {
      var q = cmdkInput.value.toLowerCase().trim();
      cmdkFiltered = !q ? cmdkItems.slice() : cmdkItems.filter(function (it) {
        return it.name.toLowerCase().indexOf(q) > -1 || it.desc.toLowerCase().indexOf(q) > -1;
      });
      cmdkSel = 0;
      renderCmdk();
    });
  }

  if (cmdkList) {
    cmdkList.addEventListener('click', function (e) {
      var item = e.target.closest && e.target.closest('.cmdk-item');
      if (!item) return;
      cmdkSel = parseInt(item.getAttribute('data-idx'), 10);
      execCmdk();
    });
    cmdkList.addEventListener('pointermove', function (e) {
      var item = e.target.closest && e.target.closest('.cmdk-item');
      if (!item) return;
      var idx = parseInt(item.getAttribute('data-idx'), 10);
      if (idx !== cmdkSel) { cmdkSel = idx; renderCmdk(); }
    });
  }

  /* =======================================================================
     L. 键盘快捷键
     ======================================================================= */
  doc.addEventListener('keydown', function (e) {
    var isInput = e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);

    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (cmdkOpenFlag) closeCmdk(); else openCmdk();
      return;
    }

    if (cmdkOpenFlag) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        closeCmdk();
        if (cmdkOpen) cmdkOpen.focus();
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdkSel = Math.min(cmdkFiltered.length - 1, cmdkSel + 1); renderCmdk(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); cmdkSel = Math.max(0, cmdkSel - 1); renderCmdk(); return; }
      if (e.key === 'Enter') { e.preventDefault(); execCmdk(); return; }
      return;
    }

    if (signin && signin.classList.contains('on') && (e.key === 'Escape' || e.key === 'Esc')) {
      closeSignin();
      return;
    }

    if (isInput || e.metaKey || e.ctrlKey || e.altKey) return;

    var map = { '1': 'chat', '2': 'train', '3': 'growth', '4': 'settings' };
    if (map[e.key]) {
      var studio = doc.getElementById('studio');
      if (!studio) return;
      var rect = studio.getBoundingClientRect();
      if (rect.top > win.innerHeight * .8 || rect.bottom < win.innerHeight * .2) return;
      switchTab(map[e.key]);
    }
  });

  /* =======================================================================
     M. 打字机
     ======================================================================= */
  var typedEl = $('typedText');
  if (typedEl) {
    var PHRASES = ['你好呀檀阁瑞木', '你会一直成长吗', '你的声音是什么样的', '陪我聊聊天吧'];
    var pi = 0;
    var ci = 0;
    var deleting = false;

    function typeLoop() {
      if (reduceMQ.matches) {
        typedEl.textContent = PHRASES[0];
        typedEl.classList.add('done');
        return;
      }
      var cur = PHRASES[pi];
      if (!deleting) {
        ci++;
        typedEl.textContent = cur.slice(0, ci);
        if (ci >= cur.length) { deleting = true; win.setTimeout(typeLoop, 1700); return; }
        win.setTimeout(typeLoop, 110);
      } else {
        ci--;
        typedEl.textContent = cur.slice(0, ci);
        if (ci <= 0) { deleting = false; pi = (pi + 1) % PHRASES.length; win.setTimeout(typeLoop, 320); return; }
        win.setTimeout(typeLoop, 55);
      }
    }
    win.setTimeout(typeLoop, 700);
  }
})();