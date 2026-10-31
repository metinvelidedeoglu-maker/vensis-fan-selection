(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const copy={
    tr:{back:'← Ürün Kataloğu',saved:'Kayıtlı Ürünler',title:'Özel Ürünler',library:'Ortak Ürün Kütüphanesi',intro:'Kayıtlı özel ürünleri görselleri, teknik açıklamaları ve liste fiyatlarıyla inceleyin.',browse:'Özel ürünleri incele',manage:'Kütüphaneyi yönet',refresh:'Yenile',search:'Marka, model veya açıklama ara',loading:'Ürünler yükleniyor…',login:'Ortak özel ürünleri görmek için şifreli oturum açın.',error:'Özel ürünler yüklenemedi. Yenile ile tekrar deneyin.',empty:'Kayıtlı özel ürün bulunamadı.',noImage:'Görsel yok',details:'Teknik açıklama',fan:'Fan',electrical:'Elektrik',price:'Liste fiyatı',unpriced:'Fiyat belirtilmedi',projectProduct:'Projeye Özel Ürün',project:'Proje',add:'Projeye Ekle',openProject:'Projeyi Aç',remove:'Sil',deleting:'Siliniyor…',confirmDelete:'Bu ürün katalogdan silinsin mi? Kaydedilmiş proje ve teklif satırları korunur.',deleteError:'Ürün silinemedi.',count:(n,total)=>`${n} / ${total} özel ürün`},
    en:{back:'← Product Catalog',saved:'Saved Products',title:'Custom Products',library:'Shared Product Library',intro:'Explore saved custom products with their images, technical descriptions and list prices.',browse:'Browse custom products',manage:'Manage library',refresh:'Refresh',search:'Search brand, model or description',loading:'Loading products…',login:'Sign in to view shared custom products.',error:'Custom products could not be loaded. Use Refresh to try again.',empty:'No saved custom products found.',noImage:'No image',details:'Technical description',fan:'Fan',electrical:'Electrical',price:'List price',unpriced:'Price not specified',projectProduct:'Project-specific Product',project:'Project',add:'Add to Project',openProject:'Open Project',remove:'Delete',deleting:'Deleting…',confirmDelete:'Delete this catalog record? Saved project and quotation lines will be preserved.',deleteError:'Product could not be deleted.',count:(n,total)=>`${n} / ${total} custom products`}
  };
  let products=[],state='loading',requestId=0;
  const lang=()=>window.VensisI18n?.getLanguage?.()||(/^\/tr\//.test(location.pathname)?'tr':document.documentElement.lang==='tr'?'tr':'en');
  const t=(key,...args)=>{const value=(copy[lang()]||copy.en)[key];return typeof value==='function'?value(...args):value};
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const secure=()=>window.VensisAccess?.mode?.()==='secure';
  function imageUrl(value){
    const source=String(value||'').trim();
    if(/^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(source))return source;
    try{const url=new URL(source,location.href);return source&&['https:','http:'].includes(url.protocol)?url.href:''}catch{return ''}
  }
  function render(){
    document.querySelectorAll('[data-custom-copy]').forEach(el=>{el.textContent=t(el.dataset.customCopy)});
    const search=byId('customCatalogSearch');if(!search)return;search.placeholder=t('search');search.setAttribute('aria-label',t('search'));
    const box=byId('customCatalogProducts'),status=byId('customCatalogStatus');
    box.innerHTML='';
    if(state!=='ready'){status.textContent=t(state);return}
    const locale=lang()==='tr'?'tr-TR':'en-GB';
    const query=search.value.trim().toLocaleLowerCase(locale);
    const rows=products.filter(item=>[item.model,item.series,item.manufacturer,item.description,item.projectName].some(value=>String(value||'').toLocaleLowerCase(locale).includes(query)));
    status.textContent=rows.length?t('count',rows.length,products.length):t('empty');
    box.innerHTML=rows.map(item=>{
      const src=imageUrl(item.image),specs=[item.voltage,item.frequency];
      if(item.productType==='fan'){
        if(Number(item.nominalAirflow)>0)specs.push(`${Number(item.nominalAirflow).toLocaleString(locale)} m³/h`);
        if(Number(item.motorPower)>0)specs.push(`${Number(item.motorPower)} kW`);
        if(Number(item.speed)>0)specs.push(`${Number(item.speed)} rpm`);
        if(Number(item.current)>0)specs.push(`${Number(item.current)} A`);
        if(Number(item.noise)>0)specs.push(`${Number(item.noise)} dB(A)`);
      }else specs.push(item.power,item.lumen,item.ip);
      const price=Number(item.price)>0?new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(Number(item.price)):t('unpriced');
      return `<article class="custom-catalog-card">${src?`<img loading="lazy" src="${esc(src)}" alt="${esc(item.model)}">`:`<div class="custom-no-image">${esc(t('noImage'))}</div>`}<h3 translate="no">${esc(item.model)}</h3><div class="custom-meta" translate="no">${esc([item.manufacturer,item.series].filter(Boolean).join(' · '))}</div>${item.scope==='project'?`<div class="custom-project-tag">${esc(t('project'))}: <span translate="no">${esc(item.projectName||item.projectId)}</span></div>`:''}<div class="custom-meta">${esc(t(item.scope==='project'?'projectProduct':item.productType==='fan'?'fan':'electrical'))}</div><div class="custom-specs" translate="no">${specs.filter(Boolean).map(spec=>`<span>${esc(spec)}</span>`).join('')}</div>${item.description?`<details><summary>${esc(t('details'))}</summary><div class="custom-description" translate="no">${esc(item.description)}</div></details>`:''}<strong class="custom-price">${esc(t('price'))}: ${esc(price)}</strong><div class="custom-card-actions">${item.scope==='project'?`<a href="project.html?project=${encodeURIComponent(item.projectId)}">${esc(t('openProject'))}</a>`:`<button type="button" data-custom-add="${esc(item.id)}">${esc(t('add'))}</button>`}<button type="button" class="custom-delete" data-custom-delete="${esc(item.id)}">${esc(t('remove'))}</button></div></article>`;
    }).join('');
  }
  async function refresh(){
    const current=++requestId;
    products=[];state=secure()?'loading':'login';render();
    if(!secure())return;
    try{
      const response=await fetch('api/custom-products/list.php',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(current!==requestId)return;
      if(response.status===401||response.status===403){state='login';render();return}
      if(!response.ok)throw new Error('load');
      const payload=await response.json();
      if(current!==requestId||!secure())return;
      if(payload.ok===false||!Array.isArray(payload.products))throw new Error('load');
      products=payload.products.filter(item=>item&&typeof item==='object').sort((a,b)=>String(a.manufacturer||'').localeCompare(String(b.manufacturer||''),'tr')||String(a.model||'').localeCompare(String(b.model||''),'tr'));
      state='ready';
    }catch{if(current!==requestId)return;state='error'}
    render();
  }
  async function removeProduct(id,button){
    if(!secure()||!products.some(item=>item.id===id)||!confirm(t('confirmDelete')))return;
    button.disabled=true;
    byId('customCatalogStatus').textContent=t('deleting');
    try{
      const sessionResponse=await fetch('api/edit/session.php',{credentials:'same-origin',cache:'no-store'}),session=await sessionResponse.json();
      if(!sessionResponse.ok||!session.authenticated||!session.csrf)throw new Error(t('login'));
      const response=await fetch('api/custom-products/delete.php',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({id})});
      const payload=await response.json();if(!response.ok||payload.ok===false)throw new Error(payload.error||t('deleteError'));
      await refresh();
    }catch(error){button.disabled=false;byId('customCatalogStatus').textContent=error.message||t('deleteError')}
  }
  function addProduct(id,button){
    if(!secure())return;
    const source=products.find(item=>item.id===id);if(!source||source.scope==='project')return;
    const item=window.VensisProjectCustom?.toItem(source);if(!item)return;
    window.VensisCatalogProjectPicker?.openItem(item,button);
  }
  function init(){
    if(!byId('customCatalogProducts')){render();window.addEventListener('vensis-language-changed',render);return}
    byId('customCatalogProducts').addEventListener('click',event=>{
      const remove=event.target.closest('[data-custom-delete]');if(remove){removeProduct(remove.dataset.customDelete,remove);return}
      const add=event.target.closest('[data-custom-add]');if(add)addProduct(add.dataset.customAdd,add);
    });
    byId('customCatalogSearch').addEventListener('input',render);
    byId('customCatalogRefresh').addEventListener('click',refresh);
    window.addEventListener('vensis-language-changed',render);
    window.addEventListener('vensis-edit-session-changed',event=>{
      if(!event.detail?.authenticated){requestId++;products=[];state='login';render()}
    },true);
    new MutationObserver(()=>{
      if(!secure()&&state!=='login'){requestId++;products=[];state='login';render()}
    }).observe(document.body,{attributes:true,attributeFilter:['class']});
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
