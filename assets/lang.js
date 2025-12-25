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

    // Update content visibility for [data-lang-content]
    // Example: <div data-lang-content="tr">...</div>
    const contentBlocks = document.querySelectorAll('[data-lang-content]');
    if (contentBlocks.length > 0) {
        // Hide all first
        contentBlocks.forEach(el => el.style.display = 'none');

        // Find blocks for current lang
        const currentLangBlocks = Array.from(contentBlocks).filter(el => el.dataset.langContent === lang);

        if (currentLangBlocks.length > 0 && currentLangBlocks.some(el => el.innerHTML.trim())) {
             currentLangBlocks.forEach(el => el.style.display = '');
        } else {
             // Fallback logic for posts: try tr, then de, then en, then default
             // This logic matches the previous specific implementation in post.html
             // But generalized: check if we have specific fallback element
             const fallback = document.getElementById('post-default');
             if (fallback) {
                 // Check if we found any valid content in preferred lang, if not, try fallbacks
                 // But wait, the previous logic was: if ANY block has content, hide all and show specific.
                 // If specific is empty, show fallback chain.

                 // Let's replicate the chain if we are on a post page (heuristic: has post-default)
                 const blocks = {
                     tr: document.querySelector('[data-lang-content="tr"]'),
                     de: document.querySelector('[data-lang-content="de"]'),
                     en: document.querySelector('[data-lang-content="en"]'),
                     nl: document.querySelector('[data-lang-content="nl"]')
                 };

                 // Check if any block exists and has content
                 const hasAnyContent = Object.values(blocks).some(b => b && b.innerHTML.trim().length > 0);

                 if (hasAnyContent) {
                     if (blocks[lang] && blocks[lang].innerHTML.trim()) {
                         blocks[lang].style.display = '';
                     } else {
                         // Fallback chain
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
