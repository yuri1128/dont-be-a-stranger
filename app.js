/* ============================================================
   DON'T BE A STRANGER — behaviour
   Plain JavaScript, no libraries. Settings live in config.js,
   fortunes in fortunes.js. You shouldn't need to edit this file.
   ============================================================ */
(() => {
  "use strict";

  const cfg = window.SITE_CONFIG || {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n, len = 2) => String(n).padStart(len, "0");

  /* ---------- EDITIONS (one per year; the last one is "now") ---------- */
  const year = new Date().getFullYear();
  const editions = Array.isArray(cfg.editions) && cfg.editions.length
    ? cfg.editions
    : [{ year, date: "", tag: "stranger-" + year }];
  const current = editions[editions.length - 1];

  $("#date").textContent = current.date || "";
  $("#ed").textContent = current.year;
  document.title = "DON'T BE A STRANGER" + (current.date ? " · " + current.date : "");

  /* ---------- SCREENS (home / album / fortune) via the #hash ---------- */
  const views = { home: $("#v-home"), album: $("#v-album"), fortune: $("#v-fortune"), book: $("#v-book"), coin: $("#v-coin"), spin: $("#v-spin"), quiz: $("#v-quiz") };
  let active = null;

  function show(name) {
    if (name === active) return;
    if (active === "album") album.leave();
    if (active === "book") book.leave();
    if (active === "home") smoke.stop();
    active = name;
    for (const k in views) views[k].hidden = k !== name;
    window.scrollTo(0, 0);
    if (name === "home") { boot(); smoke.start(); }
    if (name === "album") album.enter();
    if (name === "book") book.enter();
  }
  function route() {
    const h = location.hash.replace("#", "");
    show(views[h] ? h : "home");
  }
  window.addEventListener("hashchange", route);

  // number keys work too (handy on a laptop)
  document.addEventListener("keydown", (e) => {
    if (!$("#lb").hidden) {
      if (e.key === "Escape") closeLb();
      if (e.key === "ArrowLeft") stepLb(-1);
      if (e.key === "ArrowRight") stepLb(1);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "1") location.hash = "album";
    if (e.key === "2") location.hash = "book";
    if (e.key === "3") location.hash = "fortune";
    if (e.key === "4") location.hash = "coin";
    if (e.key === "5") location.hash = "spin";
    if (e.key === "6") location.hash = "quiz";
    if (e.key === "0") location.hash = "";
  });

  /* ---------- HOME: the "boot" typing ---------- */
  let booted = false;
  async function boot() {
    if (booted) return;
    booted = true;
    if (reduce) return;
    const lines = [...document.querySelectorAll("#v-home .type")];
    const texts = lines.map((l) => l.textContent);
    const menu = $("#menu");
    lines.forEach((l) => (l.textContent = ""));
    menu.classList.add("pending");
    for (let i = 0; i < lines.length; i++) {
      const chars = Array.from(texts[i]);          // by character, so symbols never get cut in half
      for (let c = 1; c <= chars.length; c++) {
        lines[i].textContent = chars.slice(0, c).join("");
        await wait(26);
      }
      await wait(160);
    }
    menu.classList.remove("pending");
  }

  /* ---------- HOME: the cat and its smoke ---------- */
  const smoke = (() => {
    const catEl = $("#cat");
    const noteEl = $("#cat-note");
    const CAT = ["  /\\_/\\", " ( -.- )=========*", "  > ^ <"];
    const NOTES = ["psst.", "still here.", "you came back.", "no pressure.", "stay a while.", "hi."];
    let t = 0, id = null, n = -1;

    function frame(k) {
      const rows = [];
      for (let i = 0; i < 4; i++) {
        const w = (i + k) % 2;                     // wiggle left / right on the way up
        rows.push(" ".repeat(16 + w) + (w ? ")" : "("));
      }
      return rows.concat(CAT).join("\n");
    }
    catEl.textContent = frame(0);
    $("#cat-btn").addEventListener("click", () => {
      n = (n + 1) % NOTES.length;
      noteEl.textContent = NOTES[n];
    });
    return {
      start() { if (reduce || id) return; id = setInterval(() => { catEl.textContent = frame(++t); }, 750); },
      stop() { clearInterval(id); id = null; }
    };
  })();

  /* ============================================================
     THE ALBUM — live, via Cloudinary (free plan is plenty)
     upload : straight from the phone to Cloudinary (unsigned preset)
     list   : Cloudinary's public "list by tag" JSON
     ============================================================ */
  const album = (() => {
    const cc = cfg.cloudinary || {};
    const configured = !!(cc.cloudName && cc.uploadPreset);
    const grid = $("#grid");
    const statusEl = $("#al-status");
    const logEl = $("#log");
    const fileInput = $("#file");
    const addBtn = $("#add-btn");
    const yearsEl = $("#years");

    let viewing = current;
    let items = new Map();       // public_id -> { id, version, format, t, opt }
    let order = [];              // newest first
    let lastSig = "";
    let pollId = null;
    let busy = false;

    if (cfg.gridGrayscale !== false) grid.classList.add("gray");

    const base = () => "https://res.cloudinary.com/" + cc.cloudName + "/image/upload/";
    const thumbUrl = (it) => base() + "c_fill,g_auto,w_360,h_450,q_auto,f_auto/v" + it.version + "/" + it.id;
    const fullUrl = (it) => base() + "c_limit,w_1600,q_auto,f_auto/v" + it.version + "/" + it.id;

    const setStatus = (t) => { statusEl.textContent = t ? "> " + t : ""; };
    const canUpload = () => configured && viewing === current;

    function syncControls() {
      const ok = canUpload() && !busy;
      addBtn.setAttribute("aria-disabled", ok ? "false" : "true");
      fileInput.disabled = !ok;
    }

    /* --- years (only shows once there is more than one edition) --- */
    function buildYears() {
      yearsEl.textContent = "";
      if (editions.length < 2) { yearsEl.hidden = true; return; }
      yearsEl.hidden = false;
      editions.slice().reverse().forEach((ed) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "year"; b.textContent = ed.year;
        b.setAttribute("aria-pressed", ed === viewing ? "true" : "false");
        b.addEventListener("click", () => { viewing = ed; items = new Map(); lastSig = ""; grid.textContent = ""; buildYears(); $("#al-year").textContent = ed.year; syncControls(); load(); });
        yearsEl.appendChild(b);
      });
    }

    /* --- the grid --- */
    function render() {
      order = [...items.values()].sort((a, b) => (b.t || "").localeCompare(a.t || ""));
      const sig = order.map((o) => o.id).join("|");
      if (sig === lastSig) return;
      lastSig = sig;
      grid.textContent = "";
      order.forEach((it, i) => {
        const n = order.length - i;
        const b = document.createElement("button");
        b.type = "button"; b.className = "cell"; b.setAttribute("role", "listitem");
        b.setAttribute("aria-label", "Open photo " + n);
        const img = document.createElement("img");
        img.src = thumbUrl(it); img.alt = ""; img.loading = "lazy"; img.decoding = "async";
        const num = document.createElement("span");
        num.className = "n"; num.textContent = pad(n, 3);
        b.append(img, num);
        b.addEventListener("click", () => openLb(i));
        grid.appendChild(b);
      });
      setStatus(order.length ? order.length + (order.length === 1 ? " frame" : " frames") : "no photos yet. be the first.");
    }

    /* --- load the list --- */
    async function load() {
      if (!configured) { setStatus("not open yet. check back at the party."); return; }
      try {
        const r = await fetch("https://res.cloudinary.com/" + cc.cloudName + "/image/list/" + encodeURIComponent(viewing.tag) + ".json", { cache: "no-store" });
        let res = [];
        if (r.status !== 404) {            // 404 just means "no photos with this tag yet"
          if (!r.ok) throw new Error("HTTP " + r.status);
          res = (await r.json()).resources || [];
        }
        const fresh = new Map(res.map((x) => [x.public_id, { id: x.public_id, version: x.version, format: x.format, t: x.created_at || "" }]));
        // keep photos uploaded in the last 2 minutes that the list hasn't caught up with yet
        for (const [id, it] of items) if (it.opt && Date.now() - it.optAt < 120000 && !fresh.has(id)) fresh.set(id, it);
        items = fresh;
        render();
        if (!items.size) setStatus("no photos yet. be the first.");
      } catch (e) {
        console.warn("[album] couldn't load the list:", e.message,
          "— host: in Cloudinary go to Settings > Security and clear 'Resource list' under restricted media types.");
        if (!items.size) setStatus("can't reach the album right now. try again in a minute.");
      }
    }

    /* --- shrink a photo before sending it (keeps uploads fast on cellular) --- */
    async function prep(file) {
      try {
        const bmp = await createImageBitmap(file);
        const max = 2000, s = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(bmp, 0, 0, w, h);
        if (bmp.close) bmp.close();
        const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
        if (blob) return blob;
      } catch (e) { /* fall through: send the original */ }
      return file;
    }

    function send(blob, onProgress) {
      return new Promise((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("POST", "https://api.cloudinary.com/v1_1/" + cc.cloudName + "/image/upload");
        x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
        x.onload = () => {
          let j = {};
          try { j = JSON.parse(x.responseText); } catch (e) { /* ignore */ }
          if (x.status >= 200 && x.status < 300 && j.public_id) resolve(j);
          else reject(new Error((j.error && j.error.message) || "error " + x.status));
        };
        x.onerror = () => reject(new Error("no connection"));
        const fd = new FormData();
        fd.append("file", blob, "photo-" + Date.now() + ".jpg");
        fd.append("upload_preset", cc.uploadPreset);
        fd.append("tags", current.tag);
        x.send(fd);
      });
    }

    async function upload(fileList) {
      if (!canUpload() || busy) return;
      const files = [...fileList].filter((f) => /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
      fileInput.value = "";
      logEl.textContent = "";
      if (!files.length) { addLog("that doesn't look like a photo.").textContent = "> that doesn't look like a photo."; return; }
      busy = true; syncControls();
      let ok = 0;
      for (let i = 0; i < files.length; i++) {
        const row = addLog("");
        const label = "> " + (i + 1) + "/" + files.length + " ";
        row.textContent = label + "preparing...";
        try {
          if (files[i].size > 60 * 1024 * 1024) throw new Error("file too big");
          const blob = await prep(files[i]);
          const res = await send(blob, (p) => { row.textContent = label + "uploading " + Math.round(p * 100) + "%"; });
          items.set(res.public_id, { id: res.public_id, version: res.version, format: res.format, t: res.created_at || new Date().toISOString(), opt: true, optAt: Date.now() });
          lastSig = ""; render(); ok++;
          row.textContent = label + "ok";
        } catch (e) {
          row.textContent = label + "failed (" + (e.message || "error") + ")";
        }
      }
      addLog("").textContent = ok === files.length ? "> done. glad you stopped by." : "> " + ok + " of " + files.length + " uploaded. try the rest again.";
      busy = false; syncControls();
    }
    function addLog() { const p = document.createElement("p"); p.className = "line"; logEl.appendChild(p); return p; }

    fileInput.addEventListener("change", () => upload(fileInput.files));
    addBtn.addEventListener("click", (e) => { if (!canUpload() || busy) e.preventDefault(); });

    return {
      enter() {
        $("#al-year").textContent = viewing.year;
        buildYears(); syncControls(); load();
        if (configured) pollId = setInterval(() => { if (!document.hidden && !busy) load(); }, 25000);
      },
      leave() { clearInterval(pollId); pollId = null; },
      get order() { return order; },
      fullUrl
    };
  })();

  /* ---------- PHOTO VIEWER ---------- */
  const lb = $("#lb"), lbImg = $("#lb-img"), lbCount = $("#lb-count");
  let lbIdx = 0;
  function showLb() {
    const list = album.order, it = list[lbIdx];
    if (!it) return;
    lbImg.src = album.fullUrl(it);
    lbImg.alt = "Photo " + (list.length - lbIdx);
    lbCount.textContent = pad(list.length - lbIdx, 3) + "/" + pad(list.length, 3);
  }
  function openLb(i) {
    lbIdx = i; showLb();
    lb.hidden = false;
    document.documentElement.classList.add("lock");
    $("#lb-close").focus({ preventScroll: true });
  }
  function closeLb() {
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.documentElement.classList.remove("lock");
  }
  function stepLb(d) {
    const n = album.order.length;
    if (!n) return;
    lbIdx = (lbIdx + d + n) % n;
    showLb();
  }
  window.openLb = openLb;   // used by the grid
  $("#lb-close").addEventListener("click", closeLb);
  $("#lb-prev").addEventListener("click", () => stepLb(1));    // older
  $("#lb-next").addEventListener("click", () => stepLb(-1));   // newer
  let tx = null;
  $("#lb-stage").addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  $("#lb-stage").addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    tx = null;
    if (Math.abs(dx) > 50) stepLb(dx < 0 ? -1 : 1);   // swipe left = newer
  }, { passive: true });

  /* ============================================================
     THE GUEST BOOK — no server needed.
     Each signature is drawn onto a small black "note" image in the
     browser and uploaded to Cloudinary under its own tag (like a photo).
     The list is read back with the same "list by tag" trick the album uses.
     To remove a note: Cloudinary > Media Library > delete it.
     ============================================================ */
  const book = (() => {
    const cc = cfg.cloudinary || {};
    const configured = !!(cc.cloudName && cc.uploadPreset);
    const tag = current.tag + "-book";
    const form = $("#book-form"), nameEl = $("#b-name"), msgEl = $("#b-msg");
    const countEl = $("#b-count"), sendBtn = $("#b-send");
    const statusEl = $("#b-status"), listEl = $("#b-list");
    let entries = new Map(), lastSig = "", pollId = null, busy = false;

    const setStatus = (t) => { statusEl.textContent = t ? "> " + t : ""; };
    const imgUrl = (e) => "https://res.cloudinary.com/" + cc.cloudName + "/image/upload/c_limit,w_720,q_auto,f_auto/v" + e.version + "/" + e.id;

    /* draw the note: white text on black, wrapped to fit */
    async function drawNote(name, msg) {
      try { await document.fonts.load('40px "VT323"'); } catch (e) { /* ignore */ }
      const W = 720, pad = 36, fs = 44, lh = 48;
      const font = fs + 'px "VT323", "Courier New", monospace';
      const c = document.createElement("canvas");
      const g = c.getContext("2d");
      g.font = font;
      const words = msg.split(" "), lines = [];
      let cur = "";
      for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (g.measureText(t).width <= W - pad * 2 || !cur) cur = t; else { lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
      const H = pad + lines.length * lh + 20 + lh + pad - 8;
      c.width = W; c.height = H;
      g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
      g.fillStyle = "#f4f4f2"; g.font = font; g.textBaseline = "top";
      lines.forEach((l, i) => g.fillText(l, pad, pad + i * lh));
      g.fillStyle = "#9a9a9a";
      g.fillText("- " + (name || "a stranger"), pad, pad + lines.length * lh + 20);
      return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("couldn't draw note"))), "image/png"));
    }

    function render() {
      const list = [...entries.values()].sort((a, b) => (b.t || "").localeCompare(a.t || ""));
      const sig = list.map((e) => e.id).join("|");
      if (sig === lastSig) return;
      lastSig = sig;
      listEl.textContent = "";
      list.forEach((e) => {
        const d = document.createElement("div"); d.className = "entry";
        const im = document.createElement("img"); im.className = "note-img";
        im.src = e.blobUrl || imgUrl(e); im.alt = "guest book note"; im.decoding = "async";
        const w = document.createElement("p"); w.className = "w";
        let when = "";
        try { when = new Date(e.t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).toUpperCase(); } catch (x) { /* ignore */ }
        w.textContent = when;
        d.append(im, w); listEl.appendChild(d);
      });
      setStatus(list.length ? list.length + (list.length === 1 ? " note" : " notes") : "nobody's signed yet. be the first.");
    }

    async function load() {
      if (!configured) { setStatus("not open yet. check back at the party."); return; }
      try {
        const r = await fetch("https://res.cloudinary.com/" + cc.cloudName + "/image/list/" + encodeURIComponent(tag) + ".json", { cache: "no-store" });
        let res = [];
        if (r.status !== 404) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          res = (await r.json()).resources || [];
        }
        const fresh = new Map(res.filter((x) => !x.width || x.width >= 200).map((x) => [x.public_id, { id: x.public_id, version: x.version, t: x.created_at || "" }]));   // skips the tiny 1px test entries from the first version
        for (const [id, e] of entries) if (e.opt && Date.now() - e.optAt < 180000 && !fresh.has(id)) fresh.set(id, e);
        entries = fresh;
        render();
        if (!entries.size) setStatus("nobody's signed yet. be the first.");
      } catch (err) {
        console.warn("[guest book] couldn't load:", err.message);
        if (!entries.size) setStatus("can't reach the book right now. try again in a minute.");
      }
    }

    const updateCount = () => { countEl.textContent = (msgEl.maxLength - msgEl.value.length) + " left"; };
    msgEl.addEventListener("input", updateCount);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (busy || !configured) return;
      const name = nameEl.value.trim().replace(/\s+/g, " "), msg = msgEl.value.trim().replace(/\s+/g, " ");
      if (!msg) { setStatus("write something first."); msgEl.focus(); return; }
      busy = true; sendBtn.disabled = true; setStatus("signing...");
      try {
        const blob = await drawNote(name, msg);
        const j = await new Promise((resolve, reject) => {
          const x = new XMLHttpRequest();
          x.open("POST", "https://api.cloudinary.com/v1_1/" + cc.cloudName + "/image/upload");
          x.onload = () => {
            let r = {}; try { r = JSON.parse(x.responseText); } catch (e) { /* ignore */ }
            if (x.status >= 200 && x.status < 300 && r.public_id) resolve(r);
            else reject(new Error((r.error && r.error.message) || "error " + x.status));
          };
          x.onerror = () => reject(new Error("no connection"));
          const fd = new FormData();
          fd.append("file", blob, "note-" + Date.now() + ".png");
          fd.append("upload_preset", cc.uploadPreset);
          fd.append("tags", tag);
          x.send(fd);
        });
        entries.set(j.public_id, { id: j.public_id, version: j.version, t: j.created_at || new Date().toISOString(), opt: true, optAt: Date.now(), blobUrl: URL.createObjectURL(blob) });
        lastSig = ""; render();
        msgEl.value = ""; updateCount();
        setStatus("signed. it can take a minute to show up on other phones.");
      } catch (err) {
        console.warn("[guest book] couldn't sign:", err.message);
        setStatus("didn't go through (" + (err.message || "error") + "). try again.");
      }
      busy = false; sendBtn.disabled = false;
    });

    return {
      enter() { updateCount(); load(); clearInterval(pollId); pollId = setInterval(() => { if (!document.hidden) load(); }, 30000); },
      leave() { clearInterval(pollId); pollId = null; }
    };
  })();

  /* ============================================================
     YOUR FORTUNE
     ============================================================ */
  const F = window.FORTUNES || [];
  const btn = $("#reveal");
  const slip = $("#slip");
  const slipEmpty = $("#slip-empty");
  const vis = $("#slip-vis");
  const ghost = $("#slip-ghost");
  const noEl = $("#slip-no");
  const luckyEl = $("#slip-lucky");
  const fStatus = $("#f-status");
  const sr = $("#fortune-sr");

  let bag = [];        // a shuffled "deck": every fortune appears once before any repeats
  let last = -1;
  let busyF = false;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function nextIndex() {
    if (!bag.length) {
      bag = shuffle(F.map((_, i) => i));
      if (bag.length > 1 && bag[bag.length - 1] === last) {   // don't open a new deck with the one just shown
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
    }
    last = bag.pop();
    return last;
  }
  function luckyNumbers() {
    const s = new Set();
    while (s.size < 3) s.add(1 + Math.floor(Math.random() * 49));
    return "LUCKY " + [...s].sort((a, b) => a - b).map((n) => pad(n)).join(" · ");
  }

  /* ---- kawaii ascii critters: one (random) per fortune, 2-frame loop ---- */
  const CRITTERS = [
    { // bunny
      a: String.raw`  (\_/)
  (^.^)
 o(")(")`,
      b: String.raw`  (\_/)
  (-.-)
 o(")(")` },
    { // cat
      a: String.raw`  /\_/\
 ( o.o )
  > ^ <`,
      b: String.raw`  /\_/\
 ( -.- )
  > ^ <` },
    { // bear
      a: String.raw` ()_()
 (o.o)
 (")_(")`,
      b: String.raw` ()_()
 (-.-)
 (")_(")` },
    { // owl
      a: String.raw`  ,_,
 (o,o)
 /)__)
  " "`,
      b: String.raw`  ,_,
 (-,-)
 /)__)
  " "` },
    { // ghost
      a: String.raw`  .-.
 (o o)
 | O |
 '~^~'`,
      b: String.raw`  .-.
 (- -)
 | O |
 '^~^'` },
    { // heart
      a: String.raw` .--.  .--.
(    \/    )
 \  ^__^  /
  '.    .'
    '..'`,
      b: String.raw` .--.  .--.
(    \/    )
 \  -__-  /
  '.    .'
    '..'` },
    { // frog
      a: String.raw`  @..@
 (----)
( >__< )
 ^^  ^^`,
      b: String.raw`  -..-
 (----)
( >__< )
 ^^  ^^` }
  ];
  const SPARK = [" *  .  * ", " .  *  . "];
  const critEl = $("#crit");
  let critTimer = 0, critPick = -1, critFrame = 0;
  function critText(c, f) {
    const body = (f ? c.b : c.a).split("\n");
    const blanks = Math.max(0, 5 - body.length);
    return SPARK[f] + "\n" + body.join("\n") + "\n".repeat(blanks);
  }
  function showCritter() {
    if (!critEl) return;
    let i;
    do { i = Math.floor(Math.random() * CRITTERS.length); } while (CRITTERS.length > 1 && i === critPick);
    critPick = i; critFrame = 0;
    critEl.textContent = critText(CRITTERS[i], 0);
    clearInterval(critTimer);
    if (reduce) return;
    critTimer = setInterval(() => {
      if (location.hash !== "#fortune" || document.hidden) return;
      critFrame ^= 1;
      critEl.textContent = critText(CRITTERS[critPick], critFrame);
    }, 650);
  }
  async function typeInto(text) {
    if (reduce) { vis.textContent = text; ghost.textContent = ""; return; }
    for (let i = 1; i <= text.length; i++) {   // untyped letters stay in the layout (invisible)
      vis.textContent = text.slice(0, i);
      ghost.textContent = text.slice(i);
      await wait(text[i - 1] === " " ? 20 : 36);
    }
  }
  async function reveal() {
    if (busyF || !F.length) return;
    busyF = true;
    btn.disabled = true;

    // a beat of suspense
    if (!reduce) {
      for (let d = 0; d < 4; d++) {
        fStatus.textContent = "> consulting the oracle" + ".".repeat(d % 4);
        await wait(280);
      }
    }
    fStatus.textContent = " ";

    const i = nextIndex();
    const text = F[i];
    noEl.textContent = "NO. " + pad(i + 1);
    luckyEl.textContent = luckyNumbers();
    vis.textContent = "";
    ghost.textContent = text;
    slipEmpty.hidden = true;
    slip.hidden = false;
    showCritter();
    await typeInto(text);
    sr.textContent = "Your fortune: " + text;

    btn.textContent = "TAKE ANOTHER";
    btn.disabled = false;
    busyF = false;
  }
  if (btn) btn.addEventListener("click", reveal);

  /* ============================================================
     COIN FLIP — one button, pure luck
     ============================================================ */
  (() => {
    const coinEl = $("#coin"), msgEl = $("#coin-msg"), scoreEl = $("#coin-score"), promptEl = $("#coin-prompt");
    const btn = $("#c-flip");
    if (!coinEl) return;
    // Letters are about twice as tall as they are wide, so the coin is drawn 7 rows tall
    // and ~15 columns wide to look round. f = how "open" the coin is (1 = facing you, 0 = edge-on).
    const R = 7.4, CX = 8, ROWS = 7;
    const FACE = {
      H: { eyes: "^ ^", mid: "HEADS", mouth: "w" },
      T: { eyes: "- -", mid: "TAILS", mouth: "o" }
    };
    const ctr = (s, w) => { if (s.length > w) return " ".repeat(w); const l = Math.floor((w - s.length) / 2); return " ".repeat(l) + s + " ".repeat(w - s.length - l); };
    function coin(f, face) {
      const fc = FACE[face], out = [];
      for (let i = 0; i < ROWS; i++) {
        const y = (i - 3) * 2;
        const hw = Math.sqrt(Math.max(0, R * R - y * y)) * f;
        const l = Math.round(CX - hw), r = Math.round(CX + hw);
        const lead = " ".repeat(Math.max(0, l));
        if (r - l < 2) {                                  // edge-on: a thin slab
          out.push(" ".repeat(CX) + (i === 0 ? "." : i === ROWS - 1 ? "'" : "|"));
          continue;
        }
        const inner = r - l - 1;
        if (i === 0) out.push(lead + "." + "-".repeat(inner) + ".");
        else if (i === ROWS - 1) out.push(lead + "'" + "-".repeat(inner) + "'");
        else {
          const t = i === 2 ? fc.eyes : i === 3 ? fc.mid : i === 4 ? fc.mouth : "";
          out.push(lead + "(" + ctr(t, inner) + ")");
        }
      }
      return out.join("\n");
    }
    const SPIN = [1, 0.9, 0.7, 0.45, 0.2, 0.05, 0.2, 0.45, 0.7, 0.9, 1];   // index 5 = edge-on
    const SAY = {
      H: ["heads.", "heads. the coin has spoken.", "heads. obviously.", "heads. no notes."],
      T: ["tails.", "tails. the coin has spoken.", "tails. obviously.", "tails. no notes."]
    };
    const pick = (a) => a[Math.floor(Math.random() * a.length)];

    let heads = 0, tails = 0, busy = false, shown = "H";
    const score = () => { scoreEl.textContent = "heads " + heads + " · tails " + tails; };
    coinEl.textContent = coin(1, "H"); score();

    async function flip() {
      if (busy) return;
      busy = true; btn.disabled = true;
      const result = Math.random() < 0.5 ? "H" : "T";
      msgEl.textContent = " "; promptEl.textContent = "> in the air...";
      if (reduce) { shown = result; coinEl.textContent = coin(1, result); }
      else {
        let face = shown;
        const passes = 3;
        for (let p = 0; p < passes; p++) {
          for (let i = 0; i < SPIN.length; i++) {
            if (i === 5) face = face === "H" ? "T" : "H";                // turns over at the edge
            if (p === passes - 1 && i >= 5) face = result;               // last half-turn lands on the answer
            coinEl.textContent = coin(SPIN[i], face);
            await wait(70);
          }
        }
        shown = result;
      }
      if (result === "H") heads++; else tails++;
      msgEl.textContent = "> " + pick(SAY[result]);
      promptEl.textContent = "> flip again?";
      score();
      busy = false; btn.disabled = false;
    }
    btn.addEventListener("click", flip);
    document.addEventListener("keydown", (e) => {
      if (location.hash !== "#coin" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "f" || e.key === "F") flip();
    });
  })();

  /* ============================================================
     SPIN THE BOTTLE — spin it, it points at someone, they get a question (or a dare)
     ============================================================ */
  (() => {
    const bottleEl = $("#bottle"), msgEl = $("#spin-msg"), btn = $("#s-spin");
    const card = $("#spin-card"), qEl = $("#sc-q"), dEl = $("#sc-d");
    if (!bottleEl) return;
    const Q = window.BOTTLE_QUESTIONS || [], D = window.BOTTLE_DARES || [];
    const ROWS = 13, COLS = 27, CY = 6, CX = 13;
    function draw(th) {
      const g = Array.from({ length: ROWS }, () => Array(COLS).fill(" "));
      const put = (x, y, ch) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) g[y][x] = ch; };
      for (let k = 0; k < 40; k++) {                    // the "table" ring (x is doubled: letters are ~2x taller than wide)
        const a = (k / 40) * Math.PI * 2;
        put(Math.round(CX + 2 * 6 * Math.cos(a)), Math.round(CY + 6 * Math.sin(a)), ".");
      }
      for (let r = -4.2; r <= 4.7; r += 0.2) {
        const x = Math.round(CX + 2 * r * Math.cos(th)), y = Math.round(CY + r * Math.sin(th));
        put(x, y, r < 0.8 ? "#" : r < 2.9 ? "=" : r < 3.9 ? "+" : "@");
        if (r < 0.8) put(x + 1, y, "#");            // chunkier body
      }
      return g.map((row) => row.join("")).join("\n");
    }
    function bag(arr) {
      let b = [], last = -1;
      return () => {
        if (!b.length) {
          b = arr.map((_, i) => i);
          for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
          if (b.length > 1 && b[b.length - 1] === last) [b[0], b[b.length - 1]] = [b[b.length - 1], b[0]];
        }
        last = b.pop(); return arr[last];
      };
    }
    const nextQ = bag(Q), nextD = bag(D);
    let angle = Math.random() * Math.PI * 2, busy = false;
    bottleEl.textContent = draw(angle);

    async function spin() {
      if (busy) return;
      busy = true; btn.disabled = true; card.hidden = true;
      msgEl.textContent = "> round and round...";
      const total = (3 + Math.random() * 2) * Math.PI * 2 + Math.random() * Math.PI * 2, start = angle;
      if (reduce) angle = start + total;
      else {
        const N = 64;
        for (let i = 1; i <= N; i++) {
          const t = i / N;
          angle = start + total * (1 - Math.pow(1 - t, 3));
          bottleEl.textContent = draw(angle);
          await wait(28 + t * t * 110);
        }
      }
      bottleEl.textContent = draw(angle);
      msgEl.textContent = "> the bottle has chosen.";
      qEl.textContent = nextQ() || "";
      dEl.textContent = nextD() || "";
      card.hidden = false;
      busy = false; btn.disabled = false;
      btn.textContent = "[S] SPIN AGAIN";
    }
    btn.addEventListener("click", spin);
    document.addEventListener("keydown", (e) => {
      if (location.hash !== "#spin" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "s" || e.key === "S") spin();
    });
  })();

  /* ============================================================
     PERSONALITY QUIZ — questions and results live in quiz.js
     ============================================================ */
  (() => {
    const Z = window.QUIZ;
    const intro = $("#quiz-intro"), qBox = $("#quiz-q"), rBox = $("#quiz-r");
    if (!Z || !intro) return;
    const prog = $("#q-prog"), qText = $("#q-text"), ans = $("#q-answers");
    const rCrit = $("#r-crit"), rName = $("#r-name"), rText = $("#r-text");
    let i = 0, tally = {}, order = [], timer = 0;

    function showOnly(box) { intro.hidden = box !== intro; qBox.hidden = box !== qBox; rBox.hidden = box !== rBox; window.scrollTo(0, 0); }
    function start() { i = 0; tally = {}; order = []; clearInterval(timer); ask(); }
    function ask() {
      const q = Z.questions[i];
      showOnly(qBox);
      prog.textContent = "question " + (i + 1) + " of " + Z.questions.length;
      qText.textContent = q.q;
      ans.textContent = "";
      q.a.forEach(([label, key]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "q-ans"; b.textContent = label;
        b.addEventListener("click", () => {
          tally[key] = (tally[key] || 0) + 1; order.push(key);
          if (++i < Z.questions.length) ask(); else finish();
        });
        ans.appendChild(b);
      });
    }
    function finish() {
      const max = Math.max(...Object.values(tally));
      const tied = Object.keys(tally).filter((k) => tally[k] === max);
      // tie? the most recent matching answer wins
      let key = tied[0];
      for (let n = order.length - 1; n >= 0; n--) if (tied.includes(order[n])) { key = order[n]; break; }
      const r = Z.results[key];
      showOnly(rBox);
      rName.textContent = r.name; rText.textContent = r.text;
      const c = CRITTERS[r.critter]; let f = 0;
      rCrit.textContent = critText(c, 0);
      clearInterval(timer);
      if (!reduce) timer = setInterval(() => {
        if (location.hash !== "#quiz" || document.hidden) return;
        f ^= 1; rCrit.textContent = critText(c, f);
      }, 650);
    }
    $("#q-start").addEventListener("click", start);
    $("#q-again").addEventListener("click", start);
    window.addEventListener("hashchange", () => { if (location.hash !== "#quiz") { clearInterval(timer); showOnly(intro); } });
  })();

  /* ---------- go ---------- */
  route();
})();
