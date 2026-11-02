// Accueil « monde » : animations propres à la page d'accueil. Sans dépendance.
// .say : texte qui s'allume mot à mot au défilement · #worlds : galerie horizontale épinglée (ordinateur)
// [data-depth] : couches en profondeur · .ciel : les îles suivent la souris · #guide : MAX parle quand on clique
// #road : la frise se remplit et MAX court dessus · .tools-row : défilé des outils · dialog : bande-annonce
// video[data-auto] : lecture seulement quand la vidéo est visible
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const jobs = [];
  let queued = false;
  const frame = () => { queued = false; jobs.forEach(f => f()); };
  const tick = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick);

  // 1. Texte mot à mot : chaque mot passe de gris à noir quand on avance dans le bloc
  $$('.say').forEach(box => {
    const words = [];
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'w'; w.textContent = part; words.push(w); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(box);
    if (reduce) { words.forEach(w => w.classList.add('on')); return; }
    const zone = box.closest('.say-zone') || box;
    jobs.push(() => {
      const r = zone.getBoundingClientRect(), h = innerHeight;
      const p = clamp((h * .15 - r.top) / (r.height - h * 1.05));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  });

  // 2. Galerie horizontale : la section est haute, la piste reste collée et glisse vers la gauche
  const worlds = document.getElementById('worlds');
  if (worlds) {
    const track = worlds.querySelector('.track');
    const wide = matchMedia('(min-width:900px)');
    const size = () => {
      if (!wide.matches) { worlds.style.height = ''; track.style.transform = ''; return; }
      // 0,75 : la piste avance plus vite que le défilement, la galerie reste courte
      worlds.style.height = ((track.scrollWidth - innerWidth) * .75 + innerHeight) + 'px';
    };
    size(); addEventListener('resize', size); wide.addEventListener('change', size);
    addEventListener('load', size);
    // Au clavier : le panneau qui reçoit le focus est amené à l'écran
    const pin = worlds.querySelector('.pin');
    track.addEventListener('focusin', e => {
      const panel = e.target.closest('.world');
      if (!panel || !wide.matches || !e.target.matches(':focus-visible')) return;
      pin.scrollLeft = 0;
      const max = track.scrollWidth - innerWidth;
      const top = worlds.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + clamp((panel.offsetLeft - innerWidth * .12) / max) * (worlds.offsetHeight - innerHeight) + 2, behavior: 'auto' });
    });
    // Un lien vers #monde-x fait défiler jusqu'au bon panneau de la piste
    $$('a[href^="#monde-"]').forEach(a => a.addEventListener('click', e => {
      const panel = document.querySelector(a.getAttribute('href'));
      if (!panel || !wide.matches) return;
      e.preventDefault();
      const max = track.scrollWidth - innerWidth;
      const top = worlds.getBoundingClientRect().top + scrollY;
      const x = clamp((panel.offsetLeft - innerWidth * .12) / max);
      scrollTo({ top: top + x * (worlds.offsetHeight - innerHeight) + 2, behavior: reduce ? 'auto' : 'smooth' });
    }));
    jobs.push(() => {
      if (!wide.matches) return;
      const r = worlds.getBoundingClientRect();
      const max = track.scrollWidth - innerWidth;
      const p = clamp(-r.top / (r.height - innerHeight));
      track.style.transform = `translate3d(${-p * max}px,0,0)`;
      worlds.style.setProperty('--p', p.toFixed(4));
    });
  }

  // 3. Couches en profondeur : plus data-depth est grand, plus l'élément glisse
  if (!reduce) {
    const layers = $$('[data-depth]');
    jobs.push(() => layers.forEach(el => {
      const host = el.closest('section') || el.parentElement;
      const r = host.getBoundingClientRect();
      const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.setProperty('--dy', (c * +el.dataset.depth * -120).toFixed(1) + 'px');
    }));
  }


  // 4. Ciel : les îles suivent la souris (ordinateur)
  const ciel = document.querySelector('.ciel');
  if (ciel && fine && !reduce) {
    ciel.addEventListener('pointermove', e => {
      ciel.style.setProperty('--px', (e.clientX / innerWidth - .5).toFixed(3));
      ciel.style.setProperty('--py', (e.clientY / innerHeight - .5).toFixed(3));
    }, { passive: true });
    ciel.addEventListener('pointerleave', () => { ciel.style.setProperty('--px', 0); ciel.style.setProperty('--py', 0); });
  }

  // MAX, le guide : une bulle à l'arrivée, une nouvelle phrase à chaque clic
  const guide = document.getElementById('guide');
  if (guide) {
    const bubble = guide.querySelector('.bubble');
    const LINES = [
      'Salut, moi c’est MAX. Je te fais visiter ?',
      'Je suis la mascotte de TRAK, l’app de Tom.',
      'Les îles autour de nous ? Ce sont ses projets. Clique dessus !',
      'Plus de 12 000 heures d’IA depuis 2022. Moi, j’arrête de compter.',
      'Son profil est juste en dessous. Descends !',
    ];
    let k = 0;
    setTimeout(() => bubble.classList.add('on'), reduce ? 0 : 1100);
    guide.querySelector('.max-btn').addEventListener('click', () => {
      k = (k + 1) % LINES.length;
      bubble.classList.remove('on');
      setTimeout(() => { bubble.textContent = LINES[k]; bubble.classList.add('on'); }, reduce ? 0 : 160);
      guide.classList.remove('hop'); void guide.offsetWidth; guide.classList.add('hop');
    });
  }

  // Parcours : la frise se remplit, MAX court avec elle
  const road = document.getElementById('road');
  if (road) jobs.push(() => {
    const r = road.getBoundingClientRect();
    road.style.setProperty('--p', reduce ? 1 : clamp((innerHeight * .55 - r.top) / (r.height - 60)).toFixed(4));
  });

  // Outils : on double la rangée pour un défilé sans fin
  $$('.tools-row').forEach(row => { if (!reduce) row.innerHTML += row.innerHTML.replace(/<span>/g, '<span aria-hidden="true">'); });

  // Bande-annonce dans une fenêtre
  $$('[data-open]').forEach(b => b.addEventListener('click', () => {
    const d = document.getElementById(b.dataset.open); if (!d) return;
    const v = d.querySelector('video');
    if (typeof d.showModal !== 'function') { if (v) window.open(v.querySelector('source').src); return; }
    d.showModal(); if (v) v.play().catch(() => {});
  }));
  $$('dialog.player').forEach(d => {
    const stop = () => { const v = d.querySelector('video'); if (v) v.pause(); };
    d.addEventListener('close', stop);
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.querySelector('[data-close]')?.addEventListener('click', () => d.close());
  });

  // 5. Vidéos d'ambiance : lecture quand elles sont visibles, pause sinon
  const vids = $$('video[data-auto]');
  if (vids.length && !reduce) {
    const vo = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { const p = e.target.play(); if (p) p.catch(() => {}); } else e.target.pause();
    }), { threshold: .2 });
    vids.forEach(v => vo.observe(v));
  }

  // 6. Bande-annonce : le bouton lance la vidéo avec le son
  $$('[data-play]').forEach(btn => btn.addEventListener('click', () => {
    const v = document.getElementById(btn.dataset.play);
    if (!v) return;
    v.muted = false; v.controls = true; v.currentTime = 0; v.play().catch(() => {});
    btn.closest('.player')?.classList.add('playing');
  }));

  // Lien direct (#contact…) : la galerie change la hauteur de la page, on recale après chargement
  if (location.hash) addEventListener('load', () => {
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) setTimeout(() => scrollTo({ top: t.getBoundingClientRect().top + scrollY, behavior: 'instant' }), 60);
  });

  tick();
})();
