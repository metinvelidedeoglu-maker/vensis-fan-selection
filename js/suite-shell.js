(function(){
  'use strict';
  const BUILD='20260825-r11';
  window.VENSIS_BUILD=BUILD;
  const path=(location.pathname||'').toLowerCase();
  const inElectrical=path.includes('/electrical/');
  const base=inElectrical?'../':'';
  const isActive=(needle)=> path.endsWith(needle);
  const currentLang=()=>localStorage.getItem('vensis_language_v1')||'en';
  const setLang=(lang)=>{localStorage.setItem('vensis_language_v1',lang); location.reload();};
  function style(){
    if(document.getElementById('vensisSuiteShellStyle'))return;
    const s=document.createElement('style');
    s.id='vensisSuiteShellStyle';
    s.textContent=`
      :root{--vensis-header-h:58px}
      .vensis-suite-shell{position:fixed!important;left:0;right:0;top:0;width:100%;z-index:2147483647!important;background:#fff;border-bottom:1px solid #d7e1e3;box-shadow:0 2px 10px rgba(23,48,51,.08)}
      .vensis-suite-shell-inner{max-width:1600px;margin:auto;padding:10px 16px;display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap;min-height:var(--vensis-header-h)}
      .vensis-suite-logo{height:34px;max-width:150px;object-fit:contain;margin-right:2px;flex:0 0 auto}
      .vensis-suite-title{font:800 13px Arial,Helvetica,sans-serif;color:#173033;margin-right:8px;flex:0 0 auto}
      .vensis-suite-shell a,.vensis-suite-shell button,.vensis-suite-shell .suite-cloud{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:8px 11px;border-radius:9px;border:1px solid #d7e1e3;background:#eef3f2;color:#29484d;text-decoration:none;font:800 12px Arial,Helvetica,sans-serif;cursor:pointer;white-space:nowrap;flex:0 0 auto}
      .vensis-suite-shell a.active{background:#087f4f;color:#fff;border-color:#087f4f}
      .vensis-suite-shell .suite-cloud{background:#fff;color:#087f4f;cursor:default}
      .vensis-suite-shell .suite-lang.active{background:#087f4f;color:#fff;border-color:#087f4f}
      body{padding-top:var(--vensis-header-h)!important;scroll-padding-top:calc(var(--vensis-header-h) + 8px)!important}
      @media(max-width:760px){:root{--vensis-header-h:54px}.vensis-suite-shell-inner{padding:8px 10px}.vensis-suite-logo{height:30px}.vensis-suite-title{font-size:12px}.vensis-suite-shell a,.vensis-suite-shell button,.vensis-suite-shell .suite-cloud{min-height:34px;padding:7px 9px;font-size:11px}}
    `;
    document.head.appendChild(s);
  }
  function applyCatalogTitles(){
    if(path.endsWith('/catalog.html')){
      document.title='Vensis Fan Katalog';
      const h1=document.querySelector('.catalog-content .catalog-head h1');
      if(h1) h1.textContent='Fan Katalog';
    }
    if(inElectrical){
      document.title='Vensis Elektrik Katalog';
      const h1=document.querySelector('#pageTitle');
      if(h1 && !h1.textContent.trim()) h1.textContent='Elektrik Katalog';
    }
  }
  function mount(){
    style(); applyCatalogTitles();
    const lang=currentLang();
    const shell=document.createElement('header');
    shell.className='vensis-suite-shell';
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
    document.querySelectorAll('.top,.catalog-top,body>.top,body>header.top').forEach(el=>{if(el!==shell)el.style.display='none'});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
