(function(){
  'use strict';
  // Every consumer loads exactly the same records and common product rules.
  const scripts=['data/ventilation-catalog.js','data/ventilation-axw-35-2t-addition.js','data/ventilation-axd-35-4m-addition.js','data/ventilation-vitlo-axf-f300-codes.js','products/ventilation-language.js','products/ventilation.js','data/no-current-policy.js','data/read-only-ui-policy.js'];
  for(const src of scripts)document.write('<script src="'+src+'?v=20261110-axd-35-4m-r1"><\/script>');
})();
