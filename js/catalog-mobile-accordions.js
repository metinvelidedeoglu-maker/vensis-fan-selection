(function(){
  const MOBILE_QUERY='(max-width: 620px)';

  function addStyles(){
    if(document.getElementById('catalogMobileAccordionStyles'))return;
    const style=document.createElement('style');
    style.id='catalogMobileAccordionStyles';
    style.textContent=`
      body.app-catalog #catalogLayout[hidden],
      body.app-catalog #detailPage[hidden]{display:none!important}
      .catalog-filter-toggle>summary,
      .series-info-toggle>summary{display:none}
      .catalog-filter-body{min-width:0}
      @media(max-width:620px){
        html,body.app-catalog{max-width:100%;overflow-x:hidden}
        body.app-catalog .catalog-top{
          position:relative!important;
          top:auto!important;
          gap:10px!important;
          padding:10px 12px!important;
          align-items:flex-start!important;
          flex-direction:column!important;
        }
        body.app-catalog .catalog-brand{width:100%;gap:9px!important;min-width:0}
        body.app-catalog .catalog-brand img{height:36px!important;max-width:150px!important}
        body.app-catalog .catalog-brand>div{min-width:0}
        body.app-catalog .catalog-brand b{font-size:14px;line-height:1.2}
        body.app-catalog .catalog-nav{
          width:100%!important;
          display:flex!important;
          flex-wrap:nowrap!important;
          gap:6px!important;
          overflow-x:auto!important;
          overscroll-behavior-inline:contain;
          -webkit-overflow-scrolling:touch;
          scrollbar-width:none;
          padding-bottom:2px;
        }
        body.app-catalog .catalog-nav::-webkit-scrollbar{display:none}
        body.app-catalog .catalog-nav a{
          flex:0 0 auto;
          min-height:38px;
          padding:8px 10px!important;
          font-size:12px!important;
          white-space:nowrap;
        }
        body.app-catalog .catalog-layout{
          display:grid!important;
          grid-template-columns:minmax(0,1fr)!important;
          gap:8px!important;
          padding:8px!important;
          min-width:0;
        }
        body.app-catalog .catalog-filter{
          position:static!important;
          top:auto!important;
          padding:0!important;
          overflow:hidden;
          border-radius:12px!important;
        }
        .catalog-filter-toggle,
        .series-info-toggle{display:block;border:0;margin:0;padding:0}
        .catalog-filter-toggle>summary,
        .series-info-toggle>summary{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          min-height:52px;
          padding:12px 14px;
          list-style:none;
          cursor:pointer;
          color:#173033;
          font-size:16px;
          font-weight:850;
          letter-spacing:-.02em;
          background:linear-gradient(135deg,#fff,#f2f8f5);
        }
        .catalog-filter-toggle>summary::-webkit-details-marker,
        .series-info-toggle>summary::-webkit-details-marker{display:none}
        .catalog-filter-toggle>summary:after,
        .series-info-toggle>summary:after{
          content:'⌄';
          display:flex;
          width:29px;
          height:29px;
          flex:0 0 29px;
          align-items:center;
          justify-content:center;
          border-radius:9px;
          background:#e8f3ed;
          color:#087f4f;
          font-size:18px;
          transition:transform .18s ease;
        }
        .catalog-filter-toggle:not([open])>summary:after,
        .series-info-toggle:not([open])>summary:after{transform:rotate(-90deg)}
        .catalog-filter-body{padding:4px 14px 14px;border-top:1px solid #e2eae7}
        .catalog-filter-body>h2{display:none}
        body.app-catalog .check-list{max-height:220px!important}
        body.app-catalog .check-row{min-height:40px;padding:8px 5px!important;font-size:13px!important}
        body.app-catalog .catalog-content{
          min-width:0;
          padding:10px!important;
          border-radius:12px!important;
        }
        body.app-catalog .catalog-head{gap:8px!important;margin-bottom:10px!important;align-items:flex-end!important}
        body.app-catalog .catalog-head h1,
        body.app-catalog .catalog-head h2{font-size:22px!important;line-height:1.15}
        body.app-catalog .catalog-count{font-size:11px!important;white-space:nowrap}
        body.app-catalog .catalog-grid{grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
        body.app-catalog .series-card{
          display:grid!important;
          grid-template-columns:112px minmax(0,1fr)!important;
          min-height:150px;
          border-radius:12px!important;
          transform:none!important;
          box-shadow:none!important;
          content-visibility:auto;
          contain-intrinsic-size:150px;
        }
        body.app-catalog .series-card-image{
          height:100%!important;
          min-height:150px;
          border-right:1px solid #e2eae7;
        }
        body.app-catalog .series-card-image img{padding:10px!important}
        body.app-catalog .series-card-body{min-width:0;padding:11px 12px!important}
        body.app-catalog .series-brand{font-size:10px!important}
        body.app-catalog .series-card h2{
          margin:4px 0!important;
          font-size:17px!important;
          line-height:1.12!important;
          overflow-wrap:anywhere;
        }
        body.app-catalog .series-title{
          min-height:0!important;
          font-size:12px!important;
          line-height:1.3!important;
        }
        body.app-catalog .series-card p{display:none!important}
        body.app-catalog .series-card-footer{
          align-items:flex-start!important;
          margin-top:9px!important;
          padding-top:8px!important;
          font-size:11px!important;
          line-height:1.2;
        }
        body.app-catalog .series-card-footer span{text-align:right}
        body.app-catalog .detail-page{
          width:100%!important;
          max-width:none!important;
          margin:0!important;
          padding:10px!important;
          border-left:0!important;
          border-right:0!important;
          border-radius:0!important;
          overflow:hidden;
        }
        body.app-catalog .detail-back{width:100%;justify-content:flex-start;margin-bottom:10px!important}
        body.app-catalog .series-hero{
          grid-template-columns:minmax(0,1fr)!important;
          gap:12px!important;
          padding:0 0 16px!important;
        }
        body.app-catalog .series-hero-image{height:210px!important;border-radius:12px!important}
        body.app-catalog .series-hero-image img{padding:14px!important}
        body.app-catalog .series-hero-copy h1{
          margin:4px 0!important;
          font-size:27px!important;
          line-height:1.08!important;
          overflow-wrap:anywhere;
        }
        body.app-catalog .series-hero-copy h2{margin:0 0 10px!important;font-size:16px!important;line-height:1.3!important}
        body.app-catalog .series-badges{gap:5px!important}
        body.app-catalog .series-badges span{padding:5px 7px!important;font-size:10px!important}
        body.app-catalog .catalog-pdf{width:100%;justify-content:center;margin-top:12px!important}
        .series-info-toggle{margin-top:12px;border:1px solid #d8e3df;border-radius:12px;overflow:hidden;background:#fff}
        .series-info-toggle>summary{border-bottom:1px solid transparent}
        .series-info-toggle[open]>summary{border-bottom-color:#e2eae7}
        .series-info-toggle>.series-info-grid{margin:0;padding:10px;grid-template-columns:1fr!important;gap:8px!important}
        .series-info-toggle .detail-section{margin:0;padding:12px!important}
        body.app-catalog .models-section{margin-top:16px!important}
        body.app-catalog .models-grid{grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
        body.app-catalog .model-card{min-width:0;padding:10px!important;border-radius:11px!important}
        body.app-catalog .model-card-head{align-items:flex-start!important;gap:10px!important;padding-bottom:10px!important}
        body.app-catalog .model-card-head img{width:64px!important;height:64px!important;flex:0 0 64px}
        body.app-catalog .model-card-head>div{min-width:0}
        body.app-catalog .model-card h3{font-size:15px!important;overflow-wrap:anywhere}
        body.app-catalog .model-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important;margin-top:10px!important}
        body.app-catalog .model-field{padding:7px!important;min-width:0}
        body.app-catalog .model-field span{font-size:9px!important}
        body.app-catalog .model-field b{font-size:11px!important;line-height:1.25!important}
        body.app-catalog .model-operating-scroll{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
        body.app-catalog .model-operating-points table{min-width:560px}
        body.app-catalog .model-dimension img{max-height:300px!important}
      }
      @media(max-width:390px){
        body.app-catalog .series-card{grid-template-columns:96px minmax(0,1fr)!important}
        body.app-catalog .series-card-image{min-height:142px}
        body.app-catalog .series-card-body{padding:10px!important}
        body.app-catalog .series-card h2{font-size:16px!important}
        body.app-catalog .model-grid{grid-template-columns:minmax(0,1fr)!important}
      }
      @media(min-width:621px){
        .catalog-filter-toggle:not([open])>.catalog-filter-body,
        .series-info-toggle:not([open])>.series-info-grid{display:grid!important}
      }
    `;
    document.head.appendChild(style);
  }

  function label(key){
    const tr=(window.VensisI18n?.getLanguage?.()||'en')==='tr';
    if(key==='filters')return tr?'Filtreler':'Filters';
    if(key==='seriesInfo')return tr?'Seri Bilgileri':'Series Information';
    return key;
  }

  function mountFilterAccordion(){
    const filter=document.querySelector('.catalog-filter');
    if(!filter||filter.querySelector('.catalog-filter-toggle'))return;
    const details=document.createElement('details');
    details.className='catalog-filter-toggle';
    details.open=!window.matchMedia(MOBILE_QUERY).matches;
    const summary=document.createElement('summary');
    summary.textContent=label('filters');
    const body=document.createElement('div');
    body.className='catalog-filter-body';
    while(filter.firstChild)body.appendChild(filter.firstChild);
    details.append(summary,body);
    filter.appendChild(details);
  }

  function mountSeriesAccordion(){
    const detail=document.getElementById('detailPage');
    const grid=detail?.querySelector('.series-info-grid');
    if(!grid||grid.closest('.series-info-toggle'))return;
    const details=document.createElement('details');
    details.className='series-info-toggle';
    details.open=!window.matchMedia(MOBILE_QUERY).matches;
    const summary=document.createElement('summary');
    summary.textContent=label('seriesInfo');
    grid.insertAdjacentElement('beforebegin',details);
    details.append(summary,grid);
  }

  function refreshLabels(){
    const filter=document.querySelector('.catalog-filter-toggle>summary');
    const series=document.querySelector('.series-info-toggle>summary');
    if(filter)filter.textContent=label('filters');
    if(series)series.textContent=label('seriesInfo');
  }

  function enforceDetailVisibility(){
    const layout=document.getElementById('catalogLayout');
    const detail=document.getElementById('detailPage');
    if(!layout||!detail)return;
    if(!detail.hidden){
      layout.hidden=true;
      layout.style.setProperty('display','none','important');
    }else{
      layout.style.removeProperty('display');
    }
  }

  function withoutRepeatedCode(code,text){
    const cleanCode=String(code||'').trim();
    const cleanText=String(text||'').trim();
    if(!cleanCode||!cleanText)return cleanText;
    if(cleanText.toLocaleLowerCase('en-US')===cleanCode.toLocaleLowerCase('en-US'))return cleanText;
    if(!cleanText.toLocaleLowerCase('en-US').startsWith(cleanCode.toLocaleLowerCase('en-US')))return cleanText;
    return cleanText.slice(cleanCode.length).replace(/^\s*[-–—:|/]?\s*/,'').trim()||cleanText;
  }

  function cleanVorticeTitles(root=document){
    root.querySelectorAll?.('.series-card').forEach(card=>{
      const brand=String(card.querySelector('.series-brand')?.textContent||'').trim();
      if(brand.toLocaleLowerCase('en-US')!=='vortice')return;
      const code=String(card.querySelector('h2')?.textContent||'').trim();
      const title=card.querySelector('.series-title');
      if(title){const cleaned=withoutRepeatedCode(code,title.textContent);if(cleaned!==title.textContent)title.textContent=cleaned}
    });
    root.querySelectorAll?.('.series-hero-copy').forEach(hero=>{
      const brand=String(hero.querySelector('.series-brand')?.textContent||'').trim();
      if(brand.toLocaleLowerCase('en-US')!=='vortice')return;
      const code=String(hero.querySelector('h1')?.textContent||'').trim();
      const title=hero.querySelector('h2');
      if(title){const cleaned=withoutRepeatedCode(code,title.textContent);if(cleaned!==title.textContent)title.textContent=cleaned}
    });
  }

  function mount(){
    addStyles();
    mountFilterAccordion();
    mountSeriesAccordion();
    enforceDetailVisibility();
    cleanVorticeTitles(document);
    refreshLabels();
    window.addEventListener('vensis-language-changed',refreshLabels);
    const grid=document.getElementById('catalogGrid');
    if(grid)new MutationObserver(()=>cleanVorticeTitles(grid)).observe(grid,{childList:true,subtree:true});
    const detail=document.getElementById('detailPage');
    if(detail){
      new MutationObserver(()=>{
        mountSeriesAccordion();
        enforceDetailVisibility();
        cleanVorticeTitles(detail);
        refreshLabels();
      }).observe(detail,{childList:true,subtree:false,attributes:true,attributeFilter:['hidden']});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();