(function(){
  const canvas = document.getElementById("ringsCanvas");
  const ctx = canvas.getContext("2d");
  const scoreOut = document.getElementById("scoreOut");
  const btnReset = document.getElementById("btnReset");
  const btnPause = document.getElementById("btnPause");
  if(!canvas || !ctx) return;

  const TAU = Math.PI * 2;
  const normAngle = (a) => { a %= TAU; if (a < 0) a += TAU; return a; };

  function angleInArc(theta, start, end) {
    theta = normAngle(theta);
    start = normAngle(start);
    end = normAngle(end);
    if (start <= end) return theta >= start && theta <= end;
    return theta >= start || theta <= end;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  const CFG = {
    ringCount: 8,
    ringGapDeg: 32,
    ringThickness: 9,
    ringSpacing: 22,
    ringRotateMin: -0.9,
    ringRotateMax: 0.9,
    ballRadius: 7,
    ballSpeed: 220,
    bg: "rgba(255,255,255,0.65)",
    ringColor: "rgba(13,110,253,0.85)",
    ringColor2: "rgba(13,110,253,0.45)",
    ballColor: "rgba(220,53,69,0.92)",
    dotColor: "rgba(255,255,255,0.9)"
  };

  let W = 0, H = 0, cx = 0, cy = 0;
  let score = 0;
  let paused = false;

  const rings = [];
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };

  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.min(760, Math.floor(window.innerWidth * 0.88));
    const cssH = 520;

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = cssW; H = cssH;
    cx = W / 2; cy = H / 2;
  }

  function recalcTargets() {
    const maxR = Math.min(W, H) * 0.42;
    for (let i = 0; i < rings.length; i++) {
      rings[i].targetR = maxR - i * CFG.ringSpacing;
    }
  }

  function addOuterRing() {
    const maxExisting = rings.reduce((m, r) => Math.max(m, r.targetR), 0);
    const newTarget = maxExisting + CFG.ringSpacing;
    rings.unshift({
      targetR: newTarget,
      r: newTarget + 50,
      gapCenter: rand(0, TAU),
      gapSize: (CFG.ringGapDeg * Math.PI / 180),
      rotSpeed: rand(CFG.ringRotateMin, CFG.ringRotateMax),
      thickness: CFG.ringThickness
    });
  }

  function reset() {
    setupCanvas();
    score = 0;
    scoreOut.textContent = "0";
    paused = false;
    btnPause.textContent = "Пауза";
    rings.length = 0;

    const maxR = Math.min(W, H) * 0.42;
    for (let i = 0; i < CFG.ringCount; i++) {
      const targetR = maxR - i * CFG.ringSpacing;
      rings.push({
        targetR,
        r: targetR,
        gapCenter: rand(0, TAU),
        gapSize: (CFG.ringGapDeg * Math.PI / 180),
        rotSpeed: rand(CFG.ringRotateMin, CFG.ringRotateMax),
        thickness: CFG.ringThickness
      });
    }

    ball.x = cx;
    ball.y = cy;
    const ang = rand(0, TAU);
    const speed = CFG.ballSpeed;
    ball.vx = Math.cos(ang) * speed;
    ball.vy = Math.sin(ang) * speed;
  }

  function stepRings(dt) {
    for (const r of rings) {
      r.gapCenter = normAngle(r.gapCenter + r.rotSpeed * dt);
      const k = 1 - Math.pow(0.001, dt);
      r.r += (r.targetR - r.r) * k;
    }
  }

  // Добавляет случайное отклонение направления при отскоке
  function addRandomDeflection(strength = 0.25) {
    const angle = Math.atan2(ball.vy, ball.vx);
    const speed = Math.hypot(ball.vx, ball.vy);

    // Основное случайное отклонение
    const deviation = rand(-strength, strength);
    
    // Дополнительный "рывок" с небольшой вероятностью
    const extra = Math.random() < 0.22 ? rand(-0.35, 0.35) : 0;

    const newAngle = angle + deviation + extra;

    ball.vx = Math.cos(newAngle) * speed;
    ball.vy = Math.sin(newAngle) * speed;
  }

  function ballPhysics(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Отскок от границ canvas
    const pad = 12;
    let bouncedWall = false;

    if (ball.x < pad + CFG.ballRadius) {
      ball.x = pad + CFG.ballRadius;
      ball.vx = -ball.vx;
      bouncedWall = true;
    }
    if (ball.x > W - pad - CFG.ballRadius) {
      ball.x = W - pad - CFG.ballRadius;
      ball.vx = -ball.vx;
      bouncedWall = true;
    }
    if (ball.y < pad + CFG.ballRadius) {
      ball.y = pad + CFG.ballRadius;
      ball.vy = -ball.vy;
      bouncedWall = true;
    }
    if (ball.y > H - pad - CFG.ballRadius) {
      ball.y = H - pad - CFG.ballRadius;
      ball.vy = -ball.vy;
      bouncedWall = true;
    }

    if (bouncedWall) {
      addRandomDeflection(0.18);   // меньшее отклонение от стен
    }

    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const dist = Math.hypot(dx, dy);
    const theta = Math.atan2(dy, dx);

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const inner = r.r - r.thickness / 2;
      const outer = r.r + r.thickness / 2;

      const crosses = (dist + CFG.ballRadius >= inner) && (dist - CFG.ballRadius <= outer);
      if (!crosses) continue;

      const gapHalf = r.gapSize / 2;
      const inGap = angleInArc(theta, r.gapCenter - gapHalf, r.gapCenter + gapHalf);

      if (inGap) {
        rings.splice(i, 1);
        score++;
        scoreOut.textContent = String(score);
        addOuterRing();
        recalcTargets();
        break;
      } else {
        // отскок от кольца
        const nx = dist === 0 ? 1 : dx / dist;
        const ny = dist === 0 ? 0 : dy / dist;
        const dot = ball.vx * nx + ball.vy * ny;

        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;

        // ← случайное отклонение при отскоке от кольца (самое заметное)
        addRandomDeflection(0.28);   // 16° ± примерно

        const targetDist = (dist > r.r)
          ? (outer + CFG.ballRadius + 1)
          : (inner - CFG.ballRadius - 1);
        ball.x = cx + nx * targetDist;
        ball.y = cy + ny * targetDist;

        break;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = CFG.bg;
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(W, H) * 0.45);
    grad.addColorStop(0, "rgba(13,110,253,0.08)");
    grad.addColorStop(1, "rgba(13,110,253,0.00)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      const gapHalf = r.gapSize / 2;
      const gs = normAngle(r.gapCenter - gapHalf);
      const ge = normAngle(r.gapCenter + gapHalf);

      ctx.lineWidth = r.thickness;
      ctx.lineCap = "round";
      ctx.strokeStyle = (i % 2 === 0) ? CFG.ringColor : CFG.ringColor2;

      ctx.beginPath();
      if (gs <= ge) {
        ctx.arc(cx, cy, r.r, ge, TAU, false);
        ctx.arc(cx, cy, r.r, 0, gs, false);
      } else {
        ctx.arc(cx, cy, r.r, ge, gs, false);
      }
      ctx.stroke();

      const px = cx + Math.cos(r.gapCenter) * r.r;
      const py = cy + Math.sin(r.gapCenter) * r.r;
      ctx.fillStyle = CFG.dotColor;
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = CFG.ballColor;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, CFG.ballRadius, 0, TAU);
    ctx.fill();
  }

  let lastT = 0;
  function loop(t) {
    const now = t / 1000;
    const dt = Math.min(0.033, (now - lastT) || 0.016);
    lastT = now;

    if (!paused) {
      stepRings(dt);
      ballPhysics(dt);
    }

    draw();
    requestAnimationFrame(loop);
  }

  btnReset.addEventListener("click", reset);
  btnPause.addEventListener("click", () => {
    paused = !paused;
    btnPause.textContent = paused ? "Продолжить" : "Пауза";
  });

  window.addEventListener("resize", () => {
    const oldScore = score;
    const rx = (ball.x - cx) / (Math.min(W, H) || 1);
    const ry = (ball.y - cy) / (Math.min(W, H) || 1);
    const vx = ball.vx, vy = ball.vy;

    setupCanvas();
    recalcTargets();
    score = oldScore;
    scoreOut.textContent = String(score);

    ball.x = cx + rx * Math.min(W, H);
    ball.y = cy + ry * Math.min(W, H);
    ball.vx = vx; ball.vy = vy;
  });

  // Запуск
  reset();
  requestAnimationFrame(loop);
})();