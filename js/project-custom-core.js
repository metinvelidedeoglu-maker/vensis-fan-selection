(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.VensisProjectCustom=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const text=value=>String(value??'').trim();
  const num=value=>Number.isFinite(Number(value))?Number(value):0;
  const isProjectProduct=item=>item?.mode==='custom'&&/^cpp_/.test(text(item.productKey));
  function toItem(source,existing=null){
    const stamp=new Date().toISOString();
    return {...(existing||{}),itemKey:existing?.itemKey||`custom|${source.id}|${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,mode:'custom',
      productType:source.productType==='electrical'?'electrical':'fan',productKey:text(source.id),model:text(source.model),series:text(source.series),manufacturer:text(source.manufacturer),description:text(source.description),image:text(source.image),
      price:Math.max(0,num(source.price)),priceCurrency:'EUR',quantity:Math.max(1,Math.round(num(source.quantity)||1)),discountPercent:Math.min(100,Math.max(0,num(source.discountPercent))),
      nominalAirflow:Math.max(0,num(source.nominalAirflow)),voltage:text(source.voltage),frequency:text(source.frequency),motorPower:Math.max(0,num(source.motorPower)),speed:Math.max(0,num(source.speed)),current:Math.max(0,num(source.current)),noise:Math.max(0,num(source.noise)),power:text(source.power),lumen:text(source.lumen),ip:text(source.ip),
      required:existing?.required||null,selected:existing?.selected||null,addedAt:existing?.addedAt||stamp,updatedAt:stamp};
  }
  function record(data,project,id,createdAt){
    const stamp=new Date().toISOString();
    if(!text(data.model))throw new Error('Model / ürün adı gereklidir.');
    if(!text(project.id))throw new Error('Proje bulunamadı.');
    return {...data,id:id||`cpp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`,scope:'project',projectId:text(project.id),projectName:text(project.name),productType:data.productType==='electrical'?'electrical':'fan',createdAt:createdAt||stamp,updatedAt:stamp};
  }
  return {isProjectProduct,toItem,record};
});
