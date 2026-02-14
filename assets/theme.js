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
