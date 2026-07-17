(function(){
  const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const supported=new Set(['index.html','quotation-edit.html','quotation-report.html']);
  if(!supported.has(page))return;

  function resolveModel(value,catalog){
    const text=String(value||'').replace(/^\s*Model\s*:\s*/i,'').trim();
    if(catalog.getImage(text))return text;
    const upper=text.toUpperCase().replace(/\\/g,'/');
    const keys=Object.keys(catalog.seriesNames||{}).sort((a,b)=>b.length-a.length);
    const key=keys.find(k=>upper===k||upper.startsWith(k+' ')||upper.startsWith(k+'-')||upper.includes(' '+k+' ')||upper.includes(' '+k+'-'));
    return key||text;
  }

  function makeImage(model,catalog,className,size){
    const src=catalog.getImage(model);
    if(!src)return null;
    const img=document.createElement('img');
    img.className=className;
    img.src=src;
    img.alt=catalog.getSeriesName(model)||model;
    img.loading='eager';
    img.style.cssText=`width:${size}px;height:${size}px;object-fit:contain;flex:0 0 auto;border:1px solid #e2e9e5;border-radius:8px;background:#fff;padding:5px`;
    img.onerror=function(){this.remove()};
    return img;
  }

  function decorateQuotation(catalog){
    document.querySelectorAll('.model-code').forEach(code=>{
      const cell=code.closest('td')||code.parentElement;
      if(!cell||cell.querySelector('.quotation-product-image'))return;
      const model=resolveModel(code.textContent,catalog);
      const img=makeImage(model,catalog,'quotation-product-image',74);
      if(!img)return;
      img.style.cssText+=';float:left;margin:0 12px 7px 0';
      cell.insertBefore(img,cell.firstChild);
    });
  }

  function decorateSelection(catalog){
    document.querySelectorAll('.results-table tbody tr').forEach(row=>{
      const cell=row.cells&&row.cells[0];
      const modelNode=cell&&cell.querySelector('.model-main');
      if(!cell||!modelNode||cell.querySelector('.selection-product-image'))return;
      const model=resolveModel(modelNode.textContent,catalog);
      const img=makeImage(model,catalog,'selection-product-image',72);
      if(!img)return;
      const series=catalog.getSeriesName(model)||'';
      const text=document.createElement('div');
      text.style.cssText='min-width:0';
      if(series){
        const title=document.createElement('div');
        title.className='selection-series-name';
        title.textContent=series;
        title.style.cssText='font-weight:700;color:#173f46;margin-bottom:4px;line-height:1.25';
        text.appendChild(title);
      }
      modelNode.style.cssText+=';font-size:12px;color:#60736a;line-height:1.3';
      text.appendChild(modelNode);
      const wrap=document.createElement('div');
      wrap.className='selection-product-summary';
      wrap.style.cssText='display:flex;align-items:center;gap:12px;min-width:250px';
      wrap.appendChild(img);
      wrap.appendChild(text);
      cell.appendChild(wrap);
    });
  }

  function decorate(){
    const catalog=window.VensisCatalog;
    if(!catalog)return;
    if(page==='index.html')decorateSelection(catalog);
    else decorateQuotation(catalog);
  }

  function start(){
    decorate();
    const observer=new MutationObserver(decorate);
    observer.observe(document.body,{childList:true,subtree:true});
    let count=0;
    const timer=setInterval(()=>{decorate();if(++count>=40)clearInterval(timer)},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();