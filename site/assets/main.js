(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Nav: a shadow once the page moves under it ---------- */
  const nav = document.querySelector("[data-nav]");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Hours and open now (Houston time) ---------- */
  // From the Instagram bio: Friday to Sunday, 2 to 8 PM. Also update the JSON-LD in index.html, the facts strip and the footer.
  const HOURS = [ // index = day of week, 0 = Sunday. [name, open, close] in 24h decimal hours; null = closed
    ["Sunday", 14, 20], ["Monday", null], ["Tuesday", null], ["Wednesday", null],
    ["Thursday", null], ["Friday", 14, 20], ["Saturday", 14, 20]
  ];
  const fmt = h => {
    const hr = Math.floor(h), min = Math.round((h - hr) * 60);
    return `${hr % 12 || 12}${min ? ":" + String(min).padStart(2, "0") : ""} ${hr >= 12 ? "PM" : "AM"}`;
  };
  const houstonNow = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23"
    }).formatToParts(new Date()).map(p => [p.type, p.value]));
    return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday), time: +parts.hour + parts.minute / 60 };
  };

  const table = document.querySelector("[data-hours]");
  const pills = document.querySelectorAll("[data-open-pill]");
  const renderHours = () => {
    const { day, time } = houstonNow();
    if (day < 0) return;

    if (table) {
      table.textContent = "";
      const row = (label, value, today) => {
        const tr = document.createElement("tr");
        if (today) tr.className = "is-today";
        const th = document.createElement("th");
        th.scope = "row";
        th.textContent = label;
        const td = document.createElement("td");
        td.textContent = value;
        tr.append(th, td);
        table.append(tr);
      };
      [5, 6, 0].forEach(d => row(HOURS[d][0], `${fmt(HOURS[d][1])} to ${fmt(HOURS[d][2])}`, d === day));
      row("Monday to Thursday", "Closed", day >= 1 && day <= 4);
    }

    const [, o, c] = HOURS[day];
    const open = o != null && time >= o && time < c;
    let text;
    if (open) text = `Open now · until ${fmt(c)}`;
    else if (o != null && time < o) text = `Opens today at ${fmt(o)}`;
    else {
      let ahead = 1;
      while (HOURS[(day + ahead) % 7][1] == null && ahead < 7) ahead++;
      const [name, next] = HOURS[(day + ahead) % 7];
      text = `Closed now · opens ${ahead === 1 ? "tomorrow" : name} at ${fmt(next)}`;
    }
    pills.forEach(p => {
      p.textContent = text;
      p.classList.toggle("is-open", open);
      p.classList.toggle("is-closed", !open);
    });
  };
  renderHours();
  setInterval(renderHours, 60000);

  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- The 3D strawberry: loads after the page, never on Save-Data ---------- */
  const host = document.querySelector("[data-berry3d]");
  const conn = navigator.connection;
  if (host && !(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "")))) {
    const load = () => import(new URL("assets/strawberry3d.js", document.baseURI).href)
      .then(m => m.mount(host))
      .catch(() => { /* no WebGL: the still image stays */ });
    const idle = cb => ("requestIdleCallback" in window ? requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 500));
    if (document.readyState === "complete") idle(load);
    else addEventListener("load", () => idle(load), { once: true });
  }

  /* ---------- Videos: play muted while on screen, one with sound at a time ---------- */
  const clips = [...document.querySelectorAll("[data-clip]")].map(clip => ({
    clip,
    video: clip.querySelector("video"),
    playBtn: clip.querySelector("[data-clip-play]"),
    soundBtn: clip.querySelector("[data-clip-sound]"),
    userPaused: false,
    inView: false
  }));
  const setSound = (c, on) => {
    c.video.muted = !on;
    c.soundBtn.setAttribute("aria-pressed", String(on));
    c.soundBtn.setAttribute("aria-label", on ? "Turn sound off" : "Turn sound on");
    c.clip.classList.toggle("is-front", on);
  };
  const play = c => { const p = c.video.play(); if (p) p.catch(() => {}); };
  clips.forEach(c => {
    const { video, playBtn, soundBtn, clip } = c;
    const state = () => {
      clip.classList.toggle("is-playing", !video.paused);
      playBtn.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
    };
    video.addEventListener("play", state);
    video.addEventListener("pause", state);
    setSound(c, false);
    playBtn.addEventListener("click", () => {
      if (video.paused) { c.userPaused = false; play(c); }
      else { c.userPaused = true; video.pause(); }
    });
    soundBtn.addEventListener("click", () => {
      const on = video.muted;
      clips.forEach(o => { if (o !== c) setSound(o, false); });
      setSound(c, on);
      if (on) { c.userPaused = false; play(c); }
    });
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      const c = clips.find(x => x.video === en.target);
      c.inView = en.intersectionRatio >= 0.5;
      if (c.inView && !c.userPaused && !reduced.matches && c.video.paused) play(c);
      if (!c.inView && !c.video.paused) c.video.pause();
    }), { threshold: [0, 0.5] });
    clips.forEach(c => io.observe(c.video));
  }

  /* ---------- Menu: pick a flavor, see every way to get it ---------- */
  const menu = document.querySelector("[data-menu]");
  const chips = document.querySelectorAll("[data-flavor-pick]");
  const note = document.querySelector("[data-flavor-note]");
  const defaultNote = note ? note.textContent : "";
  const list = names => names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const pick = flavor => {
    chips.forEach(ch => {
      const on = ch.dataset.flavorPick === flavor;
      ch.classList.toggle("is-on", on);
      ch.setAttribute("aria-pressed", String(on));
    });
    menu.classList.toggle("is-filtering", !!flavor);
    const ways = [];
    menu.querySelectorAll(".item").forEach(item => {
      let hit = false;
      item.querySelectorAll("[data-flavor]").forEach(el => {
        const m = !!flavor && el.dataset.flavor === flavor;
        el.classList.toggle("is-match", m);
        hit = hit || m;
      });
      item.querySelectorAll(".tile, .cookie, .shelf__more").forEach(t => t.classList.toggle("is-dim", !!flavor && t.dataset.flavor !== flavor));
      item.classList.toggle("is-dim", !!flavor && !hit);
      if (hit) ways.push(item.dataset.item);
    });
    if (!note) return;
    if (!flavor) { note.textContent = defaultNote; return; }
    const name = [...chips].find(ch => ch.dataset.flavorPick === flavor).textContent;
    note.textContent = "";
    const b = document.createElement("b");
    b.textContent = name;
    note.append(b, ` comes ${ways.length} ways: ${list(ways)}.`);
  };
  if (menu) chips.forEach(ch => ch.addEventListener("click", () => pick(ch.dataset.flavorPick)));

  /* ---------- Cookies flip over to show what's in them ---------- */
  document.querySelectorAll(".cookie").forEach(ck => ck.addEventListener("click", () => {
    ck.setAttribute("aria-pressed", String(ck.getAttribute("aria-pressed") !== "true"));
  }));

  /* ---------- Cups or cones: every tile turns over to the other one ---------- */
  const cups = document.querySelector(".item--cups");
  if (cups) {
    const btns = cups.querySelectorAll("[data-shape-pick]");
    const price = cups.querySelector("[data-shape-price]");
    btns.forEach(btn => btn.addEventListener("click", () => {
      const shape = btn.dataset.shapePick;
      cups.dataset.shape = shape;
      btns.forEach(x => {
        const on = x === btn;
        x.classList.toggle("is-on", on);
        x.setAttribute("aria-pressed", String(on));
      });
      price.textContent = shape === "cone" ? "$13" : "$12";
    }));
  }

  /* ---------- The headshot leans toward the pointer ---------- */
  const tilt = document.querySelector("[data-tilt]");
  if (tilt && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    tilt.addEventListener("pointermove", e => {
      if (reduced.matches) return;
      const r = tilt.getBoundingClientRect();
      tilt.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`);
      tilt.style.setProperty("--rx", `${-((e.clientY - r.top) / r.height - 0.5) * 9}deg`);
    });
    tilt.addEventListener("pointerleave", () => { tilt.style.setProperty("--ry", "0deg"); tilt.style.setProperty("--rx", "0deg"); });
  }

  /* ---------- Lightbox: the menu boards as a gallery (review photos use it one at a time) ---------- */
  const BOARDS = [
    { src: "assets/img/board-menu.webp", cap: "Treats Menu", alt: "The Treats Menu board: bestsellers, cheesecake cups, dipped slices, cookies and specialty items with prices" },
    { src: "assets/img/board-cups.webp", cap: "Cheesecake Cups or Cones", alt: "Cheesecake Cups or Cones board: Biscoff, Fruity Pebbles, Oreo, Banana Pudding and Strawberry Crunch, $12 a cup and $1 more for a cone" },
    { src: "assets/img/board-slices.webp", cap: "Dipped Cheesecake Slices", alt: "Dipped Cheesecake Slices board: banana pudding, Fruity Pebbles, red velvet, Oreo, strawberry crunch and Biscoff, $10" },
    { src: "assets/img/board-cookies.webp", cap: "$4 Gourmet Cookies", alt: "$4 Gourmet Cookies board: eleven cookies with what's in each one" },
    { src: "assets/img/board-specialty.webp", cap: "Specialty Items", alt: "Specialty Items board: candied grapes, churro cheesecake, chocolate covered and stuffed cheesecake strawberries, cupcakes, ice cream, apple salad and dipped apple slices with prices" }
  ];
  const lightbox = document.querySelector("[data-lightbox]");
  if (lightbox) {
    const img = lightbox.querySelector("[data-lightbox-img]");
    const cap = lightbox.querySelector("[data-lightbox-cap]");
    let at = 0;
    const show = i => {
      at = (i + BOARDS.length) % BOARDS.length;
      img.src = BOARDS[at].src;
      img.alt = BOARDS[at].alt;
      cap.textContent = `${BOARDS[at].cap} · ${at + 1} of ${BOARDS.length}`;
    };
    lightbox.querySelector("[data-lightbox-close]").addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", e => { if (e.target === lightbox) lightbox.close(); });
    lightbox.querySelector("[data-lightbox-prev]").addEventListener("click", () => show(at - 1));
    lightbox.querySelector("[data-lightbox-next]").addEventListener("click", () => show(at + 1));
    lightbox.addEventListener("keydown", e => {
      if (lightbox.dataset.mode !== "boards") return;
      if (e.key === "ArrowRight") show(at + 1);
      if (e.key === "ArrowLeft") show(at - 1);
    });
    // Swipe between boards on touch screens.
    let sx = null;
    img.addEventListener("pointerdown", e => { sx = e.clientX; });
    img.addEventListener("pointerup", e => {
      if (sx === null || lightbox.dataset.mode !== "boards") return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
    });
    document.querySelectorAll("[data-board-open]").forEach(btn => btn.addEventListener("click", () => {
      const i = +btn.dataset.boardOpen;
      if (typeof lightbox.showModal !== "function") { window.open(BOARDS[i].src, "_blank"); return; }
      lightbox.dataset.mode = "boards";
      show(i);
      lightbox.showModal();
    }));
  }
})();
