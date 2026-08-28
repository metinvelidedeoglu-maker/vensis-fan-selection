(function(){
  'use strict';

  const GUEST_KEY='vensis_guest_custom_product_library_v1';
  const API='api/custom-products';
  let products=[];
  let csrf='';
  let editingId='';
  let existingImage='';

  const byId=id=>document.getElementById(id);
  const num=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,num(value)));
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  const value=id=>String(byId(id)?.value||'').trim();
  const setValue=(id,next)=>{const field=byId(id);if(field)field.value=next??''};
  const secureMode=()=>((window.VensisAccess?.mode?.()||window.VENSIS_ACCESS_BOOT_MODE)==='secure');

  const i18n={
    en:{customProducts:'Custom Products',home:'Home',catalog:'Product Catalog',projects:'Projects',customers:'Customers',libraryKicker:'PRODUCT LIBRARY',title:'Custom Product Library',intro:'Enter products once here. Later, while preparing a project or quotation, add them directly from the saved library instead of typing them again.',entryKicker:'MANUAL ENTRY',newProduct:'New Product',editProduct:'Edit Product',entryHelp:'This record is saved to the common custom-product library, not to a specific project.',productType:'Product Type',chooseType:'Choose type',fan:'Fan',electrical:'Electrical',model:'Model / Product Name',series:'Series / Type',manufacturer:'Manufacturer / Brand',description:'Technical Description',voltage:'Voltage',price:'List Price (€)',discount:'Default Discount (%)',quantity:'Default Quantity',chooseFirst:'Choose a product type first.',fanNote:'Enter fan performance and motor data.',electricalNote:'Enter electrical product power, lumen and IP data.',airflow:'Nominal Airflow (m³/h)',frequency:'Frequency',motorPower:'Motor Power (kW)',speed:'Speed (rpm)',current:'Current (A)',noise:'Noise dB(A)',power:'Power',lumen:'Lumen',ip:'IP Class',imageUrl:'Image URL (optional)',imageFile:'Upload Image (optional)',clear:'Clear',saveLibrary:'Save to Library',updateLibrary:'Update Library Record',savedKicker:'SAVED PRODUCTS',savedProducts:'Saved Custom Products',savedHelp:'These products can be selected later from a project and added with one click.',searchPlaceholder:'Search brand, model or description',allTypes:'All Types',refresh:'Refresh',workflow:'Workflow:',workflowText:'Erman can enter the product here today. When a quotation is needed, open the project and choose “Add from Library”.',secure:'Shared encrypted library',guest:'Guest: this browser only',loading:'Loading library…',loaded:n=>`${n} saved custom product${n===1?'':'s'}`,emptyTitle:'No saved custom products yet',emptyText:'Use the form on the left to create the first record.',edit:'Edit',delete:'Delete',confirmDelete:'Delete this saved product?',saved:'Product saved to the library.',updated:'Library record updated.',deleted:'Product deleted.',saveError:'Product could not be saved.',loadError:'Library could not be loaded.',deleteError:'Product could not be deleted.',authError:'Secure session was not found. Please sign in again.',imageError:'The selected image could not be prepared.'},
    tr:{customProducts:'Özel Ürünler',home:'Ana Sayfa',catalog:'Ürün Kataloğu',projects:'Projeler',customers:'Müşteriler',libraryKicker:'ÜRÜN KÜTÜPHANESİ',title:'Özel Ürün Kütüphanesi',intro:'Ürünleri burada bir kez elle tanımlayın. Daha sonra proje veya teklif hazırlarken yeniden yazmak yerine kayıtlı kütüphaneden doğrudan ekleyin.',entryKicker:'MANUEL ÜRÜN GİRİŞİ',newProduct:'Yeni Ürün',editProduct:'Ürünü Düzenle',entryHelp:'Bu kayıt belirli bir projeye değil, ortak özel ürün kütüphanesine kaydedilir.',productType:'Ürün Tipi',chooseType:'Ürün tipi seçin',fan:'Fan',electrical:'Elektrik',model:'Model / Ürün Adı',series:'Seri / Tip',manufacturer:'Üretici / Marka',description:'Teknik Açıklama',voltage:'Voltaj',price:'Liste Fiyatı (€)',discount:'Varsayılan İskonto (%)',quantity:'Varsayılan Adet',chooseFirst:'Önce ürün tipini seçin.',fanNote:'Fan için debi ve motor bilgilerini girin.',electricalNote:'Elektrik ürünü için güç, lümen ve IP bilgilerini girin.',airflow:'Nominal Debi (m³/h)',frequency:'Frekans',motorPower:'Motor Gücü (kW)',speed:'Devir (rpm)',current:'Akım (A)',noise:'Ses dB(A)',power:'Güç',lumen:'Lümen',ip:'IP Sınıfı',imageUrl:'Görsel URL (opsiyonel)',imageFile:'Görsel Yükle (opsiyonel)',clear:'Temizle',saveLibrary:'Kütüphaneye Kaydet',updateLibrary:'Kütüphane Kaydını Güncelle',savedKicker:'KAYITLI ÜRÜNLER',savedProducts:'Kayıtlı Özel Ürünler',savedHelp:'Bu ürünler daha sonra proje içinden seçilip tek tıkla eklenebilir.',searchPlaceholder:'Marka, model veya açıklama ara',allTypes:'Tüm Tipler',refresh:'Yenile',workflow:'Akış:',workflowText:'Erman ürünü bugün burada girsin. Teklif gerektiğinde projeyi açıp “Kütüphaneden Ekle” seçilsin.',secure:'Şifreli ortak kütüphane',guest:'Misafir: yalnız bu tarayıcı',loading:'Kütüphane yükleniyor…',loaded:n=>`${n} kayıtlı özel ürün`,emptyTitle:'Henüz kayıtlı özel ürün yok',emptyText:'İlk kaydı oluşturmak için soldaki formu kullanın.',edit:'Düzenle',delete:'Sil',confirmDelete:'Bu kayıtlı ürün silinsin mi?',saved:'Ürün kütüphaneye kaydedildi.',updated:'Kütüphane kaydı güncellendi.',deleted:'Ürün silindi.',saveError:'Ürün kaydedilemedi.',loadError:'Kütüphane yüklenemedi.',deleteError:'Ürün silinemedi.',authError:'Şifreli oturum bulunamadı. Yeniden giriş yapın.',imageError:'Seçilen görsel hazırlanamadı.'}
  };

  function lang(){return window.VensisI18n?.getLanguage?.()||(()=>{try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}})()}
  function t(key,...args){const item=i18n[lang()]?.[key]??i18n.en[key]??key;return typeof item==='function'?item(...args):item}
  function applyLanguage(){
    document.querySelectorAll('[data-i18n]').forEach(node=>{const key=node.dataset.i18n;if(i18n[lang()]?.[key]!==undefined)node.textContent=t(key)});
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node=>{node.placeholder=t(node.dataset.i18nPlaceholder)});
    byId('storageBadge').textContent=secureMode()?t('secure'):t('guest');
    byId('formTitle').textContent=editingId?t('editProduct'):t('newProduct');
    byId('saveProduct').textContent=editingId?t('updateLibrary'):t('saveLibrary');
    syncType();render();
  }

  function status(message='',error=false){const node=byId('status');if(!node)return;node.textContent=message;node.classList.toggle('error',Boolean(error))}
  function readGuest(){try{const rows=JSON.parse(localStorage.getItem(GUEST_KEY)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}}
  function writeGuest(rows){localStorage.setItem(GUEST_KEY,JSON.stringify(rows.slice(0,1000)))}

  async function secureSession(){
    const response=await fetch('api/edit/session.php',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.authenticated||!payload.csrf)throw new Error(t('authError'));
    csrf=String(payload.csrf);return csrf;
  }
  async function apiRequest(path,options={}){
    const headers={Accept:'application/json'};
    if(options.body!==undefined)headers['Content-Type']='application/json';
    if(options.csrf){if(!csrf)await secureSession();headers['X-CSRF-Token']=csrf}
    let response=await fetch(`${API}/${path}`,{method:options.method||'GET',credentials:'same-origin',cache:'no-store',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});
    if((response.status===401||response.status===403)&&options.csrf){csrf='';await secureSession();headers['X-CSRF-Token']=csrf;response=await fetch(`${API}/${path}`,{method:options.method||'GET',credentials:'same-origin',cache:'no-store',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)})}
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||payload.ok===false)throw new Error(payload.error||'Request failed.');
    return payload;
  }
  async function loadLibrary(){if(secureMode()){const payload=await apiRequest('list.php');return Array.isArray(payload.products)?payload.products:[]}return readGuest()}
  async function saveRecord(record){
    if(secureMode()){await apiRequest('save.php',{method:'POST',csrf:true,body:{product:record}});return}
    const rows=readGuest();const index=rows.findIndex(item=>item.id===record.id);if(index>=0)rows[index]=record;else rows.push(record);writeGuest(rows);
  }
  async function deleteRecord(id){
    if(secureMode()){await apiRequest('delete.php',{method:'POST',csrf:true,body:{id}});return}
    writeGuest(readGuest().filter(item=>item.id!==id));
  }

  function makeId(){if(window.crypto?.randomUUID)return 'cp_'+crypto.randomUUID().replace(/-/g,'');return 'cp_'+Date.now().toString(36)+Math.random().toString(36).slice(2,12)}
  function currentType(){return value('productType')}
  function syncType(){
    const type=currentType();
    document.querySelectorAll('[data-fan]').forEach(node=>node.hidden=type!=='fan');
    document.querySelectorAll('[data-electrical]').forEach(node=>node.hidden=type!=='electrical');
    byId('typeNote').textContent=type==='fan'?t('fanNote'):type==='electrical'?t('electricalNote'):t('chooseFirst');
  }

  function preview(src){const wrap=byId('imagePreview'),img=wrap?.querySelector('img');if(!wrap||!img)return;if(src){img.src=src;wrap.style.display='block'}else{img.removeAttribute('src');wrap.style.display='none'}}
  function resetForm(){editingId='';existingImage='';byId('productForm').reset();setValue('quantity','1');byId('imageFile').value='';preview('');syncType();applyLanguage();setTimeout(()=>byId('productType')?.focus(),0)}

  function populate(item){
    editingId=String(item.id||'');existingImage=String(item.image||'');
    setValue('productType',item.productType||'');setValue('model',item.model||'');setValue('series',item.series||'');setValue('manufacturer',item.manufacturer||'');setValue('description',item.description||'');setValue('voltage',item.voltage||'');setValue('price',num(item.price)||'');setValue('discountPercent',num(item.discountPercent)||'');setValue('quantity',Math.max(1,num(item.quantity)||1));
    setValue('nominalAirflow',num(item.nominalAirflow)||'');setValue('frequency',item.frequency||'');setValue('motorPower',num(item.motorPower)||'');setValue('speed',num(item.speed)||'');setValue('current',num(item.current)||'');setValue('noise',num(item.noise)||'');setValue('power',item.power||'');setValue('lumen',item.lumen||'');setValue('ip',item.ip||'');
    setValue('image',existingImage.startsWith('data:')?'':existingImage);byId('imageFile').value='';preview(existingImage);syncType();applyLanguage();window.scrollTo({top:0,behavior:'smooth'});
  }

  function imageFromFile(file){
    return new Promise((resolve,reject)=>{
      if(!file){resolve('');return}if(!String(file.type||'').startsWith('image/')){reject(new Error(t('imageError')));return}
      const source=URL.createObjectURL(file);const image=new Image();
      image.onload=()=>{try{let maxSide=420,quality=.82,data='';while(maxSide>=80){const scale=Math.min(1,maxSide/Math.max(image.naturalWidth||1,image.naturalHeight||1));const width=Math.max(1,Math.round((image.naturalWidth||1)*scale));const height=Math.max(1,Math.round((image.naturalHeight||1)*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);data=canvas.toDataURL('image/webp',quality);if(data.length<=8500)break;maxSide=Math.floor(maxSide*.8);quality=Math.max(.5,quality-.07)}URL.revokeObjectURL(source);if(!data||data.length>9500)reject(new Error(t('imageError')));else resolve(data)}catch(error){URL.revokeObjectURL(source);reject(error)}};
      image.onerror=()=>{URL.revokeObjectURL(source);reject(new Error(t('imageError')))};image.src=source;
    });
  }
  async function resolvedImage(){const file=byId('imageFile')?.files?.[0];if(file)return imageFromFile(file);const url=value('image');return url||existingImage||''}

  function recordFromForm(image){
    const type=currentType();const now=new Date().toISOString();const old=products.find(item=>item.id===editingId);
    const base={id:editingId||makeId(),productType:type,model:value('model'),series:value('series'),manufacturer:value('manufacturer'),description:value('description'),nominalAirflow:0,voltage:value('voltage'),frequency:'',motorPower:0,speed:0,current:0,noise:0,power:'',lumen:'',ip:'',price:Math.max(0,num(value('price'))),discountPercent:clamp(value('discountPercent'),0,100),quantity:Math.max(1,Math.round(num(value('quantity'))||1)),image,createdAt:old?.createdAt||now,updatedAt:now};
    if(type==='fan')return {...base,nominalAirflow:Math.max(0,num(value('nominalAirflow'))),frequency:value('frequency'),motorPower:Math.max(0,num(value('motorPower'))),speed:Math.max(0,num(value('speed'))),current:Math.max(0,num(value('current'))),noise:Math.max(0,num(value('noise')))};
    return {...base,power:value('power'),lumen:value('lumen'),ip:value('ip')};
  }

  function money(value){const n=num(value);return n>0?`€${n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:''}
  function specs(item){
    const rows=[];if(item.voltage)rows.push(item.voltage);if(item.productType==='fan'){if(num(item.nominalAirflow)>0)rows.push(`${num(item.nominalAirflow).toLocaleString('tr-TR')} m³/h`);if(num(item.motorPower)>0)rows.push(`${num(item.motorPower)} kW`);if(num(item.speed)>0)rows.push(`${num(item.speed)} rpm`)}else{if(item.power)rows.push(item.power);if(item.lumen)rows.push(item.lumen);if(item.ip)rows.push(item.ip)}if(num(item.price)>0)rows.push(money(item.price));return rows.slice(0,6)
  }
  function filtered(){const q=value('search').toLocaleLowerCase('tr-TR');const type=value('filterType');return products.filter(item=>(!type||item.productType===type)&&(!q||[item.model,item.series,item.manufacturer,item.description].some(text=>String(text||'').toLocaleLowerCase('tr-TR').includes(q))))}
  function render(){
    const box=byId('library');if(!box)return;const rows=filtered();
    if(!rows.length){box.innerHTML=`<div class="empty"><b>${esc(t('emptyTitle'))}</b><span>${esc(t('emptyText'))}</span></div>`;return}
    box.innerHTML=rows.map(item=>`<article class="card">${item.image?`<img src="${esc(item.image)}" alt="${esc(item.model)}" onerror="this.outerHTML='<div class=&quot;no-image&quot;>NO IMAGE</div>'">`:'<div class="no-image">NO IMAGE</div>'}<div><h3>${esc(item.model||'-')}</h3><div class="meta">${esc([item.manufacturer,item.series].filter(Boolean).join(' · '))}</div><span class="type">${esc(item.productType==='electrical'?t('electrical'):t('fan'))}</span>${item.description?`<div class="desc">${esc(item.description)}</div>`:''}<div class="specs">${specs(item).map(spec=>`<span>${esc(spec)}</span>`).join('')}</div></div><div class="card-actions"><button class="edit" type="button" data-edit="${esc(item.id)}">${esc(t('edit'))}</button><button class="delete" type="button" data-delete="${esc(item.id)}">${esc(t('delete'))}</button></div></article>`).join('');
  }

  async function refresh(message=true){status(t('loading'));try{products=await loadLibrary();products.sort((a,b)=>String(a.manufacturer||'').localeCompare(String(b.manufacturer||''),'tr')||String(a.model||'').localeCompare(String(b.model||''),'tr'));status(t('loaded',products.length));render();if(message)applyLanguage()}catch(error){products=[];status(error.message||t('loadError'),true);render()}}
  async function submit(event){
    event.preventDefault();const type=currentType();if(type!=='fan'&&type!=='electrical'){byId('productType').focus();return}if(!value('model')){byId('model').focus();return}
    const button=byId('saveProduct');button.disabled=true;try{const image=await resolvedImage();const wasEdit=Boolean(editingId);const record=recordFromForm(image);await saveRecord(record);await refresh(false);status(wasEdit?t('updated'):t('saved'));resetForm()}catch(error){status(error.message||t('saveError'),true)}finally{button.disabled=false;applyLanguage()}
  }
  async function remove(id){if(!confirm(t('confirmDelete')))return;try{await deleteRecord(id);if(editingId===id)resetForm();await refresh(false);status(t('deleted'))}catch(error){status(error.message||t('deleteError'),true)}}

  function bind(){
    byId('productType').addEventListener('change',syncType);byId('clearForm').addEventListener('click',resetForm);byId('productForm').addEventListener('submit',submit);byId('search').addEventListener('input',render);byId('filterType').addEventListener('change',render);byId('refresh').addEventListener('click',()=>refresh());
    byId('imageFile').addEventListener('change',event=>{const file=event.target.files?.[0];if(!file){preview(existingImage);return}const url=URL.createObjectURL(file);preview(url);setTimeout(()=>URL.revokeObjectURL(url),3000)});
    byId('library').addEventListener('click',event=>{const edit=event.target.closest('[data-edit]');const del=event.target.closest('[data-delete]');if(edit){const item=products.find(row=>row.id===edit.dataset.edit);if(item)populate(item)}if(del)remove(del.dataset.delete)});
    window.addEventListener('vensis-language-changed',applyLanguage);
  }

  function init(){bind();resetForm();applyLanguage();refresh(false)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
