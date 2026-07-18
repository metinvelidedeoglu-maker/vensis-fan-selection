(function(){
  const SERIES_NAMES={
    'TUNEL-AXF':'Tunnel Type Axial Fan','MOB-AXD/ATEX':'Axial Mobile Ex-proof Fan','BOX-AXF':'Axial Cell Type Smoke Extract Fans','ROOF-AXF':'Axial Roof Type Smoke Extract Fans','AXD/ATEX':'Axial Duct Type Ex-proof Fan','AXW/ATEX':'Axial Wall Type Ex-proof Fans','AXR/ATEX':'Axial Roof Type Ex-proof Fan','CRH/ATEX':'Centrifugal Roof Type Ex-proof Fan','CRD/ATEX':'Centrifugal Duct Type Ex-proof Fan','CRS/ATEX':'Centrifugal Single Inlet Ex-proof Fan','MOB-AXD':'Axial Mobile Fan','CRU-EC':'Vertical Outlet Centrifugal Roof Type Fan','CRB-EC':'Centrifugal Rectangular Duct Type Fan','CRC-EC':'Centrifugal Cell Type Fan','CR-EC':'Horizontal Outlet Centrifugal Roof Type Fan','AXF':'Axial Duct Type Smoke Extract Fans','AXJ':'Axial Jet Fan','RXJ':'Radial Jet Fans','AXD':'Axial Duct Type Fan','AXS':'Axial Short Case Fan','AXW':'Axial Wall Type Fan','AXB':'Bifurcated Axial Duct Type Fan','AXH':'Axial Cell Type Fans','AXR':'Horizontal Outlet Axial Roof Type Fan','AXV':'Vertical Outlet Axial Roof Type Fan','CRB':'Centrifugal Rectangular Duct Type Fan','CRD':'Centrifugal Rectangular Duct Type Fan','CRK':'Centrifugal Single Inlet Cell Type Fan','CRC':'Centrifugal Cell Type Fan','CRS':'Centrifugal Single Inlet Fan','CRH':'Horizontal Outlet Centrifugal Roof Type Fan','CRV':'Vertical Outlet Centrifugal Roof Type Fan','CRU':'Vertical Outlet Centrifugal Roof Type Fan','CRR':'Duct Type Shelter Fan','VHR':'Heat Recovery Units','CD':'Centrifugal Duct Type Fan','CR':'Horizontal Outlet Centrifugal Roof Fan'
  };
  const IMAGE_FILES={
    'TUNEL-AXF':'TUNEL-AXF.webp','MOB-AXD/ATEX':'MOB-AXD-ATEX.webp','BOX-AXF':'BOX-AXF.webp','ROOF-AXF':'ROOF-AXF.webp','AXD/ATEX':'AXD-ATEX.webp','AXW/ATEX':'AXW-ATEX.webp','AXR/ATEX':'AXR-ATEX.webp','CRH/ATEX':'CRH-ATEX.webp','CRD/ATEX':'CRD-ATEX.webp','CRS/ATEX':'CRS-ATEX.webp','MOB-AXD':'MOB-AXD.webp','CRU-EC':'CRU-EC.webp','CRB-EC':'CRB-EC.webp','CRC-EC':'CRC-EC.webp','CR-EC':'CR-EC.webp','AXF':'AXF.webp','AXJ':'AXJ.webp','RXJ':'RXJ.webp','AXD':'AXD.webp','AXS':'AXS.webp','AXW':'AXW.webp','AXB':'AXB.webp','AXH':'AXH.webp','AXR':'AXR.webp','AXV':'AXV.webp','CRB':'CRB.webp','CRD':'CRD.webp','CRK':'CRK.webp','CRC':'CRC.webp','CRS':'CRS.webp','CRH':'CRH.webp','CRV':'CRV.webp','CRU':'CRU.webp','CRR':'CRR.webp','VHR':'VHR.webp','CD':'CD.webp','CR':'CR.webp'
  };
  const SERIES_KEYS=Object.keys(SERIES_NAMES).sort((a,b)=>b.length-a.length);
  const records=new Map();

  function normalize(value){return String(value||'').trim().toUpperCase().replace(/\\/g,'/').replace(/\s+/g,' ')}
  function seriesKey(value){const text=normalize(value);return SERIES_KEYS.find(k=>text===k||text.startsWith(k+' ')||text.startsWith(k+'-')||text.startsWith(k+'/')||text.includes(' '+k+' ')||text.includes(' '+k+'-'))||''}
  function titleFor(row){const key=seriesKey(row?.series||row?.model);return row?.catalogNameEn||SERIES_NAMES[key]||row?.series||row?.model||'Product'}
  function imageFor(row){const key=seriesKey(row?.series||row?.model);return key&&IMAGE_FILES[key]?'assets/products/'+IMAGE_FILES[key]:''}
  function numberOrNull(value){const n=Number(value);return Number.isFinite(n)?n:null}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}

  function createProduct(row){
    const info=row?.catalogueInfo||{};
    return {
      schemaVersion:1,
      id:String(row?.key||row?.model||''),
      model:String(row?.model||row?.display||''),
      brand:String(row?.brand||'Vitlo'),
      series:{code:String(row?.series||seriesKey(row?.model)),title:titleFor(row)},
      media:{image:imageFor(row)},
      description:{
        general:Array.isArray(info.general)?clone(info.general):[],
        motor:Array.isArray(info.motor)?clone(info.motor):[],
        applications:Array.isArray(info.applications)?clone(info.applications):[]
      },
      pricing:{listPrice:numberOrNull(row?.price),currency:'EUR'},
      technical:{
        fanType:row?.fanTypeEn||row?.fanType||'',mountType:row?.mountTypeEn||row?.mountType||'',
        productGroup:row?.productGroupEn||row?.productGroup||'',motorPower:numberOrNull(row?.kw),
        speed:numberOrNull(row?.rpm),current:numberOrNull(row?.amps),sound:numberOrNull(row?.spl),
        voltage:row?.voltage||'',pole:numberOrNull(row?.pole),atex:Boolean(row?.atex),fireClass:row?.fire||'',
        sourcePage:row?.sourcePage??null,tags:clone(row?.tagsEn||row?.tags||[])
      },
      performance:{
        nominalAirflow:numberOrNull(row?.nominal),
        table:Array.isArray(row?.points)?row.points.map(point=>({pressure:numberOrNull(point[0]),flow:numberOrNull(point[1])})):[]
      }
    };
  }

  function rebuild(source){
    records.clear();
    (Array.isArray(source)?source:[]).forEach(row=>{if(row?.key)records.set(String(row.key),createProduct(row))});
    return records.size;
  }
  function getByKey(key){return records.get(String(key||''))||null}
  function fromResult(result){return getByKey(result?.key)||createProduct(result||{})}
  function snapshot(result){return clone(fromResult(result))}
  function resolveItem(item){
    if(item?.product?.schemaVersion)return item.product;
    const found=getByKey(item?.key||item?.productId);
    if(found)return found;
    return createProduct({
      key:item?.key||item?.productId||'',model:item?.model||'',series:item?.series||'',price:item?.unitPrice,
      kw:item?.motorPower,spl:item?.noise,points:item?.performanceTable||[]
    });
  }

  function migrateProjects(){
    const key='vensis_projects_v2';
    let projects;
    try{projects=JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return 0}
    if(!Array.isArray(projects))return 0;
    let changed=0;
    projects.forEach(project=>{
      project.items=Array.isArray(project.items)?project.items:[];
      project.items.forEach(item=>{
        if(item?.product?.schemaVersion)return;
        const product=resolveItem(item);
        item.schemaVersion=2;
        item.productId=product.id||item.key||'';
        item.product=clone(product);
        item.operatingPoint=item.operatingPoint||{flow:Number(item.flow)||0,pressure:Number(item.pressure)||0,airflowDeviation:0,pressureDeviation:0};
        item.productName=item.productName||product.series?.title||'';
        item.productImage=item.productImage||product.media?.image||'';
        item.productDescription=item.productDescription||clone(product.description);
        item.performanceTable=item.performanceTable?.length?item.performanceTable:clone(product.performance?.table||[]);
        if(item.unitPrice==null)item.unitPrice=product.pricing?.listPrice??null;
        changed++;
      });
      if(project.items.length)project.schemaVersion=3;
    });
    if(changed)localStorage.setItem(key,JSON.stringify(projects));
    return changed;
  }

  rebuild(window.models||[]);
  window.VensisProducts={schemaVersion:1,rebuild,getByKey,fromResult,snapshot,resolveItem,migrateProjects,seriesKey,titleFor,imageFor,count:()=>records.size};
  migrateProjects();
})();