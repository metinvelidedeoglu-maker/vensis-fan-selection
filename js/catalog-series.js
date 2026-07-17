(function(){
  const SERIES_NAMES={
    'TUNEL-AXF':'Tunnel Type Axial Fan','MOB-AXD/ATEX':'Axial Mobile Ex-proof Fan','BOX-AXF':'Axial Cell Type Smoke Extract Fans','ROOF-AXF':'Axial Roof Type Smoke Extract Fans','AXD/ATEX':'Axial Duct Type Ex-proof Fan','AXW/ATEX':'Axial Wall Type Ex-proof Fans','AXR/ATEX':'Axial Roof Type Ex-proof Fan','CRH/ATEX':'Centrifugal Roof Type Ex-proof Fan','CRD/ATEX':'Centrifugal Duct Type Ex-proof Fan','CRS/ATEX':'Centrifugal Single Inlet Ex-proof Fan','MOB-AXD':'Axial Mobile Fan','CRU-EC':'Vertical Outlet Centrifugal Roof Type Fan','CRB-EC':'Centrifugal Rectangular Duct Type Fan','CRC-EC':'Centrifugal Cell Type Fan','CR-EC':'Horizontal Outlet Centrifugal Roof Type Fan','AXF':'Axial Duct Type Smoke Extract Fans','AXJ':'Axial Jet Fan','RXJ':'Radial Jet Fans','AXD':'Axial Duct Type Fan','AXS':'Axial Short Case Fan','AXW':'Axial Wall Type Fan','AXB':'Bifurcated Axial Duct Type Fan','AXH':'Axial Cell Type Fans','AXR':'Horizontal Outlet Axial Roof Type Fan','AXV':'Vertical Outlet Axial Roof Type Fan','CRB':'Centrifugal Rectangular Duct Type Fan','CRD':'Centrifugal Rectangular Duct Type Fan','CRK':'Centrifugal Single Inlet Cell Type Fan','CRC':'Centrifugal Cell Type Fan','CRS':'Centrifugal Single Inlet Fan','CRH':'Horizontal Outlet Centrifugal Roof Type Fan','CRV':'Vertical Outlet Centrifugal Roof Type Fan','CRU':'Vertical Outlet Centrifugal Roof Type Fan','CRR':'Duct Type Shelter Fan','VHR':'Heat Recovery Units','CD':'Centrifugal Duct Type Fan','CR':'Horizontal Outlet Centrifugal Roof Type Fan'
  };
  const IMAGE_FILES={
    'TUNEL-AXF':'TUNEL-AXF.webp','MOB-AXD/ATEX':'MOB-AXD-ATEX.webp','BOX-AXF':'BOX-AXF.webp','ROOF-AXF':'ROOF-AXF.webp','AXD/ATEX':'AXD-ATEX.webp','AXW/ATEX':'AXW-ATEX.webp','AXR/ATEX':'AXR-ATEX.webp','CRH/ATEX':'CRH-ATEX.webp','CRD/ATEX':'CRD-ATEX.webp','CRS/ATEX':'CRS-ATEX.webp','MOB-AXD':'MOB-AXD.webp','CRU-EC':'CRU-EC.webp','CRB-EC':'CRB-EC.webp','CRC-EC':'CRC-EC.webp','CR-EC':'CR-EC.webp','AXF':'AXF.webp','AXJ':'AXJ.webp','RXJ':'RXJ.webp','AXD':'AXD.webp','AXS':'AXS.webp','AXW':'AXW.webp','AXB':'AXB.webp','AXH':'AXH.webp','AXR':'AXR.webp','AXV':'AXV.webp','CRB':'CRB.webp','CRD':'CRD.webp','CRK':'CRK.webp','CRC':'CRC.webp','CRS':'CRS.webp','CRH':'CRH.webp','CRV':'CRV.webp','CRU':'CRU.webp','CRR':'CRR.webp','VHR':'VHR.webp','CD':'CD.webp','CR':'CR.webp'
  };
  const KEYS=Object.keys(SERIES_NAMES).sort((a,b)=>b.length-a.length);
  function normalize(value){return String(value||'').trim().toUpperCase().replace(/\\/g,'/').replace(/\s+/g,' ')}
  function getSeriesKey(model){const value=normalize(model);return KEYS.find(k=>value===k||value.startsWith(k+' ')||value.startsWith(k+'-'))||''}
  function getSeriesName(model){const key=getSeriesKey(model);return key?SERIES_NAMES[key]:''}
  function getImage(model){const key=getSeriesKey(model);return key&&IMAGE_FILES[key]?'assets/products/'+IMAGE_FILES[key]:''}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function imageStyle(large){return large?'width:190px;height:150px;object-fit:contain;border:1px solid #e2e9e5;border-radius:9px;background:#fff;padding:8px;flex:0 0 auto':'width:66px;height:66px;object-fit:contain;float:left;margin:0 11px 5px 0;border:1px solid #e2e9e5;border-radius:7px;background:#fff;padding:4px'}
  function ensureProductImage(cell,model,large=false){
    if(!cell||cell.querySelector(':scope > .catalog-product-image'))return;
    const src=getImage(model);if(!src)return;
    const img=document.createElement('img');img.className='catalog-product-image';img.src=src;img.alt=getSeriesName(model)||model;img.loading='lazy';img.style.cssText=imageStyle(large);img.onerror=()=>img.remove();cell.insertBefore(img,cell.firstChild)
  }
  function decorateCell(cell,model){
    if(!cell||!model)return;
    const name=getSeriesName(model);if(!name)return;
    const title=cell.querySelector('.product-title');if(title)title.textContent=name;
    if(!title&&!cell.querySelector('.catalog-series-name')){
      const oldBold=cell.querySelector('b');
      if(oldBold){oldBold.textContent=model;const nameDiv=document.createElement('div');nameDiv.className='catalog-series-name';nameDiv.style.cssText='font-weight:700;margin-bottom:2px';nameDiv.textContent=name;cell.insertBefore(nameDiv,oldBold);oldBold.style.cssText='display:block;font-size:10px;color:#687b72;font-weight:400'}
    }
    ensureProductImage(cell,model,false)
  }
  function updateQuotationNames(root){
    root.querySelectorAll?.('.model-code').forEach(code=>{const model=code.textContent.replace(/^\s*Model\s*:\s*/i,'').trim();decorateCell(code.closest('td')||code.parentElement,model)})
  }
  function updateTables(root){
    root.querySelectorAll?.('tbody tr').forEach(row=>{
      const cells=[...row.children];if(!cells.length)return;
      const candidates=cells.slice(0,2);
      let cell=null,model='';
      for(const c of candidates){
        const code=c.querySelector('.model-code');const bold=c.querySelector('b');const raw=(code?code.textContent.replace(/^\s*Model\s*:\s*/i,''):bold?bold.textContent:c.textContent).trim();
        if(getSeriesKey(raw)){cell=c;model=raw;break}
      }
      if(cell)decorateCell(cell,model)
    })
  }
  function updateProductPages(root){
    root.querySelectorAll?.('.product-head').forEach(head=>{const model=head.querySelector('h2')?.textContent?.trim();const name=getSeriesName(model);if(!name)return;const muted=head.querySelector('h2 + .muted');if(muted)muted.textContent=name;head.style.alignItems='center';ensureProductImage(head,model,true)})
  }
  function updateDetailPage(root){
    if(root.querySelector?.('.catalog-detail-hero'))return;
    const headings=[...root.querySelectorAll?.('h1,h2')||[]];
    const heading=headings.find(h=>getSeriesKey(h.textContent));if(!heading)return;
    const model=heading.textContent.trim(),name=getSeriesName(model),src=getImage(model);if(!src)return;
    const hero=document.createElement('div');hero.className='catalog-detail-hero';hero.style.cssText='display:flex;align-items:center;gap:22px;margin:14px 0 18px;padding:14px;border:1px solid #dfe7e2;border-radius:10px;background:#fff';
    hero.innerHTML='<img src="'+src+'" alt="'+esc(name)+'" style="width:210px;height:170px;object-fit:contain" onerror="this.parentElement.remove()"><div><div style="font-size:20px;font-weight:700;color:#17342b">'+esc(name)+'</div><div style="margin-top:5px;color:#687b72">Model: '+esc(model)+'</div></div>';
    heading.parentElement.insertBefore(hero,heading.nextSibling)
  }
  function apply(root=document){updateQuotationNames(root);updateTables(root);updateProductPages(root);updateDetailPage(root)}
  window.VensisCatalog={seriesNames:SERIES_NAMES,imageFiles:IMAGE_FILES,getSeriesKey,getSeriesName,getImage,apply};
  const start=()=>{apply(document);new MutationObserver(()=>apply(document)).observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start()
})();