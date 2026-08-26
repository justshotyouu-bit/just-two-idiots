// Phone header disclosure — shared by index.html and who-we-are.html.
//
// It lives in its own file rather than in script.js because who-we-are.html
// loads only who-we-are.js: anything put in script.js would leave that page
// with a toggle that does nothing and its three links unreachable, which is
// worse than the crowding this is meant to fix. One small deferred file is
// cheaper than the same sixty lines copied into two entry points and then
// drifting apart.
//
// Progressive enhancement, deliberately: the collapsed bar is gated on the
// `has-nav-js` class this file adds. If the file never runs, the stylesheet
// falls through to the old always-visible row — cramped, but every link
// still reachable. The menu can never be the reason a page loses its
// navigation.
(function () {
  var root = document.documentElement;
  var header = document.getElementById('site-header');
  if (!header) return;

  var nav = header.querySelector('.site-nav');
  var toggle = header.querySelector('.nav-toggle');
  if (!nav || !toggle) return;

  // Only now is it safe for the stylesheet to hide the links behind a button.
  root.classList.add('has-nav-js');

  function setOpen(open) {
    header.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!isOpen());
  });

  // Following a link should put the sheet away. On the homepage these are
  // in-page anchors, so nothing navigates and the sheet would otherwise sit
  // there over the section the reader just asked for.
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Crossing back to the desktop bar while the sheet is open would otherwise
  // leave `nav-open` set, and the toggle reporting expanded when it is not
  // even on screen.
  if (window.matchMedia) {
    var wide = window.matchMedia('(min-width: 521px)');
    var reset = function (m) { if (m.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', reset);
    else if (wide.addListener) wide.addListener(reset);
  }
})();
