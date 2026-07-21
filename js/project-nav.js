(function(){
  function mountDesign(){
    const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const pageClass=path==='project.html'||path==='projects.html'?'app-project':path==='catalog.html'?'app-catalog':'app-selection';
    document.body.classList.add('app-shell',pageClass);
    if(!document.querySelector('link[href*="css/ui-polish.css"]')){
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href='css/ui-polish.css?v=20260721-design-review';
      document.head.appendChild(link);
    }
    if(path==='project.html'&&!document.getElementById('vensisProjectStickyFix')){
      const style=document.createElement('style');
      style.id='vensisProjectStickyFix';
      style.textContent='.app-project .project-table th:nth-child(2),.app-project .project-table td:nth-child(2){left:74px}';
      document.head.appendChild(style);
    }
  }
  function count(){
    const store=window.VensisProjects;
    if(store?.list)return store.list().length;
    try{const value=JSON.parse(localStorage.getItem('vensis_projects_v1')||'[]');return Array.isArray(value)?value.length:0}catch{return 0}
  }
  function update(){
    const total=count();
    document.querySelectorAll('[data-project-count]').forEach(node=>{
      node.textContent=String(total);
      node.hidden=total<1;
    });
  }
  mountDesign();
  window.addEventListener('storage',event=>{
    if(!event.key||event.key==='vensis_projects_v1'||event.key.startsWith('vensis_project_items_v2:')||event.key.startsWith('vensis_project_meta_v2:'))update();
  });
  window.addEventListener('vensis-project-updated',update);
  window.addEventListener('vensis-projects-updated',update);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',update);else update();
  window.VensisProjectNav={update};
})();