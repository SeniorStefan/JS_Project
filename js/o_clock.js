/* o_clock.js — логика проекта "Часы" (JS + Canvas + Bootstrap) */
(function(){
  const RU_TIMEZONES = [
    { tz: "Europe/Kaliningrad",  label: "Калининград (UTC+2)" },
    { tz: "Europe/Moscow",       label: "Москва (МСК, UTC+3)" },
    { tz: "Europe/Samara",       label: "Самара (UTC+4)" },
    { tz: "Asia/Yekaterinburg",  label: "Екатеринбург (UTC+5)" },
    { tz: "Asia/Omsk",           label: "Омск (UTC+6)" },
    { tz: "Asia/Novosibirsk",    label: "Новосибирск (UTC+7)" },
    { tz: "Asia/Irkutsk",        label: "Иркутск (UTC+8)" },
    { tz: "Asia/Yakutsk",        label: "Якутск (UTC+9)" },
    { tz: "Asia/Vladivostok",    label: "Владивосток (UTC+10)" },
    { tz: "Asia/Magadan",        label: "Магадан (UTC+11)" },
    { tz: "Asia/Kamchatka",      label: "Камчатка (UTC+12)" }
  ];

  function getGMTOffsetString(date, timeZone){
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const parts = dtf.formatToParts(date);
    const map = {};
    for(const p of parts) map[p.type] = p.value;

    const asUTC = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    );

    const diffMs = asUTC - date.getTime();
    const offsetMin = Math.round(diffMs / 60000);

    const sign = offsetMin >= 0 ? "+" : "-";
    const abs = Math.abs(offsetMin);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");
    return `GMT${sign}${hh}:${mm}`;
  }

  function getZonedParts(date, timeZone){
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = dtf.formatToParts(date);
    const map = {};
    for(const p of parts){
      if(p.type !== "literal") map[p.type] = p.value;
    }
    return {
      hour: Number(map.hour),
      minute: Number(map.minute),
      second: Number(map.second),
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day)
    };
  }

  function formatDigital(date, timeZone){
    const timeFmt = new Intl.DateTimeFormat("ru-RU", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    const dateFmt = new Intl.DateTimeFormat("ru-RU", {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit"
    });

    return {
      time: timeFmt.format(date),
      date: dateFmt.format(date)
    };
  }

  function drawClockFace(ctx, cx, cy, r){
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15,23,42,0.04)";
    ctx.fill();

    ctx.lineWidth = 10;
    ctx.strokeStyle = "rgba(15,23,42,0.12)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();

    for(let i=0; i<60; i++){
      const ang = (i * Math.PI / 30) - Math.PI/2;
      const isHour = (i % 5 === 0);
      const len = isHour ? 14 : 7;
      const w = isHour ? 3 : 1.5;

      const x1 = cx + Math.cos(ang) * (r - 24);
      const y1 = cy + Math.sin(ang) * (r - 24);
      const x2 = cx + Math.cos(ang) * (r - 24 - len);
      const y2 = cy + Math.sin(ang) * (r - 24 - len);

      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.lineWidth = w;
      ctx.strokeStyle = "rgba(15,23,42,0.55)";
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.font = "600 20px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const nums = [
      {n: "12", a: -Math.PI/2},
      {n: "3",  a: 0},
      {n: "6",  a: Math.PI/2},
      {n: "9",  a: Math.PI},
    ];

    for(const it of nums){
      const x = cx + Math.cos(it.a) * (r - 54);
      const y = cy + Math.sin(it.a) * (r - 54);
      ctx.fillText(it.n, x, y);
    }
  }

  function drawHand(ctx, cx, cy, angle, length, width, color, cap = "round"){
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -length);
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  function renderClock(ctx, date, timeZone){
    const w = 320, h = 320;
    ctx.clearRect(0,0,w,h);

    const cx = w/2, cy = h/2;
    const r = 140;

    drawClockFace(ctx, cx, cy, r);

    const p = getZonedParts(date, timeZone);
    const hours = p.hour % 12;
    const minutes = p.minute;
    const seconds = p.second;

    const secA  = (seconds * Math.PI/30) - Math.PI/2;
    const minA  = ((minutes + seconds/60) * Math.PI/30) - Math.PI/2;
    const hourA = ((hours + minutes/60 + seconds/3600) * Math.PI/6) - Math.PI/2;

    drawHand(ctx, cx, cy, hourA, 70, 7, "rgba(15,23,42,0.85)");
    drawHand(ctx, cx, cy, minA, 100, 5, "rgba(15,23,42,0.75)");
    drawHand(ctx, cx, cy, secA, 108, 2, "rgba(220,53,69,0.85)", "round");

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI*2);
    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
  }

  function setupCanvasForDPR(canvas, ctx){
    const dpr = window.devicePixelRatio || 1;
    const cssSize = 320;
    canvas.width = Math.floor(cssSize * dpr);
    canvas.height = Math.floor(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function init(){
    const tzSelect = document.getElementById("tzSelect");
    const tzMeta = document.getElementById("tzMeta");
    const canvas = document.getElementById("clockCanvas");
    const ctx = canvas.getContext("2d");
    const digitalTime = document.getElementById("digitalTime");
    const digitalDate = document.getElementById("digitalDate");

    tzSelect.innerHTML = "";
    RU_TIMEZONES.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.tz;
      opt.textContent = item.label;
      tzSelect.appendChild(opt);
    });
    tzSelect.value = "Asia/Novosibirsk";

    function updateTzMeta(){
      tzMeta.textContent = `Смещение: ${getGMTOffsetString(new Date(), tzSelect.value)}`;
    }

    function tick(){
      const tz = tzSelect.value;
      const now = new Date();
      const d = formatDigital(now, tz);
      digitalTime.textContent = d.time;
      digitalDate.textContent = d.date;
      renderClock(ctx, now, tz);
    }

    setupCanvasForDPR(canvas, ctx);
    updateTzMeta();
    tick();
    let timerId = setInterval(tick, 1000);

    const onChange = () => { updateTzMeta(); tick(); };
    const onResize = () => { setupCanvasForDPR(canvas, ctx); tick(); };

    tzSelect.addEventListener("change", onChange);
    window.addEventListener("resize", onResize);

    // cleanup (на всякий)
    return () => {
      clearInterval(timerId);
      tzSelect.removeEventListener("change", onChange);
      window.removeEventListener("resize", onResize);
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
