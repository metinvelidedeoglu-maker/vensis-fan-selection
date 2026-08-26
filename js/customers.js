(function(){
  'use strict';

  const store=window.VensisCustomers;
  const projects=window.VensisProjects;
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const t=value=>window.VensisI18n?.t?.(value)||value;
  const locale=()=>window.VensisI18n?.getLanguage?.()==='tr'?'tr-TR':'en-GB';
  const fields=['companyName','contact','phone','email','taxOffice','taxNo','address'];
  let active='';
  let editorMode='edit';

  function text(value){return String(value??'').trim()}
  function setText(selector,value){const element=$(selector);if(element)element.textContent=value}
  function nameKey(value){return text(value).toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[^a-z0-9ıöüçşğ]+/giu,'')}
  function initials(value){
    const words=text(value).split(/\s+/).filter(Boolean);
    return (words.length>1?`${words[0][0]}${words[1][0]}`:words[0]?.slice(0,2)||'—').toLocaleUpperCase('tr-TR');
  }
  function date(value,compact=false){
    const parsed=Date.parse(value||'');
    if(Number.isNaN(parsed))return '—';
    return new Intl.DateTimeFormat(locale(),compact?{day:'2-digit',month:'short'}:{day:'2-digit',month:'short',year:'numeric'}).format(new Date(parsed));
  }
  function allProjects(){
    return (projects?.list?.()||[]).map(project=>{
      const meta=projects.readMeta?.(project.id)||{};
      return {...project,meta,name:meta.name||project.name||t('Untitled Project'),reference:meta.reference||project.reference||'',status:meta.status||project.status||'draft'};
    });
  }
  function linkedProjects(customer,source=allProjects()){
    const customerKey=nameKey(customer?.companyName);
    if(!customerKey)return [];
    return source.filter(project=>nameKey(project.reference)===customerKey);
  }
  function customerStats(customer,source=allProjects()){
    const linked=linkedProjects(customer,source);
    const quotations=linked.filter(project=>text(project.meta.lastQuotationNumber));
    const orderRows=linked.flatMap(project=>(Array.isArray(project.meta.orders)?project.meta.orders:[]).map(order=>({project,order})));
    const timestamps=[customer.updatedAt,...linked.map(project=>project.updatedAt),...orderRows.flatMap(row=>[row.order.updatedAt,row.order.createdAt])].filter(value=>!Number.isNaN(Date.parse(value||'')));
    return {projects:linked,quotations,orders:orderRows,lastActivity:timestamps.sort().at(-1)||''};
  }
  function filtered(){
    const query=text($('#customerSearch')?.value).toLocaleLowerCase('tr-TR');
    return store.list().filter(customer=>!query||[customer.companyName,customer.taxNo,customer.taxOffice,customer.contact,customer.phone,customer.email,customer.address]
      .some(value=>text(value).toLocaleLowerCase('tr-TR').includes(query)));
  }
  function isComplete(customer){return ['contact','phone','email','taxOffice','taxNo','address'].every(field=>text(customer[field]))}

  function renderSummary(){
    const customers=store.list();
    const source=allProjects();
    const customerKeys=new Set(customers.map(customer=>nameKey(customer.companyName)).filter(Boolean));
    const linked=source.filter(project=>customerKeys.has(nameKey(project.reference)));
    const quotations=linked.filter(project=>text(project.meta.lastQuotationNumber)).length;
    const orders=linked.reduce((sum,project)=>sum+(Array.isArray(project.meta.orders)?project.meta.orders.length:0),0);
    setText('#customerCount',customers.length);
    setText('#customerProjectCount',linked.length);
    setText('#customerQuotationCount',quotations);
    setText('#customerOrderCount',orders);
    setText('#customerDetailCoverage',`${customers.filter(isComplete).length} ${t('with full details')}`);
  }
  function renderList(){
    const rows=filtered();
    const source=allProjects();
    setText('#customerShown',rows.length);
    $('#customerList').innerHTML=rows.length?rows.map(customer=>{
      const stats=customerStats(customer,source);
      const secondary=customer.contact||customer.taxNo||customer.address||t('Details missing');
      return `<button class="customer-row${customer.id===active?' is-active':''}" data-id="${esc(customer.id)}" type="button"><span class="row-avatar">${esc(initials(customer.companyName))}</span><span class="row-copy"><b>${esc(customer.companyName)}</b><span>${esc(secondary)}</span></span><span class="row-stats" title="${esc(t('Quotations and orders'))}"><b>${stats.quotations.length}</b><b>${stats.orders.length}</b></span></button>`;
    }).join(''):`<div class="customer-empty"><div><b>${esc(t('No customers in this browser yet'))}</b><span>${esc(t('Sign in to restore cloud customers, or add a new customer locally.'))}</span></div></div>`;
    document.querySelectorAll('.customer-row').forEach(button=>button.addEventListener('click',()=>openProfile(button.dataset.id)));
  }
  function value(selector,value){
    const element=$(selector);
    if(!element)return;
    const available=text(value);
    element.textContent=available||t('Not provided');
    element.classList.toggle('is-missing',!available);
  }
  function activityRows(customer,stats){
    const rows=[];
    stats.projects.forEach(project=>{
      rows.push({type:'project',symbol:'▣',title:project.name,description:project.reference||customer.companyName,status:t(({draft:'Draft',quoted:'Quoted',won:'Won',ordered:'Ordered',lost:'Lost'})[project.status]||'Draft'),date:project.updatedAt});
      if(text(project.meta.lastQuotationNumber))rows.push({type:'quote',symbol:'◫',title:project.meta.lastQuotationNumber,description:project.name,status:t('Quotation'),date:project.updatedAt});
      (Array.isArray(project.meta.orders)?project.meta.orders:[]).forEach(order=>rows.push({type:'order',symbol:'✓',title:order.orderNumber||t('Order'),description:project.name,status:t(order.status==='sent'?'Sent':'Draft'),date:order.updatedAt||order.createdAt||project.updatedAt}));
    });
    (Array.isArray(customer.history)?customer.history:[]).forEach((item,index)=>{
      const source=item&&typeof item==='object'?item:{};
      rows.push({type:text(source.type)||'project',symbol:'•',title:text(source.title||source.name)||`${t('Record')} ${index+1}`,description:text(source.description),status:text(source.status),date:source.date||source.createdAt||customer.updatedAt});
    });
    return rows.sort((left,right)=>String(right.date||'').localeCompare(String(left.date||'')));
  }
  function renderProfile(customer){
    const stats=customerStats(customer);
    const rows=activityRows(customer,stats);
    $('#customerWelcome').hidden=true;
    $('#customerPanel').hidden=false;
    setText('#customerAvatar',initials(customer.companyName));
    setText('#customerName',customer.companyName);
    setText('#customerSubtitle',customer.contact||customer.taxNo||t('Company details need completion'));
    value('#viewContact',customer.contact);value('#viewPhone',customer.phone);value('#viewEmail',customer.email);
    value('#viewTaxOffice',customer.taxOffice);value('#viewTaxNo',customer.taxNo);value('#viewAddress',customer.address);
    setText('#profileProjectCount',stats.projects.length);setText('#profileQuotationCount',stats.quotations.length);setText('#profileOrderCount',stats.orders.length);
    setText('#profileLastActivity',date(stats.lastActivity,true));
    setText('#activityCount',`${rows.length} ${t(rows.length===1?'record':'records')}`);
    $('#history').innerHTML=rows.length?rows.map(row=>`<div class="activity-item"><span class="activity-symbol ${esc(row.type)}">${esc(row.symbol)}</span><span class="activity-copy"><b>${esc(row.title)}</b><span>${esc(row.description||t('No description'))}</span></span><span class="activity-meta"><b>${esc(row.status||t('Record'))}</b><span>${esc(date(row.date))}</span></span></div>`).join(''):`<div class="activity-empty">${esc(t('No linked quotations or orders yet.'))}</div>`;
  }
  function render(){
    renderSummary();renderList();
    const customer=active&&store.get(active);
    if(customer)renderProfile(customer);
    else{$('#customerPanel').hidden=true;$('#customerWelcome').hidden=false}
  }
  function openProfile(customerId){
    const customer=store.get(customerId);
    if(!customer)return;
    active=customer.id;render();
  }

  function clearStatus(){const element=$('#customerSaveStatus');element.textContent='';element.className=''}
  function status(message,ok=true){
    const element=$('#customerSaveStatus');
    element.textContent=t(message);element.className=ok?'is-success':'is-error';
  }
  function fillEditor(customer={}){fields.forEach(field=>{$(`#${field}`).value=customer[field]||''})}
  function showEditor(mode){
    editorMode=mode;
    const customer=mode==='edit'?store.get(active):null;
    if(mode==='edit'&&!customer)return;
    fillEditor(customer||{});clearStatus();
    setText('#customerEditorTitle',t(mode==='edit'?'Edit Customer':'New Customer'));
    $('#customerEditor').hidden=false;
    document.body.style.overflow='hidden';
    $('#companyName').focus();
  }
  function closeEditor(){
    $('#customerEditor').hidden=true;
    document.body.style.overflow='';clearStatus();
  }
  function formData(){return Object.fromEntries(fields.map(field=>[field,text($(`#${field}`).value)]))}
  function save(){
    try{
      const data=formData();
      if(!data.companyName){status('Company name is required.',false);$('#companyName').focus();return}
      const current=editorMode==='edit'?store.get(active):null;
      const saved=store.upsert({...current,...data,id:current?.id});
      active=saved.id;closeEditor();render();
    }catch(error){console.error('Customer save failed',error);status('Save failed.',false)}
  }
  function cloudStatus(event){
    const state=event?.detail||store.cloudState?.()||{};
    const element=$('#customerStorageStatus');
    if(!element)return;
    element.textContent=t(state.message||'Browser only — sign in to sync.');
    element.dataset.state=state.state||'local';
  }

  $('#customerSearch')?.addEventListener('input',renderList);
  $('#saveCustomer')?.addEventListener('click',save);
  $('#newCustomer')?.addEventListener('click',()=>showEditor('new'));
  $('#editCustomer')?.addEventListener('click',()=>showEditor('edit'));
  $('#closeCustomerEditor')?.addEventListener('click',closeEditor);
  $('#cancelCustomerEditor')?.addEventListener('click',closeEditor);
  $('#customerEditor')?.addEventListener('click',event=>{if(event.target===$('#customerEditor'))closeEditor()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#customerEditor').hidden)closeEditor()});
  window.addEventListener('vensis-customers-updated',()=>{
    if(active&&!store.get(active))active='';
    if(!active&&store.list()[0])active=store.list()[0].id;
    render();
  });
  window.addEventListener('vensis-projects-updated',render);
  window.addEventListener('vensis-project-cloud-applied',render);
  window.addEventListener('vensis-customer-cloud-status',cloudStatus);
  window.addEventListener('vensis-language-changed',render);

  if(store.list()[0])active=store.list()[0].id;
  render();cloudStatus();
})();
