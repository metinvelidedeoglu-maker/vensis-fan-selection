(function(){
  'use strict';

  const KEY='vensis_access_mode_v1';
  const path=(location.pathname||'').toLowerCase();
  if(path.endsWith('/catalog-vortice.html')){
    const routeParams=new URLSearchParams(location.search);
    if(!routeParams.get('series')){
      location.replace('catalog-vortice-stable.html'+(location.search||''));
      return;
    }
  }
  const base=path.includes('/electrical/')?'../':'';
  const publicCatalogPaths=[
    '/catalog-hub.html','/catalog-ventilation.html','/catalog-brand.html',
    '/catalog-vortice-stable.html','/catalog-vortice.html','/electrical/index.html'
  ];
  const isPublicCatalog=publicCatalogPaths.some(item=>path.endsWith(item));
  if(isPublicCatalog){
    const languageParams=new URLSearchParams(location.search);
    const requestedLanguage=languageParams.get('lang');
    let savedLanguage='';
    try{savedLanguage=localStorage.getItem('vensis_language_v1')||''}catch{}
    const bootLanguage=requestedLanguage==='tr'||requestedLanguage==='en'
      ?requestedLanguage
      :(savedLanguage==='tr'||savedLanguage==='en'?savedLanguage:'en');
    document.documentElement.lang=bootLanguage;
    try{localStorage.setItem('vensis_language_v1',bootLanguage)}catch{}
    if(languageParams.get('lang')!==bootLanguage){
      languageParams.set('lang',bootLanguage);
      const localized=location.pathname+'?'+languageParams.toString()+(location.hash||'');
      history.replaceState(history.state,'',localized);
    }
    window.VENSIS_CATALOG_BOOT_LANGUAGE=bootLanguage;
  }
  const desktopEditorPages=['/project.html','/quotation.html'];
  const hasDesktopEditor=desktopEditorPages.some(item=>path.endsWith(item));
  if(hasDesktopEditor&&!document.querySelector('script[data-vensis-desktop-editor-toggle]')){
    const editorToggle=document.createElement('script');
    editorToggle.src=base+'js/desktop-editor-toggle.js?v=20260902-r1';
    editorToggle.dataset.vensisDesktopEditorToggle='1';
    document.head.appendChild(editorToggle);
  }
  const robots=document.createElement('meta');
  robots.name='robots';
  robots.content=isPublicCatalog?'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1':'noindex,nofollow';
  document.head.appendChild(robots);
  if(isPublicCatalog&&!document.querySelector('script[data-vensis-seo-language]')){
    const seoLanguage=document.createElement('script');
    seoLanguage.async=false;
    seoLanguage.src=base+'js/seo-bilingual.js?v=20260902-r1';
    seoLanguage.dataset.vensisSeoLanguage='1';
    document.head.appendChild(seoLanguage);
  }
  if(isPublicCatalog&&!document.querySelector('script[data-vensis-seo]')){
    const seo=document.createElement('script');
    seo.async=false;
    seo.src=base+'js/catalog-seo.js?v=20260901-seo-r1';
    seo.dataset.vensisSeo='1';
    document.head.appendChild(seo);
  }
  const API=`${base}api/edit`;
  const valid=value=>value==='guest'||value==='secure'?value:'';
  const readMode=()=>{try{return valid(localStorage.getItem(KEY)||'')}catch{return ''}};
  const writeMode=value=>{try{value?localStorage.setItem(KEY,value):localStorage.removeItem(KEY)}catch{}};
  const initialMode=readMode();
  const state={mode:initialMode,authenticated:false,csrf:'',configured:true,persistentConfigReady:true,checked:false,busy:false};
  let gate,content;

  window.VENSIS_ACCESS_BOOT_MODE=initialMode||'guest';

  function esc(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
  function applyMode(mode){
    state.mode=valid(mode);
    if(document.body){document.body.classList.toggle('guest-user',state.mode==='guest');document.body.classList.toggle('secure-user',state.mode==='secure')}
  }
  function storageKey(key){return (state.mode||window.VENSIS_ACCESS_BOOT_MODE)==='guest'?String(key).replace(/^vensis_/,'vensis_guest_'):String(key)}
  function reveal(){document.documentElement.classList.remove('vensis-access-pending')}
  function logo(){return `<div class="vensis-access-logo-box"><img src="${base}assets/vensis-logo.png" alt="Vensis"></div>`}
  function frame(body,closable=false){
    content.innerHTML=`${closable?'<button class="vensis-access-close" type="button" data-access-close aria-label="Kapat">×</button>':''}${body}`;
    gate.hidden=false;document.body.classList.add('vensis-access-open');
    setTimeout(()=>content.querySelector('input,button')?.focus(),20);
  }
  function close(){
    if(!gate)return;gate.hidden=true;content.innerHTML='';document.body.classList.remove('vensis-access-open');reveal();
  }
  function choiceMarkup(hasSession=false){
    const secureTitle=hasSession?'Şifreli Alana Geç':'Şifreyle Giriş';
    const secureText=hasSession?'Açık güvenli oturumla bulut verilerinizi kullanın.':'Projelerinize ve müşteri bulutuna güvenli erişin.';
    return `<span class="vensis-access-kicker">Vensis Engineering Suite</span><h1>Çalışma alanına hoş geldiniz</h1><p class="vensis-access-lead">Nasıl devam etmek istediğinizi seçin.</p><div class="vensis-access-options"><button class="vensis-access-option primary" type="button" data-access-secure><span class="vensis-access-icon">⌁</span><span><b>${secureTitle}</b><small>${secureText}</small></span><span class="vensis-access-arrow">→</span></button><button class="vensis-access-option" type="button" data-access-guest><span class="vensis-access-icon">○</span><span><b>Misafir Olarak Devam Et</b><small>Projeler ve müşteriler yalnızca bu tarayıcıda saklanır.</small></span><span class="vensis-access-arrow">→</span></button></div><p class="vensis-access-note">Misafir kullanıcılar Vensis’in özel proje ve müşteri kayıtlarına erişemez.</p>`;
  }
  function showChoice(closable=false){frame(choiceMarkup(state.authenticated),closable)}
  function showLogin(message=''){
    frame(`<span class="vensis-access-kicker">Güvenli Giriş</span><h1>Şifrenizi girin</h1><p class="vensis-access-lead">Şifre yalnızca güvenli sunucuda doğrulanır.</p><form class="vensis-access-form" data-access-login><label class="vensis-access-field"><span>Şifre</span><input type="password" name="password" autocomplete="current-password" maxlength="1024" required></label><div class="vensis-access-message">${esc(message)}</div><div class="vensis-access-actions"><button class="vensis-access-secondary" type="button" data-access-back>Geri</button><button class="vensis-access-primary" type="submit">Giriş Yap</button></div></form>`,false);
  }
  function showSecurePanel(){
    frame(`<span class="vensis-access-kicker">Hesap</span><h1>Güvenli oturum açık</h1><p class="vensis-access-lead">Projeleriniz ve müşterileriniz bulut ile senkronize edilir.</p><div class="vensis-access-status"><i></i><span><b>Şifreli çalışma alanı</b><small>Vensis özel verileri kullanılabilir.</small></span></div><div class="vensis-access-actions"><button class="vensis-access-danger" type="button" data-access-logout>Çıkış Yap</button><button class="vensis-access-primary" type="button" data-access-close>Devam Et</button></div>`,true);
  }
  async function request(endpoint,options={}){
    const headers={Accept:'application/json'};
    if(options.body!==undefined)headers['Content-Type']='application/json';
    if(options.csrf&&state.csrf)headers['X-CSRF-Token']=state.csrf;
    const response=await fetch(`${API}/${endpoint}`,{method:options.method||'GET',credentials:'same-origin',cache:'no-store',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});
    let payload={};try{payload=await response.json()}catch{}
    if(!response.ok||payload.ok===false){const error=new Error(payload.error||'Giriş işlemi tamamlanamadı.');error.status=response.status;error.retryAfter=Number(response.headers.get('Retry-After'))||0;throw error}
    return payload;
  }
  function setSession(payload){
    state.checked=true;state.configured=Boolean(payload?.configured??true);state.persistentConfigReady=Boolean(payload?.persistentConfigReady??true);state.authenticated=Boolean(payload?.authenticated);state.csrf=state.authenticated?String(payload?.csrf||''):'';
  }
  async function refreshSession(){try{const payload=await request('session.php');setSession(payload);return payload}catch{setSession({configured:false,authenticated:false});return null}}
  function useSecure(){writeMode('secure');applyMode('secure');location.reload()}
  async function useGuest(){
    if(state.busy)return;state.busy=true;
    if(state.authenticated&&state.csrf){try{await request('logout.php',{method:'POST',body:{},csrf:true})}catch{}}
    writeMode('guest');applyMode('guest');location.reload();
  }
  async function submitLogin(form){
    if(state.busy)return;state.busy=true;
    const submit=form.querySelector('[type="submit"]');const password=form.elements.password?.value||'';const message=form.querySelector('.vensis-access-message');
    submit.disabled=true;submit.textContent='Kontrol ediliyor…';message.textContent='';
    try{const payload=await request('login.php',{method:'POST',body:{password}});setSession({...payload,configured:true});writeMode('secure');applyMode('secure');location.reload()}
    catch(error){state.busy=false;submit.disabled=false;submit.textContent='Giriş Yap';message.textContent=error.retryAfter?`${error.message} (${Math.ceil(error.retryAfter/60)} dk)`:error.message;form.elements.password?.select()}
  }
  async function logout(){
    if(state.busy)return;state.busy=true;
    if(!state.checked)await refreshSession();
    try{await request('logout.php',{method:'POST',body:{},csrf:true})}catch{}
    writeMode('');applyMode('');state.authenticated=false;state.csrf='';state.busy=false;showChoice(false);
  }
  async function openAccount(){
    if(!state.checked)await refreshSession();
    if(state.mode==='secure'&&state.authenticated)showSecurePanel();
    else showChoice(state.mode==='guest');
  }
  function mount(){
    document.documentElement.classList.add('vensis-access-pending');
    gate=document.createElement('div');gate.id='vensisAccessGate';gate.className='vensis-access-gate';gate.hidden=true;
    gate.innerHTML=`<section class="vensis-access-card" role="dialog" aria-modal="true" aria-label="Vensis giriş"><aside class="vensis-access-brand">${logo()}<div class="vensis-access-brand-copy"><span>Engineering Workspace</span><h2>Select.<br>Analyze. Deliver.</h2><p>Fan seçimi, ürün kataloğu, proje ve teklif süreçleri tek çalışma alanında.</p></div></aside><main class="vensis-access-content"></main></section>`;
    content=gate.querySelector('.vensis-access-content');document.body.appendChild(gate);applyMode(state.mode);
    gate.addEventListener('click',event=>{
      if(event.target.closest('[data-access-close]')){close();return}
      if(event.target.closest('[data-access-back]')){showChoice(state.mode==='guest');return}
      if(event.target.closest('[data-access-guest]')){useGuest();return}
      if(event.target.closest('[data-access-secure]')){state.authenticated?useSecure():showLogin();return}
      if(event.target.closest('[data-access-logout]')){logout();return}
    });
    gate.addEventListener('submit',event=>{const form=event.target.closest('[data-access-login]');if(!form)return;event.preventDefault();submitLogin(form)});
    window.addEventListener('vensis-open-access-panel',openAccount);
    window.addEventListener('vensis-edit-session-changed',event=>{
      if(event.detail?.authenticated&&state.mode!=='secure'){
        event.stopImmediatePropagation();writeMode('secure');applyMode('secure');location.reload();return;
      }
      if(!event.detail?.authenticated&&state.mode==='secure'&&state.checked){
        event.stopImmediatePropagation();writeMode('');applyMode('');showChoice(false);
      }
    });
  }
  async function start(){
    if(isPublicCatalog&&!initialMode){
      state.mode='guest';state.checked=true;window.VENSIS_ACCESS_BOOT_MODE='guest';applyMode('guest');reveal();return;
    }
    mount();
    if(initialMode==='guest'){close();return}
    const payload=await refreshSession();
    if(payload?.authenticated){
      if(initialMode!=='secure'){writeMode('secure');applyMode('secure');location.reload();return}
      applyMode('secure');close();return;
    }
    writeMode('');applyMode('');showChoice(false);reveal();
  }

  window.VensisAccess={key:KEY,mode:()=>state.mode||'guest',open:openAccount,isGuest:()=>state.mode==='guest',storageKey};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();