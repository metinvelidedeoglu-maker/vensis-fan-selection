(function(){
  const store=window.VensisCustomers;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let active=null;

  function filtered(){
    const q=($('#customerSearch')?.value||'').trim().toLocaleLowerCase('tr-TR');
    return store.list().filter(c=>!q||[c.companyName,c.taxNo,c.contact,c.phone,c.email].some(v=>String(v||'').toLocaleLowerCase('tr-TR').includes(q)));
  }

  function ensureStatus(){
    let el=$('#customerSaveStatus');
    if(!el){
      el=document.createElement('span');
      el.id='customerSaveStatus';
      el.style.marginLeft='10px';
      el.style.fontWeight='700';
      el.style.fontSize='13px';
      $('#saveCustomer')?.insertAdjacentElement('afterend',el);
    }
    return el;
  }

  function status(message,ok=true){
    const el=ensureStatus();
    if(!el)return;
    el.textContent=message;
    el.style.color=ok?'#087f4f':'#b8322c';
    clearTimeout(status.timer);
    status.timer=setTimeout(()=>{el.textContent='';},2500);
  }

  function render(){
    const list=filtered();
    $('#customerCount').textContent=store.list().length;
    $('#customerShown').textContent=list.length;
    $('#customerList').innerHTML=list.map(c=>`<button class="customer-row" data-id="${esc(c.id)}"><b>${esc(c.companyName)}</b><span>${esc(c.contact||c.taxNo||'Bilgi eklenmedi')}</span></button>`).join('');
    document.querySelectorAll('.customer-row').forEach(b=>b.onclick=()=>open(b.dataset.id));
  }

  function open(id){
    active=id;
    const c=store.get(id);
    if(!c)return;
    $('#customerPanel').hidden=false;
    $('#companyName').value=c.companyName||'';
    $('#taxOffice').value=c.taxOffice||'';
    $('#taxNo').value=c.taxNo||'';
    $('#contact').value=c.contact||'';
    $('#phone').value=c.phone||'';
    $('#email').value=c.email||'';
    $('#address').value=c.address||'';
    const projects=(window.VensisProjects?.list?.()||[]).filter(p=>{
      const m=window.VensisProjects.readMeta?.(p.id)||{};
      return (m.reference||p.reference||'')===c.companyName;
    });
    $('#history').innerHTML=projects.length?projects.map(p=>`<div class="history-item"><b>${esc((window.VensisProjects.readMeta?.(p.id)||{}).name||p.name||'Proje')}</b><span>${esc((window.VensisProjects.readMeta?.(p.id)||{}).status||'draft')}</span></div>`).join(''):'<div class="history-empty">Henüz bağlı teklif veya sipariş yok.</div>';
  }

  function formData(){
    return {
      companyName:$('#companyName').value.trim(),
      taxOffice:$('#taxOffice').value.trim(),
      taxNo:$('#taxNo').value.trim(),
      contact:$('#contact').value.trim(),
      phone:$('#phone').value.trim(),
      email:$('#email').value.trim(),
      address:$('#address').value.trim()
    };
  }

  function save(){
    try{
      const data=formData();
      if(!data.companyName){
        status('Firma adı gerekli.',false);
        $('#companyName').focus();
        return;
      }
      let current=active?store.get(active):null;
      const saved=store.upsert({...current,...data,id:current?.id});
      active=saved.id;
      render();
      open(active);
      status('Kaydedildi');
    }catch(err){
      console.error('Customer save failed',err);
      status('Kayıt başarısız.',false);
    }
  }

  function add(){
    try{
      const c=store.upsert({companyName:'Yeni Müşteri'});
      active=c.id;
      render();
      open(c.id);
      $('#companyName').focus();
      $('#companyName').select();
      status('Yeni müşteri kartı açıldı');
    }catch(err){
      console.error('Customer create failed',err);
      status('Yeni müşteri oluşturulamadı.',false);
    }
  }

  $('#customerSearch')?.addEventListener('input',render);
  $('#saveCustomer')?.addEventListener('click',save);
  $('#newCustomer')?.addEventListener('click',add);
  render();
  if(store.list()[0])open(store.list()[0].id);
})();