// Demande de rendez-vous envoyée directement par email, sans ouvrir de logiciel de messagerie.
// Service : Web3Forms (api.web3forms.com) si le formulaire porte data-key (clé publique, faite pour être dans la page),
// sinon FormSubmit (data-endpoint). Clé posée par build/formulaire.py. En cas d'échec : un lien email prêt à envoyer.
// Les 5 prochains jours ouvrés sont proposés. Sans JavaScript, le formulaire s'envoie quand même (page FormSubmit).
(() => {
  document.querySelectorAll('[data-rdv]').forEach(form => {
    const box = form.querySelector('[data-days]');
    if (box) {
      const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const short = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
      const d = new Date(); d.setHours(12, 0, 0, 0);
      let n = 0;
      while (n < 5) {
        d.setDate(d.getDate() + 1);
        const wd = d.getDay();
        if (wd === 0 || wd === 6) continue;
        const lab = document.createElement('label');
        const s = short.format(d).replace('.', '');
        lab.innerHTML = `<input type="radio" name="jour" value="${fmt.format(d)}"${n === 0 ? ' checked' : ''}><span>${s.charAt(0).toUpperCase() + s.slice(1)}</span>`;
        box.appendChild(lab); n++;
      }
    }

    // Un lien « ?sujet=produit#contact » arrive avec le bon sujet déjà choisi
    const SUJETS = { ia: 'Intégration de l’IA', audit: 'Audit IA', produit: 'Construire un produit', former: 'Former une équipe' };
    const pre = SUJETS[new URLSearchParams(location.search).get('sujet')];
    if (pre) form.querySelectorAll('[name="sujet"]').forEach(r => { r.checked = r.value === pre; });

    const btn = form.querySelector('.rdv-go');
    const status = form.querySelector('.rdv-status');
    status.setAttribute('tabindex', '-1');
    // Message construit avec textContent : aucune donnée saisie n'est interprétée comme du HTML
    const say = (cls, parts) => {
      status.className = 'rdv-status ' + cls; status.replaceChildren();
      parts.forEach(p => {
        if (typeof p === 'string') status.append(p);
        else { const el = document.createElement(p.tag); el.textContent = p.text; if (p.href) el.href = p.href; status.append(el); }
      });
      status.focus();
    };
    const done = (nom, email) => {
      form.classList.add('sent');
      say('ok', [{ tag: 'b', text: `Demande envoyée, merci ${nom.split(' ')[0]}.` }, { tag: 'br', text: '' }, `Tom répond par email à ${email} pour confirmer le créneau et envoyer le lien de la visio.`]);
    };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const v = k => ((form.querySelector(`[name="${k}"]:checked`) || form.elements[k] || {}).value || '').trim();
      if (v('_honey')) { done(v('nom'), v('email')); return; } // robot (ou remplissage automatique) : rien n'est envoyé
      const sujet = v('sujet'), ent = v('entreprise');
      const data = {
        _subject: `Rendez-vous · ${sujet}${ent ? ' · ' + ent : ''}`,
        _replyto: v('email'),
        _template: 'table',
        Sujet: sujet,
        'Créneau souhaité': [v('jour'), v('moment')].filter(Boolean).join(', '),
        Nom: v('nom'),
        Email: v('email'),
        Entreprise: ent || '—',
        Message: v('message') || '—',
        Page: location.pathname.split('/').pop() || 'accueil',
      };
      // En cas d'échec : un lien email prêt à envoyer, avec le même contenu
      const mail = form.dataset.mail;
      const body = Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, x]) => `${k} : ${x}`).join('\n');
      const fallback = `mailto:${mail}?subject=${encodeURIComponent(data._subject)}&body=${encodeURIComponent(body.slice(0, 800))}`; // corps raccourci : limite des liens email

      // Le libellé du bouton est dans un <span> (l'icône suit)
      const label = btn.querySelector('span');
      btn.disabled = true; label.textContent = 'Envoi…';
      const stop = new AbortController(), timer = setTimeout(() => stop.abort(), 15000); // réseau bloqué : on passe au repli
      // Web3Forms : mêmes champs, plus la clé, l'adresse de réponse et le piège à robots
      const key = form.dataset.key;
      const url = key ? 'https://api.web3forms.com/submit' : form.dataset.endpoint;
      const payload = key ? { access_key: key, subject: data._subject, from_name: 'Site tomberthet.fr', replyto: data._replyto, botcheck: false, ...Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_'))) } : data;
      try {
        const r = await fetch(url, {
          method: 'POST', signal: stop.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || String(j.success) !== 'true') throw new Error(j.message || r.status);
        done(data.Nom, data.Email);
      } catch (e) {
        // FormSubmit refuse tout envoi tant que l'adresse de réception n'est pas activée (lien envoyé par email à cette adresse)
        const why = /activ/i.test(String(e && e.message)) ? 'Le formulaire est en cours d’activation. ' : 'L’envoi n’a pas fonctionné. ';
        if (why.startsWith('Le formulaire')) console.warn('FormSubmit : activation requise. Cliquer le lien « Activate Form » reçu sur', mail);
        say('err', [why, { tag: 'a', text: 'Envoyer la demande par email', href: fallback }, `, ou écrire directement à ${mail}.`]);
      } finally {
        clearTimeout(timer);
        btn.disabled = false; label.textContent = 'Envoyer la demande';
      }
    });
  });
})();
