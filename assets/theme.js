(function(){
  const htmlEl=document.documentElement;
  const themeKey='theme-preference';
  let storedTheme=null;

  function readStored(){
    try{
      return localStorage.getItem(themeKey);
    }catch(e){
      return null;
    }
  }

  function currentTheme(){
    return htmlEl.dataset.theme || 'dark';
  }

  function persistTheme(theme){
    try{
      localStorage.setItem(themeKey, theme);
    }catch(e){}
    storedTheme=theme;
  }

  function updateIcons(theme){
    document.querySelectorAll('[data-theme-icon]').forEach(icon=>{
      icon.textContent=theme==='dark'?'🌙':'☀️';
    });
  }

  function setTheme(theme, persist=true){
    htmlEl.dataset.theme=theme;
    if(persist){
      persistTheme(theme);
    }
    updateIcons(theme);
    document.dispatchEvent(new CustomEvent('themechange',{detail:{theme}}));
  }

  function setupToggle(btn){
    if(!btn || btn.dataset.themeInitialized==='true'){
      return;
    }
    btn.dataset.themeInitialized='true';
    btn.addEventListener('click',()=>{
      const next=currentTheme()==='dark'?'light':'dark';
      setTheme(next);
    });
  }

  function getAnnouncementStrings(){
    const fallback={
      title:'Bilgilendirme',
      message:"13 Mart'a kadar prüfung phase'deyim. Ondan sonra çalışmalar ve site güncellenecektir.",
      close:'Kapat'
    };
    let lang='tr';
    try{
      lang=localStorage.getItem('lang') || document.documentElement.lang || 'tr';
    }catch(e){
      lang=document.documentElement.lang || 'tr';
    }
    const strings=(window.I18N_STRINGS && window.I18N_STRINGS[lang]) || {};
    return {
      title: strings['announcement.title'] || fallback.title,
      message: strings['announcement.message'] || fallback.message,
      close: strings['announcement.close'] || fallback.close
    };
  }

  function showAnnouncement(){
    const { title: titleText, message: messageText, close: closeText }=getAnnouncementStrings();
    const overlay=document.createElement('div');
    overlay.className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');

    const card=document.createElement('div');
    card.className='w-full max-w-md rounded-2xl border theme-card p-6 shadow-lg';

    const title=document.createElement('h2');
    title.className='text-lg font-semibold';
    title.dataset.i18n='announcement.title';
    title.textContent=titleText;

    const message=document.createElement('p');
    message.className='mt-2 theme-text-muted';
    message.dataset.i18n='announcement.message';
    message.textContent=messageText;

    const actions=document.createElement('div');
    actions.className='mt-4 flex justify-end';

    const closeButton=document.createElement('button');
    closeButton.type='button';
    closeButton.className='px-4 py-2 rounded-full border theme-button';
    closeButton.dataset.i18n='announcement.close';
    closeButton.textContent=closeText;
    closeButton.addEventListener('click',()=>overlay.remove());

    actions.appendChild(closeButton);
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(actions);
    overlay.appendChild(card);

    overlay.addEventListener('click',event=>{
      if(event.target===overlay){
        overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  function ensureButton(){
    let btn=document.getElementById('theme-toggle');
    if(!btn){
      btn=document.createElement('button');
      btn.id='theme-toggle';
      btn.type='button';
      btn.className='theme-toggle-fixed';
      btn.innerHTML='<span data-theme-icon aria-hidden="true">🌙</span><span class="sr-only">Toggle theme</span>';
      document.body.appendChild(btn);
      return btn;
    }

    if(!btn.querySelector('[data-theme-icon]')){
      const icon=document.createElement('span');
      icon.setAttribute('data-theme-icon','');
      icon.setAttribute('aria-hidden','true');
      icon.textContent=currentTheme()==='dark'?'🌙':'☀️';
      btn.prepend(icon);
    }

    if(!btn.querySelector('.sr-only')){
      const sr=document.createElement('span');
      sr.className='sr-only';
      sr.textContent='Toggle theme';
      btn.appendChild(sr);
    }

    return btn;
  }

  function init(){
    if(storedTheme){
      setTheme(storedTheme, false);
    }else{
      updateIcons(currentTheme());
    }

    const btn=ensureButton();
    setupToggle(btn);
    showAnnouncement();

    try{
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',event=>{
        if(!storedTheme){
          setTheme(event.matches?'dark':'light', false);
        }
      });
    }catch(e){}
  }

  storedTheme=readStored();

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  window.__themeToggle={
    setTheme,
    currentTheme,
    updateIcons
  };
})();
