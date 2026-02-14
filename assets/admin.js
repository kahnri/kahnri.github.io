(function(){
  'use strict';

  var homeUrl = '/';
  var configKey = 'admin-github-config-v1';
  var apiBase = 'https://api.github.com';

  var ownerEl = document.getElementById('github-owner');
  var repoEl = document.getElementById('github-repo');
  var branchEl = document.getElementById('github-branch');
  var tokenEl = document.getElementById('github-token');
  var connectionEl = document.getElementById('github-connection');

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

  if (!ownerEl || !repoEl || !branchEl || !tokenEl || !titleEl || !dateEl || !slugEl || !editorEl || !outputEl || !fileEl || !activeLangEl || !statusEl || !postsListEl || !postsEmptyEl) {
    return;
  }

  var tabButtons = Array.prototype.slice.call(document.querySelectorAll('[data-lang-tab]'));
  var activeLang = 'tr';
  var contentByLang = { tr: '', de: '', en: '', nl: '' };
  var manualSlug = false;
  var editingPath = null;
  var allPosts = [];
  var busyCounter = 0;

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

  function setStatus(message, isError){
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ef4444' : '';
  }

  function setConnectionStatus(message, isError){
    connectionEl.textContent = message;
    connectionEl.style.color = isError ? '#ef4444' : '';
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
    if (busyCounter === 1) {
      setBusy(true);
    }
  }

  function endBusy(){
    busyCounter = Math.max(0, busyCounter - 1);
    if (busyCounter === 0) {
      setBusy(false);
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
    return new Date().toISOString().slice(0, 10);
  }

  function encodePath(path){
    return String(path || '')
      .split('/')
      .map(function(part){ return encodeURIComponent(part); })
      .join('/');
  }

  function loadConfig(){
    var defaults = {
      owner: 'kahnri',
      repo: 'kahnri.github.io',
      branch: 'main'
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
      owner: ownerEl.value.trim(),
      repo: repoEl.value.trim(),
      branch: branchEl.value.trim(),
      token: tokenEl.value.trim()
    };

    if (!config.owner || !config.repo || !config.branch) {
      throw new Error('Owner/repo/branch bos olamaz.');
    }
    if (requireToken && !config.token) {
      throw new Error('GitHub token gerekli.');
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
    activeLangEl.textContent = 'Editing: ' + activeLang.toUpperCase();
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

    ['tr', 'de', 'en', 'nl'].forEach(function(lang){
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
  }

  function validateForSave(){
    var title = (titleEl.value || '').trim();
    if (!title) {
      throw new Error('Title gerekli.');
    }

    var selectedDate = dateEl.value || today();
    if (selectedDate > today()) {
      throw new Error('Gelecek tarihli post varsayilan olarak blogda gorunmez. Tarihi bugun veya gecmis yapin.');
    }

    var hasContent = ['tr', 'de', 'en', 'nl'].some(function(lang){
      return (contentByLang[lang] || '').trim().length > 0;
    });

    if (!hasContent) {
      throw new Error('En az bir dilde icerik girin.');
    }
  }

  function copyOutput(){
    if (!outputEl.value) return;
    navigator.clipboard.writeText(outputEl.value).then(function(){
      var btn = document.getElementById('admin-copy');
      if (!btn) return;
      var prev = btn.textContent;
      btn.textContent = 'Kopyalandi';
      setTimeout(function(){ btn.textContent = prev; }, 1200);
    }).catch(function(){
      setStatus('Kopyalama basarisiz.', true);
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
    if (promptUser && !window.confirm('Form temizlensin mi?')) {
      return;
    }

    titleEl.value = '';
    dateEl.value = today();
    slugEl.value = '';
    manualSlug = false;
    contentByLang = { tr: '', de: '', en: '', nl: '' };
    activeLang = 'tr';
    editorEl.value = '';
    editingPath = null;
    if (editingEl) editingEl.textContent = 'Yeni post';
    setTabState();
    build();
    setStatus('Editor temizlendi.', false);
  }

  function lockAndExit(){
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
    return 'tr';
  }

  function slugFromPermalink(permalink){
    var value = String(permalink || '').trim();
    if (!value) return '';
    var cleaned = value.replace(/\/+$/, '');
    var parts = cleaned.split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function setEditorFromParsed(path, parsed){
    var meta = fileMeta(path);
    var slugCandidate = parsed.slug || slugFromPermalink(parsed.permalink) || meta.slug || '';

    titleEl.value = parsed.title || '';
    dateEl.value = parsed.date || meta.date || today();
    slugEl.value = slugCandidate;
    manualSlug = true;

    contentByLang = {
      tr: parsed.tr || '',
      de: parsed.de || '',
      en: parsed.en || '',
      nl: parsed.nl || ''
    };

    activeLang = firstLang(contentByLang);
    editorEl.value = contentByLang[activeLang] || '';
    editingPath = path;
    if (editingEl) editingEl.textContent = 'Duzenleniyor: ' + path;
    setTabState();
    build();
  }

  async function testConnection(){
    try {
      var config = getConfig(true);
      saveConfig();
      var repo = await getRepo(config);
      setConnectionStatus('Bagli: ' + repo.full_name + ' @ ' + config.branch, false);
      setStatus('GitHub baglantisi basarili.', false);
    } catch (e) {
      setConnectionStatus('Hata', true);
      setStatus(e.message || 'Baglanti hatasi.', true);
    }
  }

  async function fetchPosts(){
    var config = getConfig(true);
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
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="edit">Edit</button>' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="view">View</button>' +
              '<button class="px-3 py-1 rounded-full border theme-button" type="button" data-action="delete">Delete</button>' +
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

  async function refreshPosts(){
    try {
      setStatus('Repo postlari aliniyor...', false);
      var items = await fetchPosts();
      allPosts = items;
      applyPostFilter();
      setStatus('Repo postlari guncellendi.', false);
      setConnectionStatus('Bagli: ' + ownerEl.value.trim() + '/' + repoEl.value.trim() + ' @ ' + branchEl.value.trim(), false);
    } catch (e) {
      allPosts = [];
      renderPostsList([]);
      setConnectionStatus('Hata', true);
      setStatus(e.message || 'Post listesi alinamadi.', true);
    }
  }

  async function loadPost(path){
    try {
      var config = getConfig(true);
      var file = await getContents(config, path);
      if (!file || !file.content) {
        throw new Error('Dosya icerigi okunamadi.');
      }

      var raw = fromBase64Unicode(file.content);
      var parsed = parseFrontMatter(raw);
      setEditorFromParsed(path, parsed);
      setStatus('Post editora yuklendi.', false);
    } catch (e) {
      setStatus(e.message || 'Post yuklenemedi.', true);
    }
  }

  async function deletePath(path, providedSha){
    var config = getConfig(true);
    var sha = providedSha;

    if (!sha) {
      var file = await getContents(config, path);
      if (!file || !file.sha) {
        throw new Error('Silinecek dosya bulunamadi.');
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
      var existing = await getContents(config, path);
      var sha = existing && existing.sha ? existing.sha : null;

      await putContents(config, path, outputEl.value, (sha ? 'Update post: ' : 'Create post: ') + path, sha);

      if (editingPath && editingPath !== path) {
        try {
          var oldFile = await getContents(config, editingPath);
          if (oldFile && oldFile.sha) {
            await deleteContents(config, editingPath, oldFile.sha, 'Delete old renamed post: ' + editingPath);
          }
        } catch (e) {}
      }

      editingPath = path;
      if (editingEl) editingEl.textContent = 'Duzenleniyor: ' + path;
      setStatus('Post GitHub\'a yazildi. Pages build sonrasi herkese acik olacak.', false);
      await refreshPosts();
    } catch (e) {
      setStatus(e.message || 'Yayinlama basarisiz.', true);
    }
  }

  async function deleteCurrent(){
    try {
      var path = editingPath || currentPath();
      if (!path || path === '_posts/') {
        throw new Error('Silinecek post secin.');
      }

      if (!window.confirm('Bu post GitHub\'dan silinsin mi?')) {
        return;
      }

      await deletePath(path, null);
      resetForm(false);
      setStatus('Post GitHub\'dan silindi.', false);
      await refreshPosts();
    } catch (e) {
      setStatus(e.message || 'Silme basarisiz.', true);
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
      if (!window.confirm('Secili post silinsin mi?')) {
        return;
      }
      try {
        await withBusy(async function(){
          await deletePath(path, sha || null);
          if (editingPath === path) {
            resetForm(false);
          }
          setStatus('Post silindi: ' + path, false);
          await refreshPosts();
        });
      } catch (e) {
        setStatus(e.message || 'Silme basarisiz.', true);
      }
    }
  }

  function initialize(){
    var saved = loadConfig();
    ownerEl.value = saved.owner;
    repoEl.value = saved.repo;
    branchEl.value = saved.branch;

    dateEl.value = today();
    setTabState();
    build();
    setStatus('Hazir', false);
    setConnectionStatus('Hazir degil', false);
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

  postsListEl.addEventListener('click', handlePostsClick);

  initialize();
})();
