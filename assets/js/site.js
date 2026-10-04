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
