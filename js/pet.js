/* Local-only viewport companion. No network, audio, analytics or pointer pursuit. */
(() => {
  "use strict";
  const layer = document.getElementById("petPerch");
  const pet = document.getElementById("pixelPet");
  const toggle = document.getElementById("petToggle");
  if (!layer || !pet || !toggle) return;
  // Escape any footer containing/stacking context without altering its layout.
  document.body.append(layer);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const key = "aditya.portfolio.showPet";
  const size = 56, speed = 38, gap = 6, cell = 28;
  let shown = true;
  try { shown = localStorage.getItem(key) !== "false"; } catch (_) { /* Session only. */ }
  let raf = 0, last = 0, elapsed = 0, distance = 0, rest = 1.4;
  let x = 8, y = 120, bounds, obstacles = [], prose = [], route = [];
  let focused = false, hovered = false, dirty = true, measured = -Infinity, initialized = false;
  let patUntil = 0, journey = 0, walking = 0;
  const overlap = (a, b) => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
  const box = (px, py, w = size, h = size) => ({x: px, y: py, right: px + w, bottom: py + h});
  const rect = (r, padding = 0) => ({x: r.left - padding, y: r.top - padding, right: r.right + padding, bottom: r.bottom + padding});
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function blocked(px, py) { return obstacles.some(r => overlap(box(px, py), r)); }
  function clearLine(a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
    for (let i = 0; i <= n; i++) if (blocked(a.x + (b.x - a.x) * i / n, a.y + (b.y - a.y) * i / n)) return false;
    return true;
  }
  function paint() {
    pet.style.setProperty("--pet-x", `${x.toFixed(2)}px`);
    pet.style.setProperty("--pet-y", `${y.toFixed(2)}px`);
    // Scrolling may bring content under the cat. Yield its pixels AND hitbox until
    // it can leave, rather than ever sitting on a newly arrived link or media.
    pet.dataset.occluded = String(blocked(x, y));
  }
  function measure() {
    const v = window.visualViewport;
    const left = v ? v.offsetLeft : 0, top = v ? v.offsetTop : 0;
    const width = v ? v.width : innerWidth, height = v ? v.height : innerHeight;
    bounds = {left: left + gap, top: top + gap, right: Math.max(left + gap, left + width - size - gap), bottom: Math.max(top + gap, top + height - size - gap)};
    obstacles = [];
    document.querySelectorAll("a,button,input,select,textarea,[role='button'],[contenteditable='true'],audio,video,iframe,img,canvas,.nav,.collage,h1,h2,h3,.hero-sub").forEach(e => {
      if (layer.contains(e)) return;
      const r = e.getBoundingClientRect();
      if (r.width && r.height && r.bottom > top && r.top < top + height && getComputedStyle(e).visibility !== "hidden") obstacles.push(rect(r, 5));
    });
    prose = [];
    document.querySelectorAll("p,h1,h2,h3,.strip,.label,.count,.footer-base").forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width && r.bottom > top && r.top < top + height) prose.push(rect(r, 3));
    });
    // One compact 44px target; choose an unoccupied edge slot, never a full-width bar.
    if (document.activeElement !== toggle) {
      let slots = [];
      for (let py = top + height - 50; py >= top + 80; py -= 48) {
        for (const px of [left + width - 86, left + 6]) {
          const b = box(px, py, 80, 44);
          if (!obstacles.some(r => overlap(b, r))) slots.push({x: px, y: py, cost: prose.filter(r => overlap(b, r)).length * 1000 + top + height - py});
        }
      }
      slots.sort((a, b) => a.cost - b.cost);
      const slot = slots[0] || {x: left + width - 86, y: top + height - 50};
      toggle.style.transform = `translate(${Math.max(left, slot.x)}px, ${Math.max(top, slot.y)}px)`;
    }
    obstacles.push(rect(toggle.getBoundingClientRect(), 8));
    x = clamp(x, bounds.left, bounds.right); y = clamp(y, bounds.top, bounds.bottom);
    if (!initialized || (motion.matches && blocked(x, y))) {
      let spots = [];
      for (let py = bounds.bottom; py >= bounds.top; py -= cell) for (let px = bounds.left; px <= bounds.right; px += cell) {
        if (!blocked(px, py)) spots.push({x: px, y: py, cost: prose.filter(r => overlap(box(px, py), r)).length * 1000 + (bounds.bottom - py) + (px - bounds.left) * .2});
      }
      spots.sort((a, b) => a.cost - b.cost);
      if (spots.length) { x = spots[0].x; y = spots[0].y; }
      initialized = true;
    }
    if (blocked(x, y)) {route=[]; rest=0; walking=0;}
    dirty = false; measured = elapsed; paint();
  }
  function plan() {
    // Connected grid, then visibility-safe segments: no jumping across obstacles.
    const nodes = [], byCell = new Map();
    for (let row = 0, py = bounds.top; py <= bounds.bottom; row++, py += cell) {
      for (let col = 0, px = bounds.left; px <= bounds.right; col++, px += cell) {
        if (!blocked(px, py)) { const n = {x: px, y: py, row, col, prev: null}; nodes.push(n); byCell.set(`${row},${col}`, n); }
      }
    }
    const ordered = nodes.slice().sort((a, b) => Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
    let start = ordered.find(n => clearLine({x,y},n));
    if (!start) {
      // Content moved underneath us: move out at normal speed, invisible only while
      // intersecting it. This is not a teleport or a click-blocking escape path.
      if (ordered[0]) route = [ordered[0]];
      return;
    }
    const queue = [start], seen = new Set([start]);
    for (let i = 0; i < queue.length; i++) {
      const n = queue[i];
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
        const other = byCell.get(`${n.row+dr},${n.col+dc}`);
        if (other && !seen.has(other) && clearLine(n,other)) {other.prev = n; seen.add(other); queue.push(other);}
      }
    }
    const candidates = queue.filter(n => Math.hypot(n.x-x,n.y-y) > 65 && Math.hypot(n.x-x,n.y-y) < 300);
    candidates.forEach(n => {
      const edge = Math.min(n.x-bounds.left,bounds.right-n.x,n.y-bounds.top,bounds.bottom-n.y);
      const vertical = Math.abs(n.y-y), horizontal = Math.abs(n.x-x);
      n.score = Math.random()*100 + Math.min(vertical,100)*.65 + Math.min(horizontal,100)*.35 - prose.filter(r => overlap(box(n.x,n.y),r)).length*95 - edge*.1;
      // Alternate broad vertical / horizontal intent while keeping both axes alive.
      n.score += journey % 2 ? horizontal*1.4 : vertical*.2;
    });
    candidates.sort((a,b) => b.score-a.score);
    let target = candidates[0];
    if (!target) return;
    journey++;
    const path = [];
    while(target) {path.unshift(target); target = target.prev;}
    // Remove grid zigzags only when the entire swept hitbox remains safe.
    const smooth = []; let from = {x,y}, i = 0;
    while(i < path.length) {
      let far = i;
      for(let j=i+1;j<path.length;j++) if(clearLine(from,path[j])) far=j;
      smooth.push(path[far]); from=path[far]; i=far+1;
    }
    route = smooth;
  }
  function active() {return shown && !document.hidden && !motion.matches && !focused && !hovered;}
  function stop() {cancelAnimationFrame(raf); raf = 0; last = 0;}
  function frame(now) {
    raf = 0;
    if (!active()) return;
    const dt = last ? Math.min((now-last)/1000,.1) : 0;
    last = now; elapsed += dt;
    if (dirty) measure();
    // Periodically refresh moving media/control rectangles, without replanning every frame.
    if (elapsed-measured > 1) measure();
    if (patUntil > elapsed) pet.dataset.pose = "pat";
    else if (rest > 0) {
      rest -= dt;
      pet.dataset.pose = rest < .55 && rest > .38 ? "blink" : "idle";
    } else {
      if (!route.length) plan();
      if (route.length) {
        const target = route[0], dx = target.x-x, dy = target.y-y, len = Math.hypot(dx,dy);
        const step = Math.min(len,speed*dt);
        const nx = len ? x+dx/len*step : x, ny = len ? y+dy/len*step : y;
        if (!blocked(x,y) && blocked(nx,ny)) {route=[]; rest=.35; pet.dataset.pose="idle";}
        else {
          x=nx; y=ny; distance+=step; walking+=dt;
          if (Math.abs(dx)>.5) pet.dataset.facing=dx<0 ? "left" : "right";
          pet.dataset.pose="walk"; pet.dataset.step=String(Math.floor(distance/5.5)%4);
          if (len<=step+.01) {route.shift(); if(!route.length) {rest=1.3+Math.random()*1.5; walking=0;}}
          if (walking>6) {walking=0; rest=1.6; route=[];}
        }
      } else {rest=1; pet.dataset.pose="idle";}
    }
    paint(); raf=requestAnimationFrame(frame);
  }
  function resume() {
    stop();
    if (dirty) measure();
    if (pet.dataset.pose !== "pat") pet.dataset.pose="idle";
    if (active()) raf=requestAnimationFrame(frame);
  }
  function render() {
    pet.hidden=!shown;
    toggle.textContent=shown ? "Hide pet" : "Show pet";
    toggle.setAttribute("aria-expanded",String(shown));
    dirty=true; resume();
  }
  function hide() {
    shown=false;
    try {localStorage.setItem(key,"false");} catch (_) { /* Session only. */ }
    if(document.activeElement===pet) toggle.focus({preventScroll:true});
    render();
  }
  toggle.addEventListener("click",() => {
    if(shown) hide();
    else {shown=true; try {localStorage.setItem(key,"true");} catch (_) { /* Session only. */ } render();}
  });
  pet.addEventListener("click",() => {
    pet.dataset.pose=pet.dataset.pose==="pat" && motion.matches ? "idle" : "pat";
    pet.setAttribute("aria-label",pet.dataset.pose==="pat" ? "Happy pixel cat. Pat again" : "Pat the pixel cat");
    patUntil=elapsed+1.1; rest=1.4;
  });
  pet.addEventListener("focus",() => {focused=true; stop(); pet.dataset.pose="idle";});
  pet.addEventListener("blur",() => {focused=false; pet.dataset.pose="idle"; resume();});
  pet.addEventListener("pointerenter",e => {if(e.pointerType!=="touch") {hovered=true; stop(); pet.dataset.pose="idle";}});
  pet.addEventListener("pointerleave",() => {hovered=false; resume();});
  document.addEventListener("keydown",e => {if(e.key==="Escape" && shown) hide();});
  function geometryChanged(event) {
    if(event && (event.type==="scroll" || event.type==="resize")) route=[];
    dirty=true; if(!raf) {measure(); paint();}
  }
  window.addEventListener("resize",geometryChanged,{passive:true});
  window.addEventListener("scroll",geometryChanged,{passive:true});
  window.visualViewport?.addEventListener("resize",geometryChanged,{passive:true});
  window.visualViewport?.addEventListener("scroll",geometryChanged,{passive:true});
  // Fonts, lazy media and reveal layout can settle after the initial script.
  // Event-driven geometry checks also keep the static reduced-motion pet safe.
  window.addEventListener("load",geometryChanged,{once:true});
  document.fonts?.ready.then(geometryChanged);
  document.addEventListener("load",geometryChanged,true);
  document.addEventListener("visibilitychange",() => {dirty=true; resume();});
  motion.addEventListener("change",() => {pet.dataset.pose="idle"; route=[]; rest=1.4; dirty=true; resume();});
  layer.hidden=false;
  render();
})();
