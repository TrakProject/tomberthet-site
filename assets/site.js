// tomberthet.fr : comportements communs. Chaque bloc ne s'active que si son élément est présent.
// data-r : apparition · data-count : compteur
// #stage : cartes du premier écran · .pile : pastilles déplaçables · .copy : copier l'email · #steps : méthode qui s'allume au défilement
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Barre du haut : fond flouté dès qu'on défile
  const top = $('.top');
  const onTop = () => top && top.classList.toggle('on', scrollY > 8);
  addEventListener('scroll', onTop, { passive: true }); onTop();

  // Menu sur téléphone : le bouton ouvre la liste des pages ; Échap ou un clic ailleurs la ferme
  const menuBtn = $('.menu-btn');
  if (top && menuBtn) {
    const setMenu = open => { top.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu'); };
    menuBtn.addEventListener('click', e => { e.stopPropagation(); setMenu(!top.classList.contains('open')); });
    document.addEventListener('click', e => { if (!top.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && top.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
    $$('nav a', top).forEach(a => a.addEventListener('click', () => setMenu(false)));
  }

  // Compteurs (12 000, 480…) : démarrent quand la carte apparaît
  const fmt = n => n.toLocaleString('fr-FR').replace(/\s/g, ' ');
  const count = el => {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1500;
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = fmt(Math.round(end * (1 - Math.pow(2, -10 * p))));
      if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(end);
    };
    requestAnimationFrame(tick);
  };

  // Apparitions au défilement
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (!reduce) $$('[data-count]', e.target).forEach(count);
    io.unobserve(e.target);
  }), { threshold: .15, rootMargin: '0px 0px -5% 0px' });
  $$('[data-r]').forEach(el => io.observe(el));

  // Copier l'adresse email
  $$('.copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
    b.classList.add('done'); b.setAttribute('aria-label', 'Adresse copiée');
    setTimeout(() => { b.classList.remove('done'); b.setAttribute('aria-label', 'Copier l’adresse'); }, 1800);
  }));

  // Premier écran : cartes et notifications suivent légèrement la souris (ordinateur seulement)
  const stage = $('#stage');
  if (stage && !reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const hero = stage.closest('section');
    // Variables posées sur la section : le portrait, les cartes et les notifications du décor en profitent
    hero.addEventListener('pointermove', e => {
      hero.style.setProperty('--px', (e.clientX / innerWidth - .5).toFixed(3));
      hero.style.setProperty('--py', (e.clientY / innerHeight - .5).toFixed(3));
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { hero.style.setProperty('--px', 0); hero.style.setProperty('--py', 0); });
  }

  // Pastilles des métiers : on peut les attraper et les déplacer dans leur carte
  $$('.pile').forEach(pile => {
    const box = pile.closest('.c');
    $$('.chip', pile).forEach(ch => {
      let sx, sy, ox = 0, oy = 0, lim;
      ch.addEventListener('pointerdown', e => {
        ch.setPointerCapture(e.pointerId); ch.classList.add('drag');
        sx = e.clientX - ox; sy = e.clientY - oy;
        const b = box.getBoundingClientRect(), r = ch.getBoundingClientRect();
        lim = { l: b.left - r.left + ox + 8, r: b.right - r.right + ox - 8, t: b.top - r.top + oy + 8, b: b.bottom - r.bottom + oy - 8 };
      });
      ch.addEventListener('pointermove', e => {
        if (!ch.hasPointerCapture(e.pointerId)) return;
        ox = clamp(e.clientX - sx, lim.l, lim.r); oy = clamp(e.clientY - sy, lim.t, lim.b);
        ch.style.setProperty('--x', ox + 'px'); ch.style.setProperty('--y', oy + 'px');
      });
      const end = () => ch.classList.remove('drag');
      ch.addEventListener('pointerup', end); ch.addEventListener('pointercancel', end);
    });
  });

  // Méthode : la barre avance au défilement et allume chaque étape
  const steps = $('#steps');
  if (steps) {
    const bar = $('.bar', steps), cards = $$('.step', steps);
    const run = () => {
      const r = steps.getBoundingClientRect(), h = innerHeight;
      const p = reduce ? 1 : clamp((h * .82 - r.top) / (r.height * .9));
      if (bar) bar.style.setProperty('--p', p);
      cards.forEach((c, i) => c.classList.toggle('lit', p >= (i + .5) / cards.length));
    };
    addEventListener('scroll', () => requestAnimationFrame(run), { passive: true }); run();
  }
})();
