(function(){
  var password = "Kaan99kb";
  var storageKey = "admin-unlocked";

  function setUnlocked(value){
    try {
      if (value) {
        localStorage.setItem(storageKey, "1");
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {}
  }

  function isUnlocked(){
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch (e) {
      return false;
    }
  }

  function promptUnlock(){
    var entered = window.prompt("Admin password:");
    if ((entered || "").trim() === password) {
      setUnlocked(true);
      return true;
    }
    if (entered !== null) {
      window.alert("Wrong password.");
    }
    return false;
  }

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

  function today(){
    return new Date().toISOString().slice(0, 10);
  }

  var loginBtn = document.getElementById("admin-login");
  if (loginBtn) {
    loginBtn.addEventListener("click", function(event){
      if (event.defaultPrevented) {
        return;
      }
      if (isUnlocked()) {
        return;
      }
      event.preventDefault();
      if (promptUnlock()) {
        window.location.href = "/admin.html";
      }
    });
  }

  var titleEl = document.getElementById("admin-title");
  var dateEl = document.getElementById("admin-date");
  var slugEl = document.getElementById("admin-slug");
  var editorEl = document.getElementById("admin-content-editor");
  var outputEl = document.getElementById("admin-output");
  var fileEl = document.getElementById("admin-file");
  var activeLangEl = document.getElementById("admin-active-language");

  if (!titleEl || !dateEl || !slugEl || !editorEl || !outputEl || !fileEl || !activeLangEl) {
    return;
  }

  if (!isUnlocked()) {
    if (!promptUnlock()) {
      window.location.href = "/";
      return;
    }
  }

  var tabButtons = Array.prototype.slice.call(document.querySelectorAll("[data-lang-tab]"));
  var activeLang = "tr";
  var contentByLang = { tr: "", de: "", en: "", nl: "" };
  var manualSlug = false;

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

  function resetForm(){
    if (!window.confirm("Clear all fields?")) {
      return;
    }
    titleEl.value = "";
    dateEl.value = today();
    slugEl.value = "";
    manualSlug = false;
    contentByLang = { tr: "", de: "", en: "", nl: "" };
    activeLang = "tr";
    editorEl.value = "";
    setTabState();
    build();
  }

  function lockAndExit(){
    setUnlocked(false);
    window.location.href = "/";
  }

  dateEl.value = today();
  setTabState();
  build();

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

  if (buildBtn) buildBtn.addEventListener("click", build);
  if (copyBtn) copyBtn.addEventListener("click", copyOutput);
  if (downloadBtn) downloadBtn.addEventListener("click", downloadOutput);
  if (resetBtn) resetBtn.addEventListener("click", resetForm);
  if (lockBtn) lockBtn.addEventListener("click", lockAndExit);
  if (topLockBtn) topLockBtn.addEventListener("click", lockAndExit);
})();
