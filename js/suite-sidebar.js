(function(){
  'use strict';
  if(document.getElementById('vensisSideMenu'))return;

  const BUILD='20260825-language-r1';
  const path=(location.pathname||'').toLowerCase();
  const inElectrical=path.includes('/electrical/');
  const base=inElectrical?'../':'';
  const currentLang=()=>{try{return localStorage.getItem('vensis_language_v1')||'en'}catch{return 'en'}};
  const setLang=lang=>{try{localStorage.setItem('vensis_language_v1',lang)}catch{};location.reload()};
  const isProjectPage=()=>/\/(projects|project|quotation|order|project-print)\.html$/.test(path);
  const isCustomerPage=()=>path.endsWith('/customers.html');
  const isCatalogHub=()=>path.endsWith('/catalog-hub.html');
  const isFanCatalog=()=>path.endsWith('/catalog.html');
  const isElectricalCatalog=()=>inElectrical;
  const label=(en,tr)=>currentLang()==='tr'?tr:en;

  async function refreshCloudStatus(){
    const element=document.querySelector('.vensis-side-cloud');
    if(!element)return;
    try{
      const response=await fetch(`${base}api/edit/session.php`,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      const payload=await response.json();
      element.textContent=payload?.authenticated?`☁ ${label('Cloud synced','Bulut senkronize')}`:`☁ ${label('Browser only','Yalnızca tarayıcı')}`;
    }catch{element.textContent=`⚠ ${label('Sync error','Senkronizasyon hatası')}`}
  }

  function installStyles(){
    if(document.getElementById('vensisStandaloneSidebarStyle'))return;
    const s=document.createElement('style');
    s.id='vensisStandaloneSidebarStyle';
    s.textContent=`
      :root{--vensis-side-width:210px;--vensis-side-top:0px}
      .vensis-side-menu{position:fixed!important;left:0!important;top:var(--vensis-side-top)!important;bottom:0!important;width:var(--vensis-side-width)!important;z-index:9000!important;display:flex!important;flex-direction:column!important;background:#fff!important;border-right:1px solid #d7e1e3!important;box-shadow:4px 0 18px rgba(23,48,51,.07)!important;font-family:Arial,Helvetica,sans-serif!important;color:#173033!important}
      .vensis-side-menu *{box-sizing:border-box}.vensis-side-menu-head{padding:17px 14px 10px;color:#7a8b8f;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.vensis-side-menu-nav{padding:0 10px;display:grid;gap:6px}.vensis-side-menu a{display:flex!important;align-items:center!important;min-height:42px!important;padding:10px 12px!important;border-radius:9px!important;color:#29484d!important;background:#f2f6f5!important;border:1px solid transparent!important;text-decoration:none!important;font-size:13px!important;font-weight:800!important;line-height:1.2!important}.vensis-side-menu a:hover{border-color:#b9d5c8!important;background:#edf7f2!important;color:#087f4f!important}.vensis-side-menu a.active{background:#087f4f!important;color:#fff!important;border-color:#087f4f!important}.vensis-side-menu-group{margin-top:2px}.vensis-side-menu-group-title{display:flex!important;align-items:center!important;justify-content:space-between!important}.vensis-side-menu-group-title.active{background:#e7f4ee!important;color:#087f4f!important;border-color:#b9d5c8!important}.vensis-side-menu-sub{display:grid;gap:5px;padding:6px 0 0 12px}.vensis-side-menu-sub a{min-height:36px!important;padding:8px 10px!important;background:#fff!important;border:1px solid #e1e9e7!important;font-size:11px!important;letter-spacing:.035em!important}.vensis-side-menu-sub a.active{background:#087f4f!important;color:#fff!important;border-color:#087f4f!important}.vensis-side-menu-foot{margin-top:auto;padding:12px 10px 14px;border-top:1px solid #e1e9e7}.vensis-side-cloud{display:flex;align-items:center;min-height:38px;padding:9px 10px;border:1px solid #cfe0d8;border-radius:9px;background:#f4faf7;color:#087f4f;font-size:11px;font-weight:800}.vensis-side-lang{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.vensis-side-lang button{min-height:36px;border:1px solid #d7e1e3;border-radius:8px;background:#fff;color:#52666b;font:800 11px Arial,Helvetica,sans-serif;cursor:pointer}.vensis-side-lang button.active{background:#087f4f;color:#fff;border-color:#087f4f}
      @media(min-width:901px){body.vensis-side-menu-ready>.workspace,body.vensis-side-menu-ready>.quotation-workspace,body.vensis-side-menu-ready>.toolbar,body.vensis-side-menu-ready>main#projectPrintRoot,body.vensis-side-menu-ready>main#detailPage{width:calc(100% - var(--vensis-side-width) - 18px)!important;max-width:none!important;margin-left:calc(var(--vensis-side-width) + 9px)!important;margin-right:9px!important}}
      @media(max-width:900px){:root{--vensis-side-width:170px}.vensis-side-menu a{font-size:12px!important;padding:9px!important}.vensis-side-menu-sub{padding-left:8px}body.vensis-side-menu-ready>.workspace,body.vensis-side-menu-ready>.quotation-workspace,body.vensis-side-menu-ready>.toolbar,body.vensis-side-menu-ready>main#projectPrintRoot,body.vensis-side-menu-ready>main#detailPage{width:calc(100% - var(--vensis-side-width) - 8px)!important;max-width:none!important;margin-left:calc(var(--vensis-side-width) + 4px)!important;margin-right:4px!important}}
      @media print{.vensis-side-menu{display:none!important}}
    `;
    document.head.appendChild(s);
  }

  function headerBottom(){
    const direct=[...document.body.children].filter(el=>el.matches('header,.top,.catalog-top'));
    const header=direct.find(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return cs.display!=='none'&&r.height>10});
    document.documentElement.style.setProperty('--vensis-side-top',`${header?Math.max(0,Math.round(header.getBoundingClientRect().bottom)):0}px`);
  }

  function mount(){
    installStyles();
    if(document.getElementById('vensisSideMenu'))return;
    const lang=currentLang();
    const menu=document.createElement('aside');
    menu.id='vensisSideMenu';menu.className='vensis-side-menu';menu.dataset.vensisBuild=BUILD;
    menu.innerHTML=`<div class="vensis-side-menu-head">${label('Menu','Menü')}</div><nav class="vensis-side-menu-nav" aria-label="Vensis"><a class="${isProjectPage()?'active':''}" href="${base}projects.html">${label('Projects','Projeler')}</a><a class="${isCustomerPage()?'active':''}" href="${base}customers.html">${label('Customers','Müşteriler')}</a><div class="vensis-side-menu-group"><a class="vensis-side-menu-group-title ${isCatalogHub()||isFanCatalog()||isElectricalCatalog()?'active':''}" href="${base}catalog-hub.html">${label('Product Catalog','Ürün Kataloğu')} <span>›</span></a><div class="vensis-side-menu-sub"><a class="${isFanCatalog()?'active':''}" href="${base}catalog.html">${label('VENTILATION','HAVALANDIRMA')}</a><a class="${isElectricalCatalog()?'active':''}" href="${base}electrical/index.html">${label('ELECTRICAL','ELEKTRİK')}</a></div></div></nav><div class="vensis-side-menu-foot"><div class="vensis-side-cloud">☁ ${label('Browser only','Yalnızca tarayıcı')}</div><div class="vensis-side-lang"><button class="${lang==='en'?'active':''}" type="button" data-side-lang="en">EN</button><button class="${lang==='tr'?'active':''}" type="button" data-side-lang="tr">TR</button></div></div>`;
    document.body.appendChild(menu);document.body.classList.add('vensis-side-menu-ready');menu.querySelectorAll('[data-side-lang]').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.sideLang)));headerBottom();requestAnimationFrame(headerBottom);setTimeout(headerBottom,200);refreshCloudStatus();
  }

  window.addEventListener('resize',headerBottom);
  if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
