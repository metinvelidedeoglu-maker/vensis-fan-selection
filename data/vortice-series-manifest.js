(function(){
  'use strict';

  const placeholderIds=(id,count)=>Array.from({length:count},(_,index)=>`manifest:${id}:${index+1}`);
  const series=(id,title,categories,image,summary,count)=>({
    id,
    code:id,
    title,
    manufacturer:'Vortice',
    categories,
    media:{image:image||'',gallery:[]},
    catalogue:{pdf:'',page:''},
    description:{general:[summary||title],motor:[],applications:[]},
    modelIds:placeholderIds(id,count),
    modelCount:count
  });

  const rows=[
    series('LINEO QUIET ES','LINEO QUIET ES Low-Noise In-Line EC Mixed-Flow Fans',['Duct Fan','Mixed Flow Fan','EC Fan','Quiet Fan'],'assets/products/lineo/quiet_es_100.png','Low-noise in-line EC mixed-flow fan range for circular duct systems.',6),
    series('LINEO QUIET','LINEO QUIET Low-Noise In-Line Mixed-Flow Fans',['Duct Fan','Mixed Flow Fan','Quiet Fan'],'assets/products/lineo/quiet_150.png','Low-noise in-line mixed-flow fan range for circular duct systems.',6),
    series('LINEO','LINEO In-Line Mixed-Flow Fans',['Duct Fan','Mixed Flow Fan'],'assets/products/lineo/lineo_150_20260814.png','In-line mixed-flow fan range for circular duct systems.',7),
    series('CA MD EXTRA EU','CA MD Extra EU In-Line Mixed-Flow Duct Fans',['Duct Fan','Mixed Flow Fan'],'assets/products/ca-md/ca_md.png','Extra-performance in-line mixed-flow duct fan range.',7),
    series('CA MD E RF','CA MD E RF Roof-Mounted Mixed-Flow Exhaust Fans',['Roof Fan','Mixed Flow Fan'],'assets/products/ca-md/ca_md_e_rf.png','Roof-mounted mixed-flow exhaust fan range.',6),
    series('SLIMROOF ES','SLIMROOF ES EC Centrifugal Roof Fans',['Roof Fan','Centrifugal Fan','EC Fan'],'assets/products/roof-fans/slimroof.png','EC centrifugal roof fan range.',10),
    series('HEATMASTER F400','HEATMASTER F400 Smoke-Extract Centrifugal Roof Fans',['Roof Fan','Centrifugal Fan','Smoke Exhaust Fan'],'assets/products/roof-fans/heatmaster.png','F400 smoke-extract centrifugal roof fan range.',10),
    series('E-ATEX','E-ATEX Explosion-Protected Axial Plate Fans',['Axial Fan','Wall-Mounted Fan','Explosion-Proof / ATEX Fan'],'assets/products/eatex-tiracamino/eatex.png','Explosion-protected axial plate fan range for hazardous areas.',14),
    series('TIRACAMINO','Tiracamino Chimney-Top Extract Fan',['Roof Fan','Axial Fan','Extract Fan'],'assets/products/eatex-tiracamino/tiracamino_20260814.png','Chimney-top extract fan range.',1),
    series('VORT QBK SAL-KC EVO','VORT QBK SAL-KC EVO Cabinet Centrifugal Fans',['Cabinet Fan','Centrifugal Fan','Duct Fan'],'assets/products/qbk-sal-kc-evo/qbk_sal_kc_evo.png','Cabinet centrifugal fan range for commercial and industrial duct systems.',10),
    series('VORT QUADRO EVO','VORT QUADRO EVO Residential Centrifugal Extract Fans',['Residential Fan','Centrifugal Fan','Extract Fan'],'assets/products/vortice-residential/vort_quadro_evo.png','Residential centrifugal extract fan range.',23),
    series('VORT QUADRO I','VORT QUADRO I Flush-Mounted Centrifugal Duct Fans',['Residential Fan','Centrifugal Fan','Extract Fan'],'assets/products/vortice-residential/vort_quadro_i_20260814.png','Flush-mounted centrifugal extract fan range.',6),
    series('VORT QUADRO','VORT QUADRO Centrifugal Duct Fans',['Residential Fan','Centrifugal Fan','Extract Fan'],'assets/products/vortice-residential/vort_quadro_20260814.png','Centrifugal residential extract fan range.',3),
    series('VORTICE VARIO I','VORTICE VARIO I Flush-Mounted Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/vortice_vario_i_20260814.png','Flush-mounted reversible axial fan range.',3),
    series('VORTICE VARIO','VORTICE VARIO Wall / Window Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/vortice_vario_20260814.png','Wall and window mounted axial fan range.',3),
    series('PUNTO EVO FLEXO','PUNTO EVO FLEXO Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_evo_flexo_20260814.png','Wall-mounted axial extract fan range.',4),
    series('PUNTO EVO GOLD','PUNTO EVO GOLD Decorative Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_evo_gold_20260814.png','Decorative wall-mounted axial extract fan range.',8),
    series('PUNTO EVO','PUNTO EVO Two-Speed Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_evo_20260814.png','Two-speed wall axial extract fan range.',10),
    series('PUNTO GHOST','PUNTO GHOST Axial Duct Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_ghost_20260814.png','Axial duct extract fan range.',3),
    series('PUNTO FOUR','PUNTO FOUR Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_four_20260814.png','Wall axial extract fan range.',3),
    series('PUNTO FILO','PUNTO FILO Low-Profile Wall Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_filo_20260814.png','Low-profile wall axial extract fan range.',3),
    series('PUNTO','PUNTO Wall / Window Axial Fans',['Residential Fan','Axial Fan','Extract Fan'],'assets/products/vortice-residential/punto_20260814.png','Wall and window axial extract fan range.',9)
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
