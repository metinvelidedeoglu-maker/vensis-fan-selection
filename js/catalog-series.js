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
  const KEYS=Object.keys(SERIES_NAMES).sort((a,b)=>b.length-a.length);

  function normalize(value){
    return String(value||'').trim().toUpperCase().replace(/\s+/g,' ');
  }

  function getSeriesName(model){
    const value=normalize(model);
    const key=KEYS.find(k=>value===k||value.startsWith(k+' ')||value.startsWith(k+'-'));
    return key?SERIES_NAMES[key]:'';
  }

  function updateQuotationNames(root){
    root.querySelectorAll?.('.model-code').forEach(code=>{
      const model=code.textContent.replace(/^\s*Model\s*:\s*/i,'').trim();
      const title=code.parentElement?.querySelector('.product-title');
      const name=getSeriesName(model);
      if(title&&name)title.textContent=name;
    });
  }

  function updateProjectTable(root){
    const rows=root.querySelectorAll?.('#rows tr')||[];
    rows.forEach(row=>{
      const cell=row.children?.[1];
      if(!cell||cell.querySelector('.catalog-series-name'))return;
      const model=cell.querySelector('b')?.textContent?.trim();
      const name=getSeriesName(model);
      if(!name)return;
      cell.innerHTML='<div class="catalog-series-name" style="font-weight:700">'+name+'</div><div style="margin-top:3px;font-size:10px;color:#687b72">Model: '+model+'</div>';
    });
  }

  function updateProductPages(root){
    root.querySelectorAll?.('.product-head').forEach(head=>{
      const model=head.querySelector('h2')?.textContent?.trim();
      const name=getSeriesName(model);
      if(!name)return;
      const muted=head.querySelector('h2 + .muted');
      if(muted)muted.textContent=name;
    });
  }

  function apply(root=document){
    updateQuotationNames(root);
    updateProjectTable(root);
    updateProductPages(root);
  }

  window.VensisCatalog={seriesNames:SERIES_NAMES,getSeriesName,apply};
  const start=()=>{
    apply(document);
    new MutationObserver(()=>apply(document)).observe(document.body,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);
  else start();
})();