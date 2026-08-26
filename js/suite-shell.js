(function(){
  'use strict';

  const BUILD='20260826-technical-note-r1';
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
  const isHome=()=>!inElectrical&&(path==='/'||path.endsWith('/index.html'));
  const isFanSelection=()=>path.endsWith('/fan-selection.html');
  const tr=value=>window.VensisI18n?.t?.(value)||value;

  function updateCloudStatus(detail={}){
    const element=document.querySelector('.vensis-suite-shell .suite-cloud');
    if(!element)return;
    const state=detail.state||'local';
    const fallback=state==='synced'?'Cloud synced':state==='syncing'?'Syncing…':state==='error'?'Sync error':'Browser only';
    const label=element.querySelector('.suite-cloud-text');
    if(label)label.textContent=tr(detail.message||fallback);
    element.dataset.state=state;
  }

  function installStyles(){
    if(document.getElementById('vensisSuiteShellStyle'))return;
    const s=document.createElement('style');
    s.id='vensisSuiteShellStyle';
    s.textContent=`
      :root{--vensis-header-h:72px}
      body>.top,body>.catalog-top,body>header.top{display:none!important}
      .vensis-suite-shell{display:block!important;position:fixed!important;left:0!important;right:0!important;top:0!important;width:100%!important;z-index:2147483647!important;background:#0b282b!important;border-bottom:1px solid rgba(255,255,255,.09)!important;box-shadow:0 8px 28px rgba(7,31,32,.18)!important}
      .vensis-suite-shell-inner{max-width:1600px;margin:auto;padding:10px 20px;display:flex;align-items:center;gap:18px;min-height:var(--vensis-header-h);overflow:hidden;white-space:nowrap}
      .vensis-suite-brand{display:inline-flex!important;align-items:center!important;gap:11px!important;min-height:50px!important;padding:6px 12px!important;border:0!important;border-radius:13px!important;background:#fff!important;text-decoration:none!important;flex:0 0 auto!important}
      .vensis-suite-logo{height:33px;max-width:128px;object-fit:contain;flex:0 0 auto}
      .vensis-suite-title{display:block;color:#567176;font:800 9px/1.15 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase}
      .suite-nav{display:flex;align-items:center;gap:3px;min-width:0;overflow-x:auto;scrollbar-width:none;flex:1}.suite-nav::-webkit-scrollbar{display:none}
      .vensis-suite-shell .suite-nav a{position:relative;display:inline-flex!important;align-items:center;justify-content:center;min-height:43px;padding:0 13px;border:0;background:transparent;color:#b9ceca;text-decoration:none;font:800 12px Arial,Helvetica,sans-serif;cursor:pointer;white-space:nowrap;flex:0 0 auto}
      .vensis-suite-shell .suite-nav a:after{content:"";position:absolute;left:13px;right:13px;bottom:1px;height:2px;border-radius:99px;background:#9bd43f;transform:scaleX(0);transition:.18s transform}
      .vensis-suite-shell .suite-nav a:hover{color:#fff}.vensis-suite-shell .suite-nav a.active{color:#fff}.vensis-suite-shell .suite-nav a.active:after{transform:scaleX(1)}
      .suite-tools{display:flex;align-items:center;gap:8px;flex:0 0 auto}
      .vensis-suite-shell .suite-cloud{display:inline-flex!important;align-items:center;gap:7px;min-height:36px;padding:0 11px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.055);color:#a9bfbb;font:800 10px Arial,Helvetica,sans-serif;white-space:nowrap;cursor:pointer}
      .suite-cloud-dot{width:7px;height:7px;border-radius:50%;background:#80928f;box-shadow:0 0 0 4px rgba(128,146,143,.1)}
      .vensis-suite-shell .suite-cloud[data-state="synced"]{color:#b7dcbd}.vensis-suite-shell .suite-cloud[data-state="synced"] .suite-cloud-dot{background:#8fd258;box-shadow:0 0 0 4px rgba(143,210,88,.12)}
      .vensis-suite-shell .suite-cloud[data-state="error"]{color:#ffaaa4}.vensis-suite-shell .suite-cloud[data-state="error"] .suite-cloud-dot{background:#ef6b62}
      .suite-language{display:flex;padding:3px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.055)}
      .vensis-suite-shell .suite-lang{min-width:34px;min-height:30px;padding:0;border:0;border-radius:7px;background:transparent;color:#91aaa6;font:900 10px Arial,Helvetica,sans-serif;cursor:pointer}
      .vensis-suite-shell .suite-lang.active{background:#9bd43f;color:#102c30}
      .vensis-technical-note{position:fixed;right:12px;bottom:8px;z-index:1200;padding:4px 7px;border:0;border-radius:6px;background:rgba(255,255,255,.82);color:#7a8987;font:700 9px/1.2 Arial,Helvetica,sans-serif;text-decoration:underline;text-underline-offset:2px;cursor:pointer;opacity:.72;box-shadow:0 1px 5px rgba(16,44,48,.08)}
      .vensis-technical-note:hover,.vensis-technical-note:focus-visible{color:#355259;opacity:1}
      .vensis-technical-dialog{width:min(620px,calc(100% - 28px));max-height:min(78vh,680px);padding:0;border:1px solid #d7e2df;border-radius:15px;background:#fff;color:#173033;box-shadow:0 26px 80px rgba(7,31,32,.32);font-family:Arial,Helvetica,sans-serif}
      .vensis-technical-dialog::backdrop{background:rgba(8,28,31,.58);backdrop-filter:blur(3px)}
      .vensis-technical-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e1e9e7;background:#f7faf9}.vensis-technical-dialog-head h2{margin:0;font-size:17px;letter-spacing:-.02em}.vensis-technical-dialog-head button{width:31px;height:31px;border:0;border-radius:8px;background:#e8efed;color:#52666b;font-size:20px;cursor:pointer}
      .vensis-technical-dialog-body{padding:18px 20px;overflow:auto;color:#52666b;font-size:11px;font-weight:650;line-height:1.65}.vensis-technical-dialog-body p{margin:0 0 12px}.vensis-technical-dialog-body p:last-child{margin-bottom:0}
      .vensis-technical-dialog-actions{display:flex;justify-content:flex-end;padding:12px 20px;border-top:1px solid #e1e9e7;background:#fafcfb}.vensis-technical-dialog-actions button{min-height:35px;padding:0 16px;border:0;border-radius:8px;background:#087f4f;color:#fff;font:800 10px Arial,Helvetica,sans-serif;cursor:pointer}
      body{padding-top:var(--vensis-header-h)!important;scroll-padding-top:calc(var(--vensis-header-h) + 8px)!important}
      @media(max-width:900px){.vensis-suite-shell-inner{gap:10px;padding:9px 11px}.vensis-suite-title{display:none}.vensis-suite-brand{padding:6px 9px!important}.vensis-suite-shell .suite-nav a{padding:0 10px}.vensis-suite-shell .suite-nav a:after{left:10px;right:10px}.suite-cloud-text{display:none}.vensis-suite-shell .suite-cloud{width:35px;justify-content:center;padding:0}}
      @media(max-width:620px){
        :root{--vensis-header-h:62px}
        .vensis-suite-shell-inner{min-height:62px;padding:6px 8px;gap:6px}
        .vensis-suite-brand{min-height:44px!important;padding:4px 7px!important}.vensis-suite-logo{height:28px;max-width:100px}
        .vensis-suite-shell .suite-nav a{min-height:39px;padding:0 9px;font-size:10px}.vensis-suite-shell .suite-nav a:after{left:9px;right:9px}
        .vensis-suite-shell .suite-cloud{display:none!important}.suite-language{padding:2px}.vensis-suite-shell .suite-lang{min-width:29px;min-height:28px;font-size:9px}
      }
      @media print{.vensis-suite-shell,.vensis-technical-note,.vensis-technical-dialog{display:none!important}body{padding-top:0!important}}
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
      <a class="vensis-suite-brand" href="${base}index.html" aria-label="Vensis Engineering Suite"><img class="vensis-suite-logo" src="${base}assets/vensis-logo.png" alt="Vensis"><span class="vensis-suite-title">Engineering<br>Suite</span></a>
      <nav class="suite-nav" aria-label="Main navigation">
        <a class="${isHome()?'active':''}" href="${base}index.html">${tr('Overview')}</a>
        <a class="${isFanSelection()?'active':''}" href="${base}fan-selection.html">Fan Selection</a>
        <a class="${isCatalogPage()?'active':''}" href="${base}catalog-hub.html">${tr('Product Catalog')}</a>
        <a class="${isProjectPage()?'active':''}" href="${base}projects.html">${tr('Projects')}</a>
        <a class="${isActive('/customers.html')?'active':''}" href="${base}customers.html">${tr('Customers')}</a>
      </nav>
      <div class="suite-tools"><button class="suite-cloud" data-state="local" type="button" aria-label="Oturum ve bulut ayarları"><i class="suite-cloud-dot"></i><span class="suite-cloud-text">${tr('Browser only')}</span></button><div class="suite-language"><button class="suite-lang ${lang==='en'?'active':''}" data-lang="en" type="button">EN</button><button class="suite-lang ${lang==='tr'?'active':''}" data-lang="tr" type="button">TR</button></div></div>
    </div>`;
    document.body.prepend(shell);
    shell.querySelectorAll('[data-lang]').forEach(btn=>btn.addEventListener('click',()=>setLang(btn.dataset.lang)));
    shell.querySelector('.suite-cloud')?.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('vensis-open-access-panel')));
    updateCloudStatus(window.VensisProjects?.cloudState?.()||window.VensisCustomers?.cloudState?.()||{});
    return shell;
  }

  function removeSidebar(){
    document.getElementById('vensisSideMenu')?.remove();
    document.body.classList.remove('vensis-side-menu-ready');
  }

  function mountDisclaimer(){
    if(document.getElementById('vensisTechnicalDisclaimer'))return;
    const isTurkish=currentLang()==='tr';
    const copy=isTurkish?{
      label:'Teknik Bilgilendirme',
      title:'Teknik Bilgilendirme ve Sorumluluk Notu',
      paragraphs:[
        'Bu platformda yer alan ürün bilgileri; üretici ve tedarikçiler tarafından yayımlanan kataloglar, teknik föyler ve diğer dokümanlardan derlenmektedir. Bilgilerin doğru ve güncel tutulması için gerekli özen gösterilmekle birlikte kaynak dokümanlardan, veri aktarımından, hesaplamalardan veya yorumlamadan kaynaklanan hata ve eksiklikler bulunabilir.',
        'Seçim sonuçları, teknik değerler, fiyatlar ve uygunluk değerlendirmeleri ön bilgilendirme niteliğindedir; nihai mühendislik hesabı, proje onayı veya sipariş teyidi yerine geçmez. Sipariş ve uygulama öncesinde ürün kodu, performans değerleri, ölçüler, sertifikalar, kullanım koşulları ve güncel fiyatlar Vensis tarafından yazılı olarak teyit edilmelidir.',
        'Platformdaki bilgiler ile Vensis tarafından sunulan güncel teklif veya teknik doküman arasında farklılık bulunması hâlinde, yazılı olarak teyit edilen güncel belge esas alınır. Kanunen sınırlandırılamayan sorumluluklar saklıdır.'
      ],
      close:'Kapat'
    }:{
      label:'Technical Information',
      title:'Technical Information and Disclaimer',
      paragraphs:[
        'Product information on this platform is compiled from catalogs, technical datasheets and other documents published by manufacturers and suppliers. Although reasonable care is taken to keep the information accurate and current, errors or omissions may arise from source documents, data transfer, calculations or interpretation.',
        'Selection results, technical values, prices and suitability assessments are for preliminary information only and do not replace final engineering calculations, project approval or order confirmation. Product codes, performance values, dimensions, certificates, operating conditions and current prices must be confirmed in writing by Vensis before ordering or application.',
        'If information on the platform differs from a current quotation or technical document issued by Vensis, the current document confirmed in writing shall prevail. Liability that cannot legally be limited remains reserved.'
      ],
      close:'Close'
    };
    const trigger=document.createElement('button');
    trigger.className='vensis-technical-note';trigger.type='button';trigger.textContent=copy.label;
    trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','vensisTechnicalDisclaimer');
    const dialog=document.createElement('dialog');
    dialog.id='vensisTechnicalDisclaimer';dialog.className='vensis-technical-dialog';
    dialog.innerHTML=`<div class="vensis-technical-dialog-head"><h2>${copy.title}</h2><button type="button" data-close-disclaimer aria-label="${copy.close}">×</button></div><div class="vensis-technical-dialog-body">${copy.paragraphs.map(paragraph=>`<p>${paragraph}</p>`).join('')}</div><div class="vensis-technical-dialog-actions"><button type="button" data-close-disclaimer>${copy.close}</button></div>`;
    document.body.append(trigger,dialog);
    const close=()=>dialog.close?.()||dialog.removeAttribute('open');
    trigger.addEventListener('click',()=>dialog.showModal?.()||dialog.setAttribute('open',''));
    dialog.querySelectorAll('[data-close-disclaimer]').forEach(button=>button.addEventListener('click',close));
    dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
  }

  function mount(){
    installStyles();
    removeSidebar();
    mountDisclaimer();
    return {header:mountHeader()};
  }

  window.VensisSuiteShell={mount,build:BUILD};
  window.addEventListener('vensis-project-cloud-status',event=>updateCloudStatus(event.detail));
  window.addEventListener('vensis-customer-cloud-status',event=>updateCloudStatus(event.detail));
  window.addEventListener('vensis-edit-session-changed',event=>{
    if(event.detail?.authenticated)updateCloudStatus({state:'syncing',message:'Syncing…'});
    else updateCloudStatus({state:'local',message:'Browser only'});
  });
  if(document.body)mount();
  else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
