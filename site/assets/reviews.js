/* Reviews band. Same belt as hens18/hwest and hens18/kanji: it drifts right to left and people can stop, drag and open it.

   No review text came with the brief, and the "Reviews" highlights on Instagram can't be read from here, so for now the
   belt shows the Instagram card, one real press feature, and clearly marked review slots. Never invent or edit review text.
   To add a review, add an entry to REVIEWS (word for word); slots fill whatever is left up to MIN_CARDS. */
const REVIEWS = [
  // { name: "First L.", date: "2026-09-20", rating: 5, source: "Instagram", pull: "A short line from the review.",
  //   body: ["The whole review, word for word."], photos: [{ src: "assets/img/review-x.webp", alt: "...", caption: "..." }] }
];
const MIN_CARDS = 4;

const PRESS = [
  {
    outlet: "Houston Style Magazine",
    date: "2025-08-05",
    headline: "PVAMU Senior Jayla Stanford Opens Dessert Truck",
    url: "https://stylemagazine.com/photos/galleries/2025/aug/05/pvamu-senior-jayla-stanford-opens-dessert-truck-treatsdippedbyjay/"
  }
];

// From the client's Instagram screenshot (October 2026).
const SOCIAL = {
  count: "24.7K",
  note: "people following the truck on Instagram",
  instagram: "https://www.instagram.com/treatsdippedbyjay/",
  tiktok: "https://www.tiktok.com/@treatsdippedbyjay"
};

