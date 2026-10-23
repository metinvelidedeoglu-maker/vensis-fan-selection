(function(){
  'use strict';
  // Every consumer loads exactly the same records and common product rules.
  const scripts=['data/ventilation-catalog.js','products/ventilation.js','data/no-current-policy.js','data/read-only-ui-policy.js'];
  for(const src of scripts)document.write('<script src="'+src+'?v=20261023-sp-bath-curves-r1"><\/script>');
})();
