/*!
 * Zanmi Connect — Smart Assistant engine v1.0.0
 *
 * A dependency-free, config-driven, rule-based chat assistant.
 * Branch -> intent -> recommendation decision tree, all in the browser.
 * No network calls, no external APIs, no AI cost. Everything it says
 * comes from the JSON config passed to SmartAssistant.init(config).
 *
 * Usage:
 *   SmartAssistant.init(config);
 *
 * See modules/smart-assistant/README.md for the config schema and the
 * Shopify install snippet.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";
  var PREFIX = "sa";
  var alreadyInit = false;

  // ---------------------------------------------------------------- defaults

  var DEFAULT_UI = {
    inputPlaceholder: "Type a message...",
    launcherLabel: "Chat with us",
    restartLabel: "Restart chat",
    closeLabel: "Close chat",
    sendLabel: "Send",
    micLabel: "Speak instead of typing",
    repeatNudge: "I just shared that right above \u2014 tap below and I'll connect you with the team directly."
  };

  // ------------------------------------------------------------------ helpers

  function isObj(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function esc(s) {
    return String(s == null ? "" : s);
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function waLink(number, text) {
    return "https://wa.me/" + String(number).replace(/\D/g, "") +
      "?text=" + encodeURIComponent(text || "");
  }

  function validateConfig(config) {
    var problems = [];
    if (!isObj(config)) problems.push("config must be an object");
    if (config && !isObj(config.brand)) problems.push("config.brand is required");
    if (config && !isObj(config.nodes) || (config && Object.keys(config.nodes || {}).length === 0))
      problems.push("config.nodes must be a non-empty object");
    if (config && config.start && !config.nodes[config.start])
      problems.push('start node "' + config.start + '" not found in config.nodes');
    return problems;
  }

  // ------------------------------------------------------------------ engine

  function Assistant(config) {
    this.cfg = config;
    this.brand = config.brand || {};
    this.colors = this.brand.colors || {};
    this.ui = {};
    for (var k in DEFAULT_UI) this.ui[k] = DEFAULT_UI[k];
    if (isObj(config.ui)) for (var k2 in config.ui) this.ui[k2] = config.ui[k2];
    this.wa = config.whatsapp || {};
    this.root = null;
    this.msgBox = null;
    this.replyBar = null;
    this.input = null;
    this.opened = false;
    this.busy = false;
  }

  Assistant.prototype.primary = function () {
    return this.colors.primary || "#3D2358";
  };

  // -- styles ---------------------------------------------------------------

  Assistant.prototype.injectStyles = function () {
    if (document.getElementById(PREFIX + "-styles")) return;
    var c = this.colors;
    var primary = c.primary || "#3D2358";
    var secondary = c.secondary || "#7A4FB0";
    var accent = c.accent || "#C9B3EC";
    var bg = c.background || "#FFFFFF";
    var text = c.text || "#2B2B2B";
    var font = this.brand.font ? "'" + this.brand.font + "', " : "";
    var css =
      "." + PREFIX + "-launcher{position:fixed;right:20px;bottom:20px;width:60px;height:60px;" +
      "border-radius:50%;border:none;cursor:pointer;z-index:999999;" +
      "background:linear-gradient(135deg," + primary + " 0%," + secondary + " 100%);" +
      "box-shadow:0 6px 20px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;" +
      "transition:transform .15s ease}" +
      "." + PREFIX + "-launcher:hover{transform:scale(1.06)}" +
      "." + PREFIX + "-launcher svg{width:28px;height:28px;fill:#fff}" +
      "." + PREFIX + "-panel{position:fixed;right:20px;bottom:92px;width:380px;max-width:calc(100vw - 40px);" +
      "height:560px;max-height:calc(100vh - 130px);z-index:999999;background:" + bg + ";" +
      "border-radius:18px;box-shadow:0 12px 44px rgba(0,0,0,.30);display:none;" +
      "flex-direction:column;overflow:hidden;font-family:" + font + "Arial,Helvetica,sans-serif}" +
      "." + PREFIX + "-panel." + PREFIX + "-open{display:flex}" +
      "." + PREFIX + "-header{background:linear-gradient(135deg," + primary + " 0%," + secondary + " 100%);" +
      "color:#fff;padding:14px 14px;display:flex;align-items:center;gap:10px}" +
      "." + PREFIX + "-avatar{width:40px;height:40px;border-radius:50%;background:" + accent + ";" +
      "color:" + primary + ";font-weight:800;font-size:20px;display:flex;align-items:center;" +
      "justify-content:center;flex:none}" +
      "." + PREFIX + "-title{flex:1;min-width:0}" +
      "." + PREFIX + "-name{font-weight:700;font-size:15px;line-height:1.2}" +
      "." + PREFIX + "-tag{font-size:12px;opacity:.88;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "." + PREFIX + "-powered{font-size:11px;opacity:.8;margin-top:2px}" +
      "." + PREFIX + "-powered a{color:#fff;text-decoration:underline}" +
      "." + PREFIX + "-mic{width:44px;height:44px;border-radius:50%;border:1.5px solid #ddd;background:#fff;" +
      "cursor:pointer;font-size:18px;flex:none;display:flex;align-items:center;justify-content:center}" +
      "." + PREFIX + "-mic:hover{border-color:" + secondary + "}" +
      "." + PREFIX + "-listening{background:#e5484d !important;border-color:#e5484d !important;" +
      "animation:" + PREFIX + "-blink 1.1s infinite}" +
      "." + PREFIX + "-hbtn{background:rgba(255,255,255,.16);border:none;color:#fff;width:32px;height:32px;" +
      "border-radius:50%;cursor:pointer;font-size:15px;line-height:1;display:flex;align-items:center;" +
      "justify-content:center;flex:none}" +
      "." + PREFIX + "-hbtn:hover{background:rgba(255,255,255,.32)}" +
      "." + PREFIX + "-msgs{flex:1;overflow-y:auto;padding:16px 12px;display:flex;flex-direction:column;gap:10px;" +
      "background:" + bg + "}" +
      "." + PREFIX + "-row{display:flex;gap:8px;align-items:flex-end}" +
      "." + PREFIX + "-row." + PREFIX + "-user{justify-content:flex-end}" +
      "." + PREFIX + "-mini{width:28px;height:28px;border-radius:50%;background:" + accent + ";color:" + primary + ";" +
      "font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none}" +
      "." + PREFIX + "-bubble{max-width:78%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45;" +
      "white-space:pre-line;word-wrap:break-word}" +
      "." + PREFIX + "-bot{background:#f4f0fa;color:" + text + ";border-bottom-left-radius:4px;" +
      "border:1px solid #e7ddf5}" +
      "." + PREFIX + "-userb{background:" + primary + ";color:#fff;border-bottom-right-radius:4px}" +
      "." + PREFIX + "-typing{display:inline-flex;gap:5px;padding:12px 16px}" +
      "." + PREFIX + "-typing span{width:7px;height:7px;border-radius:50%;background:" + secondary + ";" +
      "opacity:.55;animation:" + PREFIX + "-blink 1.1s infinite}" +
      "." + PREFIX + "-typing span:nth-child(2){animation-delay:.18s}" +
      "." + PREFIX + "-typing span:nth-child(3){animation-delay:.36s}" +
      "@keyframes " + PREFIX + "-blink{0%,80%,100%{opacity:.25;transform:translateY(0)}" +
      "40%{opacity:1;transform:translateY(-3px)}}" +
      "." + PREFIX + "-replies{display:flex;flex-wrap:wrap;gap:8px;padding:4px 12px 10px;background:" + bg + "}" +
      "." + PREFIX + "-reply{border:1.5px solid " + secondary + ";background:#fff;color:" + primary + ";" +
      "border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;" +
      "font-family:inherit;transition:background .12s ease}" +
      "." + PREFIX + "-reply:hover{background:" + accent + "}" +
      "." + PREFIX + "-inputrow{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #eee;background:" + bg + "}" +
      "." + PREFIX + "-input{flex:1;border:1.5px solid #ddd;border-radius:999px;padding:10px 14px;font-size:14px;" +
      "font-family:inherit;outline:none;color:" + text + "}" +
      "." + PREFIX + "-input:focus{border-color:" + secondary + "}" +
      "." + PREFIX + "-send{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;flex:none;" +
      "background:linear-gradient(135deg," + primary + " 0%," + secondary + " 100%);display:flex;" +
      "align-items:center;justify-content:center}" +
      "." + PREFIX + "-send svg{width:20px;height:20px;fill:#fff}" +
      "." + PREFIX + "-send:disabled{opacity:.45;cursor:default}" +
      "@media (max-width:480px){." + PREFIX + "-panel{right:10px;left:10px;bottom:88px;width:auto;" +
      "max-width:none;height:70vh}}";
    var style = el("style");
    style.id = PREFIX + "-styles";
    style.textContent = css;
    document.head.appendChild(style);
  };

  Assistant.prototype.injectFont = function () {
    if (!this.brand.fontUrl || document.getElementById(PREFIX + "-font")) return;
    var link = el("link");
    link.id = PREFIX + "-font";
    link.rel = "stylesheet";
    link.href = this.brand.fontUrl;
    document.head.appendChild(link);
  };

  // -- dom ------------------------------------------------------------------

  Assistant.prototype.chatIcon = function () {
    // simple inline SVG icons (no external assets)
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.14 2 11.2c0 2.9 1.56 5.5 4 7.24V22l3.5-1.92c.96.27 1.98.42 3.02.42h.48c5.52 0 10-4.14 10-9.2S17.52 2 12 2zm-4.5 9.5h-2v-2h2v2zm4.5 0h-2v-2h2v2zm4.5 0h-2v-2h2v2z"/></svg>';
  };

  Assistant.prototype.sendIcon = function () {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4l17.4-8.4L3.4 3.6l-.01 6.53L14 12 3.39 13.87z"/></svg>';
  };

  Assistant.prototype.buildDom = function () {
    var self = this;

    var launcher = el("button", PREFIX + "-launcher");
    launcher.setAttribute("aria-label", this.ui.launcherLabel);
    launcher.setAttribute("title", this.ui.launcherLabel);
    launcher.innerHTML = this.chatIcon();
    launcher.addEventListener("click", function () { self.toggle(); });

    var panel = el("div", PREFIX + "-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", this.brand.assistantName || this.brand.name || "Chat assistant");

    var header = el("div", PREFIX + "-header");
    var avatar = el("div", PREFIX + "-avatar", this.brand.avatarText || (this.brand.name || "Z").charAt(0));
    var title = el("div", PREFIX + "-title");
    title.appendChild(el("div", PREFIX + "-name", this.brand.assistantName || this.brand.name || "Assistant"));
    if (this.brand.tagline) title.appendChild(el("div", PREFIX + "-tag", this.brand.tagline));
    if (this.brand.poweredBy && this.brand.poweredBy.text) {
      var pb = el("div", PREFIX + "-powered");
      pb.appendChild(document.createTextNode("Powered by "));
      var pbLink = document.createElement("a");
      pbLink.href = this.brand.poweredBy.url || "#";
      pbLink.target = "_blank";
      pbLink.rel = "noopener";
      pbLink.textContent = this.brand.poweredBy.text;
      pb.appendChild(pbLink);
      title.appendChild(pb);
    }
    var restart = el("button", PREFIX + "-hbtn", "\u21BB");
    restart.setAttribute("aria-label", this.ui.restartLabel);
    restart.setAttribute("title", this.ui.restartLabel);
    restart.addEventListener("click", function () { self.restart(); });
    var close = el("button", PREFIX + "-hbtn", "\u2715");
    close.setAttribute("aria-label", this.ui.closeLabel);
    close.setAttribute("title", this.ui.closeLabel);
    close.addEventListener("click", function () { self.close(); });
    header.appendChild(avatar);
    header.appendChild(title);
    header.appendChild(restart);
    header.appendChild(close);

    var msgs = el("div", PREFIX + "-msgs");
    msgs.setAttribute("aria-live", "polite");

    var replies = el("div", PREFIX + "-replies");

    var inputRow = el("div", PREFIX + "-inputrow");
    var input = el("input", PREFIX + "-input");
    input.setAttribute("type", "text");
    input.setAttribute("placeholder", this.ui.inputPlaceholder);
    input.setAttribute("aria-label", this.ui.inputPlaceholder);
    var send = el("button", PREFIX + "-send");
    send.setAttribute("aria-label", this.ui.sendLabel);
    send.setAttribute("title", this.ui.sendLabel);
    send.innerHTML = this.sendIcon();
    var submit = function () { self.handleText(); };
    send.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
    });
    inputRow.appendChild(input);
    // Mic button (voice input) — only where the browser supports it
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (SR) {
      var mic = el("button", PREFIX + "-mic", "\uD83C\uDFA4");
      mic.setAttribute("aria-label", this.ui.micLabel);
      mic.setAttribute("title", this.ui.micLabel);
      mic.setAttribute("type", "button");
      var rec = null, listening = false;
      mic.addEventListener("click", function () {
        if (listening && rec) { try { rec.stop(); } catch (e) {} return; }
        rec = new SR();
        rec.lang = "en-US";
        rec.interimResults = false;
        rec.onresult = function (e) {
          var t = e.results[0][0].transcript;
          input.value = (input.value ? input.value + " " : "") + t;
          input.focus();
        };
        rec.onend = function () { listening = false; mic.classList.remove(PREFIX + "-listening"); };
        rec.onerror = function () { listening = false; mic.classList.remove(PREFIX + "-listening"); };
        try { rec.start(); listening = true; mic.classList.add(PREFIX + "-listening"); }
        catch (e) { listening = false; }
      });
      inputRow.appendChild(mic);
    }
    inputRow.appendChild(send);

    panel.appendChild(header);
    panel.appendChild(msgs);
    panel.appendChild(replies);
    panel.appendChild(inputRow);

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    this.launcher = launcher;
    this.root = panel;
    this.msgBox = msgs;
    this.replyBar = replies;
    this.input = input;
    this.sendBtn = send;
  };

  // -- conversation -----------------------------------------------------------

  Assistant.prototype.scrollDown = function () {
    this.msgBox.scrollTop = this.msgBox.scrollHeight;
  };

  Assistant.prototype.addUserMsg = function (text) {
    var row = el("div", PREFIX + "-row " + PREFIX + "-user");
    row.appendChild(el("div", PREFIX + "-bubble " + PREFIX + "-userb", text));
    this.msgBox.appendChild(row);
    this.scrollDown();
  };

  Assistant.prototype.addBotMsg = function (text) {
    var row = el("div", PREFIX + "-row");
    row.appendChild(el("div", PREFIX + "-mini", this.brand.avatarText || (this.brand.name || "Z").charAt(0)));
    row.appendChild(el("div", PREFIX + "-bubble " + PREFIX + "-bot", text));
    this.msgBox.appendChild(row);
    this.scrollDown();
  };

  Assistant.prototype.showTyping = function () {
    var row = el("div", PREFIX + "-row " + PREFIX + "-typingrow");
    row.appendChild(el("div", PREFIX + "-mini", this.brand.avatarText || "Z"));
    var b = el("div", PREFIX + "-bubble " + PREFIX + "-bot " + PREFIX + "-typing");
    b.setAttribute("aria-label", "typing");
    b.appendChild(el("span"));
    b.appendChild(el("span"));
    b.appendChild(el("span"));
    row.appendChild(b);
    this.msgBox.appendChild(row);
    this.scrollDown();
    return row;
  };

  // Say each message in sequence with a typing pause, then call done().
  Assistant.prototype.saySequence = function (messages, done) {
    var self = this;
    var i = 0;
    function nextMsg() {
      if (i >= messages.length) {
        self.busy = false;
        if (done) done();
        return;
      }
      self.busy = true;
      var typingRow = self.showTyping();
      var text = messages[i];
      var delay = 550 + Math.min(String(text).length * 12, 900);
      setTimeout(function () {
        if (typingRow.parentNode) typingRow.parentNode.removeChild(typingRow);
        self.addBotMsg(text);
        i++;
        setTimeout(nextMsg, 220);
      }, delay);
    }
    nextMsg();
  };

  Assistant.prototype.showReplies = function (replies) {
    var self = this;
    this.replyBar.textContent = "";
    (replies || []).forEach(function (r) {
      var b = el("button", PREFIX + "-reply", r.label);
      b.setAttribute("type", "button");
      b.addEventListener("click", function () { self.chooseReply(r); });
      self.replyBar.appendChild(b);
    });
  };

  Assistant.prototype.goto = function (nodeId, opts) {
    var node = this.cfg.nodes[nodeId];
    if (!node) {
      this.gotoFallback();
      return;
    }
    this.currentNode = node;
    var self = this;
    this.saySequence(node.messages || [], function () {
      self.showReplies(node.replies || []);
      // If the visitor typed the same question twice, don't parrot — nudge to a human.
      if (opts && opts.repeat) self.addBotMsg(self.ui.repeatNudge);
    });
  };

  Assistant.prototype.gotoFallback = function () {
    var fb = this.cfg.fallback || "fallback";
    if (this.cfg.nodes[fb]) this.goto(fb);
  };

  Assistant.prototype.doAction = function (reply) {
    if (reply.next) {
      this.goto(reply.next);
    } else if (reply.url) {
      global.open(reply.url, "_blank", "noopener");
      this.showReplies(this.currentNode ? this.currentNode.replies || [] : []);
    } else if (reply.whatsapp !== undefined) {
      var text = reply.whatsapp === true ? (this.wa.defaultText || "") : reply.whatsapp;
      global.open(waLink(this.wa.number, text), "_blank", "noopener");
      this.showReplies(this.currentNode ? this.currentNode.replies || [] : []);
    }
  };

  Assistant.prototype.chooseReply = function (reply) {
    if (this.busy) return;
    this.lastTextNode = null; // button taps reset the repeat tracker
    this.addUserMsg(reply.label);
    var self = this;
    setTimeout(function () { self.doAction(reply); }, 250);
  };

  Assistant.prototype.findKeywordNode = function (text) {
    var t = String(text).toLowerCase();
    var kws = this.cfg.keywords || [];
    for (var i = 0; i < kws.length; i++) {
      var words = kws[i].match || [];
      for (var j = 0; j < words.length; j++) {
        if (t.indexOf(String(words[j]).toLowerCase()) !== -1) return kws[i].next;
      }
    }
    return null;
  };

  Assistant.prototype.handleText = function () {
    if (this.busy) return;
    var text = this.input.value.trim();
    if (!text) return;
    this.input.value = "";
    this.addUserMsg(text);
    var self = this;
    setTimeout(function () {
      var nodeId = self.findKeywordNode(text);
      if (nodeId && self.cfg.nodes[nodeId]) {
        if (nodeId === self.lastTextNode) {
          self.goto(nodeId, { repeat: true });
        } else {
          self.lastTextNode = nodeId;
          self.goto(nodeId);
        }
      }
      else self.gotoFallback();
    }, 250);
  };

  // -- panel state ------------------------------------------------------------

  Assistant.prototype.open = function () {
    this.root.classList.add(PREFIX + "-open");
    this.opened = true;
    if (!this.started) {
      this.started = true;
      this.restart();
    }
    var self = this;
    setTimeout(function () { self.input.focus(); }, 150);
  };

  Assistant.prototype.close = function () {
    this.root.classList.remove(PREFIX + "-open");
    this.opened = false;
  };

  Assistant.prototype.toggle = function () {
    if (this.opened) this.close();
    else this.open();
  };

  Assistant.prototype.restart = function () {
    this.msgBox.textContent = "";
    this.replyBar.textContent = "";
    this.busy = false;
    this.lastTextNode = null;
    this.goto(this.cfg.start || "greeting");
  };

  Assistant.prototype.start = function () {
    this.injectFont();
    this.injectStyles();
    this.buildDom();
  };

  // ------------------------------------------------------------------ public

  var SmartAssistant = {
    version: VERSION,
    init: function (config) {
      if (alreadyInit) {
        if (global.console && console.warn)
          console.warn("[SmartAssistant] init() called twice — ignoring.");
        return null;
      }
      var problems = validateConfig(config);
      if (problems.length) {
        if (global.console && console.error)
          console.error("[SmartAssistant] invalid config: " + problems.join("; "));
        return null;
      }
      alreadyInit = true;
      var a = new Assistant(config);
      a.start();
      return a;
    }
  };

  global.SmartAssistant = global.SmartAssistant || SmartAssistant;
})(typeof window !== "undefined" ? window : this);
