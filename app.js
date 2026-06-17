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
  const statHabit = el("statHabit");
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
  const confettiCanvas = el("confetti");

  // ---------- Date helpers ----------
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const fmtDate = (d) => fmt(d.getFullYear(), d.getMonth(), d.getDate());
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  const now = new Date();
  const todayStr = fmt(now.getFullYear(), now.getMonth(), now.getDate());

  const defaultOrientation = () =>
    window.innerWidth >= window.innerHeight ? "horizontal" : "vertical";

  // ---------- State ----------
  let state = load();
  let wasComplete = isAllCompleteToday();

  function defaultState() {
    return {
      habits: [
        { id: uid(), name: "Read 15 mins", days: {} },
        { id: uid(), name: "Exercise", days: {} },
        { id: uid(), name: "Drink water", days: {} },
      ],
      currentIndex: 0,
      year: now.getFullYear(),
      orientation: defaultOrientation(),
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
      data.year = data.year || now.getFullYear();
      data.currentIndex = clampIndex(data.currentIndex || 0, data.habits.length);
      data.orientation = data.orientation === "horizontal" || data.orientation === "vertical"
        ? data.orientation
        : defaultOrientation();
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
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (!habit.days[fmtDate(d)]) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (habit.days[fmtDate(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
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
      statHabit.textContent = "0 / 0";
      statDays.textContent = "0";
      statStreak.textContent = "0";
      statStreak.parentElement.classList.remove("hot");
      el("prevHabit").disabled = true;
      el("nextHabit").disabled = true;
      return;
    }
    habitNameBtn.textContent = habit.name || "Untitled habit";
    statHabit.textContent = `${state.currentIndex + 1} / ${total}`;
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
      if (complete && !wasComplete) celebrate();
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
    if (state.year !== now.getFullYear()) {
      state.year = now.getFullYear();
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

  // ---------- Settings / admin panel ----------
  function openAdmin() {
    renderHabitList();
    syncOrientToggle();
    adminOverlay.hidden = false;
    adminPanel.hidden = false;
  }

  function closeAdmin() {
    adminOverlay.hidden = true;
    adminPanel.hidden = true;
    clearConfirms();
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
        data.year = data.year || now.getFullYear();
        data.currentIndex = clampIndex(data.currentIndex || 0, data.habits.length);
        data.orientation = data.orientation === "horizontal" || data.orientation === "vertical"
          ? data.orientation : defaultOrientation();
        state = data;
        wasComplete = isAllCompleteToday();
        save();
        renderAll();
        renderHabitList();
        scrollToToday();
      } catch (err) {
        alert("Sorry — that file couldn't be read as a Good Habits backup.");
      }
    };
    reader.readAsText(file);
  }

  // ---------- Confetti celebration ----------
  let confettiCtx = null;
  function celebrate() {
    if (!confettiCanvas.getContext) return;
    confettiCtx = confettiCtx || confettiCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    confettiCanvas.width = window.innerWidth * dpr;
    confettiCanvas.height = window.innerHeight * dpr;
    confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const colors = ["#ff5a2e", "#ff8a4c", "#ffb38a", "#ffffff"];
    const parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * 120,
        y: H * 0.26,
        vx: (Math.random() - 0.5) * 11,
        vy: Math.random() * -10 - 5,
        size: 4 + Math.random() * 6,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
      });
    }
    let start = null;
    function frame(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      confettiCtx.clearRect(0, 0, W, H);
      let alive = false;
      for (const p of parts) {
        p.vy += 0.28;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - elapsed / 2200);
        if (p.life > 0 && p.y < H + 30) {
          alive = true;
          confettiCtx.save();
          confettiCtx.globalAlpha = p.life;
          confettiCtx.translate(p.x, p.y);
          confettiCtx.rotate(p.rot);
          confettiCtx.fillStyle = p.color;
          confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          confettiCtx.restore();
        }
      }
      if (alive) requestAnimationFrame(frame);
      else confettiCtx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }

  // ---------- Scroll to today ----------
  function scrollToToday() {
    if (state.year !== now.getFullYear()) return;
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

  window.addEventListener("resize", () => {
    if (confettiCtx) {
      confettiCanvas.width = window.innerWidth * (window.devicePixelRatio || 1);
      confettiCanvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    }
  });

  // ---------- Init ----------
  buildStarfield();
  renderAll();
  scrollToToday();
  maybeShowIntro();
})();
