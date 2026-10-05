/* RAUN Event & Decor — site interactions */
(function () {
  "use strict";

  var WA_NUMBER = "19545344854";

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
      var name = document.getElementById("fName").value.trim();
      var phone = document.getElementById("fPhone").value.trim();
      var date = document.getElementById("fDate").value;
      var guests = document.getElementById("fGuests").value;
      var type = document.getElementById("fType").value;
      var notes = document.getElementById("fNotes").value.trim();
      var services = Array.prototype.slice
        .call(form.querySelectorAll('input[name="svc"]:checked'))
        .map(function (c) { return c.value; });

      if (!name || !phone || !date) {
        alert("Please fill in your name, phone, and event date so we can reach you.");
        return;
      }

      var lines = [
        "Hi RAUN Event & Decor! I'd like a quote for my event.",
        "",
        "Name: " + name,
        "Phone: " + phone,
        "Event date: " + date,
        "Event type: " + type
      ];
      if (guests) lines.push("Guests (approx.): " + guests);
      if (services.length) lines.push("Services needed: " + services.join(", "));
      if (notes) lines.push("Details: " + notes);

      var url = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));
      window.open(url, "_blank", "noopener");
    });
  }

  // ---------- Gallery: hover slideshow + lightbox ----------
  // To add real photos later, just append file paths to the photos arrays below.
  var GALLERY = {
    ceremony:   { title: "Wedding Ceremony",      photos: ["assets/img/gallery/ceremony.webp"] },
    tablescape: { title: "Reception Styling",      photos: ["assets/img/gallery/tablescape.webp"] },
    balloons:   { title: "Balloon Installations",  photos: ["assets/img/gallery/balloons.webp"] }
  };

  var lb = null, lbImg = null, lbCap = null, lbCount = null;
  var lbCat = null, lbIdx = 0;

  function buildLightbox() {
    lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-label", "Photo viewer");
    lb.innerHTML =
      '<button class="lb-btn lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-btn lb-prev" aria-label="Previous photo">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-btn lb-next" aria-label="Next photo">&#8250;</button>' +
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
    var g = GALLERY[lbCat];
    lbImg.src = g.photos[lbIdx];
    lbImg.alt = g.title + " photo " + (lbIdx + 1);
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
    // Hover: cycle through the category's photos
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
    // Click / Enter: open lightbox
    var open = function () { openLightbox(cat, 0); };
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  // ---------- Chatbot ----------
  function initChatbot(config) {
    if (window.SmartAssistant && config) {
      try { window.SmartAssistant.init(config); }
      catch (err) { /* chatbot is optional — never break the page */ }
    }
  }
  fetch("chatbot/raun-config.json")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(initChatbot)
    .catch(function () { /* chatbot is optional */ });
})();
