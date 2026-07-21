(function(){
  const KEY='vensis_project_items_v1';
  function items(){
    try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}
  }
  function update(){
    const count=items().reduce((sum,item)=>sum+Math.max(1,Number(item.quantity)||1),0);
    document.querySelectorAll('[data-project-count]').forEach(node=>{
      node.textContent=String(count);
      node.hidden=count<1;
    });
  }
  window.addEventListener('storage',event=>{if(event.key===KEY)update()});
  window.addEventListener('vensis-project-updated',update);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
  window.VensisProjectNav={update,key:KEY};
})();