// 3D "spin the work" carousel — revolves continuously at a steady pace;
// click-and-drag speeds it up or reverses it, then it settles back to drifting.
// Each card is a single flat panel arranged around a ring and rotated to
// face outward. (An earlier version built each card out of several thin
// rotated strips to fake a slight curve — it looked nice front-on, but the
// strip seams and the first/last strip's rounded corner never quite lined
// up the same on both sides, so it's a plain flat panel now: a real
// border-radius on the whole card instead, which is always symmetric.)
(function () {
  var container = document.getElementById('carousel-container');
  var stage = document.getElementById('carousel-stage');
  if (!container || !stage) return;

  // Real project screenshots — full frame, no cropping. Cards are sized to
  // this exact 2500x2125 aspect ratio so background-size can show each image
  // whole, edge to edge, with nothing cut off.
  var PROJECTS = [
    { image: 'assets/work/fig.webp', name: 'Fig', category: 'Lighting & Living — eCommerce' },
    { image: 'assets/work/getmyrugs.webp', name: 'GetMyRugs', category: 'Handmade Rugs — eCommerce' },
    { image: 'assets/work/rugs499.webp', name: 'Rugs499', category: 'Handmade Rugs — eCommerce' },
    { image: 'assets/work/parmandesigns.webp', name: 'Parman Designs', category: 'Furniture & Decor — Brand site' },
    { image: 'assets/work/justshotyou.webp', name: 'justshotyou', category: 'Photography & Film — Portfolio' }
  ];

  var CARD_COUNT = PROJECTS.length;
  var RING_ANGLE = 360 / CARD_COUNT; // degrees between card centers
  var IMAGE_ASPECT = 2500 / 2125;

  // Reference geometry, designed against a ~1556px-wide stage. Card size,
  // ring radius and perspective are all scaled by one shared factor below —
  // scaling them together keeps the projection similar, so the ring just
  // gets smaller rather than distorting. Previously these were fixed at
  // 440/650/2400, which needs 1556px of room; the section is at most 1440,
  // so the two side cards were being sliced off flat by its hard edge.
  var BASE_CARD_W = 440;
  var BASE_RADIUS = 650;
  var BASE_PERSPECTIVE = 2400;
  var BASE_HALF_EXTENT = 778; // half-width the ring occupies at scale 1

  var cards = []; // {el, baseAngle} — used to cull cards on the far side of the ring each frame

  for (var c = 0; c < CARD_COUNT; c++) {
    var project = PROJECTS[c];
    var card = document.createElement('div');
    card.className = 'carousel-card';
    card.style.backgroundImage = 'url(' + project.image + ')';
    var baseAngle = c * RING_ANGLE;
    cards.push({ el: card, baseAngle: baseAngle });

    var overlay = document.createElement('div');
    overlay.className = 'carousel-card-overlay';
    card.appendChild(overlay);

    var caption = document.createElement('div');
    caption.className = 'carousel-card-caption';
    caption.innerHTML = '<div class="carousel-card-caption-name">' + project.name + '</div>' +
      '<div class="carousel-card-caption-category">' + project.category + '</div>';
    card.appendChild(caption);

    stage.appendChild(card);
  }

  // Size the ring to the space the section actually has. Called on load and
  // on resize, so the carousel stays whole from a 900px tablet up to 1440+.
  function layout() {
    var stageW = container.clientWidth;
    if (!stageW) return;
    // Let the outermost cards run ~12% past the frame, where the section's
    // edge mask fades them out — that reads as the ring continuing offscreen
    // instead of stopping at a cut line.
    var scale = (stageW * 0.56) / BASE_HALF_EXTENT;
    scale = Math.max(0.4, Math.min(1, scale));

    var cardW = BASE_CARD_W * scale;
    var cardH = cardW / IMAGE_ASPECT;
    var radius = BASE_RADIUS * scale;

    container.style.perspective = (BASE_PERSPECTIVE * scale) + 'px';
    // Front card sits closest to the camera, so it is magnified the most;
    // the section has to be tall enough for it at that size.
    var frontMag = BASE_PERSPECTIVE / (BASE_PERSPECTIVE - BASE_RADIUS);
    container.style.height = Math.round(cardH * frontMag + 70) + 'px';

    for (var i = 0; i < cards.length; i++) {
      var el = cards[i].el;
      el.style.width = cardW + 'px';
      el.style.height = cardH + 'px';
      el.style.marginTop = (-cardH / 2) + 'px';
      el.style.marginLeft = (-cardW / 2) + 'px';
      el.style.backgroundSize = cardW + 'px ' + cardH + 'px';
      el.style.transform = 'rotateY(' + cards[i].baseAngle + 'deg) translateZ(' + radius + 'px)';
    }
  }
  layout();

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  });

  var IDLE_SPEED = 0.12;   // deg/frame — steady "Earth around the Sun" baseline drift
  var angle = 0;
  var speed = IDLE_SPEED;  // deg/frame — eases toward IDLE_SPEED when not dragging
  var dragging = false;
  var dragStartX = 0;
  var dragStartAngle = 0;
  var lastDragX = 0;
  var DRAG_SENSITIVITY = 0.35; // degrees rotated per pixel dragged
  var SETTLE = 0.05;           // how fast speed eases back toward IDLE_SPEED after a drag

  // touch-action lives in CSS as `pan-y`: horizontal drags spin the ring,
  // vertical ones still scroll the page. (It used to be set to `none` here,
  // which would trap vertical scrolling over the whole section on touch.)
  // When the browser claims a vertical pan it fires pointercancel, which
  // endDrag already handles.
  container.style.cursor = 'grab';

  function normalizeAngle(a) {
    a = a % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
  }

  function tick() {
    if (!dragging) {
      // Always keep revolving: ease speed back toward the steady idle baseline
      // rather than down to a stop, so a drag/flick nudges the pace or direction
      // for a bit and then it settles back into its continuous drift — it never
      // just sits still.
      speed += (IDLE_SPEED - speed) * SETTLE;
      angle += speed;
    }
    stage.style.transform = 'rotateY(' + angle + 'deg)';
    // Cards on the far side of the ring face away from the camera and land
    // in a degenerate part of the perspective projection there, so just
    // stop drawing a card once it rotates past the front-facing arc.
    for (var i = 0; i < cards.length; i++) {
      var rel = normalizeAngle(cards[i].baseAngle + angle);
      cards[i].el.style.visibility = Math.abs(rel) > 95 ? 'hidden' : 'visible';
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  container.addEventListener('pointerdown', function (e) {
    dragging = true;
    dragStartX = e.clientX;
    dragStartAngle = angle;
    lastDragX = e.clientX;
    speed = 0;
    container.style.cursor = 'grabbing';
    if (container.setPointerCapture) container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var stepDeg = (e.clientX - lastDragX) * DRAG_SENSITIVITY;
    // Momentum is just the clamped per-event delta rather than a dt-normalized
    // velocity — dt between consecutive pointermove events can be near-zero
    // (e.g. two events landing in the same frame), and dividing by that blew
    // the resulting speed up to thousands of degrees/frame.
    speed = Math.max(-20, Math.min(20, stepDeg));
    angle = dragStartAngle + (e.clientX - dragStartX) * DRAG_SENSITIVITY;
    lastDragX = e.clientX;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    container.style.cursor = 'grab';
    // `speed` already holds the release velocity — tick() eases it back toward
    // IDLE_SPEED, so a hard flick keeps spinning faster for a bit before settling.
  }
  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);
  container.addEventListener('pointerleave', endDrag);
})();

