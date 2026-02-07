(function(){
  const password = "Kaan99kb";
  const storageKey = "admin-unlocked";

  const locked = document.getElementById("admin-locked");
  const unlocked = document.getElementById("admin-unlocked");
  if (!locked || !unlocked) {
    return;
  }

  const unlockBtn = document.getElementById("admin-unlock");
  const lockBtn = document.getElementById("admin-lock");

  const titleEl = document.getElementById("admin-title");
  const dateEl = document.getElementById("admin-date");
  const slugEl = document.getElementById("admin-slug");
  const trEl = document.getElementById("admin-tr");
  const deEl = document.getElementById("admin-de");
  const enEl = document.getElementById("admin-en");
  const nlEl = document.getElementById("admin-nl");
  const outputEl = document.getElementById("admin-output");
  const buildBtn = document.getElementById("admin-build");
  const copyBtn = document.getElementById("admin-copy");
  const downloadBtn = document.getElementById("admin-download");
  const fileEl = document.getElementById("admin-file");

  function setUnlocked(value){
    if (value) {
      locked.style.display = "none";
      unlocked.style.display = "block";
      try {
        localStorage.setItem(storageKey, "1");
      } catch (e) {}
    } else {
      locked.style.display = "block";
      unlocked.style.display = "none";
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
    }
  }

  function isUnlocked(){
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch (e) {
      return false;
    }
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

  function today(){
    return new Date().toISOString().slice(0, 10);
  }

  function build(){
    const title = (titleEl && titleEl.value.trim()) || "Untitled";
    const date = (dateEl && dateEl.value) || today();
    const slug = (slugEl && slugEl.value.trim()) || slugify(title) || "post";

    const lines = ["---", "layout: post", "title: \"" + title.replace(/\"/g, "\\\"") + "\"", "date: " + date];

    function addLang(el, key){
      if (!el) return;
      const value = el.value.trim();
      if (!value) return;
      const indented = value.split("\n").map(function(line){ return "  " + line; }).join("\n");
      lines.push(key + ": |");
      lines.push(indented);
    }

    addLang(trEl, "tr");
    addLang(deEl, "de");
    addLang(enEl, "en");
    addLang(nlEl, "nl");

    lines.push("---", "");

    if (outputEl) {
      outputEl.value = lines.join("\n");
    }
    if (fileEl) {
      fileEl.textContent = "_posts/" + date + "-" + slug + ".md";
    }
  }

  if (dateEl && !dateEl.value) {
    dateEl.value = today();
  }

  if (unlockBtn) {
    unlockBtn.addEventListener("click", function(){
      const entered = window.prompt("Admin password:");
      if (entered === password) {
        setUnlocked(true);
        build();
      } else if (entered !== null) {
        window.alert("Wrong password.");
      }
    });
  }

  if (lockBtn) {
    lockBtn.addEventListener("click", function(){
      setUnlocked(false);
    });
  }

  if (buildBtn) {
    buildBtn.addEventListener("click", build);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function(){
      if (!outputEl || !outputEl.value) return;
      navigator.clipboard.writeText(outputEl.value).then(function(){
        const prev = copyBtn.textContent;
        copyBtn.textContent = "Copied";
        setTimeout(function(){ copyBtn.textContent = prev; }, 1200);
      }).catch(function(){
        window.alert("Copy failed. Please copy manually.");
      });
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", function(){
      if (!outputEl || !outputEl.value) return;
      const filename = (fileEl && fileEl.textContent) ? fileEl.textContent.trim() : "post.md";
      const blob = new Blob([outputEl.value], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(/^_posts\\//, "");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 0);
    });
  }

  [titleEl, dateEl, slugEl, trEl, deEl, enEl, nlEl].forEach(function(el){
    if (!el) return;
    el.addEventListener("input", build);
  });

  setUnlocked(isUnlocked());
  build();
})();
