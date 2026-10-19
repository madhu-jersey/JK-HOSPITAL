/* J.K Hospital — interactions
   All scroll-driven behaviour uses IntersectionObserver (no scroll listeners). */
(function () {
  "use strict";

  var I18N = window.JK_I18N || { te: {}, dynamic: { en: {}, te: {} }, meta: {} };
  var root = document.documentElement;
  var STORE_KEY = "jk-lang";
  var lang = root.lang === "te" ? "te" : "en";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var hasIO = "IntersectionObserver" in window;

  function store(value) { try { localStorage.setItem(STORE_KEY, value); } catch (e) { /* private mode */ } }
  function dyn(key) { return (I18N.dynamic[lang] || {})[key] || I18N.dynamic.en[key] || key; }
  function te(key) { return (I18N.te || {})[key]; }

  /* ---------- Language ---------- */
  var textNodes = Array.prototype.slice.call(document.querySelectorAll("[data-i18n]"));
  var ariaNodes = Array.prototype.slice.call(document.querySelectorAll("[data-i18n-aria]"));
  var altNodes = Array.prototype.slice.call(document.querySelectorAll("[data-i18n-alt]"));
  var original = new WeakMap();
  textNodes.forEach(function (el) { original.set(el, el.innerHTML); });
  ariaNodes.forEach(function (el) { el.dataset.enAria = el.getAttribute("aria-label") || ""; });
  altNodes.forEach(function (el) { el.dataset.enAlt = el.getAttribute("alt") || ""; });

  var metaDesc = document.querySelector('meta[name="description"]');
  var ogLocale = document.querySelector('meta[property="og:locale"]');

  function applyLang(next) {
    lang = next === "te" ? "te" : "en";
    var dict = I18N.te || {};
    textNodes.forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      el.innerHTML = lang === "te" && key in dict ? dict[key] : original.get(el);
    });
    ariaNodes.forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      el.setAttribute("aria-label", lang === "te" && dict[key] ? dict[key] : el.dataset.enAria);
    });
    altNodes.forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      el.setAttribute("alt", lang === "te" && dict[key] ? dict[key] : el.dataset.enAlt);
    });
    root.lang = lang;
    var meta = (I18N.meta || {})[lang];
    if (meta) {
      document.title = meta.title;
      if (metaDesc) metaDesc.setAttribute("content", meta.description);
    }
    if (ogLocale) ogLocale.setAttribute("content", lang === "te" ? "te_IN" : "en_IN");
    document.querySelectorAll(".lang-toggle button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    updateStatus();
    syncGalleryLabel();
    syncNavLabel();
    setupReadMore();
  }

  /* Keep the block at the top of the screen in place when text length changes */
  var ANCHORS = "main section, .section-head, main article, main li, .rating-card, .partners, .hours-card, .er-card, .contact-card, .map-card, .about-card, .doctor-info > *, .site-footer";
  function captureAnchor() {
    if (window.scrollY < 10) return null;
    /* the first block that starts below the header is what the reader is looking at */
    var y = document.querySelector(".site-header").getBoundingClientRect().bottom;
    var best = null, bestTop = Infinity;
    document.querySelectorAll(ANCHORS).forEach(function (el) {
      var top = el.getBoundingClientRect().top;
      if (top >= y && top < bestTop && el.offsetParent) { best = el; bestTop = top; }
    });
    return best ? { el: best, top: bestTop } : null;
  }
  function restoreAnchor(anchor) {
    if (!anchor) return;
    var delta = anchor.el.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
  }

  function switchLang(next) {
    if (next === lang) return;
    store(next);
    if (reduceMotion.matches) { var a = captureAnchor(); applyLang(next); restoreAnchor(a); return; }
    clearTimeout(fadeTimer);
    root.classList.add("lang-switching", "lang-fading");
    fadeTimer = setTimeout(function () {
      var anchor = captureAnchor();
      applyLang(next);
      restoreAnchor(anchor);
      fadeTimer = setTimeout(function () {
        root.classList.remove("lang-fading");
        fadeTimer = setTimeout(function () { root.classList.remove("lang-switching"); }, 220);
      }, 20);
    }, 180);
  }
  var fadeTimer;

  document.querySelectorAll(".lang-toggle button").forEach(function (btn) {
    btn.addEventListener("click", function () { switchLang(btn.dataset.lang); });
  });

  /* ---------- Mobile navigation (scroll-locked) ---------- */
  var nav = document.getElementById("main-nav");
  var navToggle = document.querySelector(".nav-toggle");
  var navIcon = navToggle && navToggle.querySelector("use");
  var backdrop = document.querySelector(".nav-backdrop");

  function syncNavLabel() {
    if (!navToggle) return;
    var open = nav.classList.contains("open");
    navToggle.setAttribute("aria-label", open ? dyn("menu.close") : (lang === "te" ? te("menu") : navToggle.dataset.enAria));
  }
  function setNav(open) {
    nav.classList.toggle("open", open);
    root.classList.toggle("nav-locked", open);
    navToggle.setAttribute("aria-expanded", String(open));
    if (navIcon) navIcon.setAttribute("href", open ? "#i-x" : "#i-menu");
    syncNavLabel();
  }
  if (navToggle) {
    navToggle.addEventListener("click", function () { setNav(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
    if (backdrop) backdrop.addEventListener("click", function () { setNav(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { setNav(false); navToggle.focus(); }
    });
    window.matchMedia("(min-width: 1280px)").addEventListener("change", function (mq) { if (mq.matches) setNav(false); });
  }

  /* ---------- Header state, back-to-top, active link ---------- */
  var header = document.querySelector(".site-header");
  var toTop = document.querySelector(".to-top");
  var hero = document.querySelector(".hero");
  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));

  if (hasIO) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle("scrolled", !entries[0].isIntersecting);
    }).observe(document.querySelector(".top-sentinel"));

    if (toTop && hero) {
      new IntersectionObserver(function (entries) {
        toTop.classList.toggle("show", !entries[0].isIntersecting);
      }, { rootMargin: "0px 0px -40% 0px" }).observe(hero);
    }

    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.classList.contains("hero") ? "top" : entry.target.id;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sectionIO.observe(hero);
    document.querySelectorAll("main section[id]").forEach(function (s) { sectionIO.observe(s); });
  }

  /* ---------- Reveals (once, ~20% visible): .reveal blocks, .stagger children, .wipe photos ---------- */
  var reveals = document.querySelectorAll(".reveal, .stagger, .wipe");
  document.querySelectorAll(".stagger").forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) { child.style.setProperty("--i", Math.min(i, 10)); });
  });
  function markRevealed(el) {
    /* after the entrance, drop delays so hover/press feel instant */
    var wait = el.classList.contains("stagger") ? 900 + el.children.length * 80 : el.classList.contains("wipe") ? 1800 : 1300;
    setTimeout(function () { el.classList.add("revealed"); }, wait);
  }
  if (hasIO && !reduceMotion.matches) {
    var batch = [];
    var flush = null;
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealIO.unobserve(entry.target);
        batch.push(entry.target);
      });
      if (!flush) flush = setTimeout(function () {
        /* stagger items that enter together, per parent */
        var perParent = new Map();
        batch.forEach(function (el) {
          var n = perParent.get(el.parentElement) || 0;
          perParent.set(el.parentElement, n + 1);
          el.style.setProperty("--d", Math.min(n, 6) * 0.09 + "s");
          el.classList.add("in");
          markRevealed(el);
        });
        batch = []; flush = null;
      }, 16);
    }, { threshold: 0.2, rootMargin: "0px 0px -4% 0px" });
    reveals.forEach(function (el) { revealIO.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in", "revealed"); });
  }

  /* ---------- Image fade-in ---------- */
  document.querySelectorAll(".hero-photo img, .doctor-photo-card img, .gallery-item img").forEach(function (img) {
    if (img.complete && img.naturalWidth) return;
    img.classList.add("is-loading");
    var clear = function () { img.classList.remove("is-loading"); };
    img.addEventListener("load", clear, { once: true });
    img.addEventListener("error", clear, { once: true });
  });

  /* ---------- Gallery ---------- */
  var galleryToggle = document.getElementById("gallery-toggle");
  var galleryMore = document.getElementById("gallery-more");
  var galleryLabel = galleryToggle && galleryToggle.querySelector("[data-i18n]");

  function syncGalleryLabel() {
    if (galleryToggle && galleryToggle.getAttribute("aria-expanded") === "true") galleryLabel.textContent = dyn("fac.less");
  }
  if (galleryToggle) {
    galleryToggle.addEventListener("click", function () {
      var expand = galleryToggle.getAttribute("aria-expanded") !== "true";
      if (galleryMore) galleryMore.hidden = !expand;
      galleryToggle.setAttribute("aria-expanded", String(expand));
      galleryLabel.innerHTML = expand ? dyn("fac.less") : (lang === "te" ? te("fac.more") : original.get(galleryLabel));
      if (expand && galleryMore) galleryMore.querySelector(".gallery-item").focus({ preventScroll: true });
      if (!expand) document.getElementById("gallery").scrollIntoView({ block: "nearest" });
    });
  }

  /* ---------- Lightbox: prev/next, arrow keys, swipe ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    var items = Array.prototype.slice.call(document.querySelectorAll(".gallery-item"));
    var lbImg = document.createElement("img");
    lbImg.decoding = "async";
    lightbox.insertBefore(lbImg, lightbox.querySelector(".lightbox-count"));
    var lbCount = lightbox.querySelector(".lightbox-count");
    var index = 0;

    function show(i) {
      index = (i + items.length) % items.length;
      var item = items[index];
      var src = item.dataset.full;
      lbCount.textContent = (index + 1) + " / " + items.length;
      lbImg.alt = item.querySelector("img").alt;
      if (!lightbox.open) { lbImg.src = src; return; }
      lbImg.classList.add("swap");
      setTimeout(function () {
        lbImg.onload = function () { lbImg.classList.remove("swap"); };
        lbImg.src = src;
        if (lbImg.complete) lbImg.classList.remove("swap");
      }, 160);
      /* warm the next photo */
      new Image().src = items[(index + 1) % items.length].dataset.full;
    }
    items.forEach(function (item, i) {
      item.addEventListener("click", function () { show(i); lightbox.showModal(); });
    });
    lightbox.querySelector(".lightbox-prev").addEventListener("click", function () { show(index - 1); });
    lightbox.querySelector(".lightbox-next").addEventListener("click", function () { show(index + 1); });
    lightbox.querySelector(".lightbox-close").addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
    });
    var startX = null;
    lightbox.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Review "Read more" ---------- */
  function setupReadMore() {
    document.querySelectorAll(".review-card").forEach(function (card) {
      var text = card.querySelector(".review-text");
      var btn = card.querySelector(".read-more");
      if (card.dataset.expanded === "true") { btn.textContent = dyn("rev.less"); return; }
      text.classList.add("clamp");
      btn.hidden = text.scrollHeight <= text.clientHeight + 2;
    });
  }
  document.querySelectorAll(".review-card .read-more").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".review-card");
      var text = card.querySelector(".review-text");
      var expanded = card.dataset.expanded === "true";
      card.dataset.expanded = String(!expanded);
      text.classList.toggle("clamp", expanded);
      btn.setAttribute("aria-expanded", String(!expanded));
      btn.innerHTML = expanded ? (lang === "te" ? te("rev.more") : original.get(btn)) : dyn("rev.less");
    });
  });
  var resizeTimer;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(setupReadMore, 200); });

  /* ---------- Reviews carousel (mobile/tablet): swipe, dots, gentle autoplay ---------- */
  (function () {
    var track = document.getElementById("review-track");
    var dotsWrap = document.querySelector(".carousel-dots");
    if (!track || !dotsWrap || !hasIO) return;
    var cards = Array.prototype.slice.call(track.querySelectorAll(".review-card"));
    var mq = window.matchMedia("(max-width: 960px)");
    var current = 0, timer = null, pausedUntil = 0, hovering = false, inView = false;

    var dots = cards.map(function (card, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", (i + 1) + " / " + cards.length);
      b.addEventListener("click", function () { go(i); pausedUntil = Date.now() + 10000; });
      dotsWrap.appendChild(b);
      return b;
    });
    function paint() { dots.forEach(function (d, i) { d.setAttribute("aria-current", String(i === current)); }); }
    function go(i) { track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: reduceMotion.matches ? "auto" : "smooth" }); }

    var cardIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { current = cards.indexOf(e.target); paint(); } });
    }, { root: track, threshold: 0.6 });
    cards.forEach(function (c) { cardIO.observe(c); });
    new IntersectionObserver(function (entries) { inView = entries[0].isIntersecting; }, { threshold: 0.4 }).observe(track);

    function tick() {
      if (!mq.matches || hovering || !inView || document.hidden || Date.now() < pausedUntil) return;
      if (track.querySelector('[data-expanded="true"]')) return;
      go((current + 1) % cards.length);
    }
    function start() { stop(); if (mq.matches && !reduceMotion.matches) timer = setInterval(tick, 6000); paint(); }
    function stop() { if (timer) clearInterval(timer); timer = null; }

    track.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hovering = true; });
    track.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hovering = false; });
    track.addEventListener("touchstart", function () { pausedUntil = Date.now() + 10000; }, { passive: true });
    track.addEventListener("focusin", function () { hovering = true; });
    track.addEventListener("focusout", function () { hovering = false; });
    mq.addEventListener("change", start);
    start();
  })();

  /* ---------- OP status (India time) ---------- */
  var statusEl = document.getElementById("op-status");
  var hourRows = document.querySelectorAll(".hours-row");
  var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function nowInIndia() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
      return { day: DAYS[get("weekday")], mins: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
    } catch (e) {
      var d = new Date();
      return { day: d.getDay(), mins: d.getHours() * 60 + d.getMinutes() };
    }
  }

  function updateStatus() {
    if (!statusEl) return;
    var now = nowInIndia();
    var key, t, open = false;
    if (now.day === 0) { key = "status.monday"; t = "t.11"; }
    else if (now.mins < 660) { key = "status.later"; t = "t.11"; }
    else if (now.mins < 840) { key = "status.open"; t = "t.14"; open = true; }
    else if (now.mins < 1080) { key = "status.later"; t = "t.18"; }
    else if (now.mins < 1260) { key = "status.open"; t = "t.21"; open = true; }
    else if (now.day === 6) { key = "status.mondayLater"; t = "t.11"; }
    else { key = "status.tomorrow"; t = "t.11"; }
    statusEl.textContent = dyn(key).replace("{t}", dyn(t));
    statusEl.classList.toggle("open", open);
    hourRows.forEach(function (row) {
      var isSunRow = row.dataset.days === "0";
      row.classList.toggle("is-today", now.day === 0 ? isSunRow : !isSunRow);
    });
  }
  setInterval(updateStatus, 60000);

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* English is already in the HTML: only rewrite the DOM for Telugu */
  if (lang === "te") applyLang(lang);
  else { updateStatus(); setupReadMore(); }
})();
