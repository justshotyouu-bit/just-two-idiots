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
    { image: 'assets/work/denver.webp', name: 'Denver', category: 'Autograph Collection — Fragrance' },
    { image: 'assets/work/getmyrugs.webp', name: 'GetMyRugs', category: 'Handmade Rugs — eCommerce' },
    { image: 'assets/work/rugs499.webp', name: 'Rugs499', category: 'Handmade Rugs — eCommerce' },
    { image: 'assets/work/bbhhomes.webp', name: 'BBH Homes', category: 'Rugs & Furniture — eCommerce' },
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
  // The front card sits closest to the camera, so perspective magnifies it by
  // this much. Both the scale below and the section's height derive from it.
  var FRONT_MAG = BASE_PERSPECTIVE / (BASE_PERSPECTIVE - BASE_RADIUS);
  var BREAKPOINT = 900; // where the stylesheet's narrow rules take over too

  // How much of the stage the magnified front card should cover, turned into
  // the single factor everything scales by. From the breakpoint up it is 43%,
  // which is exactly what the old fit-the-whole-ring rule worked out to and
  // leaves both neighbours in frame either side. A phone has no room for that
  // ring — fitting it end to end would leave a postage-stamp front card — so
  // the share grows as the screen narrows and the neighbours run off into the
  // section's edge mask instead. The two rules meet at the breakpoint, so a
  // resize crosses over with no jump.
  function ringScale(stageW) {
    var frontShare = 0.434;
    if (stageW < BREAKPOINT) frontShare += 0.366 * Math.min(1, (BREAKPOINT - stageW) / 520);
    return Math.min(1, (stageW * frontShare) / (BASE_CARD_W * FRONT_MAG));
  }

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
  // on resize, so the carousel stays whole from a 320px phone up to 1440+.
  function layout() {
    var stageW = container.clientWidth;
    if (!stageW) return;

    // Card, radius and perspective all scale by one shared factor, which keeps
    // the projection similar so the ring just gets smaller rather than
    // distorting.
    var scale = ringScale(stageW);

    var cardW = BASE_CARD_W * scale;
    var cardH = cardW / IMAGE_ASPECT;
    var radius = BASE_RADIUS * scale;

    container.style.perspective = (BASE_PERSPECTIVE * scale) + 'px';
    // The section has to be tall enough for the front card at magnified size.
    container.style.height = Math.round(cardH * FRONT_MAG + 70) + 'px';

    // The caption is sized in em, so this one declaration scales the whole
    // label. Measured against the card at the breakpoint and clamped to 1, so
    // from there up it holds its designed 16px — the ring is unchanged on
    // desktop — and only ever shrinks below that, which is what keeps the
    // category off a second line on a phone. Floored well above the card's own
    // ratio: a 320px screen takes the card to under half its desktop size, and
    // half-size type is smaller than it needs to be to stay readable.
    var typeScale = Math.max(0.72, Math.min(1, scale / ringScale(BREAKPOINT)));

    for (var i = 0; i < cards.length; i++) {
      var el = cards[i].el;
      el.style.fontSize = (16 * typeScale) + 'px';
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
  // The deck stacks at every width now, phones included; only reduced motion
  // falls back to a plain list, since the effect is scroll-driven by nature.
  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

  // Depth is carried by dimming alone, deliberately. A covered card used to
  // scale down too, and uniform scale shrinks a card horizontally as well as
  // vertically: at 0.085 that pulled each edge 14px inboard and opened a strip
  // down both sides of the card, through which the colour field behind the
  // deck showed. Because the scale tracked scroll position continuously, those
  // strips changed width and colour on every frame — the sideways "glitching".
  // Dimming reads as recession just as well and never changes geometry, so the
  // pile now only ever moves up the screen.
  var MAX_DIM = 0.34;        // how dark a fully covered card goes
  var ticking = false;

  function clear() {
    panels.forEach(function (p) {
      var v = p.querySelector('.svc-panel-veil');
      if (v) v.style.opacity = '0';
    });
  }

  function update() {
    ticking = false;
    if (!motionOK.matches) return;
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
      if (veil) veil.style.opacity = (covered * MAX_DIM).toFixed(3);
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { clear(); onScroll(); });
  if (motionOK.addEventListener) motionOK.addEventListener('change', function () { clear(); onScroll(); });
  else if (motionOK.addListener) motionOK.addListener(function () { clear(); onScroll(); });
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

// Pitch band — types the rotating word in the sub-line on a loop.
// (This used to also flag the section `is-visible` to stagger a wordmark's
// letters in; the wordmark was replaced by the phone, so that class had no
// CSS left to match and has been dropped.)
(function () {
  var section = document.getElementById('pitch');
  if (!section) return;

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
  var OPEN = 0.42;              // fraction of the runway spent opening
  var CLOSE = 0.74;             // where it starts closing again
  var ticking = false;

  function update() {
    ticking = false;
    var travel = section.offsetHeight - window.innerHeight;
    if (travel <= 0) return;

    var p = -section.getBoundingClientRect().top / travel;
    p = p < 0 ? 0 : p > 1 ? 1 : p;

    // Open, hold, then close again. It used to stay full-bleed black right up
    // to the section's last pixel, so the reel left the screen as a hard black
    // edge sweeping up under the fixed header — a slab of black above the cut
    // and page cream below it, with the pill stranded on the boundary. Closing
    // on the way out mirrors the way it opened and hands the next section a
    // cream screen to arrive on.
    var e;
    if (p <= OPEN) {
      var o = p / OPEN;
      e = 1 - Math.pow(1 - o, 3);            // easeOutCubic — quick, then settles
    } else if (p < CLOSE) {
      e = 1;                                  // held wide open
    } else {
      var c2 = (p - CLOSE) / (1 - CLOSE);
      e = 1 - c2 * c2 * c2;                   // easeInCubic — lingers, then shuts
    }

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

    // Opening, the surround darkens ahead of the frame (x1.5) so the black is
    // already there when the video arrives. Closing, it tracks the frame
    // exactly — running ahead there would strand a black screen behind a
    // shut card for the last stretch of the runway.
    var c = p < CLOSE ? Math.min(1, e * 1.5) : e;
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

// Hero rotator — "Two idiots" stays put, the trade after it rolls over on a
// timer. Phrases always enter from below and leave upward, so the motion reads
// as one continuous roll rather than alternating direction.
(function () {
  var slot = document.getElementById('hero-rot-slot');
  if (!slot) return;

  var PHRASES = [
    'mastering AI learning',
    'crafting graphic worlds',
    'running elite production',
    'driving bold art direction',
    'designing slick apps',
    'engineering websites',
    'building powerful brands',
    'growing ambitious businesses',
    'executing killer marketing',
    'dropping fresh brand identities',
    'creating scroll-stopping content',
    'designing stunning packaging'
  ];

  var words = PHRASES.map(function (text) {
    var el = document.createElement('span');
    el.className = 'hero-rot-word';
    el.textContent = text;
    slot.appendChild(el);
    return el;
  });

  var i = 0;
  words[0].classList.add('is-current');

  // The slot is width:0 until this runs. Widths come off the rendered spans,
  // so they have to be re-taken once Switzer actually loads — measured against
  // the fallback face they are wrong enough to clip the first phrase — and
  // again on resize, since the font-size is a clamp() on viewport width.
  function fit() { slot.style.width = words[i].offsetWidth + 'px'; }
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  else window.addEventListener('load', fit);
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fit, 120);
  });

  // Rotating text is motion for its own sake — hold the first phrase instead.
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

  var HOLD = 2600; // ms a phrase is readable before the next one starts

  setInterval(function () {
    var prev = words[i];
    i = (i + 1) % words.length;
    var next = words[i];

    prev.classList.remove('is-current');
    prev.classList.add('is-out');

    // Snap the incoming phrase back below without animating it there, or it
    // would slide down into place first and then rise again.
    next.classList.add('no-anim');
    next.classList.remove('is-out');
    void next.offsetWidth;
    next.classList.remove('no-anim');

    next.classList.add('is-current');
    slot.style.width = next.offsetWidth + 'px';
  }, HOLD);
})();
// Showreel wall — rows of YouTube tiles that drift sideways with the scroll.
//
// TO ADD VIDEOS: put them in SHOWREEL below. That is the only edit needed.
//   id   — the YouTube id. For https://youtu.be/AbC123  ->  'AbC123'
//          For a Short https://youtube.com/shorts/AbC123 -> 'AbC123'
//   kind — 'wide'  for normal 16:9 videos
//          'short' for Shorts / vertical 9:16
// Order does not matter; the rows are balanced automatically. With the list
// empty the whole section removes itself, so a half-finished wall never ships.
(function () {
  var SHOWREEL = [
    { id: 'calKufPhTI0', kind: 'wide', title: 'TARC — a film' },
    { id: 'vY0o0vvMHbI', kind: 'wide', title: 'Prakshi Fine Jewellery — fashion film' },
    { id: 'zmFRbHPj8lI', kind: 'wide', title: 'Tender Heart School — trailer' },
    { id: 'NxR14zywB-c', kind: 'wide', title: 'Dhagon Ki Kahaniya — GetMyRugs documentary' },
    { id: 'iFUMYRc_ySM', kind: 'wide', title: 'GetMyRugs' },
    { id: 'o21rQhNwzcU', kind: 'wide', title: 'Crafting Elegance — the artistry behind hand-knotted rugs' },
    { id: 'KVkGkP-NP14', kind: 'wide', title: 'With Love, Banaras' },
    { id: 'oAGKwS4uE_A', kind: 'wide', title: 'Every Bounce Tells a Story — Plurality for Unbox Designs' },
    { id: 'b5Pu2DggF5Q', kind: 'wide', title: 'Family Series — GetMyRugs' },
    { id: '48PI9tmkLkM', kind: 'short', title: 'Bhadohi, where tradition meets dedication — GetMyRugs' },
    { id: 'Ec3Elq5cMP8', kind: 'short', title: 'Prakshi Fine Jewellery' },
    { id: 'MBMhOzkO2kY', kind: 'short', title: 'Celebrating women weavers — Bhadohi, Banaras' }
  ];

  // Four rows on a phone: the tiles are much shorter there (see style.css), so
  // an extra row buys another band of videos without making the section taller.
  var ROWS = window.matchMedia('(max-width: 640px)').matches ? 4 : 3;

  var section = document.getElementById('showreel');
  var wall = document.getElementById('srl-wall');
  if (!section || !wall) return;

  if (!SHOWREEL.length) { section.remove(); return; }   // nothing to show yet
  section.hidden = false;

  // Deal the tiles across the rows so each row gets a similar total width —
  // rows of wildly different lengths drift out of sync and look broken.
  var width = function (v) { return v.kind === 'short' ? 9 / 16 : 16 / 9; };
  var rows = [], totals = [];
  for (var r = 0; r < ROWS; r++) { rows.push([]); totals.push(0); }
  SHOWREEL.forEach(function (v) {
    var i = totals.indexOf(Math.min.apply(null, totals));
    rows[i].push(v); totals[i] += width(v);
  });

  function tile(v, dup) {
    var el = document.createElement('div');
    el.className = 'srl-tile srl-tile-' + (v.kind === 'short' ? 'short' : 'wide');
    el.setAttribute('data-yt', v.id);
    el.setAttribute('data-kind', v.kind === 'short' ? 'short' : 'wide');
    el.setAttribute('data-title', v.title || '');
    // Poster first: an iframe per tile costs a full player, so tiles stay as
    // a still until they are actually on screen (see mount/unmount below).
    var img = document.createElement('img');
    img.src = 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
    img.alt = dup ? '' : (v.title || '');
    img.loading = 'lazy';
    img.decoding = 'async';
    el.appendChild(img);

    // The click target is a button laid over the tile, not the tile itself.
    // The iframe must keep pointer-events:none — that is what stops YouTube
    // summoning its own chrome back on hover — so nothing on the tile can be
    // clicked without a layer of our own above it.
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'srl-open';
    btn.setAttribute('aria-label', 'Play ' + (v.title || 'video'));
    btn.innerHTML = '<span class="srl-play" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.2v13.6L19 12z"/></svg></span>';
    // Every tile is dealt twice so a drifting row still covers both ends. The
    // second copy is scenery: keeping it focusable would give a reader 24
    // items for 12 films.
    if (dup) { btn.tabIndex = -1; btn.setAttribute('aria-hidden', 'true'); }
    el.appendChild(btn);
    return el;
  }

  var rowEls = rows.map(function (list) {
    var row = document.createElement('div');
    row.className = 'srl-row';
    // Duplicated so a drifting row still covers the full width at either end.
    list.forEach(function (v) { row.appendChild(tile(v, false)); });
    list.forEach(function (v) { row.appendChild(tile(v, true)); });
    wall.appendChild(row);
    return row;
  });

  // --- play only what is visible -----------------------------------------
  function mount(el) {
    if (el.querySelector('iframe')) return;
    var id = el.getAttribute('data-yt');
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id +
            '?autoplay=1&mute=1&controls=0&loop=1&playlist=' + id +
            '&playsinline=1&modestbranding=1&rel=0&disablekb=1&fs=0';
    f.allow = 'autoplay; encrypted-media; picture-in-picture';
    f.setAttribute('tabindex', '-1');
    f.setAttribute('aria-hidden', 'true');
    f.setAttribute('title', '');
    el.appendChild(f);
  }
  function unmount(el) {
    var f = el.querySelector('iframe');
    if (f) f.remove();          // frees the player; the poster stays behind it
  }
  // Cap on how many players may exist at once. The wall is short enough that
  // every tile can be on screen together, and 24 live YouTube iframes is not
  // something a phone survives — each is a full player. The nearest few to the
  // middle of the screen play; the rest hold their poster, which is a real
  // frame from the same film, so the wall still reads as one moving piece.
  var MAX_LIVE = window.matchMedia('(max-width: 860px)').matches ? 3 : 6;
  var allTiles = [].slice.call(wall.querySelectorAll('.srl-tile'));

  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

  // --- open one tile full size -------------------------------------------
  // Everything below is wired before the reduced-motion return further down:
  // that branch turns off the drift and the autoplaying wall, but a film the
  // visitor deliberately clicked is not incidental motion and should still
  // play.
  var lb = null, lbFrame = null, lbTitle = null, lbClose = null;
  var lbOpen = false, lastFocus = null;

  function buildLightbox() {
    lb = document.createElement('div');
    lb.className = 'srl-lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Video player');
    lb.hidden = true;
    lb.innerHTML =
      '<button type="button" class="srl-lb-close" aria-label="Close video">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M6 6l12 12M18 6L6 18" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>' +
      '<div class="srl-lb-stage"><div class="srl-lb-frame"></div>' +
      '<p class="srl-lb-title"></p></div>';
    document.body.appendChild(lb);
    lbFrame = lb.querySelector('.srl-lb-frame');
    lbTitle = lb.querySelector('.srl-lb-title');
    lbClose = lb.querySelector('.srl-lb-close');
    lbClose.addEventListener('click', closeLightbox);
    // The stage is only as big as the player, so anything landing on the
    // scrim itself is a click beside the video and means "close".
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
  }

  function openLightbox(el) {
    if (!lb) buildLightbox();
    var id = el.getAttribute('data-yt');
    var title = el.getAttribute('data-title') || '';
    lastFocus = document.activeElement;
    lb.setAttribute('data-kind', el.getAttribute('data-kind') || 'wide');
    lbTitle.textContent = title;

    // A second, honest player: full size, real controls, sound on, uncropped.
    // The wall's embeds are muted and blown up 1.42x to hide YouTube's chrome,
    // which is exactly wrong for actually watching something.
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id +
            '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('title', title || 'Video');
    lbFrame.innerHTML = '';
    lbFrame.appendChild(f);

    // Lock the page behind the overlay, padding out the width the scrollbar
    // gives back so the layout does not jump. The header is fixed and sized
    // off 100vw, which already includes the scrollbar, so it stays put.
    var sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--srl-sbw', (sbw > 0 ? sbw : 0) + 'px');
    document.body.classList.add('srl-lb-lock');

    lb.hidden = false;
    lbOpen = true;
    allTiles.forEach(unmount);   // hand the whole player budget to this one
    lbClose.focus();
    document.addEventListener('keydown', onLightboxKey);
  }

  function closeLightbox() {
    if (!lbOpen) return;
    lbOpen = false;
    lbFrame.innerHTML = '';      // removing the iframe is what stops the audio
    lb.hidden = true;
    document.body.classList.remove('srl-lb-lock');
    document.removeEventListener('keydown', onLightboxKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    if (motionOK.matches) refreshPlayers();
  }

  function onLightboxKey(e) {
    if (e.key === 'Escape') { closeLightbox(); return; }
    if (e.key !== 'Tab') return;
    var f = [].slice.call(lb.querySelectorAll('button, iframe'));
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  wall.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.srl-open');
    if (btn && btn.parentNode) openLightbox(btn.parentNode);
  });

  function refreshPlayers() {
    if (lbOpen) return;          // one full-size player is enough
    var mid = window.innerHeight / 2;
    var live = allTiles
      .map(function (el) {
        var r = el.getBoundingClientRect();
        var onScreen = r.bottom > 0 && r.top < window.innerHeight;
        return { el: el, d: Math.abs((r.top + r.bottom) / 2 - mid), on: onScreen };
      })
      .filter(function (t) { return t.on; })
      .sort(function (a, b) { return a.d - b.d; })
      .slice(0, MAX_LIVE);
    var keep = live.map(function (t) { return t.el; });
    allTiles.forEach(function (el) {
      if (keep.indexOf(el) > -1) mount(el); else unmount(el);
    });
  }

  // --- scroll-driven drift ------------------------------------------------
  if (!motionOK.matches) return;   // no drift, and no autoplaying video either
  var TRAVEL = 0.18;   // fraction of a row's own width it may slide end to end

  function frame() {
    var r = section.getBoundingClientRect();
    var span = r.height + window.innerHeight;
    // -1 as the section enters from below, +1 as it leaves past the top.
    var p = span > 0 ? 1 - 2 * ((r.bottom) / span) : 0;
    p = p < -1 ? -1 : p > 1 ? 1 : p;
    rowEls.forEach(function (row, i) {
      var dir = i % 2 === 0 ? -1 : 1;             // alternate row to row
      var dist = row.scrollWidth * TRAVEL * 0.5;
      row.style.transform = 'translate3d(' + (p * dist * dir).toFixed(1) + 'px,0,0)';
    });
    refreshPlayers();
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; frame(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();
})();
// Contact lines — each value rises out of its mask the first time the panel
// comes into view. One-shot: it plays once and stays put, rather than
// re-triggering every time the footer scrolls back past.
(function () {
  var lines = Array.prototype.slice.call(document.querySelectorAll('.cta-line'));
  if (!lines.length) return;

  var show = function () { lines.forEach(function (l) { l.classList.add('is-in'); }); };
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) { show(); return; }

  // Deliberately a position test rather than an IntersectionObserver: the
  // pre-reveal state is a value pushed fully out of its own mask, so an
  // observer that never delivers would leave the number and email invisible.
  // bindScroll's frame runs once synchronously, so this resolves on load.
  var done = false;
  function check() {
    if (done) return;
    var r = lines[0].getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight * 0.92) { done = true; show(); }
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; check(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  check();
})();
