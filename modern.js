/* ==========================================================================
   NFG MODERN LAYER  ·  assets/modern/modern.js
   Adds behaviour to the site without touching your existing scripts.
   Add at the bottom of index.html:  <script src="assets/modern/modern.js" defer></script>
   Sections: 1 Security · 2 Navigation · 3 Hero · 4 Cards · 5 Scroll reveal
             6 Footer · 7 Keep-alive (re-run when new cards appear)
   ========================================================================== */
(function () {
  'use strict';

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Visitor preferences: no motion effects if they asked for less motion,
  // and no mouse effects on touch screens.
  const reduced     = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* 1. SECURITY ----------------------------------------------------------
     a) window.open() now (1) only allows http/https links, which blocks
        "javascript:" tricks, and (2) always opens with noopener+noreferrer
        so the new tab cannot control or read your page.
     b) Every <a target="_blank"> gets the same protection (see enhance()). */
  const nativeOpen = window.open.bind(window);
  window.open = function (url, target, features) {
    try {
      if (!/^https?:$/.test(new URL(url, location.href).protocol)) return null;
    } catch (err) { return null; }
    return nativeOpen(url, target || '_blank', (features ? features + ',' : '') + 'noopener,noreferrer');
  };

  /* 2. NAVIGATION --------------------------------------------------------- */
  const nav = $('body > nav');

  // Skip link: lets keyboard users jump past the menu.
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#';
  skip.textContent = 'Skip to content';
  skip.addEventListener('click', function (e) {
    e.preventDefault();
    const page = $('.page.active');
    if (page) { page.setAttribute('tabindex', '-1'); page.focus(); }
  });
  document.body.insertBefore(skip, document.body.firstChild);

  // Reading-progress bar + "shrink the menu bar after scrolling".
  const bar = document.createElement('div');
  bar.id = 'nfg-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (nav) nav.classList.toggle('is-scrolled', scrollY > 24);
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ')';
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger button for small screens (shown by CSS under 1400px).
  if (nav) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.setAttribute('aria-expanded', 'false');
    for (let i = 0; i < 3; i++) btn.appendChild(document.createElement('span'));
    nav.appendChild(btn);

    const setMenu = function (open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    };
    btn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) {          // close after choosing a page
      if (e.target.closest('.nav-links a, .logo-container, .btn-nav')) setMenu(false);
    });
    addEventListener('hashchange', function () { setMenu(false); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* 3. HERO: gold glow follows the mouse, images drift slightly ----------- */
  const hero = $('.hero');
  if (hero && finePointer && !reduced) {
    hero.addEventListener('pointermove', function (e) {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      hero.style.setProperty('--mx', (x * 100) + '%');
      hero.style.setProperty('--my', (y * 100) + '%');
      hero.style.setProperty('--hx', ((x - 0.5) * 2).toFixed(3));   // -1 .. 1
      hero.style.setProperty('--hy', ((y - 0.5) * 2).toFixed(3));
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--hx', 0);
      hero.style.setProperty('--hy', 0);
    });
  }

  /* 4. CARDS: 3D tilt + spotlight (desktop mouse only) -------------------- */
  const TILT_SELECTOR = '.day-block, .chapter-card, .product-card, .card, .character-card';

  function bindTilt(el) {
    if (el.dataset.tilt) return;                         // already done
    el.dataset.tilt = '1';
    el.classList.add('nfg-tilt');
    el.addEventListener('pointermove', function (e) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--px', (x * 100) + '%');     // spotlight position
      el.style.setProperty('--py', (y * 100) + '%');
      el.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');   // max 3.5deg tilt
      el.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
    }, { passive: true });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  }

  /* 5. SCROLL REVEAL: fade + rise when an element enters the screen ------- */
  const REVEAL_SELECTOR = '.section-title, .detail-header, .promo-banner, ' + TILT_SELECTOR +
    ', .x-hero-copy, .x-download-card, .nfg-expansion-links, .x-collection';

  const observer = (!reduced && 'IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);              // animate only once
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    : null;

  function markReveal(el) {
    if (!observer || el.dataset.rv || !el.parentElement) return;
    el.dataset.rv = '1';
    const index = Array.prototype.indexOf.call(el.parentElement.children, el);
    el.style.setProperty('--d', ((index % 4) * 80) + 'ms');   // small stagger, 4 per row
    el.classList.add('nfg-reveal');
    observer.observe(el);
  }

  /* 6. FOOTER: built with safe DOM calls (no innerHTML) ------------------- */
  function buildFooter() {
    if ($('.nfg-footer')) return;
    const footer = document.createElement('footer');
    footer.className = 'nfg-footer';

    const logo = document.createElement('img');
    logo.src = 'logo.png.webp';
    logo.alt = 'Notes For Goats';
    logo.loading = 'lazy';
    footer.appendChild(logo);

    const tagline = document.createElement('p');
    tagline.textContent = 'Notes For Goats: the 7 Day Music Business.';
    footer.appendChild(tagline);

    const links = document.createElement('div');
    links.className = 'nfg-footer-links';
    [['Home', '#home'], ['Syllabus', '#syllabus'], ['Explore 360°', '#explore'],
     ['Store', '#store'], ['Community', '#community'], ['Your Profile', '#profile']]
      .forEach(function (item) {
        const a = document.createElement('a');
        a.textContent = item[0];
        a.href = item[1];
        links.appendChild(a);
      });
    footer.appendChild(links);

    const copy = document.createElement('p');
    copy.textContent = '\u00A9 ' + new Date().getFullYear() + ' Notes For Goats. All rights reserved.';
    footer.appendChild(copy);

    document.body.appendChild(footer);
  }

  /* 7. KEEP-ALIVE ----------------------------------------------------------
     The store and explore cards are created AFTER the page loads, so
     enhance() runs again whenever new elements are added to the page. */
  function enhance() {
    $$('a[target="_blank"]').forEach(function (a) { a.rel = 'noopener noreferrer'; });
    if (finePointer && !reduced) $$(TILT_SELECTOR).forEach(bindTilt);
    $$(REVEAL_SELECTOR).forEach(markReveal);
  }

  buildFooter();
  enhance();

  let pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; enhance(); });
  }).observe(document.body, { childList: true, subtree: true });
})();

