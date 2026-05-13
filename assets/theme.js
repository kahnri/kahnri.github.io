(function(){
  const htmlEl = document.documentElement;
  const themeKey = 'theme-preference';
  let storedTheme = null;

  function readStored(){
    try {
      return localStorage.getItem(themeKey);
    } catch (e) {
      return null;
    }
  }

  function currentTheme(){
    return htmlEl.dataset.theme || 'dark';
  }

  function persistTheme(theme){
    try {
      localStorage.setItem(themeKey, theme);
    } catch (e) {}
    storedTheme = theme;
  }

  function updateIcons(theme){
    document.querySelectorAll('[data-theme-icon]').forEach(function(icon){
      icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    });
  }

  function setTheme(theme, persist){
    if (persist === undefined) {
      persist = true;
    }
    htmlEl.dataset.theme = theme;
    if (persist) {
      persistTheme(theme);
    }
    updateIcons(theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }

  function setupToggle(btn){
    if (!btn || btn.dataset.themeInitialized === 'true') {
      return;
    }
    btn.dataset.themeInitialized = 'true';
    btn.addEventListener('click', function(){
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  function ensureButton(){
    let btn = document.getElementById('theme-toggle');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'theme-toggle';
      btn.type = 'button';
      btn.className = 'theme-toggle-fixed';
      btn.innerHTML = '<span data-theme-icon aria-hidden="true">🌙</span><span class="sr-only">Toggle theme</span>';
      document.body.appendChild(btn);
      return btn;
    }

    if (!btn.querySelector('[data-theme-icon]')) {
      const icon = document.createElement('span');
      icon.setAttribute('data-theme-icon', '');
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = currentTheme() === 'dark' ? '🌙' : '☀️';
      btn.prepend(icon);
    }

    if (!btn.querySelector('.sr-only')) {
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = 'Toggle theme';
      btn.appendChild(sr);
    }

    return btn;
  }

  function init(){
    if (storedTheme) {
      setTheme(storedTheme, false);
    } else {
      updateIcons(currentTheme());
    }

    const btn = ensureButton();
    setupToggle(btn);

    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(event){
        if (!storedTheme) {
          setTheme(event.matches ? 'dark' : 'light', false);
        }
      });
    } catch (e) {}
  }

  storedTheme = readStored();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.__themeToggle = {
    setTheme: setTheme,
    currentTheme: currentTheme,
    updateIcons: updateIcons
  };
})();

(function(){
  function ready(fn){
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  ready(function(){
    const body = document.body;
    if (!body || !body.classList.contains('home-page')) {
      return;
    }

    const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduceMotion = motionQuery && motionQuery.matches;
    if (reduceMotion) {
      return;
    }

    const revealTargets = [];
    function addReveal(selector, variant){
      document.querySelectorAll(selector).forEach(function(el, index){
        if (!el.classList.contains('scroll-reveal')) {
          el.classList.add('scroll-reveal');
          revealTargets.push(el);
        }
        el.dataset.reveal = variant || 'up';
        el.style.setProperty('--reveal-index', String(index % 7));
      });
    }

    addReveal('.hero-intro .hero-kicker', 'left');
    addReveal('.hero-intro .hero-lead', 'left');
    addReveal('.hero-intro .theme-chip', 'pop');
    addReveal('.hero-intro .theme-button, .hero-intro .theme-button-accent', 'pop');
    addReveal('.hero-visual-panel', 'right');
    addReveal('main > section:not(.hero-intro)', 'up');
    addReveal('main > section article.theme-card', 'card');
    addReveal('[data-recent-card]', 'card');
    addReveal('footer', 'up');

    document.querySelectorAll('main section article.theme-card, [data-recent-card]').forEach(function(el){
      el.setAttribute('data-scroll-tilt', '');
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.14
      });

      revealTargets.forEach(function(el){
        observer.observe(el);
      });
    } else {
      revealTargets.forEach(function(el){
        el.classList.add('is-visible');
      });
    }

    const hero = document.querySelector('.hero-intro');
    const tiltTargets = Array.from(document.querySelectorAll('[data-scroll-tilt]'));
    let ticking = false;

    function updateScrollState(){
      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = clamp(window.scrollY / maxScroll, 0, 1);
      body.style.setProperty('--scroll-progress', progress.toFixed(4));

      if (hero) {
        const rect = hero.getBoundingClientRect();
        const heroProgress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
        body.style.setProperty('--hero-shift', heroProgress.toFixed(4));
      }

      tiltTargets.forEach(function(el){
        const rect = el.getBoundingClientRect();
        const elementProgress = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
        el.style.setProperty('--element-progress', elementProgress.toFixed(4));
      });

      ticking = false;
    }

    function requestScrollUpdate(){
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(updateScrollState);
    }

    updateScrollState();
    window.addEventListener('scroll', requestScrollUpdate, { passive: true });
    window.addEventListener('resize', requestScrollUpdate);
  });
})();
