(function(){
  const SESSION_KEY='vensis_user_session_v1';
  const USERNAME='vensis';
  const PASSWORD_HASH='d1b2d00075dc0b5292f571e51ca9d4bd6b635c07a3c357a6b699ca9d7c0aea3a';
  const PROTECTED_PAGES=new Set(['project.html','project-edit.html','project-report.html']);
  const PROJECTS_KEY='vensis_projects_v2';
  async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  function isLoggedIn(){try{const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');return !!(s&&s.username===USERNAME&&s.expiresAt>Date.now())}catch(e){return false}}
  async function login(username,password){const ok=String(username).trim().toLowerCase()===USERNAME&&await sha256(String(password))===PASSWORD_HASH;if(ok)localStorage.setItem(SESSION_KEY,JSON.stringify({username:USERNAME,expiresAt:Date.now()+7*24*60*60*1000}));return ok}
  function logout(){localStorage.removeItem(SESSION_KEY);localStorage.removeItem('vensis_active_project_v2');location.href='index.html'}
  function compactProjectStorage(){
    try{
      const projects=JSON.parse(localStorage.getItem(PROJECTS_KEY)||'[]');
      if(!Array.isArray(projects))return;
      let changed=false;
      projects.forEach(project=>{
        if(!Array.isArray(project.items))return;
        project.schemaVersion=4;
        project.items=project.items.map(item=>{
          if(!item||typeof item!=='object')return item;
          if(!('product' in item)&&!('performanceTable' in item)&&!('productDescription' in item))return item;
          changed=true;
          const copy={...item};
          delete copy.product;
          delete copy.performanceTable;
          delete copy.productDescription;
          copy.schemaVersion=3;
          return copy;
        });
      });
      if(changed)localStorage.setItem(PROJECTS_KEY,JSON.stringify(projects));
    }catch(error){console.warn('Project storage compaction failed',error)}
  }
  function injectLoginButton(){if(document.getElementById('authButton'))return;const btn=document.createElement('button');btn.id='authButton';btn.textContent=isLoggedIn()?'Çıkış Yap':'Giriş Yap';btn.onclick=()=>isLoggedIn()?logout():(location.href='login.html');btn.style.cssText='position:fixed;left:14px;bottom:14px;z-index:99999;border:0;border-radius:9px;padding:10px 13px;font-weight:700;cursor:pointer;background:#006b3c;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)';document.body.appendChild(btn)}
  function pageName(){return (location.pathname.split('/').pop()||'index.html').toLowerCase()}
  function loadScript(src,marker){if(document.querySelector(`script[${marker}]`))return;const script=document.createElement('script');script.src=src;script.setAttribute(marker,'1');document.head.appendChild(script)}
  function loadQuotationImages(){if(pageName()==='quotation-report.html')return;loadScript('js/quotation-images.js?v=20260719-fix1','data-vensis-quotation-images')}
  function loadQuotationPrintFix(){if(pageName()!=='quotation-report.html')return;loadScript('js/quotation-print-fix.js?v=20260719-fix1','data-vensis-print-fix')}
  function loadCatalogueNames(){if(document.querySelector('script[data-vensis-catalog-images]')){window.VensisCatalog?.apply(document);loadQuotationImages();loadQuotationPrintFix();return}const script=document.createElement('script');script.src='js/catalog-series.js?v=20260719-fix1';script.dataset.vensisCatalogImages='1';script.onload=()=>{window.VensisCatalog?.apply(document);loadQuotationImages();loadQuotationPrintFix()};document.head.appendChild(script)}
  function guardPage(){const page=pageName();if(PROTECTED_PAGES.has(page)&&!isLoggedIn()){location.replace('login.html');return false}return true}
  function applyBodyState(){document.body.classList.toggle('guest-user',!isLoggedIn());document.body.classList.toggle('logged-user',isLoggedIn())}
  window.VensisAuth={isLoggedIn,login,logout,guardPage};
  compactProjectStorage();
  if(!guardPage())return;
  loadCatalogueNames();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{applyBodyState();injectLoginButton()});else{applyBodyState();injectLoginButton()}
})();