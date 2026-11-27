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
  const views = { home: $("#v-home"), album: $("#v-album"), fortune: $("#v-fortune") };
  let active = null;

  function show(name) {
    if (name === active) return;
    if (active === "album") album.leave();
    if (active === "home") smoke.stop();
    active = name;
    for (const k in views) views[k].hidden = k !== name;
    window.scrollTo(0, 0);
    if (name === "home") { boot(); smoke.start(); }
    if (name === "album") album.enter();
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
    if (e.key === "2") location.hash = "fortune";
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
    await typeInto(text);
    sr.textContent = "Your fortune: " + text;

    btn.textContent = "TAKE ANOTHER";
    btn.disabled = false;
    busyF = false;
  }
  if (btn) btn.addEventListener("click", reveal);

  /* ---------- go ---------- */
  route();
})();
