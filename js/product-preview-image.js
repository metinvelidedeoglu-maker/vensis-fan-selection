(function(){
  function escAttr(value){return String(value||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function imageForResult(result){
    const product=window.VensisProducts?.fromResult?.(result);
    return product?.media?.image||window.VensisCatalog?.getImage?.(result?.model||result?.series)||'';
  }
  function injectImage(html,result){
    const src=imageForResult(result);
    if(!src||String(html).includes('selection-detail-product-image'))return html;
    const title=result?.catalogNameEn||result?.series||result?.model||'Product';
    const image=`<div style="display:flex;justify-content:center;margin:18px 0 8px"><img class="selection-detail-product-image" src="${escAttr(src)}" alt="${escAttr(title)}" style="width:260px;height:190px;object-fit:contain;border:1px solid #d8e3e5;border-radius:10px;background:#fff;padding:12px" onerror="this.parentElement.remove()"></div>`;
    return String(html).replace(/(<h1[^>]*>)/i,image+'$1');
  }
  function install(){
    const original=window.openProductTab;
    if(typeof original!=='function'||original.__vensisImageWrapped)return;
    function wrapped(index){
      const result=(typeof results!=='undefined'&&Array.isArray(results))?results[index]:null;
      const originalSet=localStorage.setItem.bind(localStorage);
      localStorage.setItem=function(key,value){
        if(String(key).startsWith('vensis_detail_'))value=injectImage(value,result);
        return originalSet(key,value);
      };
      try{return original(index)}finally{localStorage.setItem=originalSet}
    }
    wrapped.__vensisImageWrapped=true;
    window.openProductTab=wrapped;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,0);
})();