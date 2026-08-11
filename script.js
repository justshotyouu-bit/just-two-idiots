// 3D "spin the work" carousel — click-and-drag rotation with momentum.
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
  var RING_RADIUS = 650;             // ring radius — controls gap between cards
  var IMAGE_ASPECT = 2500 / 2125;
  var CARD_W = 440;
  var CARD_H = CARD_W / IMAGE_ASPECT;
  var STRIP_COUNT = 9;       // slices per card — higher = smoother curve
  var BEND_ANGLE_TOTAL = 30; // how far the card's own surface bends, edge to edge

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

  var angle = 0;
  var speed = 0;           // deg/frame — only nonzero right after a drag release (momentum)
  var dragging = false;
  var dragStartX = 0;
  var dragStartAngle = 0;
  var lastDragX = 0;
  var DRAG_SENSITIVITY = 0.35; // degrees rotated per pixel dragged
  var FRICTION = 0.94;         // how fast released momentum settles back to a stop

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
      speed *= FRICTION;
      if (Math.abs(speed) < 0.002) speed = 0;
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
    // `speed` already holds the release velocity — tick() decays it via FRICTION,
    // so a hard flick keeps spinning briefly and a slow drag just stops.
  }
  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);
  container.addEventListener('pointerleave', endDrag);
})();
