/* =========================================================
   Dining Philosophers – simulation.js
   Full interactive + auto-mode simulation
   ========================================================= */

// ── STATE ──────────────────────────────────────────────────
const STATE = { THINKING: 'thinking', HUNGRY: 'hungry', EATING: 'eating' };

let N = 5;                      // number of philosophers
let philosophers = [];          // { state, meals, step, name }
let chopsticks   = [];          // semaphores: 1=free, 0=held
let started      = false;
let autoMode     = false;
let autoTimer    = null;
let deadlockCount = 0;
let animFrame    = null;

// Canvas drawing context
let canvas, ctx;

// ── INIT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('diningCanvas');
  ctx    = canvas.getContext('2d');

  document.getElementById('btnInstructions').onclick = () => openModal('modalInstructions');
  document.getElementById('btnComponents').onclick   = () => openModal('modalComponents');

  const slider = document.getElementById('speedSlider');
  slider.addEventListener('input', () => {
    document.getElementById('speedLabel').textContent = slider.value + '×';
  });

  buildUI();
  drawTable();
});

function buildUI() {
  buildPhilosopherButtons();
  buildStateTable();
  updateArrayDisplays();
  updateStats();
}

// ── PHILOSOPHER BUTTONS ───────────────────────────────────
function buildPhilosopherButtons() {
  const container = document.getElementById('philosopherButtons');
  container.innerHTML = '';
  for (let i = 0; i < N; i++) {
    const btn = document.createElement('button');
    btn.className = 'phil-btn';
    btn.id = `philBtn${i}`;
    btn.disabled = true;
    btn.innerHTML = `P${i}<span class="btn-state">—</span>`;
    btn.onclick = () => advancePhilosopher(i);
    container.appendChild(btn);
  }
}

function updatePhilosopherButtons() {
  for (let i = 0; i < N; i++) {
    const btn = document.getElementById(`philBtn${i}`);
    if (!btn) continue;
    const p = philosophers[i];
    btn.className = `phil-btn ${p.state}`;
    btn.disabled  = !started;
    const stateLabel = p.state === STATE.THINKING ? 'Thinking'
                     : p.state === STATE.HUNGRY   ? 'Hungry'
                     : 'Eating';
    btn.innerHTML = `P${i}<span class="btn-state">${stateLabel}</span>`;
  }
}

// ── STATE TABLE ───────────────────────────────────────────
function buildStateTable() {
  const tbody = document.getElementById('stateTableBody');
  tbody.innerHTML = '';
  for (let i = 0; i < N; i++) {
    const tr = document.createElement('tr');
    tr.id = `stateRow${i}`;
    tr.innerHTML = `
      <td><b>P${i}</b></td>
      <td id="stCell${i}State">—</td>
      <td id="stCell${i}Left">—</td>
      <td id="stCell${i}Right">—</td>
      <td id="stCell${i}Meals">0</td>
    `;
    tbody.appendChild(tr);
  }
}

function updateStateTable() {
  for (let i = 0; i < N; i++) {
    const p     = philosophers[i];
    const left  = i;
    const right = (i + 1) % N;

    const stateEl  = document.getElementById(`stCell${i}State`);
    const leftEl   = document.getElementById(`stCell${i}Left`);
    const rightEl  = document.getElementById(`stCell${i}Right`);
    const mealsEl  = document.getElementById(`stCell${i}Meals`);

    if (!stateEl) continue;

    const cls = p.state === STATE.THINKING ? 'badge-thinking'
              : p.state === STATE.HUNGRY   ? 'badge-hungry'
              : 'badge-eating';
    stateEl.innerHTML = `<span class="badge ${cls}">${p.state.toUpperCase()}</span>`;

    // Left fork: owned if hungry (after step 1) or eating
    const holdsLeft  = (p.state === STATE.HUNGRY && p.step >= 1) || p.state === STATE.EATING;
    const holdsRight = (p.state === STATE.HUNGRY && p.step >= 2) || p.state === STATE.EATING;
    leftEl.innerHTML  = holdsLeft  ? `<span class="fork-held">C${left} (held)</span>`   : `<span class="fork-free">C${left} (free)</span>`;
    rightEl.innerHTML = holdsRight ? `<span class="fork-held">C${right} (held)</span>`  : `<span class="fork-free">C${right} (free)</span>`;
    mealsEl.textContent = p.meals;
  }
}

