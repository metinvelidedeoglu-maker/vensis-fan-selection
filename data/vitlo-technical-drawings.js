(function(){
  'use strict';

  // Every Vitlo series has its own technical-drawing asset.
  // File names mirror the product image names and intentionally may contain
  // duplicate drawing content when Vitlo uses the same casing/drawing type.
  const drawings={
    'AXF':{asset:'assets/products/AXF-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:5},
    'BOX-AXF':{asset:'assets/products/BOX-AXF-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:11},
    'AXW/ATEX':{asset:'assets/products/AXW-ATEX-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:15},
    'AXD/ATEX':{asset:'assets/products/AXD-ATEX-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:5},
    'MOB-AXD/ATEX':{asset:'assets/products/MOB-AXD-ATEX-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:19},
    'AXR/ATEX':{asset:'assets/products/AXR-ATEX-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:21},
    'CRH/ATEX':{asset:'assets/products/CRH-ATEX-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:23},
    'CRD/ATEX':{asset:'assets/products/CRD-ATEX-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:24},
    'CRS/ATEX':{asset:'assets/products/CRS-ATEX-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:25},
    'AXD':{asset:'assets/products/AXD-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:5},
    'AXD/MOB':{asset:'assets/products/MOB-AXD-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:19},
    'AXS':{asset:'assets/products/AXS-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:31},
    'AXW':{asset:'assets/products/AXW-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:15},
    'AXB':{asset:'assets/products/AXB-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:5},
    'AXH':{asset:'assets/products/AXH-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:11},
    'CD':{asset:'assets/products/CD-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:39},
    'CRB':{asset:'assets/products/CRB-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:24},
    'CRD':{asset:'assets/products/CRD-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:24},
    'CRK':{asset:'assets/products/CRK-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:42},
    'CRC':{asset:'assets/products/CRC-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:42},
    'CRS':{asset:'assets/products/CRS-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:25},
    'CR':{asset:'assets/products/CR-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:23},
    'CRH':{asset:'assets/products/CRH-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:23},
    'CRV':{asset:'assets/products/CRV-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:47},
    'CRU':{asset:'assets/products/CRU-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:47},
    'AXR':{asset:'assets/products/AXR-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:21},
    'AXV':{asset:'assets/products/AXV-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:51},
    'CR-EC':{asset:'assets/products/CR-EC-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:23},
    'CRU-EC':{asset:'assets/products/CRU-EC-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:47},
    'CRB-EC':{asset:'assets/products/CRB-EC-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:24},
    'CRC-EC':{asset:'assets/products/CRC-EC-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:42},
    'VHR':{asset:'assets/products/VHR-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:56},
    'CRR':{asset:'assets/products/CRR-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:24},
    'AXJ':{asset:'assets/products/AXJ-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:6},
    'TUNEL-AXF':{asset:'assets/products/TUNEL-AXF-technical-drawing.webp?v=20260930-embedded-r1',sourcePage:9}
  };

  const bySeries={};
  for(const [series,definition] of Object.entries(drawings)){
    bySeries[String(series).toUpperCase()]={series,...definition};
  }

  function resolve(series){
    return bySeries[String(series||'').trim().toUpperCase()]||null;
  }

  window.VensisVitloTechnicalDrawings={drawings,families:drawings,bySeries,resolve};
})();
