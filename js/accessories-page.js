(function(){
  'use strict';

  const store=window.VensisProjects;
  const core=window.VensisAccessoryCore;
  const catalog=window.VensisAccessoriesCatalog||{items:[]};
  const params=new URLSearchParams(location.search);
  const projectId=params.get('project')||store?.activeId?.()||'';
  const parentItemKey=params.get('parent')||'';
  const browseMode=!parentItemKey;
  const byId=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const money=value=>`€${new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0)}`;
  const canQuote=item=>item?.quoteEnabled!==false&&typeof item?.price==='number'&&Number.isFinite(item.price)&&item.price>0;
  let activeCategory='Tümü';

  function projectItems(){return store?.readItems?.(projectId)||[]}
  function parentItem(){return projectItems().find(item=>String(item?.itemKey||'')===String(parentItemKey)&&!core?.isAccessory?.(item))||null}
  function validTarget(){return Boolean(projectId&&store?.get?.(projectId)&&parentItem())}

  function setupTarget(){
    const back=byId('backToProject');
    if(back){
      back.href=browseMode
        ?'catalog-hub.html'+(projectId?'?project='+encodeURIComponent(projectId):'')
        :(projectId?`project.html?project=${encodeURIComponent(projectId)}`:'project.html');
      back.textContent=browseMode?'← Ürün Kataloğuna Dön':'← Projeye Dön';
    }
    byId('accessoryHero')?.classList.toggle('browse',browseMode);
    const intro=byId('accessoryIntro');
    if(intro)intro.textContent=browseMode
      ?'Havalandırma sistemlerine yönelik aksesuarları, mevcut teknik bilgileri ve fiyatlarıyla inceleyin. Projeye eklemek için ilgili fan satırındaki “Aksesuar Ekle” düğmesini kullanın.'
      :'Projeye eklenecek havalandırma aksesuarını seçin. Uygunluk eşleştirmesi bu aşamada otomatik yapılmaz; seçilen aksesuar, geldiğiniz fan satırının altında saklanır.';
    const box=byId('accessoryTarget');
    if(!box)return;
    box.hidden=browseMode;
    if(browseMode)return;
    const parent=parentItem();
    if(!parent){
      box.innerHTML='<span>Bağlanacağı ürün</span><b>Fan seçilmedi</b><small>Proje ekranına dönüp ilgili fan satırındaki “Aksesuar Ekle” düğmesini kullanın.</small>';
      return;
    }
    box.innerHTML=`<span>Bağlanacağı ürün</span><b>${esc(parent.model||'-')}</b><small>${esc(parent.series||'')} ${parent.manufacturer?`• ${esc(parent.manufacturer)}`:''}</small>`;
  }

  function categories(){
    const unique=[...new Set((catalog.items||[]).map(item=>String(item.category||'Aksesuar')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
    return ['Tümü',...unique];
  }

  function renderCategories(){
    const root=byId('accessoryCategories');if(!root)return;
    root.innerHTML=categories().map(name=>`<button type="button" data-accessory-category="${esc(name)}" class="${name===activeCategory?'active':''}">${esc(name)}</button>`).join('');
  }

  function filteredItems(){
    const query=String(byId('accessorySearch')?.value||'').trim().toLocaleLowerCase('tr-TR');
    return (catalog.items||[]).filter(item=>{
      if(activeCategory!=='Tümü'&&String(item.category)!==activeCategory)return false;
      if(!query)return true;
      const haystack=[item.model,item.category,item.manufacturer,item.specs].join(' ').toLocaleLowerCase('tr-TR');
      return haystack.includes(query);
    });
  }

  function render(){
    renderCategories();
    const grid=byId('accessoryGrid');if(!grid)return;
    const rows=filteredItems();
    const enabled=validTarget();
    if(!rows.length){grid.innerHTML='<div class="empty">Aramanıza uygun aksesuar bulunamadı.</div>';return}
    grid.innerHTML=rows.map(item=>`<article class="card" data-accessory-id="${esc(item.id)}"><div class="card-head"><b class="price">${canQuote(item)?money(item.price):'Fiyat / teknik teyit bekleniyor'}</b></div><h2>${esc(item.model)}</h2><div class="category">${esc(item.category)}</div><p class="specs">${esc(item.specs||'')}</p><div class="meta">${esc(item.manufacturer||'')}${item.sourceNote?` • ${esc(item.sourceNote)}`:` • Katalog s. ${esc(item.sourcePage||'-')}`}</div>${browseMode?'':`<button class="add" type="button" data-add-accessory="${esc(item.id)}" ${enabled&&canQuote(item)?'':'disabled'}>${canQuote(item)?'+ Projeye Ekle':'Teklif için teyit gerekli'}</button>`}</article>`).join('');
  }

  function addAccessory(id){
    if(browseMode||!validTarget()||!core||!store)return;
    const accessory=(catalog.items||[]).find(item=>String(item.id)===String(id));if(!accessory||!canQuote(accessory))return;
    const items=projectItems();
    const meta=store.readMeta?.(projectId)||{};
    const inserted=core.insertAccessory(items,parentItemKey,accessory,{discountPercent:Number(meta.globalDiscount)||0,quantity:1});
    if(!inserted.item)return;
    store.writeItems(inserted.items,projectId);
    location.replace(`project.html?project=${encodeURIComponent(projectId)}`);
  }

  function start(){
    setupTarget();render();
    byId('accessorySearch')?.addEventListener('input',render);
    document.addEventListener('click',event=>{
      const category=event.target.closest('[data-accessory-category]');
      if(category){activeCategory=category.dataset.accessoryCategory||'Tümü';render();return}
      const add=event.target.closest('[data-add-accessory]');
      if(add){event.preventDefault();addAccessory(add.dataset.addAccessory)}
    });
    window.addEventListener('vensis-projects-updated',()=>{setupTarget();render()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
