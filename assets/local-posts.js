(function(global){
  'use strict';

  var STORAGE_KEY = 'local-posts-v1';
  var POST_URL = '/local-post.html';

  function readPosts(){
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data.map(normalizePost).filter(function(p){ return p.slug && p.title; });
    } catch (e) {
      return [];
    }
  }

  function normalizePost(p){
    var post = p || {};
    var content = post.content || {};
    return {
      id: String(post.id || post.slug || '').trim(),
      slug: String(post.slug || post.id || '').trim(),
      title: String(post.title || '').trim(),
      date: String(post.date || '').trim(),
      content: {
        tr: String(content.tr || ''),
        de: String(content.de || ''),
        en: String(content.en || ''),
        nl: String(content.nl || '')
      },
      createdAt: String(post.createdAt || ''),
      updatedAt: String(post.updatedAt || '')
    };
  }

  function sortPosts(posts){
    return posts.slice().sort(function(a, b){
      var ad = a.date || '';
      var bd = b.date || '';
      if (ad === bd) {
        return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      }
      return bd.localeCompare(ad);
    });
  }

  function escapeHtml(value){
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(dateStr){
    var parts = String(dateStr || '').split('-');
    if (parts.length === 3) {
      return parts[2] + '.' + parts[1] + '.' + parts[0];
    }
    return String(dateStr || '');
  }

  function currentLang(){
    try {
      return localStorage.getItem('lang') || document.documentElement.lang || 'tr';
    } catch (e) {
      return document.documentElement.lang || 'tr';
    }
  }

  function pickContent(post, lang){
    if (!post || !post.content) return '';
    if (lang && post.content[lang]) return post.content[lang];
    if (post.content.tr) return post.content.tr;
    if (post.content.de) return post.content.de;
    if (post.content.en) return post.content.en;
    if (post.content.nl) return post.content.nl;
    return '';
  }

  function excerpt(text, maxLen){
    var clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  }

  function renderRecent(targetId, emptyId, limit){
    var container = document.getElementById(targetId);
    if (!container) return;

    var posts = sortPosts(readPosts());
    if (typeof limit === 'number') {
      posts = posts.slice(0, limit);
    }

    if (!posts.length) return;

    var lang = currentLang();
    var html = posts.map(function(post){
      var content = pickContent(post, lang);
      return (
        '<article class="p-5 rounded-2xl border theme-card transition hover:-translate-y-0.5">' +
        '<h3 class="text-lg font-semibold">' +
        '<a class="hover:underline" href="' + POST_URL + '?slug=' + encodeURIComponent(post.slug) + '">' + escapeHtml(post.title) + '</a>' +
        '</h3>' +
        '<p class="theme-text-muted text-sm">' + escapeHtml(formatDate(post.date)) + '</p>' +
        (content ? '<p class="theme-text-soft mt-2">' + escapeHtml(excerpt(content, 140)) + '</p>' : '') +
        '<a class="inline-block mt-3 px-3 py-1 rounded-lg border theme-button transition" href="' + POST_URL + '?slug=' + encodeURIComponent(post.slug) + '">Read</a>' +
        '</article>'
      );
    }).join('');

    container.innerHTML = html;

    if (emptyId) {
      var empty = document.getElementById(emptyId);
      if (empty) empty.style.display = 'none';
    }
  }

  function renderBlogList(targetId, emptyId){
    var container = document.getElementById(targetId);
    if (!container) return;

    var posts = sortPosts(readPosts());
    if (!posts.length) return;

    var lang = currentLang();
    var html = posts.map(function(post){
      var content = pickContent(post, lang);
      var excerptText = content ? excerpt(content, 180) : '';
      return (
        '<article class="border rounded-2xl p-5 theme-card transition hover:-translate-y-0.5"' +
        ' data-title="' + escapeHtml(post.title.toLowerCase()) + '"' +
        ' data-text="' + escapeHtml(excerptText.toLowerCase()) + '">' +
        '<h2 class="text-xl font-semibold">' +
        '<a class="hover:underline" href="' + POST_URL + '?slug=' + encodeURIComponent(post.slug) + '">' + escapeHtml(post.title) + '</a>' +
        '</h2>' +
        '<p class="theme-text-muted text-sm">' + escapeHtml(formatDate(post.date)) + '</p>' +
        (excerptText ? '<p class="theme-text-soft mt-2">' + escapeHtml(excerptText) + '</p>' : '') +
        '<a class="inline-block mt-3 px-3 py-1 rounded-lg border theme-button transition" href="' + POST_URL + '?slug=' + encodeURIComponent(post.slug) + '">Read</a>' +
        '</article>'
      );
    }).join('');

    container.innerHTML = html + container.innerHTML;

    if (emptyId) {
      var empty = document.getElementById(emptyId);
      if (empty) empty.style.display = 'none';
    }
  }

  function renderPostPage(){
    var titleEl = document.getElementById('local-post-title');
    var dateEl = document.getElementById('local-post-date');
    var contentEl = document.getElementById('local-post-content');
    var missingEl = document.getElementById('local-post-missing');
    if (!titleEl || !dateEl || !contentEl) return;

    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');
    if (!slug) {
      if (missingEl) missingEl.style.display = '';
      return;
    }

    var posts = readPosts();
    var post = posts.find(function(p){ return p.slug === slug || p.id === slug; });
    if (!post) {
      if (missingEl) missingEl.style.display = '';
      return;
    }

    var lang = currentLang();
    var content = pickContent(post, lang);
    var safe = escapeHtml(content).replace(/\n/g, '<br>');

    titleEl.textContent = post.title;
    dateEl.textContent = formatDate(post.date);
    contentEl.innerHTML = safe || '<p class="theme-text-muted">No content for this language.</p>';

    if (missingEl) missingEl.style.display = 'none';
  }

  global.LocalPosts = {
    read: readPosts,
    renderRecent: renderRecent,
    renderBlogList: renderBlogList,
    renderPostPage: renderPostPage
  };
})(window);
