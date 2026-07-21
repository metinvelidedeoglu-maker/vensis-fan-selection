(function(){
  const ITEMS_KEY='vensis_project_items_v1';
  const META_KEY='vensis_project_meta_v1';
  const PRINT_KEY='vensis_project_print_snapshot_v1';

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}
  }

  function technicalItem(item){
    return {
      itemKey:item.itemKey||'',
      mode:item.mode||'selection',
      productKey:item.productKey||'',
      model:item.model||'',
      series:item.series||'',
      manufacturer:item.manufacturer||'Vitlo',
      image:item.image||'',
      description:item.description||'',
      nominalAirflow:Number(item.nominalAirflow)||0,
      required:item.required||null,
      selected:item.selected||null,
      motorPower:Number(item.motorPower)||0,
      current:Number(item.current)||0,
      speed:Number(item.speed)||0,
      voltage:String(item.voltage||''),
      frequency:String(item.frequency||''),
      noise:Number(item.noise)||0,
      quantity:Math.max(1,Number(item.quantity)||1)
    };
  }

  function openProjectPrint(){
    const items=readJson(ITEMS_KEY,[]);
    if(!Array.isArray(items)||!items.length){
      alert('Add at least one product before printing the project.');
      return;
    }
    const savedMeta=readJson(META_KEY,{});
    const meta={
      name:document.getElementById('projectName')?.value.trim()||savedMeta.name||'',
      reference:document.getElementById('projectReference')?.value.trim()||savedMeta.reference||''
    };
    localStorage.setItem(PRINT_KEY,JSON.stringify({
      version:2,
      createdAt:new Date().toISOString(),
      project:meta,
      items:items.map(technicalItem)
    }));
    window.open('project-print.html?print=1','_blank');
  }

  const current=document.getElementById('printProject');
  if(current){
    const replacement=current.cloneNode(true);
    current.replaceWith(replacement);
    replacement.addEventListener('click',openProjectPrint);
  }
  window.VensisProjectPrint={open:openProjectPrint,key:PRINT_KEY};
})();