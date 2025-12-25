(function(window){
  'use strict';

  const DEFAULT_LANG = 'tr';
  const VALID_LANGS = ['tr', 'de', 'en', 'nl'];

  function apply(lang){
    if (!VALID_LANGS.includes(lang)) {
        lang = DEFAULT_LANG;
    }

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Persist preference
    try {
        localStorage.setItem('lang', lang);
    } catch(e) {}

    // Get strings
    const strings = (window.I18N_STRINGS && window.I18N_STRINGS[lang]) || {};

    // Update text content for [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (strings[key]) {
            el.textContent = strings[key];
        }
    });

    // Update placeholders for [data-i18n-ph]
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.dataset.i18nPh;
        if (strings[key]) {
            el.placeholder = strings[key];
        }
    });

    // Update theme toggle label
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        const label = strings['btn.theme'];
        if (label) {
            toggle.setAttribute('aria-label', label);
            toggle.setAttribute('title', label);
        }
    }

    // Update Language Buttons Visual State
    // Select buttons that call setLang(...)
    const langBtns = document.querySelectorAll('button[onclick^="setLang"]');
    langBtns.forEach(btn => {
        // Extract lang from onclick="setLang('tr')"
        const match = btn.getAttribute('onclick').match(/setLang\(['"](\w+)['"]\)/);
        if (match && match[1]) {
            const btnLang = match[1];
            if (btnLang === lang) {
                btn.classList.add('theme-button-accent');
                btn.classList.remove('theme-button');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.add('theme-button');
                btn.classList.remove('theme-button-accent');
                btn.setAttribute('aria-pressed', 'false');
            }
        }
    });

    // Update content visibility for [data-lang-content]
    const contentBlocks = document.querySelectorAll('[data-lang-content]');
    if (contentBlocks.length > 0) {
        // Hide all first
        contentBlocks.forEach(el => el.style.display = 'none');

        // Find blocks for current lang
        const currentLangBlocks = Array.from(contentBlocks).filter(el => el.dataset.langContent === lang);

        if (currentLangBlocks.length > 0 && currentLangBlocks.some(el => el.innerHTML.trim())) {
             currentLangBlocks.forEach(el => el.style.display = '');
        } else {
             // Fallback logic
             const fallback = document.getElementById('post-default');
             if (fallback) {
                 const blocks = {
                     tr: document.querySelector('[data-lang-content="tr"]'),
                     de: document.querySelector('[data-lang-content="de"]'),
                     en: document.querySelector('[data-lang-content="en"]'),
                     nl: document.querySelector('[data-lang-content="nl"]')
                 };

                 const hasAnyContent = Object.values(blocks).some(b => b && b.innerHTML.trim().length > 0);

                 if (hasAnyContent) {
                     if (blocks[lang] && blocks[lang].innerHTML.trim()) {
                         blocks[lang].style.display = '';
                     } else {
                         if (blocks.tr && blocks.tr.innerHTML.trim()) blocks.tr.style.display = '';
                         else if (blocks.de && blocks.de.innerHTML.trim()) blocks.de.style.display = '';
                         else if (blocks.en && blocks.en.innerHTML.trim()) blocks.en.style.display = '';
                         else fallback.style.display = '';
                     }
                 } else {
                     fallback.style.display = '';
                 }
             }
        }
    }
  }

  // Expose to window
  window.setLang = apply;
  window.applyLang = apply; // alias

  // Initialize
  const saved = localStorage.getItem('lang');
  const browser = navigator.language.slice(0, 2);
  const initial = VALID_LANGS.includes(saved) ? saved : (VALID_LANGS.includes(browser) ? browser : DEFAULT_LANG);

  if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => apply(initial));
  } else {
      apply(initial);
  }

})(window);
