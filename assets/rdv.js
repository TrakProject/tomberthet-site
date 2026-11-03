// Formulaire de rendez-vous en 3 étapes, envoyé par Web3Forms (api.web3forms.com) sans ouvrir de logiciel de messagerie.
// Étape 1 : prénom et email. Envoyé tout de suite : Tom a le contact même si la personne s'arrête là.
// Étape 2 : le sujet et la façon d'être recontacté (email, ou rappel avec le numéro), dans un second email. On peut la passer.
// Étape 3 : merci, et invitation à se connecter sur LinkedIn.
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
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

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

  const send = async (subject, fields) => {
    if (form.elements.botcheck && form.elements.botcheck.checked) return true; // robot : rien n'est envoyé
    const payload = { access_key: key, subject, from_name: 'Site tomberthet.fr', replyto: val('email'), ...fields, Page: location.pathname.split('/').pop() || 'accueil' };
    const stop = new AbortController(), timer = setTimeout(() => stop.abort(), 15000);
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', signal: stop.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      return r.ok && String(j.success) === 'true';
    } catch { return false; } finally { clearTimeout(timer); }
  };

  const fail = fields => {
    const body = Object.entries(fields).map(([k, x]) => `${k} : ${x}`).join('\n').slice(0, 800);
    say('err', ['L’envoi n’a pas fonctionné. ', { tag: 'a', text: 'Envoyer la demande par email', href: `mailto:${mail}?subject=${encodeURIComponent('Rendez-vous depuis le site')}&body=${encodeURIComponent(body)}` }, `, ou écrire directement à ${mail}.`]);
  };

  const busy = (btn, on, label) => { btn.disabled = on; btn.querySelector('span').textContent = on ? 'Envoi…' : label; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = steps[step - 1].querySelector('.lf-go');
    if (step === 1) {
      const need = ['prenom', 'email'].map(n => form.elements[n]);
      if (!need.every(i => i.reportValidity())) return;
      const fields = { Prénom: val('prenom'), Email: val('email'), Étape: '1 sur 2 · coordonnées' };
      busy(btn, true, 'Être recontacté');
      const ok = await send(`Nouveau contact · ${val('prenom')}`, fields);
      busy(btn, false, 'Être recontacté');
      if (!ok) return fail(fields);
      form.querySelector('[data-hello]').textContent = `C’est noté, ${val('prenom')} : je vous recontacte.`;
      form.querySelector('[data-thanks]').textContent = `Merci ${val('prenom')}, c’est envoyé.`;
      show(2);
    } else if (step === 2) {
      const call = val('canal') === 'Par téléphone';
      if (call && !telInput.reportValidity()) return;
      const fields = {
        Prénom: val('prenom'), Email: val('email'), Sujet: val('besoin') || '—',
        'Recontacter': call ? `Par téléphone : ${val('telephone')}` : 'Par email',
        Étape: '2 sur 2 · précisions',
      };
      busy(btn, true, 'Valider');
      const ok = await send(`${call ? 'À rappeler' : 'Précisions'} · ${val('prenom')} · ${val('besoin') || 'sujet à préciser'}`, fields);
      busy(btn, false, 'Valider');
      if (!ok) return fail(fields);
      form.querySelector('[data-next]').textContent = call
        ? 'Je vous rappelle sous 24 h au numéro indiqué. D’ici là, connectons-nous sur LinkedIn.'
        : 'Je vous écris sous 24 h pour fixer un premier échange. D’ici là, connectons-nous sur LinkedIn.';
      show(3);
    }
  });

  form.querySelector('[data-skip]').addEventListener('click', () => show(3));
})();
