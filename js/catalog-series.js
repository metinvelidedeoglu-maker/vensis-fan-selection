(function(){
  const SERIES_NAMES={
    'TUNEL-AXF':'Tunnel Type Axial Fan','MOB-AXD/ATEX':'Axial Mobile Ex-proof Fan','BOX-AXF':'Axial Cell Type Smoke Extract Fans','ROOF-AXF':'Axial Roof Type Smoke Extract Fans','AXD/ATEX':'Axial Duct Type Ex-proof Fan','AXW/ATEX':'Axial Wall Type Ex-proof Fans','AXR/ATEX':'Axial Roof Type Ex-proof Fan','CRH/ATEX':'Centrifugal Roof Type Ex-proof Fan','CRD/ATEX':'Centrifugal Duct Type Ex-proof Fan','CRS/ATEX':'Centrifugal Single Inlet Ex-proof Fan','MOB-AXD':'Axial Mobile Fan','CRU-EC':'Vertical Outlet Centrifugal Roof Type Fan','CRB-EC':'Centrifugal Rectangular Duct Type Fan','CRC-EC':'Centrifugal Cell Type Fan','CR-EC':'Horizontal Outlet Centrifugal Roof Type Fan','AXF':'Axial Duct Type Smoke Extract Fans','AXJ':'Axial Jet Fan','RXJ':'Radial Jet Fans','AXD':'Axial Duct Type Fan','AXS':'Axial Short Case Fan','AXW':'Axial Wall Type Fan','AXB':'Bifurcated Axial Duct Type Fan','AXH':'Axial Cell Type Fans','AXR':'Horizontal Outlet Axial Roof Type Fan','AXV':'Vertical Outlet Axial Roof Type Fan','CRB':'Centrifugal Rectangular Duct Type Fan','CRD':'Centrifugal Rectangular Duct Type Fan','CRK':'Centrifugal Single Inlet Cell Type Fan','CRC':'Centrifugal Cell Type Fan','CRS':'Centrifugal Single Inlet Fan','CRH':'Horizontal Outlet Centrifugal Roof Type Fan','CRV':'Vertical Outlet Centrifugal Roof Type Fan','CRU':'Vertical Outlet Centrifugal Roof Type Fan','CRR':'Duct Type Shelter Fan','VHR':'Heat Recovery Units','CD':'Centrifugal Duct Type Fan','CR':'Horizontal Outlet Centrifugal Roof Type Fan'
  };
  const IMAGE_FILES={
    'TUNEL-AXF':'TUNEL-AXF.webp','MOB-AXD/ATEX':'MOB-AXD-ATEX.webp','BOX-AXF':'BOX-AXF.webp','ROOF-AXF':'ROOF-AXF.webp','AXD/ATEX':'AXD-ATEX.webp','AXW/ATEX':'AXW-ATEX.webp','AXR/ATEX':'AXR-ATEX.webp','CRH/ATEX':'CRH-ATEX.webp','CRD/ATEX':'CRD-ATEX.webp','CRS/ATEX':'CRS-ATEX.webp','MOB-AXD':'MOB-AXD.webp','CRU-EC':'CRU-EC.webp','CRB-EC':'CRB-EC.webp','CRC-EC':'CRC-EC.webp','CR-EC':'CR-EC.webp','AXF':'AXF.webp','AXJ':'AXJ.webp','RXJ':'RXJ.webp','AXD':'AXD.webp','AXS':'AXS.webp','AXW':'AXW.webp','AXB':'AXB.webp','AXH':'AXH.webp','AXR':'AXR.webp','AXV':'AXV.webp','CRB':'CRB.webp','CRD':'CRD.webp','CRK':'CRK.webp','CRC':'CRC.webp','CRS':'CRS.webp','CRH':'CRH.webp','CRV':'CRV.webp','CRU':'CRU.webp','CRR':'CRR.webp','VHR':'VHR.webp','CD':'CD.webp','CR':'CR.webp'
  };
  const KEYS=Object.keys(SERIES_NAMES).sort((a,b)=>b.length-a.length);
  function normalize(value){return String(value||'').trim().toUpperCase().replace(/\\/g,'/').replace(/\s+/g,' ')}
  function getSeriesKey(model){const value=normalize(model);return KEYS.find(k=>value===k||value.startsWith(k+' ')||value.startsWith(k+'-')||value.startsWith(k+'/')||value.includes(' '+k+' ')||value.includes(' '+k+'-'))||''}
  function getSeriesName(model){const key=getSeriesKey(model);return key?SERIES_NAMES[key]:''}
  function getImage(model){const key=getSeriesKey(model);return key&&IMAGE_FILES[key]?'assets/products/'+IMAGE_FILES[key]:''}
  function imageStyle(large){return large?'width:190px;height:150px;object-fit:contain;border:1px solid #e2e9e5;border-radius:9px;background:#fff;padding:8px;flex:0 0 auto':'width:74px;height:74px;object-fit:contain;display:block;float:left;margin:0 12px 6px 0;border:1px solid #e2e9e5;border-radius:7px;background:#fff;padding:4px'}
  function ensureProductImage(cell,model,large=false){
    if(!cell||cell.querySelector('.catalog-product-image'))return;
    const src=getImage(model);if(!src)return;
    const img=document.createElement('img');img.className='catalog-product-image';img.src=src;img.alt=getSeriesName(model)||model;img.loading='eager';img.style.cssText=imageStyle(large);img.onerror=function(){this.style.display='none'};cell.insertBefore(img,cell.firstChild)
  }
  function decorateCell(cell,model){
    if(!cell||!model)return;
    const name=getSeriesName(model);if(!name)return;
    const title=cell.querySelector('.product-title');if(title)title.textContent=name;
    ensureProductImage(cell,model,false)
  }
  function extractModel(element){
    const code=element.querySelector?.('.model-code');
    if(code)return code.textContent.replace(/^\s*Model\s*:\s*/i,'').trim();
    const text=element.textContent||'';
    const match=text.match(/(?:Model\s*:\s*)?((?:TUNEL-|MOB-|BOX-|ROOF-)?(?:AXF|AXJ|RXJ|AXD|AXS|AXW|AXB|AXH|AXR|AXV|CRB|CRD|CRK|CRC|CRS|CRH|CRV|CRU|CRR|VHR|CD|CR)(?:\/ATEX|-EC)?(?:[-\s/][A-Z0-9.]+)*)/i);
    return match?match[1].trim():''
  }
  function apply(root=document){
    root.querySelectorAll?.('.model-code').forEach(code=>decorateCell(code.closest('td')||code.parentElement,extractModel(code.parentElement||code)));
    root.querySelectorAll?.('td').forEach(cell=>{if(cell.querySelector('.catalog-product-image'))return;const model=extractModel(cell);if(model)decorateCell(cell,model)});
    root.querySelectorAll?.('.product-head').forEach(head=>{const model=extractModel(head)||head.querySelector('h2')?.textContent?.trim();if(model)ensureProductImage(head,model,true)});
  }
  window.VensisCatalog={seriesNames:SERIES_NAMES,imageFiles:IMAGE_FILES,getSeriesKey,getSeriesName,getImage,apply};
  function loadQuotationEnhancer(){
    const page=(location.pathname.split('/').pop()||'').toLowerCase();
    if(page!=='quotation-edit.html'&&page!=='quotation-report.html')return;
    if(document.querySelector('script[data-direct-quotation-images]'))return;
    const script=document.createElement('script');
    script.src='js/quotation-images.js?v='+Date.now();
    script.dataset.directQuotationImages='1';
    document.head.appendChild(script);
  }
  function start(){apply(document);loadQuotationEnhancer();const observer=new MutationObserver(mutations=>{mutations.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)apply(n)}));apply(document)});observer.observe(document.body,{childList:true,subtree:true});let tries=0;const timer=setInterval(()=>{apply(document);if(++tries>=20)clearInterval(timer)},250)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start()
})();