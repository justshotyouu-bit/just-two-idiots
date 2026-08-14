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

// Services grid — magnetic tilt: each card tilts in 3D toward the cursor,
// like tilting a photo in your hand, and eases back flat on mouse-leave.
(function () {
  var cards = document.querySelectorAll('.svc-card');
  if (!cards.length) return;
  // Touch devices fire a single mousemove on tap and never a mouseleave, so
  // the tapped card would stay stuck mid-tilt. Pointer-only.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var MAX_TILT = 9; // degrees at the card's edge

  cards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var rotateY = (px - 0.5) * MAX_TILT * 2;
      var rotateX = (0.5 - py) * MAX_TILT * 2;
      card.style.transition = 'transform 0.1s ease-out, box-shadow 0.6s ease';
      card.style.transform = 'perspective(900px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) translateY(-6px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transition = 'transform 0.6s cubic-bezier(.16,1,.3,1), box-shadow 0.6s ease';
      card.style.transform = '';
    });
  });
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
