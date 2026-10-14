(function(){
  'use strict';

  function verifiedLines(item){
    const source=item?.hazardousArea;
    if(!source||typeof source!=='object'||Array.isArray(source))return [];
    const gas=String(source.gas_marking||'').trim();
    const dust=String(source.dust_marking||'').trim();
    if(!gas&&!dust)return [];
    return [...new Set([gas,dust].filter(Boolean))];
  }

  // Product names such as "/ATEX" are classifications, not certificate evidence.
  // Rendering code may use these lines only when structured catalogue evidence exists.
  window.VensisAtexOutput={verifiedLines,apply:()=>false};
})();
