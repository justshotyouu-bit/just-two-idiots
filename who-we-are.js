// Who we are — two scroll-driven pieces: the banner card standing up out of
// perspective, and the statement lighting one word at a time. Both are pure
// scroll-position maths on a sticky stage; neither animates on a timer, so
// scrubbing back up rewinds them exactly.
(function () {
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

  // --- Banner ------------------------------------------------------------
  (function () {
    var runway = document.querySelector('.who-banner');
    var stage = document.getElementById('who-banner-stage');
    var video = document.getElementById('who-banner-video');
    if (!runway || !stage || !video) return;

    // preload="none" keeps 2.9MB off the initial load; the source is attached
    // only once the banner is near the viewport, then playback follows visibility.
    var SRC = 'assets/who/banner.mp4';
    var armed = false;
    function arm() {
      if (armed) return;
      armed = true;
      video.src = SRC;
      // Don't call load() after setting src — it restarts the fetch and can
      // abort a play() already in flight (the homepage reel hit exactly this).
      var tryPlay = function () { var p = video.play(); if (p && p.catch) p.catch(function () {}); };
      tryPlay();
      video.addEventListener('canplay', tryPlay, { once: true });
      video.addEventListener('loadeddata', tryPlay, { once: true });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) arm();
          else if (armed && !video.paused) video.pause();
          if (e.isIntersecting && armed && video.paused) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        });
      }, { rootMargin: '150% 0px' }).observe(runway);
    } else { arm(); }

    if (!motionOK.matches) { stage.classList.add('is-open'); return; }

    // One-shot: the card opens the first time it comes into view and stays
    // open. Scrubbing it against scroll position was tried and does not
    // survive a compact hero — with the card near the fold it arrives already
    // 94% open and the reveal is spent before the reader sees it.
    //
    // Deliberately a plain position test rather than an IntersectionObserver.
    // The closed card is a 46deg tilt at 0.35 opacity, so an observer that
    // never delivers leaves it looking broken rather than merely un-animated;
    // bindScroll runs this once synchronously at bind time, so it resolves on
    // load whether or not any callback ever fires.
    var opened = false;
    function check() {
      if (opened) return;
      var r = stage.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight * 0.88) {
        opened = true;
        // A beat, so the motion is noticed rather than being over while the
        // page is still settling.
        setTimeout(function () { stage.classList.add('is-open'); }, 160);
      }
    }
    bindScroll(check);
  })();

  // --- Statement ---------------------------------------------------------
  (function () {
    var section = document.getElementById('who-statement');
    var host = document.getElementById('who-words');
    if (!section || !host) return;

    // Wrap every word so each can be lit independently. Rebuilt from the
    // text content, so the copy stays a single readable string in the HTML.
    var words = host.textContent.trim().split(/\s+/);
    host.textContent = '';
    var spans = words.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'who-word';
      s.textContent = w;
      host.appendChild(s);
      if (i < words.length - 1) host.appendChild(document.createTextNode(' '));
      return s;
    });

    if (!motionOK.matches) { spans.forEach(function (s) { s.classList.add('is-lit'); }); return; }

    var lit = -1;
    function frame() {
      var r = section.getBoundingClientRect();
      var travel = r.height - window.innerHeight;
      var p = travel > 0 ? (-r.top) / travel : 1;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      // Finish lighting the last word at ~85% so the sentence is whole and
      // readable for a beat before the section leaves.
      var want = Math.round(Math.min(1, p / 0.85) * spans.length);
      if (want === lit) return;
      for (var i = 0; i < spans.length; i++) spans[i].classList.toggle('is-lit', i < want);
      lit = want;
    }
    bindScroll(frame);
  })();

  // --- Founders ----------------------------------------------------------
  (function () {
    var cards = [].slice.call(document.querySelectorAll('[data-jf-card]'));
    var intro = document.querySelector('[data-jf-intro]');
    if (!cards.length && !intro) return;

    if (!motionOK.matches) {
      cards.forEach(function (c) { c.classList.add('is-in'); });
      if (intro) intro.classList.add('is-in');
      return;
    }

    // The intro rides the same one-shot test as the cards. Its figures are
    // already printed in the markup, so the count-up only ever replays a
    // number that is correct before and after it runs.
    if (intro) {
      var introDone = false;
      bindScroll(function () {
        if (introDone) return;
        var r = intro.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight * 0.88) {
          introDone = true;
          intro.classList.add('is-in');
          intro.querySelectorAll('.jf-stat-n').forEach(function (el, i) {
            var to = parseInt(el.getAttribute('data-count'), 10);
            if (isNaN(to)) return;
            setTimeout(function () { countUp(el, to, 900); }, 820 + i * 100);
          });
        }
      });
    }

    // One-shot, and a plain position test rather than an IntersectionObserver
    // for the same reason the banner uses one: the pre-reveal card is a tilt at
    // zero opacity, so an observer that never delivers leaves both founders
    // invisible rather than merely un-animated. bindScroll runs this once
    // synchronously at bind time, so it resolves on load either way.
    var pending = cards.slice();
    function check() {
      if (!pending.length) return;
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        var r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight * 0.86) {
          el.classList.add('is-in');
          pending.splice(i, 1);
          // Once the card has landed, hand it the short easing so the pointer
          // tilt below feels immediate instead of dragging the entrance curve.
          settle(el);
        }
      }
    }
    function settle(node) {
      setTimeout(function () {
        node.classList.add('is-settled');
        node.style.willChange = 'auto';
      }, 1300);
    }
    bindScroll(check);

    // Pointer tilt, plus the sheen position the card face reads as --mx/--my.
    // Coarse pointers get neither: with no hover to leave, a tilt would stick
    // wherever the last tap landed.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    cards.forEach(function (card) {
      var face = card.querySelector('.jf-face');
      if (!face) return;
      var raf = 0, mx = 50, my = 0, tx = 0, ty = 0;
      function apply() {
        raf = 0;
        card.style.setProperty('--tx', tx.toFixed(2) + 'deg');
        card.style.setProperty('--ty', ty.toFixed(2) + 'deg');
        face.style.setProperty('--mx', mx.toFixed(1) + '%');
        face.style.setProperty('--my', my.toFixed(1) + '%');
      }
      function queue() { if (!raf) raf = requestAnimationFrame(apply); }
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        mx = px * 100; my = py * 100;
        ty = (px - 0.5) * 8;   // yaw follows the pointer across
        tx = (0.5 - py) * 5;   // pitch is gentler; too much and the text skews
        queue();
      }, { passive: true });
      card.addEventListener('mouseleave', function () {
        tx = 0; ty = 0; mx = 50; my = 0;
        queue();
      });
    });
  })();

  // Counts a figure up from zero. Writes the exact target on the last frame
  // rather than trusting the easing to land on it.
  function countUp(el, to, dur) {
    var t0 = 0;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      el.textContent = p >= 1 ? to : Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // rAF-coalesced scroll binding, shared by all three effects.
  function bindScroll(frame) {
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; frame(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
  }
})();
