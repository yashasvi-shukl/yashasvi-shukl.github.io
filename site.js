/* ═══════════════════════════════════════════════════════════════
   site.js  —  Shared module loaded by every page
   • Config loading & caching
   • Nav + footer rendering
   • RAF-based custom cursor (zero layout-lag)
   • Page transitions
   • Scroll reveal (IntersectionObserver)
   • Helpers: favicon, marquee, tag colours
═══════════════════════════════════════════════════════════════ */

/* ── CONFIG ─────────────────────────────────────────────────── */
let _cfg = null;
export async function getConfig() {
  if (_cfg) return _cfg;
  const res = await fetch(`config.json?v=${Date.now()}`);
  if (!res.ok) throw new Error(
    'Cannot load config.json — serve over HTTP.\n' +
    'Run: python -m http.server 8000  then open http://localhost:8000'
  );
  _cfg = await res.json();
  return _cfg;
}

/* ── NAV ────────────────────────────────────────────────────── */
export function renderNav(cfg, activePage) {
  const nav = document.getElementById('site-nav');
  if (!nav) return;
  const p = cfg.personal;
  const pages = [
    { label: 'Home',  href: 'index.html', key: 'home'  },
    { label: 'About', href: 'about.html', key: 'about' },
    { label: 'Blog',  href: 'blog.html',  key: 'blog'  },
  ];
  nav.innerHTML = `
    <a href="index.html" class="nav-logo" data-link>
      ${p.firstName} <em>S.</em>
    </a>
    <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle menu">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-body" id="nav-body">
      <ul class="nav-links">
        ${pages.map(pg => `
          <li>
            <a href="${pg.href}"
               class="nav-link ${activePage === pg.key ? 'active' : ''}"
               data-link>
              <span class="nav-link-dot"></span>${pg.label}
            </a>
          </li>`).join('')}
      </ul>
      <a href="mailto:${p.email}" class="nav-cta">Hire Me <span>↗</span></a>
    </div>`;

  document.getElementById('nav-hamburger')?.addEventListener('click', () =>
    document.getElementById('nav-body')?.classList.toggle('open'));

  nav.querySelectorAll('a, button').forEach(attachHover);
}

/* ── FOOTER ─────────────────────────────────────────────────── */
export function renderFooter(cfg) {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const p = cfg.personal, m = cfg.meta;
  el.innerHTML = `
    <div class="footer-inner">
      <div class="footer-brand">
        <span class="footer-logo">${p.firstName} <em>S.</em></span>
        <span class="footer-sub">${p.role} · ${p.location}</span>
      </div>
      <nav class="footer-nav">
        <a href="index.html" data-link>Home</a>
        <a href="about.html" data-link>About</a>
        <a href="blog.html"  data-link>Blog</a>
        <a href="mailto:${p.email}">Contact</a>
      </nav>
      <div class="footer-social">
        <a href="${p.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
        <a href="${p.github}"   target="_blank" rel="noopener">GitHub</a>
        <a href="${p.medium}"   target="_blank" rel="noopener">Medium</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${m.copyrightYear} ${p.name}</span>
      <span class="footer-dot">·</span>
      <span>${p.role}</span>
      <span class="footer-dot">·</span>
      <span>Hosted on GitHub Pages</span>
    </div>`;
  el.querySelectorAll('a').forEach(attachHover);
}

/* ── CURSOR (RAF-based, zero layout lag) ────────────────────── */
/*
  Setting style.left / style.top on every mousemove forces the browser
  to recalculate layout geometry on every pixel — that's what causes lag.

  Fix: store raw mouse coords in variables on mousemove (no DOM writes),
  then apply them as transform:translate() inside requestAnimationFrame.
  transform runs on the GPU compositor thread — no layout recalc, no lag.
*/
let cursorEl = null;
let _mx = -200, _my = -200;
let _rafId = null;
let _scrollTimer = null;

