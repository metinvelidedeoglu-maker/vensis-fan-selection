(function(){
  const page=(location.pathname.split('/').pop()||'').toLowerCase();
  if(page!=='quotation-edit.html'&&page!=='quotation-report.html')return;

  function escapeSelectorValue(value){return String(value||'').replace(/"/g,'\\"')}

  function decorate(){
    const catalog=window.VensisCatalog;
    if(!catalog)return;
    document.querySelectorAll('.model-code').forEach(code=>{
      const cell=code.closest('td')||code.parentElement;
      if(!cell||cell.querySelector('.quotation-product-image'))return;
      const model=code.textContent.replace(/^\s*Model\s*:\s*/i,'').trim();
      const src=catalog.getImage(model);
      if(!src)return;
      const img=document.createElement('img');
      img.className='quotation-product-image';
      img.src=src;
      img.alt=catalog.getSeriesName(model)||model;
      img.loading='eager';
      img.style.cssText='width:74px;height:74px;object-fit:contain;float:left;margin:0 12px 7px 0;border:1px solid #e2e9e5;border-radius:7px;background:#fff;padding:4px';
      img.onerror=function(){this.remove()};
      cell.insertBefore(img,cell.firstChild);
    });
  }

  function start(){
    decorate();
    const observer=new MutationObserver(decorate);
    observer.observe(document.body,{childList:true,subtree:true});
    let count=0;
    const timer=setInterval(()=>{decorate();if(++count>=24)clearInterval(timer)},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();