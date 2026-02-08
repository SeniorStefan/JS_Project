/*
  common-nav.js
  - общий "пейджер" со стрелками и точками
  - работает на отдельных HTML-страницах
  Требуется:
    window.PORTFOLIO_PAGES = [{href:'clock.html', title:'Часы'}, ...]
    window.CURRENT_PAGE = 'clock.html'
  В разметке должны быть элементы:
    #btnPrev, #btnNext, #pagerTitle, #pagerDots
*/
(function(){
  const pages = Array.isArray(window.PORTFOLIO_PAGES) ? window.PORTFOLIO_PAGES : [];
  const current = String(window.CURRENT_PAGE || "").trim();

  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const pagerTitle = document.getElementById("pagerTitle");
  const pagerDots = document.getElementById("pagerDots");

  if(!pages.length || !current || !btnPrev || !btnNext || !pagerTitle || !pagerDots){
    return;
  }

  const idx = Math.max(0, pages.findIndex(p => p && p.href === current));
  const safeIdx = (idx < 0) ? 0 : idx;

  function go(i){
    const p = pages[i];
    if(p && p.href){
      window.location.href = p.href;
    }
  }

  function render(){
    pagerTitle.textContent = `${safeIdx + 1}/${pages.length} — ${pages[safeIdx].title || pages[safeIdx].href}`;
    btnPrev.disabled = safeIdx === 0;
    btnNext.disabled = safeIdx === pages.length - 1;

    pagerDots.innerHTML = "";
    pages.forEach((p, i) => {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "pager-dot" + (i === safeIdx ? " active" : "");
      d.title = `Открыть: ${p.title || p.href}`;
      d.addEventListener("click", () => go(i));
      pagerDots.appendChild(d);
    });
  }

  btnPrev.addEventListener("click", () => {
    if(safeIdx > 0) go(safeIdx - 1);
  });
  btnNext.addEventListener("click", () => {
    if(safeIdx < pages.length - 1) go(safeIdx + 1);
  });

  window.addEventListener("keydown", (e) => {
    if(e.key === "ArrowLeft" && safeIdx > 0) go(safeIdx - 1);
    if(e.key === "ArrowRight" && safeIdx < pages.length - 1) go(safeIdx + 1);
  });

  render();
})();