// Floating header — firms up its glass once the reader leaves the top, and
// marks whichever section they are actually in. Only two links to track, so
// this is a plain position check rather than an observer per section.
(function () {
  var header = document.getElementById('site-header');
  if (!header) return;

  var links = Array.prototype.slice.call(header.querySelectorAll('.nav-link[data-spy]'));
  var targets = links.map(function (link) {
    return { link: link, el: document.getElementById(link.getAttribute('data-spy')) };
  }).filter(function (t) { return t.el; });

  var ticking = false;
  var current = null;

  function update() {
    ticking = false;
    header.classList.toggle('is-scrolled', window.pageYOffset > 12);

    // "In" a section means its top has passed just under the bar and its
    // bottom hasn't yet — the last one matching wins, so overlapping
    // sections resolve to the lower (more recently entered) one.
    var line = window.pageYOffset + 120;
    var active = null;
    for (var i = 0; i < targets.length; i++) {
      var r = targets[i].el.getBoundingClientRect();
      var top = r.top + window.pageYOffset;
      if (line >= top && line < top + r.height) active = targets[i].link;
    }
    if (active !== current) {
      links.forEach(function (l) { l.classList.toggle('is-current', l === active); });
      current = active;
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

// Services deck — the stacking itself is pure CSS (position:sticky at
// stepped top offsets, see style.css). This only adds depth to it: once a
// card starts being covered by the next one it eases back and dims, so the
// pile reads as receding layers rather than flat overlaps.
(function () {
  var panels = Array.prototype.slice.call(document.querySelectorAll('.svc-panel'));
  if (panels.length < 2) return;
  // Below 900px the deck falls back to a plain stacked list, and reduced
  // motion turns it off entirely — leave the cards untouched in both cases.
  var stacked = window.matchMedia('(min-width: 901px)');
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

  var MAX_SCALE_DROP = 0.06; // how far a fully covered card recedes
  var MAX_DIM = 0.26;        // how dark a fully covered card goes
  var ticking = false;

  function clear() {
    panels.forEach(function (p) {
      p.style.transform = '';
      var v = p.querySelector('.svc-panel-veil');
      if (v) v.style.opacity = '0';
    });
  }

  function update() {
    ticking = false;
    if (!stacked.matches || !motionOK.matches) return;
    for (var i = 0; i < panels.length; i++) {
      var panel = panels[i];
      var veil = panel.querySelector('.svc-panel-veil');
      var covered = 0;
      if (i < panels.length - 1) {
        var top = panel.getBoundingClientRect().top;
        var nextTop = panels[i + 1].getBoundingClientRect().top;
        var h = panel.offsetHeight || 1;
        // How far the next card has travelled up across this one, 0..1.
        covered = (h - (nextTop - top)) / h;
        covered = covered < 0 ? 0 : covered > 1 ? 1 : covered;
      }
      panel.style.transform = 'scale(' + (1 - covered * MAX_SCALE_DROP).toFixed(4) + ')';
      if (veil) veil.style.opacity = (covered * MAX_DIM).toFixed(3);
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { clear(); onScroll(); });
  if (stacked.addEventListener) stacked.addEventListener('change', function () { clear(); onScroll(); });
  else if (stacked.addListener) stacked.addListener(function () { clear(); onScroll(); });
  update();
})();

// "Who we are" — fades the section up (and sweeps its highlighted phrases
// in) the first time it scrolls into view.
(function () {
  var nodes = document.querySelectorAll('[data-reveal-home]');
  if (!nodes.length) return;
  var show = function (el) { el.classList.add('is-visible'); };
  if (!('IntersectionObserver' in window)) { nodes.forEach(show); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
  nodes.forEach(function (n) { io.observe(n); });
})();

// Pitch band — fires the wordmark's letter entrance the first time the
// section is seen, and types the rotating word in the sub-line on a loop.
(function () {
  var section = document.getElementById('pitch');
  if (!section) return;

  // Trigger the staggered letter entrance once, on first sight.
  var reveal = function () { section.classList.add('is-visible'); };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { reveal(); io.disconnect(); }
      });
    }, { threshold: 0.2 });
    io.observe(section);
  } else {
    reveal();
  }

  var slot = section.querySelector('.jti-type-word');
  if (!slot) return;
  // Reduced motion keeps the first word on screen rather than typing forever.
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

  var WORDS = ['brand', 'website', 'app', 'packaging', 'campaign', 'identity'];
  var TYPE_MS = 82, ERASE_MS = 42, HOLD_MS = 1500, GAP_MS = 320;
  var wordIndex = 0, charCount = WORDS[0].length, erasing = true, timer = null;
  var running = false;

  function step() {
    var word = WORDS[wordIndex];
    slot.textContent = word.slice(0, charCount);

    if (erasing) {
      if (charCount === 0) {
        erasing = false;
        wordIndex = (wordIndex + 1) % WORDS.length;
        timer = setTimeout(step, GAP_MS);
      } else {
        charCount--;
        timer = setTimeout(step, ERASE_MS);
      }
    } else if (charCount === word.length) {
      erasing = true;
      timer = setTimeout(step, HOLD_MS);
    } else {
      charCount++;
      timer = setTimeout(step, TYPE_MS);
    }
  }

  // Only run while the band is actually on screen — no timer churn otherwise.
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) step();
    else { clearTimeout(timer); timer = null; }
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      setRunning(entries[0].isIntersecting);
    }, { threshold: 0.1 }).observe(section);
  } else {
    setRunning(true);
  }
})();

