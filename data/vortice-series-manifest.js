(function(){
  'use strict';

  const series=(id,title,categories,image,summary)=>({
    id,
    code:id,
    title,
    manufacturer:'Vortice',
    categories,
    media:{image:image||'',gallery:[]},
    catalogue:{pdf:'',page:''},
    description:{general:[summary||title],motor:[],applications:[]},
    modelIds:[],
    modelCount:null
  });

  const rows=[
    series('LINEO QUIET ES','LINEO QUIET ES Low-Noise In-Line EC Mixed-Flow Fans',['Duct Fan','Mixed Flow Fan','EC Fan','Quiet Fan'],'assets/products/lineo/quiet_es_100.png','Low-noise in-line EC mixed-flow fan range for circular duct systems.'),
    series('LINEO QUIET','LINEO QUIET Low-Noise In-Line Mixed-Flow Fans',['Duct Fan','Mixed Flow Fan','Quiet Fan'],'assets/products/lineo/lineo_150_20260814.png','Low-noise in-line mixed-flow fan range for circular duct systems.'),
    series('LINEO ES','LINEO ES In-Line EC Mixed-Flow Fans',['Duct Fan','Mixed Flow Fan','EC Fan'],'assets/products/lineo/lineo_150_20260814.png','Energy-saving EC in-line mixed-flow fan range.'),
    series('LINEO','LINEO In-Line Mixed-Flow Fans',['Duct Fan','Mixed Flow Fan'],'assets/products/lineo/lineo_150_20260814.png','In-line mixed-flow fan range for circular duct systems.'),
    series('CA MD','CA MD In-Line Mixed-Flow Duct Fans',['Duct Fan','Mixed Flow Fan'],'assets/products/ca-md/ca_md.png','In-line mixed-flow duct fan range.'),
    series('CA MD EXTRA EU','CA MD Extra EU In-Line Mixed-Flow Duct Fans',['Duct Fan','Mixed Flow Fan'],'assets/products/ca-md/ca_md.png','Extra-performance in-line mixed-flow duct fan range.'),
    series('CA MD E RF','CA MD E RF Roof-Mounted Mixed-Flow Exhaust Fans',['Roof Fan','Mixed Flow Fan'],'assets/products/ca-md/ca_md.png','Roof-mounted mixed-flow exhaust fan range.'),
    series('SLIMROOF ES','SLIMROOF ES EC Centrifugal Roof Fans',['Roof Fan','Centrifugal Fan','EC Fan'],'assets/products/roof-fans/slimroof.png','EC centrifugal roof fan range.'),
    series('HEATMASTER F400','HEATMASTER F400 Smoke-Extract Centrifugal Roof Fans',['Roof Fan','Centrifugal Fan','Smoke Exhaust Fan'],'assets/products/roof-fans/heatmaster.png','F400 smoke-extract centrifugal roof fan range.'),
    series('E-ATEX','E-ATEX Explosion-Protected Axial Plate Fans',['Axial Fan','Wall-Mounted Fan','Explosion-Proof / ATEX Fan'],'assets/products/eatex-tiracamino/eatex.png','Explosion-protected axial plate fan range for hazardous areas.'),
    series('TIRACAMINO','Tiracamino Chimney-Top Extract Fan',['Roof Fan','Axial Fan','Extract Fan'],'','Chimney-top extract fan range.'),
    series('VORT QBK SAL-KC EVO','VORT QBK SAL-KC EVO Cabinet Centrifugal Fans',['Cabinet Fan','Centrifugal Fan','Duct Fan'],'assets/products/qbk-sal-kc-evo/qbk_sal_kc_evo.png','Cabinet centrifugal fan range for commercial and industrial duct systems.'),
    series('VORT QUADRO EVO','VORT QUADRO EVO Residential Centrifugal Extract Fans',['Residential Fan','Centrifugal Fan','Extract Fan'],'','Residential centrifugal extract fan range.'),
    series('VORT QUADRO I','VORT QUADRO I Flush-Mounted Centrifugal Duct Fans',['Residential Fan','Centrifugal Fan','Extract Fan'],'','Flush-mounted centrifugal extract fan range.'),
    series('VORT QUADRO','VORT QUADRO Centrifugal Duct Fans',['Residential Fan','Centrifugal Fan','Extract Fan'],'','Centrifugal residential extract fan range.'),
    series('VORTICE VARIO I','VORTICE VARIO I Flush-Mounted Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'','Flush-mounted reversible axial fan range.'),
    series('VORTICE VARIO','VORTICE VARIO Wall / Window Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'','Wall and window mounted axial fan range.'),
    series('PUNTO EVO FLEXO','PUNTO EVO FLEXO Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Wall-mounted axial extract fan range.'),
    series('PUNTO EVO GOLD','PUNTO EVO GOLD Decorative Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Decorative wall-mounted axial extract fan range.'),
    series('PUNTO EVO ES','PUNTO EVO ES EC Energy-Saving Wall Axial Fans',['Residential Fan','Axial Fan','EC Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Energy-saving EC wall axial extract fan range.'),
    series('PUNTO EVO','PUNTO EVO Two-Speed Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Two-speed wall axial extract fan range.'),
    series('PUNTO GHOST','PUNTO GHOST Axial Duct Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Axial duct extract fan range.'),
    series('PUNTO FOUR','PUNTO FOUR Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Wall axial extract fan range.'),
    series('PUNTO FILO','PUNTO FILO Low-Profile Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Low-profile wall axial extract fan range.'),
    series('PUNTO','PUNTO Wall / Window Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Wall and window axial extract fan range.')
  ];

  const byId=new Map(rows.map(item=>[String(item.id),item]));
  window.VensisCatalogManifestOnly=true;
  window.VensisCatalog={
    series:rows,
    models:[],
    getSeries:id=>byId.get(String(id))||null,
    getModel:()=>null,
    modelsForSeries:()=>[],
    product:()=>null
  };
})();
