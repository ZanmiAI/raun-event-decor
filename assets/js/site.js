/* RAUN Event & Decor — site interactions (EN/FR) */
(function () {
  "use strict";

  var WA_NUMBER = "19545344854";
  var LANG_KEY = "raun_lang";
  var I18N = window.RAUN_I18N || { en: {}, fr: {} };

  // ---------- Language ----------
  function getLang() {
    try {
      var l = localStorage.getItem(LANG_KEY);
      return l === "fr" ? "fr" : "en";
    } catch (e) { return "en"; }
  }
  var lang = getLang();
  function t(key) {
    var d = I18N[lang] || {};
    return d[key] !== undefined ? d[key] : (I18N.en[key] || "");
  }

  function applyLanguage(newLang) {
    lang = newLang === "fr" ? "fr" : "en";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    var dict = I18N[lang] || {};

    document.documentElement.setAttribute("lang", lang);
    if (dict._title) document.title = dict._title;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && dict._metaDesc) metaDesc.setAttribute("content", dict._metaDesc);

    // JSON-LD FAQ schema
    var schemaEl = document.getElementById("faqSchema");
    if (schemaEl && I18N.faqSchema && I18N.faqSchema[lang]) {
      var entities = I18N.faqSchema[lang].map(function (qa) {
        return { "@type": "Question", "name": qa[0],
                 "acceptedAnswer": { "@type": "Answer", "text": qa[1] } };
      });
      schemaEl.textContent = JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage", "mainEntity": entities
      });
    }

    // data-i18n attributes
    eachAttr("data-i18n", function (el, key) { el.textContent = t(key); });
    eachAttr("data-i18n-html", function (el, key) { el.innerHTML = t(key); });
    eachAttr("data-i18n-ph", function (el, key) { el.setAttribute("placeholder", t(key)); });
    eachAttr("data-i18n-aria", function (el, key) { el.setAttribute("aria-label", t(key)); });
    eachAttr("data-i18n-alt", function (el, key) { el.setAttribute("alt", t(key)); });

    // toggle button state
    var tog = document.getElementById("langToggle");
    if (tog) {
      tog.querySelector(".lang-en").classList.toggle("active", lang === "en");
      tog.querySelector(".lang-fr").classList.toggle("active", lang === "fr");
    }

    // gallery titles follow the language
    var gs = (I18N.gallery && I18N.gallery[lang]) || {};
    if (gs.ceremony) {
      GALLERY.ceremony.title = gs.ceremony;
      GALLERY.tablescape.title = gs.tablescape;
      GALLERY.balloons.title = gs.balloons;
    }
  }

  function eachAttr(attr, fn) {
    var els = document.querySelectorAll("[" + attr + "]");
    for (var i = 0; i < els.length; i++) fn(els[i], els[i].getAttribute(attr));
  }

  // ---------- Mobile nav ----------
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { nav.classList.remove("open"); });
    });
  }

  // ---------- Active nav link on scroll ----------
  var links = document.querySelectorAll(".nav-link");
  var sections = ["top", "services", "gallery", "rentals", "about", "contact"]
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  function setActive() {
    var current = "top";
    sections.forEach(function (s) {
      if (window.scrollY >= s.offsetTop - 140) current = s.id;
    });
    links.forEach(function (l) {
      l.classList.toggle("active", l.getAttribute("href") === "#" + current);
    });
  }
  window.addEventListener("scroll", setActive, { passive: true });
  setActive();

  // ---------- Booking form -> WhatsApp ----------
  var form = document.getElementById("bookingForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fs = (I18N.form && I18N.form[lang]) || I18N.form.en;
      var name = document.getElementById("fName").value.trim();
      var phone = document.getElementById("fPhone").value.trim();
      var date = document.getElementById("fDate").value;
      var guests = document.getElementById("fGuests").value;
      var type = document.getElementById("fType").value;
      var notes = document.getElementById("fNotes").value.trim();
      // Use the visible (translated) checkbox labels
      var services = Array.prototype.slice
        .call(form.querySelectorAll('input[name="svc"]:checked'))
        .map(function (c) {
          var span = c.closest("label").querySelector("span[data-i18n]");
          return span ? span.textContent.trim() : c.value;
        });

      if (!name || !phone || !date) {
        alert(fs.alert);
        return;
      }

      var lines = [
        fs.hello,
        "",
        fs.name + " " + name,
        fs.phone + " " + phone,
        fs.date + " " + date,
        fs.type + " " + type
      ];
      if (guests) lines.push(fs.guests + " " + guests);
      if (services.length) lines.push(fs.services + " " + services.join(", "));
      if (notes) lines.push(fs.details + " " + notes);

      var url = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
    });
  }

  // ---------- Gallery: hover slideshow + lightbox ----------
  var GALLERY = {
    ceremony:   { title: "Wedding Ceremony",      photos: ["assets/img/gallery/ceremony.webp"] },
    tablescape: { title: "Reception Styling",      photos: ["assets/img/gallery/tablescape.webp"] },
    balloons:   { title: "Balloon Installations",  photos: ["assets/img/gallery/balloons.webp"] }
  };

  var lb = null, lbImg = null, lbCap = null, lbCount = null;
  var lbCat = null, lbIdx = 0;

  function lbStrings() {
    return (I18N.gallery && I18N.gallery[lang]) || I18N.gallery.en;
  }

  function buildLightbox() {
    var gs = lbStrings();
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-label", gs.viewer);
    lb.innerHTML =
      '<button class="lb-btn lb-close" aria-label="' + gs.close + '">&times;</button>' +
      '<button class="lb-btn lb-prev" aria-label="' + gs.prev + '">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-btn lb-next" aria-label="' + gs.next + '">&#8250;</button>' +
      '<div class="lb-caption"></div><div class="lb-count"></div>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector("img");
    lbCap = lb.querySelector(".lb-caption");
    lbCount = lb.querySelector(".lb-count");
    lb.querySelector(".lb-close").addEventListener("click", closeLightbox);
    lb.querySelector(".lb-prev").addEventListener("click", function (e) { e.stopPropagation(); stepLightbox(-1); });
    lb.querySelector(".lb-next").addEventListener("click", function (e) { e.stopPropagation(); stepLightbox(1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") stepLightbox(-1);
      if (e.key === "ArrowRight") stepLightbox(1);
    });
  }

  function openLightbox(cat, idx) {
    if (!lb) buildLightbox();
    lbCat = cat; lbIdx = idx || 0;
    renderLightbox();
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function renderLightbox() {
    var gs = lbStrings();
    var g = GALLERY[lbCat];
    lbImg.src = g.photos[lbIdx];
    lbImg.alt = g.title + " " + gs.photo + " " + (lbIdx + 1);
    lbCap.textContent = g.title;
    lbCount.textContent = g.photos.length > 1 ? (lbIdx + 1) + " / " + g.photos.length : "";
  }
  function stepLightbox(d) {
    var n = GALLERY[lbCat].photos.length;
    lbIdx = (lbIdx + d + n) % n;
    renderLightbox();
  }
  function closeLightbox() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-gallery]").forEach(function (fig) {
    var cat = fig.getAttribute("data-gallery");
    var g = GALLERY[cat];
    if (!g) return;
    var img = fig.querySelector("img");
    var timer = null, i = 0;
    fig.addEventListener("mouseenter", function () {
      if (g.photos.length < 2) return;
      timer = setInterval(function () {
        i = (i + 1) % g.photos.length;
        img.src = g.photos[i];
      }, 1400);
    });
    fig.addEventListener("mouseleave", function () {
      if (timer) { clearInterval(timer); timer = null; }
      i = 0; img.src = g.photos[0];
    });
    var open = function () { openLightbox(cat, 0); };
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  // ---------- Chatbot (language-aware) ----------
  function chatbotConfigUrl() {
    return lang === "fr"
      ? "chatbot/raun-config-fr.json?v=20261005a"
      : "chatbot/raun-config.json?v=20261004e";
  }
  function initChatbot() {
    if (!window.SmartAssistant) return;
    if (window.SmartAssistant.destroy) window.SmartAssistant.destroy();
    fetch(chatbotConfigUrl())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (config) {
        if (config) { try { window.SmartAssistant.init(config); } catch (err) {} }
      })
      .catch(function () { /* chatbot is optional */ });
  }

  // ---------- Language toggle ----------
  var langToggle = document.getElementById("langToggle");
  if (langToggle) {
    langToggle.addEventListener("click", function () {
      applyLanguage(lang === "en" ? "fr" : "en");
      initChatbot(); // reload chatbot in the new language
    });
  }

  // ---------- Boot ----------
  applyLanguage(lang);
  initChatbot();
})();
