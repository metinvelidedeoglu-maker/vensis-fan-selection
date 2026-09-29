(function(){
  'use strict';

  // Static manufacturer technical drawings. These are generated once from the
  // official Vitlo catalogue and then served exactly like normal product assets.
  // Runtime reports must never need to crop the source PDF.
  const families={
    axial_duct:{
      asset:'assets/technical-drawings/vitlo/axial-duct.png',
      fallback:'/api/catalog/vitlo-drawing.php?family=axial_duct&v=20260929-static-endpoint-r1',
      series:['AXF','AXD','AXD/ATEX'],
      sourcePage:5
    },
    axial_wall:{
      asset:'assets/products/AXW-ATEX-dimensions.webp',
      fallback:'/api/catalog/vitlo-drawing.php?family=axial_wall&v=20260929-static-endpoint-r1',
      series:['AXW','AXW/ATEX'],
      sourcePage:15
    },
    axial_mobile:{
      asset:'assets/technical-drawings/vitlo/axial-mobile.png',
      fallback:'/api/catalog/vitlo-drawing.php?family=axial_mobile&v=20260929-static-endpoint-r1',
      series:['AXD/MOB','MOB-AXD/ATEX'],
      sourcePage:19
    },
    axial_roof_horizontal:{
      asset:'assets/technical-drawings/vitlo/axial-roof-horizontal.png',
      fallback:'/api/catalog/vitlo-drawing.php?family=axial_roof_horizontal&v=20260929-static-endpoint-r1',
      series:['ROOF-AXF','AXR','AXR/ATEX'],
      sourcePage:13
    }
  };
  const bySeries={};
  for(const [family,definition] of Object.entries(families)){
    for(const series of definition.series){
      bySeries[String(series).toUpperCase()]={family,...definition};
    }
  }
  function resolve(series){
    return bySeries[String(series||'').trim().toUpperCase()]||null;
  }
  window.VensisVitloTechnicalDrawings={families,bySeries,resolve};
})();
