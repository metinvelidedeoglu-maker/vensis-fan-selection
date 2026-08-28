(function(){
  'use strict';

  const project=window.VensisProject;
  const form=document.getElementById('customProductForm');
  const modal=document.getElementById('customProductModal');
  const grid=form?.querySelector('.custom-grid');
  if(!project||!form||!modal||!grid)return;

  const byId=id=>document.getElementById(id);
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0};
  const clampDiscount=value=>Math.min(100,Math.max(0,number(value)));
  const value=id=>String(byId(id)?.value||'').trim();
  const setValue=(id,next)=>{const field=byId(id);if(field)field.value=next??''};
  const labelFor=id=>byId(id)?.closest('label')||null;
  const commonIds=['custom-model','custom-series','custom-manufacturer','custom-description','custom-voltage','custom-price','custom-discountPercent','custom-quantity','custom-image'];
  const fanIds=['custom-nominalAirflow','custom-frequency','custom-motorPower','custom-speed','custom-current','custom-noise'];
  const electricalIds=['custom-power','custom-lumen','custom-ip'];
  const guestLibraryKey='vensis_guest_custom_product_library_v1';
  const apiBase='api/custom-products';
  let libraryProducts=[];
  let libraryCsrf='';
  let libraryLoading=false;

  function secureMode(){return (window.VensisAccess?.mode?.()||window.VENSIS_ACCESS_BOOT_MODE)==='secure'}
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
  function money(value){const n=number(value);return n>0?`€${n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'-'}

  function ensureStyles(){
    if(byId('customProductLibraryStyles'))return;
    const style=document.createElement('style');
    style.id='customProductLibraryStyles';
    style.textContent=`
      .custom-library-tabs{display:flex;gap:8px;margin:0 0 14px;padding:0 0 14px;border-bottom:1px solid #e1e9ea}.custom-library-tabs button{border:1px solid #cfdadc;border-radius:9px;padding:9px 13px;background:#f4f7f7;color:#29484d;font-weight:850;cursor:pointer}.custom-library-tabs button.active{background:#087f4f;border-color:#087f4f;color:#fff}.custom-library-status{margin-left:auto;align-self:center;color:#64748b;font-size:10px;font-weight:750}.custom-library-pane{display:grid;gap:11px}.custom-library-tools{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:9px}.custom-library-tools input,.custom-library-tools select{width:100%;border:1px solid #c9d6d8;border-radius:8px;padding:10px 11px;background:#fbfdfd;color:#173033;font:650 12px Arial,Helvetica,sans-serif}.custom-library-list{display:grid;gap:9px;max-height:52vh;overflow:auto;padding-right:3px}.custom-library-card{display:grid;grid-template-columns:66px minmax(0,1fr) auto;gap:11px;align-items:center;border:1px solid #dce6e3;border-radius:11px;padding:10px;background:#fff}.custom-library-card img{width:62px;height:62px;object-fit:contain;border:1px solid #e2e9e5;border-radius:8px;padding:3px;background:#fff}.custom-library-card .no-image{width:62px;height:62px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#eef3f3;color:#789;font-size:9px;font-weight:800}.custom-library-card strong,.custom-library-card span,.custom-library-card small{display:block}.custom-library-card strong{font-size:13px}.custom-library-card span{margin-top:2px;color:#52666b;font-size:11px}.custom-library-card small{margin-top:4px;color:#087f4f;font-size:10px;font-weight:850}.custom-library-spec{margin-top:5px;color:#64748b;font-size:10px;line-height:1.4}.custom-library-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.custom-library-actions button{border:0;border-radius:7px;padding:8px 9px;font-size:10px;font-weight:850;cursor:pointer}.custom-library-add{background:#087f4f;color:#fff}.custom-library-edit{background:#e8f2f5;color:#0f6f86}.custom-library-delete{background:#fff0ef;color:#b8322c}.custom-library-empty{padding:28px 12px;text-align:center;border:1px dashed #b8c9cc;border-radius:10px;color:#64748b;font-size:12px}.custom-library-message{min-height:15px;color:#087f4f;font-size:10px;font-weight:750}.custom-library-message.error{color:#b8322c}@media(max-width:700px){.custom-library-tools{grid-template-columns:1fr}.custom-library-card{grid-template-columns:52px minmax(0,1fr)}.custom-library-card img,.custom-library-card .no-image{width:48px;height:48px}.custom-library-actions{grid-column:1/-1;justify-content:flex-start}.custom-library-status{width:100%;margin:0}.custom-library-tabs{flex-wrap:wrap}}
    `;
    document.head.appendChild(style);
  }

  function ensureFields(){
    const type=byId('custom-productType');
    if(type&&!type.querySelector('option[value=""]')){
      const option=document.createElement('option');option.value='';option.textContent='Ürün tipi seçin';type.insertBefore(option,type.firstChild);type.required=true;
    }
    fanIds.forEach(id=>{const label=labelFor(id);if(label)label.dataset.customFan='1'});

    const voltageLabel=labelFor('custom-voltage');
    const electricalFields=[['custom-power','Güç','Örn. 2x18 W'],['custom-lumen','Lümen','Örn. 3200 lm'],['custom-ip','IP Sınıfı','Örn. IP66']];
    let anchor=voltageLabel;
    electricalFields.forEach(([id,title,placeholder])=>{
      if(byId(id)){anchor=labelFor(id)||anchor;return}
      const label=document.createElement('label');label.dataset.customElectrical='1';label.innerHTML=`${title}<input id="${id}" data-custom-core type="text" placeholder="${placeholder}">`;
      if(anchor){anchor.insertAdjacentElement('afterend',label);anchor=label}else grid.appendChild(label);
    });

    if(!byId('custom-imageFile')){
      const urlLabel=labelFor('custom-image');const label=document.createElement('label');label.className='custom-wide';label.dataset.customImageUpload='1';
      label.innerHTML='Masaüstünden Görsel Yükle (opsiyonel)<input id="custom-imageFile" type="file" accept="image/*"><small id="customImageHelp" style="display:block;margin-top:6px;color:#64748b;font-size:10px;font-weight:600;text-transform:none;letter-spacing:0">Görsel küçük boyutta optimize edilerek kaydedilir.</small><div id="customImagePreview" style="display:none;margin-top:8px"><img alt="Görsel önizleme" style="width:84px;height:84px;object-fit:contain;border:1px solid #d8e3e5;border-radius:8px;background:#fff;padding:4px"></div>';
      if(urlLabel)urlLabel.insertAdjacentElement('beforebegin',label);else grid.appendChild(label);
    }
    const urlLabel=labelFor('custom-image');if(urlLabel){const textNode=[...urlLabel.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);if(textNode)textNode.textContent='Görsel URL (opsiyonel)'}
  }

  function ensureLibraryUi(){
    if(byId('customLibraryTabs'))return;
    ensureStyles();
    const tabs=document.createElement('div');tabs.id='customLibraryTabs';tabs.className='custom-library-tabs';
    tabs.innerHTML='<button type="button" class="active" data-custom-tab="form">Yeni Ürün</button><button type="button" data-custom-tab="library">Kayıtlı Özel Ürünler</button><span id="customLibraryStatus" class="custom-library-status"></span>';
    grid.insertAdjacentElement('beforebegin',tabs);

    const pane=document.createElement('div');pane.id='customLibraryPane';pane.className='custom-library-pane';pane.hidden=true;
    pane.innerHTML='<div class="custom-library-tools"><input id="customLibrarySearch" type="search" placeholder="Marka, model veya açıklama ara"><select id="customLibraryType"><option value="">Tümü</option><option value="fan">Fan</option><option value="electrical">Elektrik</option></select></div><div id="customLibraryMessage" class="custom-library-message"></div><div id="customLibraryList" class="custom-library-list"></div>';
    tabs.insertAdjacentElement('afterend',pane);
    updateLibraryStatus();
  }

  function updateLibraryStatus(){
    const status=byId('customLibraryStatus');
    if(status)status.textContent=secureMode()?'Şifreli ortak kütüphane':'Misafir: yalnız bu tarayıcı';
  }

  function switchTab(tab){
    const library=tab==='library';
    byId('customLibraryPane').hidden=!library;grid.hidden=library;
    const actions=form.querySelector('.custom-actions');if(actions)actions.hidden=library;
    form.querySelectorAll('[data-custom-tab]').forEach(button=>button.classList.toggle('active',button.dataset.customTab===tab));
    if(library)refreshLibrary();
  }

  function syncTypeFields(){
    const type=value('custom-productType');
    form.querySelectorAll('[data-custom-fan]').forEach(label=>{label.hidden=type!=='fan'});
    form.querySelectorAll('[data-custom-electrical]').forEach(label=>{label.hidden=type!=='electrical'});
    const note=byId('customProductModeNote');if(note){note.textContent=type==='electrical'?'Elektrik ürünü için güç, lümen, voltaj ve IP bilgilerini girin.':type==='fan'?'Fan için debi, voltaj, güç ve devir bilgilerini girin.':'Önce ürün tipini seçin.'}
  }

  function loadImagePreview(src){
    const preview=byId('customImagePreview');const image=preview?.querySelector('img');if(!preview||!image)return;
    if(src){image.src=src;preview.style.display='block'}else{image.removeAttribute('src');preview.style.display='none'}
  }

  function resetFile(){const file=byId('custom-imageFile');if(file)file.value=''}

  function clearFormForNew(){
    form.dataset.editIndex='';form.dataset.libraryEditId='';form.dataset.libraryEditCreatedAt='';form.dataset.existingImage='';
    setValue('custom-productType','');[...commonIds,...fanIds,...electricalIds].forEach(id=>setValue(id,''));resetFile();loadImagePreview('');
    const saveButton=form.querySelector('.custom-save,[type="submit"]');if(saveButton)saveButton.textContent='Kaydet ve Projeye Ekle';
    const title=byId('customProductTitle');if(title)title.textContent='Özel Ürün Ekle';
    syncTypeFields();switchTab('form');setTimeout(()=>byId('custom-productType')?.focus(),0);
  }

  function populateForm(item){
    setValue('custom-productType',item?.productType==='electrical'?'electrical':'fan');setValue('custom-model',item?.model||'');setValue('custom-series',item?.series||'');setValue('custom-manufacturer',item?.manufacturer||'');setValue('custom-description',item?.description||'');
    setValue('custom-voltage',item?.voltage||'');setValue('custom-price',number(item?.price)||'');setValue('custom-discountPercent',number(item?.discountPercent)||'');setValue('custom-quantity',number(item?.quantity)||'');
    setValue('custom-nominalAirflow',number(item?.nominalAirflow)||'');setValue('custom-frequency',item?.frequency||'');setValue('custom-motorPower',number(item?.motorPower)||'');setValue('custom-speed',number(item?.speed)||'');setValue('custom-current',number(item?.current)||'');setValue('custom-noise',number(item?.noise)||'');
    setValue('custom-power',item?.power||'');setValue('custom-lumen',item?.lumen||'');setValue('custom-ip',item?.ip||'');
    const image=String(item?.image||'');form.dataset.existingImage=image;setValue('custom-image',image.startsWith('data:')?'':image);resetFile();loadImagePreview(image);syncTypeFields();
  }

  function prepareProjectEdit(index){
    const items=project.readItems?.()||[];const item=items[index];if(!item)return;
    form.dataset.editIndex=String(index);form.dataset.libraryEditId='';form.dataset.libraryEditCreatedAt='';populateForm(item);
    const saveButton=form.querySelector('.custom-save,[type="submit"]');if(saveButton)saveButton.textContent='Değişiklikleri Kaydet';
    const title=byId('customProductTitle');if(title)title.textContent='Özel Ürünü Düzenle';switchTab('form');
  }

  function imageFromFile(file){
    return new Promise((resolve,reject)=>{
      if(!file){resolve('');return}if(!String(file.type||'').startsWith('image/')){reject(new Error('Lütfen bir görsel dosyası seçin.'));return}
      const source=URL.createObjectURL(file);const image=new Image();
      image.onload=()=>{try{let maxSide=240,quality=.78,data='';while(maxSide>=64){const scale=Math.min(1,maxSide/Math.max(image.naturalWidth||1,image.naturalHeight||1));const width=Math.max(1,Math.round((image.naturalWidth||1)*scale));const height=Math.max(1,Math.round((image.naturalHeight||1)*scale));const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);data=canvas.toDataURL('image/webp',quality);if(data.length<=3800)break;maxSide=Math.floor(maxSide*.78);quality=Math.max(.46,quality-.08)}URL.revokeObjectURL(source);if(!data||data.length>4000){reject(new Error('Görsel yeterince küçültülemedi. Daha sade veya küçük bir görsel seçin.'));return}resolve(data)}catch(error){URL.revokeObjectURL(source);reject(error)}};
      image.onerror=()=>{URL.revokeObjectURL(source);reject(new Error('Görsel okunamadı.'))};image.src=source;
    });
  }

  async function formImage(){
    let image=String(form.dataset.existingImage||'');const file=byId('custom-imageFile')?.files?.[0];
    if(file){const help=byId('customImageHelp');if(help)help.textContent='Görsel hazırlanıyor…';try{image=await imageFromFile(file)}finally{if(help)help.textContent='Görsel küçük boyutta optimize edilerek kaydedilir.'}}else if(value('custom-image'))image=value('custom-image');
    return image;
  }

  function formData(image){
    const type=value('custom-productType');const stamp=new Date().toISOString();
    const base={productType:type,model:value('custom-model'),series:value('custom-series'),manufacturer:value('custom-manufacturer'),description:value('custom-description'),voltage:value('custom-voltage'),price:Math.max(0,number(value('custom-price'))),priceCurrency:'EUR',discountPercent:clampDiscount(value('custom-discountPercent')),quantity:Math.max(1,Math.round(number(value('custom-quantity'))||1)),image,updatedAt:stamp};
    if(type==='electrical')return {...base,power:value('custom-power'),lumen:value('custom-lumen'),ip:value('custom-ip'),nominalAirflow:0,frequency:'',motorPower:0,speed:0,current:0,noise:0};
    return {...base,nominalAirflow:Math.max(0,number(value('custom-nominalAirflow'))),frequency:value('custom-frequency'),motorPower:Math.max(0,number(value('custom-motorPower'))),speed:Math.max(0,number(value('custom-speed'))),current:Math.max(0,number(value('custom-current'))),noise:Math.max(0,number(value('custom-noise'))),power:'',lumen:'',ip:''};
  }

  function projectItemFromData(data,existing=null){
    const stamp=new Date().toISOString();const item=existing||{itemKey:`custom|${Date.now()}|${Math.random().toString(36).slice(2,8)}`,mode:'custom',productKey:'',required:null,selected:null,addedAt:stamp};
    return Object.assign(item,data,{mode:'custom',productKey:'',updatedAt:stamp});
  }

  function libraryRecordFromData(data,existing=null){
    const stamp=new Date().toISOString();return {...data,id:existing?.id||`cpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,createdAt:existing?.createdAt||stamp,updatedAt:stamp};
  }

  function readGuestLibrary(){try{const rows=JSON.parse(localStorage.getItem(guestLibraryKey)||'[]');return Array.isArray(rows)?rows:[]}catch{return []}}
  function writeGuestLibrary(rows){localStorage.setItem(guestLibraryKey,JSON.stringify(rows.slice(0,1000)))}

  async function secureSession(){
    const response=await fetch('api/edit/session.php',{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});const payload=await response.json().catch(()=>({}));
    if(!response.ok||!payload.authenticated||!payload.csrf)throw new Error('Şifreli oturum bulunamadı. Yeniden giriş yapın.');libraryCsrf=String(payload.csrf);return libraryCsrf;
  }

  async function apiRequest(path,options={}){
    const headers={Accept:'application/json'};if(options.body!==undefined)headers['Content-Type']='application/json';if(options.csrf){if(!libraryCsrf)await secureSession();headers['X-CSRF-Token']=libraryCsrf}
    let response=await fetch(`${apiBase}/${path}`,{method:options.method||'GET',credentials:'same-origin',cache:'no-store',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)});
    if((response.status===401||response.status===403)&&options.csrf){libraryCsrf='';await secureSession();headers['X-CSRF-Token']=libraryCsrf;response=await fetch(`${apiBase}/${path}`,{method:options.method||'GET',credentials:'same-origin',cache:'no-store',headers,body:options.body===undefined?undefined:JSON.stringify(options.body)})}
    const payload=await response.json().catch(()=>({}));if(!response.ok||payload.ok===false)throw new Error(payload.error||'Özel ürün kütüphanesi işlemi tamamlanamadı.');return payload;
  }

  async function loadLibrary(){
    if(secureMode()){const payload=await apiRequest('list.php');return Array.isArray(payload.products)?payload.products:[]}
    return readGuestLibrary();
  }

  async function saveLibraryRecord(record){
    if(secureMode()){const payload=await apiRequest('save.php',{method:'POST',body:{product:record},csrf:true});return payload.product||record}
    const rows=readGuestLibrary();const index=rows.findIndex(item=>item.id===record.id);if(index>=0)rows[index]=record;else rows.push(record);writeGuestLibrary(rows);return record;
  }

  async function deleteLibraryRecord(id){
    if(secureMode()){await apiRequest('delete.php',{method:'POST',body:{id},csrf:true});return}
    writeGuestLibrary(readGuestLibrary().filter(item=>item.id!==id));
  }

  function librarySpec(item){
    if(item.productType==='electrical')return [item.power,item.lumen,item.voltage,item.ip].filter(Boolean).join(' · ');
    return [number(item.nominalAirflow)>0?`${Math.round(number(item.nominalAirflow))} m³/h`:'',item.voltage,number(item.motorPower)>0?`${number(item.motorPower)} kW`:'',number(item.speed)>0?`${Math.round(number(item.speed))} rpm`:''].filter(Boolean).join(' · ');
  }

  function renderLibrary(){
    const list=byId('customLibraryList');if(!list)return;const term=value('customLibrarySearch').toLocaleLowerCase('tr-TR');const type=value('customLibraryType');
    const rows=libraryProducts.filter(item=>(!type||item.productType===type)&&(!term||[item.manufacturer,item.model,item.series,item.description].some(text=>String(text||'').toLocaleLowerCase('tr-TR').includes(term))));
    if(!rows.length){list.innerHTML='<div class="custom-library-empty">Kayıtlı özel ürün bulunamadı.</div>';return}
    list.innerHTML=rows.map(item=>`<article class="custom-library-card" data-library-card="${esc(item.id)}">${item.image?`<img src="${esc(item.image)}" alt="${esc(item.model)}">`:'<div class="no-image">GÖRSEL YOK</div>'}<div><strong>${esc(item.model)}</strong><span>${esc(item.series||'')}</span><small>${esc(item.manufacturer||'')} · ${item.productType==='electrical'?'Elektrik':'Fan'} · ${money(item.price)}</small><div class="custom-library-spec">${esc(librarySpec(item)||item.description||'')}</div></div><div class="custom-library-actions"><button type="button" class="custom-library-add" data-library-add="${esc(item.id)}">Projeye Ekle</button><button type="button" class="custom-library-edit" data-library-edit="${esc(item.id)}">Düzenle</button><button type="button" class="custom-library-delete" data-library-delete="${esc(item.id)}">Sil</button></div></article>`).join('');
  }

  function libraryMessage(text,error=false){const node=byId('customLibraryMessage');if(!node)return;node.textContent=text||'';node.classList.toggle('error',Boolean(error))}

  async function refreshLibrary(){
    if(libraryLoading)return;libraryLoading=true;libraryMessage('Kütüphane yükleniyor…');
    try{libraryProducts=await loadLibrary();libraryMessage(`${libraryProducts.length} kayıtlı özel ürün`);renderLibrary()}catch(error){libraryProducts=[];libraryMessage(error.message||'Kütüphane yüklenemedi.',true);renderLibrary()}finally{libraryLoading=false}
  }

  function addLibraryProductToProject(id){
    const source=libraryProducts.find(item=>item.id===id);if(!source)return;const items=project.readItems?.()||[];const data={...source};delete data.id;delete data.createdAt;delete data.updatedAt;delete data.priceCurrency;
    data.quantity=Math.max(1,Math.round(number(source.quantity)||1));const item=projectItemFromData({...data,priceCurrency:'EUR'});items.push(item);project.writeItems?.(items);project.render?.();closeModal();
  }

  function editLibraryProduct(id){
    const source=libraryProducts.find(item=>item.id===id);if(!source)return;form.dataset.editIndex='';form.dataset.libraryEditId=source.id;form.dataset.libraryEditCreatedAt=source.createdAt||new Date().toISOString();populateForm(source);
    const saveButton=form.querySelector('.custom-save,[type="submit"]');if(saveButton)saveButton.textContent='Kütüphaneyi Güncelle';const title=byId('customProductTitle');if(title)title.textContent='Kütüphane Ürününü Düzenle';switchTab('form');
  }

  async function removeLibraryProduct(id){
    const source=libraryProducts.find(item=>item.id===id);if(!source)return;if(!confirm(`${source.model} kütüphaneden silinsin mi?`))return;libraryMessage('Siliniyor…');
    try{await deleteLibraryRecord(id);await refreshLibrary()}catch(error){libraryMessage(error.message||'Ürün silinemedi.',true)}
  }

  function closeModal(){modal.hidden=true;document.body.classList.remove('modal-open');form.dataset.editIndex='';form.dataset.libraryEditId=''}

  async function saveCustomProduct(event){
    event.preventDefault();event.stopImmediatePropagation();
    const type=value('custom-productType');if(type!=='fan'&&type!=='electrical'){byId('custom-productType')?.focus();return}const model=value('custom-model');if(!model){byId('custom-model')?.focus();return}
    let image;try{image=await formImage()}catch(error){alert(error.message||'Görsel yüklenemedi.');return}const data=formData(image);

    const libraryEditId=String(form.dataset.libraryEditId||'');
    if(libraryEditId){const existing=libraryProducts.find(item=>item.id===libraryEditId)||{id:libraryEditId,createdAt:form.dataset.libraryEditCreatedAt||new Date().toISOString()};const record=libraryRecordFromData(data,existing);libraryMessage('Kütüphane güncelleniyor…');try{await saveLibraryRecord(record);libraryProducts=await loadLibrary();renderLibrary();libraryMessage('Kütüphane ürünü güncellendi.');form.dataset.libraryEditId='';switchTab('library')}catch(error){alert(error.message||'Kütüphane güncellenemedi.')}return}

    const items=project.readItems?.()||[];const indexText=String(form.dataset.editIndex||'');const index=indexText===''?null:Number(indexText);const existing=Number.isInteger(index)&&items[index]?items[index]:null;
    if(!existing){const record=libraryRecordFromData(data);try{await saveLibraryRecord(record)}catch(error){alert(`Ürün projeye eklenmedi. Kütüphane kaydı başarısız: ${error.message||'Bilinmeyen hata'}`);return}}

    const item=projectItemFromData(data,existing);
    if(existing)items[index]=item;else items.push(item);project.writeItems?.(items);project.render?.();closeModal();
  }

  ensureFields();ensureLibraryUi();syncTypeFields();updateLibraryStatus();

  byId('custom-productType')?.addEventListener('change',syncTypeFields);
  byId('custom-imageFile')?.addEventListener('change',event=>{const file=event.target.files?.[0];if(!file){loadImagePreview(form.dataset.existingImage||'');return}const url=URL.createObjectURL(file);loadImagePreview(url);setTimeout(()=>URL.revokeObjectURL(url),3000)});
  byId('customLibrarySearch')?.addEventListener('input',renderLibrary);byId('customLibraryType')?.addEventListener('change',renderLibrary);

  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-custom-tab]');if(tab){switchTab(tab.dataset.customTab);return}
    if(event.target.closest('#addCustomProduct')){clearFormForNew();refreshLibrary();return}
    const projectEdit=event.target.closest('[data-edit-product]');if(projectEdit){prepareProjectEdit(Number(projectEdit.dataset.editProduct));return}
    const add=event.target.closest('[data-library-add]');if(add){addLibraryProductToProject(add.dataset.libraryAdd);return}
    const edit=event.target.closest('[data-library-edit]');if(edit){editLibraryProduct(edit.dataset.libraryEdit);return}
    const remove=event.target.closest('[data-library-delete]');if(remove){removeLibraryProduct(remove.dataset.libraryDelete)}
  });

  form.addEventListener('submit',saveCustomProduct,true);
})();
