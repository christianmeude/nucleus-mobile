/* NUcleus download page behavior.
   Version wiring + share + theme toggle (plain DOM), then anime.js motion:
   split-text hero entrance, review rail, scroll reveals, counters.
   Everything motion-related bails under prefers-reduced-motion or no anime. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- version wiring (unchanged behavior) ---- */
  var btns = document.querySelectorAll('.apk-link');
  var verEls = document.querySelectorAll('.js-version');
  var notes = document.getElementById('changelog');
  var compat = document.getElementById('compat-line');
  var fallbackVer = verEls.length ? verEls[0].textContent : '';
  fetch('./latest.json')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d) return;
      if (d.apkUrl) { for (var i = 0; i < btns.length; i++) btns[i].href = d.apkUrl; }
      var verText = fallbackVer;
      if (d.version) verText = 'v' + d.version + (d.build ? ' (build ' + d.build + ')' : '');
      else if (d.date) verText = d.date;
      for (var v = 0; v < verEls.length; v++) verEls[v].textContent = verText;
      if (d.notes) notes.textContent = d.notes;
      var compatParts = [];
      if (d.minAndroid) compatParts.push(d.minAndroid);
      compatParts.push('APK');
      if (d.size) compatParts.push(d.size);
      compat.textContent = compatParts.join(' · ');
      var reinstall = document.getElementById('reinstall-note');
      if (reinstall) reinstall.hidden = !d.requiresReinstall;
      var hashEl = document.getElementById('checksum-hash');
      var hashLine = document.getElementById('checksum-line');
      if (d.sha256 && hashEl) {
        hashEl.textContent = d.sha256;
        if (hashLine) hashLine.hidden = false;
      }
    })
    .catch(function () {});

  /* ---- share ---- */
  var copyBtn = document.getElementById('copy-btn');
  var shareBtn = document.getElementById('share-btn');
  var status = document.getElementById('share-status');
  var url = 'https://download.nu-cleus.app/';
  copyBtn.addEventListener('click', function () {
    function done() { status.textContent = 'Link copied. Paste it to your seatmate.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () {
        status.textContent = 'Copy failed. Long-press the address above to copy.';
      });
    } else { status.textContent = 'Long-press the address above to copy.'; }
  });
  if (!navigator.share) { shareBtn.style.display = 'none'; }
  else { shareBtn.addEventListener('click', function () { navigator.share({ title: 'NUcleus Mobile', url: url }).catch(function () {}); }); }

  /* ---- theme toggle (light default, persisted, system only on first visit) ---- */
  var root = document.documentElement;
  var tgl = document.getElementById('theme-toggle');
  var tlab = document.getElementById('theme-label');
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function paintToggle() {
    var dark = root.dataset.theme === 'dark';
    tgl.setAttribute('aria-pressed', String(dark));
    tgl.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    if (tlab) tlab.textContent = dark ? 'Light' : 'Dark';
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#070e1f' : '#f1f4fa');
  }
  if (tgl) {
    tgl.addEventListener('click', function () {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('nu-theme', next); } catch (e) {}
      paintToggle();
    });
    paintToggle();
  }

  /* ---- anime.js motion ---- */
  if (!window.anime || reduceMotion) return;
  var animate = window.anime.animate;
  var createTimeline = window.anime.createTimeline;
  var stagger = window.anime.stagger;
  var set = window.anime.set;

  /* split hero title into word/char spans (keeps nested .gold) */
  function splitChars(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'w';
          w.setAttribute('aria-hidden', 'true');
          part.split('').forEach(function (ch) {
            var c = document.createElement('span');
            c.className = 'c';
            c.textContent = ch;
            w.appendChild(c);
          });
          frag.appendChild(w);
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1) { splitChars(node); }
    });
  }
  var title = document.getElementById('hero-title');
  if (title) {
    var fullText = title.textContent;
    title.setAttribute('aria-label', fullText.trim().replace(/\s+/g, ' '));
    splitChars(title);
  }

  /* load timeline: title chars -> sub -> ctas -> strip */
  var tl = createTimeline({ defaults: { ease: 'outExpo' } });
  tl.add('#hero-title .c', { y: ['115%', '0%'], duration: 950, delay: stagger(26) })
    .add('.hero-sub', { opacity: [0, 1], y: [22, 0], duration: 800 }, '-=650')
    .add('.cta-row > *', { opacity: [0, 1], y: [18, 0], duration: 700, delay: stagger(90) }, '-=600')
    .add('.hero-strip', { opacity: [0, 1], duration: 800 }, '-=450')
    .add('.scroll-cue', { opacity: [0, 1], duration: 800 }, '-=500');

  /* calm mouse gradients: two washes drift toward the pointer, heavily lerped */
  var heroEl = document.querySelector('.hero');
  if (heroEl && window.matchMedia('(pointer: fine)').matches) {
    var gtx = 0, gty = 0, gcx = 0, gcy = 0;
    var heroOn = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { heroOn = en[0].isIntersecting; }).observe(heroEl);
    }
    heroEl.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect();
      gtx = ((e.clientX - r.left) / r.width - 0.5) * 140;
      gty = ((e.clientY - r.top) / r.height - 0.5) * 100;
    });
    heroEl.addEventListener('pointerleave', function () { gtx = 0; gty = 0; });
    (function glowLoop() {
      requestAnimationFrame(glowLoop);
      if (!heroOn) return;
      gcx += (gtx - gcx) * 0.06;
      gcy += (gty - gcy) * 0.06;
      if (Math.abs(gtx - gcx) < 0.1 && Math.abs(gty - gcy) < 0.1) return;
      heroEl.style.setProperty('--gx', gcx.toFixed(1) + 'px');
      heroEl.style.setProperty('--gy', gcy.toFixed(1) + 'px');
    })();
  }

  /* review rail: vertical scroll-driven steps, scroll is the sole driver.
     Manual rAF-throttled reader (no anime onScroll): progress from the track
     rect, change-gated DOM writes, rect re-read every frame so resize/fonts
     need no cached thresholds. Reduced-motion / no-JS keeps the shipped
     fully-complete static end state. */
  var track = document.getElementById('story-track');
  if (track && !reduceMotion) {
    var steps = track.querySelectorAll('.rail-step');
    var rfill = track.querySelector('.rail-fill');
    var tdots = track.querySelectorAll('.rt-dots i');
    var pnds = track.querySelectorAll('.mini-progress .nd');
    var plns = track.querySelectorAll('.mini-progress .ln');
    var flag = track.querySelector('.mini-flag');
    var flagT = track.querySelector('.flag-t');
    var snum = document.getElementById('story-num');
    var snumM = document.getElementById('story-num-m');
    var flagTexts = ['WITH ADVISER', 'WITH THE CHAIR', 'WITH THE EDITOR', 'WITH ADMIN', 'PUBLISHED'];
    var lastStage = -2;
    var lastFill = -1;
    function renderRail(p) {
      var stage = Math.max(0, Math.min(4, Math.floor(p)));
      var complete = p >= 4.999;
      var fill = Math.max(0, Math.min(1, p / 5));
      if (Math.abs(fill - lastFill) > 0.001 && rfill) {
        rfill.style.transform = 'scaleY(' + fill + ')';
        lastFill = fill;
      }
      if (stage === lastStage) return;
      lastStage = stage;
      for (var i = 0; i < 5; i++) {
        steps[i].classList.toggle('done', complete || i < stage);
        steps[i].classList.toggle('now', !complete && i === stage);
        if (!complete && i === stage) steps[i].setAttribute('aria-current', 'step');
        else steps[i].removeAttribute('aria-current');
        var pd = i < stage || complete;
        if (pnds[i]) {
          pnds[i].classList.toggle('done', pd);
          pnds[i].classList.toggle('now', !pd && i === stage);
          pnds[i].textContent = pd ? '✓' : '';
        }
        if (plns[i]) plns[i].classList.toggle('done', pd && i < 4);
        if (tdots[i]) {
          tdots[i].classList.toggle('done', complete || i < stage);
          tdots[i].classList.toggle('now', !complete && i === stage);
        }
      }
      if (flagT) flagT.textContent = flagTexts[stage];
      if (flag) flag.classList.toggle('ok', complete);
      if (snum) snum.textContent = String(stage + 1);
      if (snumM) snumM.textContent = String(stage + 1);
    }
    function readRail() {
      var rect = track.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var prog = (vh * 0.55 - rect.top) / rect.height;
      renderRail(Math.max(0, Math.min(5, prog * 5)));
    }
    var ticking = false;
    function requestRail() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; readRail(); });
    }
    renderRail(5);
    lastStage = -2;
    readRail();
    window.addEventListener('scroll', requestRail, { passive: true });
    window.addEventListener('resize', requestRail);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestRail).catch(function () {});
    window.addEventListener('load', requestRail);
  }

  /* scroll reveals: from-state in JS only, play once */
  var revealEls = document.querySelectorAll('.reveal');
  for (var ri = 0; ri < revealEls.length; ri++) { set(revealEls[ri], { y: 40, opacity: 0 }); }
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        animate(en.target, { y: [40, 0], opacity: [0, 1], duration: 950, ease: 'outExpo', composition: 'replace' });
        ro.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* stat counters */
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        cio.unobserve(el);
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var obj = { v: 0 };
        animate(obj, { v: target, duration: 1500, ease: 'outExpo', onUpdate: function () { el.textContent = Math.round(obj.v); } });
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }
})();
