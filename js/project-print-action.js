(function(){
  const PRINT_KEY='vensis_project_print_snapshot_v1';
  const store=window.VensisProjects;

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
    window.VensisProject?.flushAllNotes?.();
    window.VensisProjectContact?.save?.();
    const projectId=window.VensisProject?.projectId||store?.activeId?.();
    const items=store?.readItems?.(projectId)||[];
    if(!Array.isArray(items)||!items.length){alert('Add at least one product before printing the project.');return}
    const savedMeta=store?.readMeta?.(projectId)||{};
    const meta={
      id:projectId||'',
      name:document.getElementById('projectName')?.value.trim()||savedMeta.name||'',
      reference:document.getElementById('projectReference')?.value.trim()||savedMeta.reference||'',
      contact:document.getElementById('projectContact')?.value.trim()||savedMeta.contact||''
    };
    localStorage.setItem(PRINT_KEY,JSON.stringify({version:4,createdAt:new Date().toISOString(),project:meta,items:items.map(technicalItem)}));
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