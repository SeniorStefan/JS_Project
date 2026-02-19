(function(){
  const canvas = document.getElementById("ringsCanvas");
  const ctx = canvas.getContext("2d");
  const scoreOut = document.getElementById("scoreOut");
  const btnReset = document.getElementById("btnReset");
  const btnPause = document.getElementById("btnPause");

  if (!canvas || !ctx) return;

  const TAU = Math.PI * 2;
  const normAngle = a => { a %= TAU; if (a < 0) a += TAU; return a; };

  function angleInArc(theta, start, end) {
    theta = normAngle(theta);
    start = normAngle(start);
    end = normAngle(end);
    if (start <= end) return theta >= start && theta <= end;
    return theta >= start || theta <= end;
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const CFG = {
    ringCount: isMobile ? 7 : 8,
    ringGapDeg: isMobile ? 38 : 34,
    ringThickness: 10,
    ringSpacing: isMobile ? 26 : 22,
    ringRotateMin: -1.1,
    ringRotateMax: 1.1,
    ballRadius: isMobile ? 9 : 7,
    ballSpeed: isMobile ? 160 : 220,
    bg: "rgba(255,255,255,0.70)",
    ringColor: "rgba(13,110,253,0.9)",
    ringColor2: "rgba(13,110,253,0.5)",
    ballColor: "rgba(220,53,69,0.95)",
    dotColor: "rgba(255,255,255,1)",
    minSpeed: 120  // минимальная скорость, ниже которой возвращаем
  };

  let W = 0, H = 0, cx = 0, cy = 0;
  let score = 0;
  let paused = false;

  const rings = [];
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };

  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    let cssW = window.innerWidth * (isMobile ? 0.98 : 0.88);
    let cssH = window.innerHeight * (isMobile ? 0.58 : 0.65);

    cssW = Math.min(760, cssW);
    cssH = Math.min(580, cssH);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    W = cssW; H = cssH;
    cx = W / 2; cy = H / 2;
  }

  function recalcTargets() {
    const maxR = Math.min(W, H) * 0.44;
    rings.forEach((r, i) => r.targetR = maxR - i * CFG.ringSpacing);
  }

  function addOuterRing() {
    const maxR = rings.reduce((m, r) => Math.max(m, r.targetR), 0);
    const newTarget = maxR + CFG.ringSpacing;
    rings.unshift({
      targetR: newTarget,
      r: newTarget + 60,
      gapCenter: rand(0, TAU),
      gapSize: CFG.ringGapDeg * Math.PI / 180,
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

    const maxR = Math.min(W, H) * 0.44;
    for (let i = 0; i < CFG.ringCount; i++) {
      const targetR = maxR - i * CFG.ringSpacing;
      rings.push({
        targetR,
        r: targetR,
        gapCenter: rand(0, TAU),
        gapSize: CFG.ringGapDeg * Math.PI / 180,
        rotSpeed: rand(CFG.ringRotateMin, CFG.ringRotateMax),
        thickness: CFG.ringThickness
      });
    }

    ball.x = cx;
    ball.y = cy;
    const ang = rand(0, TAU);
    ball.vx = Math.cos(ang) * CFG.ballSpeed;
    ball.vy = Math.sin(ang) * CFG.ballSpeed;
  }

  function stepRings(dt) {
    rings.forEach(r => {
      r.gapCenter = normAngle(r.gapCenter + r.rotSpeed * dt);
      const k = 1 - Math.pow(0.001, dt);
      r.r += (r.targetR - r.r) * k;
    });
  }

  function addRandomDeflection(strength = 0.28) {
    const angle = Math.atan2(ball.vy, ball.vx);
    let speed = Math.hypot(ball.vx, ball.vy);
    if (speed < CFG.minSpeed) speed = CFG.minSpeed; // защита от слишком медленной скорости

    const deviation = rand(-strength, strength);
    const extra = Math.random() < 0.22 ? rand(-0.4, 0.4) : 0;
    const newAngle = angle + deviation + extra;

    ball.vx = Math.cos(newAngle) * speed;
    ball.vy = Math.sin(newAngle) * speed;
  }

  function clampBallPosition() {
    const pad = CFG.ballRadius + 4;
    ball.x = Math.max(pad, Math.min(W - pad, ball.x));
    ball.y = Math.max(pad, Math.min(H - pad, ball.y));
  }

  function ballPhysics(dt) {
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    clampBallPosition();

    const pad = CFG.ballRadius + 8;
    let bounced = false;

    if (ball.x < pad) { ball.x = pad; ball.vx = Math.abs(ball.vx); bounced = true; }
    if (ball.x > W - pad) { ball.x = W - pad; ball.vx = -Math.abs(ball.vx); bounced = true; }
    if (ball.y < pad) { ball.y = pad; ball.vy = Math.abs(ball.vy); bounced = true; }
    if (ball.y > H - pad) { ball.y = H - pad; ball.vy = -Math.abs(ball.vy); bounced = true; }

    if (bounced) addRandomDeflection(isMobile ? 0.22 : 0.18);

    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const distSq = dx*dx + dy*dy;
    let dist = Math.sqrt(distSq);

    // защита от NaN / нулевого расстояния
    if (!isFinite(dist) || dist < 1e-6) {
      dist = 1;
      ball.x = cx + rand(-10,10);
      ball.y = cy + rand(-10,10);
    }

    const theta = Math.atan2(dy, dx);

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      const inner = r.r - r.thickness / 2;
      const outer = r.r + r.thickness / 2;

      if (dist + CFG.ballRadius < inner || dist - CFG.ballRadius > outer) continue;

      const gapHalf = r.gapSize / 2;
      const inGap = angleInArc(theta, r.gapCenter - gapHalf, r.gapCenter + gapHalf);

      if (inGap) {
        rings.splice(i, 1);
        score++;
        scoreOut.textContent = score;
        addOuterRing();
        recalcTargets();
        break;
      } else {
        let nx = dx / dist;
        let ny = dy / dist;

        // защита от NaN
        if (!isFinite(nx) || !isFinite(ny)) {
          nx = 1; ny = 0;
        }

        const dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;

        addRandomDeflection(isMobile ? 0.35 : 0.28);

        const targetDist = dist > r.r
          ? outer + CFG.ballRadius + 2
          : inner - CFG.ballRadius - 2;

        ball.x = cx + nx * targetDist;
        ball.y = cy + ny * targetDist;

        clampBallPosition(); // после коррекции тоже ограничиваем
        break;
      }
    }

    // финальная защита — если шарик всё равно улетел далеко
    if (Math.hypot(ball.x - cx, ball.y - cy) > Math.max(W, H) * 1.5) {
      ball.x = cx;
      ball.y = cy;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = CFG.bg;
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(W, H) * 0.45);
    grad.addColorStop(0, "rgba(13,110,253,0.10)");
    grad.addColorStop(1, "rgba(13,110,253,0.00)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    rings.forEach((r, i) => {
      const gs = normAngle(r.gapCenter - r.gapSize / 2);
      const ge = normAngle(r.gapCenter + r.gapSize / 2);

      ctx.lineWidth = r.thickness;
      ctx.lineCap = "round";
      ctx.strokeStyle = i % 2 === 0 ? CFG.ringColor : CFG.ringColor2;

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
      ctx.arc(px, py, 3, 0, TAU);
      ctx.fill();
    });

    ctx.fillStyle = CFG.ballColor;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, CFG.ballRadius, 0, TAU);
    ctx.fill();
  }

  let lastT = 0;
  function loop(t) {
    const now = t / 1000;
    const dt = Math.min(0.033, now - lastT || 0.016);
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
    const oldDist = Math.hypot(ball.x - cx, ball.y - cy);
    const oldAngle = Math.atan2(ball.y - cy, ball.x - cx);
    const vx = ball.vx, vy = ball.vy;

    setupCanvas();
    recalcTargets();
    score = oldScore;
    scoreOut.textContent = score;

    // восстанавливаем позицию по относительному расстоянию и углу
    const newMaxR = Math.min(W, H) * 0.44;
    const newR = Math.min(oldDist, newMaxR * 0.8);
    ball.x = cx + Math.cos(oldAngle) * newR;
    ball.y = cy + Math.sin(oldAngle) * newR;
    ball.vx = vx;
    ball.vy = vy;

    clampBallPosition();
  });

  // Блокировка touch
  function preventDefault(e) {
    if (e.touches && (e.touches.length > 1 || e.type === 'touchmove')) {
      e.preventDefault();
    }
  }

  canvas.addEventListener('touchstart', preventDefault, { passive: false });
  canvas.addEventListener('touchmove', preventDefault, { passive: false });
  canvas.addEventListener('touchend', preventDefault, { passive: false });
  canvas.addEventListener('gesturestart', e => e.preventDefault());

  reset();
  requestAnimationFrame(loop);
})();