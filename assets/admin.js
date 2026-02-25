(function(){
  'use strict';

  var homeUrl = '/';
  var configKey = 'admin-github-config-v1';
  var tokenSessionKey = 'admin-github-token-session-v1';
  var apiBase = 'https://api.github.com';
  var fixedRepo = {
    owner: 'kahnri',
    repo: 'kahnri.github.io',
    branch: 'main'
  };

  var ownerEl = document.getElementById('github-owner');
  var repoEl = document.getElementById('github-repo');
  var branchEl = document.getElementById('github-branch');
  var tokenEl = document.getElementById('github-token');
  var connectionEl = document.getElementById('github-connection');
  var repoLabelEl = document.getElementById('admin-repo-label');

  var titleEl = document.getElementById('admin-title');
  var dateEl = document.getElementById('admin-date');
  var slugEl = document.getElementById('admin-slug');
  var editorEl = document.getElementById('admin-content-editor');
  var outputEl = document.getElementById('admin-output');
  var fileEl = document.getElementById('admin-file');
  var activeLangEl = document.getElementById('admin-active-language');
  var editingEl = document.getElementById('admin-editing');
  var statusEl = document.getElementById('admin-status');

  var postsListEl = document.getElementById('admin-posts');
  var postsEmptyEl = document.getElementById('admin-posts-empty');
  var postSearchEl = document.getElementById('admin-post-search');
  var realtimeToggleEl = document.getElementById('admin-realtime-toggle');
  var realtimeStampEl = document.getElementById('admin-realtime-stamp');

  if (!ownerEl || !repoEl || !branchEl || !tokenEl || !titleEl || !dateEl || !slugEl || !editorEl || !outputEl || !fileEl || !activeLangEl || !statusEl || !postsListEl || !postsEmptyEl) {
    return;
  }

  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('[data-lang-tab]'));
  var activeLang = 'tr';
  var contentByLang = { tr: '', de: '', en: '', nl: '', ja: '' };
  var manualSlug = false;
  var editingPath = null;
  var editingSha = null;
  var extraFrontMatter = {};
  var extraFrontMatterOrder = [];
  var allPosts = [];
  var lastPostsFingerprint = '';
  var lastRealtimeSyncAt = null;
  var busyCounter = 0;
  var realtimeTimer = null;
  var realtimeActiveRequest = null;
  var realtimeKey = 'admin-realtime-enabled-v1';
  var realtimeIntervalMs = 12000;
  var realtimePublicIntervalMs = 90000;
  var realtimeEnabled = readRealtimePreference();
  var draftKey = 'admin-post-draft-v1';
  var draftSaveTimer = null;
  var lastSavedSignature = '';

  var busyButtonIds = [
    'github-test',
    'admin-refresh',
    'admin-save',
    'admin-delete',
    'admin-build',
    'admin-copy',
    'admin-download',
    'admin-reset'
  ];

  function readRealtimePreference(){
    try {
      var raw = localStorage.getItem(realtimeKey);
      if (raw === null) return true;
      return raw === '1';
    } catch (e) {
      return true;
    }
  }

  function saveRealtimePreference(enabled){
    try {
      localStorage.setItem(realtimeKey, enabled ? '1' : '0');
    } catch (e) {}
  }

  function currentSiteLang(){
    try {
      var stored = (localStorage.getItem('lang') || '').toLowerCase();
      if (stored === 'tr' || stored === 'de' || stored === 'en' || stored === 'nl' || stored === 'ja') {
        return stored;
      }
    } catch (e) {}

    var htmlLang = String(document.documentElement.lang || '').slice(0, 2).toLowerCase();
    if (htmlLang === 'tr' || htmlLang === 'de' || htmlLang === 'en' || htmlLang === 'nl' || htmlLang === 'ja') {
      return htmlLang;
    }
    return 'tr';
  }

  function formatText(text, vars){
    var result = String(text || '');
    if (!vars) return result;
    Object.keys(vars).forEach(function(key){
      var token = '{' + key + '}';
      result = result.split(token).join(String(vars[key]));
    });
    return result;
  }

  function t(key, fallback, vars){
    var lang = currentSiteLang();
    var strings = (window.I18N_STRINGS && window.I18N_STRINGS[lang]) || {};
    var base = strings[key] || fallback || key;
    return formatText(base, vars);
  }

  function formatSyncTime(date){
    if (!date) return '';
    try {
      return date.toLocaleTimeString(currentSiteLang(), {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return date.toLocaleTimeString();
    }
  }

  function setStatus(message, isError){
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ef4444' : '';
  }

  function setConnectionStatus(message, isError){
    connectionEl.textContent = message;
    connectionEl.style.color = isError ? '#ef4444' : '';
  }

  function setRealtimeStamp(message, isError){
    if (!realtimeStampEl) return;
    realtimeStampEl.textContent = message || '';
    realtimeStampEl.style.color = isError ? '#ef4444' : '';
  }

  function postListFingerprint(items){
    return (items || []).map(function(item){
      return String(item.path || item.name || '') + '@' + String(item.sha || '');
    }).join('|');
  }

  function updateRealtimeStamp(){
    if (!realtimeStampEl) return;

    if (!realtimeEnabled) {
      setRealtimeStamp(t('admin.realtime.off', 'Canli senkronizasyon kapali.'), false);
      return;
    }

    if (lastRealtimeSyncAt) {
      setRealtimeStamp(
        t('admin.realtime.last_sync', 'Canli senkron: son kontrol {time}', {
          time: formatSyncTime(lastRealtimeSyncAt)
        }),
        false
      );
      return;
    }

    if (tokenEl.value.trim()) {
      setRealtimeStamp(t('admin.msg.posts_loading', 'Repo postlari aliniyor...'), false);
      return;
    }

    setRealtimeStamp(t('admin.realtime.public_mode', 'Canli senkron acik (token yok: sadece okuma modu).'), false);
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

  function applyWriteActionState(){
    var hasToken = !!tokenEl.value.trim();
    ['admin-save', 'admin-delete'].forEach(function(id){
      var btn = document.getElementById(id);
      if (!btn) return;
      if (busyCounter > 0) return;

      if (hasToken) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.removeAttribute('title');
      } else {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.setAttribute('title', t('admin.msg.token_actions_locked', 'Yayinlama/silme icin token girin.'));
      }
    });
  }

  function beginBusy(){
    busyCounter += 1;
    if (busyCounter === 1) {
      setBusy(true);
    }
  }

  function endBusy(){
    busyCounter = Math.max(0, busyCounter - 1);
    if (busyCounter === 0) {
      setBusy(false);
      applyWriteActionState();
    }
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
    return {
      tr: activeLang === 'tr' ? editorEl.value : (contentByLang.tr || ''),
      de: activeLang === 'de' ? editorEl.value : (contentByLang.de || ''),
      en: activeLang === 'en' ? editorEl.value : (contentByLang.en || ''),
      nl: activeLang === 'nl' ? editorEl.value : (contentByLang.nl || ''),
      ja: activeLang === 'ja' ? editorEl.value : (contentByLang.ja || '')
    };
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

  function currentEditingLabel(){
    return editingPath
      ? t('admin.msg.editing_path', 'Duzenleniyor: {path}', { path: editingPath })
      : t('admin.newpost', 'Yeni post');
  }

  function hasUnsavedChanges(){
    return editorSignature() !== lastSavedSignature;
  }

  function updateEditingLabel(){
    if (!editingEl) return;
    var label = currentEditingLabel();
    if (hasUnsavedChanges()) {
      label += ' *';
    }
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
    if (Array.isArray(snapshot.extraFrontMatterOrder) && snapshot.extraFrontMatterOrder.length) return true;

    var langs = snapshot.contentByLang || {};
    return ['tr', 'de', 'en', 'nl', 'ja'].some(function(lang){
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
    draftSaveTimer = setTimeout(function(){
      saveDraftNow();
    }, 300);
  }

  function confirmDiscardChanges(){
    if (!hasUnsavedChanges()) return true;
    return window.confirm(
      t(
        'admin.msg.unsaved_confirm',
        'Kaydedilmemis degisiklikler var. Devam ederseniz kaybolabilir. Devam edilsin mi?'
      )
    );
  }

  function slugify(text){
    return text
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

  function escapeHtml(text){
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    if (direct && direct[1]) {
      return direct[1];
    }

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

  function loadTokenFromSession(){
    try {
      return String(sessionStorage.getItem(tokenSessionKey) || '');
    } catch (e) {
      return '';
    }
  }

  function saveTokenToSession(value){
    try {
      var token = String(value || '').trim();
      if (!token) {
        sessionStorage.removeItem(tokenSessionKey);
        return;
      }
      sessionStorage.setItem(tokenSessionKey, token);
    } catch (e) {}
  }

  function updateRepoLabel(){
    if (!repoLabelEl) return;
    var owner = ownerEl.value.trim() || fixedRepo.owner;
    var repo = repoEl.value.trim() || fixedRepo.repo;
    var branch = branchEl.value.trim() || fixedRepo.branch;
    repoLabelEl.textContent = owner + '/' + repo + ' @ ' + branch;
  }

  function loadConfig(){
    var defaults = {
      owner: fixedRepo.owner,
      repo: fixedRepo.repo,
      branch: fixedRepo.branch
    };

    try {
      var raw = localStorage.getItem(configKey);
      if (!raw) return defaults;
      var parsed = JSON.parse(raw);
      return {
        owner: String(parsed.owner || defaults.owner),
        repo: String(parsed.repo || defaults.repo),
        branch: String(parsed.branch || defaults.branch)
      };
    } catch (e) {
      return defaults;
    }
  }

  function saveConfig(){
    var payload = {
      owner: ownerEl.value.trim(),
      repo: repoEl.value.trim(),
      branch: branchEl.value.trim()
    };

    try {
      localStorage.setItem(configKey, JSON.stringify(payload));
    } catch (e) {}
  }

  function getConfig(requireToken){
    var config = {
      owner: ownerEl.value.trim() || fixedRepo.owner,
      repo: repoEl.value.trim() || fixedRepo.repo,
      branch: branchEl.value.trim() || fixedRepo.branch,
      token: tokenEl.value.trim()
    };

    ownerEl.value = config.owner;
    repoEl.value = config.repo;
    branchEl.value = config.branch;

    if (requireToken && !config.token) {
      throw new Error(t('admin.msg.token_required', 'GitHub token gerekli.'));
    }

    return config;
  }

  async function githubRequest(path, method, token, body){
    var headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

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

    if (!response.ok) {
      var message = payload && payload.message ? payload.message : ('GitHub API error ' + response.status);
      throw new Error(message);
    }

    return payload;
  }

  async function getRepo(config){
    return githubRequest('/repos/' + encodeURIComponent(config.owner) + '/' + encodeURIComponent(config.repo), 'GET', config.token);
  }

  async function getContents(config, path){
    var route = '/repos/' + encodeURIComponent(config.owner) + '/' + encodeURIComponent(config.repo) + '/contents/' + encodePath(path) + '?ref=' + encodeURIComponent(config.branch);
    try {
      return await githubRequest(route, 'GET', config.token);
    } catch (e) {
      if (String(e.message || '').indexOf('404') >= 0 || String(e.message || '').toLowerCase().indexOf('not found') >= 0) {
        return null;
      }
      throw e;
    }
  }

  async function putContents(config, path, content, message, sha){
    var route = '/repos/' + encodeURIComponent(config.owner) + '/' + encodeURIComponent(config.repo) + '/contents/' + encodePath(path);
    var body = {
      message: message,
      content: toBase64Unicode(content),
      branch: config.branch
    };
    if (sha) {
      body.sha = sha;
    }
    return githubRequest(route, 'PUT', config.token, body);
  }

  async function deleteContents(config, path, sha, message){
    var route = '/repos/' + encodeURIComponent(config.owner) + '/' + encodeURIComponent(config.repo) + '/contents/' + encodePath(path);
    return githubRequest(route, 'DELETE', config.token, {
      message: message,
      sha: sha,
      branch: config.branch
    });
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
    activeLangEl.textContent = t('admin.msg.editing_lang', 'Editing: {lang}', { lang: activeLang.toUpperCase() });
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
    var date = dateEl.value || today();
    var slug = normalizedSlug(slugEl.value, title);
    return '_posts/' + date + '-' + slug + '.md';
  }

  function build(){
    contentByLang[activeLang] = editorEl.value;

    var title = (titleEl.value || '').trim() || 'Untitled';
    var date = dateEl.value || today();
    var slug = normalizedSlug(slugEl.value, title);
    if ((slugEl.value || '') !== slug) {
      slugEl.value = slug;
    }

    var lines = [
      '---',
      'layout: post',
      'title: "' + yamlEscape(title) + '"',
      'date: ' + date,
      'slug: ' + slug,
      'permalink: /blog/' + slug + '/'
    ];

    extraFrontMatterOrder.forEach(function(key){
      if (!key || key === 'layout' || key === 'title' || key === 'date' || key === 'slug' || key === 'permalink') {
        return;
      }

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

    ['tr', 'de', 'en', 'nl', 'ja'].forEach(function(lang){
      var value = (contentByLang[lang] || '').trim();
      if (!value) return;
      lines.push(lang + ': |');
      value.split('\n').forEach(function(line){
        lines.push('  ' + line);
      });
    });

    lines.push('---', '');

    outputEl.value = lines.join('\n');
    fileEl.textContent = currentPath();
    updateEditingLabel();
    scheduleDraftSave();
  }

  function validateForSave(){
    var title = (titleEl.value || '').trim();
    if (!title) {
      throw new Error(t('admin.msg.title_required', 'Title gerekli.'));
    }

    var selectedDate = dateEl.value || today();
    if (selectedDate > today()) {
      throw new Error(t('admin.msg.future_date', 'Gelecek tarihli post varsayilan olarak blogda gorunmez. Tarihi bugun veya gecmis yapin.'));
    }

    var hasContent = ['tr', 'de', 'en', 'nl', 'ja'].some(function(lang){
      return (contentByLang[lang] || '').trim().length > 0;
    });

    if (!hasContent) {
      throw new Error(t('admin.msg.content_required', 'En az bir dilde icerik girin.'));
    }
  }

  function copyOutput(){
    if (!outputEl.value) return;
    navigator.clipboard.writeText(outputEl.value).then(function(){
      var btn = document.getElementById('admin-copy');
      if (!btn) return;
      var prev = btn.textContent;
      btn.textContent = t('admin.msg.copy_done', 'Kopyalandi');
      setTimeout(function(){ btn.textContent = prev; }, 1200);
    }).catch(function(){
      setStatus(t('admin.msg.copy_failed', 'Kopyalama basarisiz.'), true);
    });
  }

  function downloadOutput(){
    if (!outputEl.value) return;
    var filename = currentPath().replace(/^_posts\//, '');
    var blob = new Blob([outputEl.value], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 0);
  }

  function resetForm(promptUser){
    if (promptUser) {
      var resetPromptKey = hasUnsavedChanges() ? 'admin.msg.reset_confirm_dirty' : 'admin.msg.reset_confirm';
      var resetPromptText = hasUnsavedChanges()
        ? 'Kaydedilmemis degisiklikler silinecek. Form temizlensin mi?'
        : 'Form temizlensin mi?';
      if (!window.confirm(t(resetPromptKey, resetPromptText))) {
        return;
      }
    }

    titleEl.value = '';
    dateEl.value = today();
    slugEl.value = '';
    manualSlug = false;
    contentByLang = { tr: '', de: '', en: '', nl: '', ja: '' };
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
    setStatus(t('admin.msg.editor_cleared', 'Editor temizlendi.'), false);
  }

  function lockAndExit(){
    if (!confirmDiscardChanges()) return;
    window.location.href = homeUrl;
  }

  function parseFrontMatter(text){
    var result = {};
    var lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    if (lines[0] !== '---') {
      return result;
    }

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
    var m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
    return {
      name: name,
      date: m ? m[1] : '',
      slug: m ? m[2] : name.replace(/\.md$/, '')
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
    var reserved = {
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

    var meta = fileMeta(path);
    var slugCandidate = parsed.slug || slugFromPermalink(parsed.permalink) || meta.slug || '';
    var normalizedDate = normalizeDateInput(parsed.date, meta.date || today());

    titleEl.value = parsed.title || '';
    dateEl.value = normalizedDate;
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
      if (reserved[key]) return;
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
    if (['tr', 'de', 'en', 'nl', 'ja'].indexOf(activeLang) < 0) {
      activeLang = firstLang(contentByLang);
    }

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

  async function testConnection(){
    try {
      var config = getConfig(false);
      saveConfig();
      var repo = await getRepo(config);
      setConnectionStatus(t('admin.connection.connected', 'Bagli: {repo} @ {branch}', { repo: repo.full_name, branch: config.branch }), false);
      setStatus(t('admin.msg.connection_ok', 'GitHub baglantisi basarili.'), false);
    } catch (e) {
      setConnectionStatus(t('admin.connection.error', 'Hata'), true);
      setStatus(e.message || t('admin.msg.connection_error', 'Baglanti hatasi.'), true);
    }
  }

  async function fetchPosts(){
    var config = getConfig(false);
    saveConfig();

    var list = await getContents(config, '_posts');
    if (!Array.isArray(list)) {
      return [];
    }

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
      var safeName = escapeHtml(item.name || '');
      var safePath = escapeHtml(item.path || '');
      var safeSha = escapeHtml(item.sha || '');
      var safeSlug = escapeHtml(meta.slug || '');

      return (
        '<div class="p-3 rounded-xl border theme-card" data-path="' + safePath + '" data-sha="' + safeSha + '" data-slug="' + safeSlug + '">' +
          '<div class="flex flex-wrap items-center justify-between gap-3">' +
            '<div>' +
              '<p class="font-semibold">' + safeName + '</p>' +
              '<p class="text-sm theme-text-muted">' + (meta.date || '-') + ' · ' + (meta.slug || '-') + '</p>' +
            '</div>' +
            '<div class="flex flex-wrap gap-2">' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="edit">' + escapeHtml(t('admin.action.edit', 'Edit')) + '</button>' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="view">' + escapeHtml(t('admin.action.view', 'View')) + '</button>' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="delete">' + escapeHtml(t('admin.action.delete', 'Delete')) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
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
      var hay = [String(item.name || ''), String(meta.slug || ''), String(meta.date || '')].join(' ').toLowerCase();
      return hay.indexOf(needle) >= 0;
    });

    renderPostsList(filtered);
  }

  async function refreshPosts(options){
    options = options || {};
    var silent = !!options.silent;
    var source = options.source || 'manual';

    try {
      if (!silent) {
        setStatus(t('admin.msg.posts_loading', 'Repo postlari aliniyor...'), false);
      }
      var items = await fetchPosts();
      var fingerprint = postListFingerprint(items);
      var changed = fingerprint !== lastPostsFingerprint;

      allPosts = items;
      lastPostsFingerprint = fingerprint;
      applyPostFilter();
      lastRealtimeSyncAt = new Date();
      updateRealtimeStamp();

      if (!silent) {
        setStatus(t('admin.msg.posts_refreshed', 'Repo postlari guncellendi.'), false);
      } else if (source === 'realtime' && changed) {
        setStatus(t('admin.msg.live_updated', 'Canli senkron: repo postlari guncellendi.'), false);
      }

      setConnectionStatus(
        t('admin.connection.connected', 'Bagli: {repo} @ {branch}', {
          repo: ownerEl.value.trim() + '/' + repoEl.value.trim(),
          branch: branchEl.value.trim()
        }),
        false
      );

      return { changed: changed, count: items.length };
    } catch (e) {
      if (!silent) {
        allPosts = [];
        lastPostsFingerprint = '';
        renderPostsList([]);
        setConnectionStatus(t('admin.connection.error', 'Hata'), true);
        setStatus(e.message || t('admin.msg.posts_load_failed', 'Post listesi alinamadi.'), true);
      } else {
        setRealtimeStamp(
          t('admin.realtime.sync_error', 'Canli senkron hatasi: {message}', {
            message: e.message || t('admin.msg.posts_load_failed', 'Post listesi alinamadi.')
          }),
          true
        );
      }
      throw e;
    }
  }

  async function runRealtimeSync(){
    if (!realtimeEnabled) {
      updateRealtimeStamp();
      return;
    }
    if (busyCounter > 0 || realtimeActiveRequest) {
      return;
    }

    realtimeActiveRequest = refreshPosts({ silent: true, source: 'realtime' })
      .catch(function(){})
      .finally(function(){
        realtimeActiveRequest = null;
      });

    await realtimeActiveRequest;
  }

  function stopRealtimeSync(){
    if (realtimeTimer) {
      clearInterval(realtimeTimer);
      realtimeTimer = null;
    }
  }

  function startRealtimeSync(){
    stopRealtimeSync();
    updateRealtimeStamp();

    if (!realtimeEnabled) {
      return;
    }

    runRealtimeSync();
    var intervalMs = tokenEl.value.trim() ? realtimeIntervalMs : realtimePublicIntervalMs;
    realtimeTimer = setInterval(function(){
      runRealtimeSync();
    }, intervalMs);
  }

  function applyRealtimePreference(nextEnabled){
    realtimeEnabled = !!nextEnabled;
    saveRealtimePreference(realtimeEnabled);

    if (realtimeToggleEl) {
      realtimeToggleEl.checked = realtimeEnabled;
    }

    if (realtimeEnabled) {
      startRealtimeSync();
    } else {
      stopRealtimeSync();
      updateRealtimeStamp();
    }
  }

  async function loadPost(path){
    try {
      var config = getConfig(false);
      var file = await getContents(config, path);
      if (!file || !file.content) {
        throw new Error(t('admin.msg.content_read_failed', 'Dosya icerigi okunamadi.'));
      }

      var raw = fromBase64Unicode(file.content);
      var parsed = parseFrontMatter(raw);
      setEditorFromParsed(path, parsed, file.sha || null);
      setStatus(t('admin.msg.post_loaded', 'Post editora yuklendi.'), false);
    } catch (e) {
      setStatus(e.message || t('admin.msg.post_load_failed', 'Post yuklenemedi.'), true);
    }
  }

  async function deletePath(path, providedSha){
    var config = getConfig(true);
    var sha = providedSha;

    if (!sha) {
      var file = await getContents(config, path);
      if (!file || !file.sha) {
        throw new Error(t('admin.msg.delete_file_missing', 'Silinecek dosya bulunamadi.'));
      }
      sha = file.sha;
    }

    await deleteContents(config, path, sha, 'Delete post: ' + path);
  }

  async function publishPost(){
    try {
      contentByLang[activeLang] = editorEl.value;
      validateForSave();
      build();

      var config = getConfig(true);
      saveConfig();

      var path = currentPath();
      var renaming = !!editingPath && editingPath !== path;
      var existing = await getContents(config, path);
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
        var sourceFile = await getContents(config, editingPath);
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

      var saveResponse = await putContents(config, path, outputEl.value, (sha ? 'Update post: ' : 'Create post: ') + path, sha);

      if (editingPath && renaming) {
        try {
          var deleteSha = oldPathSha;
          if (!deleteSha) {
            var oldFile = await getContents(config, editingPath);
            if (oldFile && oldFile.sha) {
              deleteSha = oldFile.sha;
            }
          }
          if (deleteSha) {
            await deleteContents(config, editingPath, deleteSha, 'Delete old renamed post: ' + editingPath);
          }
        } catch (e) {}
      }

      editingPath = path;
      editingSha = saveResponse && saveResponse.content && saveResponse.content.sha ? saveResponse.content.sha : null;
      clearDraftFromStorage();
      markSavedBaseline();
      setStatus(t('admin.msg.published', 'Post GitHub\\'a yazildi. Pages build sonrasi herkese acik olacak.'), false);
      await refreshPosts();
    } catch (e) {
      setStatus(e.message || t('admin.msg.publish_failed', 'Yayinlama basarisiz.'), true);
    }
  }

  async function deleteCurrent(){
    try {
      var path = editingPath || currentPath();
      if (!path || path === '_posts/') {
        throw new Error(t('admin.msg.select_post_to_delete', 'Silinecek post secin.'));
      }

      if (!window.confirm(t('admin.msg.confirm_delete_current', 'Bu post GitHub\\'dan silinsin mi?'))) {
        return;
      }

      await deletePath(path, editingPath === path ? editingSha : null);
      resetForm(false);
      setStatus(t('admin.msg.deleted', 'Post GitHub\\'dan silindi.'), false);
      await refreshPosts();
    } catch (e) {
      setStatus(e.message || t('admin.msg.delete_failed', 'Silme basarisiz.'), true);
    }
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
      if (!confirmDiscardChanges()) {
        return;
      }
      await withBusy(function(){
        return loadPost(path);
      });
      return;
    }

    if (action === 'view') {
      window.open('/blog/' + encodeURIComponent(slug) + '/', '_blank');
      return;
    }

    if (action === 'delete') {
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
          await refreshPosts();
        });
      } catch (e) {
        setStatus(e.message || t('admin.msg.delete_failed', 'Silme basarisiz.'), true);
      }
    }
  }

  function initialize(){
    var saved = loadConfig();
    ownerEl.value = saved.owner;
    repoEl.value = saved.repo;
    branchEl.value = saved.branch;
    tokenEl.value = loadTokenFromSession();

    dateEl.value = today();
    setTabState();
    build();
    markSavedBaseline();
    setStatus(t('admin.status.ready', 'Hazir'), false);
    setConnectionStatus(t('admin.connection.not_ready', 'Hazir degil'), false);

    if (realtimeToggleEl) {
      realtimeToggleEl.checked = realtimeEnabled;
    }
    updateRepoLabel();
    applyWriteActionState();
    if (!tokenEl.value.trim()) {
      setStatus(t('admin.msg.readonly_mode', 'Listeleme ve duzenleme acik. Yayinlama ve silme icin token girin.'), false);
    }
    updateRealtimeStamp();
    maybeRestoreDraft();
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

  var testBtn = document.getElementById('github-test');
  var refreshBtn = document.getElementById('admin-refresh');
  var saveBtn = document.getElementById('admin-save');
  var deleteBtn = document.getElementById('admin-delete');
  var buildBtn = document.getElementById('admin-build');
  var copyBtn = document.getElementById('admin-copy');
  var downloadBtn = document.getElementById('admin-download');
  var resetBtn = document.getElementById('admin-reset');
  var lockBtn = document.getElementById('admin-lock');
  var topLockBtn = document.getElementById('admin-logout-top');

  if (testBtn) testBtn.addEventListener('click', function(){
    withBusy(testConnection).catch(function(){});
  });
  if (refreshBtn) refreshBtn.addEventListener('click', function(){
    withBusy(refreshPosts).catch(function(){});
  });
  if (saveBtn) saveBtn.addEventListener('click', function(){
    withBusy(publishPost).catch(function(){});
  });
  if (deleteBtn) deleteBtn.addEventListener('click', function(){
    withBusy(deleteCurrent).catch(function(){});
  });
  if (buildBtn) buildBtn.addEventListener('click', build);
  if (copyBtn) copyBtn.addEventListener('click', copyOutput);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadOutput);
  if (resetBtn) resetBtn.addEventListener('click', function(){ resetForm(true); });
  if (lockBtn) lockBtn.addEventListener('click', lockAndExit);
  if (topLockBtn) topLockBtn.addEventListener('click', lockAndExit);
  if (postSearchEl) postSearchEl.addEventListener('input', applyPostFilter);
  if (realtimeToggleEl) realtimeToggleEl.addEventListener('change', function(){
    applyRealtimePreference(realtimeToggleEl.checked);
  });

  [ownerEl, repoEl, branchEl].forEach(function(el){
    el.addEventListener('change', function(){
      saveConfig();
      updateRepoLabel();
      if (realtimeEnabled) {
        startRealtimeSync();
      } else {
        updateRealtimeStamp();
      }
    });
  });

  tokenEl.addEventListener('input', function(){
    saveTokenToSession(tokenEl.value);
    applyWriteActionState();
    updateRealtimeStamp();
  });

  tokenEl.addEventListener('change', function(){
    saveTokenToSession(tokenEl.value);
    applyWriteActionState();
    if (realtimeEnabled) {
      startRealtimeSync();
    } else {
      updateRealtimeStamp();
    }
  });

  postsListEl.addEventListener('click', handlePostsClick);
  document.addEventListener('langchange', function(){
    setTabState();
    updateEditingLabel();
    applyWriteActionState();
    updateRepoLabel();
    applyPostFilter();
    updateRealtimeStamp();
  });

  initialize();
  withBusy(function(){
    return refreshPosts();
  }).catch(function(){});
  startRealtimeSync();

  window.addEventListener('focus', function(){
    runRealtimeSync();
  });

  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') {
      runRealtimeSync();
    }
  });

  window.addEventListener('beforeunload', function(event){
    if (hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
      saveDraftNow();
    } else {
      clearDraftSaveTimer();
    }
    stopRealtimeSync();
  });
})();
