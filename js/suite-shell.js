(function(){
  'use strict';

  const BUILD='20260825-sidebar-r2';
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
  const isCustomerPage=()=>path.endsWith('/customers.html');
  const isCatalogHub=()=>path.endsWith('/catalog-hub.html');
  const isFanCatalog=()=>path.endsWith('/catalog.html');
  const isElectricalCatalog=()=>inElectrical;

  function installStyles(){
    if(document.getElementById('vensisSuiteShellStyle'))return;
    const s=document.createElement('style');
    s.id='vensisSuiteShellStyle';
    s.textContent=`
      :root{--vensis-header-h:58px;--vensis-side-width:210px}

      /* Existing fixed suite header: intentionally unchanged. */
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

      /* New persistent left navigation. */
      .vensis-side-menu{position:fixed!important;left:0!important;top:var(--vensis-header-h)!important;bottom:0!important;width:var(--vensis-side-width)!important;z-index:2147483000!important;display:flex!important;flex-direction:column!important;background:#fff!important;border-right:1px solid #d7e1e3!important;box-shadow:4px 0 18px rgba(23,48,51,.07)!important;font-family:Arial,Helvetica,sans-serif!important;color:#173033!important}
      .vensis-side-menu *{box-sizing:border-box}
      .vensis-side-menu-head{padding:17px 14px 10px;color:#7a8b8f;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
      .vensis-side-menu-nav{padding:0 10px;display:grid;gap:6px}
      .vensis-side-menu a{display:flex!important;align-items:center!important;min-height:42px!important;padding:10px 12px!important;border-radius:9px!important;color:#29484d!important;background:#f2f6f5!important;border:1px solid transparent!important;text-decoration:none!important;font-size:13px!important;font-weight:800!important;line-height:1.2!important}
      .vensis-side-menu a:hover{border-color:#b9d5c8!important;background:#edf7f2!important;color:#087f4f!important}
      .vensis-side-menu a.active{background:#087f4f!important;color:#fff!important;border-color:#087f4f!important}
      .vensis-side-menu-group{margin-top:2px}
      .vensis-side-menu-group-title{display:flex!important;align-items:center!important;justify-content:space-between!important}
      .vensis-side-menu-group-title.active{background:#e7f4ee!important;color:#087f4f!important;border-color:#b9d5c8!important}
      .vensis-side-menu-sub{display:grid;gap:5px;padding:6px 0 0 12px}
      .vensis-side-menu-sub a{min-height:36px!important;padding:8px 10px!important;background:#fff!important;border:1px solid #e1e9e7!important;font-size:11px!important;letter-spacing:.035em!important}
      .vensis-side-menu-sub a.active{background:#087f4f!important;color:#fff!important;border-color:#087f4f!important}
      .vensis-side-menu-foot{margin-top:auto;padding:12px 10px 14px;border-top:1px solid #e1e9e7}
      .vensis-side-cloud{display:flex;align-items:center;min-height:38px;padding:9px 10px;border:1px solid #cfe0d8;border-radius:9px;background:#f4faf7;color:#087f4f;font-size:11px;font-weight:800}
      .vensis-side-lang{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
      .vensis-side-lang button{min-height:36px;border:1px solid #d7e1e3;border-radius:8px;background:#fff;color:#52666b;font:800 11px Arial,Helvetica,sans-serif;cursor:pointer}
      .vensis-side-lang button.active{background:#087f4f;color:#fff;border-color:#087f4f}

      @media(min-width:901px){
        body.vensis-side-menu-ready > .layout,
        body.vensis-side-menu-ready > .catalog-layout,
        body.vensis-side-menu-ready > .electrical-layout,
        body.vensis-side-menu-ready > .page,
        body.vensis-side-menu-ready > main.page,
        body.vensis-side-menu-ready > .wrap,
        body.vensis-side-menu-ready > main.wrap,
        body.vensis-side-menu-ready > .workspace,
        body.vensis-side-menu-ready > .quotation-workspace,
        body.vensis-side-menu-ready > main#detailPage{
          width:calc(100% - var(--vensis-side-width) - 18px)!important;
          max-width:none!important;
          margin-left:calc(var(--vensis-side-width) + 9px)!important;
          margin-right:9px!important;
        }
      }
      @media(max-width:900px){
        :root{--vensis-header-h:54px;--vensis-side-width:170px}
        .vensis-suite-shell-inner{padding:8px 10px}
        .vensis-suite-logo{height:30px}
        .vensis-suite-title{font-size:12px}
        .vensis-suite-shell a,.vensis-suite-shell button,.vensis-suite-shell .suite-cloud{min-height:34px;padding:7px 9px;font-size:11px}
        .vensis-side-menu a{font-size:12px!important;padding:9px!important}
        .vensis-side-menu-sub{padding-left:8px}
        body.vensis-side-menu-ready > .layout,
        body.vensis-side-menu-ready > .catalog-layout,
        body.vensis-side-menu-ready > .electrical-layout,
        body.vensis-side-menu-ready > .page,
        body.vensis-side-menu-ready > main.page,
        body.vensis-side-menu-ready > .wrap,
        body.vensis-side-menu-ready > main.wrap,
        body.vensis-side-menu-ready > .workspace,
        body.vensis-side-menu-ready > .quotation-workspace,
        body.vensis-side-menu-ready > main#detailPage{
          width:calc(100% - var(--vensis-side-width) - 8px)!important;
          max-width:none!important;
          margin-left:calc(var(--vensis-side-width) + 4px)!important;
          margin-right:4px!important;
        }
      }
      @media print{.vensis-suite-shell,.vensis-side-menu{display:none!important}body{padding-top:0!important}}
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
      <a class="${isActive('/projects.html')||isActive('/project.html')?'active':''}" href="${base}projects.html">Projeler</a>
      <a class="${isActive('/customers.html')?'active':''}" href="${base}customers.html">Müşteriler</a>
      <a class="${isActive('/catalog-hub.html')||isActive('/catalog.html')||inElectrical?'active':''}" href="${base}catalog-hub.html">Ürün Kataloğu</a>
      <span class="suite-cloud">☁ Bulut senkronize</span>
      <button class="suite-lang ${lang==='en'?'active':''}" data-lang="en" type="button">EN</button>
      <button class="suite-lang ${lang==='tr'?'active':''}" data-lang="tr" type="button">TR</button>
    </div>`;
    document.body.prepend(shell);
    shell.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
    return shell;
  }

  function mountSidebar(){
    const existing=document.getElementById('vensisSideMenu');
    if(existing)return existing;

    const lang=currentLang();
    const menu=document.createElement('aside');
    menu.id='vensisSideMenu';
    menu.className='vensis-side-menu';
    menu.setAttribute('data-vensis-build',BUILD);
    menu.innerHTML=`
      <div class="vensis-side-menu-head">Menü</div>
      <nav class="vensis-side-menu-nav" aria-label="Vensis ana menü">
        <a class="${isProjectPage()?'active':''}" href="${base}projects.html">Projeler</a>
        <a class="${isCustomerPage()?'active':''}" href="${base}customers.html">Müşteriler</a>
        <div class="vensis-side-menu-group">
          <a class="vensis-side-menu-group-title ${isCatalogHub()||isFanCatalog()||isElectricalCatalog()?'active':''}" href="${base}catalog-hub.html">Ürün Kataloğu <span>›</span></a>
          <div class="vensis-side-menu-sub">
            <a class="${isFanCatalog()?'active':''}" href="${base}catalog.html">HAVALANDIRMA</a>
            <a class="${isElectricalCatalog()?'active':''}" href="${base}electrical/index.html">ELEKTRİK</a>
          </div>
        </div>
      </nav>
      <div class="vensis-side-menu-foot">
        <div class="vensis-side-cloud">☁ Bulut senkronize</div>
        <div class="vensis-side-lang">
          <button class="${lang==='en'?'active':''}" type="button" data-side-lang="en">EN</button>
          <button class="${lang==='tr'?'active':''}" type="button" data-side-lang="tr">TR</button>
        </div>
      </div>`;
    document.body.appendChild(menu);
    document.body.classList.add('vensis-side-menu-ready');
    menu.querySelectorAll('[data-side-lang]').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.sideLang)));
    return menu;
  }

  function mount(){
    installStyles();
    const header=mountHeader();
    const sidebar=mountSidebar();
    return {header,sidebar};
  }

  window.VensisSuiteShell={mount,build:BUILD};
  if(document.body)mount();
  else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
