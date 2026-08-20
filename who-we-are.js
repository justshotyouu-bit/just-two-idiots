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

    if (!motionOK.matches) return;

    var START_ROT = 34;   // degrees the card is laid back at rest
    var START_SCALE = 0.82;

    function frame() {
      var r = runway.getBoundingClientRect();
      // 0 while the runway's top is at the viewport top, 1 once it has been
      // scrolled by its full travel (height minus the one sticky viewport).
      var travel = r.height - window.innerHeight;
      var p = travel > 0 ? (-r.top) / travel : 1;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      // Ease so most of the standing-up happens early and it settles gently.
      var e = 1 - Math.pow(1 - p, 3);
      var rot = START_ROT * (1 - e);
      var sc = START_SCALE + (1 - START_SCALE) * e;
      stage.style.transform = 'perspective(1400px) rotateX(' + rot.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      stage.style.borderRadius = (28 - 10 * e).toFixed(1) + 'px';
    }
    bindScroll(frame);
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

  // rAF-coalesced scroll binding, shared by both effects.
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
