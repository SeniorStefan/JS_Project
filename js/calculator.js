/*
  calculator.js — логарифмические уравнения + график (Canvas)
  Решаем:
    log_b(a*x + d) = m*x + n
  Находим корни на [xmin, xmax] (скан + бисекция) и строим графики y1 и y2.
*/
(function(){
  function safeLogBase(val, base){
    if(!(base > 0) || base === 1) return NaN;
    if(!(val > 0)) return NaN;
    return Math.log(val) / Math.log(base);
  }
  function evalY1(x, a, d, b){ return safeLogBase(a * x + d, b); }
  function evalY2(x, m, n){ return m * x + n; }
  function F(x, a, d, b, m, n){
    const y1 = evalY1(x, a, d, b);
    const y2 = evalY2(x, m, n);
    if(!Number.isFinite(y1) || !Number.isFinite(y2)) return NaN;
    return y1 - y2;
  }

  function setupPlotCanvas(canvas, ctx){
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.min(760, Math.floor(window.innerWidth * 0.88));
    const cssH = 380;

    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: cssW, h: cssH };
  }

  function drawAxes(ctx, mapX, mapY, w, h){
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(15,23,42,0.25)";

    const y0 = mapY(0);
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(w, y0);
    ctx.stroke();

    const x0 = mapX(0);
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0, h);
    ctx.stroke();

    ctx.strokeStyle = "rgba(15,23,42,0.15)";
    ctx.strokeRect(0.5, 0.5, w-1, h-1);
  }

  function drawCurve(ctx, fn, xMin, xMax, mapX, mapY, w, h){
    const steps = 600;
    const dx = (xMax - xMin) / steps;

    ctx.beginPath();
    let started = false;

    for(let i=0; i<=steps; i++){
      const x = xMin + dx * i;
      const y = fn(x);
      if(!Number.isFinite(y)){
        started = false;
        continue;
      }

      const px = mapX(x);
      const py = mapY(y);

      if(py < -2000 || py > h + 2000){
        started = false;
        continue;
      }

      if(!started){
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  }

  function findRoots(xMin, xMax, a, d, b, m, n){
    const roots = [];
    const scanSteps = 400;
    const dx = (xMax - xMin) / scanSteps;

    function bisect(l, r){
      let fl = F(l, a, d, b, m, n);
      let fr = F(r, a, d, b, m, n);
      if(!Number.isFinite(fl) || !Number.isFinite(fr)) return null;
      if(fl === 0) return l;
      if(fr === 0) return r;
      if(fl * fr > 0) return null;

      for(let it=0; it<60; it++){
        const mid = (l + r) / 2;
        const fm = F(mid, a, d, b, m, n);
        if(!Number.isFinite(fm)){
          r = mid;
          continue;
        }
        if(Math.abs(fm) < 1e-10) return mid;
        if(fl * fm <= 0){
          r = mid; fr = fm;
        } else {
          l = mid; fl = fm;
        }
      }
      return (l + r) / 2;
    }

    let prevX = xMin;
    let prevF = F(prevX, a, d, b, m, n);

    for(let i=1; i<=scanSteps; i++){
      const x = xMin + dx * i;
      const fx = F(x, a, d, b, m, n);

      if(Number.isFinite(prevF) && Number.isFinite(fx)){
        if(prevF === 0){
          roots.push(prevX);
        } else if(prevF * fx < 0){
          const r = bisect(prevX, x);
          if(r !== null) roots.push(r);
        }
      }

      prevX = x;
      prevF = fx;
    }

    roots.sort((p,q)=>p-q);
    const merged = [];
    for(const r of roots){
      if(merged.length === 0 || Math.abs(r - merged[merged.length - 1]) > 1e-4){
        merged.push(r);
      }
    }
    return merged;
  }

  function init(){
    const inpB = document.getElementById("inpB");
    const inpA = document.getElementById("inpA");
    const inpD = document.getElementById("inpD");
    const inpM = document.getElementById("inpM");
    const inpN = document.getElementById("inpN");
    const inpXmin = document.getElementById("inpXmin");
    const inpXmax = document.getElementById("inpXmax");
    const btnSolve = document.getElementById("btnSolve");
    const solveOut = document.getElementById("solveOut");

    const canvas = document.getElementById("plotCanvas");
    const ctx = canvas.getContext("2d");

    function solveAndPlot(){
      const b = Number(inpB.value);
      const a = Number(inpA.value);
      const d = Number(inpD.value);
      const m = Number(inpM.value);
      const n = Number(inpN.value);
      let xMin = Number(inpXmin.value);
      let xMax = Number(inpXmax.value);

      if(!(xMax > xMin)){
        [xMin, xMax] = [xMax, xMin];
        inpXmin.value = xMin;
        inpXmax.value = xMax;
      }

      if(!(b > 0) || b === 1){
        solveOut.innerHTML = `<span class="text-danger fw-semibold">Ошибка:</span> основание b должно быть > 0 и не равно 1.`;
        return;
      }

      const { w, h } = setupPlotCanvas(canvas, ctx);

      // оценка y-диапазона
      let yMin = Infinity, yMax = -Infinity;
      const probe = 500;
      for(let i=0; i<=probe; i++){
        const x = xMin + (xMax - xMin) * (i/probe);
        const y1 = evalY1(x, a, d, b);
        const y2 = evalY2(x, m, n);
        if(Number.isFinite(y1)){ yMin = Math.min(yMin, y1); yMax = Math.max(yMax, y1); }
        if(Number.isFinite(y2)){ yMin = Math.min(yMin, y2); yMax = Math.max(yMax, y2); }
      }
      if(!Number.isFinite(yMin) || !Number.isFinite(yMax)){ yMin = -5; yMax = 5; }
      const pad = (yMax - yMin) * 0.12 + 0.5;
      yMin -= pad; yMax += pad;

      const mapX = (x) => (x - xMin) / (xMax - xMin) * w;
      const mapY = (y) => h - (y - yMin) / (yMax - yMin) * h;

      // фон
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillRect(0,0,w,h);

      drawAxes(ctx, mapX, mapY, w, h);

      // y2
      ctx.strokeStyle = "rgba(15,23,42,0.85)";
      ctx.lineWidth = 2.5;
      drawCurve(ctx, (x)=>evalY2(x, m, n), xMin, xMax, mapX, mapY, w, h);

      // y1
      ctx.strokeStyle = "rgba(220,53,69,0.85)";
      ctx.lineWidth = 2.5;
      drawCurve(ctx, (x)=>evalY1(x, a, d, b), xMin, xMax, mapX, mapY, w, h);

      const roots = findRoots(xMin, xMax, a, d, b, m, n);

      ctx.fillStyle = "rgba(13,110,253,0.95)";
      for(const r of roots){
        const y = evalY2(r, m, n);
        if(!Number.isFinite(y)) continue;
        const px = mapX(r);
        const py = mapY(y);
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI*2);
        ctx.fill();
      }

      const domainNote = (a === 0)
        ? `Область определения: d > 0 (иначе логарифм не существует).`
        : `Область определения: a·x + d > 0.`;

      if(roots.length === 0){
        solveOut.innerHTML = `
          <div><span class="fw-semibold">Корней на отрезке</span> [${xMin}; ${xMax}] <span class="fw-semibold">не найдено</span>.</div>
          <div class="mt-1">${domainNote}</div>
        `;
      } else {
        const list = roots.map(v => v.toFixed(6)).join(", ");
        solveOut.innerHTML = `
          <div><span class="fw-semibold">Найдено корней:</span> ${roots.length}</div>
          <div class="mt-1"><span class="fw-semibold">x ≈</span> ${list}</div>
          <div class="mt-1">${domainNote}</div>
        `;
      }
    }

    btnSolve.addEventListener("click", solveAndPlot);
    window.addEventListener("resize", solveAndPlot);

    solveAndPlot();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