// ── ARRAY DISPLAYS ────────────────────────────────────────
function updateArrayDisplays() {
  updatePhilArray();
  updateChopArray();
  updateMealsArray();
}

function updatePhilArray() {
  const el = document.getElementById('philArray');
  if (!started) { el.innerHTML = '<span class="muted">—</span>'; return; }
  el.innerHTML = philosophers.map((p, i) => {
    const cls = p.state === STATE.THINKING ? 'thinking-cell'
              : p.state === STATE.HUNGRY   ? 'hungry-cell'
              : 'eating-cell';
    const sym = p.state === STATE.THINKING ? 'T' : p.state === STATE.HUNGRY ? 'H' : 'E';
    return `<div class="array-cell ${cls}"><div class="cell-label">P${i}</div><div class="cell-val">${sym}</div></div>`;
  }).join('');
}

function updateChopArray() {
  const el = document.getElementById('chopArray');
  if (!started) { el.innerHTML = '<span class="muted">—</span>'; return; }
  el.innerHTML = chopsticks.map((v, i) => {
    const cls = v === 1 ? 'fork-free-cell' : 'fork-held-cell';
    return `<div class="array-cell ${cls}"><div class="cell-label">C${i}</div><div class="cell-val">${v}</div></div>`;
  }).join('');
}

function updateMealsArray() {
  const el = document.getElementById('mealsArray');
  if (!started) { el.innerHTML = '<span class="muted">—</span>'; return; }
  el.innerHTML = philosophers.map((p, i) =>
    `<div class="array-cell"><div class="cell-label">P${i}</div><div class="cell-val">${p.meals}</div></div>`
  ).join('');
}

// ── STATS ─────────────────────────────────────────────────
function updateStats() {
  const thinking = !started ? 0 : philosophers.filter(p => p.state === STATE.THINKING).length;
  const hungry   = !started ? 0 : philosophers.filter(p => p.state === STATE.HUNGRY).length;
  const eating   = !started ? 0 : philosophers.filter(p => p.state === STATE.EATING).length;
  document.getElementById('statThinking').textContent = thinking;
  document.getElementById('statHungry').textContent   = hungry;
  document.getElementById('statEating').textContent   = eating;
  document.getElementById('statDeadlocks').textContent = deadlockCount;
}

// ── SIMULATION CONTROL ────────────────────────────────────
function startSimulation() {
  // If already started, cleanly re-initialize without recursion
  if (started) {
    stopAuto();
    started = false;
    philosophers = [];
    chopsticks   = [];
    deadlockCount = 0;
  }
  started = true;
  deadlockCount = 0;

  philosophers = Array.from({ length: N }, (_, i) => ({
    state: STATE.THINKING,
    meals: 0,
    step: 0,           // 0=thinking, 1=has left, 2=has right, 3=eating
    name: `P${i}`
  }));
  chopsticks = Array(N).fill(1);

  updatePhilosopherButtons();
  buildStateTable();
  updateStateTable();
  updateArrayDisplays();
  updateStats();
  setComment('✅ Simulation started! All philosophers are <b>THINKING</b>. Chopsticks initialised to 1.');
  addLog('Simulation started — all thinking', 'info');
  clearCodeHighlight();
  document.getElementById('deadlockBanner').style.display = 'none';
  drawTable();
}

