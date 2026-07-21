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
        body.app-catalog .catalog-filter{padding:0!important;overflow:hidden}
        .catalog-filter-toggle,
        .series-info-toggle{display:block;border:0;margin:0;padding:0}
        .catalog-filter-toggle>summary,
        .series-info-toggle>summary{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          min-height:58px;
          padding:15px 16px;
          list-style:none;
          cursor:pointer;
          color:#173033;
          font-size:17px;
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
          width:31px;
          height:31px;
          flex:0 0 31px;
          align-items:center;
          justify-content:center;
          border-radius:9px;
          background:#e8f3ed;
          color:#087f4f;
          font-size:19px;
          transition:transform .18s ease;
        }
        .catalog-filter-toggle:not([open])>summary:after,
        .series-info-toggle:not([open])>summary:after{transform:rotate(-90deg)}
        .catalog-filter-body{padding:4px 16px 16px;border-top:1px solid #e2eae7}
        .catalog-filter-body>h2{display:none}
        .series-info-toggle{margin-top:18px;border:1px solid #d8e3df;border-radius:14px;overflow:hidden;background:#fff}
        .series-info-toggle>summary{border-bottom:1px solid transparent}
        .series-info-toggle[open]>summary{border-bottom-color:#e2eae7}
        .series-info-toggle>.series-info-grid{margin:0;padding:14px;grid-template-columns:1fr}
        .series-info-toggle .detail-section{margin:0}
      }
      @media(min-width:621px){
        .catalog-filter-toggle:not([open])>.catalog-filter-body,
        .series-info-toggle:not([open])>.series-info-grid{display:grid!important}
      }
    `;
    document.head.appendChild(style);
  }

  function mountFilterAccordion(){
    const filter=document.querySelector('.catalog-filter');
    if(!filter||filter.querySelector('.catalog-filter-toggle'))return;
    const details=document.createElement('details');
    details.className='catalog-filter-toggle';
    details.open=!window.matchMedia(MOBILE_QUERY).matches;
    const summary=document.createElement('summary');
    summary.textContent='Filters';
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
    summary.textContent='Series Information';
    grid.insertAdjacentElement('beforebegin',details);
    details.append(summary,grid);
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

  function mount(){
    addStyles();
    mountFilterAccordion();
    mountSeriesAccordion();
    enforceDetailVisibility();
    const detail=document.getElementById('detailPage');
    if(detail){
      new MutationObserver(()=>{
        mountSeriesAccordion();
        enforceDetailVisibility();
      }).observe(detail,{childList:true,subtree:false,attributes:true,attributeFilter:['hidden']});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();