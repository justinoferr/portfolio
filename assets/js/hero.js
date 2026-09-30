// Hero background: wireframe terrain scrolling towards the camera with a
// rotating network globe floating over the horizon. Pure canvas, no deps.
(() => {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  // Reduced motion: keep it alive but slow instead of freezing
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const speed = reduceMotion ? 0.35 : 1;

  /* ---------- globe ---------- */

  // Fibonacci sphere: evenly spread nodes
  const N = 240;
  const nodes = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    nodes.push([Math.cos(golden * i) * r, y, Math.sin(golden * i) * r]);
  }

  // Link nearby nodes
  const edges = [];
  const maxDist = 0.28;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = nodes[i][0] - nodes[j][0];
      const dy = nodes[i][1] - nodes[j][1];
      const dz = nodes[i][2] - nodes[j][2];
      if (dx * dx + dy * dy + dz * dz < maxDist * maxDist) edges.push([i, j]);
    }
  }

  // Packets travelling along random edges
  const newPacket = () => ({
    edge: edges[(Math.random() * edges.length) | 0],
    t: 0,
    speed: 0.008 + Math.random() * 0.018,
  });
  const packets = Array.from({ length: 14 }, newPacket);

  // Orbit rings: radius, tilt around x, tilt around z
  const rings = [
    [1.35, 1.2, 0.3],
    [1.55, 0.4, -0.9],
  ];

  function rotate(p, ay, ax) {
    const cy = Math.cos(ay), sy = Math.sin(ay);
    const cx = Math.cos(ax), sx = Math.sin(ax);
    const x = p[0] * cy - p[2] * sy;
    const z = p[0] * sy + p[2] * cy;
    return [x, p[1] * cx - z * sx, p[1] * sx + z * cx];
  }

  /* ---------- terrain ---------- */

  const COLS = 100;         // x from -COLS/2 to COLS/2
  const ROWS = 38;          // z from Z_NEAR to Z_NEAR + ROWS
  const Z_NEAR = 2;
  const CAM_Y = 2.4;

  function terrainHeight(x, z) {
    const n =
      Math.sin(x * 0.35 + z * 0.21) * 0.9 +
      Math.sin(x * 0.17 - z * 0.33) * 1.1 +
      Math.sin(x * 0.06 + z * 0.11) * 1.6;
    const valley = Math.min(1, Math.abs(x) / 9); // flat road in the middle
    return Math.max(0, n) * 0.9 * valley;
  }

  /* ---------- state ---------- */

  let w = 0, h = 0, dpr = 1;
  let time = 0;
  let travel = 0;
  let camX = 0, camXTarget = 0;
  let tilt = 0.35, tiltTarget = 0.35;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("mousemove", (e) => {
    camXTarget = (e.clientX / window.innerWidth - 0.5) * 3;
    tiltTarget = 0.35 + (e.clientY / window.innerHeight - 0.5) * 0.4;
  });

  function drawGlobe(cx, cy, radius) {
    const ay = time * 0.0022 + camX * 0.08;
    const project = (p) => {
      const s = 3.2 / (3.2 + p[2]);
      return [cx + p[0] * radius * s, cy + p[1] * radius * s, (1 - p[2]) / 2, s];
    };
    const proj = nodes.map((n) => project(rotate(n, ay, tilt)));

    // node -> elapsed frames of the incident it belongs to
    const targets = new Map(), attackers = new Map();
    for (const inc of incidents) {
      targets.set(inc.t, time - inc.start);
      attackers.set(inc.a, time - inc.start);
    }

    ctx.lineWidth = 0.6;
    for (const [a, b] of edges) {
      const pa = proj[a], pb = proj[b];
      const d = (pa[2] + pb[2]) / 2;
      const base = 0.03 + d * d * 0.32;
      let style = `rgba(255,255,255,${base})`;
      if (incidents.length) {
        const te = targets.has(a) ? targets.get(a) : targets.has(b) ? targets.get(b) : -1;
        const ae = attackers.has(a) ? attackers.get(a) : attackers.has(b) ? attackers.get(b) : -1;
        const hitsTarget = te >= 0, hitsAttacker = ae >= 0;
        const e = hitsTarget ? te : ae;
        if (hitsTarget && e >= T_IMPACT && e < T_PATCH) {
          // Breached: links flicker red and die out
          const k = (e - T_IMPACT) / (T_PATCH - T_IMPACT);
          style = `rgba(${RED},${Math.random() < 0.35 ? 0 : 0.7 * d * (1 - k)})`;
        } else if (hitsTarget && e >= T_PATCH && e < T_SECURE) {
          // Patched: links grow back
          style = `rgba(255,255,255,${base * (e - T_PATCH) / (T_SECURE - T_PATCH)})`;
        } else if (hitsAttacker && e < T_IMPACT) {
          style = `rgba(${RED},${0.1 + 0.35 * d})`;
        }
      }
      ctx.strokeStyle = style;
      ctx.beginPath();
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
      ctx.stroke();
    }

    for (let i = 0; i < N; i++) {
      // The breached node is drawn by drawIncident until it is secure again
      if (targets.has(i) && targets.get(i) >= T_IMPACT) continue;
      const p = proj[i];
      ctx.fillStyle = `rgba(255,255,255,${0.15 + p[2] * 0.85})`;
      const r = (0.5 + p[2] * 1.3) * p[3];
      ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
    }

    for (const [rad, rx, rz] of rings) {
      for (let k = 0; k < 120; k += 2) {
        const a = (k / 120) * Math.PI * 2 + time * 0.0033;
        let p = [Math.cos(a) * rad, 0, Math.sin(a) * rad];
        p = [p[0] * Math.cos(rz), p[0] * Math.sin(rz), p[2]];
        p = [p[0], p[1] * Math.cos(rx) - p[2] * Math.sin(rx), p[1] * Math.sin(rx) + p[2] * Math.cos(rx)];
        const q = project(rotate(p, camX * 0.08, tilt - 0.35));
        ctx.fillStyle = `rgba(255,255,255,${0.05 + q[2] * 0.35})`;
        ctx.fillRect(q[0] - 0.7, q[1] - 0.7, 1.4, 1.4);
      }
    }

    for (let i = 0; i < packets.length; i++) {
      const pk = packets[i];
      pk.t += pk.speed * speed;
      if (pk.t >= 1) { packets[i] = newPacket(); continue; }
      const pa = proj[pk.edge[0]], pb = proj[pk.edge[1]];
      const d = pa[2] + (pb[2] - pa[2]) * pk.t;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + d * 0.7})`;
      ctx.beginPath();
      ctx.arc(
        pa[0] + (pb[0] - pa[0]) * pk.t,
        pa[1] + (pb[1] - pa[1]) * pk.t,
        1.2 + d * 1.4, 0, Math.PI * 2
      );
      ctx.fill();
    }

    drawIncidents(proj, radius, cx, cy);
  }

  /* ---------- incident: attack -> breach -> patch -> secure ---------- */

  const RED = "255,43,58";
  // Phase boundaries, in frames (at 60fps)
  const T_CHARGE = 30;   // attacker node charges up
  const T_FIRE = 72;     // missile hits the target
  const T_IMPACT = 80;   // target shatters
  const T_PATCH = 160;   // fix starts, shards come back
  const T_SECURE = 250;  // node restored, shield up
  const T_END = 360;

  const INCIDENT_EVERY = 180; // a new attack every 3s; they overlap
  const incidents = [];
  let nextIncident = 60;
  // Incidents only on nodes above the terrain and clear of the hero text
  let skyY = Infinity;
  let minX = 0;

  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));

  function startIncident(proj) {
    const busy = new Set(incidents.flatMap((inc) => [inc.a, inc.t]));
    const front = [];
    for (let i = 0; i < N; i++) {
      if (busy.has(i)) continue;
      if (proj[i][2] > 0.72 && proj[i][1] < skyY && proj[i][0] > minX) front.push(i);
    }
    if (front.length < 2) return false;
    for (let tries = 0; tries < 30; tries++) {
      const a = front[(Math.random() * front.length) | 0];
      const t = front[(Math.random() * front.length) | 0];
      const d = Math.hypot(
        nodes[a][0] - nodes[t][0],
        nodes[a][1] - nodes[t][1],
        nodes[a][2] - nodes[t][2]
      );
      if (d > 0.55 && d < 1.2) {
        incidents.push({
          a, t, start: time,
          shards: Array.from({ length: 9 }, (_, k) => ({
            ang: (k / 9) * Math.PI * 2 + Math.random() * 0.5,
            dist: 0.6 + Math.random() * 0.8,
            rot: Math.random() * Math.PI,
          })),
        });
        return true;
      }
    }
    return false;
  }

  function drawMissile(A, T, cx, cy, prog, alpha) {
    // Arc bulging away from the globe center, like a ballistic trajectory
    const mx = (A[0] + T[0]) / 2, my = (A[1] + T[1]) / 2;
    const ox = mx - cx, oy = my - cy;
    const ol = Math.hypot(ox, oy) || 1;
    const lift = Math.hypot(T[0] - A[0], T[1] - A[1]) * 0.35;
    const C = [mx + (ox / ol) * lift, my + (oy / ol) * lift];
    const at = (s) => {
      const u = 1 - s;
      return [
        u * u * A[0] + 2 * u * s * C[0] + s * s * T[0],
        u * u * A[1] + 2 * u * s * C[1] + s * s * T[1],
      ];
    };

    // Smoke trail: thin and faint at the tail, thick and bright at the head
    const tail = Math.max(0, prog - 0.45);
    const steps = 18;
    let prev = at(tail);
    ctx.lineCap = "round";
    for (let i = 1; i <= steps; i++) {
      const k = i / steps;
      const p = at(tail + (prog - tail) * k);
      ctx.lineWidth = 0.6 + k * 3;
      ctx.strokeStyle = `rgba(${RED},${alpha * k * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      prev = p;
    }

    // Warhead, pointing along the flight direction
    if (prog < 1) {
      const p = at(prog), q = at(Math.max(0, prog - 0.02));
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(Math.atan2(p[1] - q[1], p[0] - q[0]));
      ctx.shadowColor = `rgb(${RED})`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffe5e5";
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-5, -3.2);
      ctx.lineTo(-5, 3.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function hudLabel(T, unit, text, color) {
    // Flip to the left side near the right edge of the screen
    const dir = T[0] > w - 150 ? -1 : 1;
    const x = T[0] + dir * unit * 3, y = T[1] - unit * 3;
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(T[0] + dir * unit, T[1] - unit);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dir * unit * 1.5, y);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = dir > 0 ? "left" : "right";
    ctx.fillText(text, x + dir * unit * 1.8, y + 3);
  }

  function drawIncidents(proj, radius, cx, cy) {
    // Retry every frame until a valid pair shows up on the visible side
    if (time >= nextIncident && startIncident(proj)) nextIncident = time + INCIDENT_EVERY;
    for (let i = incidents.length - 1; i >= 0; i--) {
      if (time - incidents[i].start >= T_END) incidents.splice(i, 1);
    }
    for (const inc of incidents) drawIncident(inc, proj, radius, cx, cy);
  }

  function drawIncident(incident, proj, radius, cx, cy) {
    const e = time - incident.start;

    const A = proj[incident.a], T = proj[incident.t];
    const unit = radius * 0.045;

    ctx.save();
    // Fade out if the globe rotates the target to the back
    ctx.globalAlpha = clamp01((T[2] - 0.3) / 0.35);
    ctx.font = "500 10px 'JetBrains Mono', ui-monospace, monospace";

    // 1. Attacker charges up
    if (e < T_IMPACT + 10) {
      const k = clamp01(e / T_CHARGE);
      const pulse = 0.5 + 0.5 * Math.sin(e * 0.5);
      ctx.shadowColor = `rgb(${RED})`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgb(${RED})`;
      ctx.beginPath();
      ctx.arc(A[0], A[1], 1.5 + k * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = `rgba(${RED},${0.6 * pulse * k})`;
      ctx.beginPath();
      ctx.arc(A[0], A[1], 4 + k * 7 * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Missile flies to the target, accelerating
    if (e >= T_CHARGE && e < T_FIRE + 28) {
      const k = clamp01((e - T_CHARGE) / (T_FIRE - T_CHARGE));
      const fade = e > T_FIRE ? 1 - (e - T_FIRE) / 28 : 1;
      drawMissile(A, T, cx, cy, k * k, fade);
    }

    // 3. Impact: target flickers red, shockwave
    if (e >= T_FIRE && e < T_IMPACT) {
      if (Math.random() < 0.7) {
        ctx.fillStyle = `rgb(${RED})`;
        ctx.fillRect(T[0] - 3, T[1] - 3, 6, 6);
      }
    }
    if (e >= T_FIRE && e < T_FIRE + 45) {
      const k = (e - T_FIRE) / 45;
      // Explosion flash
      if (k < 0.3) {
        ctx.fillStyle = `rgba(255,200,200,${1 - k / 0.3})`;
        ctx.shadowColor = `rgb(${RED})`;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(T[0], T[1], unit * 2.2 * (1 - k), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(${RED},${0.8 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(T[0], T[1], unit * (1 + easeOut(k) * 6), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. Shards: burst out on breach, pulled back in during the patch
    if (e >= T_IMPACT && e < T_SECURE) {
      let dist, color;
      if (e < T_PATCH) {
        const k = (e - T_IMPACT) / (T_PATCH - T_IMPACT);
        dist = easeOut(k);
        color = `rgba(${RED},${Math.random() < 0.15 ? 0.2 : 1 - 0.5 * k})`;
        // Glitch cross where the node was
        if (Math.random() < 0.6) {
          const s = unit * 0.9;
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(${RED},0.9)`;
          ctx.beginPath();
          ctx.moveTo(T[0] - s, T[1] - s); ctx.lineTo(T[0] + s, T[1] + s);
          ctx.moveTo(T[0] + s, T[1] - s); ctx.lineTo(T[0] - s, T[1] + s);
          ctx.stroke();
        }
      } else {
        const k = (e - T_PATCH) / (T_SECURE - T_PATCH);
        dist = 1 - easeInOut(k);
        color = `rgb(255,${(43 + 212 * k) | 0},${(58 + 197 * k) | 0})`;
      }
      ctx.fillStyle = color;
      for (const sh of incident.shards) {
        const r = unit * 3 * sh.dist * dist;
        const x = T[0] + Math.cos(sh.ang) * r;
        const y = T[1] + Math.sin(sh.ang) * r;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(sh.rot + dist * 3);
        ctx.fillRect(-1.6, -0.6, 3.2, 1.2);
        ctx.restore();
      }
    }

    // 5. Patch: targeting brackets close in on the node
    if (e >= T_PATCH && e < T_SECURE) {
      const k = (e - T_PATCH) / (T_SECURE - T_PATCH);
      const s = unit * (5 - 3.2 * easeOut(k));
      const c = s * 0.4;
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const x = T[0] + sx * s, y = T[1] + sy * s;
        ctx.moveTo(x - sx * c, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y - sy * c);
      }
      ctx.stroke();
    }

    // 6. Secure: node back, hexagon shield locks in and fades
    if (e >= T_SECURE) {
      const k = (e - T_SECURE) / (T_END - T_SECURE);
      ctx.shadowColor = "#fff";
      ctx.shadowBlur = 10 * (1 - k);
      ctx.fillStyle = "#fff";
      ctx.fillRect(T[0] - 2.2, T[1] - 2.2, 4.4, 4.4);
      ctx.shadowBlur = 0;

      const scale = 1 + 0.8 * (1 - easeOut(clamp01(k * 4)));
      const alpha = k < 0.7 ? 0.9 : 0.9 * (1 - (k - 0.7) / 0.3);
      const r = unit * 2.6 * scale;
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6 + k * 0.6;
        const x = T[0] + Math.cos(a) * r, y = T[1] + Math.sin(a) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // HUD labels
    if (e >= T_FIRE && e < T_PATCH) {
      if (Math.random() > 0.12) hudLabel(T, unit, "BREACH", `rgb(${RED})`);
    } else if (e >= T_PATCH && e < T_SECURE) {
      const pct = Math.floor(((e - T_PATCH) / (T_SECURE - T_PATCH)) * 100);
      hudLabel(T, unit, `PATCHING ${pct}%`, "rgba(255,255,255,0.9)");
    } else if (e >= T_SECURE) {
      const k = (e - T_SECURE) / (T_END - T_SECURE);
      hudLabel(T, unit, "SECURE", `rgba(255,255,255,${k < 0.7 ? 0.9 : 0.9 * (1 - (k - 0.7) / 0.3)})`);
    }

    ctx.restore();
  }

  function drawTerrain(horizon) {
    const f = w * 0.4;
    const phase = travel % 1;
    const grid = [];

    // Project every vertex; row 0 is the nearest
    for (let r = 0; r <= ROWS; r++) {
      const z = Z_NEAR + r - phase;
      const worldZ = z + travel;
      const row = [];
      for (let c = 0; c <= COLS; c++) {
        const x = c - COLS / 2;
        const y = terrainHeight(x, worldZ);
        row.push([w / 2 + (x - camX) * f / z, horizon + (CAM_Y - y) * f / z]);
      }
      grid.push({ z, row });
    }

    // Painter's algorithm: far strips first, filled black so they occlude
    ctx.lineWidth = 0.7;
    ctx.fillStyle = "#000";
    for (let r = ROWS - 1; r >= 0; r--) {
      const a = grid[r].row, b = grid[r + 1].row;
      const fade = 1 - (grid[r].z - Z_NEAR) / ROWS;
      // Floor on alpha so far ridges stay outlined where they cover the globe
      ctx.strokeStyle = `rgba(255,255,255,${0.14 + fade * fade * 0.45})`;
      ctx.beginPath();
      for (let c = 0; c < COLS; c++) {
        ctx.moveTo(a[c][0], a[c][1]);
        ctx.lineTo(a[c + 1][0], a[c + 1][1]);
        ctx.lineTo(b[c + 1][0], b[c + 1][1]);
        ctx.lineTo(b[c][0], b[c][1]);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  function frame() {
    camX += (camXTarget - camX) * 0.04;
    tilt += (tiltTarget - tilt) * 0.04;

    ctx.clearRect(0, 0, w, h);

    const narrow = w < 760;
    const horizon = h * (narrow ? 0.74 : 0.78);
    const radius = narrow ? Math.min(w, h) * 0.38 : h * 0.36;
    const bob = Math.sin(time * 0.015) * radius * 0.03;
    const globeX = narrow ? w / 2 : w * 0.72;
    const globeY = h * 0.42 + bob;
    skyY = horizon - 12;
    minX = narrow ? 0 : w * 0.64;

    // Globe hangs in the sky like a moon; the terrain is drawn over its base
    drawGlobe(globeX, globeY, radius);
    drawTerrain(horizon);

    // Darken behind the text for readability
    if (!narrow) {
      const g = ctx.createLinearGradient(0, 0, w * 0.6, 0);
      g.addColorStop(0, "rgba(0,0,0,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w * 0.6, h);
    }

    time += speed;
    travel += 0.11 * speed;
  }

  let running = false;
  function loop() {
    if (!running) return;
    frame();
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", resize);

  // Pause when the hero is off-screen
  new IntersectionObserver(([entry]) => {
    const wasRunning = running;
    running = entry.isIntersecting;
    if (running && !wasRunning) loop();
  }).observe(canvas);
})();