function resetSimulation() {
  stopAuto();
  started = false;
  philosophers = [];
  chopsticks   = [];
  deadlockCount = 0;
  buildPhilosopherButtons();
  buildStateTable();
  updateArrayDisplays();
  updateStats();
  clearCodeHighlight();
  setComment('<span class="muted">Press <b>Start</b> to initialize the simulation.</span>');
  document.getElementById('logBody').innerHTML = '';
  document.getElementById('deadlockBanner').style.display = 'none';
  document.getElementById('startBtn').disabled = false;
  document.getElementById('startBtn').textContent = '▶ Start';
  drawTable();
}

function changePhilCount() {
  N = parseInt(document.getElementById('philCountSelect').value);
  resetSimulation();
}

// ── ADVANCE PHILOSOPHER (manual step) ────────────────────
function advancePhilosopher(i) {
  if (!started) return;
  const p     = philosophers[i];
  const left  = i;
  const right = (i + 1) % N;
  const sol   = document.getElementById('solutionSelect').value;

  // Asymmetric: last philosopher picks right first
  let firstFork  = left;
  let secondFork = right;
  if (sol === 'asymmetric' && i === N - 1) {
    firstFork  = right;
    secondFork = left;
  }

  if (p.state === STATE.THINKING) {
    // → Hungry / try to pick first fork
    p.state = STATE.HUNGRY;
    p.step  = 0;
    highlightCode('line-think', 'active');
    setComment(`🤔 P${i} is <b>HUNGRY</b> — attempting to pick up chopstick C${firstFork} (Wait).`);
    addLog(`P${i} became HUNGRY`, 'hungry');
    advanceStep(i, firstFork, secondFork, sol);
    return;
  }

  if (p.state === STATE.HUNGRY && p.step === 0) {
    advanceStep(i, firstFork, secondFork, sol);
    return;
  }

  if (p.state === STATE.HUNGRY && p.step === 1) {
    advanceStep(i, firstFork, secondFork, sol);
    return;
  }

  if (p.state === STATE.EATING) {
    // → Release and go back to thinking
    chopsticks[left]  = 1;
    chopsticks[right] = 1;
    p.state = STATE.THINKING;
    p.step  = 0;
    highlightCode('line-signal-left',  'signal-active');
    highlightCode('line-signal-right', 'signal-active');
    setComment(`🍜 P${i} finished eating (${p.meals} meals). Released C${left} & C${right}. Now <b>THINKING</b>.`);
    addLog(`P${i} finished eating → THINKING (meals: ${p.meals})`, 'thinking');
    setTimeout(() => {
      highlightCode('line-think', 'active');
    }, 500);
  }

  updateAll();
  checkDeadlock();
}

function advanceStep(i, firstFork, secondFork, sol) {
  const p = philosophers[i];

  if (p.step === 0) {
    // Try first fork
    if (chopsticks[firstFork] === 1) {
      chopsticks[firstFork] = 0;
      p.step = 1;
      highlightCode('line-wait-left', 'wait-active');
      setComment(`✅ P${i} picked up C${firstFork}. Now waiting for C${secondFork}…`);
      addLog(`P${i} picked up C${firstFork} (left/first fork)`, 'hungry');
    } else {
      setComment(`⏳ P${i} is waiting — C${firstFork} is held by another philosopher!`);
      addLog(`P${i} BLOCKED waiting for C${firstFork}`, 'hungry');
    }
  } else if (p.step === 1) {
    // Try second fork
    if (chopsticks[secondFork] === 1) {
      chopsticks[secondFork] = 0;
      p.step = 2;
      highlightCode('line-wait-right', 'wait-active');
      setComment(`✅ P${i} picked up C${secondFork} too! Both forks held — now <b>EATING</b>!`);
      addLog(`P${i} picked up C${secondFork} (right/second fork) → EATING`, 'eating');
      // Auto-transition to eating
      setTimeout(() => {
        p.state = STATE.EATING;
        p.meals++;
        p.step  = 3;
        highlightCode('line-eat', 'eat-active');
        setComment(`🍜 P${i} is <b>EATING</b>! (meal #${p.meals}) Holding C${firstFork} & C${secondFork}.`);
        updateAll();
        checkDeadlock();
      }, 300);
    } else {
      setComment(`⏳ P${i} is waiting — C${secondFork} is held by another philosopher!`);
      addLog(`P${i} BLOCKED waiting for C${secondFork}`, 'hungry');
    }
  }

  updateAll();
  checkDeadlock();
}

