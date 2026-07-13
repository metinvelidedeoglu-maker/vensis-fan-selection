const VENSIS_PROJECTS_KEY='vensis_projects_v2';
const VENSIS_ACTIVE_PROJECT_KEY='vensis_active_project_v2';
const VENSIS_LEGACY_ITEMS_KEY='vensis_selection_project_v1';
const VENSIS_LEGACY_META_KEY='vensis_selection_project_meta_v1';

function psLoadProjects(){
  try{
    const data=JSON.parse(localStorage.getItem(VENSIS_PROJECTS_KEY)||'[]');
    return Array.isArray(data)?data:[];
  }catch(e){return []}
}
function psSaveProjects(projects){localStorage.setItem(VENSIS_PROJECTS_KEY,JSON.stringify(projects));}
function psToday(){
  const d=new Date();
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function psProjectNo(date,projects){
  const prefix='PRJ-'+date.replaceAll('-','')+'-';
  const numbers=projects.map(p=>p.meta?.projectNo||'').filter(x=>x.startsWith(prefix)).map(x=>Number(x.slice(-3))||0);
  return prefix+String((numbers.length?Math.max(...numbers):0)+1).padStart(3,'0');
}
function psActiveProject(){
  const id=localStorage.getItem(VENSIS_ACTIVE_PROJECT_KEY);
  return psLoadProjects().find(p=>p.id===id)||null;
}
function psSyncLegacy(project){
  localStorage.setItem(VENSIS_LEGACY_ITEMS_KEY,JSON.stringify(project?.items||[]));
  localStorage.setItem(VENSIS_LEGACY_META_KEY,JSON.stringify(project?.meta||{}));
}
function createProjectFromSelection(){
  const projects=psLoadProjects();
  const date=psToday();
  const name=prompt('Project name (optional):','')||'';
  const project={
    id:'prj_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
    meta:{name:name.trim(),customer:'',date,projectNo:psProjectNo(date,projects),status:'Draft',notes:''},
    items:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  };
  projects.unshift(project);
  psSaveProjects(projects);
  localStorage.setItem(VENSIS_ACTIVE_PROJECT_KEY,project.id);
  psSyncLegacy(project);
  updateSelectionProjectCount();
}
function selectExistingProject(){
  const projects=psLoadProjects();
  if(!projects.length){
    alert('No project exists yet. Create a new project first.');
    return;
  }
  window.location.href='project.html';
}
function clearActiveProject(){
  localStorage.removeItem(VENSIS_ACTIVE_PROJECT_KEY);
  localStorage.removeItem(VENSIS_LEGACY_ITEMS_KEY);
  localStorage.removeItem(VENSIS_LEGACY_META_KEY);
  updateSelectionProjectCount();
}

function updateSelectionProjectCount(){
  const active=psActiveProject();
  const nameEl=document.getElementById('activeProjectName');
  const countEl=document.getElementById('projectItemCount');
  const clearBtn=document.getElementById('clearActiveProjectBtn');
  if(clearBtn)clearBtn.textContent='Exit Project';
  if(!active){
    if(nameEl)nameEl.textContent='No active project';
    if(countEl)countEl.textContent='Select or create a project before adding products.';
    if(clearBtn)clearBtn.hidden=true;
    document.body.classList.add('no-active-project');
    return;
  }
  const total=(active.items||[]).reduce((sum,item)=>sum+(Number(item.quantity)||1),0);
  const label=active.meta?.name||active.meta?.projectNo||'Unnamed Project';
  if(nameEl)nameEl.textContent=label;
  if(countEl)countEl.textContent=total+' selected product(s)';
  if(clearBtn)clearBtn.hidden=false;
  document.body.classList.remove('no-active-project');
}

function addToSelectionProject(resultIndex){
  const result=results[resultIndex];
  if(!result)return;
  const activeId=localStorage.getItem(VENSIS_ACTIVE_PROJECT_KEY);
  const projects=psLoadProjects();
  const project=projects.find(p=>p.id===activeId);
  if(!project){
    alert('Please select an existing project or create a new project before adding a product.');
    updateSelectionProjectCount();
    return;
  }
  project.items=Array.isArray(project.items)?project.items:[];
  const signature=[result.key,Math.round(Number(result.qq)||0),Math.round(Number(result.pp)||0)].join('|');
  const existing=project.items.find(item=>item.signature===signature);
  if(existing){existing.quantity=(Number(existing.quantity)||1)+1;}
  else{
    project.items.push({
      id:'item_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),signature,key:result.key,
      model:result.model||result.display,series:result.series||'',flow:Math.round(Number(result.qq)||0),
      pressure:Math.round(Number(result.pp)||0),motorPower:Number(result.kw)||0,noise:Number(result.spl)||0,
      unitPrice:result.price==null?null:Number(result.price),quantity:1,addedAt:new Date().toISOString()
    });
  }
  project.updatedAt=new Date().toISOString();
  psSaveProjects(projects);
  psSyncLegacy(project);
  updateSelectionProjectCount();
}

function openProjectPage(){
  const active=psActiveProject();
  window.location.href=active?'project-edit.html':'project.html';
}

document.addEventListener('DOMContentLoaded',updateSelectionProjectCount);
window.addEventListener('storage',updateSelectionProjectCount);
