// Demande de rendez-vous sans service tiers : le formulaire prépare un email (sujet, jour, moment, entreprise, besoin).
// Les 5 prochains jours ouvrés sont proposés. Le créneau est ensuite confirmé par retour d'email.
(() => {
  document.querySelectorAll('[data-rdv]').forEach(form => {
    const box = form.querySelector('[data-days]');
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
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = k => (form.querySelector(`[name="${k}"]:checked`) || form.elements[k] || {}).value || '';
      const ent = v('entreprise').trim(), besoin = v('besoin').trim();
      const subject = `Rendez-vous · ${v('sujet')}${ent ? ' · ' + ent : ''}`;
      const body = [
        'Bonjour Tom,', '',
        `Je souhaiterais échanger 30 minutes au sujet de : ${v('sujet')}.`,
        `Créneau souhaité : ${v('jour')}, ${v('moment')}.`,
        ent ? `Entreprise : ${ent}` : '',
        besoin ? `Le besoin : ${besoin}` : '',
        '', 'Bonne journée,'
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
      location.href = `mailto:${form.dataset.mail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  });
})();
