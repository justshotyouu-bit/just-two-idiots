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

// Mobile navigation — the five nav items don't fit a phone header, so below
// 900px they live in a panel behind the toggle. Closes on Escape, on an
// outside click, on picking a link, and on growing back to desktop width.
(function () {
  var toggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Leaving mobile with the panel open would otherwise strand `is-open` on
  // the desktop nav, where the class means nothing but the state lies.
  var desktop = window.matchMedia('(min-width: 901px)');
  var onChange = function (e) { if (e.matches) setOpen(false); };
  if (desktop.addEventListener) desktop.addEventListener('change', onChange);
  else if (desktop.addListener) desktop.addListener(onChange);
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
