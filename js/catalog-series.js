(function(){
  const SERIES_NAMES={
    'TUNEL-AXF':'Tunnel Type Axial Fan',
    'MOB-AXD/ATEX':'Axial Mobile Ex-proof Fan',
    'BOX-AXF':'Axial Cell Type Smoke Extract Fans',
    'ROOF-AXF':'Axial Roof Type Smoke Extract Fans',
    'AXD/ATEX':'Axial Duct Type Ex-proof Fan',
    'AXW/ATEX':'Axial Wall Type Ex-proof Fans',
    'AXR/ATEX':'Axial Roof Type Ex-proof Fan',
    'CRH/ATEX':'Centrifugal Roof Type Ex-proof Fan',
    'CRD/ATEX':'Centrifugal Duct Type Ex-proof Fan',
    'CRS/ATEX':'Centrifugal Single Inlet Ex-proof Fan',
    'MOB-AXD':'Axial Mobile Fan',
    'CRU-EC':'Vertical Outlet Centrifugal Roof Type Fan',
    'CRB-EC':'Centrifugal Rectangular Duct Type Fan',
    'CRC-EC':'Centrifugal Cell Type Fan',
    'CR-EC':'Horizontal Outlet Centrifugal Roof Type Fan',
    'AXF':'Axial Duct Type Smoke Extract Fans',
    'AXJ':'Axial Jet Fan',
    'RXJ':'Radial Jet Fans',
    'AXD':'Axial Duct Type Fan',
    'AXS':'Axial Short Case Fan',
    'AXW':'Axial Wall Type Fan',
    'AXB':'Bifurcated Axial Duct Type Fan',
    'AXH':'Axial Cell Type Fans',
    'AXR':'Horizontal Outlet Axial Roof Type Fan',
    'AXV':'Vertical Outlet Axial Roof Type Fan',
    'CRB':'Centrifugal Rectangular Duct Type Fan',
    'CRD':'Centrifugal Rectangular Duct Type Fan',
    'CRK':'Centrifugal Single Inlet Cell Type Fan',
    'CRC':'Centrifugal Cell Type Fan',
    'CRS':'Centrifugal Single Inlet Fan',
    'CRH':'Horizontal Outlet Centrifugal Roof Type Fan',
    'CRV':'Vertical Outlet Centrifugal Roof Type Fan',
    'CRU':'Vertical Outlet Centrifugal Roof Type Fan',
    'CRR':'Duct Type Shelter Fan',
    'VHR':'Heat Recovery Units',
    'CD':'Centrifugal Duct Type Fan',
    'CR':'Horizontal Outlet Centrifugal Roof Type Fan'
  };
  const IMAGE_FILES={
    'TUNEL-AXF':'TUNEL-AXF.webp','MOB-AXD/ATEX':'MOB-AXD-ATEX.webp','BOX-AXF':'BOX-AXF.webp','ROOF-AXF':'ROOF-AXF.webp',
    'AXD/ATEX':'AXD-ATEX.webp','AXW/ATEX':'AXW-ATEX.webp','AXR/ATEX':'AXR-ATEX.webp','CRH/ATEX':'CRH-ATEX.webp',
    'CRD/ATEX':'CRD-ATEX.webp','CRS/ATEX':'CRS-ATEX.webp','MOB-AXD':'MOB-AXD.webp','CRU-EC':'CRU-EC.webp',
    'CRB-EC':'CRB-EC.webp','CRC-EC':'CRC-EC.webp','CR-EC':'CR-EC.webp','AXF':'AXF.webp','AXJ':'AXJ.webp',
    'RXJ':'RXJ.webp','AXD':'AXD.webp','AXS':'AXS.webp','AXW':'AXW.webp','AXB':'AXB.webp','AXH':'AXH.webp',
    'AXR':'AXR.webp','AXV':'AXV.webp','CRB':'CRB.webp','CRD':'CRD.webp','CRK':'CRK.webp','CRC':'CRC.webp',
    'CRS':'CRS.webp','CRH':'CRH.webp','CRV':'CRV.webp','CRU':'CRU.webp','CRR':'CRR.webp','VHR':'VHR.webp',
    'CD':'CD.webp','CR':'CR.webp'
  };
  const KEYS=Object.keys(SERIES_NAMES).sort((a,b)=>b.length-a.length);

  function normalize(value){
    return String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
  }

  function getSeriesKey(model){
    const value=normalize(model);
    return KEYS.find(k=>value===k||value.startsWith(k+' ')||value.startsWith(k+'-'))||'';
  }

  function getSeriesName(model){
    const key=getSeriesKey(model);
    return key?SERIES_NAMES[key]:'';
  }

  function getImage(model){
    const key=getSeriesKey(model);
    return key&&IMAGE_FILES[key]?'assets/products/'+IMAGE_FILES[key]:'';
  }

  function ensureProductImage(cell,model){
    if(!cell||cell.querySelector('.catalog-product-image'))return;
    const src=getImage(model);
    if(!src)return;
    const img=document.createElement('img');
    img.className='catalog-product-image';
    img.src=src;
    img.alt=getSeriesName(model)||model;
    img.loading='lazy';
    img.style.cssText='width:78px;height:78px;object-fit:contain;float:left;margin:0 12px 6px 0;border:1px solid #e2e9e5;border-radius:7px;background:#fff;padding:4px';
    img.onerror=()=>img.remove();
    cell.insertBefore(img,cell.firstChild);
  }

  function updateQuotationNames(root){
    root.querySelectorAll?.('.model-code').forEach(code=>{
      const model=code.textContent.replace(/^\s*Model\s*:\s*/i,'').trim();
      const cell=code.closest('td')||code.parentElement;
      const title=cell?.querySelector('.product-title');
      const name=getSeriesName(model);
      if(title&&name&&title.textContent!==name)title.textContent=name;
      ensureProductImage(cell,model);
    });
  }

  function updateProjectTable(root){
    const rows=root.querySelectorAll?.('#rows tr')||[];
    rows.forEach(row=>{
      const cell=row.children?.[1];
      if(!cell)return;
      let model=cell.querySelector('.model-code')?.textContent?.replace(/^\s*Model\s*:\s*/i,'').trim();
      if(!model)model=cell.querySelector('b')?.textContent?.trim();
      const name=getSeriesName(model);
      if(!name)return;
      if(!cell.querySelector('.catalog-series-name')){
        cell.innerHTML='<div class="catalog-series-name" style="font-weight:700">'+name+'</div><div class="model-code" style="margin-top:3px;font-size:10px;color:#687b72">Model: '+model+'</div>';
      }
      ensureProductImage(cell,model);
    });
  }

  function updateProductPages(root){
    root.querySelectorAll?.('.product-head').forEach(head=>{
      const model=head.querySelector('h2')?.textContent?.trim();
      const name=getSeriesName(model);
      if(!name)return;
      const muted=head.querySelector('h2 + .muted');
      if(muted&&muted.textContent!==name)muted.textContent=name;
      ensureProductImage(head,model);
    });
  }

  function apply(root=document){
    updateQuotationNames(root);
    updateProjectTable(root);
    updateProductPages(root);
  }

  window.VensisCatalog={seriesNames:SERIES_NAMES,imageFiles:IMAGE_FILES,getSeriesKey,getSeriesName,getImage,apply};
  const start=()=>{
    apply(document);
    new MutationObserver(()=>apply(document)).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();