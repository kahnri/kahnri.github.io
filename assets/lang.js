(function(window){
  'use strict';

  var DEFAULT_LANG = 'tr';
  var VALID_LANGS = ['tr', 'de', 'en', 'nl', 'ja'];

  function readStoredLang(){
    try {
      return localStorage.getItem('lang');
    } catch (e) {
      return null;
    }
  }

  function saveStoredLang(lang){
    try {
      localStorage.setItem('lang', lang);
    } catch (e) {}
  }

  function pickLangValue(el, lang){
    var priority = [lang].concat(VALID_LANGS.filter(function(code){ return code !== lang; }));
    for (var i = 0; i < priority.length; i += 1) {
      var value = el.getAttribute('data-lang-text-' + priority[i]);
      if (value && value.trim()) {
        return value;
      }
    }
    return '';
  }

  function applyI18n(strings){
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.dataset.i18n;
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function(el){
      var key = el.dataset.i18nTitle;
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(function(el){
      var key = el.dataset.i18nPh;
      if (strings[key]) {
        el.placeholder = strings[key];
      }
    });
  }

  function applyLangSelect(lang, strings){
    document.querySelectorAll('[data-lang-select]').forEach(function(selectEl){
      selectEl.value = lang;
      if (strings['lang.label']) {
        selectEl.setAttribute('aria-label', strings['lang.label']);
        selectEl.setAttribute('title', strings['lang.label']);
      }
    });
  }

  function applyLegacyButtons(lang){
    document.querySelectorAll('button[data-lang]').forEach(function(btn){
      if (btn.dataset.lang === lang) {
        btn.setAttribute('aria-pressed', 'true');
        btn.classList.remove('theme-button');
        btn.classList.add('theme-button-accent');
      } else {
        btn.setAttribute('aria-pressed', 'false');
        btn.classList.remove('theme-button-accent');
        btn.classList.add('theme-button');
      }
    });
  }

  function applyLangTextBlocks(lang){
    document.querySelectorAll('[data-lang-text]').forEach(function(el){
      var text = pickLangValue(el, lang);
      if (text) {
        el.textContent = text;
      }
    });
  }

  function applyPostLangContent(lang){
    var blocks = Array.prototype.slice.call(document.querySelectorAll('[data-lang-content]'));
    if (!blocks.length) {
      return;
    }

    blocks.forEach(function(el){
      el.style.display = 'none';
    });

    var shown = blocks.filter(function(el){
      return el.dataset.langContent === lang && el.innerHTML.trim().length > 0;
    });

    if (!shown.length) {
      for (var i = 0; i < VALID_LANGS.length; i += 1) {
        var code = VALID_LANGS[i];
        shown = blocks.filter(function(el){
          return el.dataset.langContent === code && el.innerHTML.trim().length > 0;
        });
        if (shown.length) {
          break;
        }
      }
    }

    shown.forEach(function(el){
      el.style.display = '';
    });

    var fallback = document.getElementById('post-default');
    if (fallback) {
      fallback.style.display = shown.length ? 'none' : '';
    }
  }

  function apply(lang){
    if (!VALID_LANGS.includes(lang)) {
      lang = DEFAULT_LANG;
    }

    document.documentElement.lang = lang;
    saveStoredLang(lang);

    var strings = (window.I18N_STRINGS && window.I18N_STRINGS[lang]) || {};
    applyI18n(strings);
    applyLangSelect(lang, strings);
    applyLegacyButtons(lang);
    applyLangTextBlocks(lang);
    applyPostLangContent(lang);

    var toggle = document.getElementById('theme-toggle');
    if (toggle && strings['btn.theme']) {
      toggle.setAttribute('aria-label', strings['btn.theme']);
      toggle.setAttribute('title', strings['btn.theme']);
    }

    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
    return lang;
  }

  function bindLanguageSelects(){
    document.querySelectorAll('[data-lang-select]').forEach(function(selectEl){
      if (selectEl.dataset.boundLangSelect === '1') {
        return;
      }
      selectEl.dataset.boundLangSelect = '1';
      selectEl.addEventListener('change', function(){
        apply(selectEl.value);
      });
    });
  }

  window.setLang = apply;
  window.applyLang = apply;

  function init(){
    bindLanguageSelects();
    var saved = readStoredLang();
    var browser = ((navigator.language || '').slice(0, 2) || '').toLowerCase();
    var initial = VALID_LANGS.includes(saved) ? saved : (VALID_LANGS.includes(browser) ? browser : DEFAULT_LANG);
    apply(initial);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
