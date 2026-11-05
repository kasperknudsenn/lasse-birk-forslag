// Kommentarlag til forslaget. Sættes ind af kommentar_server.py, så de byggede sider forbliver rene.
// Kommentér (eller tasten C) → klik på siden → skriv → Gem. Gemmes i Hjemmeside/kommentarer.json.
// Løste kommentarer har grå nål; Claudes svar (feltet svar) står i listen og ved nålen.
// Online (kopien på GitHub Pages) er der ingen server: laget slår kun til, når siden er åbnet med ?kommentar (så Lasse aldrig ser det),
// kommentarerne gemmes i browseren, og "Send til Claude" kopierer dem alle, så Kasper kan sætte dem ind i chatten.
(() => {
  const API = '/api/kommentarer';
  const ONLINE = !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const KEY = 'kmt-kommentarer';
  if (ONLINE) {
    let on = false;
    try {
      if (/[?&]kommentar\b/.test(location.search)) localStorage.setItem('kmt-on', '1');
      on = localStorage.getItem('kmt-on') === '1';
    } catch (e) {}
    if (!on) return;
  }
  // Sider i roden hedder bare "neurosalg.html"; sider i undermapper får hele stien, så versionerne ikke deler nåle. Online bruges kun filnavnet
  const PAGE = ONLINE ? (decodeURIComponent(location.pathname).split('/').pop() || 'index.html')
    : (decodeURIComponent(location.pathname).replace(/^\/+/, '') || 'index.html').replace(/\/$/, '/index.html');
  let all = [], mode = false, draft = null, editing = null;

  const st = document.createElement('style');
  st.textContent = `
#kmt,#kmt *{box-sizing:border-box;font-family:Inter,system-ui,sans-serif;letter-spacing:0;text-transform:none}
#kmt-bar{position:fixed;right:16px;bottom:16px;z-index:2147483000;display:flex;gap:8px}
#kmt-bar button{font-size:14px;font-weight:600;border:0;border-radius:999px;padding:10px 16px;cursor:pointer;background:#08201B;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.18)}
#kmt-bar button.kmt-on{background:#10D99B;color:#05291F}
#kmt-hint{position:fixed;left:16px;bottom:16px;z-index:2147483000;background:#08201B;color:#fff;font-size:14px;padding:8px 14px;border-radius:999px;display:none;white-space:nowrap}
body.kmt-mode #kmt-hint{display:block}
body.kmt-mode,body.kmt-mode *{cursor:crosshair!important}
#kmt-hl{position:fixed;pointer-events:none;z-index:2147482990;border:2px solid #10D99B;border-radius:4px;background:rgba(16,217,155,.08);display:none}
.kmt-pin{position:fixed;z-index:2147482995;width:28px;height:28px;margin-top:-28px;border-radius:14px 14px 14px 2px;background:#10D99B;color:#05291F;font-size:13px;font-weight:700;display:grid;place-items:center;cursor:pointer!important;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.kmt-pin.kmt-done{background:#c9cfcc;color:#08201B}
.kmt-pin.kmt-flash{animation:kmtf .5s 3}
@keyframes kmtf{50%{transform:scale(1.5)}}
#kmt-box{position:fixed;z-index:2147483001;width:300px;background:#fff;color:#08201B;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:12px;display:none}
#kmt-box .kmt-meta{font-size:12px;line-height:1.4;color:#5b6b66;margin:0 0 8px;white-space:pre-line}
#kmt-box textarea{width:100%;min-height:90px;border:1px solid #d9dcd8;border-radius:8px;padding:8px;font-size:14px;line-height:1.4;resize:vertical;color:#08201B;background:#fff}
#kmt-box .kmt-row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}
#kmt-box button{font-size:14px;font-weight:600;border:0;border-radius:999px;padding:7px 14px;cursor:pointer;background:#F3F2EE;color:#08201B}
#kmt-box button.kmt-go{background:#10D99B;color:#05291F}
#kmt-box button.kmt-del{margin-right:auto;background:none;color:#b42318;padding-left:0}
#kmt-panel{position:fixed;right:16px;bottom:70px;z-index:2147483000;width:340px;max-width:calc(100vw - 32px);max-height:60vh;overflow:auto;background:#fff;color:#08201B;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.25);padding:14px;display:none}
#kmt-panel h4{font-size:14px;font-weight:600;line-height:1.3;margin:0 0 6px}
#kmt-panel .kmt-it{display:flex;gap:10px;padding:10px 0;border-top:1px solid #eee;cursor:pointer;font-size:14px;line-height:1.4}
#kmt-panel .kmt-n{flex:none;width:22px;height:22px;border-radius:11px;background:#10D99B;color:#05291F;font-size:12px;font-weight:700;display:grid;place-items:center}
#kmt-panel .kmt-it.kmt-done .kmt-n{background:#c9cfcc}
#kmt-panel .kmt-w,#kmt-panel .kmt-empty{font-size:12px;line-height:1.4;color:#5b6b66;margin:2px 0 0}
#kmt-panel .kmt-s{font-size:12px;line-height:1.4;color:#08201B;background:#E7FBF4;border-radius:6px;padding:6px 8px;margin:6px 0 0}
#kmt-panel .kmt-s:empty{display:none}
#kmt-toast{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:2147483002;background:#b42318;color:#fff;font-size:14px;padding:8px 14px;border-radius:999px;display:none;max-width:calc(100vw - 32px);text-align:center}
#kmt-toast.kmt-ok{background:#08201B}
#kmt-bar button.kmt-send{background:#10D99B;color:#05291F}
#kmt-panel .kmt-mail{display:inline-block;margin-top:10px;font-size:13px;color:#08201B}
@media (max-width:600px){#kmt-bar{left:16px;justify-content:flex-end;flex-wrap:wrap}#kmt-bar button{padding:9px 13px}}`;
  document.head.appendChild(st);

  const ui = document.createElement('div');
  ui.id = 'kmt';
  ui.innerHTML = `<div id="kmt-hint">Klik på det, du vil kommentere · Esc for at stoppe</div>
<div id="kmt-hl"></div><div id="kmt-pins"></div>
<div id="kmt-box"><p class="kmt-meta"></p><textarea placeholder="Skriv din kommentar"></textarea>
<div class="kmt-row"><button class="kmt-del">Slet</button><button class="kmt-no">Annullér</button><button class="kmt-go">Gem</button></div></div>
<div id="kmt-panel"></div>
<div id="kmt-bar">${ONLINE ? '<button class="kmt-send">Send til Claude</button>' : ''}<button class="kmt-list"></button><button class="kmt-mode">Kommentér</button></div>
<div id="kmt-toast"></div>`;
  document.body.appendChild(ui);
  const $ = s => ui.querySelector(s);
  const hl = $('#kmt-hl'), pins = $('#kmt-pins'), box = $('#kmt-box'), ta = box.querySelector('textarea'), panel = $('#kmt-panel');
  const mine = () => all.filter(c => c.side === PAGE);
  const where = c => c.elementtekst ? '“' + (c.elementtekst.length > 70 ? c.elementtekst.slice(0, 70) + '…' : c.elementtekst) + '”' : c.element;
  const boxOpen = () => box.style.display === 'block';

  // Hvor kommentaren sidder: CSS-sti, elementets tekst og overskriften i sektionen
  const txt = el => (el.innerText || el.getAttribute('alt') || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 160);
  function path(el) {
    const parts = [];
    for (; el && el !== document.body; el = el.parentElement) {
      if (el.id) { parts.unshift('#' + CSS.escape(el.id)); return parts.join(' > '); }
      let i = 1;
      for (let s = el.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === el.tagName) i++;
      parts.unshift(el.tagName.toLowerCase() + ':nth-of-type(' + i + ')');
    }
    return ['body', ...parts].join(' > ');
  }
  function desc(el) {
    let d = el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '');
    if (el.tagName === 'IMG') d += ' (' + (el.getAttribute('src') || '').split('/').pop() + ')';
    return d;
  }
  function area(el) {
    const s = el.closest('section, header, footer, .bar');
    const h = s && s.querySelector('h1, h2, h3');
    return h ? txt(h) : s ? (s.className ? s.tagName.toLowerCase() + '.' + s.className.split(' ').join('.') : s.tagName.toLowerCase()) : '';
  }
  function find(c) {
    let el = null;
    try { el = document.querySelector(c.selector); } catch (e) {}
    if (el && (!c.elementtekst || txt(el) === c.elementtekst)) return el;
    // Siden er bygget om: tag elementet med samme tekst, der ligger nærmest klikket
    let best = null, bd = Infinity;
    if (c.elementtekst) for (const x of document.querySelectorAll(c.tag || '*')) {
      if (x.closest('#kmt') || txt(x) !== c.elementtekst) continue;
      const r = x.getBoundingClientRect(), d = Math.hypot(r.left + c.fx * r.width + scrollX - c.sidex, r.top + c.fy * r.height + scrollY - c.sidey);
      if (d < bd) { bd = d; best = x; }
    }
    // Er elementet fjernet, skjules nålen i stedet for at hoppe til naboen (små forskelle, fx skjult tekst på mobil, er ok)
    return best || (el && txt(el).slice(0, 20) === c.elementtekst.slice(0, 20) ? el : null);
  }

  function place() {
    for (const c of [...mine(), draft]) {
      if (!c || !c._pin) continue;
      const r = c._el && c._el.getBoundingClientRect();
      if (!r || (!r.width && !r.height)) { c._pin.style.display = 'none'; continue; }
      c._pin.style.display = '';
      c._pin.style.left = r.left + c.fx * r.width + 'px';
      c._pin.style.top = r.top + c.fy * r.height + 'px';
    }
  }
  function pin(n, cls) {
    const p = document.createElement('div');
    p.className = 'kmt-pin' + (cls ? ' ' + cls : '');
    p.textContent = n;
    pins.appendChild(p);
    return p;
  }
  function render() {
    pins.innerHTML = '';
    mine().forEach((c, i) => {
      c._el = find(c);
      c._pin = pin(i + 1, c.status === 'løst' ? 'kmt-done' : '');
      c._pin.title = c.tekst + (c.svar ? '\nSvar: ' + c.svar : '');
      c._pin.onclick = () => edit(c, i + 1);
    });
    if (draft) { draft._pin = pin('+'); }
    place();
    list();
  }
  function list() {
    const m = mine(), others = {};
    $('#kmt-bar .kmt-list').textContent = 'Kommentarer · ' + m.length;
    all.filter(c => c.side !== PAGE).forEach(c => others[c.side] = (others[c.side] || 0) + 1);
    panel.innerHTML = '<h4>Kommentarer på denne side</h4>' + (m.length ? '' : '<p class="kmt-empty">Ingen endnu. Klik på Kommentér og derefter på siden.</p>');
    m.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'kmt-it' + (c.status === 'løst' ? ' kmt-done' : '');
      d.innerHTML = '<span class="kmt-n"></span><div><div class="kmt-t"></div><p class="kmt-w"></p><p class="kmt-s"></p></div>';
      d.querySelector('.kmt-n').textContent = i + 1;
      d.querySelector('.kmt-t').textContent = c.tekst;
      d.querySelector('.kmt-w').textContent = where(c) + (c.status === 'løst' ? ' · løst' : '');
      if (c.svar) d.querySelector('.kmt-s').textContent = 'Svar: ' + c.svar;
      d.onclick = () => go(c);
      panel.appendChild(d);
    });
    if (Object.keys(others).length) {
      const o = document.createElement('p');
      o.className = 'kmt-w';
      o.textContent = 'Andre sider: ' + Object.entries(others).map(([k, v]) => k.replace('.html', '') + ' ' + v).join(', ');
      panel.appendChild(o);
    }
    if (ONLINE && all.length) {
      const a = document.createElement('a');
      a.className = 'kmt-mail';
      a.href = 'mailto:kasper@sedia.dk?subject=' + encodeURIComponent('Kommentarer til Lasses side') + '&body=' + encodeURIComponent(report());
      a.textContent = 'Send dem på mail i stedet';
      panel.appendChild(a);
    }
  }
  // Alle kommentarer som tekst til chatten: først læsbart, så de rå data, så Claude kan finde stedet igen
  function report() {
    const lines = all.map((c, i) => (i + 1) + '. ' + c.side.replace('.html', '') + ' · ' + (c.omraade || '') + ' · ' + where(c) + '\n   ' + c.tekst);
    return 'Kommentarer til Lasses side (' + all.length + ')\n\n' + lines.join('\n\n') + '\n\nDATA ' + JSON.stringify(all, (k, v) => k.startsWith('_') ? undefined : v);
  }
  async function send() {
    if (!all.length) return toast('Ingen kommentarer endnu', true);
    try { await navigator.clipboard.writeText(report()); toast('Kopieret. Sæt det ind i chatten med Claude.', true); }
    catch (e) { location.href = 'mailto:kasper@sedia.dk?subject=' + encodeURIComponent('Kommentarer til Lasses side') + '&body=' + encodeURIComponent(report()); }
  }
  function go(c) {
    if (!c._el) return;
    c._el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    c._pin.classList.remove('kmt-flash'); void c._pin.offsetWidth; c._pin.classList.add('kmt-flash');
  }

  const clean = o => JSON.parse(JSON.stringify(o, (k, v) => k.startsWith('_') ? undefined : v));
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const store = items => { try { localStorage.setItem(KEY, JSON.stringify(items.map(clean))); } catch (e) { toast('Kunne ikke gemme i browseren'); } };
  async function api(method, sub, body) {
    if (ONLINE) {
      // Samme svar som kommentar_server.py, men gemt i browseren
      const items = load(), id = sub.slice(1);
      if (method === 'GET') return items;
      if (method === 'POST') {
        const c = { ...clean(body), id: Math.random().toString(16).slice(2, 10), oprettet: new Date().toISOString().slice(0, 19).replace('T', ' ') };
        store([...items, c]);
        return c;
      }
      if (method === 'PUT') { const c = items.find(x => x.id === id); Object.assign(c, body); store(items); return c; }
      if (method === 'DELETE') { store(items.filter(x => x.id !== id)); return { slettet: id }; }
    }
    const r = await fetch(API + sub, { method, headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(clean(body)) : undefined });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }
  function toast(t, ok) {
    const el = $('#kmt-toast');
    el.classList.toggle('kmt-ok', !!ok);
    el.textContent = t; el.style.display = 'block';
    clearTimeout(toast.t); toast.t = setTimeout(() => el.style.display = 'none', 3500);
  }

  function show(x, y, meta, text, canDelete) {
    box.querySelector('.kmt-meta').textContent = meta;
    box.querySelector('.kmt-del').style.display = canDelete ? '' : 'none';
    ta.value = text;
    box.style.display = 'block';
    box.style.left = Math.max(8, Math.min(x + 12, innerWidth - 308)) + 'px';
    box.style.top = Math.max(8, Math.min(y + 12, innerHeight - box.offsetHeight - 8)) + 'px';
    hl.style.display = 'none';
    ta.focus();
  }
  function close() {
    box.style.display = 'none';
    if (draft && draft._pin) draft._pin.remove();
    draft = editing = null;
  }
  function edit(c, n) {
    close();
    editing = c;
    const r = c._pin.getBoundingClientRect();
    show(r.right, r.top, '#' + n + ' · ' + where(c) + (c.status === 'løst' ? ' · løst' : '') + (c.svar ? '\nSvar: ' + c.svar : ''), c.tekst, true);
  }
  async function save() {
    const t = ta.value.trim();
    if (!t) return;
    try {
      if (editing) { await api('PUT', '/' + editing.id, { tekst: t }); editing.tekst = t; }
      else if (draft) all.push(await api('POST', '', { ...draft, tekst: t }));
      close(); render();
    } catch (e) { toast('Kunne ikke gemme. Kører serveren?'); }
  }
  async function del() {
    if (!editing) return;
    try { await api('DELETE', '/' + editing.id); all = all.filter(c => c !== editing); close(); render(); }
    catch (e) { toast('Kunne ikke slette. Kører serveren?'); }
  }
  function setMode(on) {
    mode = on;
    document.body.classList.toggle('kmt-mode', on);
    $('#kmt-bar .kmt-mode').classList.toggle('kmt-on', on);
    $('#kmt-bar .kmt-mode').textContent = on ? 'Stop kommentering' : 'Kommentér';
    if (!on) hl.style.display = 'none';
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#kmt')) return;
    if (!mode) { if (boxOpen()) close(); return; }
    e.preventDefault(); e.stopPropagation();
    close();
    const el = e.target, r = el.getBoundingClientRect();
    draft = { side: PAGE, tekst: '', omraade: area(el), element: desc(el), elementtekst: txt(el), selector: path(el), tag: el.tagName.toLowerCase(),
      fx: r.width ? +((e.clientX - r.left) / r.width).toFixed(3) : 0, fy: r.height ? +((e.clientY - r.top) / r.height).toFixed(3) : 0,
      sidex: Math.round(e.pageX), sidey: Math.round(e.pageY), skaerm: innerWidth + '×' + innerHeight, status: 'åben', _el: el };
    draft._pin = pin('+');
    place();
    show(e.clientX, e.clientY, 'Ny kommentar · ' + where(draft), '', false);
  }, true);
  document.addEventListener('mousemove', e => {
    if (!mode || boxOpen()) return;
    if (e.target.closest('#kmt')) { hl.style.display = 'none'; return; }
    const r = e.target.getBoundingClientRect();
    Object.assign(hl.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { boxOpen() ? close() : setMode(false); return; }
    if (e.target.closest && e.target.closest('input, textarea')) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); return; }
    if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !e.altKey) setMode(!mode);
  });

  $('#kmt-bar .kmt-mode').onclick = () => setMode(!mode);
  $('#kmt-bar .kmt-list').onclick = () => panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
  if (ONLINE) $('#kmt-bar .kmt-send').onclick = send;
  box.querySelector('.kmt-go').onclick = save;
  box.querySelector('.kmt-no').onclick = close;
  box.querySelector('.kmt-del').onclick = del;
  let raf = 0;
  addEventListener('scroll', () => raf || (raf = requestAnimationFrame(() => { raf = 0; place(); })), { passive: true, capture: true });
  addEventListener('resize', () => { mine().forEach(c => c._el = find(c)); place(); });
  // Følg med under animationer (fx menuen, der glider op ved scroll)
  let until = 0;
  const follow = () => { place(); if (performance.now() < until) requestAnimationFrame(follow); };
  document.addEventListener('transitionrun', () => { const idle = performance.now() >= until; until = performance.now() + 600; if (idle) requestAnimationFrame(follow); });
  document.addEventListener('transitionend', place);
  document.addEventListener('load', place, true);
  if (document.fonts) document.fonts.ready.then(place);   // skrifttypen ændrer højder, når den er hentet
  setInterval(place, 1000);   // fanger andre layoutskift
  new ResizeObserver(place).observe(document.body);

  list();
  api('GET', '').then(d => { all = d; render(); }).catch(() => toast('Kunne ikke hente kommentarer. Kører serveren?'));
})();
