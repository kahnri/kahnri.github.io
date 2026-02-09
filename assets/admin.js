(function(){
  'use strict';

  var postsKey = "local-posts-v1";
  var homeUrl = "/";
  var localPostUrl = "/blog/post/";

  function slugify(text){
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function yamlEscape(text){
    return text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
  }

  function escapeHtml(value){
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function today(){
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(dateStr){
    var parts = String(dateStr || '').split('-');
    if (parts.length === 3) {
      return parts[2] + '.' + parts[1] + '.' + parts[0];
    }
    return String(dateStr || '');
  }

  function readPosts(){
    try {
      var raw = localStorage.getItem(postsKey);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data;
    } catch (e) {
      return [];
    }
  }

  function writePosts(posts){
    try {
      localStorage.setItem(postsKey, JSON.stringify(posts));
    } catch (e) {}
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

  var titleEl = document.getElementById("admin-title");
  var dateEl = document.getElementById("admin-date");
  var slugEl = document.getElementById("admin-slug");
  var editorEl = document.getElementById("admin-content-editor");
  var outputEl = document.getElementById("admin-output");
  var fileEl = document.getElementById("admin-file");
  var activeLangEl = document.getElementById("admin-active-language");
  var editingEl = document.getElementById("admin-editing");

  if (!titleEl || !dateEl || !slugEl || !editorEl || !outputEl || !fileEl || !activeLangEl) {
    return;
  }

  var tabButtons = Array.prototype.slice.call(document.querySelectorAll("[data-lang-tab]"));
  var activeLang = "tr";
  var contentByLang = { tr: "", de: "", en: "", nl: "" };
  var manualSlug = false;
  var editingId = null;

  function setTabState(){
    tabButtons.forEach(function(btn){
      var lang = btn.getAttribute("data-lang-tab");
      if (lang === activeLang) {
        btn.classList.remove("theme-button");
        btn.classList.add("theme-button-accent");
      } else {
        btn.classList.remove("theme-button-accent");
        btn.classList.add("theme-button");
      }
    });
    activeLangEl.textContent = "Editing: " + activeLang.toUpperCase();
  }

  function switchLang(nextLang){
    contentByLang[activeLang] = editorEl.value;
    activeLang = nextLang;
    editorEl.value = contentByLang[activeLang] || "";
    setTabState();
    build();
  }

  function syncAutoSlug(){
    if (manualSlug) {
      return;
    }
    var value = slugify(titleEl.value || "");
    slugEl.value = value;
  }

  function build(){
    contentByLang[activeLang] = editorEl.value;

    var title = (titleEl.value || "").trim() || "Untitled";
    var date = dateEl.value || today();
    var slug = (slugEl.value || "").trim() || slugify(title) || "post";

    var lines = [
      "---",
      "layout: post",
      "title: \"" + yamlEscape(title) + "\"",
      "date: " + date
    ];

    ["tr", "de", "en", "nl"].forEach(function(lang){
      var value = (contentByLang[lang] || "").trim();
      if (!value) {
        return;
      }
      lines.push(lang + ": |");
      value.split("\n").forEach(function(line){
        lines.push("  " + line);
      });
    });

    lines.push("---", "");

    outputEl.value = lines.join("\n");
    fileEl.textContent = "_posts/" + date + "-" + slug + ".md";
  }

  function copyOutput(){
    if (!outputEl.value) {
      return;
    }
    navigator.clipboard.writeText(outputEl.value).then(function(){
      var btn = document.getElementById("admin-copy");
      if (!btn) {
        return;
      }
      var prev = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(function(){
        btn.textContent = prev;
      }, 1200);
    }).catch(function(){
      window.alert("Copy failed. Please copy manually.");
    });
  }

  function downloadOutput(){
    if (!outputEl.value) {
      return;
    }
    var filename = fileEl.textContent ? fileEl.textContent.trim().replace(/^_posts\//, "") : "post.md";
    var blob = new Blob([outputEl.value], { type: "text/markdown;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 0);
  }

  function resetForm(promptUser){
    if (promptUser && !window.confirm("Clear all fields?")) {
      return;
    }
    titleEl.value = "";
    dateEl.value = today();
    slugEl.value = "";
    manualSlug = false;
    contentByLang = { tr: "", de: "", en: "", nl: "" };
    activeLang = "tr";
    editorEl.value = "";
    editingId = null;
    if (editingEl) editingEl.textContent = "New post";
    setTabState();
    build();
  }

  function lockAndExit(){
    window.location.href = homeUrl;
  }

  function validateForSave(){
    var title = (titleEl.value || "").trim();
    if (!title) {
      window.alert("Title is required.");
      return false;
    }
    var hasContent = ["tr", "de", "en", "nl"].some(function(lang){
      var value = (contentByLang[lang] || "").trim();
      return value.length > 0;
    });
    if (!hasContent) {
      window.alert("Add content in at least one language.");
      return false;
    }
    return true;
  }

  function savePost(){
    contentByLang[activeLang] = editorEl.value;

    if (!validateForSave()) {
      return;
    }

    var title = (titleEl.value || "").trim();
    var date = dateEl.value || today();
    var slug = (slugEl.value || "").trim() || slugify(title) || "post";

    var posts = readPosts();
    var now = new Date().toISOString();

    if (editingId && editingId !== slug) {
      posts = posts.filter(function(p){ return p.id !== editingId; });
    }

    var existingIndex = posts.findIndex(function(p){ return p.id === slug; });
    var payload = {
      id: slug,
      slug: slug,
      title: title,
      date: date,
      content: {
        tr: contentByLang.tr || "",
        de: contentByLang.de || "",
        en: contentByLang.en || "",
        nl: contentByLang.nl || ""
      },
      createdAt: existingIndex >= 0 ? (posts[existingIndex].createdAt || now) : now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      posts[existingIndex] = payload;
    } else {
      posts.push(payload);
    }

    writePosts(posts);
    editingId = slug;
    if (editingEl) editingEl.textContent = "Editing: " + slug;
    build();
    renderPostsList();
  }

  function deletePostById(id){
    if (!id) return;
    var posts = readPosts();
    var next = posts.filter(function(p){ return p.id !== id; });
    if (next.length === posts.length) return;
    writePosts(next);
  }

  function deleteCurrent(){
    if (!editingId) {
      window.alert("Select a post to delete.");
      return;
    }
    if (!window.confirm("Delete this post?")) {
      return;
    }
    deletePostById(editingId);
    resetForm(false);
    renderPostsList();
  }

  function pickFirstLang(content){
    if (content.tr) return 'tr';
    if (content.de) return 'de';
    if (content.en) return 'en';
    if (content.nl) return 'nl';
    return 'tr';
  }

  function loadPost(post){
    if (!post) return;
    titleEl.value = post.title || '';
    dateEl.value = post.date || today();
    slugEl.value = post.slug || post.id || '';
    manualSlug = true;
    contentByLang = {
      tr: (post.content && post.content.tr) || '',
      de: (post.content && post.content.de) || '',
      en: (post.content && post.content.en) || '',
      nl: (post.content && post.content.nl) || ''
    };
    activeLang = pickFirstLang(contentByLang);
    editorEl.value = contentByLang[activeLang] || '';
    editingId = post.id || post.slug || null;
    if (editingEl) editingEl.textContent = editingId ? "Editing: " + editingId : "New post";
    setTabState();
    build();
  }

  function renderPostsList(){
    var list = document.getElementById('admin-posts');
    var empty = document.getElementById('admin-posts-empty');
    if (!list) return;

    var posts = sortPosts(readPosts());
    if (!posts.length) {
      list.innerHTML = '';
      if (empty) empty.style.display = '';
      return;
    }

    if (empty) empty.style.display = 'none';

    list.innerHTML = posts.map(function(post){
      var title = escapeHtml(post.title || post.slug || 'Untitled');
      var slug = escapeHtml(post.slug || post.id || '');
      var date = escapeHtml(formatDate(post.date || ''));
      return (
        '<div class="p-3 rounded-xl border theme-card" data-id="' + escapeHtml(post.id || '') + '">' +
          '<div class="flex flex-wrap items-center justify-between gap-3">' +
            '<div>' +
              '<p class="font-semibold">' + title + '</p>' +
              '<p class="text-sm theme-text-muted">' + date + (slug ? ' · ' + slug : '') + '</p>' +
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

  function handleListClick(event){
    var target = event.target;
    if (!target || !target.dataset || !target.dataset.action) return;
    var card = target.closest('[data-id]');
    if (!card) return;
    var id = card.getAttribute('data-id');
    var posts = readPosts();
    var post = posts.find(function(p){ return p.id === id; });

    if (target.dataset.action === 'edit') {
      loadPost(post);
    } else if (target.dataset.action === 'view') {
      window.location.href = localPostUrl + '?slug=' + encodeURIComponent((post && post.slug) || id || '');
    } else if (target.dataset.action === 'delete') {
      editingId = id;
      deleteCurrent();
    }
  }

  dateEl.value = today();
  setTabState();
  build();
  renderPostsList();

  titleEl.addEventListener("input", function(){
    syncAutoSlug();
    build();
  });

  dateEl.addEventListener("input", build);

  slugEl.addEventListener("input", function(){
    manualSlug = slugEl.value.trim().length > 0;
    build();
  });

  editorEl.addEventListener("input", build);

  tabButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      switchLang(btn.getAttribute("data-lang-tab"));
    });
  });

  var buildBtn = document.getElementById("admin-build");
  var copyBtn = document.getElementById("admin-copy");
  var downloadBtn = document.getElementById("admin-download");
  var resetBtn = document.getElementById("admin-reset");
  var lockBtn = document.getElementById("admin-lock");
  var topLockBtn = document.getElementById("admin-logout-top");
  var saveBtn = document.getElementById("admin-save");
  var deleteBtn = document.getElementById("admin-delete");
  var refreshBtn = document.getElementById("admin-refresh");
  var listEl = document.getElementById("admin-posts");

  if (buildBtn) buildBtn.addEventListener("click", build);
  if (copyBtn) copyBtn.addEventListener("click", copyOutput);
  if (downloadBtn) downloadBtn.addEventListener("click", downloadOutput);
  if (resetBtn) resetBtn.addEventListener("click", function(){ resetForm(true); });
  if (lockBtn) lockBtn.addEventListener("click", lockAndExit);
  if (topLockBtn) topLockBtn.addEventListener("click", lockAndExit);
  if (saveBtn) saveBtn.addEventListener("click", savePost);
  if (deleteBtn) deleteBtn.addEventListener("click", deleteCurrent);
  if (refreshBtn) refreshBtn.addEventListener("click", renderPostsList);
  if (listEl) listEl.addEventListener("click", handleListClick);
})();
