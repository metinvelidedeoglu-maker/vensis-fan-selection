(function(){
  const SESSION_KEY='vensis_user_session_v1';
  const USERNAME='vensis';
  const PASSWORD_HASH='d1b2d00075dc0b5292f571e51ca9d4bd6b635c07a3c357a6b699ca9d7c0aea3a';
  const PROTECTED_PAGES=new Set(['project.html','project-edit.html','project-report.html']);
  async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
  function isLoggedIn(){try{const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');return !!(s&&s.username===USERNAME&&s.expiresAt>Date.now())}catch(e){return false}}
  async function login(username,password){const ok=String(username).trim().toLowerCase()===USERNAME&&await sha256(String(password))===PASSWORD_HASH;if(ok)localStorage.setItem(SESSION_KEY,JSON.stringify({username:USERNAME,expiresAt:Date.now()+7*24*60*60*1000}));return ok}
  function logout(){localStorage.removeItem(SESSION_KEY);localStorage.removeItem('vensis_active_project_v2');location.href='index.html'}
  function injectLoginButton(){if(document.getElementById('authButton'))return;const btn=document.createElement('button');btn.id='authButton';btn.textContent=isLoggedIn()?'Çıkış Yap':'Giriş Yap';btn.onclick=()=>isLoggedIn()?logout():(location.href='login.html');btn.style.cssText='position:fixed;left:14px;bottom:14px;z-index:99999;border:0;border-radius:9px;padding:10px 13px;font-weight:700;cursor:pointer;background:#006b3c;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)';document.body.appendChild(btn)}
  function loadCatalogueNames(){if(document.querySelector('script[data-vensis-catalog-images]'))return;const script=document.createElement('script');script.src='js/catalog-series.js?v='+Date.now();script.dataset.vensisCatalogImages='1';script.onload=()=>window.VensisCatalog?.apply(document);document.head.appendChild(script)}
  function guardPage(){const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();if(PROTECTED_PAGES.has(page)&&!isLoggedIn()){location.replace('login.html');return false}return true}
  function applyBodyState(){document.body.classList.toggle('guest-user',!isLoggedIn());document.body.classList.toggle('logged-user',isLoggedIn())}
  window.VensisAuth={isLoggedIn,login,logout,guardPage};if(!guardPage())return;loadCatalogueNames();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{applyBodyState();injectLoginButton()});else{applyBodyState();injectLoginButton()}
})();