// ── DEADLOCK DETECTION ────────────────────────────────────
function checkDeadlock() {
  if (!started) return;
  const allHungry = philosophers.every(p => p.state === STATE.HUNGRY);
  const banner    = document.getElementById('deadlockBanner');
  if (allHungry && philosophers.length > 0) {
    deadlockCount++;
    banner.style.display = 'block';
    addLog(`☠️ DEADLOCK DETECTED! (count: ${deadlockCount})`, 'deadlock');
    setComment(`☠️ <b>DEADLOCK!</b> All ${N} philosophers are hungry and waiting for a chopstick — circular wait!`);
    updateStats();
    if (autoMode) stopAuto();
  } else {
    banner.style.display = 'none';
  }
}

// ── AUTO MODE ─────────────────────────────────────────────
function toggleAuto() {
  if (autoMode) { stopAuto(); return; }
  if (!started) {
    // Start simulation first without recursion risk
    if (!started) startSimulation();
  }
  autoMode = true;
  document.getElementById('autoBtn').classList.add('active');
  addLog('Auto mode enabled', 'info');
  scheduleAuto();
}

function stopAuto() {
  autoMode = false;
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = null;
  document.getElementById('autoBtn').classList.remove('active');
}

function scheduleAuto() {
  if (!autoMode) return;
  const speed = parseInt(document.getElementById('speedSlider').value);
  const delay = Math.max(200, 1200 - speed * 200);

  autoTimer = setTimeout(() => {
    if (!autoMode || !started) return;

    // Pick a random philosopher weighted towards hungry ones
    const candidates = philosophers.map((p, i) => i);
    const hungry     = candidates.filter(i => philosophers[i].state === STATE.HUNGRY);
    const thinking   = candidates.filter(i => philosophers[i].state === STATE.THINKING);
    const eating     = candidates.filter(i => philosophers[i].state === STATE.EATING);

    let pick = -1;
    const r = Math.random();
    if (eating.length > 0 && r < 0.35) {
      pick = eating[Math.floor(Math.random() * eating.length)];
    } else if (hungry.length > 0 && r < 0.75) {
      pick = hungry[Math.floor(Math.random() * hungry.length)];
    } else if (thinking.length > 0) {
      pick = thinking[Math.floor(Math.random() * thinking.length)];
    } else {
      pick = Math.floor(Math.random() * N);
    }

    if (pick >= 0) advancePhilosopher(pick);
    scheduleAuto();
  }, delay);
}

// ── CODE HIGHLIGHT ────────────────────────────────────────
const codeLines = ['line-think','line-wait-left','line-wait-right','line-eat','line-signal-left','line-signal-right'];

function clearCodeHighlight() {
  codeLines.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'fn';
  });
}

function highlightCode(lineId, cls) {
  clearCodeHighlight();
  const el = document.getElementById(lineId);
  if (el) el.className = `fn ${cls}`;
}

// ── COMMENT ───────────────────────────────────────────────
function setComment(html) {
  document.getElementById('commentBody').innerHTML = html;
}

// ── LOG ───────────────────────────────────────────────────
const MAX_LOG = 80;
function addLog(msg, cls = 'info') {
  const body = document.getElementById('logBody');
  const ts   = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const div  = document.createElement('div');
  div.className = `log-entry ${cls}`;
  div.textContent = `[${ts}] ${msg}`;
  body.prepend(div);
  // Trim old entries
  while (body.children.length > MAX_LOG) body.removeChild(body.lastChild);
}

