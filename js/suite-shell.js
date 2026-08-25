(function(){
  'use strict';
  const BUILD='20260825-r9';
  window.VENSIS_BUILD=BUILD;
  const path=(location.pathname||'').toLowerCase();
  const inElectrical=path.includes('/electrical/');
  const inFanCatalog=path.endsWith('/catalog.html');
  const base=inElectrical?'../':'';
  const isActive=(needle)=> path.endsWith(needle);
  const countProjects=()=>{
    try{
      if(window.VensisProjects?.list) return window.VensisProjects.list().length;
      const v=JSON.parse(localStorage.getItem('vensis_projects_v1')||'[]');
      return Array.isArray(v)?v.length:0;
    }catch{return 0;}
  };
  const currentLang=()=>localStorage.getItem('vensis_language_v1')||'en';
  const setLang=(lang)=>{localStorage.setItem('vensis_language_v1',lang); location.reload();};
  function style(){
    if(document.getElementById('vensisSuiteShellStyle'))return;
    const s=document.createElement('style');
    s.id='vensisSuiteShellStyle';
    s.textContent=`
      .vensis-suite-shell{position:sticky!important;top:0;z-index:9999;background:#fff;border-bottom:1px solid #d7e1e3;box-shadow:0 2px 10px rgba(23,48,51,.05)}
      .vensis-suite-shell-inner{max-width:1600px;margin:auto;padding:10px 16px;display:flex;align-items:center;gap:8px;overflow-x:auto;white-space:nowrap}
      .vensis-suite-shell a,.vensis-suite-shell button,.vensis-suite-shell .suite-tag{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:8px 11px;border-radius:9px;border:1px solid #d7e1e3;background:#eef3f2;color:#29484d;text-decoration:none;font:800 12px Arial,Helvetica,sans-serif;cursor:pointer;white-space:nowrap}
      .vensis-suite-shell a.active{background:#087f4f;color:#fff;border-color:#087f4f}
      .vensis-suite-shell .suite-tag{background:#173033;color:#fff;border-color:#173033;cursor:default}
      .vensis-suite-shell .suite-cloud{background:#fff;color:#52666b}
      .vensis-suite-shell .suite-lang.active{background:#087f4f;color:#fff;border-color:#087f4f}
      body{scroll-padding-top:64px}
      @media(max-width:760px){.vensis-suite-shell-inner{padding:8px 10px}.vensis-suite-shell a,.vensis-suite-shell button,.vensis-suite-shell .suite-tag{min-height:34px;padding:7px 9px;font-size:11px}}
    `;
    document.head.appendChild(s);
  }
  function applyCatalogTitles(){
    if(inFanCatalog){
      document.title='Vensis Fan Katalog';
      const h1=document.querySelector('.catalog-content .catalog-head h1');
      if(h1) h1.textContent='Fan Katalog';
    }
    if(inElectrical) document.title='Vensis Elektrik Katalog';
  }
  function mount(){
    style();
    applyCatalogTitles();
    const total=countProjects();
    const lang=currentLang();
    const shell=document.createElement('header');
    shell.className='vensis-suite-shell';
    shell.innerHTML=`<div class="vensis-suite-shell-inner">
      <a class="${isActive('/index.html')&&!inElectrical?'active':''}" href="${base}index.html">⌕ Fan Selection</a>
      <a class="${inElectrical?'active':''}" href="${base}electrical/index.html">⚡ Elektrik Katalog</a>
      <a class="${inFanCatalog?'active':''}" href="${base}catalog.html">▦ Fan Katalog</a>
      <a class="${isActive('/projects.html')||isActive('/project.html')?'active':''}" href="${base}projects.html">▣ Projects${total?` ${total}`:''}</a>
      <a class="${isActive('/customers.html')?'active':''}" href="${base}customers.html">♙ Müşteriler</a>
      <span class="suite-tag">Selection Workspace</span>
      <button class="suite-cloud" type="button">☁ Browser only</button>
      <button class="suite-lang ${lang==='en'?'active':''}" data-lang="en" type="button">EN</button>
      <button class="suite-lang ${lang==='tr'?'active':''}" data-lang="tr" type="button">TR</button>
    </div>`;
    document.body.prepend(shell);
    shell.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
    document.querySelectorAll('.top,.catalog-top,body>.top,body>header.top').forEach(el=>{if(el!==shell)el.style.display='none'});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
