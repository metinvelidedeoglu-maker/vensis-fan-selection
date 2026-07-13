(function(){
  const PROJECTS='vensis_projects_v2';
  const ACTIVE='vensis_active_project_v2';
  const ITEMS='vensis_selection_project_v1';
  const META='vensis_selection_project_meta_v1';

  function loadProjects(){
    try{
      const data=JSON.parse(localStorage.getItem(PROJECTS)||'[]');
      return Array.isArray(data)?data:[];
    }catch(e){return []}
  }

  function saveProjects(projects){
    localStorage.setItem(PROJECTS,JSON.stringify(projects));
  }

  window.goMainPage=function(){
    localStorage.removeItem(ACTIVE);
    localStorage.removeItem(ITEMS);
    localStorage.removeItem(META);
    location.href='index.html';
  };

  window.goFanSelectionForActiveProject=function(){
    const id=localStorage.getItem(ACTIVE);
    const project=loadProjects().find(p=>p.id===id);
    if(!project){
      alert('Please open a project first.');
      location.href='project.html';
      return;
    }
    localStorage.setItem(ITEMS,JSON.stringify(project.items||[]));
    localStorage.setItem(META,JSON.stringify(project.meta||{}));
    location.href='index.html';
  };

  function showSaved(){
    const state=document.getElementById('saveState');
    if(!state)return;
    state.textContent='✓ Saved';
    state.style.fontWeight='700';
    state.style.color='#d9ffe9';
    clearTimeout(window.__vensisSavedTimer);
    window.__vensisSavedTimer=setTimeout(()=>{
      state.textContent='✓ Saved';
    },1800);
  }

  function fixProjectEditor(){
    const page=(location.pathname.split('/').pop()||'').toLowerCase();
    if(page!=='project-edit.html')return;

    const projectName=document.getElementById('name');
    const customer=document.getElementById('customer');
    const date=document.getElementById('date');
    const status=document.getElementById('status');
    const notes=document.getElementById('notes');
    if(!projectName)return;

    const saveExplicitly=()=>{
      const activeId=localStorage.getItem(ACTIVE);
      const projects=loadProjects();
      const index=projects.findIndex(p=>p.id===activeId);
      if(index<0)return;

      projects[index].meta={
        ...(projects[index].meta||{}),
        name:projectName.value.trim(),
        customer:customer?.value.trim()||'',
        date:date?.value||'',
        status:status?.value||'Draft',
        notes:notes?.value||''
      };
      projects[index].updatedAt=new Date().toISOString();
      saveProjects(projects);
      localStorage.setItem(ITEMS,JSON.stringify(projects[index].items||[]));
      localStorage.setItem(META,JSON.stringify(projects[index].meta||{}));
      showSaved();
    };

    [projectName,customer,date,status,notes].filter(Boolean).forEach(el=>{
      el.addEventListener('input',saveExplicitly);
      el.addEventListener('change',saveExplicitly);
    });
    showSaved();
  }

  function inject(){
    fixProjectEditor();
    if(document.getElementById('globalNavDock'))return;
    const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const dock=document.createElement('div');
    dock.id='globalNavDock';
    dock.style.cssText='position:fixed;right:14px;bottom:14px;z-index:99999;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end';
    const home=document.createElement('button');
    home.textContent='⌂ Main Page';
    home.onclick=window.goMainPage;
    home.style.cssText='border:0;border-radius:9px;padding:10px 13px;font-weight:700;cursor:pointer;background:#173f46;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)';
    dock.appendChild(home);
    if(page==='project-edit.html'||page==='project-report.html'){
      const fan=document.createElement('button');
      fan.textContent='＋ Fan Selection';
      fan.onclick=window.goFanSelectionForActiveProject;
      fan.style.cssText='border:0;border-radius:9px;padding:10px 13px;font-weight:700;cursor:pointer;background:#006b3c;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)';
      dock.insertBefore(fan,home);
    }
    document.body.appendChild(dock);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);
  else inject();
})();