/* ==========================================================================
   PART 2 · ENTERTAINMENT LAYER  (runs after Part 1; no index.html change)
   Sections: 1 Helpers · 2 Feedback (confetti, toast, clicks) · 3 Cursor +
             magnetic buttons + page sweep · 4 Hero effects · 5 Home sections
             · 6 Lesson progress
   ========================================================================== */
(function () {
  'use strict';

  /* 1. HELPERS ----------------------------------------------------------- */
  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced     = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  // One colour per course day (Day 0 grey, then the same colours as the syllabus).
  const PALETTE = ['#8a8a8a', '#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#007aff', '#af52de', '#ff2d55', '#ffffff'];
  const el = (tag, cls, text) => {                       // safe element builder (textContent only)
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  // Fade-and-rise when scrolled into view (for the sections this part creates).
  const io = (!reduced && 'IntersectionObserver' in window)
    ? new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      }), { threshold: 0.15 })
    : null;
  function reveal(node, i) {
    if (!io) return;
    node.style.setProperty('--d', ((i || 0) % 6) * 80 + 'ms');
    node.classList.add('nfg-reveal');
    io.observe(node);
  }

  /* 2. FEEDBACK ---------------------------------------------------------- */
  // Confetti: music symbols burst from a point and fall. Uses the Web Animations API (no CSS needed).
  function burst(x, y, n) {
    if (reduced) return;
    const symbols = ['\u266A', '\u266B', '\u2605', '\u2726', '\u25CF'];
    for (let i = 0; i < n; i++) {
      const s = el('span', 'nfg-confetti', symbols[i % symbols.length]);
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.color = PALETTE[(Math.random() * PALETTE.length) | 0];
      s.style.fontSize = (12 + Math.random() * 16) + 'px';
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 180;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px), calc(-50% + ' + (Math.sin(a) * d + 120) + 'px)) rotate(' + (Math.random() * 540 - 270) + 'deg) scale(1)', opacity: 0 }
      ], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => s.remove();
    }
  }

  // Toast: small message at the bottom of the screen.
  const toast = el('div', 'nfg-toast');
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);
  let toastTimer;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // Every main button / day pill throws a small confetti burst when clicked.
  document.addEventListener('click', e => {
    if (e.target.closest('.btn-nav, .btn-enter, .btn-action, .btn-buy-store, .nfg-day-pill')) burst(e.clientX, e.clientY, 14);
  });

  /* 3. CURSOR, MAGNETIC BUTTONS, PAGE SWEEP -------------------------------- */
  if (finePointer && !reduced) {
    // Gold dot + soft ring follow the mouse (the normal cursor stays visible).
    const dot = el('div', 'nfg-cursor-dot'), ring = el('div', 'nfg-cursor-ring');
    document.body.append(dot, ring);
    let mx = 0, my = 0, rx = 0, ry = 0;
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      document.documentElement.classList.add('has-cursor');
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => document.documentElement.classList.remove('has-cursor'));
    (function follow() {                                   // ring eases toward the mouse
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(follow);
    })();
    document.addEventListener('pointerover', e => {       // ring grows over clickable things
      ring.classList.toggle('is-hot', !!e.target.closest('a, button, summary, [role="button"], .card, .day-block, .chapter-card, .character-card, .product-card'));
    });

    // Magnetic: main buttons lean toward the pointer (max 10px).
    $$('.btn-nav, .btn-enter').forEach(b => {
      const clamp = v => Math.max(-10, Math.min(10, v));
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mgx', clamp((e.clientX - r.left - r.width / 2) * 0.25) + 'px');
        b.style.setProperty('--mgy', clamp((e.clientY - r.top - r.height / 2) * 0.25) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mgx', '0px'); b.style.setProperty('--mgy', '0px'); });
    });
  }

  // A gold light sweeps across the screen on every page change.
  if (!reduced) {
    const sweep = el('div'); sweep.id = 'nfg-sweep';
    document.body.appendChild(sweep);
    addEventListener('hashchange', () => sweep.animate(
      [{ transform: 'translateX(-101%)' }, { transform: 'translateX(101%)' }],
      { duration: 750, easing: 'cubic-bezier(.7,0,.2,1)' }));
  }

  /* 4. HERO EFFECTS -------------------------------------------------------- */
  function heroFX() {
    const hero = $('.hero');
    if (!hero) return;

    // 4a. Typing line under the headline: "Master the [Music|Business|...]"
    const h1 = $('.hero-center h1', hero);
    if (h1) {
      const WORDS = ['Music', 'Business', 'Mindset', 'Money', 'Legacy'];
      const box = el('div', 'nfg-rotator');
      box.setAttribute('aria-label', 'Master the music business');
      const lead = el('span', '', 'Master the '), word = el('b', '', reduced ? WORDS[0] : '');
      lead.setAttribute('aria-hidden', 'true'); word.setAttribute('aria-hidden', 'true');
      box.append(lead, word);
      h1.insertAdjacentElement('afterend', box);
      if (!reduced) {
        let wi = 0, ci = 0, erasing = false;
        (function tick() {
          const w = WORDS[wi];
          ci += erasing ? -1 : 1;
          word.textContent = w.slice(0, ci);
          word.style.setProperty('--rot', PALETTE[(wi % 8) + 1]);
          let wait = erasing ? 45 : 95;
          if (!erasing && ci === w.length) { wait = 1400; erasing = true; }          // pause on full word
          else if (erasing && ci === 0) { erasing = false; wi = (wi + 1) % WORDS.length; wait = 350; }
          setTimeout(tick, wait);
        })();
      }
    }

    // 4b. Equalizer bars along the bottom (pure CSS animation, random heights/speeds).
    const eq = el('div', 'nfg-eq');
    eq.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 56; i++) {
      const bar = document.createElement('i');
      bar.style.setProperty('--c', PALETTE[(i % 8) + 1]);
      bar.style.setProperty('--h', (0.35 + Math.random() * 0.65).toFixed(2));
      bar.style.animationDuration = (0.7 + Math.random() * 0.9).toFixed(2) + 's';
      bar.style.animationDelay = (-Math.random() * 1.5).toFixed(2) + 's';
      eq.appendChild(bar);
    }
    hero.appendChild(eq);

    // 4c. Floating music notes + dots that drift up and dodge the mouse.
    if (reduced) return;
    const cv = el('canvas', 'nfg-canvas');
    cv.setAttribute('aria-hidden', 'true');
    hero.prepend(cv);
    const ctx = cv.getContext('2d');
    const GLYPHS = ['\u266A', '\u266B', '\u2669', '\u266C'];
    const mouse = { x: -999, y: -999 };
    let w = 0, h = 0, parts = [];

    const make = () => {
      const note = Math.random() < 0.45;
      return {
        x: Math.random() * w, y: Math.random() * h, s: Math.random() * 100,
        vx: (Math.random() - 0.5) * 0.3, vy: -(0.15 + Math.random() * 0.45),
        r: note ? 14 + Math.random() * 16 : 1 + Math.random() * 2.2, g: note ? GLYPHS[(Math.random() * 4) | 0] : '',
        a: 0.12 + Math.random() * 0.4, c: PALETTE[1 + ((Math.random() * 8) | 0)]
      };
    };
    function resize() {                                    // runs again whenever the hero changes size
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      parts = Array.from({ length: Math.round(Math.min(60, (w * h) / 26000)) }, make);
    }
    new ResizeObserver(resize).observe(hero);
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });

    (function frame() {
      requestAnimationFrame(frame);
      if (document.hidden || !hero.offsetParent) return;   // tab hidden or another page is open: do nothing
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 22500) {                                  // within 150px of the mouse: get pushed away
          const d = Math.sqrt(d2) || 1, f = (150 - d) / 150;
          p.x += (dx / d) * f * 3; p.y += (dy / d) * f * 3;
        }
        p.x += p.vx + Math.sin((p.y + p.s) * 0.01) * 0.25;  // gentle sideways sway
        p.y += p.vy;
        if (p.y < -40) { p.y = h + 40; p.x = Math.random() * w; }
        if (p.x < -40) p.x = w + 40; else if (p.x > w + 40) p.x = -40;
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        if (p.g) { ctx.font = p.r + 'px serif'; ctx.fillText(p.g, p.x, p.y); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      }
    })();
  }

  /* 5. HOME SECTIONS: marquee, counters, journey ----------------------------- */
  let doneStat = null;                                      // the "completed by you" counter

  function countUp(node, to) {
    if (reduced) { node.textContent = to; return; }
    const t0 = performance.now();
    (function tick(t) {
      const p = Math.min((t - t0) / 1400, 1);
      node.textContent = Math.round(to * (1 - Math.pow(2, -10 * p)));   // fast start, soft landing
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function buildHome() {
    const home = $('#page-home');
    if (!home || $('.nfg-marquee', home)) return;
    // Day names are read from the syllabus cards, so they never go out of date.
    const days = $$('.timeline .day-block').map((b, i) => ({ n: i, title: $('.header-text h3', b).textContent }));

    const marquee = el('div', 'nfg-marquee'), track = el('div', 'nfg-track');
    marquee.setAttribute('aria-hidden', 'true');
    for (let r = 0; r < 2; r++) {                           // two copies = seamless loop
      days.forEach(d => { const s = el('span', '', 'Day ' + d.n + ' \u00B7 ' + d.title); s.style.setProperty('--c', PALETTE[d.n]); track.appendChild(s); });
    }
    marquee.appendChild(track);

    const stats = el('section', 'nfg-stats');
    [[days.length, 'Days of lessons'], [$$('.chapter-card').length, 'Lessons to master'], [0, 'Completed by you']].forEach((s, i) => {
      const card = el('div', 'nfg-stat'), num = el('b', '', '0');
      num.dataset.to = s[0];
      if (i === 2) doneStat = num;
      card.append(num, el('span', '', s[1]));
      stats.appendChild(card);
      reveal(card, i);
    });
    new IntersectionObserver((es, ob) => es.forEach(e => {  // counters start when visible
      if (e.isIntersecting) { $$('.nfg-stat b', stats).forEach(b => countUp(b, +b.dataset.to)); ob.disconnect(); }
    }), { threshold: 0.4 }).observe(stats);

    const journey = el('section', 'nfg-journey');
    journey.append(el('h2', 'section-title', 'Your ' + days.length + '-Day Journey'),
                   el('p', '', 'Pick a day and jump in. Tap lessons to mark them complete.'));
    const grid = el('div', 'nfg-days');
    days.forEach(d => {
      const a = el('a', 'nfg-day-pill');
      a.href = '#day-' + d.n;
      a.style.setProperty('--c', PALETTE[d.n]);
      a.style.setProperty('--i', d.n);
      const bar = el('div', 'nfg-bar'); bar.dataset.day = 'day-' + d.n; bar.appendChild(document.createElement('i'));
      a.append(el('b', '', String(d.n)), el('span', '', d.title), bar);
      grid.appendChild(a);
      reveal(a, d.n);
    });
    journey.appendChild(grid);
    home.append(marquee, stats, journey);
  }

  /* 6. LESSON PROGRESS (saved in this visitor's browser) ----------------------- */
  const KEY = 'nfg-progress-v1';
  let done = {};
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw && typeof raw === 'object') done = raw; } catch (e) { /* storage blocked: still works this visit */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* ignore */ } };

  // Updates every bar / counter for one day (e.g. "day-3") and returns its numbers.
  function refresh(day) {
    const page = $('#page-' + day);
    if (!page) return { done: 0, total: 0 };
    const cards = $$('.chapter-card', page), n = cards.filter(c => c.classList.contains('is-done')).length;
    $$('.nfg-bar[data-day="' + day + '"]').forEach(b => b.firstChild.style.setProperty('--p', (cards.length ? (n / cards.length) * 100 : 0) + '%'));
    $$('.nfg-count[data-day="' + day + '"]').forEach(c => { c.textContent = n + ' / ' + cards.length + ' lessons complete'; });
    return { done: n, total: cards.length };
  }
  function refreshAll() {
    for (let d = 0; d <= 8; d++) refresh('day-' + d);
    if (doneStat) { const total = $$('.chapter-card.is-done').length; doneStat.dataset.to = total; doneStat.textContent = total; }
  }

  function toggleLesson(card, e) {
    const key = card.dataset.lesson, day = key.split(':')[0], now = !card.classList.contains('is-done');
    card.classList.toggle('is-done', now);
    card.setAttribute('aria-pressed', String(now));
    if (now) done[key] = 1; else delete done[key];
    save();
    const info = refresh(day);
    if (doneStat) { doneStat.textContent = $$('.chapter-card.is-done').length; }
    if (!now) return;
    const r = card.getBoundingClientRect();
    burst(e && e.clientX ? e.clientX : r.left + r.width / 2, e && e.clientY ? e.clientY : r.top + r.height / 2, 18);
    if (info.done === info.total) {                          // whole day finished: big celebration
      burst(innerWidth / 2, innerHeight / 3, 70);
      say('\uD83C\uDF89 ' + $('.detail-header h2', card.closest('.page')).textContent.split(':')[0] + ' complete!');
    } else {
      say('Lesson complete \u00B7 ' + info.done + ' / ' + info.total);
    }
  }

  function bindLessons() {
    $$('.page[id^="page-day-"]').forEach(page => {
      const day = page.id.slice(5);                          // "day-3"
      const header = $('.detail-header', page);
      if (header && !$('.nfg-day-progress', header)) {       // progress bar under each day's title
        const box = el('div', 'nfg-day-progress'), bar = el('div', 'nfg-bar'), count = el('span', 'nfg-count');
        bar.dataset.day = day; count.dataset.day = day;
        bar.appendChild(document.createElement('i'));
        box.append(bar, count);
        header.appendChild(box);
      }
      $$('.chapter-card', page).forEach((card, i) => {
        if (card.dataset.lesson) return;
        card.dataset.lesson = day + ':' + i;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-pressed', done[card.dataset.lesson] ? 'true' : 'false');
        card.classList.toggle('is-done', !!done[card.dataset.lesson]);
        const tick = el('span', 'nfg-check', '\u2713');
        tick.setAttribute('aria-hidden', 'true');
        $('.chapter-card-header', card).appendChild(tick);
        card.addEventListener('click', e => toggleLesson(card, e));
        card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleLesson(card); } });
      });
    });
    // Small progress bar on each syllabus card.
    $$('.timeline .day-block').forEach((block, i) => {
      if ($('.nfg-bar', block)) return;
      const bar = el('div', 'nfg-bar'); bar.dataset.day = 'day-' + i; bar.appendChild(document.createElement('i'));
      block.appendChild(bar);
    });
  }

  /* START ---------------------------------------------------------------------- */
  bindLessons();
  buildHome();
  heroFX();
  refreshAll();
})();

