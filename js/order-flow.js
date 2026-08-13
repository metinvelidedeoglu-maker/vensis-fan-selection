(function(){
  const store=window.VensisProjects;
  const orders=window.VensisOrders;
  const utils=window.VensisOrderUtils;
  if(!store||!orders||!utils)return;

  function openWindow(projectId,order){window.open(orders.url(projectId,order.id),'_blank')}
  function currentQuotation(){
    try{return JSON.parse(localStorage.getItem('vensis_active_quotation_v1')||'null')}catch{return null}
  }
  function createFromProject(){
    window.VensisProject?.flushAllNotes?.();
    window.VensisProjectContact?.save?.();
    const projectId=window.VensisProject?.projectId||store.activeId();
    const items=store.readItems(projectId);
    if(!items.length){alert('Sipariş formu oluşturmak için projede en az bir ürün olmalıdır.');return}
    const quotation=currentQuotation();
    const meta=store.readMeta(projectId);
    const usableQuotation=quotation?.project?.id===projectId
      ? quotation
      : meta.lastQuotationNumber?{quotationNumber:meta.lastQuotationNumber,items}:null;
    const order=orders.createOrReuse(projectId,{quotation:usableQuotation,items:usableQuotation?.items||items});
    openWindow(projectId,order);
    renderProjectStatus();
  }
  function createFromQuotation(){
    const quotation=currentQuotation();
    const projectId=quotation?.project?.id;
    if(!quotation||!projectId||!store.get(projectId)){alert('Siparişe dönüştürülecek proje bulunamadı.');return}
    if(!Array.isArray(quotation.items)||!quotation.items.length){alert('Siparişe dönüştürülecek ürün bulunamadı.');return}
    const order=orders.createOrReuse(projectId,{quotation,items:quotation.items});
    openWindow(projectId,order);
  }
  function renderProjectStatus(){
    const badge=document.getElementById('projectStatusBadge');
    const projectId=window.VensisProject?.projectId||store.activeId();
    if(!badge||!projectId)return;
    const status=store.readMeta(projectId).status;
    badge.textContent=utils.projectStatusLabel(status);
    badge.dataset.status=utils.projectStatus(status);
  }

  document.getElementById('createOrder')?.addEventListener('click',createFromProject);
  document.getElementById('createOrderFromQuotation')?.addEventListener('click',createFromQuotation);
  window.addEventListener('storage',renderProjectStatus);
  window.addEventListener('vensis-project-updated',renderProjectStatus);
  window.addEventListener('vensis-project-cloud-applied',renderProjectStatus);
  renderProjectStatus();
})();
