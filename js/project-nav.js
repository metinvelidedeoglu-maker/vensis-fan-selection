(function(){
  const KEY='vensis_project_items_v1';
  function mountDesign(){
    const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const pageClass=path==='project.html'?'app-project':path==='catalog.html'?'app-catalog':'app-selection';
    document.body.classList.add('app-shell',pageClass);
    if(!document.querySelector('link[href*="css/ui-polish.css"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='css/ui-polish.css?v=20260721-design-review';
      document.head.appendChild(link);
    }
    if(pageClass==='app-project'&&!document.getElementById('vensisProjectStickyFix')){
      const style=document.createElement('style');
      style.id='vensisProjectStickyFix';
      style.textContent='.app-project .project-table th:nth-child(2),.app-project .project-table td:nth-child(2){left:74px}';
      document.head.appendChild(style);
    }
  }
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
  mountDesign();
  window.addEventListener('storage',event=>{if(event.key===KEY)update()});
  window.addEventListener('vensis-project-updated',update);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
  window.VensisProjectNav={update,key:KEY};
})();