function _cursorLoop() {
  if (cursorEl) {
    cursorEl.style.transform = `translate(calc(${_mx}px - 50%), calc(${_my}px - 50%))`;
  }
  _rafId = requestAnimationFrame(_cursorLoop);
}

export function initCursor() {
  cursorEl = document.getElementById('cursor');
  if (!cursorEl) return;

  cursorEl.style.opacity = '0'; // hidden until first move

  document.addEventListener('mousemove', e => {
    _mx = e.clientX;
    _my = e.clientY;
    if (cursorEl.style.opacity !== '1') cursorEl.style.opacity = '1';
  }, { passive: true });

  document.addEventListener('mouseleave', () => { if (cursorEl) cursorEl.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { if (cursorEl) cursorEl.style.opacity = '1'; });

  // Hide custom cursor while scrolling
  document.addEventListener('scroll', () => {
    if (_scrollTimer) clearTimeout(_scrollTimer);
    if (cursorEl) cursorEl.style.opacity = '0';
    _scrollTimer = setTimeout(() => {
      if (cursorEl) cursorEl.style.opacity = '1';
    }, 100);
  }, { passive: true });

  if (_rafId) cancelAnimationFrame(_rafId);
  _cursorLoop();
}

export function attachHover(el) {
  if (!el) return;
  el.addEventListener('mouseenter', () => cursorEl?.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursorEl?.classList.remove('hover'));
}

/* ── SCROLL REVEAL ──────────────────────────────────────────── */
const _revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      _revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.06 });

export function watchReveal() {
  document.querySelectorAll('.r:not(.in)').forEach(el => _revealObs.observe(el));
}

/* ── PAGE TRANSITIONS ───────────────────────────────────────── */
export function initTransitions() {
  document.addEventListener('click', e => {
    const link = e.target.closest('a[data-link]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http')) return;
    e.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { location.href = href; }, 300);
  });

  // Fix back button bfcache issue
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.classList.remove('page-leaving');
    }
  });
}

/* ── FAVICON ────────────────────────────────────────────────── */
export function setFavicon(emoji) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
  document.head.appendChild(link);
}

/* ── OPEN GRAPH META ────────────────────────────────────────── */
export function setOGMeta(cfg, title, description) {
  const m = cfg.meta, p = cfg.personal;
  const metas = [
    ['og:type',        'website'],
    ['og:url',         m.siteUrl],
    ['og:title',       title || m.siteTitle],
    ['og:description', description || m.description],
    ['og:image',       `${m.siteUrl}/${m.ogImage}`],
    ['twitter:card',   'summary_large_image'],
    ['twitter:title',  title || m.siteTitle],
    ['twitter:description', description || m.description],
  ];
  metas.forEach(([prop, content]) => {
    const el = document.createElement('meta');
    el.setAttribute(prop.startsWith('twitter') ? 'name' : 'property', prop);
    el.setAttribute('content', content);
    document.head.appendChild(el);
  });
}

/* ── MARQUEE ────────────────────────────────────────────────── */
export function buildMarquee(items, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  // Triple the items so short lists still fill wide screens
  const all = [...items, ...items, ...items];
  el.innerHTML = all.map(t => `<span class="mq-item">${t}</span>`).join('');
}

/* ── TAG COLOURS ────────────────────────────────────────────── */
export const TAG_COLORS = {
  'RAG':     { bg: 'rgba(245,166,35,.12)',  color: '#F5A623' },
  'Search':  { bg: 'rgba(108,184,154,.12)', color: '#6CB89A' },
  'LLM Ops': { bg: 'rgba(224,112,112,.12)', color: '#E07070' },
  'Agents':  { bg: 'rgba(150,120,220,.12)', color: '#9678DC' },
  'default': { bg: 'rgba(245,166,35,.12)',  color: '#F5A623' },
};
export function tagStyle(tag) {
  const t = TAG_COLORS[tag] || TAG_COLORS['default'];
  return `background:${t.bg};color:${t.color};`;
}
