(function(){
  'use strict';

  const BUILD='20260825-header-r1';
  window.VENSIS_BUILD=BUILD;

  const path=(location.pathname||'').toLowerCase();
  const inElectrical=path.includes('/electrical/');
  const base=inElectrical?'../':'';
  const isActive=(needle)=>path.endsWith(needle);
  const currentLang=()=>{
    try{return localStorage.getItem('vensis_language_v1')||'en'}catch{return 'en'}
  };
  const setLang=(lang)=>{
    try{localStorage.setItem('vensis_language_v1',lang)}catch{}
    location.reload();
  };

  const isProjectPage=()=>/\/(projects|project|quotation|order|project-print)\.html$/.test(path);
  const isCatalogPage=()=>path.endsWith('/catalog-hub.html')||path.endsWith('/catalog.html')||inElectrical;
  const isFanSelection=()=>path.endsWith('/index.html')&&!inElectrical;

  function installStyles(){
    if(document.getElementById('vensisSuiteShellStyle'))return;
    const s=document.createElement('style');
    s.id='vensisSuiteShellStyle';
    s.textContent=`
      :root{--vensis-header-h:58px}
      body>.top,body>.catalog-top,body>header.top{display:none!important}
      .vensis-suite-shell{display:block!important;position:fixed!important;left:0!important;right:0!important;top:0!important;width:100%!important;z-index:2147483647!important;background:#fff!important;border-bottom:1px solid #d7e1e3!important;box-shadow:0 2px 10px rgba(23,48,51,.08)!important}
      .vensis-suite-shell-inner{max-width:1600px;margin:auto;padding:10px 16px;display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap;min-height:var(--vensis-header-h)}
      .vensis-suite-logo{height:34px;max-width:150px;object-fit:contain;margin-right:2px;flex:0 0 auto}
      .vensis-suite-title{font:800 13px Arial,Helvetica,sans-serif;color:#173033;margin-right:8px;flex:0 0 auto}
      .vensis-suite-shell a,.vensis-suite-shell button,.vensis-suite-shell .suite-cloud{display:inline-flex!important;align-items:center;justify-content:center;min-height:36px;padding:8px 11px;border-radius:9px;border:1px solid #d7e1e3;background:#eef3f2;color:#29484d;text-decoration:none;font:800 12px Arial,Helvetica,sans-serif;cursor:pointer;white-space:nowrap;flex:0 0 auto}
      .vensis-suite-shell a.active{background:#087f4f!important;color:#fff!important;border-color:#087f4f!important}
      .vensis-suite-shell .suite-cloud{background:#fff!important;color:#087f4f!important;cursor:default}
      .vensis-suite-shell .suite-lang.active{background:#087f4f!important;color:#fff!important;border-color:#087f4f!important}
      body{padding-top:var(--vensis-header-h)!important;scroll-padding-top:calc(var(--vensis-header-h) + 8px)!important}
      @media(max-width:760px){
        :root{--vensis-header-h:54px}
        .vensis-suite-shell-inner{padding:8px 10px}
        .vensis-suite-logo{height:30px}
        .vensis-suite-title{font-size:12px}
        .vensis-suite-shell a,.vensis-suite-shell button,.vensis-suite-shell .suite-cloud{min-height:34px;padding:7px 9px;font-size:11px}
      }
      @media print{.vensis-suite-shell{display:none!important}body{padding-top:0!important}}
    `;
    document.head.appendChild(s);
  }

  function mountHeader(){
    const existing=document.querySelector('.vensis-suite-shell');
    if(existing)return existing;

    const lang=currentLang();
    const shell=document.createElement('header');
    shell.className='vensis-suite-shell';
    shell.setAttribute('data-vensis-build',BUILD);
    shell.innerHTML=`<div class="vensis-suite-shell-inner">
      <img class="vensis-suite-logo" src="${base}assets/vensis-logo.png" alt="Vensis">
      <span class="vensis-suite-title">Vensis Engineering Suite</span>
      <a class="${isProjectPage()?'active':''}" href="${base}projects.html">Projeler</a>
      <a class="${isActive('/customers.html')?'active':''}" href="${base}customers.html">Müşteriler</a>
      <a class="${isCatalogPage()?'active':''}" href="${base}catalog-hub.html">Ürün Kataloğu</a>
      <a class="${isFanSelection()?'active':''}" href="${base}index.html">Fan Selection</a>
      <span class="suite-cloud">☁ Bulut senkronize</span>
      <button class="suite-lang ${lang==='en'?'active':''}" data-lang="en" type="button">EN</button>
      <button class="suite-lang ${lang==='tr'?'active':''}" data-lang="tr" type="button">TR</button>
    </div>`;
    document.body.prepend(shell);
    shell.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
    return shell;
  }

  function removeSidebar(){
    document.getElementById('vensisSideMenu')?.remove();
    document.body.classList.remove('vensis-side-menu-ready');
  }

  function mount(){
    installStyles();
    removeSidebar();
    return {header:mountHeader()};
  }

  window.VensisSuiteShell={mount,build:BUILD};
  if(document.body)mount();
  else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
