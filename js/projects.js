(function(){
  const store=window.VensisProjects;
  const listUtils=window.VensisProjectListUtils;
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value));
  const money=value=>`€${fmt(value,2)}`;

  function projectTotals(projectId){
    return store.readItems(projectId).reduce((sum,item)=>{
      const qty=Math.max(1,num(item.quantity)||1);
      const price=num(item.price);
      const discount=Math.min(100,Math.max(0,num(item.discountPercent)));
      sum.units+=qty;
      if(price>0){sum.hasValue=true;sum.value+=price*(1-discount/100)*qty}
      return sum;
    },{units:0,value:0,hasValue:false});
  }
  function dateText(value,includeTime=false){
    const timestamp=Date.parse(value||'');
    if(!Number.isFinite(timestamp))return '-';
    const options={day:'2-digit',month:'short',year:'numeric'};
    if(includeTime){options.hour='2-digit';options.minute='2-digit'}
    return new Intl.DateTimeFormat('en-GB',options).format(new Date(timestamp));
  }
  function monthText(key){
    const [year,month]=String(key||'').split('-').map(Number);
    if(!year||!month)return key;
    return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(new Date(year,month-1,1));
  }
  function projectView(project){
    const meta=store.readMeta(project.id);
    return {
      ...project,
      name:meta.name||project.name||'Untitled Project',
      reference:meta.reference||project.reference||'',
      contact:meta.contact||project.contact||''
    };
  }
  function card(project,activeId){
    const totals=projectTotals(project.id);
    const reference=project.reference||'No customer or reference entered';
    return `<article class="project-card ${project.id===activeId?'active':''}" data-project-card="${esc(project.id)}">
      <div class="card-top"><div><div class="project-kicker">Project Workspace</div><h2>${esc(project.name)}</h2></div>${project.id===activeId?'<span class="active-badge">Active</span>':''}</div>
      <div class="project-identifiers"><div class="project-identifier"><span>Project Code</span><b>${esc(listUtils.projectCode(project))}</b></div><div class="project-identifier"><span>Project Date</span><b>${esc(dateText(project.createdAt||project.updatedAt))}</b></div></div>
      <p class="reference">${esc(reference)}</p>
      <p class="contact">${project.contact?`Contact: ${esc(project.contact)}`:'No contact person entered'}</p>
      <div class="card-stats"><div class="card-stat"><span>Total Units</span><b>${fmt(totals.units)}</b></div><div class="card-stat"><span>Net Value</span><b>${totals.hasValue?money(totals.value):'-'}</b></div></div>
      <div class="updated">Updated ${esc(dateText(project.updatedAt,true))}</div>
      <div class="card-actions"><button class="open-btn" type="button" data-open-project="${esc(project.id)}">Open Project</button><button class="duplicate-btn" type="button" data-duplicate-project="${esc(project.id)}" title="Duplicate project">Duplicate</button><button class="delete-btn" type="button" data-delete-project="${esc(project.id)}" title="Delete project">Delete</button></div>
    </article>`;
  }
  function refreshMonthOptions(projects){
    const select=byId('projectMonth');
    if(!select)return;
    const selected=select.value;
    const months=listUtils.availableMonths(projects);
    select.innerHTML='<option value="">All months</option>'+months.map(month=>`<option value="${esc(month)}">${esc(monthText(month))}</option>`).join('');
    select.value=months.includes(selected)?selected:'';
  }
  function render(){
    const projects=store.list().map(projectView);
    refreshMonthOptions(projects);
    const query=byId('projectSearch')?.value||'';
    const month=byId('projectMonth')?.value||'';
    const visible=listUtils.filterAndSort(projects,{query,month});
    const active=store.activeId();
    const aggregate=projects.reduce((sum,project)=>{
      const totals=projectTotals(project.id);
      sum.units+=totals.units;
      if(totals.hasValue){sum.hasValue=true;sum.value+=totals.value}
      return sum;
    },{units:0,value:0,hasValue:false});
    const hasProjects=projects.length>0;
    const isFiltered=Boolean(query.trim()||month);
    byId('projectCount').textContent=fmt(projects.length);
    byId('totalUnits').textContent=fmt(aggregate.units);
    byId('combinedValue').textContent=aggregate.hasValue?money(aggregate.value):'-';
    byId('projectsToolbar').hidden=!hasProjects;
    byId('projectsEmpty').hidden=hasProjects;
    byId('projectsNoResults').hidden=!hasProjects||visible.length>0;
    byId('projectsGrid').innerHTML=visible.map(project=>card(project,active)).join('');
    byId('filterSummary').textContent=isFiltered?`Showing ${fmt(visible.length)} of ${fmt(projects.length)} projects`:`Showing all ${fmt(projects.length)} projects`;
  }
  function clearFilters(){
    if(byId('projectSearch'))byId('projectSearch').value='';
    if(byId('projectMonth'))byId('projectMonth').value='';
    render();
    byId('projectSearch')?.focus();
  }
  function openModal(){
    byId('projectModal').hidden=false;
    document.body.style.overflow='hidden';
    byId('projectForm').reset();
    setTimeout(()=>byId('newProjectName').focus(),0);
  }
  function closeModal(){
    byId('projectModal').hidden=true;
    document.body.style.overflow='';
  }
  function createProject(event){
    event.preventDefault();
    const name=byId('newProjectName').value.trim();
    if(!name){byId('newProjectName').focus();return}
    const project=store.create({name,reference:byId('newProjectReference').value.trim(),contact:byId('newProjectContact').value.trim()});
    closeModal();
    location.assign(store.projectUrl(project.id));
  }
  function deleteProject(projectId){
    const project=store.get(projectId);if(!project)return;
    const meta=store.readMeta(projectId);
    const name=meta.name||project.name||'this project';
    if(!confirm(`Delete "${name}" and all of its project products?`))return;
    store.remove(projectId);
    render();
  }
  function duplicateProject(projectId){
    const copy=store.duplicate(projectId);
    if(copy)location.assign(store.projectUrl(copy.id));
  }

  document.addEventListener('click',event=>{
    const open=event.target.closest('[data-open-project]');
    const duplicate=event.target.closest('[data-duplicate-project]');
    const remove=event.target.closest('[data-delete-project]');
    if(open)store.open(open.dataset.openProject);
    if(duplicate)duplicateProject(duplicate.dataset.duplicateProject);
    if(remove)deleteProject(remove.dataset.deleteProject);
  });
  byId('projectSearch')?.addEventListener('input',render);
  byId('projectMonth')?.addEventListener('change',render);
  byId('clearProjectFilters')?.addEventListener('click',clearFilters);
  byId('newProject')?.addEventListener('click',openModal);
  byId('emptyNewProject')?.addEventListener('click',openModal);
  byId('cancelProject')?.addEventListener('click',closeModal);
  byId('projectModal')?.addEventListener('click',event=>{if(event.target===byId('projectModal'))closeModal()});
  byId('projectForm')?.addEventListener('submit',createProject);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!byId('projectModal')?.hidden)closeModal()});
  window.addEventListener('storage',render);
  window.addEventListener('vensis-projects-updated',render);
  render();
})();
