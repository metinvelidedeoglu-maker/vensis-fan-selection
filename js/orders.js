(function(){
  const store=window.VensisProjects;
  const U=window.VensisOrderUtils;
  if(!store||!U)return;

  function list(projectId=store.activeId()){
    return (store.readMeta(projectId).orders||[]).map(U.normalizeOrder).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
  function find(projectId,orderId){return list(projectId).find(order=>order.id===String(orderId||''))||null}
  function projectSnapshot(projectId){
    const entry=store.get(projectId)||{};
    const meta=store.readMeta(projectId);
    return {id:projectId,name:meta.name||entry.name||'',reference:meta.reference||entry.reference||'',contact:meta.contact||entry.contact||''};
  }
  function writeOrders(projectId,orders,status){
    return store.writeMeta({orders:orders.map(U.normalizeOrder),status:status||store.readMeta(projectId).status},projectId);
  }
  function create(projectId,options={}){
    const existing=list(projectId);
    const order=U.createOrder({
      project:projectSnapshot(projectId),
      items:options.items||store.readItems(projectId),
      quotation:options.quotation||null,
      existingOrders:existing,
      now:options.now
    });
    const currentStatus=store.readMeta(projectId).status;
    writeOrders(projectId,[order,...existing],currentStatus);
    return order;
  }
  function createOrReuse(projectId,options={}){
    const quotationNumber=String(options.quotation?.quotationNumber||'').trim();
    const existing=list(projectId);
    const matching=quotationNumber
      ? existing.find(order=>order.sourceQuotationNumber===quotationNumber)
      : existing.find(order=>order.status==='draft')||existing[0];
    return matching||create(projectId,options);
  }
  function update(projectId,orderId,patch={}){
    const orders=list(projectId);
    const index=orders.findIndex(order=>order.id===String(orderId||''));
    if(index<0)return null;
    orders[index]=U.normalizeOrder({...orders[index],...patch,id:orders[index].id,updatedAt:new Date().toISOString()});
    const projectStatus=orders[index].status==='sent'?'ordered':store.readMeta(projectId).status;
    writeOrders(projectId,orders,projectStatus);
    return orders[index];
  }
  function markSent(projectId,orderId,patch={}){
    const now=new Date().toISOString();
    return update(projectId,orderId,{...patch,status:'sent',sentAt:now,updatedAt:now});
  }
  function url(projectId,orderId){
    const query=new URLSearchParams({project:projectId});
    if(orderId)query.set('order',orderId);
    return `order.html?${query.toString()}`;
  }
  function open(projectId,orderId){location.assign(url(projectId,orderId))}

  window.VensisOrders={list,find,create,createOrReuse,update,markSent,url,open};
})();
