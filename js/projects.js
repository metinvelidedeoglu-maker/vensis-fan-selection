(function(){
  const store=window.VensisProjects;
  const customerStore=window.VensisCustomers;
  const pendingProject=window.VensisPendingProject;
  const listUtils=window.VensisProjectListUtils;
  const orderUtils=window.VensisOrderUtils;
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(num(value));
  const money=value=>`€${fmt(value,2)}`;
  const t=value=>window.VensisI18n?.t?.(value)||value;
  const customerFields=['newProjectName','newProjectPreparedBy','newProjectReference','newProjectContact','newProjectPhone','newProjectEmail'];
  let matchedCustomerId='';
  let duplicateSourceId='';

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
      contact:meta.contact||project.contact||'',
      preparedBy:meta.preparedBy||'',
      status:meta.status||project.status||'draft'
    };
  }
  function statusLabel(status){return orderUtils?.projectStatusLabel?.(status)||({draft:'Taslak',quoted:'Teklif Verildi',won:'Kazanıldı',ordered:'Sipariş Verildi',lost:'Kaybedildi'}[status]||'Taslak')}
  function card(project,activeId){
    const totals=projectTotals(project.id);
    const reference=project.reference||'No customer or reference entered';
    return `<article class="project-card ${project.id===activeId?'active':''}" data-project-card="${esc(project.id)}">
      <div class="card-top"><div><div class="project-kicker">Project Workspace</div><h2>${esc(project.name)}</h2></div><div class="card-badges"><span class="status-badge" data-status="${esc(project.status)}">${esc(statusLabel(project.status))}</span>${project.id===activeId?'<span class="active-badge">Active</span>':''}</div></div>
      <div class="project-identifiers"><div class="project-identifier"><span>Project Code</span><b>${esc(listUtils.projectCode(project))}</b></div><div class="project-identifier"><span>Project Date</span><b>${esc(dateText(project.createdAt||project.updatedAt))}</b></div></div>
      <p class="reference">${esc(reference)}</p>
      <p class="contact">${project.contact?`Contact: ${esc(project.contact)}`:'No contact person entered'}</p>
      <p class="contact">${project.preparedBy?`Prepared by: ${esc(project.preparedBy)}`:'Prepared by not recorded'}</p>
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
    const aggregate=visible.reduce((sum,project)=>{
      const totals=projectTotals(project.id);
      sum.units+=totals.units;
      if(totals.hasValue){sum.hasValue=true;sum.value+=totals.value}
      return sum;
    },{units:0,value:0,hasValue:false});
    const hasProjects=projects.length>0;
    const isFiltered=Boolean(query.trim()||month);
    byId('projectCount').textContent=fmt(visible.length);
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
  function renderCustomerOptions(){
    const options=byId('projectCustomerOptions');
    if(!options)return;
    options.innerHTML=(customerStore?.list?.()||[]).map(customer=>`<option value="${esc(customer.companyName)}"></option>`).join('');
  }
  function selectedCustomer(){return customerStore?.findByName?.(byId('newProjectReference')?.value)||null}
  function missingCustomerFields(customer){
    const missing=[];
    if(!String(customer?.contact||'').trim())missing.push(t('contact person'));
    if(!String(customer?.phone||'').trim()&&!String(customer?.email||'').trim())missing.push(t('phone or email'));
    return missing;
  }
  function showCustomerMatch(){
    const element=byId('projectCustomerMatch');
    if(!element)return;
    const company=byId('newProjectReference')?.value.trim()||'';
    const customer=selectedCustomer();
    element.className='customer-match wide';
    if(!company){element.textContent='';return}
    if(!customer){element.classList.add('is-new');element.textContent=t('New customer — details will be saved to the customer list.');return}
    const missing=missingCustomerFields({contact:byId('newProjectContact')?.value,phone:byId('newProjectPhone')?.value,email:byId('newProjectEmail')?.value});
    element.classList.add(missing.length?'is-incomplete':'is-found');
    element.textContent=missing.length?`${t('Existing customer found. Complete missing information:')} ${missing.join(', ')}.`:t('Existing customer found. Details are ready.');
  }
  function fillSelectedCustomer(){
    const customer=selectedCustomer();
    if(customer){
      byId('newProjectContact').value=customer.contact||'';
      byId('newProjectPhone').value=customer.phone||'';
      byId('newProjectEmail').value=customer.email||'';
      matchedCustomerId=customer.id;
    }else if(matchedCustomerId){
      byId('newProjectContact').value='';
      byId('newProjectPhone').value='';
      byId('newProjectEmail').value='';
      matchedCustomerId='';
    }
    showCustomerMatch();
    clearProjectError();
  }
  function clearProjectError(){
    const error=byId('projectFormError');
    if(error){error.textContent='';error.classList.remove('is-visible')}
    customerFields.forEach(id=>byId(id)?.classList?.remove('is-invalid'));
  }
  function projectError(message,fieldIds=[]){
    const error=byId('projectFormError');
    if(error){error.textContent=t(message);error.classList.add('is-visible')}
    fieldIds.forEach(id=>byId(id)?.classList?.add('is-invalid'));
    byId(fieldIds[0])?.focus();
  }
  function renderPendingNotice(){
    const notice=byId('pendingProductNotice');if(!notice)return;
    const count=pendingProject?.read?.()?.items?.length||0;
    notice.hidden=!count;
    notice.textContent=count?`${count} ${t(count===1?'product will be added after the project is created.':'products will be added after the project is created.')}`:'';
  }
  function setModalCopy(isDuplicate){
    byId('newProjectTitle').textContent=t(isDuplicate?'Duplicate Project':'New Project');
    byId('newProjectDescription').textContent=t(isDuplicate?'Complete customer details before duplicating this project.':'Create a project and connect it to a complete customer record.');
    byId('submitProject').textContent=t(isDuplicate?'Save Customer & Duplicate Project':'Save Customer & Create Project');
  }
  function openModal(sourceId=''){
    duplicateSourceId=typeof sourceId==='string'?sourceId:'';
    if(duplicateSourceId)pendingProject?.clear?.();
    byId('projectModal').hidden=false;
    document.body.style.overflow='hidden';
    byId('projectForm').reset();
    matchedCustomerId='';
    clearProjectError();renderCustomerOptions();setModalCopy(Boolean(duplicateSourceId));renderPendingNotice();
    if(duplicateSourceId){
      const source=store.get(duplicateSourceId);
      const meta=source?store.readMeta(duplicateSourceId):{};
      byId('newProjectName').value=`${meta.name||source?.name||t('Project')} ${t('Copy')}`;
      byId('newProjectPreparedBy').value=meta.preparedBy||'';
      byId('newProjectReference').value=meta.reference||source?.reference||'';
      fillSelectedCustomer();
      if(!selectedCustomer())byId('newProjectContact').value=meta.contact||source?.contact||'';
      showCustomerMatch();
    }else showCustomerMatch();
    setTimeout(()=>byId('newProjectName').focus(),0);
  }
  function closeModal(){
    byId('projectModal').hidden=true;
    document.body.style.overflow='';
    duplicateSourceId='';
  }
  function applyPendingItems(projectId){
    const pending=pendingProject?.read?.();
    if(!pending?.items?.length)return 0;
    const items=store.readItems(projectId);
    const stamp=new Date().toISOString();
    pending.items.forEach(item=>{
      const key=String(item.itemKey||'');
      const existing=key?items.find(candidate=>String(candidate.itemKey||'')===key):null;
      if(existing){existing.quantity=Math.max(1,Number(existing.quantity)||1)+Math.max(1,Number(item.quantity)||1);existing.updatedAt=stamp}
      else items.push({...item,quantity:Math.max(1,Number(item.quantity)||1),addedAt:item.addedAt||stamp,updatedAt:stamp});
    });
    store.writeItems(items,projectId);
    pendingProject.clear();
    return pending.items.length;
  }
  function createProject(event){
    event.preventDefault();
    clearProjectError();
    const name=byId('newProjectName').value.trim();
    const preparedBy=byId('newProjectPreparedBy').value.trim();
    const companyName=byId('newProjectReference').value.trim();
    const contact=byId('newProjectContact').value.trim();
    const phone=byId('newProjectPhone').value.trim();
    const email=byId('newProjectEmail').value.trim();
    if(!name){projectError('Project name is required.',['newProjectName']);return}
    if(!preparedBy){projectError('Prepared by is required.',['newProjectPreparedBy']);return}
    if(!companyName){projectError('Company name is required.',['newProjectReference']);return}
    if(!contact){projectError('Contact person is required.',['newProjectContact']);return}
    if(!phone&&!email){projectError('Enter at least one phone number or email address.',['newProjectPhone','newProjectEmail']);return}
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){projectError('Enter a valid email address.',['newProjectEmail']);return}
    if(!customerStore?.upsert){projectError('Customer records are unavailable. Please try again.');return}
    const existing=customerStore.findByName?.(companyName);
    const customer=customerStore.upsert({...existing,companyName,contact,phone,email,id:existing?.id});
    const isDuplicate=Boolean(duplicateSourceId);
    const project=isDuplicate?store.duplicate(duplicateSourceId):store.create({name,reference:customer.companyName,contact:customer.contact,preparedBy});
    if(!project){projectError('Project could not be created. Please try again.');return}
    if(isDuplicate)store.writeMeta({name,reference:customer.companyName,contact:customer.contact,preparedBy},project.id);
    else applyPendingItems(project.id);
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
    if(store.get(projectId))openModal(projectId);
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
  byId('newProject')?.addEventListener('click',()=>openModal());
  byId('emptyNewProject')?.addEventListener('click',()=>openModal());
  byId('cancelProject')?.addEventListener('click',closeModal);
  byId('newProjectReference')?.addEventListener('input',fillSelectedCustomer);
  ['newProjectName','newProjectPreparedBy','newProjectContact','newProjectPhone','newProjectEmail'].forEach(id=>byId(id)?.addEventListener('input',()=>{clearProjectError();showCustomerMatch()}));
  byId('projectModal')?.addEventListener('click',event=>{if(event.target===byId('projectModal'))closeModal()});
  byId('projectForm')?.addEventListener('submit',createProject);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!byId('projectModal')?.hidden)closeModal()});
  window.addEventListener('storage',render);
  window.addEventListener('vensis-projects-updated',render);
  window.addEventListener('vensis-customers-updated',()=>{renderCustomerOptions();if(!byId('projectModal')?.hidden)showCustomerMatch()});
  render();
  if(new URLSearchParams(location.search).get('new')==='1')openModal();
})();
