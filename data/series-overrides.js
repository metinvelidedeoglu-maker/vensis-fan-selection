window.VensisSeriesOverrides={
    "AXF": {
        "description": {
            "applications": [
                "General area ventilation",
                "Car park smoke extraction systems",
                "Used for fresh air, exhaust"
            ]
        }
    },
    "LINEO": {
        "image": "assets/products/lineo/lineo_150_20260814.png",
        "useSeriesImageForModels": true
    },
    "LINEO ES": {
        "image": "assets/products/lineo/lineo_150_20260814.png",
        "useSeriesImageForModels": true
    },
    "HXM": {
        "image": "assets/products/soler-palau/hxm.jpg?v=13b8ab50",
        "useSeriesImageForModels": true
    }
};

if(!window.VensisCatalogBrand||window.VensisCatalogBrand==='vitlo'){
  document.write(
    '<script src="data/fans-16.js?v=20260902-crs-crh-31-r1"><\/script>',
    '<script src="data/fans-17.js?v=20260902-crs-crh-63-r1"><\/script>',
    '<script src="data/cr-family-matrix.js?v=20260902-cr-matrix-r1"><\/script>',
    '<script src="data/vitlo-quote-prices-20260902.js?v=20260902-r1"><\/script>'
  );
}

if(!window.VensisCatalogBrand||window.VensisCatalogBrand==='sp'){
  document.write(
    '<script src="data/sp-roof-01.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b02.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b03.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b04.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b05.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b06.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b07.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b08.js?v=20260826-roof-curves-r1"><\/script>',
    '<script src="data/sp-roof-b09.js?v=20260826-roof-curves-r1"><\/script>'
  );
}

document.write('<script src="js/catalog-model-seo-links.js?v=20260902-r1"><\/script>');

(function removeCatalogImageErrorHandlers(){
  const clean=()=>document.querySelectorAll('.series-card-image img[onerror], .model-card-head img[onerror]').forEach(img=>img.removeAttribute('onerror'));
  const start=()=>{
    clean();
    new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