function clearLog() {
  document.getElementById('logBody').innerHTML = '';
}

// ── UPDATE ALL ────────────────────────────────────────────
function updateAll() {
  updatePhilosopherButtons();
  updateStateTable();
  updateArrayDisplays();
  updateStats();
  drawTable();
}

// ── CANVAS DRAWING ────────────────────────────────────────
const COLORS = {
  thinking: { fill: '#1e3a5f', stroke: '#60a5fa', glow: 'rgba(96,165,250,0.4)'  },
  hungry:   { fill: '#3d2e00', stroke: '#facc15', glow: 'rgba(250,204,21,0.4)'  },
  eating:   { fill: '#0a3320', stroke: '#4ade80', glow: 'rgba(74,222,128,0.4)'  }
};

function drawTable() {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2, cy = H / 2;
  const tableR  = W * 0.28;
  const philR   = W * 0.42;
  const forkR   = W * 0.35;
  const nodeR   = 28;
  const forkSz  = 18;

  // ── Background ──
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.52);
  bg.addColorStop(0,   'rgba(30,35,70,0.9)');
  bg.addColorStop(1,   'rgba(13,15,26,0)');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(cx, cy, W * 0.5, 0, Math.PI * 2); ctx.fill();

  // ── Dining Table ──
  // Outer glow ring
  const glowRing = ctx.createRadialGradient(cx, cy, tableR * 0.85, cx, cy, tableR * 1.1);
  glowRing.addColorStop(0, 'rgba(108,127,255,0.15)');
  glowRing.addColorStop(1, 'rgba(108,127,255,0)');
  ctx.fillStyle = glowRing;
  ctx.beginPath(); ctx.arc(cx, cy, tableR * 1.1, 0, Math.PI * 2); ctx.fill();

  // Table surface
  const tableGrad = ctx.createRadialGradient(cx - tableR*0.2, cy - tableR*0.2, 0, cx, cy, tableR);
  tableGrad.addColorStop(0, '#2a2f5e');
  tableGrad.addColorStop(1, '#151830');
  ctx.fillStyle = tableGrad;
  ctx.beginPath(); ctx.arc(cx, cy, tableR, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(108,127,255,0.4)';
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.arc(cx, cy, tableR, 0, Math.PI * 2); ctx.stroke();

  // Table center emoji
  ctx.font      = `${tableR * 0.55}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍜', cx, cy);

  if (!started || philosophers.length === 0) {
    ctx.fillStyle    = 'rgba(148,163,184,0.5)';
    ctx.font         = 'bold 14px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Press Start to begin', cx, cy + tableR + 28);
    return;
  }

  // ── Compute positions ──
  const angle0 = -Math.PI / 2; // top

  const philPos = Array.from({ length: N }, (_, i) => {
    const a = angle0 + (2 * Math.PI * i) / N;
    return { x: cx + philR * Math.cos(a), y: cy + philR * Math.sin(a), a };
  });

  const forkPos = Array.from({ length: N }, (_, i) => {
    const a = angle0 + (2 * Math.PI * (i + 0.5)) / N;
    return { x: cx + forkR * Math.cos(a), y: cy + forkR * Math.sin(a), a };
  });

  // ── Draw connection lines (phil → forks) ──
  for (let i = 0; i < N; i++) {
    const p = philosophers[i];
    if (p.state === STATE.HUNGRY || p.state === STATE.EATING) {
      const left  = i;
      const right = (i + 1) % N;
      const holdingLeft  = (p.step >= 1 && p.state === STATE.HUNGRY) || p.state === STATE.EATING;
      const holdingRight = (p.step >= 2 && p.state === STATE.HUNGRY) || p.state === STATE.EATING;

      [{ fork: left, holding: holdingLeft }, { fork: right, holding: holdingRight }].forEach(({ fork, holding }) => {
        if (holding) {
          ctx.beginPath();
          ctx.moveTo(philPos[i].x, philPos[i].y);
          ctx.lineTo(forkPos[fork].x, forkPos[fork].y);
          ctx.strokeStyle = p.state === STATE.EATING ? 'rgba(74,222,128,0.5)' : 'rgba(250,204,21,0.5)';
          ctx.lineWidth   = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }
  }

  // ── Draw chopsticks ──
  for (let i = 0; i < N; i++) {
    const fp   = forkPos[i];
    const free = chopsticks[i] === 1;
    const r    = forkSz;
    const angle = fp.a + Math.PI / 2;

    // Glow halo
    const halo = ctx.createRadialGradient(fp.x, fp.y, 0, fp.x, fp.y, r * 2);
    halo.addColorStop(0, free ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(fp.x, fp.y, r * 2, 0, Math.PI * 2); ctx.fill();

    // Fork circle
    ctx.beginPath(); ctx.arc(fp.x, fp.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = free ? 'rgba(18,54,38,0.9)' : 'rgba(54,18,18,0.9)';
    ctx.fill();
    ctx.strokeStyle = free ? '#34d399' : '#f87171';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Fork icon (draw two lines = chopsticks)
    ctx.save();
    ctx.translate(fp.x, fp.y);
    ctx.rotate(angle);
    ctx.strokeStyle = free ? '#34d399' : '#f87171';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath(); ctx.moveTo(-5, -r*0.5); ctx.lineTo(-5, r*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,  -r*0.5); ctx.lineTo(5,  r*0.5); ctx.stroke();
    ctx.restore();

    // Label
    ctx.fillStyle    = free ? '#34d399' : '#f87171';
    ctx.font         = 'bold 11px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`C${i}`, fp.x, fp.y + r + 12);
  }

  // ── Draw philosophers ──
  for (let i = 0; i < N; i++) {
    const pp  = philPos[i];
    const p   = philosophers[i];
    const col = COLORS[p.state];

    // Outer glow pulse
    const glowSize = p.state === STATE.EATING ? nodeR + 14 : nodeR + 8;
    const grd = ctx.createRadialGradient(pp.x, pp.y, nodeR, pp.x, pp.y, glowSize);
    grd.addColorStop(0, col.glow);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(pp.x, pp.y, glowSize, 0, Math.PI * 2); ctx.fill();

    // Phil circle
    ctx.beginPath(); ctx.arc(pp.x, pp.y, nodeR, 0, Math.PI * 2);
    ctx.fillStyle   = col.fill;
    ctx.fill();
    ctx.strokeStyle = col.stroke;
    ctx.lineWidth   = p.state === STATE.EATING ? 3 : 2;
    ctx.stroke();

    // Emoji
    const emoji = p.state === STATE.THINKING ? '🤔'
                : p.state === STATE.HUNGRY   ? '😤'
                : '😋';
    ctx.font         = `${nodeR * 0.85}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, pp.x, pp.y - 2);

    // Label (below)
    ctx.fillStyle    = col.stroke;
    ctx.font         = 'bold 12px Inter, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const labelOffset = nodeR + 16;
    const lx = pp.x + labelOffset * Math.cos(pp.a);
    const ly = pp.y + labelOffset * Math.sin(pp.a);
    ctx.fillText(`P${i}`, lx, ly);

    // Meals badge (eating)
    if (p.state === STATE.EATING) {
      ctx.fillStyle = 'rgba(74,222,128,0.9)';
      ctx.font      = 'bold 10px Inter, sans-serif';
      ctx.fillText(`×${p.meals}`, pp.x, pp.y + nodeR + 6);
    }
  }
}

// ── MODAL HELPERS ─────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ── ANIMATION LOOP (smooth canvas) ───────────────────────
function animate() {
  drawTable();
  animFrame = requestAnimationFrame(animate);
}
animate();
