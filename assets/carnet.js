// Carnet du profil : onglets + flèches + glissement du doigt. Sur ordinateur, une seule double page visible à la fois.
// Sous 860 px, les pages deviennent des cartes qui défilent horizontalement (CSS) : onglets et flèches font défiler, le défilement met à jour les onglets.
// Sans JavaScript, toutes les pages restent affichées l'une sous l'autre (voir monde.css, html.js).
(() => {
  const c = document.querySelector('[data-carnet]');
  if (!c) return;
  const tabs = [...c.querySelectorAll('[role=tab]')];
  const pages = [...c.querySelectorAll('.spread')];
  const count = c.querySelector('.c-count');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const book = c.querySelector('.c-book');
  const mq = matchMedia('(max-width:860px)');
  let cur = 0;

  // Met l'onglet, le compteur et la page active à jour, sans animation
  function mark(i) {
    if (i === cur) return;
    pages[cur].classList.remove('is-on', 'turn', 'turn-back');
    tabs[cur].setAttribute('aria-selected', 'false'); tabs[cur].tabIndex = -1;
    cur = i; pages[cur].classList.add('is-on');
    tabs[cur].setAttribute('aria-selected', 'true'); tabs[cur].tabIndex = 0;
    const bar = tabs[cur].parentElement, t = tabs[cur];
    bar.scrollTo({ left: t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    count.textContent = `${cur + 1} / ${pages.length}`;
  }

  function go(i, dir) {
    i = (i + pages.length) % pages.length;
    if (mq.matches) { book.scrollTo({ left: pages[i].offsetLeft - pages[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' }); mark(i); return; }
    if (i === cur) return;
    const back = dir ? dir < 0 : i < cur;
    pages[cur].classList.remove('is-on', 'turn', 'turn-back');
    tabs[cur].setAttribute('aria-selected', 'false'); tabs[cur].tabIndex = -1;
    cur = i;
    const p = pages[cur];
    p.classList.add('is-on');
    if (!reduce) { void p.offsetWidth; p.classList.add(back ? 'turn-back' : 'turn'); }
    tabs[cur].setAttribute('aria-selected', 'true'); tabs[cur].tabIndex = 0;
    const bar = tabs[cur].parentElement, t = tabs[cur]; // seule la rangée d'onglets défile, jamais la page
    bar.scrollTo({ left: t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
    count.textContent = `${cur + 1} / ${pages.length}`;
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => go(i));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault(); go(cur + (e.key === 'ArrowRight' ? 1 : -1)); tabs[cur].focus();
      }
    });
  });
  c.querySelector('.c-prev').addEventListener('click', () => go(cur - 1, -1));
  c.querySelector('.c-next').addEventListener('click', () => go(cur + 1, 1));

  // Cartes (téléphone) : la carte la plus visible devient l'onglet actif
  let raf = 0;
  book.addEventListener('scroll', () => {
    if (!mq.matches || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const step = pages[1].offsetLeft - pages[0].offsetLeft;
      mark(Math.max(0, Math.min(pages.length - 1, Math.round(book.scrollLeft / step))));
    });
  }, { passive: true });

  // Glisser du doigt sur le carnet (tablette tactile au-delà de 860 px)
  let x0 = null, y0 = null;
  book.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  book.addEventListener('touchend', e => {
    if (x0 === null || mq.matches) { x0 = null; return; }
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
})();
