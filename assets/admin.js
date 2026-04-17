(function(){
  'use strict';

  var homeUrl = '/';
  var apiBase = 'https://api.github.com';
  var repoConfig = {
    owner: 'kahnri',
    repo: 'kahnri.github.io',
    branch: 'main'
  };
  var tokenSessionKey = 'admin-publish-token-session-v2';
  var draftKey = 'admin-post-draft-v2';
  var validLangs = ['tr', 'de', 'en', 'nl', 'ja'];
  var reservedFrontMatterKeys = {
    layout: true,
    title: true,
    date: true,
    slug: true,
    permalink: true,
    tr: true,
    de: true,
    en: true,
    nl: true,
    ja: true
  };

  var titleEl = document.getElementById('admin-title');
  var dateEl = document.getElementById('admin-date');
  var slugEl = document.getElementById('admin-slug');
  var editorEl = document.getElementById('admin-content-editor');
  var fileEl = document.getElementById('admin-file');
  var currentFileLabelEl = document.getElementById('admin-current-file-label');
  var activeLangEl = document.getElementById('admin-active-language');
  var editingEl = document.getElementById('admin-editing');
  var statusEl = document.getElementById('admin-status');
  var tokenEl = document.getElementById('github-token');
  var modeLabelEl = document.getElementById('admin-mode-label');
  var sessionBadgeEl = document.getElementById('admin-session-badge');
  var postCountEl = document.getElementById('admin-post-count');
  var postsListEl = document.getElementById('admin-posts');
  var postsEmptyEl = document.getElementById('admin-posts-empty');
  var postSearchEl = document.getElementById('admin-post-search');

  if (
    !titleEl || !dateEl || !slugEl || !editorEl || !fileEl || !editingEl || !statusEl ||
    !tokenEl || !postsListEl || !postsEmptyEl
  ) {
    return;
  }

  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('[data-lang-tab]'));
  var busyButtonIds = ['admin-refresh', 'admin-save', 'admin-delete', 'admin-reset', 'admin-new'];
  var activeLang = 'tr';
  var contentByLang = emptyLanguageMap();
  var manualSlug = false;
  var editingPath = null;
  var editingSha = null;
  var extraFrontMatter = {};
  var extraFrontMatterOrder = [];
  var allPosts = [];
  var busyCounter = 0;
  var lastSavedSignature = '';
  var draftSaveTimer = null;

  function emptyLanguageMap(){
    return { tr: '', de: '', en: '', nl: '', ja: '' };
  }

  function currentSiteLang(){
    try {
      var stored = (localStorage.getItem('lang') || '').toLowerCase();
      if (validLangs.indexOf(stored) >= 0) return stored;
    } catch (e) {}

    var htmlLang = String(document.documentElement.lang || '').slice(0, 2).toLowerCase();
    if (validLangs.indexOf(htmlLang) >= 0) return htmlLang;
    return 'tr';
  }

  function formatText(text, vars){
    var result = String(text || '');
    if (!vars) return result;

    Object.keys(vars).forEach(function(key){
      result = result.split('{' + key + '}').join(String(vars[key]));
    });

    return result;
  }

  function t(key, fallback, vars){
    var lang = currentSiteLang();
    var strings = (window.I18N_STRINGS && window.I18N_STRINGS[lang]) || {};
    var base = strings[key] || fallback || key;
    return formatText(base, vars);
  }

  function escapeHtml(text){
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function slugify(text){
    return String(text || '')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function yamlEscape(text){
    return String(text || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function yamlValue(value){
    var text = String(value || '');
    if (!text.trim()) return '""';
    if (/^\[.*\]$/.test(text)) return text;
    if (/^(true|false|null|~)$/i.test(text)) return text.toLowerCase();
    if (/^-?\d+(\.\d+)?$/.test(text)) return text;
    if (/[:#]/.test(text) || /^\s|\s$/.test(text)) {
      return '"' + yamlEscape(text) + '"';
    }
    return text;
  }

  function toBase64Unicode(str){
    return btoa(unescape(encodeURIComponent(str)));
  }

  function fromBase64Unicode(str){
    return decodeURIComponent(escape(atob((str || '').replace(/\n/g, ''))));
  }

  function today(){
    var now = new Date();
    var year = String(now.getFullYear());
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function normalizeDateInput(value, fallback){
    var raw = String(value || '').trim();
    if (!raw) return fallback || today();

    var direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct && direct[1]) return direct[1];

    if (/^\d{4}\/\d{2}\/\d{2}$/.test(raw)) {
      return raw.replace(/\//g, '-');
    }

    var parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return fallback || today();
  }

  function encodePath(path){
    return String(path || '')
      .split('/')
      .map(function(part){ return encodeURIComponent(part); })
      .join('/');
  }

  function getToken(){
    return String(tokenEl.value || '').trim();
  }

  function loadSessionToken(){
    try {
      return String(sessionStorage.getItem(tokenSessionKey) || '');
    } catch (e) {
      return '';
    }
  }

  function saveSessionToken(value){
    try {
      var token = String(value || '').trim();
      if (!token) {
        sessionStorage.removeItem(tokenSessionKey);
        return;
      }
      sessionStorage.setItem(tokenSessionKey, token);
    } catch (e) {}
  }

  function setStatus(message, isError){
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ef4444' : '';
  }

  function setBusy(isBusy){
    busyButtonIds.forEach(function(id){
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = !!isBusy;
      btn.style.opacity = isBusy ? '0.7' : '';
      btn.style.cursor = isBusy ? 'wait' : '';
    });
  }

  function beginBusy(){
    busyCounter += 1;
    if (busyCounter === 1) setBusy(true);
  }

  function endBusy(){
    busyCounter = Math.max(0, busyCounter - 1);
    if (busyCounter === 0) setBusy(false);
  }

  async function withBusy(task){
    beginBusy();
    try {
      return await task();
    } finally {
      endBusy();
    }
  }

  function snapshotContentByLang(){
    var snapshot = emptyLanguageMap();
    validLangs.forEach(function(lang){
      snapshot[lang] = activeLang === lang ? editorEl.value : (contentByLang[lang] || '');
    });
    return snapshot;
  }

  function editorStateSnapshot(){
    return {
      title: String(titleEl.value || ''),
      date: String(dateEl.value || ''),
      slug: String(slugEl.value || ''),
      manualSlug: !!manualSlug,
      activeLang: activeLang,
      editingPath: editingPath || '',
      editingSha: editingSha || '',
      contentByLang: snapshotContentByLang(),
      extraFrontMatter: Object.assign({}, extraFrontMatter),
      extraFrontMatterOrder: Array.isArray(extraFrontMatterOrder) ? extraFrontMatterOrder.slice() : []
    };
  }

  function editorSignature(){
    try {
      return JSON.stringify(editorStateSnapshot());
    } catch (e) {
      return '';
    }
  }

  function hasUnsavedChanges(){
    return editorSignature() !== lastSavedSignature;
  }

  function currentEditingLabel(){
    return editingPath
      ? t('admin.msg.editing_path', 'Duzenleniyor: {path}', { path: editingPath })
      : t('admin.newpost', 'Yeni post');
  }

  function updateEditingLabel(){
    var label = currentEditingLabel();
    if (hasUnsavedChanges()) label += ' *';
    editingEl.textContent = label;
  }

  function markSavedBaseline(){
    lastSavedSignature = editorSignature();
    updateEditingLabel();
  }

  function hasMeaningfulDraft(snapshot){
    if (!snapshot || typeof snapshot !== 'object') return false;
    if (String(snapshot.title || '').trim()) return true;
    if (String(snapshot.slug || '').trim()) return true;
    if (String(snapshot.editingPath || '').trim()) return true;

    var langs = snapshot.contentByLang || {};
    return validLangs.some(function(lang){
      return String(langs[lang] || '').trim().length > 0;
    });
  }

  function loadDraftFromStorage(){
    try {
      var raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function clearDraftSaveTimer(){
    if (!draftSaveTimer) return;
    clearTimeout(draftSaveTimer);
    draftSaveTimer = null;
  }

  function clearDraftFromStorage(){
    clearDraftSaveTimer();
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {}
  }

  function saveDraftNow(){
    clearDraftSaveTimer();
    var snapshot = editorStateSnapshot();

    if (!hasMeaningfulDraft(snapshot)) {
      clearDraftFromStorage();
      return;
    }

    snapshot.updatedAt = new Date().toISOString();

    try {
      localStorage.setItem(draftKey, JSON.stringify(snapshot));
    } catch (e) {}
  }

  function scheduleDraftSave(){
    clearDraftSaveTimer();
    draftSaveTimer = setTimeout(saveDraftNow, 300);
  }

  function confirmDiscardChanges(){
    if (!hasUnsavedChanges()) return true;
    return window.confirm(
      t(
        'admin.msg.unsaved_confirm',
        'Kaydedilmemis degisiklikler var. Devam edersen kaybolabilir. Devam edilsin mi?'
      )
    );
  }

  function syncSessionUi(){
    var hasToken = !!getToken();
    if (sessionBadgeEl) {
      sessionBadgeEl.textContent = hasToken
        ? t('admin.session.active', 'Panel ici yayin acik')
        : t('admin.session.web', 'Web kaydetme modu');
      sessionBadgeEl.classList.toggle('is-active', hasToken);
    }
    if (modeLabelEl) {
      modeLabelEl.textContent = hasToken
        ? t('admin.mode.direct', 'Panel ici yayin')
        : t('admin.mode.web', 'Web kaydetme');
    }
  }

  function setTabState(){
    tabButtons.forEach(function(btn){
      var lang = btn.getAttribute('data-lang-tab');
      if (lang === activeLang) {
        btn.classList.remove('theme-button');
        btn.classList.add('theme-button-accent');
      } else {
        btn.classList.remove('theme-button-accent');
        btn.classList.add('theme-button');
      }
    });

    if (activeLangEl) {
      activeLangEl.textContent = t('admin.msg.editing_lang', 'Duzenlenen: {lang}', {
        lang: activeLang.toUpperCase()
      });
    }
  }

  function switchLang(nextLang){
    contentByLang[activeLang] = editorEl.value;
    activeLang = nextLang;
    editorEl.value = contentByLang[activeLang] || '';
    setTabState();
    build();
  }

  function syncAutoSlug(){
    if (manualSlug) return;
    slugEl.value = slugify(titleEl.value || '');
  }

  function normalizedSlug(slugText, titleText){
    var primary = slugify(slugText || '');
    if (primary) return primary;
    var fromTitle = slugify(titleText || '');
    return fromTitle || 'post';
  }

  function currentPath(){
    var title = (titleEl.value || '').trim() || 'untitled';
    var date = normalizeDateInput(dateEl.value, today());
    var slug = normalizedSlug(slugEl.value, title);
    return '_posts/' + date + '-' + slug + '.md';
  }

  function buildOutput(){
    contentByLang[activeLang] = editorEl.value;

    var title = (titleEl.value || '').trim() || 'Untitled';
    var date = normalizeDateInput(dateEl.value, today());
    var slug = normalizedSlug(slugEl.value, title);

    dateEl.value = date;
    if ((slugEl.value || '') !== slug) slugEl.value = slug;

    var lines = [
      '---',
      'layout: post',
      'title: "' + yamlEscape(title) + '"',
      'date: ' + date,
      'slug: ' + slug,
      'permalink: /blog/' + slug + '/'
    ];

    extraFrontMatterOrder.forEach(function(key){
      if (!key || reservedFrontMatterKeys[key]) return;

      var value = extraFrontMatter[key];
      if (value === undefined || value === null) return;

      var text = String(value);
      if (!text.trim()) return;

      if (text.indexOf('\n') >= 0) {
        lines.push(key + ': |');
        text.split('\n').forEach(function(line){
          lines.push('  ' + line);
        });
        return;
      }

      lines.push(key + ': ' + yamlValue(text));
    });

    validLangs.forEach(function(lang){
      var value = String(contentByLang[lang] || '').trim();
      if (!value) return;
      lines.push(lang + ': |');
      value.split('\n').forEach(function(line){
        lines.push('  ' + line);
      });
    });

    lines.push('---', '');
    return lines.join('\n');
  }

  function build(){
    var output = buildOutput();
    var path = currentPath();

    fileEl.textContent = path;
    if (currentFileLabelEl) currentFileLabelEl.textContent = path;

    updateEditingLabel();
    syncSessionUi();
    scheduleDraftSave();
    return output;
  }

  function validateForSave(){
    contentByLang[activeLang] = editorEl.value;

    var title = (titleEl.value || '').trim();
    if (!title) {
      throw new Error(t('admin.msg.title_required', 'Baslik gerekli.'));
    }

    var selectedDate = dateEl.value || today();
    if (selectedDate > today()) {
      throw new Error(t('admin.msg.future_date', 'Gelecek tarihli post varsayilan olarak blogda gorunmez. Tarihi bugun veya gecmis yapin.'));
    }

    var hasContent = validLangs.some(function(lang){
      return String(contentByLang[lang] || '').trim().length > 0;
    });

    if (!hasContent) {
      throw new Error(t('admin.msg.content_required', 'En az bir dilde icerik girin.'));
    }
  }

  function parseFrontMatter(text){
    var result = {};
    var lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    if (lines[0] !== '---') return result;

    var i = 1;
    while (i < lines.length) {
      var line = lines[i];
      if (line === '---') break;

      var match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (!match) {
        i += 1;
        continue;
      }

      var key = match[1];
      var value = match[2] || '';

      if (value === '|') {
        var block = [];
        i += 1;
        while (i < lines.length && lines[i] !== '---') {
          if (lines[i].startsWith('  ')) {
            block.push(lines[i].slice(2));
            i += 1;
            continue;
          }
          if (lines[i] === '') {
            block.push('');
            i += 1;
            continue;
          }
          break;
        }
        result[key] = block.join('\n').replace(/\n+$/, '');
        continue;
      }

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }

      result[key] = value;
      i += 1;
    }

    return result;
  }

  function fileMeta(path){
    var name = String(path || '').split('/').pop() || '';
    var match = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
    return {
      name: name,
      date: match ? match[1] : '',
      slug: match ? match[2] : name.replace(/\.md$/, '')
    };
  }

  function firstLang(content){
    if (content.tr) return 'tr';
    if (content.de) return 'de';
    if (content.en) return 'en';
    if (content.nl) return 'nl';
    if (content.ja) return 'ja';
    return 'tr';
  }

  function slugFromPermalink(permalink){
    var value = String(permalink || '').trim();
    if (!value) return '';
    var cleaned = value.replace(/\/+$/, '');
    var parts = cleaned.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function setEditorFromParsed(path, parsed, sha){
    var meta = fileMeta(path);
    var slugCandidate = parsed.slug || slugFromPermalink(parsed.permalink) || meta.slug || '';

    titleEl.value = parsed.title || '';
    dateEl.value = normalizeDateInput(parsed.date, meta.date || today());
    slugEl.value = slugCandidate;
    manualSlug = true;

    contentByLang = {
      tr: parsed.tr || '',
      de: parsed.de || '',
      en: parsed.en || '',
      nl: parsed.nl || '',
      ja: parsed.ja || ''
    };

    extraFrontMatter = {};
    extraFrontMatterOrder = [];
    Object.keys(parsed).forEach(function(key){
      if (reservedFrontMatterKeys[key]) return;
      extraFrontMatter[key] = parsed[key];
      extraFrontMatterOrder.push(key);
    });

    activeLang = firstLang(contentByLang);
    editorEl.value = contentByLang[activeLang] || '';
    editingPath = path;
    editingSha = sha || null;
    setTabState();
    build();
    clearDraftFromStorage();
    markSavedBaseline();
  }

  function applyDraftSnapshot(snapshot){
    if (!snapshot || typeof snapshot !== 'object') return false;

    titleEl.value = String(snapshot.title || '');
    dateEl.value = normalizeDateInput(snapshot.date, today());
    slugEl.value = String(snapshot.slug || '');
    manualSlug = !!snapshot.manualSlug && !!String(snapshot.slug || '').trim();

    var draftContent = snapshot.contentByLang || {};
    contentByLang = {
      tr: String(draftContent.tr || ''),
      de: String(draftContent.de || ''),
      en: String(draftContent.en || ''),
      nl: String(draftContent.nl || ''),
      ja: String(draftContent.ja || '')
    };

    extraFrontMatter = {};
    if (snapshot.extraFrontMatter && typeof snapshot.extraFrontMatter === 'object') {
      Object.keys(snapshot.extraFrontMatter).forEach(function(key){
        extraFrontMatter[key] = snapshot.extraFrontMatter[key];
      });
    }

    extraFrontMatterOrder = Array.isArray(snapshot.extraFrontMatterOrder)
      ? snapshot.extraFrontMatterOrder.filter(function(key){
          return typeof key === 'string' && key.length > 0;
        })
      : Object.keys(extraFrontMatter);

    activeLang = String(snapshot.activeLang || 'tr').toLowerCase();
    if (validLangs.indexOf(activeLang) < 0) activeLang = firstLang(contentByLang);

    editorEl.value = contentByLang[activeLang] || '';
    editingPath = String(snapshot.editingPath || '').trim() || null;
    editingSha = String(snapshot.editingSha || '').trim() || null;

    setTabState();
    build();
    updateEditingLabel();
    return true;
  }

  function maybeRestoreDraft(){
    var draft = loadDraftFromStorage();
    if (!hasMeaningfulDraft(draft)) {
      clearDraftFromStorage();
      return false;
    }

    var when = '';
    if (draft.updatedAt) {
      try {
        when = new Date(draft.updatedAt).toLocaleString(currentSiteLang());
      } catch (e) {
        when = '';
      }
    }

    var shouldRestore = window.confirm(
      t(
        'admin.msg.restore_draft',
        'Kaydedilmis yerel taslak bulundu{time}. Geri yuklensin mi?',
        { time: when ? (' (' + when + ')') : '' }
      )
    );

    if (!shouldRestore) {
      clearDraftFromStorage();
      return false;
    }

    if (!applyDraftSnapshot(draft)) {
      clearDraftFromStorage();
      return false;
    }

    setStatus(t('admin.msg.draft_restored', 'Yerel taslak geri yuklendi.'), false);
    return true;
  }

  async function githubRequest(path, method, token, body){
    async function runRequest(authHeaderValue){
      var headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      if (authHeaderValue) headers.Authorization = authHeaderValue;
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      var response = await fetch(apiBase + path, {
        method: method || 'GET',
        headers: headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });

      var payload = null;
      try {
        payload = await response.json();
      } catch (e) {
        payload = null;
      }

      return { response: response, payload: payload };
    }

    var result = await runRequest(token ? ('Bearer ' + token) : '');
    if (token && result.response && result.response.status === 401) {
      result = await runRequest('token ' + token);
    }

    if (!result.response.ok) {
      var message = result.payload && result.payload.message
        ? result.payload.message
        : ('GitHub API error ' + result.response.status);
      throw new Error(message);
    }

    return result.payload;
  }

  function repoWebBase(){
    return 'https://github.com/' + encodeURIComponent(repoConfig.owner) + '/' + encodeURIComponent(repoConfig.repo);
  }

  async function getContents(path, token){
    var route =
      '/repos/' + encodeURIComponent(repoConfig.owner) +
      '/' + encodeURIComponent(repoConfig.repo) +
      '/contents/' + encodePath(path) +
      '?ref=' + encodeURIComponent(repoConfig.branch);

    try {
      return await githubRequest(route, 'GET', token);
    } catch (e) {
      var message = String(e.message || '').toLowerCase();
      if (message.indexOf('404') >= 0 || message.indexOf('not found') >= 0) {
        return null;
      }
      throw e;
    }
  }

  async function putContents(path, content, message, sha, token){
    var route =
      '/repos/' + encodeURIComponent(repoConfig.owner) +
      '/' + encodeURIComponent(repoConfig.repo) +
      '/contents/' + encodePath(path);

    var body = {
      message: message,
      content: toBase64Unicode(content),
      branch: repoConfig.branch
    };

    if (sha) body.sha = sha;
    return githubRequest(route, 'PUT', token, body);
  }

  async function deleteContents(path, sha, message, token){
    var route =
      '/repos/' + encodeURIComponent(repoConfig.owner) +
      '/' + encodeURIComponent(repoConfig.repo) +
      '/contents/' + encodePath(path);

    return githubRequest(route, 'DELETE', token, {
      message: message,
      sha: sha,
      branch: repoConfig.branch
    });
  }

  async function fetchPosts(){
    var list = await getContents('_posts', '');
    if (!Array.isArray(list)) return [];

    return list
      .filter(function(item){
        return item && item.type === 'file' && String(item.name || '').endsWith('.md');
      })
      .sort(function(a, b){
        return String(b.name || '').localeCompare(String(a.name || ''));
      });
  }

  function renderPostsList(items){
    if (!Array.isArray(items) || !items.length) {
      postsListEl.innerHTML = '';
      postsEmptyEl.style.display = '';
      return;
    }

    postsEmptyEl.style.display = 'none';

    postsListEl.innerHTML = items.map(function(item){
      var meta = fileMeta(item.path || item.name || '');
      var selectedClass = editingPath === item.path ? ' is-selected' : '';

      return (
        '<article class="admin-post-card' + selectedClass + '" data-path="' + escapeHtml(item.path || '') + '" data-sha="' + escapeHtml(item.sha || '') + '" data-slug="' + escapeHtml(meta.slug || '') + '">' +
          '<div class="flex flex-wrap items-center justify-between gap-3">' +
            '<div>' +
              '<p class="admin-post-title">' + escapeHtml(meta.slug || item.name || '') + '</p>' +
              '<p class="text-sm theme-text-muted mt-1">' + escapeHtml(meta.date || '-') + '</p>' +
              '<p class="text-xs theme-text-muted mt-2">' + escapeHtml(item.path || '') + '</p>' +
            '</div>' +
            '<div class="admin-post-actions">' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="edit">' + escapeHtml(t('admin.action.edit', 'Duzenle')) + '</button>' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="view">' + escapeHtml(t('admin.action.view', 'Gor')) + '</button>' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="delete">' + escapeHtml(t('admin.action.delete', 'Sil')) + '</button>' +
            '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function applyPostFilter(){
    var needle = (postSearchEl && postSearchEl.value ? postSearchEl.value : '').trim().toLowerCase();
    if (!needle) {
      renderPostsList(allPosts);
      return;
    }

    var filtered = allPosts.filter(function(item){
      var meta = fileMeta(item.path || item.name || '');
      var hay = [String(item.name || ''), String(meta.slug || ''), String(meta.date || ''), String(item.path || '')]
        .join(' ')
        .toLowerCase();
      return hay.indexOf(needle) >= 0;
    });

    renderPostsList(filtered);
  }

  async function refreshPosts(options){
    options = options || {};
    var silent = !!options.silent;

    try {
      if (!silent) {
        setStatus(t('admin.msg.posts_loading', 'Postlar aliniyor...'), false);
      }

      var items = await fetchPosts();
      allPosts = items;

      if (postCountEl) postCountEl.textContent = String(items.length);
      applyPostFilter();

      if (!silent) {
        setStatus(t('admin.msg.posts_refreshed', 'Post listesi guncellendi.'), false);
      }
    } catch (e) {
      allPosts = [];
      if (postCountEl) postCountEl.textContent = '0';
      renderPostsList([]);
      setStatus(e.message || t('admin.msg.posts_load_failed', 'Post listesi alinamadi.'), true);
      throw e;
    }
  }

  async function loadPost(path){
    try {
      var file = await getContents(path, '');
      if (!file || !file.content) {
        throw new Error(t('admin.msg.content_read_failed', 'Dosya icerigi okunamadi.'));
      }

      var raw = fromBase64Unicode(file.content);
      var parsed = parseFrontMatter(raw);
      setEditorFromParsed(path, parsed, file.sha || null);
      applyPostFilter();
      setStatus(t('admin.msg.post_loaded', 'Post editore yuklendi.'), false);
      return true;
    } catch (e) {
      setStatus(e.message || t('admin.msg.post_load_failed', 'Post yuklenemedi.'), true);
      return false;
    }
  }

  function isLikelyGithubAuthError(error){
    var message = String(error && error.message ? error.message : error || '').toLowerCase();
    return (
      message.indexOf('401') >= 0 ||
      message.indexOf('403') >= 0 ||
      message.indexOf('bad credentials') >= 0 ||
      message.indexOf('resource not accessible') >= 0 ||
      message.indexOf('token') >= 0
    );
  }

  function openExternalPage(url){
    var popup = null;
    try {
      popup = window.open(url, '_blank', 'noopener');
    } catch (e) {
      popup = null;
    }

    if (!popup) {
      window.location.href = url;
      return false;
    }

    return true;
  }

  async function tryCopyText(value){
    if (!value || !navigator.clipboard || !navigator.clipboard.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function openWebSave(){
    var output = build();
    validateForSave();

    var path = currentPath();
    var message = editingPath && editingPath === path
      ? ('Update post: ' + path)
      : ('Create post: ' + path);

    if (!editingPath || editingPath !== path) {
      if (editingPath && editingPath !== path) {
        var shouldContinue = window.confirm(
          t(
            'admin.msg.web_rename_confirm',
            'Slug veya tarih degisti. Bu kayit yeni dosya olarak acilacak; eski dosyayi ayrica silmen gerekir. Devam edilsin mi?'
          )
        );
        if (!shouldContinue) {
          setStatus(t('admin.msg.publish_cancelled', 'Yayinlama iptal edildi.'), false);
          return;
        }
      }

      var params = new URLSearchParams();
      params.set('filename', path);
      params.set('message', message);
      params.set('value', output);

      var baseUrl = repoWebBase() + '/new/' + encodeURIComponent(repoConfig.branch);
      var url = baseUrl + '?' + params.toString();

      if (url.length > 7000) {
        params.delete('value');
        url = baseUrl + '?' + params.toString();
        var copiedLong = await tryCopyText(output);
        openExternalPage(url);
        setStatus(
          copiedLong
            ? t('admin.msg.web_new_long', 'Yeni dosya kaydetme sayfasi acildi. Icerik panoya kopyalandi; editora yapistirip kaydi tamamlayabilirsin.')
            : t('admin.msg.web_new_opened', 'Yeni dosya kaydetme sayfasi acildi. Gerekirse icerigi editora yapistirip kaydi tamamla.'),
          false
        );
        return;
      }

      openExternalPage(url);
      setStatus(t('admin.msg.web_new_opened', 'Yeni dosya kaydetme sayfasi acildi. Kaydi oradan tamamlayabilirsin.'), false);
      return;
    }

    var copied = await tryCopyText(output);
    openExternalPage(repoWebBase() + '/edit/' + encodeURIComponent(repoConfig.branch) + '/' + encodePath(editingPath));
    setStatus(
      copied
        ? t('admin.msg.web_edit_opened_copied', 'Duzenleme sayfasi acildi. Guncel icerik panoya kopyalandi.')
        : t('admin.msg.web_edit_opened', 'Duzenleme sayfasi acildi. Gerekirse guncel icerigi editora yapistirabilirsin.'),
      false
    );
  }

  function openWebDelete(path){
    if (!path) {
      setStatus(t('admin.msg.select_post_to_delete', 'Silinecek post secin.'), true);
      return;
    }

    if (!window.confirm(t('admin.msg.confirm_delete_current', 'Bu post silinsin mi?'))) {
      return;
    }

    openExternalPage(repoWebBase() + '/delete/' + encodeURIComponent(repoConfig.branch) + '/' + encodePath(path));
    setStatus(t('admin.msg.web_delete_opened', 'Silme sayfasi acildi. Onayi web kaydetme ekraninda tamamla.'), false);
  }

  async function publishPost(){
    var token = getToken();

    if (!token) {
      await openWebSave();
      return;
    }

    try {
      var output = build();
      validateForSave();

      var path = currentPath();
      var renaming = !!editingPath && editingPath !== path;
      var existing = await getContents(path, token);
      var sha = existing && existing.sha ? existing.sha : null;
      var oldPathSha = null;

      if (editingPath && !renaming && editingSha) {
        if (!existing || !existing.sha) {
          throw new Error(t('admin.msg.remote_deleted_reload', 'Dosya repo tarafinda silinmis. Once listeyi yenileyip postu tekrar acin.'));
        }
        if (existing.sha !== editingSha) {
          throw new Error(t('admin.msg.remote_changed_reload', 'Dosya repo tarafinda degismis. Uzerine yazmamak icin once postu yeniden yukleyin.'));
        }
        sha = editingSha;
      }

      if (editingPath && renaming && editingSha) {
        var sourceFile = await getContents(editingPath, token);
        if (!sourceFile || !sourceFile.sha) {
          throw new Error(t('admin.msg.rename_source_missing', 'Eski dosya repo tarafinda bulunamadi. Once listeyi yenileyin.'));
        }
        if (sourceFile.sha !== editingSha) {
          throw new Error(t('admin.msg.rename_source_changed', 'Eski dosya repo tarafinda degismis. Once postu yeniden yukleyin.'));
        }
        oldPathSha = sourceFile.sha;
      }

      if (existing && existing.sha && (!editingPath || renaming)) {
        if (!window.confirm(t('admin.msg.confirm_overwrite_target', 'Ayni isimde bir post zaten var. Uzerine yazilsin mi?'))) {
          setStatus(t('admin.msg.publish_cancelled', 'Yayinlama iptal edildi.'), false);
          return;
        }
      }

      var saveResponse = await putContents(path, output, (sha ? 'Update post: ' : 'Create post: ') + path, sha, token);

      if (editingPath && renaming) {
        try {
          var deleteSha = oldPathSha;
          if (!deleteSha) {
            var oldFile = await getContents(editingPath, token);
            if (oldFile && oldFile.sha) deleteSha = oldFile.sha;
          }
          if (deleteSha) {
            await deleteContents(editingPath, deleteSha, 'Delete old renamed post: ' + editingPath, token);
          }
        } catch (e) {}
      }

      editingPath = path;
      editingSha = saveResponse && saveResponse.content && saveResponse.content.sha
        ? saveResponse.content.sha
        : null;

      clearDraftFromStorage();
      markSavedBaseline();
      setStatus(t('admin.msg.published', 'Post kaydedildi ve yayinlandi.'), false);
      await refreshPosts({ silent: true });
      applyPostFilter();
    } catch (e) {
      if (isLikelyGithubAuthError(e)) {
        setStatus(
          t('admin.msg.publish_auth_fallback', 'Panel ici kayit basarisiz. Web kaydetme ekranina yonlendiriyorum.'),
          true
        );
        await openWebSave();
        return;
      }

      setStatus(e.message || t('admin.msg.publish_failed', 'Yayinlama basarisiz.'), true);
    }
  }

  async function deletePath(path, providedSha){
    var token = getToken();
    if (!token) {
      openWebDelete(path);
      return true;
    }

    var sha = providedSha;
    if (!sha) {
      var file = await getContents(path, token);
      if (!file || !file.sha) {
        throw new Error(t('admin.msg.delete_file_missing', 'Silinecek dosya bulunamadi.'));
      }
      sha = file.sha;
    }

    await deleteContents(path, sha, 'Delete post: ' + path, token);
    return false;
  }

  async function deleteCurrent(){
    if (!editingPath) {
      setStatus(t('admin.msg.select_post_to_delete', 'Silinecek post secin.'), true);
      return;
    }

    if (!getToken()) {
      openWebDelete(editingPath);
      return;
    }

    try {
      if (!window.confirm(t('admin.msg.confirm_delete_current', 'Bu post silinsin mi?'))) {
        return;
      }

      await deletePath(editingPath, editingSha);
      resetForm(false);
      setStatus(t('admin.msg.deleted', 'Post silindi.'), false);
      await refreshPosts({ silent: true });
      applyPostFilter();
    } catch (e) {
      if (isLikelyGithubAuthError(e)) {
        setStatus(
          t('admin.msg.delete_auth_fallback', 'Panel ici silme basarisiz. Web silme ekranina yonlendiriyorum.'),
          true
        );
        openWebDelete(editingPath);
        return;
      }

      setStatus(e.message || t('admin.msg.delete_failed', 'Silme basarisiz.'), true);
    }
  }

  function resetForm(promptUser){
    if (promptUser) {
      var message = hasUnsavedChanges()
        ? t('admin.msg.reset_confirm_dirty', 'Kaydedilmemis degisiklikler silinecek. Form temizlensin mi?')
        : t('admin.msg.reset_confirm', 'Form temizlensin mi?');
      if (!window.confirm(message)) return;
    }

    titleEl.value = '';
    dateEl.value = today();
    slugEl.value = '';
    manualSlug = false;
    contentByLang = emptyLanguageMap();
    extraFrontMatter = {};
    extraFrontMatterOrder = [];
    activeLang = 'tr';
    editorEl.value = '';
    editingPath = null;
    editingSha = null;

    setTabState();
    build();
    clearDraftFromStorage();
    markSavedBaseline();
    applyPostFilter();
    setStatus(t('admin.msg.editor_cleared', 'Editor temizlendi.'), false);
  }

  function lockAndExit(){
    if (!confirmDiscardChanges()) return;
    window.location.href = homeUrl;
  }

  async function handlePostsClick(event){
    var target = event.target;
    if (!target || !target.dataset || !target.dataset.action) return;

    var card = target.closest('[data-path]');
    if (!card) return;

    var action = target.dataset.action;
    var path = card.getAttribute('data-path');
    var sha = card.getAttribute('data-sha');
    var slug = card.getAttribute('data-slug');

    if (action === 'edit') {
      if (!confirmDiscardChanges()) return;
      await withBusy(function(){
        return loadPost(path);
      });
      return;
    }

    if (action === 'view') {
      if (slug) {
        openExternalPage('/blog/' + encodeURIComponent(slug) + '/');
      }
      return;
    }

    if (action === 'delete') {
      if (!getToken()) {
        openWebDelete(path);
        return;
      }

      if (!window.confirm(t('admin.msg.confirm_delete_selected', 'Secili post silinsin mi?'))) {
        return;
      }

      try {
        await withBusy(async function(){
          await deletePath(path, sha || null);
          if (editingPath === path) {
            resetForm(false);
          }
          setStatus(t('admin.msg.deleted_path', 'Post silindi: {path}', { path: path }), false);
          await refreshPosts({ silent: true });
          applyPostFilter();
        });
      } catch (e) {
        if (isLikelyGithubAuthError(e)) {
          setStatus(
            t('admin.msg.delete_auth_fallback', 'Panel ici silme basarisiz. Web silme ekranina yonlendiriyorum.'),
            true
          );
          openWebDelete(path);
          return;
        }

        setStatus(e.message || t('admin.msg.delete_failed', 'Silme basarisiz.'), true);
      }
    }
  }

  function initialize(){
    tokenEl.value = loadSessionToken();
    dateEl.value = today();

    setTabState();
    build();
    markSavedBaseline();
    syncSessionUi();

    setStatus(
      getToken()
        ? t('admin.msg.direct_mode_ready', 'Panel ici kaydetme ve silme hazir.')
        : t('admin.msg.readonly_mode', 'Yazilari acip duzenleyebilirsin. Kaydet ve sil eylemleri web kaydetme ekranina yonlenir.'),
      false
    );

    if (!maybeRestoreDraft()) {
      build();
      markSavedBaseline();
    }

    refreshPosts().catch(function(){});
  }

  titleEl.addEventListener('input', function(){
    syncAutoSlug();
    build();
  });

  dateEl.addEventListener('input', build);

  slugEl.addEventListener('input', function(){
    manualSlug = slugEl.value.trim().length > 0;
    build();
  });

  editorEl.addEventListener('input', build);

  tabButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      switchLang(btn.getAttribute('data-lang-tab'));
    });
  });

  tokenEl.addEventListener('input', function(){
    saveSessionToken(tokenEl.value);
    syncSessionUi();
  });

  if (postSearchEl) {
    postSearchEl.addEventListener('input', applyPostFilter);
  }

  var refreshBtn = document.getElementById('admin-refresh');
  var saveBtn = document.getElementById('admin-save');
  var deleteBtn = document.getElementById('admin-delete');
  var resetBtn = document.getElementById('admin-reset');
  var newBtn = document.getElementById('admin-new');
  var lockBtn = document.getElementById('admin-lock');
  var topLockBtn = document.getElementById('admin-logout-top');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function(){
      withBusy(refreshPosts).catch(function(){});
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', function(){
      withBusy(publishPost).catch(function(){});
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(){
      withBusy(deleteCurrent).catch(function(){});
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function(){
      resetForm(true);
    });
  }

  if (newBtn) {
    newBtn.addEventListener('click', function(){
      if (!confirmDiscardChanges()) return;
      resetForm(false);
    });
  }

  if (lockBtn) lockBtn.addEventListener('click', lockAndExit);
  if (topLockBtn) topLockBtn.addEventListener('click', lockAndExit);

  postsListEl.addEventListener('click', handlePostsClick);

  document.addEventListener('langchange', function(){
    setTabState();
    syncSessionUi();
    updateEditingLabel();
    applyPostFilter();
  });

  window.addEventListener('beforeunload', saveDraftNow);

  initialize();
})();
