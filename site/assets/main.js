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
      item.querySelectorAll(".flavor-list [data-flavor]").forEach(li => {
        const m = !!flavor && li.dataset.flavor === flavor;
        li.classList.toggle("is-match", m);
        hit = hit || m;
      });
      item.classList.toggle("is-dim", !!flavor && !hit);
      if (hit) ways.push(item.dataset.item);
    });
    menu.querySelectorAll(".cookie").forEach(ck => ck.classList.toggle("is-dim", !!flavor && ck.dataset.flavor !== flavor));
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

  /* ---------- Lightbox: the printed menu (review photos use it too) ---------- */
  const lightbox = document.querySelector("[data-lightbox]");
  if (lightbox) {
    lightbox.querySelector("[data-lightbox-close]").addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", e => { if (e.target === lightbox) lightbox.close(); });
    const showMenu = document.querySelector("[data-show-menu]");
    if (showMenu) showMenu.addEventListener("click", () => {
      if (typeof lightbox.showModal !== "function") { window.open("assets/img/printed-menu.webp", "_blank"); return; }
      const img = lightbox.querySelector("[data-lightbox-img]");
      img.src = "assets/img/printed-menu.webp";
      img.alt = "The printed Treats Menu: bestsellers, cheesecake cups, dipped slices, cookies and specialty items with prices";
      lightbox.querySelector("[data-lightbox-cap]").textContent = "The menu on the truck.";
      lightbox.showModal();
    });
  }
})();
