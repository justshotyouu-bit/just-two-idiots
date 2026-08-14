// 3D "spin the work" carousel — revolves continuously at a steady pace;
// click-and-drag speeds it up or reverses it, then it settles back to drifting.
// Each card is built from thin vertical strips, each rotated a fraction of a
// degree more than its neighbor, so the panel itself curves into a shallow
// cylinder (like a bent screen) instead of staying a flat rectangle that's
// just rotated to face away from the camera.
(function () {
  var container = document.getElementById('carousel-container');
  var stage = document.getElementById('carousel-stage');
  if (!container || !stage) return;

  // Real project screenshots — full frame, no cropping. Cards are sized to
  // this exact 2500x2125 aspect ratio so background-size can show each image
  // whole, edge to edge, with nothing cut off.
  var PROJECTS = [
    { image: 'assets/work/fig.jpg', name: 'Fig', category: 'Lighting & Living — eCommerce' },
    { image: 'assets/work/getmyrugs.jpg', name: 'GetMyRugs', category: 'Handmade Rugs — eCommerce' },
    { image: 'assets/work/rugs499.jpg', name: 'Rugs499', category: 'Handmade Rugs — eCommerce' },
    { image: 'assets/work/urbanrugs.jpg', name: 'Urban Rugs', category: 'Islamic Prayer Wear — eCommerce' },
    { image: 'assets/work/parmandesigns.jpg', name: 'Parman Designs', category: 'Furniture & Decor — Brand site' },
    { image: 'assets/work/justshotyou.jpg', name: 'justshotyou', category: 'Photography & Film — Portfolio' }
  ];

  var CARD_COUNT = PROJECTS.length;
  var RING_ANGLE = 360 / CARD_COUNT; // degrees between card centers
  var RING_RADIUS = 820;             // ring radius — controls gap between cards;
                                      // wide enough that neighboring cards (only
                                      // 60deg apart) don't visually collide with
                                      // the front card's edge
  var IMAGE_ASPECT = 2500 / 2125;
  var CARD_W = 440;
  var CARD_H = CARD_W / IMAGE_ASPECT;
  var STRIP_COUNT = 15;    // slices per card — higher = smoother curve, cleaner
                             // rounded corners on the first/last strip
  var BEND_ANGLE_TOTAL = 6; // how far the card's own surface bends, edge to edge —
                             // kept subtle so real screenshots (straight nav bars,
                             // buttons) don't visibly compress/crop near the edges

  var stripW = CARD_W / STRIP_COUNT;
  var bendStep = BEND_ANGLE_TOTAL / (STRIP_COUNT - 1);
  var bendRadius = (stripW / 2) / Math.tan((bendStep / 2) * Math.PI / 180);

  var cards = []; // {el, baseAngle} — used to cull cards on the far side of the ring each frame

  for (var c = 0; c < CARD_COUNT; c++) {
    var project = PROJECTS[c];
    var card = document.createElement('div');
    card.className = 'carousel-card';
    card.style.width = CARD_W + 'px';
    card.style.height = CARD_H + 'px';
    card.style.marginTop = (-CARD_H / 2) + 'px';
    card.style.marginLeft = (-CARD_W / 2) + 'px';
    var baseAngle = c * RING_ANGLE;
    card.style.transform = 'rotateY(' + baseAngle + 'deg) translateZ(' + RING_RADIUS + 'px)';
    cards.push({ el: card, baseAngle: baseAngle });

    for (var s = 0; s < STRIP_COUNT; s++) {
      var strip = document.createElement('div');
      strip.className = 'carousel-strip';
      var offset = s - (STRIP_COUNT - 1) / 2;
      // All strips start stacked on the card's own center axis (no static
      // left offset) so rotateY pivots each one around the SAME shared axis —
      // that's what fans them into one continuous curved surface instead of
      // each strip rotating around its own off-center position.
      strip.style.width = stripW + 'px';
      strip.style.left = '50%';
      strip.style.marginLeft = (-stripW / 2) + 'px';
      strip.style.backgroundImage = 'url(' + project.image + ')';
      // backgroundSize matches the full card width/height exactly (same
      // aspect ratio as the source image), so the whole photo shows —
      // nothing is cropped, each strip just reveals its own slice of it.
      strip.style.backgroundSize = CARD_W + 'px ' + CARD_H + 'px';
      strip.style.backgroundPosition = (-s * stripW) + 'px 0';
      strip.style.transform = 'rotateY(' + (offset * bendStep) + 'deg) translateZ(' + bendRadius + 'px)';
      card.appendChild(strip);
    }

    var overlay = document.createElement('div');
    overlay.className = 'carousel-card-overlay';
    overlay.style.transform = 'translateZ(' + bendRadius + 'px)';
    card.appendChild(overlay);

    var caption = document.createElement('div');
    caption.className = 'carousel-card-caption';
    caption.style.transform = 'translateZ(' + bendRadius + 'px)';
    caption.innerHTML = '<div class="carousel-card-caption-name">' + project.name + '</div>' +
      '<div class="carousel-card-caption-category">' + project.category + '</div>';
    card.appendChild(caption);

    stage.appendChild(card);
  }

  var IDLE_SPEED = 0.12;   // deg/frame — steady "Earth around the Sun" baseline drift
  var angle = 0;
  var speed = IDLE_SPEED;  // deg/frame — eases toward IDLE_SPEED when not dragging
  var dragging = false;
  var dragStartX = 0;
  var dragStartAngle = 0;
  var lastDragX = 0;
  var DRAG_SENSITIVITY = 0.35; // degrees rotated per pixel dragged
  var SETTLE = 0.05;           // how fast speed eases back toward IDLE_SPEED after a drag

  container.style.cursor = 'grab';
  container.style.touchAction = 'none';

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
    // Cards on the far side of the ring face away from the camera; their
    // nested strip transforms land in a degenerate part of the perspective
    // projection there and render as huge distorted slabs, so just stop
    // drawing a card once it rotates past the front-facing arc.
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

// Services grid — magnetic tilt: each card tilts in 3D toward the cursor,
// like tilting a photo in your hand, and eases back flat on mouse-leave.
(function () {
  var cards = document.querySelectorAll('.svc-card');
  if (!cards.length) return;

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
