// Formulaire de contact en 3 étapes, envoyé par Web3Forms (api.web3forms.com) sans ouvrir de logiciel de messagerie.
// Un seul email par demande : il part à la fin de l'étape 2 (bouton « Valider » ou « Passer »).
// Si la personne quitte la page après l'étape 1, ou reste 10 minutes sans terminer, l'email part quand même
// avec le prénom et l'email : Tom ne perd pas le contact. Cas rare : si elle revient terminer après cet envoi,
// un second email complète le premier.
// Envois en FormData (pas de requête préalable du navigateur), ce qui permet aussi l'envoi au moment de quitter la page.
// La clé (data-key) est publique par nature. En cas d'échec réseau : un lien email prêt à envoyer.
(() => {
  const form = document.querySelector('[data-lf]');
  if (!form) return;
  const key = form.dataset.key, mail = form.dataset.mail;
  const steps = [...form.querySelectorAll('.lf-step')];
  const dots = [...form.querySelectorAll('.lf-steps li')];
  const status = form.querySelector('.rdv-status');
  const val = n => {
    const checked = form.querySelector(`[name="${n}"]:checked`);
    if (checked) return (checked.value || '').trim();
    const el = form.elements[n];
    return el && el.type !== 'radio' && !(el instanceof RadioNodeList) ? (el.value || '').trim() : '';
  };

  // « Rappelez-moi » fait apparaître le champ du numéro (alors obligatoire)
  const tel = form.querySelector('.lf-tel'), telInput = form.elements.telephone;
  form.querySelectorAll('[name="canal"]').forEach(r => r.addEventListener('change', () => {
    const call = val('canal') === 'Par téléphone';
    tel.hidden = !call; telInput.required = call;
    if (call) telInput.focus();
  }));

  // Un lien « ?sujet=produit#contact » arrive avec le bon besoin déjà choisi
  const SUJETS = { ia: 'Intégrer l’IA', audit: 'Intégrer l’IA', produit: 'Construire un produit', former: 'Former une équipe' };
  const pre = SUJETS[new URLSearchParams(location.search).get('sujet')];
  if (pre) form.querySelectorAll('[name="besoin"]').forEach(r => { r.checked = r.value === pre; });

  let step = 1;
  const show = k => {
    step = k;
    steps.forEach(s => { s.hidden = +s.dataset.step !== k; });
    dots.forEach((li, i) => { li.classList.toggle('on', i === k - 1); li.classList.toggle('done', i < k - 1); });
    status.className = 'rdv-status'; status.textContent = '';
    const head = steps[k - 1].querySelector('.lf-q');
    if (head) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
    form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  // Message d'état construit avec textContent : rien de ce qui est saisi n'est interprété comme du HTML
  const say = (cls, parts) => {
    status.className = 'rdv-status ' + cls; status.replaceChildren();
    parts.forEach(p => {
      if (typeof p === 'string') status.append(p);
      else { const el = document.createElement(p.tag); el.textContent = p.text; if (p.href) el.href = p.href; status.append(el); }
    });
    status.focus();
  };

  // Le contenu de l'email, selon ce qui a été rempli
  const message = (done, skipped) => {
    const call = val('canal') === 'Par téléphone';
    const fields = { Prénom: val('prenom'), Email: val('email') };
    if (done) {
      fields.Sujet = val('besoin') || '—';
      fields['Recontacter'] = call ? `Par téléphone : ${val('telephone')}` : 'Par email';
    } else fields.Note = skipped ? 'La personne a passé les deux questions.' : 'La personne n’a pas terminé le formulaire : seuls le prénom et l’email sont connus.';
    const subject = done
      ? `${call ? 'À rappeler' : 'Nouveau contact'} · ${val('prenom')} · ${val('besoin') || 'sujet à préciser'}`
      : `Nouveau contact · ${val('prenom')}${skipped ? '' : ' (formulaire non terminé)'}`;
    return { subject, fields };
  };

  const formData = ({ subject, fields }) => {
    const fd = new FormData();
    fd.append('access_key', key); fd.append('subject', subject); fd.append('from_name', 'Site tomberthet.fr'); fd.append('replyto', val('email'));
    Object.entries(fields).forEach(([k, x]) => fd.append(k, x));
    fd.append('Page', location.pathname.split('/').pop() || 'accueil');
    return fd;
  };

  let sent = false, partial = false, timer = 0;
  const robot = () => form.elements.botcheck && form.elements.botcheck.checked;

  // Envoi normal (fin de l'étape 2)
  const send = async msg => {
    if (robot()) return true; // robot : rien n'est envoyé
    const stop = new AbortController(), t = setTimeout(() => stop.abort(), 15000);
    try {
      const r = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData(msg), signal: stop.signal, headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => ({}));
      return r.ok && String(j.success) === 'true';
    } catch { return false; } finally { clearTimeout(t); }
  };

  // Envoi de secours (départ de la page ou 10 minutes sans terminer), une seule fois
  const rescue = () => {
    if (sent || step !== 2 || robot()) return;
    sent = partial = true; clearTimeout(timer);
    fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData(message(false)), keepalive: true }).catch(() => {});
  };
  addEventListener('pagehide', rescue);

  const fail = msg => {
    const body = Object.entries(msg.fields).map(([k, x]) => `${k} : ${x}`).join('\n').slice(0, 800);
    say('err', ['L’envoi n’a pas fonctionné. ', { tag: 'a', text: 'Envoyer la demande par email', href: `mailto:${mail}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(body)}` }, `, ou écrire directement à ${mail}.`]);
  };

  const finish = async (btn, done) => {
    const msg = message(done, !done);
    if (sent && !partial) { show(3); return; } // déjà envoyé : rien à renvoyer
    if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Envoi…'; }
    const ok = await send(msg);
    if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Valider'; }
    if (!ok) return fail(msg);
    sent = true; partial = false; clearTimeout(timer);
    const call = done && val('canal') === 'Par téléphone';
    form.querySelector('[data-next]').textContent = call
      ? 'Je vous rappelle sous 24 h au numéro indiqué. D’ici là, connectons-nous sur LinkedIn.'
      : 'Je vous écris sous 24 h pour fixer un premier échange. D’ici là, connectons-nous sur LinkedIn.';
    show(3);
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (step === 1) {
      const need = ['prenom', 'email'].map(n => form.elements[n]);
      if (!need.every(i => i.reportValidity())) return;
      form.querySelector('[data-hello]').textContent = `Plus que deux questions, ${val('prenom')}.`;
      form.querySelector('[data-thanks]').textContent = `Merci ${val('prenom')}, c’est envoyé.`;
      timer = setTimeout(rescue, 10 * 60 * 1000);
      show(2);
    } else if (step === 2) {
      if (val('canal') === 'Par téléphone' && !telInput.reportValidity()) return;
      finish(steps[1].querySelector('.lf-go'), true);
    }
  });

  form.querySelector('[data-skip]').addEventListener('click', () => finish(null, false));
})();
