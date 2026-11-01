// tomberthet.fr : comportements communs. Chaque bloc ne s'active que si son élément est présent.
// data-r : apparition · data-count : compteur · #clock : heure de Toulouse · #flow : usages par métier
// .pile : pastilles déplaçables · .copy : copier l'email · #steps : méthode qui s'allume au défilement
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Barre du haut : fond flouté dès qu'on défile
  const top = $('.top');
  const onTop = () => top && top.classList.toggle('on', scrollY > 8);
  addEventListener('scroll', onTop, { passive: true }); onTop();

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

  // Heure de Toulouse, mise à jour chaque seconde
  const clock = $('#clock');
  if (clock) {
    const f = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' });
    const set = () => { const [h, m] = f.format(new Date()).split(':'); clock.innerHTML = `${h}<span class="sep">:</span>${m}`; };
    set(); setInterval(set, 1000);
  }

  // Copier l'adresse email
  $$('.copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { return; }
    b.classList.add('done'); b.setAttribute('aria-label', 'Adresse copiée');
    setTimeout(() => { b.classList.remove('done'); b.setAttribute('aria-label', 'Copier l’adresse'); }, 1800);
  }));

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

  // Usages par métier : choisir un métier rejoue les quatre étapes
  const flow = $('#flow');
  if (flow) {
    const FLOWS = {
      'Support client': ['Demande client', 'L’agent lit votre base', 'Réponse préparée', 'Validée en un clic'],
      'Ventes': ['Appel commercial', 'Compte rendu automatique', 'Relance rédigée', 'CRM à jour'],
      'Marketing': ['Une idée', 'Article, posts, visuels', 'Relecture', 'Publication'],
      'Ressources humaines': ['Candidatures', 'Tri selon vos critères', 'Réponses préparées', 'Entretiens planifiés'],
      'Juridique': ['Contrat reçu', 'Comparé à vos clauses', 'Points à risque signalés', 'Validé par le juriste'],
      'Finance': ['Factures reçues', 'Lues et classées', 'Écarts signalés', 'Export comptable'],
      'Développement': ['Ticket', 'Code proposé par l’agent', 'Tests et relecture', 'Mise en ligne'],
      'Design': ['Brief', 'Pistes générées', 'Choix et retouches', 'Maquette prête'],
      'Image et vidéo': ['Script', 'Images et voix', 'Montage', 'Vidéo livrée'],
      'Direction': ['Données éparpillées', 'Synthèse automatique', 'Points clés', 'Décision'],
    };
    const names = Object.keys(FLOWS), btns = $$('#jobs button'), items = $$('li', flow), card = flow.closest('.c');
    let cur = 0, step = -1, hold = false;
    const seen = () => { const r = card.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };
    const show = i => {
      cur = i; step = -1;
      btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i));
      items.forEach((li, k) => { $('span', li).textContent = FLOWS[names[i]][k]; li.classList.toggle('on', reduce); });
      flow.style.setProperty('--p', reduce ? 1 : 0);
      flow.classList.remove('swap'); void flow.offsetWidth; flow.classList.add('swap');
    };
    btns.forEach((b, k) => b.addEventListener('click', () => { show(k); hold = true; }));
    card.addEventListener('pointerleave', () => { hold = false; });
    show(0);
    if (!reduce) setInterval(() => {
      if (document.hidden || !seen()) return;
      step++;
      if (step > 5) { if (hold) { step = 3; return; } show((cur + 1) % names.length); return; }
      items.forEach((li, k) => li.classList.toggle('on', k <= step));
      flow.style.setProperty('--p', clamp(step / 3));
    }, 750);
  }

  // Méthode : la barre avance au défilement et allume chaque étape
  const steps = $('#steps');
  if (steps) {
    const bar = $('.bar', steps), cards = $$('.step', steps);
    const run = () => {
      const r = steps.getBoundingClientRect(), h = innerHeight;
      const p = reduce ? 1 : clamp((h * .82 - r.top) / (r.height * .9));
      if (bar) bar.style.setProperty('--p', p);
      cards.forEach((c, i) => c.classList.toggle('lit', p >= (i + .5) / 4));
    };
    addEventListener('scroll', () => requestAnimationFrame(run), { passive: true }); run();
  }
})();