// "How we work" rail — always travels right-to-left. A steady drift, plus
// whatever the reader scrolls: scrolling either way pushes the rail further
// left, so the cards behave as if gravity pulled them that way.
// Falls back to the CSS keyframes (.hww-track.is-auto) if this never runs.
(function () {
  var track = document.querySelector('.hww-track');
  if (!track) return;
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

  var DRIFT = 26;        // px per second at rest
  var SCROLL_PUSH = 0.5; // px of travel per px scrolled, either direction
  var offset = 0;
  var span = 0;          // width of one card set — where the loop repeats
  var lastY = window.pageYOffset;
  var lastT = 0;
  var paused = false;

  function measure() {
    // Half the track is the duplicate set, so one set is where it wraps.
    span = track.scrollWidth / 2;
  }
  measure();
  if (!span) return;

  // Take over from the CSS animation only now that we know we can drive it.
  track.classList.remove('is-auto');

  window.addEventListener('scroll', function () {
    var y = window.pageYOffset;
    offset += Math.abs(y - lastY) * SCROLL_PUSH;
    lastY = y;
  }, { passive: true });

  track.addEventListener('mouseenter', function () { paused = true; });
  track.addEventListener('mouseleave', function () { paused = false; });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });

  function frame(t) {
    var dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
    lastT = t;
    if (!paused) offset += DRIFT * dt;
    if (span) offset %= span;
    track.style.transform = 'translateX(' + (-offset).toFixed(2) + 'px)';
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// Showreel — the "Embedded in your workflow" card opening into full screen.
// A card-sized window in the middle of a pinned viewport widens to fill it
// as the reader scrolls, while the video inside eases back from a slight
// zoom (that offset between frame and content is what reads as parallax)
// and the surrounding colour crosses from the page cream to the reel's black.
(function () {
  var section = document.getElementById('reel');
  if (!section) return;
  var sticky = section.querySelector('.reel-sticky');
  var stage = section.querySelector('.reel-stage');
  var video = section.querySelector('.reel-video');
  if (!sticky || !stage || !video) return;

  // 5MB of video has no business loading with the page — it only starts
  // fetching once the reader is within a screen or two of it.
  // Deliberately no video.load() here: two observers watch this same section
  // and their callback order isn't guaranteed, so a load() could land after
  // play() had already started and abort it (the video would freeze a second
  // or so in). Raising preload is enough to begin fetching, and play() pulls
  // down whatever it still needs on its own.
  var started = false;
  function ensureLoaded() {
    if (started) return;
    started = true;
    video.preload = 'auto';
  }

  var shouldPlay = false;
  function tryPlay() {
    if (!shouldPlay) return;
    var r = video.play();
    if (r && r.catch) r.catch(function () {});   // autoplay refusal is fine
  }
  // If it wasn't buffered enough the first time, take the next chance.
  video.addEventListener('canplay', tryPlay);
  video.addEventListener('loadeddata', tryPlay);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) ensureLoaded();
    }, { rootMargin: '150% 0px' }).observe(section);

    // Play only while it is actually on screen, so it isn't burning battery
    // decoding frames nobody is looking at.
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        ensureLoaded();
        shouldPlay = true;
        tryPlay();
      } else {
        shouldPlay = false;
        if (!video.paused) video.pause();
      }
    }, { threshold: 0.05 }).observe(section);
  } else {
    ensureLoaded();
    shouldPlay = true;
    tryPlay();
  }

  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

  var PAGE = [250, 250, 248];   // #FAFAF8, the page behind it
  var REEL = [6, 7, 10];        // #06070A, to meet the reel's own black
  var OPEN = 0.55;              // fraction of the runway spent opening
  var ticking = false;

  function update() {
    ticking = false;
    var travel = section.offsetHeight - window.innerHeight;
    if (travel <= 0) return;

    var p = -section.getBoundingClientRect().top / travel;
    p = p < 0 ? 0 : p > 1 ? 1 : p;

    var o = p / OPEN;
    o = o < 0 ? 0 : o > 1 ? 1 : o;
    var e = 1 - Math.pow(1 - o, 3);          // easeOutCubic — quick, then settles

    var vw = window.innerWidth, vh = window.innerHeight;
    // Opening frame is the same shape as a "How we work" card.
    var cardW = Math.min(300, vw * 0.72);
    var cardH = Math.min(cardW * 1.25, vh * 0.72);
    var x = ((vw - cardW) / 2) * (1 - e);
    var y = ((vh - cardH) / 2) * (1 - e);

    stage.style.clipPath = 'inset(' + y.toFixed(1) + 'px ' + x.toFixed(1) + 'px round ' +
      (26 * (1 - e)).toFixed(1) + 'px)';
    // Content settles more slowly than the frame opens — the parallax.
    video.style.transform = 'scale(' + (1 + 0.16 * (1 - e)).toFixed(4) + ')';

    var c = Math.min(1, e * 1.5);
    sticky.style.backgroundColor = 'rgb(' +
      Math.round(PAGE[0] + (REEL[0] - PAGE[0]) * c) + ',' +
      Math.round(PAGE[1] + (REEL[1] - PAGE[1]) * c) + ',' +
      Math.round(PAGE[2] + (REEL[2] - PAGE[2]) * c) + ')';
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