(() => {
  const section = document.querySelector(".reviews");
  if (!section) return;
  const belt = section.querySelector("[data-belt]");
  const track = section.querySelector("[data-belt-track]");
  const prevBtn = section.querySelector("[data-belt-prev]");
  const nextBtn = section.querySelector("[data-belt-next]");
  const pauseBtn = section.querySelector("[data-belt-pause]");
  const status = section.querySelector("[data-belt-status]");
  const lightbox = document.querySelector("[data-lightbox]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const SPEED = 34; // px per second, right to left

  // Openable cards: real reviews first (newest first), then slots.
  const ENTRIES = [...REVIEWS].sort((a, b) => b.date.localeCompare(a.date));
  for (let n = ENTRIES.length; n < MIN_CARDS; n++) {
    ENTRIES.push({
      slot: true,
      name: `Review slot ${n + 1}`,
      pull: "A real customer review goes here.",
      body: [
        "This card is waiting for a review from the Reviews highlights on Instagram, copied word for word with the reviewer's first name and the date.",
        "Send it over and it replaces this card."
      ]
    });
  }

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const stars = (n, label) => {
    const wrap = el("span", "stars");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", label || `${n} out of 5 stars`);
    for (let i = 0; i < 5; i++) {
      const s = el("span", "star");
      s.style.setProperty("--fill", `${Math.max(0, Math.min(1, n - i)) * 100}%`);
      s.setAttribute("aria-hidden", "true");
      wrap.append(s);
    }
    return wrap;
  };

  const outLink = (text, href, cls = "rv__link") => {
    const a = el("a", cls, text);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.draggable = false;
    a.append(el("span", null, " ↗"));
    return a;
  };

  /* ---------- Cards ---------- */
  const reviewCard = (r, i) => {
    const card = el("article", r.slot ? "rv rv--slot" : "rv");
    card.dataset.i = i;
    const id = `rv-${i}`;
    card.setAttribute("aria-labelledby", `${id}-name`);

    const head = el("header", "rv__head");
    const mono = el("span", "rv__mono", r.slot ? "?" : r.name.split(" ").map(w => w[0]).join(""));
    mono.setAttribute("aria-hidden", "true");
    const who = el("div", "rv__who");
    const name = el("h3", "rv__name", r.name);
    name.id = `${id}-name`;
    who.append(name, el("p", "rv__place", r.slot ? "Placeholder, not a review" : (r.place || r.source || "")));
    head.append(mono, who);
    card.append(head);

    if (!r.slot) {
      const meta = el("p", "rv__meta");
      if (r.rating) meta.append(stars(r.rating));
      const time = el("time", null, fmt.format(new Date(r.date)));
      time.dateTime = r.date;
      meta.append(time);
      if (r.source) meta.append(el("span", "rv__src", `on ${r.source}`));
      card.append(meta);
    }

    const quote = el(r.slot ? "div" : "blockquote", "rv__quote");
    quote.append(el("p", "rv__pull", r.slot ? r.pull : `“${r.pull}”`));
    const body = el("div", "rv__body");
    body.id = `${id}-body`;
    r.body.forEach(p => body.append(el("p", null, p)));
    quote.append(body);
    card.append(quote);

    if (r.photos && r.photos.length) {
      const row = el("div", "rv__photos");
      r.photos.forEach(ph => {
        const b = el("button", "rv__photo");
        b.type = "button";
        b.dataset.src = ph.src;
        b.dataset.caption = ph.caption || "";
        b.setAttribute("aria-label", `View photo: ${ph.alt}`);
        const img = el("img");
        img.src = ph.src;
        img.alt = "";
        img.loading = "lazy";
        img.draggable = false;
        b.append(img);
        row.append(b);
      });
      card.append(row);
    }

    const more = el("button", "rv__more", r.slot ? "What goes here" : "Read the full review");
    more.type = "button";
    more.setAttribute("aria-controls", body.id);
    more.setAttribute("aria-expanded", "false");
    card.append(more);
    return card;
  };

  const socialCard = () => {
    const card = el("article", "rv rv--social");
    card.setAttribute("aria-label", `${SOCIAL.count} ${SOCIAL.note}`);
    const top = el("div");
    top.append(el("p", "rv__score", SOCIAL.count), el("p", "rv__score-note", SOCIAL.note));
    const links = el("div", "rv__links");
    links.append(outLink("See the Reviews highlights", SOCIAL.instagram), outLink("Watch on TikTok", SOCIAL.tiktok));
    card.append(top, links);
    return card;
  };

  const pressCard = p => {
    const card = el("article", "rv rv--press");
    card.setAttribute("aria-label", `${p.outlet}: ${p.headline}`);
    const top = el("div");
    const time = el("time", "rv__press-date", fmt.format(new Date(p.date)));
    time.dateTime = p.date;
    top.append(el("p", "rv__press-outlet", `In the press · ${p.outlet}`), el("p", "rv__press-head", p.headline), time);
    card.append(top, outLink("Read the feature", p.url, "rv__link rv__link--dark"));
    return card;
  };

  // One set: a review, the Instagram card, a review, the press feature, then the rest.
  const buildSet = () => {
    const cards = ENTRIES.map((r, i) => reviewCard(r, i));
    const extras = [socialCard(), ...PRESS.map(pressCard)];
    const set = [];
    cards.forEach((c, i) => {
      set.push(c);
      if (extras.length && i < 2) set.push(extras.shift());
    });
    set.push(...extras);
    set.forEach(c => c.setAttribute("role", "listitem"));
    return set;
  };

  // The first set is the real one; copies fill the belt so it can loop and are hidden from screen readers.
  const asCopy = card => {
    card.setAttribute("aria-hidden", "true");
    card.removeAttribute("role");
    card.querySelectorAll("[id]").forEach(n => n.removeAttribute("id"));
    card.querySelectorAll("button, a").forEach(n => n.tabIndex = -1);
    card.removeAttribute("aria-labelledby");
    return card;
  };

  let period = 1;
  const build = () => {
    track.textContent = "";
    buildSet().forEach(c => track.append(c));
    buildSet().forEach(c => track.append(asCopy(c)));
    const first = track.children[0];
    const setLen = track.children.length / 2;
    period = track.children[setLen].offsetLeft - first.offsetLeft || 1;
    while (track.scrollWidth < period + belt.clientWidth * 1.5) buildSet().forEach(c => track.append(asCopy(c)));
    syncOpen();
  };

  /* ---------- Motion: drift right to left, ease to a stop, drag, glide ---------- */
  let offset = 0, speed = 0, fling = 0, glide = null, openIdx = null;
  let last = performance.now(), raf = 0, painted = null;
  const hold = { user: false, hover: false, focus: false, offscreen: true, hidden: document.hidden, drag: false };
  const running = () => !reduced.matches && !hold.user && !hold.hover && !hold.focus && !hold.drag && openIdx === null;

  const paint = () => {
    const shown = ((offset % period) + period) % period;
    const v = shown.toFixed(1);
    if (v !== painted) { track.style.transform = `translate3d(${-v}px,0,0)`; painted = v; }
  };

  const tick = now => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    speed += ((running() ? SPEED : 0) - speed) * (1 - Math.exp(-dt * 3));
    if (glide !== null) {
      offset += (glide - offset) * (1 - Math.exp(-dt * 8));
      if (Math.abs(glide - offset) < 0.4) { offset = glide; glide = null; }
    } else if (!hold.drag) {
      offset += (speed + fling) * dt;
      fling *= Math.exp(-dt * 3.5);
      if (Math.abs(fling) < 3) fling = 0;
    }
    paint();
    raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const sync = () => {
    (hold.offscreen || hold.hidden) ? stop() : start();
    section.classList.toggle("is-running", running());
  };

  const glideTo = to => {
    fling = 0;
    if (reduced.matches) { offset = to; glide = null; paint(); }
    else glide = to;
  };
  const centerOf = card => {
    const r = card.getBoundingClientRect(), b = belt.getBoundingClientRect();
    return offset + (r.left + r.width / 2) - (b.left + b.width / 2);
  };

  /* ---------- Open a card: stop, center it, show all of it ---------- */
  function syncOpen() {
    track.classList.toggle("has-open", openIdx !== null);
    track.querySelectorAll(".rv[data-i]").forEach(c => {
      const on = String(openIdx) === c.dataset.i;
      const slot = c.classList.contains("rv--slot");
      c.classList.toggle("is-open", on);
      const more = c.querySelector(".rv__more");
      more.setAttribute("aria-expanded", String(on));
      more.textContent = on ? "Show less" : (slot ? "What goes here" : "Read the full review");
    });
    measure();
  }
  const open = card => {
    openIdx = +card.dataset.i;
    syncOpen();
    glideTo(centerOf(card));
    status.textContent = `Stopped on ${ENTRIES[openIdx].name}`;
    sync();
  };
  const close = () => {
    if (openIdx === null) return;
    openIdx = null;
    syncOpen();
    status.textContent = "Reviews moving again";
    sync();
  };

  // Hide "Read the full review" where nothing is cut off.
  function measure() {
    track.querySelectorAll(".rv[data-i]").forEach(c => {
      if (c.classList.contains("is-open")) return;
      const body = c.querySelector(".rv__body");
      c.querySelector(".rv__more").hidden = body.scrollHeight <= body.clientHeight + 2 && !c.querySelector(".rv__photos");
    });
  }

  /* ---------- Lightbox for review photos ---------- */
  const showPhoto = btn => {
    if (!lightbox || typeof lightbox.showModal !== "function") return;
    lightbox.dataset.mode = "photo";
    lightbox.querySelector("[data-lightbox-img]").src = btn.dataset.src;
    lightbox.querySelector("[data-lightbox-img]").alt = btn.getAttribute("aria-label").replace(/^View photo: /, "");
    lightbox.querySelector("[data-lightbox-cap]").textContent = btn.dataset.caption;
    lightbox.showModal();
  };

  /* ---------- Input ---------- */
  let suppressClick = false;
  track.addEventListener("click", e => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    if (e.target.closest("a")) return;
    const card = e.target.closest(".rv[data-i]");
    if (!card) return;
    const photo = e.target.closest(".rv__photo");
    if (photo) {
      if (String(openIdx) !== card.dataset.i) open(card);
      showPhoto(photo);
      return;
    }
    if (String(openIdx) === card.dataset.i) close();
    else open(card);
  });

  document.addEventListener("click", e => {
    if (openIdx !== null && !e.target.closest(".belt, .belt__controls, [data-lightbox]")) close();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && openIdx !== null && !(lightbox && lightbox.open)) close();
  });

  const step = () => {
    const c = track.querySelector(".rv");
    return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20) : 400;
  };
  const move = dir => {
    if (openIdx !== null) {
      // Step to the neighbouring card (the copy nearest the center in that direction) and open it.
      const mid = belt.getBoundingClientRect().left + belt.clientWidth / 2;
      const cards = [...track.querySelectorAll(".rv[data-i]")]
        .map(c => ({ c, x: c.getBoundingClientRect().left + c.offsetWidth / 2 - mid }))
        .filter(o => dir > 0 ? o.x > 40 : o.x < -40)
        .sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
      if (cards[0]) open(cards[0].c);
      return;
    }
    glideTo((glide ?? offset) + dir * step());
  };
  prevBtn.addEventListener("click", () => move(-1));
  nextBtn.addEventListener("click", () => move(1));
  belt.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
  });

  pauseBtn.addEventListener("click", () => {
    hold.user = !hold.user;
    pauseBtn.setAttribute("aria-pressed", String(hold.user));
    pauseBtn.querySelector("span").textContent = hold.user ? "Play" : "Pause";
    status.textContent = hold.user ? "Reviews paused" : "Reviews moving";
    sync();
  });

  belt.addEventListener("pointerenter", e => { if (e.pointerType === "mouse" && finePointer.matches) { hold.hover = true; sync(); } });
  belt.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") { hold.hover = false; sync(); } });
  belt.addEventListener("focusin", () => { hold.focus = true; sync(); });
  belt.addEventListener("focusout", e => { if (!belt.contains(e.relatedTarget)) { hold.focus = false; sync(); } });

  // Drag (mouse) or swipe (touch) to look around; a quick flick keeps it gliding.
  let down = null;
  belt.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, from: offset, lx: e.clientX, lt: e.timeStamp, v: 0 };
  });
  belt.addEventListener("pointermove", e => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!hold.drag) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { down = null; return; }
      if (Math.abs(dx) < 8) return;
      hold.drag = true;
      glide = null;
      fling = 0;
      try { belt.setPointerCapture(down.id); } catch (_) {}
      belt.classList.add("is-dragging");
      sync();
    }
    offset = down.from - dx;
    const dt = Math.max(1, e.timeStamp - down.lt);
    down.v = 0.8 * (-(e.clientX - down.lx) / dt * 1000) + 0.2 * down.v;
    down.lx = e.clientX;
    down.lt = e.timeStamp;
    paint();
  });
  const release = e => {
    if (!down || (e && e.pointerId !== down.id)) return;
    if (hold.drag) {
      if (!reduced.matches) fling = Math.max(-2400, Math.min(2400, down.v));
      hold.drag = false;
      belt.classList.remove("is-dragging");
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 60);
      sync();
    }
    down = null;
  };
  belt.addEventListener("pointerup", release);
  belt.addEventListener("pointercancel", release);
  belt.addEventListener("dragstart", e => e.preventDefault());

  // Sideways trackpad scrolling moves the belt too.
  belt.addEventListener("wheel", e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    glide = null;
    offset += e.deltaX;
    paint();
  }, { passive: false });

  document.addEventListener("visibilitychange", () => { hold.hidden = document.hidden; sync(); });
  reduced.addEventListener("change", sync);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { hold.offscreen = !entry.isIntersecting; sync(); }, { threshold: 0 }).observe(belt);
  } else {
    hold.offscreen = false;
  }

  // Start with the first card lined up with the heading above it.
  let width = 0, placed = false;
  const onResize = () => {
    if (belt.clientWidth === width) { measure(); return; }
    width = belt.clientWidth;
    build();
    if (!placed) {
      const head = section.querySelector(".reviews__head");
      offset = period - (head.getBoundingClientRect().left - belt.getBoundingClientRect().left);
      placed = true;
    }
    paint();
  };
  addEventListener("resize", () => { clearTimeout(onResize.t); onResize.t = setTimeout(onResize, 150); });
  if (document.fonts) document.fonts.ready.then(measure);

  onResize();
  sync();
})();
