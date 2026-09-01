(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{
    root.VensisQuotationFormats=api;
    if(typeof document!=='undefined'&&!document.getElementById('vensisDocumentOutputI18n')){
      const script=document.createElement('script');
      script.id='vensisDocumentOutputI18n';
      script.src='js/document-output-i18n.js?v=20260901-r1';
      script.defer=true;
      document.head.appendChild(script);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const FORMATS=['auto','fan','electrical','mixed'];
  function text(value){return String(value??'').trim().toLowerCase()}
  function preference(value){return FORMATS.includes(text(value))?text(value):'auto'}
  function itemType(item){
    const source=item&&typeof item==='object'?item:{};
    const explicit=text(source.productType||source.catalogType);
    if(explicit==='electrical')return 'electrical';
    if(explicit==='fan')return 'fan';
    if(text(source.itemKey).startsWith('electrical|'))return 'electrical';
    if(text(source.manufacturer)==='zonex')return 'electrical';
    if(source.orderCode||source.ip||source.lumen||source.operatingTemperature)return 'electrical';
    return 'fan';
  }
  function split(items){
    return (Array.isArray(items)?items:[]).reduce((groups,item)=>{groups[itemType(item)].push(item);return groups},{fan:[],electrical:[]});
  }
  function detect(items,selected='auto'){
    const chosen=preference(selected);
    if(chosen!=='auto')return chosen;
    const groups=split(items);
    if(groups.fan.length&&groups.electrical.length)return 'mixed';
    return groups.electrical.length?'electrical':'fan';
  }
  function label(value){return ({auto:'Otomatik',fan:'Fan',electrical:'Elektrik',mixed:'Karma'}[preference(value)]||'Otomatik')}
  return {FORMATS,detect,itemType,label,preference,split};
});
