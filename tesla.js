// Tesla-stil: skærmene glider på plads, tallene tæller op, og menuen skifter farve efter baggrunden
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top = document.querySelector('.top');
  const screens = [...document.querySelectorAll('.t-scr')];
  const fmt = (v, dec) => v.toLocaleString('da-DK', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const count = (el) => {
    const end = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, suf = el.dataset.suffix || '';
    if (still) return;
    const t0 = performance.now(), dur = 1500;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(end * k, dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!still) document.querySelectorAll('[data-count]').forEach(el => { el.textContent = fmt(0, +el.dataset.dec || 0) + (el.dataset.suffix || ''); });
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('vis');
    e.target.querySelectorAll('[data-count]').forEach((n) => { if (!n.dataset.done) { n.dataset.done = 1; count(n); } });
  }), { threshold: 0.35 });
  screens.forEach((s) => io.observe(s));
  const theme = () => {
    const s = screens.find((s) => { const r = s.getBoundingClientRect(); return r.top <= 32 && r.bottom > 32; });
    top.classList.toggle('dark', !!s && (s.classList.contains('dark') || s.classList.contains('navy')) && !s.classList.contains('lyst'));
    // midt i en skærm (eller i bunden) får menuen baggrund, så den ikke står oven i teksten
    top.classList.toggle('solid', !s || s.getBoundingClientRect().top < -8);
  };
  addEventListener('scroll', theme, { passive: true });
  theme();
})();
