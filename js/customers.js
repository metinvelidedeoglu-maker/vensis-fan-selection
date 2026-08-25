(function(){
  'use strict';

  const store=window.VensisCustomers;
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const t=value=>window.VensisI18n?.t?.(value)||value;
  let active='';

  function filtered(){
    const query=($('#customerSearch')?.value||'').trim().toLocaleLowerCase('tr-TR');
    return store.list().filter(customer=>!query||[customer.companyName,customer.taxNo,customer.contact,customer.phone,customer.email]
      .some(value=>String(value||'').toLocaleLowerCase('tr-TR').includes(query)));
  }
  function ensureStatus(){
    let element=$('#customerSaveStatus');
    if(!element){
      element=document.createElement('span');
      element.id='customerSaveStatus';
      $('#saveCustomer')?.insertAdjacentElement('afterend',element);
    }
    return element;
  }
  function status(message,ok=true){
    const element=ensureStatus();
    if(!element)return;
    element.textContent=t(message);
    element.className=ok?'is-success':'is-error';
    clearTimeout(status.timer);
    status.timer=setTimeout(()=>{element.textContent=''},2500);
  }
  function render(){
    const rows=filtered();
    const all=store.list();
    $('#customerCount').textContent=all.length;
    $('#customerShown').textContent=rows.length;
    $('#customerList').innerHTML=rows.length
      ? rows.map(customer=>`<button class="customer-row" data-id="${esc(customer.id)}"><b>${esc(customer.companyName)}</b><span>${esc(customer.contact||customer.taxNo||t('Not provided'))}</span></button>`).join('')
      : `<div class="customer-empty"><b>${esc(t('No customers in this browser yet'))}</b><span>${esc(t('Sign in to restore cloud customers, or add a new customer locally.'))}</span></div>`;
    document.querySelectorAll('.customer-row').forEach(button=>button.addEventListener('click',()=>open(button.dataset.id)));
  }
  function open(customerId){
    const customer=store.get(customerId);
    if(!customer)return;
    active=customerId;
    $('#customerPanel').hidden=false;
    ['companyName','taxOffice','taxNo','contact','phone','email','address'].forEach(field=>{$(`#${field}`).value=customer[field]||''});
    const projects=(window.VensisProjects?.list?.()||[]).filter(project=>{
      const meta=window.VensisProjects.readMeta?.(project.id)||{};
      return (meta.reference||project.reference||'')===customer.companyName;
    });
    $('#history').innerHTML=projects.length
      ? projects.map(project=>`<div class="history-item"><b>${esc((window.VensisProjects.readMeta?.(project.id)||{}).name||project.name||t('Project'))}</b><span>${esc((window.VensisProjects.readMeta?.(project.id)||{}).status||'draft')}</span></div>`).join('')
      : `<div class="history-empty">${esc(t('No linked quotations or orders yet.'))}</div>`;
  }
  function formData(){
    return Object.fromEntries(['companyName','taxOffice','taxNo','contact','phone','email','address'].map(field=>[field,$(`#${field}`).value.trim()]));
  }
  function save(){
    try{
      const data=formData();
      if(!data.companyName){status('Company name is required.',false);$('#companyName').focus();return}
      const current=active?store.get(active):null;
      const saved=store.upsert({...current,...data,id:current?.id});
      active=saved.id;
      render();open(active);status('Saved');
    }catch(error){console.error('Customer save failed',error);status('Save failed.',false)}
  }
  function add(){
    try{
      const customer=store.upsert({companyName:'New Customer'});
      active=customer.id;
      render();open(customer.id);
      $('#companyName').focus();$('#companyName').select();
      status('New customer card opened.');
    }catch(error){console.error('Customer create failed',error);status('Customer could not be created.',false)}
  }
  function cloudStatus(event){
    const state=event?.detail||store.cloudState?.()||{};
    const element=$('#customerStorageStatus');
    if(!element)return;
    element.textContent=t(state.message||'Browser only — sign in to sync.');
    element.dataset.state=state.state||'local';
  }

  $('#customerSearch')?.addEventListener('input',render);
  $('#saveCustomer')?.addEventListener('click',save);
  $('#newCustomer')?.addEventListener('click',add);
  window.addEventListener('vensis-customers-updated',()=>{
    render();
    if(active&&store.get(active))open(active);
    else if(store.list()[0])open(store.list()[0].id);
  });
  window.addEventListener('vensis-customer-cloud-status',cloudStatus);
  render();
  cloudStatus();
  if(store.list()[0])open(store.list()[0].id);
})();
