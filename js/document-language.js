(function(){
  'use strict';
  const KEY='vensis_language_v1';
  const getLanguage=()=>{
    const runtime=window.VensisI18n?.getLanguage?.();
    if(runtime==='tr'||runtime==='en')return runtime;
    try{return localStorage.getItem(KEY)==='tr'?'tr':'en'}catch{return 'en'}
  };
  const locale=lang=>(lang||getLanguage())==='tr'?'tr-TR':'en-GB';
  window.VensisDocumentLanguage={getLanguage,locale,isTurkish:()=>getLanguage()==='tr'};
})();