/* 8. COURSE AVATAR PICKER + SEPARATE 3D SHOWROOM (NFG cast stays untouched) */
(function(){
  'use strict';
  const courseCast = [
    {name:'Notes',role:'The Hustler',image:'note with business suit.png',model:'note with business suit.glb',accent:'#d4af37'},
    {name:'Notas',role:'The Bilingual Twin',image:'notas with business suit.png',model:'notas with business suit.glb',accent:'#007aff'},
    {name:'Mentor',role:'The OG',image:'mentor with business suit.png',model:'mentor with business suit.glb',accent:'#af52de'},
    {name:'AI',role:'The Digital Mind',image:'ai with business suit.png',model:'ai with business suit.glb',accent:'#34c759'},
    {name:'Singer',role:'The Performer',image:'singer.png',model:'singer.glb',accent:'#ff2d55'},
    {name:'Producer',role:'The Sound Architect',image:'producer.png',model:'producer.glb',accent:'#ff9500'},
    {name:'DJ',role:'The Crowd Controller',image:'dj.png',model:'dj.glb',accent:'#00d4ff'},
    {name:'Dancer',role:'The Movement',image:'dancer.png',model:'dancer.glb',accent:'#ff66cc'},
    {name:'Visionary',role:'The Creative Force',image:'visionary.png',model:'visionary.glb',accent:'#8bff66'}
  ];
  const imageBase='./';
  const modelBase='assets/store Models/';
  const propItems=[
    {name:'Wooden Bed',category:'Furniture',image:'bed wooden.png',model:'bed wooden.glb'},
    {name:'Studio Sofa',category:'Furniture',image:'sofa.png',model:'sofa.glb'},
    {name:'Wooden Desk',category:'Furniture',image:'wooden desk.png',model:'wooden desk.glb'},
    {name:'Studio Speakers',category:'Studio Gear',image:'speakers.png',model:'speakers.glb'},
    {name:'Microphone',category:'Studio Gear',image:'microphone.png',model:'microphone.glb'},
    {name:'Drum Kit',category:'Studio Gear',image:'drum kit.png',model:'drum kit.glb'},
    {name:'Stage Lights',category:'Studio Gear',image:'stage lights.png',model:'stage lights.glb'},
    {name:'Wood Flooring',category:'Materials',image:'wood.png',model:'wood.glb'}
  ];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function addPicker(){
    const form=document.getElementById('demoAuthForm'); if(!form||document.getElementById('nfg-course-avatar-picker'))return;
    const pick=document.createElement('section');pick.id='nfg-course-avatar-picker';pick.className='nfg-avatar-pick';pick.hidden=true;
    pick.innerHTML='<h3>Choose your course character</h3><p>Your character will be your companion as you move through the 7-day course.</p><div class="nfg-avatar-grid" role="group" aria-label="Select a course character"></div>';
    const grid=pick.querySelector('.nfg-avatar-grid');let selected=localStorage.getItem('nfg_course_avatar')||'Notes';
    courseCast.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='nfg-avatar-option'+(c.name===selected?' selected':'');b.textContent=c.name;b.setAttribute('aria-pressed',String(c.name===selected));b.addEventListener('click',()=>{selected=c.name;localStorage.setItem('nfg_course_avatar',selected);grid.querySelectorAll('button').forEach(x=>{const on=x.textContent===selected;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});});grid.appendChild(b);});
    const confirm=form.querySelector('#confirmPasswordGroup');if(confirm)confirm.insertAdjacentElement('afterend',pick);else form.appendChild(pick);
    const oldSet=window.setAuthMode;if(typeof oldSet==='function'&&!oldSet.__avatarWrapped){window.setAuthMode=function(mode){oldSet(mode);pick.hidden=mode!=='register';};window.setAuthMode.__avatarWrapped=true;}
    const submit=form.querySelector('#authSubmitButton');if(submit)submit.addEventListener('click',()=>{if(!pick.hidden&&!selected)localStorage.setItem('nfg_course_avatar','Notes');});
  }
  function insertShowroom(){
    const store=document.getElementById('page-store'),grid=document.getElementById('storeGrid');if(!store||!grid||document.getElementById('nfg-3d-showroom'))return;
    const section=document.createElement('section');section.className='nfg-showroom';section.id='nfg-3d-showroom';section.innerHTML='<div class="nfg-showroom-head"><h3>Walk the 3D showroom</h3><p>Course companions, studio gear and room assets — explore each model in 3D.</p></div><div class="nfg-showroom-tabs" role="group" aria-label="Showroom category"></div><div class="nfg-showroom-grid"></div>';
    grid.parentElement.insertBefore(section,grid);
    const tabs=section.querySelector('.nfg-showroom-tabs'),cards=section.querySelector('.nfg-showroom-grid');
    const categories=['All','Characters','Furniture','Studio Gear','Materials'];
    function draw(category){cards.replaceChildren();const data=(category==='All'?[...courseCast.map(c=>({...c,category:'Characters'})),...propItems]:category==='Characters'?courseCast.map(c=>({...c,category:'Characters'})):propItems.filter(p=>p.category===category));
      data.forEach(item=>{const card=document.createElement('article');card.className='nfg-showroom-item';card.style.setProperty('--show-accent',item.accent||'#d4af37');card.innerHTML='<div class="nfg-showroom-visual"><img loading="lazy" src="'+esc(imageBase+item.image)+'" alt="'+esc(item.name)+'" onerror="this.style.opacity=0"></div><div class="nfg-showroom-meta"><h4>'+esc(item.name)+'</h4><small>'+esc(item.role||item.category)+'</small><button type="button">View in 3D ↗</button></div>';card.querySelector('button').addEventListener('click',()=>{if(typeof window.open3DViewer==='function')window.open3DViewer(modelBase+item.model,item.name,imageBase+item.image);});cards.appendChild(card);});
    tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.textContent===category));}
    categories.forEach(c=>{const b=document.createElement('button');b.type='button';b.textContent=c;b.addEventListener('click',()=>draw(c));tabs.appendChild(b);});draw('All');
  }
  function init(){addPicker();insertShowroom();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  new MutationObserver(init).observe(document.body,{childList:true,subtree:true});
})();
