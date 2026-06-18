/* ===========================================================
   Good Habits — a tiny, local-first habit tracker.
   No accounts, no servers: everything saves to this browser.
   =========================================================== */

(function () {
  "use strict";

  const STORAGE_KEY = "goodhabits.v1";
  const INTRO_KEY = "goodhabits.introSeen.v1";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const RING_C = 2 * Math.PI * 52;

  // ---------- DOM ----------
  const el = (id) => document.getElementById(id);
  const calendar = el("calendar");
  const calendarArea = el("calendarArea");
  const emptyState = el("emptyState");
  const statsRow = el("statsRow");
  const habitNameBtn = el("habitName");
  const statDays = el("statDays");
  const statStreak = el("statStreak");
  const statYear = el("statYear");
  const yearLabel = el("yearLabel");
  const ringWrap = el("ringWrap");
  const ringProgress = el("ringProgress");
  const ringLabel = el("ringLabel");
  const adminPanel = el("adminPanel");
  const adminOverlay = el("adminOverlay");
  const habitList = el("habitList");
  const newHabitInput = el("newHabitInput");
  const orientToggle = el("orientToggle");
  const pastToggle = el("pastToggle");
  const tzSelect = el("tzSelect");
  const reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  // ---------- Date helpers ----------
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const fmtDate = (d) => fmt(d.getFullYear(), d.getMonth(), d.getDate());
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  // "Today" is computed in the active time zone so dates stay correct.
  const deviceTz = (function () {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; }
  })();
  function computeToday(tz) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      const d = new Date();
      return fmt(d.getFullYear(), d.getMonth(), d.getDate());
    }
  }
  function addDays(dateStr, delta) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  let todayStr = computeToday(deviceTz);
  let todayYear = Number(todayStr.slice(0, 4));
  const activeTz = () => (!state || !state.timezone || state.timezone === "auto" ? deviceTz : state.timezone);
  function refreshToday() {
    todayStr = computeToday(activeTz());
    todayYear = Number(todayStr.slice(0, 4));
  }

  const defaultOrientation = () =>
    window.innerWidth >= window.innerHeight ? "horizontal" : "vertical";

  // ---------- State ----------
  let state = load();
  refreshToday();
  let wasComplete = isAllCompleteToday();

  function defaultState() {
    return {
      habits: [
        { id: uid(), name: "Read 15 mins", days: {} },
        { id: uid(), name: "Exercise", days: {} },
        { id: uid(), name: "Drink water", days: {} },
      ],
      currentIndex: 0,
      year: todayYear,
      orientation: defaultOrientation(),
      editPast: true,
      timezone: "auto",
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.habits)) return defaultState();
      data.habits.forEach((h) => {
        if (!h.id) h.id = uid();
        if (!h.days || typeof h.days !== "object") h.days = {};
      });
      data.year = data.year || todayYear;
      data.currentIndex = clampIndex(data.currentIndex || 0, data.habits.length);
      data.orientation = data.orientation === "horizontal" || data.orientation === "vertical"
        ? data.orientation
        : defaultOrientation();
      data.editPast = data.editPast !== false; // default on
      data.timezone = typeof data.timezone === "string" ? data.timezone : "auto";
      return data;
    } catch (e) {
      return defaultState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage might be full or blocked; fail silently */
    }
  }

  function uid() {
    return "h" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function clampIndex(i, len) {
    if (len <= 0) return 0;
    return Math.max(0, Math.min(i, len - 1));
  }

  const currentHabit = () => state.habits[state.currentIndex] || null;

  function countDays(habit, year) {
    const prefix = year + "-";
    let n = 0;
    for (const k in habit.days) if (habit.days[k] && k.startsWith(prefix)) n++;
    return n;
  }

  // Consecutive completed days ending today (or yesterday, so an unlogged
  // "today" doesn't look like a broken streak before you've checked in).
  function currentStreak(habit) {
    let cur = todayStr;
    if (!habit.days[cur]) cur = addDays(cur, -1);
    let streak = 0;
    while (habit.days[cur]) {
      streak++;
      cur = addDays(cur, -1);
    }
    return streak;
  }

  function isAllCompleteToday() {
    if (!state.habits.length) return false;
    return state.habits.every((h) => h.days[todayStr]);
  }

  // ---------- Rendering ----------
  function renderAll() {
    state.currentIndex = clampIndex(state.currentIndex, state.habits.length);
    const has = state.habits.length > 0;
    emptyState.hidden = has;
    calendar.style.display = has ? "" : "none";
    statsRow.style.display = has ? "" : "none";

    renderHeader();
    renderCalendar();
    updateRing(false);
    syncOrientToggle();
  }

  function renderHeader() {
    const habit = currentHabit();
    const total = state.habits.length;
    yearLabel.textContent = state.year;
    statYear.textContent = state.year;

    if (!habit) {
      habitNameBtn.textContent = "No habits yet";
      statDays.textContent = "0";
      statStreak.textContent = "0";
      statStreak.parentElement.classList.remove("hot");
      el("prevHabit").disabled = true;
      el("nextHabit").disabled = true;
      return;
    }
    habitNameBtn.textContent = habit.name || "Untitled habit";
    statDays.textContent = countDays(habit, state.year);
    const streak = currentStreak(habit);
    statStreak.textContent = streak;
    statStreak.parentElement.classList.toggle("hot", streak > 0);
    el("prevHabit").disabled = total <= 1;
    el("nextHabit").disabled = total <= 1;
  }

  function makeCell(cls, text) {
    const c = document.createElement("div");
    c.className = cls;
    if (text != null) c.textContent = text;
    return c;
  }

  function makeStar(habit, dateStr, label) {
    const star = document.createElement("button");
    star.className = "star";
    star.type = "button";
    star.dataset.date = dateStr;
    star.setAttribute("aria-label", label);
    if (habit.days[dateStr]) star.classList.add("done");
    if (dateStr === todayStr) star.classList.add("today");
    return star;
  }

  function renderCalendar() {
    cleanupShow(); // stop any running light show before rebuilding the grid
    const habit = currentHabit();
    calendar.className = "calendar " + state.orientation;
    calendar.innerHTML = "";
    if (!habit) return;

    const frag = document.createDocumentFragment();
    frag.appendChild(makeCell("cal-corner"));

    if (state.orientation === "vertical") {
      // Months across the top, days down the side.
      MONTHS.forEach((m) => frag.appendChild(makeCell("col-head", m)));
      for (let d = 1; d <= 31; d++) {
        frag.appendChild(makeCell("row-head", d));
        for (let m = 0; m < 12; m++) {
          if (d > daysInMonth(state.year, m)) { frag.appendChild(makeCell("star empty")); continue; }
          frag.appendChild(makeStar(habit, fmt(state.year, m, d), `${MONTHS[m]} ${d}`));
        }
      }
    } else {
      // Days across the top, months down the side.
      for (let d = 1; d <= 31; d++) frag.appendChild(makeCell("col-head", d));
      for (let m = 0; m < 12; m++) {
        frag.appendChild(makeCell("row-head", MONTHS[m]));
        for (let d = 1; d <= 31; d++) {
          if (d > daysInMonth(state.year, m)) { frag.appendChild(makeCell("star empty")); continue; }
          frag.appendChild(makeStar(habit, fmt(state.year, m, d), `${MONTHS[m]} ${d}`));
        }
      }
    }
    calendar.appendChild(frag);
  }

  function updateRing(animate) {
    const total = state.habits.length;
    const done = state.habits.filter((h) => h.days[todayStr]).length;
    const p = total ? done / total : 0;
    ringProgress.style.strokeDashoffset = RING_C * (1 - p);
    ringLabel.textContent = `${done}/${total}`;

    const complete = total > 0 && done === total;
    ringWrap.classList.toggle("complete", complete);

    if (animate) {
      ringWrap.classList.remove("pop");
      void ringWrap.offsetWidth;
      ringWrap.classList.add("pop");
    }
    wasComplete = complete;
  }

  // ---------- Star toggling ----------
  function onCalendarClick(e) {
    const star = e.target.closest(".star");
    if (!star || star.classList.contains("empty")) return;
    const habit = currentHabit();
    if (!habit) return;

    const dateStr = star.dataset.date;
    // Optionally lock past days from being edited
    if (!state.editPast && dateStr < todayStr) {
      star.classList.remove("locked");
      void star.offsetWidth;
      star.classList.add("locked");
      return;
    }
    const wasAllToday = isAllCompleteToday();
    const nowDone = !habit.days[dateStr];
    if (nowDone) habit.days[dateStr] = true;
    else delete habit.days[dateStr];

    star.classList.toggle("done", nowDone);
    star.classList.remove("pop");
    void star.offsetWidth;
    star.classList.add("pop");
    if (nowDone) burst(star);

    save();
    renderHeader();
    if (dateStr === todayStr) updateRing(true);

    // Light show across the existing calendar stars when completing a day
    if (nowDone) {
      const allNow = isAllCompleteToday();
      if (allNow && !wasAllToday) {
        // Play this habit's themed show first, then roll into the finale.
        starShowPlay(themeFor(habit.name), 1200, () => starShowPlay("finale", 2300));
      } else {
        starShowPlay(themeFor(habit.name), 1200);
      }
    }
  }

  function burst(star) {
    const rect = star.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ["#ff5a2e", "#ff8a4c", "#ffffff"];
    for (let i = 0; i < 8; i++) {
      const p = document.createElement("div");
      p.className = "burst";
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const dist = 16 + Math.random() * 16;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      p.animate(
        [
          { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`, opacity: 0 },
        ],
        { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      ).onfinish = () => p.remove();
    }
  }

  // ---------- Calendar light show (lights the EXISTING stars) ----------
  function themeFor(name) {
    const n = (name || "").toLowerCase();
    const has = (re) => re.test(n);
    if (has(/water|drink|hydrate|tea|coffee/)) return "water";
    if (has(/read|book|study|learn|review/)) return "read";
    if (has(/run|walk|jog|exercise|workout|gym|cardio|step|move|fit|bike|swim/)) return "run";
    if (has(/meditat|breath|calm|yoga|mindful|relax|zen|pray/)) return "meditate";
    if (has(/sleep|bed|rest|nap|wake/)) return "sleep";
    if (has(/music|guitar|piano|sing|practice|instrument|song|drum/)) return "music";
    if (has(/write|journal|draw|paint|create|art|sketch|design|blog/)) return "write";
    return "sparkle";
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // Wrap a flag "sampler" (normalized u,v -> 'o' orange / 'w' white / '' off)
  // into a show generator that wipes the flag in, gives it a gentle wave, and
  // renders it in the app's orange/white/gray palette.
  function flagShow(sampler) {
    return function (c, r, t, W, H) {
      const u0 = W > 1 ? c / (W - 1) : 0.5;
      const v = H > 1 ? r / (H - 1) : 0.5;
      const reveal = Math.min(1, t / 0.32);
      if (u0 > reveal) return 0;
      const u = Math.min(0.999, Math.max(0, u0 + 0.045 * Math.sin(v * 6 + t * 7)));
      const s = sampler(u, v);
      return s === "w" ? 0.95 : s === "o" ? 0.5 : 0;
    };
  }

  // Each generator returns 0..1 brightness for cell (c,r) on a W×H grid at time t (0..1).
  const SHOWS = {
    water(c, r, t, W, H) {
      const fill = easeOut(Math.min(1, t * 1.05));
      const surf = (H - 1) * (1 - 0.72 * fill) + 0.8 * Math.sin(c * 0.9 + t * 14);
      if (r > surf) return r - surf < 1.6 ? 1 : 0.6;
      const drop = (t * 2 % 1) * (H - 1);
      if (Math.abs(c - (W - 1) / 2) < 0.7 && Math.abs(r - drop) < 0.7 && drop < surf) return 1;
      return 0;
    },
    read(c, r, t, W, H) {
      if (r % 2 !== 0) return 0;
      const lines = Math.ceil(H / 2);
      const lt = (t - (r / 2) / lines) / (1 / lines);
      if (lt <= 0) return 0;
      if (lt >= 1) return 0.6;
      return c <= lt * (W - 1) ? 1 : 0;
    },
    run(c, r, t, W, H) {
      const x = t * (W - 1);
      const ground = Math.round(H * 0.7);
      const y = ground - Math.abs(Math.sin(t * Math.PI * 7)) * (H * 0.22);
      if (Math.hypot(c - x, r - y) < 1.1) return 1;
      if (r === ground && c <= x) return c > x - 1.2 ? 0.85 : 0.4;
      return 0;
    },
    meditate(c, r, t, W, H) {
      const cx = (W - 1) / 2, cy = (H - 1) / 2;
      const breath = (1 - Math.cos(t * Math.PI * 2)) / 2;
      const rad = Math.min(W, H) * 0.42 * (0.25 + 0.75 * breath);
      return Math.abs(Math.hypot(c - cx, r - cy) - rad) < 0.95 ? 1 : 0;
    },
    sleep(c, r, t, W, H) {
      const cx = W * 0.38, cy = H * 0.5, R = Math.min(W, H) * 0.32;
      const d1 = Math.hypot(c - cx, r - cy);
      const d2 = Math.hypot(c - (cx + R * 0.55), r - cy - R * 0.1);
      let v = Math.abs(d1 - R) < 0.95 && d2 > R * 0.95 ? 1 : 0;
      const phase = (t * 2) % 1;
      if (Math.hypot(c - W * 0.72, r - (H * 0.62 - phase * H * 0.45)) < 0.7) v = 1;
      if (Math.hypot(c - (W * 0.72 - 1.3), r - (H * 0.62 - ((phase + 0.5) % 1) * H * 0.45)) < 0.6) v = Math.max(v, 0.8);
      return v;
    },
    music(c, r, t, W, H) {
      const h = (0.45 + 0.45 * Math.sin(t * 14 + c * 0.9)) * (H - 1);
      const top = H - 1 - h;
      return r >= top ? (r < top + 1.3 ? 1 : 0.6) : 0;
    },
    write(c, r, t, W, H) {
      const x = t * (W - 1);
      const amp = H * 0.32, mid = (H - 1) / 2;
      if (Math.hypot(c - x, r - (mid + Math.sin(t * Math.PI * 4) * amp)) < 1.0) return 1;
      if (c < x && Math.abs(r - (mid + Math.sin((c / (W - 1)) * Math.PI * 4) * amp)) < 0.85) return 0.5;
      return 0;
    },
    sparkle(c, r, t, W, H) {
      const cx = (W - 1) / 2, cy = (H - 1) / 2;
      const ring = Math.hypot(cx, cy) * easeOut(t);
      let v = Math.abs(Math.hypot(c - cx, r - cy) - ring) < 1.3 ? 1 : 0;
      const seed = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
      if (seed - Math.floor(seed) > 0.82 && Math.sin(t * 22 + c * 1.3 + r) > 0.5) v = Math.max(v, 0.85);
      return v;
    },
    finale(c, r, t, W, H) {
      let v = 0;
      const bursts = [[0.25, 0.45, 0.0], [0.72, 0.32, 0.12], [0.5, 0.6, 0.24], [0.85, 0.62, 0.36], [0.15, 0.58, 0.46], [0.6, 0.25, 0.55]];
      for (const b of bursts) {
        const lt = (t - b[2]) / 0.45;
        if (lt > 0 && lt < 1) {
          const d = Math.hypot(c - b[0] * (W - 1), r - b[1] * (H - 1));
          const rad = Math.min(W, H) * 0.5 * easeOut(lt);
          if (Math.abs(d - rad) < 1.4) v = Math.max(v, 1 - lt * 0.4);
        }
      }
      if (t > 0.72) {
        const sweep = ((t - 0.72) / 0.28) * (W + H + 4);
        if (Math.abs(c + r - sweep) < 2.2) v = Math.max(v, 1);
      }
      return v;
    },

    // Stylized national flags (orange/white/gray), keyed by time zone below.
    fVert3: flagShow((u, v) => (Math.floor(Math.min(0.999, u) * 3) === 1 ? "w" : "o")),
    fHoriz3: flagShow((u, v) => (Math.floor(Math.min(0.999, v) * 3) === 1 ? "w" : "o")),
    fNordic: flagShow((u, v) => (Math.abs(u - 0.34) < 0.09 || Math.abs(v - 0.5) < 0.11 ? "w" : "o")),
    fSun: flagShow((u, v) => (Math.hypot(u - 0.5, v - 0.5) < 0.2 ? "o" : "")),
    fCrescent: flagShow((u, v) => {
      const d1 = Math.hypot(u - 0.4, v - 0.5), d2 = Math.hypot(u - 0.49, v - 0.5);
      if (d1 < 0.22 && d2 > 0.18) return "w";
      if (Math.hypot(u - 0.6, v - 0.5) < 0.055) return "w";
      return "o";
    }),
    fUSA: flagShow((u, v) => {
      if (u < 0.4 && v < 0.54) return "w";
      return Math.floor(Math.min(0.999, v) * 7) % 2 === 0 ? "o" : "";
    }),
    fCanada: flagShow((u, v) => {
      if (u < 0.26 || u > 0.74) return "o";
      return Math.hypot(u - 0.5, v - 0.5) < 0.13 ? "o" : "w";
    }),
    fUK: flagShow((u, v) => {
      if (Math.abs(u - 0.5) < 0.09 || Math.abs(v - 0.5) < 0.11) return "w";
      if (Math.min(Math.abs(u - v), Math.abs(u - (1 - v))) < 0.09) return "o";
      return "";
    }),
    fChina: flagShow((u, v) => {
      if (Math.hypot(u - 0.2, v - 0.3) < 0.08) return "w";
      if (Math.hypot(u - 0.34, v - 0.18) < 0.04) return "w";
      if (Math.hypot(u - 0.37, v - 0.3) < 0.04) return "w";
      if (Math.hypot(u - 0.34, v - 0.42) < 0.04) return "w";
      if (Math.hypot(u - 0.27, v - 0.5) < 0.04) return "w";
      return "o";
    }),
    fGeneric: flagShow((u, v) => (Math.abs(v - (0.5 + 0.16 * Math.sin(u * 6.2))) < 0.13 ? "w" : "o")),
  };

  // Time zone -> flag generator key (curated; falls back to a generic banner).
  const FLAG_BY_TZ = {};
  (function () {
    const m = {
      fUSA: ["America/New_York", "America/Detroit", "America/Chicago", "America/Denver", "America/Boise", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "America/Adak", "Pacific/Honolulu", "America/Indiana/Indianapolis", "America/Indianapolis", "America/Kentucky/Louisville"],
      fCanada: ["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns", "America/Regina", "America/Montreal"],
      fVert3: ["America/Mexico_City", "America/Cancun", "America/Tijuana", "Europe/Paris", "Europe/Rome", "Europe/Dublin", "Europe/Lisbon", "Asia/Dubai"],
      fHoriz3: ["Europe/Berlin", "Europe/Amsterdam", "Europe/Madrid", "Europe/Moscow", "Asia/Yekaterinburg", "Asia/Novosibirsk", "Asia/Vladivostok", "Asia/Kolkata", "Asia/Calcutta", "America/Argentina/Buenos_Aires"],
      fNordic: ["Europe/Stockholm", "Europe/Oslo", "Europe/Copenhagen", "Europe/Helsinki", "Atlantic/Reykjavik"],
      fSun: ["Asia/Tokyo", "Asia/Dhaka"],
      fCrescent: ["Europe/Istanbul", "Asia/Istanbul", "Asia/Karachi", "Asia/Singapore", "Asia/Kuala_Lumpur"],
      fUK: ["Europe/London"],
      fChina: ["Asia/Shanghai", "Asia/Chongqing", "Asia/Urumqi", "Asia/Hong_Kong"],
    };
    for (const key in m) for (const tz of m[key]) FLAG_BY_TZ[tz] = key;
  })();
  const flagFor = (tz) => FLAG_BY_TZ[tz] || "fGeneric";

  let showRAF = 0;
  let showItems = null; // stars currently participating in a show

  function uniqSorted(vals, tol) {
    const sorted = [...vals].sort((a, b) => a - b);
    const out = [];
    for (const v of sorted) if (!out.length || v - out[out.length - 1] > tol) out.push(v);
    return out;
  }
  function nearestIndex(arr, v) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const d = Math.abs(arr[i] - v);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  }

  function cleanupShow() {
    if (showRAF) cancelAnimationFrame(showRAF);
    showRAF = 0;
    calendar.classList.remove("showing");
    calendar.querySelectorAll(".show-on, .show-hi").forEach((s) => s.classList.remove("show-on", "show-hi"));
    showItems = null;
  }

  function starShowPlay(key, duration, onDone) {
    if (reduceMotion) { if (typeof onDone === "function") onDone(); return; }
    const gen = SHOWS[key] || SHOWS.sparkle;
    const all = [...calendar.querySelectorAll(".star:not(.empty)")];
    if (!all.length) return;

    // Prefer the stars currently visible in the calendar viewport, so the
    // show always plays where you're looking.
    const area = calendarArea.getBoundingClientRect();
    const measured = all.map((el) => {
      const r = el.getBoundingClientRect();
      return { el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
    let use = measured.filter((m) => m.cy >= area.top - 2 && m.cy <= area.bottom + 2 && m.cx >= area.left - 2 && m.cx <= area.right + 2);
    if (use.length < 6) use = measured;

    const cols = uniqSorted(use.map((m) => m.cx), 8);
    const rows = uniqSorted(use.map((m) => m.cy), 8);
    const GW = cols.length, GH = rows.length;
    use.forEach((m) => { m.col = nearestIndex(cols, m.cx); m.row = nearestIndex(rows, m.cy); });

    cleanupShow();
    calendar.classList.add("showing");
    showItems = use;
    const last = new Array(use.length).fill(0); // 0 none, 1 on, 2 hi

    let start = null;
    function frame(ts) {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const fade = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
      for (let k = 0; k < use.length; k++) {
        const m = use[k];
        const inten = gen(m.col, m.row, t, GW, GH) * fade;
        const desired = inten > 0.8 ? 2 : inten > 0.18 ? 1 : 0;
        if (desired !== last[k]) {
          const cl = m.el.classList;
          if (desired === 2) { cl.add("show-hi"); cl.remove("show-on"); }
          else if (desired === 1) { cl.add("show-on"); cl.remove("show-hi"); }
          else { cl.remove("show-on", "show-hi"); }
          last[k] = desired;
        }
      }
      if (t < 1) showRAF = requestAnimationFrame(frame);
      else { cleanupShow(); if (typeof onDone === "function") onDone(); }
    }
    showRAF = requestAnimationFrame(frame);
  }

  // ---------- Navigation ----------
  function goHabit(delta) {
    if (state.habits.length <= 1) return;
    state.currentIndex = (state.currentIndex + delta + state.habits.length) % state.habits.length;
    save();
    renderHeader();
    renderCalendar();
  }

  function goYear(delta) {
    state.year += delta;
    save();
    renderAll();
    if (!adminPanel.hidden) renderHabitList();
  }

  function goToThisYear() {
    if (state.year !== todayYear) {
      state.year = todayYear;
      save();
      renderAll();
      if (!adminPanel.hidden) renderHabitList();
    }
    scrollToToday();
  }

  function setOrientation(orient) {
    if (orient !== "vertical" && orient !== "horizontal") return;
    if (state.orientation === orient) return;
    state.orientation = orient;
    save();
    renderCalendar();
    syncOrientToggle();
    scrollToToday();
  }

  function syncOrientToggle() {
    orientToggle.querySelectorAll(".seg-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.orient === state.orientation);
    });
  }

  function setEditPast(on) {
    state.editPast = !!on;
    save();
    syncPastToggle();
  }

  function syncPastToggle() {
    pastToggle.setAttribute("aria-checked", state.editPast ? "true" : "false");
  }

  // ---------- Time zone ----------
  const FALLBACK_TZS = [
    "UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
    "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
    "Africa/Cairo", "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo",
    "Australia/Sydney", "Pacific/Auckland",
  ];
  function populateTimezones() {
    if (!tzSelect) return;
    let zones = [];
    try { if (typeof Intl.supportedValuesOf === "function") zones = Intl.supportedValuesOf("timeZone"); } catch (e) {}
    if (!zones || !zones.length) zones = FALLBACK_TZS;
    let html = `<option value="auto">Auto — ${deviceTz.replace(/_/g, " ")}</option>`;
    for (const z of zones) html += `<option value="${z}">${z.replace(/_/g, " ")}</option>`;
    tzSelect.innerHTML = html;
    syncTimezone(zones);
  }
  function syncTimezone(zones) {
    if (!tzSelect) return;
    const cur = state.timezone || "auto";
    const list = zones || [...tzSelect.options].map((o) => o.value);
    tzSelect.value = cur !== "auto" && list.indexOf(cur) !== -1 ? cur : "auto";
  }
  let pendingFlag = null;
  function setTimezone(tz) {
    state.timezone = tz || "auto";
    save();
    refreshToday();
    renderAll();
    if (!adminPanel.hidden) renderHabitList();
    // Close Settings so the country's flag wave is visible right away.
    pendingFlag = flagFor(activeTz());
    closeAdmin();
  }

  // ---------- Settings / admin panel ----------
  function openAdmin() {
    renderHabitList();
    syncOrientToggle();
    syncPastToggle();
    syncTimezone();
    adminOverlay.hidden = false;
    adminPanel.hidden = false;
  }

  function closeAdmin() {
    adminOverlay.hidden = true;
    adminPanel.hidden = true;
    clearConfirms();
    if (pendingFlag) {
      const f = pendingFlag;
      pendingFlag = null;
      setTimeout(() => starShowPlay(f, 1700), 80);
    }
  }

  function clearConfirms() {
    habitList.querySelectorAll(".habit-item.confirming").forEach((li) => li.classList.remove("confirming"));
  }

  function addHabit() {
    const name = newHabitInput.value.trim();
    if (!name) { newHabitInput.focus(); return; }
    const habit = { id: uid(), name, days: {} };
    state.habits.push(habit);
    state.currentIndex = state.habits.length - 1;
    newHabitInput.value = "";
    save();
    renderAll();
    renderHabitList();
    newHabitInput.focus();
  }

  function renderHabitList() {
    habitList.innerHTML = "";
    if (!state.habits.length) {
      const li = document.createElement("li");
      li.style.cssText = "color:var(--muted-2);text-align:center;padding:18px";
      li.textContent = "No habits yet — add one above.";
      habitList.appendChild(li);
      return;
    }

    state.habits.forEach((habit, i) => {
      const li = document.createElement("li");
      li.className = "habit-item" + (i === state.currentIndex ? " active" : "");
      li.dataset.id = habit.id;

      const handle = document.createElement("div");
      handle.className = "drag-handle";
      handle.title = "Drag to reorder";
      handle.innerHTML =
        '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
      handle.addEventListener("pointerdown", (e) => startDrag(e, li));
      li.appendChild(handle);

      const input = document.createElement("input");
      input.type = "text";
      input.value = habit.name;
      input.maxLength = 60;
      input.setAttribute("aria-label", "Habit name");
      input.addEventListener("input", () => {
        habit.name = input.value;
        save();
        if (i === state.currentIndex) habitNameBtn.textContent = habit.name || "Untitled habit";
      });
      input.addEventListener("blur", () => {
        if (!habit.name.trim()) {
          habit.name = "Untitled habit";
          input.value = habit.name;
          save();
          renderHeader();
        }
      });
      li.appendChild(input);

      const count = document.createElement("span");
      count.className = "count";
      const n = countDays(habit, state.year);
      count.textContent = `${n}d`;
      count.title = `${n} day${n === 1 ? "" : "s"} in ${state.year}`;
      li.appendChild(count);

      const actions = document.createElement("div");
      actions.className = "item-actions";
      const viewBtn = miniBtn("View this habit", '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>', () => {
        state.currentIndex = i;
        save();
        renderAll();
        renderHabitList();
      });
      const upBtn = miniBtn("Move up", '<path d="M18 15l-6-6-6 6"/>', () => moveHabit(i, -1));
      upBtn.disabled = i === 0;
      const downBtn = miniBtn("Move down", '<path d="M6 9l6 6 6-6"/>', () => moveHabit(i, 1));
      downBtn.disabled = i === state.habits.length - 1;
      const delBtn = miniBtn("Delete habit", '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>', () => askDelete(li));
      delBtn.classList.add("danger");
      actions.append(viewBtn, upBtn, downBtn, delBtn);
      li.appendChild(actions);

      habitList.appendChild(li);
    });
  }

  function miniBtn(label, svgInner, onClick) {
    const b = document.createElement("button");
    b.className = "mini-btn";
    b.type = "button";
    b.title = label;
    b.setAttribute("aria-label", label);
    b.innerHTML = `<svg viewBox="0 0 24 24">${svgInner}</svg>`;
    b.addEventListener("click", onClick);
    return b;
  }

  function moveHabit(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= state.habits.length) return;
    const currentId = currentHabit() ? currentHabit().id : null;
    const [item] = state.habits.splice(index, 1);
    state.habits.splice(target, 0, item);
    if (currentId) state.currentIndex = state.habits.findIndex((h) => h.id === currentId);
    save();
    renderAll();
    renderHabitList();
  }

  // Delete with a confirmation step (the "double check")
  function askDelete(li) {
    clearConfirms();
    li.classList.add("confirming");
    const id = li.dataset.id;
    const habit = state.habits.find((h) => h.id === id);
    const name = habit ? habit.name : "this habit";

    li.innerHTML = "";
    const row = document.createElement("div");
    row.className = "confirm-row";
    const msg = document.createElement("span");
    msg.className = "msg";
    msg.textContent = `Delete “${name}”?`;
    const yes = document.createElement("button");
    yes.className = "yes";
    yes.textContent = "Delete";
    const no = document.createElement("button");
    no.className = "no";
    no.textContent = "Cancel";
    row.append(msg, no, yes);
    li.appendChild(row);

    no.addEventListener("click", () => { li.classList.remove("confirming"); renderHabitList(); });
    yes.addEventListener("click", () => deleteHabit(id));
  }

  function deleteHabit(id) {
    const idx = state.habits.findIndex((h) => h.id === id);
    if (idx === -1) return;
    const wasCurrentId = currentHabit() ? currentHabit().id : null;
    state.habits.splice(idx, 1);
    if (wasCurrentId === id) state.currentIndex = clampIndex(idx, state.habits.length);
    else if (wasCurrentId) state.currentIndex = state.habits.findIndex((h) => h.id === wasCurrentId);
    save();
    renderAll();
    renderHabitList();
  }

  // ---------- Pointer-based drag reordering (touch + mouse) ----------
  function startDrag(e, li) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const currentId = currentHabit() ? currentHabit().id : null;
    li.classList.add("dragging");
    document.body.style.userSelect = "none";

    const move = (ev) => {
      const y = ev.clientY;
      const others = [...habitList.querySelectorAll(".habit-item:not(.dragging)")];
      let placed = false;
      for (const it of others) {
        const r = it.getBoundingClientRect();
        if (y < r.top + r.height / 2) { habitList.insertBefore(li, it); placed = true; break; }
      }
      if (!placed) habitList.appendChild(li);
    };
    const up = () => {
      li.classList.remove("dragging");
      document.body.style.userSelect = "";
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      const ids = [...habitList.querySelectorAll(".habit-item")].map((n) => n.dataset.id);
      state.habits.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      if (currentId) state.currentIndex = state.habits.findIndex((h) => h.id === currentId);
      save();
      renderAll();
      renderHabitList();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  // ---------- Export / import ----------
  function exportData() {
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `good-habits-backup-${todayStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.habits)) throw new Error("Not a Good Habits backup.");
        data.habits.forEach((h) => {
          if (!h.id) h.id = uid();
          if (!h.days || typeof h.days !== "object") h.days = {};
        });
        data.year = data.year || todayYear;
        data.currentIndex = clampIndex(data.currentIndex || 0, data.habits.length);
        data.orientation = data.orientation === "horizontal" || data.orientation === "vertical"
          ? data.orientation : defaultOrientation();
        data.editPast = data.editPast !== false;
        data.timezone = typeof data.timezone === "string" ? data.timezone : "auto";
        state = data;
        refreshToday();
        wasComplete = isAllCompleteToday();
        save();
        renderAll();
        renderHabitList();
        syncTimezone();
      } catch (err) {
        alert("Sorry — that file couldn't be read as a Good Habits backup.");
      }
    };
    reader.readAsText(file);
  }

  // ---------- Scroll to today ----------
  function scrollToToday() {
    if (state.year !== todayYear) return;
    const target = calendar.querySelector(`.star[data-date="${todayStr}"]`);
    if (target) target.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
  }

  // ---------- Starfield ----------
  function buildStarfield() {
    const sf = el("starfield");
    if (!sf) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const count = Math.max(40, Math.min(140, Math.round((W * H) / 13000)));
    let html = "";
    for (let i = 0; i < count; i++) {
      const size = Math.random() < 0.82 ? 1 : 2;
      const x = (Math.random() * 100).toFixed(2);
      const y = (Math.random() * 100).toFixed(2);
      const o = (0.25 + Math.random() * 0.6).toFixed(2);
      const delay = (Math.random() * 4).toFixed(2);
      html += `<i style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;--o:${o};opacity:${o};animation-delay:${delay}s"></i>`;
    }
    // A couple of occasional shooting stars streaking down-left
    for (let s = 0; s < 2; s++) {
      const startX = (55 + Math.random() * 40).toFixed(1);
      const startY = (2 + Math.random() * 26).toFixed(1);
      const dx = -Math.round(W * (0.35 + Math.random() * 0.25));
      const dy = Math.round(H * (0.18 + Math.random() * 0.16));
      const tail = ((Math.atan2(-dy, -dx) * 180) / Math.PI).toFixed(1);
      const dur = (8 + Math.random() * 5).toFixed(1);
      const delay = (Math.random() * 9).toFixed(1);
      const len = Math.round(90 + Math.random() * 60);
      html += `<span class="shoot" style="left:${startX}%;top:${startY}%;--dx:${dx}px;--dy:${dy}px;--tail:${tail}deg;--dur:${dur}s;--delay:${delay}s;--len:${len}px"></span>`;
    }
    sf.innerHTML = html;
  }

  // ---------- First-visit legend ----------
  function maybeShowIntro() {
    let seen = false;
    try { seen = localStorage.getItem(INTRO_KEY) === "1"; } catch (e) {}
    if (seen) return;
    el("intro").hidden = false;
  }
  function dismissIntro() {
    el("intro").hidden = true;
    try { localStorage.setItem(INTRO_KEY, "1"); } catch (e) {}
  }

  // ---------- Events ----------
  el("prevHabit").addEventListener("click", () => goHabit(-1));
  el("nextHabit").addEventListener("click", () => goHabit(1));
  el("prevYear").addEventListener("click", () => goYear(-1));
  el("nextYear").addEventListener("click", () => goYear(1));
  el("thisYearBtn").addEventListener("click", goToThisYear);
  el("openAdmin").addEventListener("click", openAdmin);
  el("closeAdmin").addEventListener("click", closeAdmin);
  el("emptyAddBtn").addEventListener("click", openAdmin);
  habitNameBtn.addEventListener("click", openAdmin);
  adminOverlay.addEventListener("click", closeAdmin);
  el("addHabitBtn").addEventListener("click", addHabit);
  newHabitInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addHabit(); });
  calendar.addEventListener("click", onCalendarClick);
  ringWrap.addEventListener("click", goToThisYear);
  el("introBtn").addEventListener("click", dismissIntro);

  orientToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (btn) setOrientation(btn.dataset.orient);
  });
  pastToggle.addEventListener("click", () => setEditPast(!state.editPast));
  if (tzSelect) tzSelect.addEventListener("change", (e) => setTimezone(e.target.value));

  el("exportBtn").addEventListener("click", exportData);
  el("importBtn").addEventListener("click", () => el("importFile").click());
  el("importFile").addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) importData(e.target.files[0]);
    e.target.value = "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el("intro").hidden) { dismissIntro(); return; }
      if (!adminPanel.hidden) { closeAdmin(); return; }
    }
    if (!adminPanel.hidden || !el("intro").hidden) return;
    if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === "ArrowLeft") goHabit(-1);
    if (e.key === "ArrowRight") goHabit(1);
  });

  // ---------- Init ----------
  buildStarfield();
  populateTimezones();
  renderAll();
  // Start scrolled to the top so the month/day headers are visible on landing.
  calendarArea.scrollTop = 0;
  calendarArea.scrollLeft = 0;
  maybeShowIntro();
})();
