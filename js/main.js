/* Aditya Jhalani — portfolio interactions
   scramble type / intro field / marquee tiles / canvas viz / reveals */

(() => {
  "use strict";

  document.documentElement.classList.add("js");
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GLYPHS = "!<>-_\\/[]{}—=+*^?#@%&$0123456789";

  /* ---------- text scramble ---------- */

  function scramble(el, finalText, duration = 900) {
    if (REDUCED) { el.textContent = finalText; return; }
    const start = performance.now();
    const from = el.textContent;
    const len = Math.max(from.length, finalText.length);
    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      let out = "";
      for (let i = 0; i < len; i++) {
        const reveal = i / len;
        if (t >= reveal) out += finalText[i] || "";
        else if (finalText[i] === " ") out += " ";
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    requestAnimationFrame(frame);
  }

  // one-time scramble when scrolled into view
  document.querySelectorAll("[data-scramble]").forEach((el) => {
    const finalText = el.textContent;
    if (REDUCED) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          scramble(el, finalText);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
  });

  // scramble again on hover (buttons / links)
  document.querySelectorAll("[data-scramble-hover]").forEach((el) => {
    const finalText = el.textContent;
    let busy = false;
    el.addEventListener("mouseenter", () => {
      if (busy || REDUCED) return;
      busy = true;
      scramble(el, finalText, 450);
      setTimeout(() => (busy = false), 500);
    });
  });

  /* ---------- intro field ---------- */

  const intro = document.getElementById("intro");
  if (intro) {
    if (REDUCED) {
      intro.remove();
    } else {
      document.body.style.overflow = "hidden";
      const tick = document.getElementById("introTick");
      let n = 0;
      const timer = setInterval(() => {
        n = Math.min(n + Math.ceil(Math.random() * 14), 100);
        if (tick) tick.textContent = "BOOT // " + String(n).padStart(2, "0");
        if (n >= 100) clearInterval(timer);
      }, 90);
      setTimeout(() => {
        intro.classList.add("done");
        document.body.style.overflow = "";
        setTimeout(() => intro.remove(), 1000);
      }, 1500);
    }
  }

  /* ---------- reveals ---------- */

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => revealIO.observe(el));

  /* ---------- photo marquee ---------- */

  // Photos live in assets/photos/. Each entry carries honest alt text and dimensions.
  const P = "assets/photos/";
  const PHOTOS = [
    { src: P + "sax-stage.jpg", cap: "LEAD ALTO — TRINITY JAZZ ENSEMBLE", alt: "Aditya playing alto saxophone with the Trinity Jazz Ensemble.", width: 1182, height: 664, priority: true },
    { src: P + "bball-gym.jpg", cap: "TRINITY HOOPS", alt: "Trinity basketball team posing in the school gym.", width: 1024, height: 768 },
    { src: P + "seaside-golden.jpg", cap: "GOLDEN HOUR — CINQUE TERRE", alt: "Portrait by the sea at golden hour in Cinque Terre.", width: 768, height: 1024 },
    { src: P + "friends-msg.jpg", cap: "THE GARDEN — WITH THE BOYS", alt: "Friends together at Madison Square Garden.", width: 1024, height: 768 },
    { src: P + "abu-dhabi-duty-free.jpg", cap: "IN TRANSIT · SEPTEMBER 2026", alt: "Wide airport concourse with reflective floor, curved columns, a visible duty-free sign, shop displays, and distant travelers with luggage.", width: 1182, height: 664 },
    { src: P + "sax-wide.jpg", cap: "ON STAGE — ENSEMBLE NIGHT", alt: "Alto saxophone performance on an ensemble stage.", width: 1182, height: 664 },
    { src: P + "cliff-village.jpg", cap: "MANAROLA — LOOKING DOWN", alt: "View over Manarola and the coast.", width: 1024, height: 768 },
    { src: P + "piano-rehearsal.jpg", cap: "REHEARSAL — KEYS SIDE", alt: "Piano and musicians during rehearsal.", width: 1024, height: 768 },
    { src: P + "abu-dhabi-lounge-windows.jpg", cap: "AIRPORT WINDOWS · SEPTEMBER 2026", alt: "Airport lounge with cream chairs and plants beside tall grid windows; seated travelers appear in shadow against a bright exterior.", width: 1182, height: 664 },
    { src: P + "family-celebration.jpg", cap: "FAMILY — CELEBRATION", alt: "Family celebration.", width: 1024, height: 768 },
  ];

  function buildPhotoTile(p, duplicate = false) {
    const d = document.createElement("div");
    d.className = "photo-tile";
    if (duplicate) d.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.src = p.src;
    img.alt = duplicate ? "" : p.alt;
    img.width = p.width;
    img.height = p.height;
    img.loading = p.priority && !duplicate ? "eager" : "lazy";
    if (p.priority && !duplicate) img.fetchPriority = "high";
    img.decoding = "async";
    const cap = document.createElement("div");
    cap.className = "cap";
    cap.textContent = p.cap;
    d.append(img, cap);
    return d;
  }

  function fillRow(rowEl, items) {
    if (!rowEl) return;
    items.forEach((p) => rowEl.appendChild(buildPhotoTile(p)));
    // The second visual copy keeps the CSS loop seamless but is not announced twice.
    items.forEach((p) => rowEl.appendChild(buildPhotoTile(p, true)));
  }

  fillRow(document.getElementById("rowA"), PHOTOS.slice(0, 5));
  fillRow(document.getElementById("rowB"), PHOTOS.slice(5));

  /* ---------- photo motion control ---------- */
  let motionPaused = REDUCED;
  const motionToggle = document.getElementById("motionToggle");
  function updateMotionToggle() {
    if (!motionToggle) return;
    motionToggle.hidden = REDUCED;
    motionToggle.setAttribute("aria-pressed", String(motionPaused));
    motionToggle.textContent = motionPaused ? "Play photos" : "Pause photos";
  }
  if (motionToggle) {
    motionToggle.addEventListener("click", () => {
      motionPaused = !motionPaused;
      document.body.classList.toggle("motion-paused", motionPaused);
      updateMotionToggle();
    });
    document.body.classList.toggle("motion-paused", motionPaused);
    updateMotionToggle();
  }

  /* ---------- canvas visualizations for project media ---------- */

  function setupCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    return { ctx, w: rect.width, h: rect.height };
  }

  const vizRunners = {
    // 01: piano-roll style falling notes over changes
    jazz(canvas) {
      const { ctx, w, h } = setupCanvas(canvas);
      const notes = Array.from({ length: 42 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 18 + Math.random() * 60,
        lane: (Math.random() * 12) | 0,
        v: 0.35 + Math.random() * 0.8,
      }));
      return () => {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        for (let i = 0; i < 12; i++) {
          const y = (h / 12) * i;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        notes.forEach((n) => {
          n.x -= n.v;
          if (n.x + n.len < 0) { n.x = w + Math.random() * 80; n.lane = (Math.random() * 12) | 0; }
          const y = (h / 12) * n.lane + 4;
          ctx.fillStyle = n.lane % 4 === 0 ? "#1533ff" : "rgba(255,255,255,0.85)";
          ctx.fillRect(n.x, y, n.len, h / 12 - 8);
        });
      };
    },

    // 02: audio waveform bars
    voice(canvas) {
      const { ctx, w, h } = setupCanvas(canvas);
      const N = 64;
      let t = 0;
      return () => {
        t += 0.045;
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);
        const bw = w / N;
        for (let i = 0; i < N; i++) {
          const amp =
            Math.abs(Math.sin(i * 0.32 + t) * Math.sin(i * 0.11 - t * 1.4)) *
            (h * 0.36) + 4;
          const x = i * bw + bw * 0.22;
          ctx.fillStyle = i % 9 === 0 ? "#1533ff" : "rgba(255,255,255,0.85)";
          ctx.fillRect(x, h / 2 - amp / 2, bw * 0.56, amp);
        }
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillText("wake → whisper → local llm → piper → speakers", 20, h - 20);
      };
    },

    // 03: agent network graph pulses
    agent(canvas) {
      const { ctx, w, h } = setupCanvas(canvas);
      const nodes = Array.from({ length: 14 }, (_, i) => ({
        x: (0.15 + 0.7 * Math.random()) * w,
        y: (0.15 + 0.7 * Math.random()) * h,
        r: i === 0 ? 9 : 3.5 + Math.random() * 3,
      }));
      let t = 0;
      return () => {
        t += 0.02;
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        nodes.forEach((n, i) => {
          if (i === 0) return;
          ctx.beginPath();
          ctx.moveTo(nodes[0].x, nodes[0].y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        });
        // pulse traveling to a node
        const k = ((t * 1.4) | 0) % (nodes.length - 1) + 1;
        const p = (t * 1.4) % 1;
        const px = nodes[0].x + (nodes[k].x - nodes[0].x) * p;
        const py = nodes[0].y + (nodes[k].y - nodes[0].y) * p;
        ctx.fillStyle = "#1533ff";
        ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
        nodes.forEach((n, i) => {
          ctx.fillStyle = i === 0 ? "#1533ff" : "rgba(255,255,255,0.9)";
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 7); ctx.fill();
        });
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillText("agent core → tools", 20, h - 20);
      };
    },
  };

  const running = [];
  document.querySelectorAll("[data-viz]").forEach((box) => {
    const canvas = box.querySelector("canvas");
    if (!canvas) return;
    const kind = box.getAttribute("data-viz");
    if (!vizRunners[kind]) return;
    if (REDUCED) {
      // draw one static frame
      const step = vizRunners[kind](canvas);
      step();
      return;
    }
    running.push({ box, step: vizRunners[kind](canvas) });
  });

  if (running.length && !REDUCED) {
    let visible = new Set();
    const vizIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const r = running.find((x) => x.box === e.target);
        if (!r) return;
        if (e.isIntersecting) visible.add(r);
        else visible.delete(r);
      });
    }, { threshold: 0.1 });
    running.forEach((r) => vizIO.observe(r.box));
    (function loop() {
      if (!motionPaused) visible.forEach((r) => r.step());
      requestAnimationFrame(loop);
    })();
  }
})();
