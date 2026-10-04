/*
 * ReachTheSoul Chat Widget (two-way)
 * Embed this on your website — visitor messages arrive in your ReachTheSoul
 * dashboard as tickets, and replies from your team (or AI) appear back here.
 *
 * Usage (get your exact code from Dashboard → Admin → Website Widget):
 *   <script src="https://reachthesoul.org/widget.js" data-org="YOUR_ORG_ID"></script>
 *
 * Options (data attributes):
 *   data-org       (required) Your organization ID
 *   data-color     Primary color (default: #2563EB)
 *   data-title     Widget title (default: "Chat with us")
 *   data-subtitle  Subtitle text (default: "We usually reply within minutes")
 *   data-greeting  First message shown to visitors (default: "Hi there! 👋 How can we help you today?")
 *   data-position  "right" or "left" (default: "right")
 *
 * Visitors can attach photos (JPG/PNG/GIF/WebP) and documents (PDF/DOC/DOCX/TXT), max 5 MB.
 */
(function () {
  "use strict";
  if (window.__rtsWidgetLoaded) return;
  window.__rtsWidgetLoaded = true;

  var script = document.currentScript || document.querySelector("script[data-org]");
  if (!script) return;

  var ORG_ID = script.getAttribute("data-org");
  if (!ORG_ID) { console.warn("[ReachTheSoul] data-org is required"); return; }

  var PRIMARY = script.getAttribute("data-color") || "#2563EB";
  var TITLE = script.getAttribute("data-title") || "Chat with us";
  var SUBTITLE = script.getAttribute("data-subtitle") || "We usually reply within minutes";
  var GREETING = script.getAttribute("data-greeting") || "Hi there! \uD83D\uDC4B How can we help you today?";
  var POSITION = script.getAttribute("data-position") === "left" ? "left" : "right";
  var API_URL = "https://asia-southeast1-reachthesoul-prod.cloudfunctions.net/webhookWidget";

  var MAX_FILE_BYTES = 5 * 1024 * 1024; // keep in sync with backend (webhookWidget)
  var ALLOWED_TYPES = {
    "image/jpeg": 1, "image/png": 1, "image/gif": 1, "image/webp": 1,
    "application/pdf": 1, "application/msword": 1,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": 1,
    "text/plain": 1
  };
  var PLACEHOLDER_RE = /^\[(Photo|File|Video|Voice message|Sticker|Attachment|Story mention)\]/;

  var POLL_OPEN_MS = 3000;     // while chat window is open
  var POLL_CLOSED_MS = 20000;  // while closed (to show unread badge)

  // -- Safe storage (private mode / blocked storage must not break the widget) --
  var memStore = {};
  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) {
      if (val === undefined) return memStore[key] || null;
      memStore[key] = val;
    }
    return val;
  }

  function randomId() {
    try {
      var a = new Uint8Array(16);
      window.crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    } catch (e) {
      return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  var VISITOR_KEY = "rts_visitor_" + ORG_ID;
  var ACTIVE_KEY = "rts_active_" + ORG_ID;   // "1" once the visitor has sent a message
  var SEEN_KEY = "rts_seen_" + ORG_ID;       // timestamp of the last reply the visitor saw

  var visitorId = store(VISITOR_KEY);
  if (!visitorId) visitorId = store(VISITOR_KEY, "web_" + randomId());

  // -- CSS --
  var css = document.createElement("style");
  css.textContent = [
    "#rts-widget-btn{position:fixed;bottom:24px;" + POSITION + ":24px;z-index:2147483000;width:56px;height:56px;border-radius:50%;background:" + PRIMARY + ";color:#fff;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s;padding:0;}",
    "#rts-widget-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(0,0,0,0.3);}",
    "#rts-widget-btn svg{width:26px;height:26px;fill:currentColor;}",
    "#rts-widget-badge{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;background:#EF4444;border-radius:9px;font:700 10px/14px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#fff;display:none;align-items:center;justify-content:center;border:2px solid #fff;}",
    "#rts-widget-box{position:fixed;bottom:90px;" + POSITION + ":24px;z-index:2147483000;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.15);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;text-align:left;}",
    "#rts-widget-box.open{display:flex;}",
    "#rts-widget-box *{box-sizing:border-box;}",
    "#rts-widget-header{background:" + PRIMARY + ";color:#fff;padding:16px 44px 16px 20px;flex-shrink:0;position:relative;}",
    "#rts-widget-header h3{font-size:15px;font-weight:600;margin:0 0 2px;color:#fff;}",
    "#rts-widget-header p{font-size:11px;opacity:0.8;margin:0;color:#fff;}",
    "#rts-widget-close{position:absolute;top:10px;right:12px;background:none;border:none;color:#fff;cursor:pointer;opacity:0.8;font-size:22px;line-height:1;padding:4px;}",
    "#rts-widget-close:hover{opacity:1;}",
    "#rts-widget-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#fff;}",
    ".rts-msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word;white-space:pre-wrap;}",
    ".rts-msg-them{align-self:flex-start;background:#F1F5F9;color:#334155;border-bottom-left-radius:4px;}",
    ".rts-msg-me{align-self:flex-end;background:" + PRIMARY + ";color:#fff;border-bottom-right-radius:4px;}",
    ".rts-msg-name{font-size:10px;font-weight:600;opacity:0.6;margin-bottom:2px;}",
    ".rts-msg-time{font-size:9px;opacity:0.55;margin-top:4px;}",
    ".rts-msg-failed{opacity:0.6;}",
    "#rts-widget-input-wrap{display:flex;gap:8px;padding:12px 16px;border-top:1px solid #E2E8F0;flex-shrink:0;background:#fff;}",
    "#rts-widget-input{flex:1;min-width:0;border:1px solid #E2E8F0;border-radius:8px;padding:8px 12px;font-size:13px;outline:none;font-family:inherit;color:#334155;background:#fff;margin:0;}",
    "#rts-widget-input:focus{border-color:" + PRIMARY + ";}",
    "#rts-widget-send{background:" + PRIMARY + ";color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;margin:0;}",
    "#rts-widget-send:hover{opacity:0.9;}",
    "#rts-widget-send:disabled{opacity:0.5;cursor:not-allowed;}",
    "#rts-widget-attach{background:none;border:1px solid #E2E8F0;border-radius:8px;width:36px;flex-shrink:0;cursor:pointer;color:#64748B;display:flex;align-items:center;justify-content:center;padding:0;margin:0;}",
    "#rts-widget-attach:hover{color:" + PRIMARY + ";border-color:" + PRIMARY + ";}",
    "#rts-widget-attach:disabled{opacity:0.5;cursor:not-allowed;}",
    "#rts-widget-attach svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}",
    ".rts-att-img{display:block;max-width:100%;max-height:220px;border-radius:8px;margin:2px 0 4px;cursor:pointer;}",
    ".rts-att-file{display:flex;align-items:center;gap:6px;padding:6px 8px;margin:2px 0 4px;border-radius:8px;background:rgba(255,255,255,0.85);color:#334155;text-decoration:none;font-size:12px;font-weight:600;word-break:break-all;}",
    ".rts-msg-them .rts-att-file{background:#fff;}",
    ".rts-msg-sending{opacity:0.7;}",
    ".rts-typing{align-self:flex-start;padding:10px 14px;background:#F1F5F9;border-radius:12px;font-size:12px;color:#94A3B8;}",
    ".rts-powered{text-align:center;padding:6px;font-size:9px;color:#94A3B8;border-top:1px solid #F1F5F9;background:#fff;}",
    ".rts-powered a{color:#64748B;text-decoration:none;font-weight:600;}"
  ].join("\n");
  document.head.appendChild(css);

  // -- Button --
  var btn = document.createElement("button");
  btn.id = "rts-widget-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span id="rts-widget-badge">0</span>';

  // -- Chat box (texts set via textContent - never injected as HTML) --
  var box = document.createElement("div");
  box.id = "rts-widget-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", TITLE);
  box.innerHTML =
    '<div id="rts-widget-header"><h3></h3><p></p><button id="rts-widget-close" type="button" aria-label="Close chat">&times;</button></div>' +
    '<div id="rts-widget-messages" aria-live="polite"></div>' +
    '<div id="rts-widget-input-wrap"><button id="rts-widget-attach" type="button" aria-label="Attach a photo or file" title="Attach a photo or file"><svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button><input id="rts-widget-file" type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.txt" style="display:none" /><input id="rts-widget-input" type="text" maxlength="2000" placeholder="Type a message..." /><button id="rts-widget-send" type="button">Send</button></div>' +
    '<div class="rts-powered">Powered by <a href="https://reachthesoul.org" target="_blank" rel="noopener">ReachTheSoul</a></div>';
  box.querySelector("h3").textContent = TITLE;
  box.querySelector("p").textContent = SUBTITLE;

  function mount() {
    document.body.appendChild(btn);
    document.body.appendChild(box);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  var messagesEl = box.querySelector("#rts-widget-messages");
  var inputEl = box.querySelector("#rts-widget-input");
  var sendBtn = box.querySelector("#rts-widget-send");
  var closeBtn = box.querySelector("#rts-widget-close");
  var badgeEl = btn.querySelector("#rts-widget-badge");
  var attachBtn = box.querySelector("#rts-widget-attach");
  var fileEl = box.querySelector("#rts-widget-file");

  var isOpen = false;
  var renderedIds = {};     // server message ids already shown
  var pendingMine = [];     // optimistic visitor messages not yet confirmed by server
  var lastTs = 0;           // newest server timestamp seen
  var unread = 0;
  var pollTimer = null;
  var polling = false;
  var waitingSince = 0;     // when the visitor last sent (for typing indicator)
  var ackShown = false;

  function fmtTime(ts) {
    try { return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }

  function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function addBubble(text, isMine, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "rts-msg " + (isMine ? "rts-msg-me" : "rts-msg-them");
    if (!isMine && opts.name) {
      var n = document.createElement("div");
      n.className = "rts-msg-name";
      n.textContent = opts.name;
      el.appendChild(n);
    }
    var atts = opts.attachments || [];
    for (var i = 0; i < atts.length; i++) el.appendChild(renderAttachment(atts[i]));
    if (text && !(atts.length && PLACEHOLDER_RE.test(text))) el.appendChild(document.createTextNode(text));
    var t = document.createElement("div");
    t.className = "rts-msg-time";
    t.textContent = fmtTime(opts.ts || Date.now());
    el.appendChild(t);
    hideTyping();
    messagesEl.appendChild(el);
    scrollDown();
    return el;
  }

  function renderAttachment(a) {
    var url = String(a.url || "");
    var safe = /^(https:|data:image\/)/.test(url);
    if (a.type === "image" && safe) {
      var img = document.createElement("img");
      img.className = "rts-att-img";
      img.src = url;
      img.alt = a.filename || "Photo";
      img.loading = "lazy";
      img.onload = scrollDown;
      if (/^https:/.test(url)) img.onclick = function () { window.open(url, "_blank", "noopener"); };
      return img;
    }
    var link = document.createElement(/^https:/.test(url) ? "a" : "div");
    link.className = "rts-att-file";
    if (link.tagName === "A") { link.href = url; link.target = "_blank"; link.rel = "noopener"; }
    link.textContent = "\uD83D\uDCCE " + (a.filename || "File");
    return link;
  }

  function showTyping() {
    if (document.getElementById("rts-typing")) return;
    var el = document.createElement("div");
    el.className = "rts-typing";
    el.id = "rts-typing";
    el.textContent = "Typing...";
    messagesEl.appendChild(el);
    scrollDown();
  }
  function hideTyping() {
    var el = document.getElementById("rts-typing");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function setBadge(n) {
    unread = n;
    badgeEl.textContent = n > 9 ? "9+" : String(n);
    badgeEl.style.display = n > 0 ? "flex" : "none";
  }

  // Greeting (local only - not stored as a ticket message)
  addBubble(GREETING, false, {});

  // -- Render messages coming from the server --
  function applyServerMessages(list, isInitial) {
    var seenUntil = Number(store(SEEN_KEY) || 0);
    var newReplies = 0;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.ts > lastTs) lastTs = m.ts;
      if (renderedIds[m.id]) continue;
      renderedIds[m.id] = true;

      if (m.from === "me") {
        // Already shown optimistically? Then just confirm it.
        var hasAtt = !!(m.attachments && m.attachments.length);
        var idx = -1;
        for (var j = 0; j < pendingMine.length; j++) {
          if (hasAtt ? pendingMine[j].file : (!pendingMine[j].file && pendingMine[j].text === m.text)) { idx = j; break; }
        }
        if (idx >= 0) { pendingMine.splice(idx, 1); continue; }
        addBubble(m.text, true, { ts: m.ts, attachments: m.attachments });
      } else {
        addBubble(m.text, false, { name: m.name, ts: m.ts, attachments: m.attachments });
        waitingSince = 0;
        if (m.ts > seenUntil) newReplies++;
      }
    }
    if (isOpen) {
      store(SEEN_KEY, String(lastTs));
      setBadge(0);
    } else if (newReplies > 0) {
      setBadge(unread + newReplies);
    }
  }

  function poll() {
    if (polling || store(ACTIVE_KEY) !== "1") return;
    polling = true;
    var url = API_URL + "?org=" + encodeURIComponent(ORG_ID) +
      "&visitor=" + encodeURIComponent(visitorId) +
      "&since=" + (lastTs ? String(lastTs) : "0");
    var initial = lastTs === 0;
    fetch(url, { method: "GET", cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { messages: [] }; })
      .then(function (data) {
        applyServerMessages((data && data.messages) || [], initial);
        // Friendly acknowledgment if nobody (AI or team) has replied after a while
        if (waitingSince && !ackShown && Date.now() - waitingSince > 12000) {
          ackShown = true;
          waitingSince = 0;
          addBubble("Thanks for your message! Our team will reply right here - feel free to keep this page open.", false, {});
        }
      })
      .catch(function () { /* network hiccup - try again next tick */ })
      .then(function () { polling = false; });
  }

  function schedulePoll() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = setTimeout(function () {
      if (!document.hidden) poll();
      schedulePoll();
    }, isOpen ? POLL_OPEN_MS : POLL_CLOSED_MS);
  }

  // -- Open / close --
  function openBox() {
    isOpen = true;
    box.classList.add("open");
    btn.setAttribute("aria-label", "Close chat");
    setBadge(0);
    if (lastTs) store(SEEN_KEY, String(lastTs));
    try { inputEl.focus(); } catch (e) {}
    poll();
    schedulePoll();
  }
  function closeBox() {
    isOpen = false;
    box.classList.remove("open");
    btn.setAttribute("aria-label", "Open chat");
    schedulePoll();
  }
  btn.onclick = function () { isOpen ? closeBox() : openBox(); };
  closeBtn.onclick = closeBox;
  document.addEventListener("visibilitychange", function () { if (!document.hidden && store(ACTIVE_KEY) === "1") poll(); });

  // -- Send (text or file) --
  function postToServer(payload, bubble, pendingEntry) {
    sendBtn.disabled = true;
    attachBtn.disabled = true;
    payload.sender = visitorId;
    // Host page may identify the visitor (e.g. logged-in ReachTheSoul dashboard user)
    var who = window.rtsWidgetVisitor || null;
    payload.name = (who && who.name) ? String(who.name).slice(0, 100) : "Website Visitor";
    if (who && who.email) payload.email = String(who.email).slice(0, 200);
    if (who && who.orgId) payload.visitorOrgId = String(who.orgId).slice(0, 100);
    payload.channel = "website";
    payload.pageUrl = String(window.location.href).slice(0, 500);

    fetch(API_URL + "?org=" + encodeURIComponent(ORG_ID), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            throw new Error((j && j.error) || ("HTTP " + r.status));
          });
        }
        return r.json();
      })
      .then(function () {
        sendBtn.disabled = false;
        attachBtn.disabled = false;
        bubble.className = bubble.className.replace(" rts-msg-sending", "");
        store(ACTIVE_KEY, "1");
        waitingSince = Date.now();
        showTyping();
        // Poll quickly a few times so AI auto-replies show up fast
        setTimeout(poll, 1500);
        setTimeout(poll, 4000);
        schedulePoll();
      })
      .catch(function (err) {
        sendBtn.disabled = false;
        attachBtn.disabled = false;
        hideTyping();
        bubble.className = bubble.className.replace(" rts-msg-sending", "") + " rts-msg-failed";
        var k = pendingMine.indexOf(pendingEntry);
        if (k >= 0) pendingMine.splice(k, 1);
        var reason = err && /too large|not allowed|Empty file/i.test(err.message) ? " (" + err.message + ")" : "";
        addBubble("Sorry, your message could not be sent" + reason + ". Please try again.", false, {});
      });
  }

  function send() {
    var text = inputEl.value.trim();
    if (!text || sendBtn.disabled) return;
    var bubble = addBubble(text, true, {});
    var entry = { text: text };
    pendingMine.push(entry);
    inputEl.value = "";
    postToServer({ message: text }, bubble, entry);
  }

  // Shrink big photos before upload (saves visitor data + stays under 5 MB)
  function prepareImage(file, cb) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1024 * 1024) { cb(null); return; }
    try {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1600;
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement("canvas");
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          cb({ dataUrl: c.toDataURL("image/jpeg", 0.85), type: "image/jpeg" });
        } catch (e) { cb(null); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
      img.src = url;
    } catch (e) { cb(null); }
  }

  function sendFile(file) {
    if (!file || attachBtn.disabled) return;
    var type = String(file.type || "").toLowerCase();
    if (!type && /\.docx$/i.test(file.name)) type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!type && /\.doc$/i.test(file.name)) type = "application/msword";
    if (!type && /\.txt$/i.test(file.name)) type = "text/plain";
    if (!ALLOWED_TYPES[type]) {
      addBubble("This file type isn't supported. Please send a photo (JPG, PNG, GIF, WebP) or a PDF, Word or text file.", false, {});
      return;
    }

    function go(dataUrl, finalType) {
      var b64 = String(dataUrl).replace(/^data:[^,]*,/, "");
      if (Math.floor(b64.length * 3 / 4) > MAX_FILE_BYTES) {
        addBubble("That file is larger than 5 MB. Please choose a smaller file.", false, {});
        return;
      }
      var isImg = /^image\//.test(finalType);
      var bubble = addBubble("", true, {
        attachments: [{ type: isImg ? "image" : "document", url: isImg ? dataUrl : "", filename: file.name }],
      });
      bubble.className += " rts-msg-sending";
      var entry = { file: true };
      pendingMine.push(entry);
      postToServer({ message: "", attachment: { name: file.name, type: finalType, data: b64 } }, bubble, entry);
    }

    prepareImage(file, function (shrunk) {
      if (shrunk) { go(shrunk.dataUrl, shrunk.type); return; }
      if (file.size > MAX_FILE_BYTES) {
        addBubble("That file is larger than 5 MB. Please choose a smaller file.", false, {});
        return;
      }
      var reader = new FileReader();
      reader.onload = function () { go(reader.result, type); };
      reader.onerror = function () { addBubble("Couldn't read that file. Please try another one.", false, {}); };
      reader.readAsDataURL(file);
    });
  }

  attachBtn.onclick = function () { if (!attachBtn.disabled) fileEl.click(); };
  fileEl.onchange = function () {
    var f = fileEl.files && fileEl.files[0];
    fileEl.value = "";
    if (f) sendFile(f);
  };

  sendBtn.onclick = send;
  inputEl.onkeydown = function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Returning visitor: load conversation history + start background polling
  if (store(ACTIVE_KEY) === "1") {
    poll();
    schedulePoll();
  }
})();
