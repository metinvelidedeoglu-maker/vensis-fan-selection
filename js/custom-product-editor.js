(function(){
  'use strict';
  const project=window.VensisProject,core=window.VensisProjectCustom;
  const form=document.getElementById('customProductForm'),modal=document.getElementById('customProductModal');
  if(!project||!core||!form||!modal)return;
  const byId=id=>document.getElementById(id);
  const value=id=>String(byId('custom-'+id)?.value||'').trim();
  const set=(id,next)=>{const field=byId('custom-'+id);if(field)field.value=next??''};
  const tr=()=>window.VensisI18n?.getLanguage?.()==='tr'||document.documentElement.lang==='tr';
  const secure=()=>window.VensisAccess?.mode?.()==='secure';
  const fields=['model','series','manufacturer','description','price','discountPercent','quantity','image'];
  let editKey='',recordId='',createdAt='',existingImage='',saving=false,editingAllowed=true;
  const fileLabel=document.createElement('label');fileLabel.className='custom-wide';
  fileLabel.innerHTML='<span data-custom-upload-label></span><input id="custom-projectImageFile" type="file" accept="image/*">';
  form.querySelector('.custom-grid').appendChild(fileLabel);
  const message=document.createElement('p');message.id='projectCustomStatus';message.setAttribute('role','status');message.style.cssText='color:#a52c24;font-size:12px';
  form.querySelector('.custom-actions').before(message);
  function simplify(){
    form.querySelectorAll('.custom-grid>label').forEach(label=>{
      const field=label.querySelector('input,select,textarea');
      label.hidden=Boolean(field&&!fields.some(id=>field.id==='custom-'+id)&&field.id!=='custom-projectImageFile');
    });
    form.querySelector('[data-custom-upload-label]').textContent=tr()?'Görsel Yükle (opsiyonel)':'Upload Image (optional)';
    const labels={model:tr()?'Model / Ürün Adı':'Model / Product Name',series:tr()?'Tip':'Type',manufacturer:tr()?'Marka':'Brand',description:tr()?'Kısa Teknik Açıklama':'Short Technical Description'};
    for(const [id,title]of Object.entries(labels)){
      const label=byId('custom-'+id)?.closest('label');const text=[...(label?.childNodes||[])].find(node=>node.nodeType===3);if(text)text.textContent=title;
    }
    byId('custom-description').maxLength=4000;
    byId('customProductTitle').textContent=tr()?'Projeye Özel Ürün':'Project-specific Product';
    byId('customProductModeNote').textContent=tr()?'Görsel, model, tip, marka, kısa teknik açıklama ve fiyatı girin. Kayıt katalogda bu projeye bağlı görünür.':'Enter the image, model, type, brand, short technical description and price. The catalog record will belong to this project.';
    byId('saveCustomProduct').textContent=editKey?(tr()?'Değişiklikleri Kaydet':'Save Changes'):(tr()?'Kaydet ve Projeye Ekle':'Save and Add to Project');
    byId('saveCustomProduct').disabled=saving;
  }
  function prepare(index=null){
    const item=index==null?null:(project.readItems()||[])[index];
    editingAllowed=!item||item.mode==='custom';if(!editingAllowed)return;
    editKey=item?.itemKey||'';recordId=core.isProjectProduct(item)?item.productKey:'';createdAt=item?.addedAt||'';existingImage=item?.image||'';
    fields.forEach(id=>set(id,item?.[id]??''));set('quantity',item?.quantity||1);set('discountPercent',item?.discountPercent||0);set('image',existingImage.startsWith('data:')?'':existingImage);
    byId('custom-productType').value=item?.productType==='electrical'?'electrical':'fan';
    byId('custom-projectImageFile').value='';message.textContent='';simplify();
  }
  async function image(){
    const file=byId('custom-projectImageFile').files?.[0];
    if(!file)return value('image')||existingImage;
    if(!file.type.startsWith('image/'))throw new Error(tr()?'Bir görsel seçin.':'Select an image.');
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{try{
        let side=420,data='';
        while(side>=70){const scale=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/webp',.75);if(data.length<=8500)break;side=Math.floor(side*.8)}
        URL.revokeObjectURL(url);if(data.length>10000)throw new Error(tr()?'Daha küçük bir görsel seçin.':'Choose a smaller image.');resolve(data);
      }catch(error){reject(error)}};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error(tr()?'Görsel okunamadı.':'Could not read image.'))};img.src=url;
    });
  }
  async function save(event){
    event.preventDefault();event.stopImmediatePropagation();if(saving)return;
    if(!secure()){message.textContent=tr()?'Bu kayıt için şifreli oturum açın.':'Sign in to save this record.';return}
    if(!value('model')){byId('custom-model').focus();return}
    saving=true;simplify();message.textContent='';
    try{
      project.flushAllNotes?.();
      const current=(project.readItems()||[]).find(item=>item.itemKey===editKey)||null;
      const data={...(current||{}),model:value('model'),series:value('series'),manufacturer:value('manufacturer'),description:value('description'),price:Math.max(0,Number(value('price'))||0),discountPercent:Math.min(100,Math.max(0,Number(value('discountPercent'))||0)),quantity:Math.max(1,Math.round(Number(value('quantity'))||1)),image:await image()};
      const record=core.record(data,{id:project.projectId,name:project.readMeta?.().name},recordId,createdAt);
      // Retain the same ID if a request needs to be retried after a network error.
      recordId=record.id;createdAt=record.createdAt;
      const sessionResponse=await fetch('api/edit/session.php',{credentials:'same-origin',cache:'no-store'});const session=await sessionResponse.json();
      if(!sessionResponse.ok||!session.authenticated||!session.csrf)throw new Error(tr()?'Şifreli oturum bulunamadı. Yeniden giriş yapın.':'Sign in again.');
      const response=await fetch('api/custom-products/save.php',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrf},body:JSON.stringify({product:record})});
      const payload=await response.json();if(!response.ok||payload.ok===false||payload.stored===false)throw new Error(payload.error||(tr()?'Ürün kaydedilemedi.':'Product could not be saved.'));
      const items=project.readItems()||[];const index=editKey?items.findIndex(item=>item.itemKey===editKey):-1;
      if(editKey&&index<0)throw new Error(tr()?'Proje satırı kaldırılmış. Kayıt katalogda görülebilir.':'Project line was removed. The saved record is available in the catalog.');
      const item=core.toItem(payload.product||record,index>=0?items[index]:null);
      if(index>=0)items[index]=item;else items.push(item);
      project.writeItems(items);project.render();modal.hidden=true;document.body.classList.remove('modal-open');
    }catch(error){message.textContent=error.message||'Save failed.'}finally{saving=false;byId('saveCustomProduct').disabled=false}
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('#addCustomProduct'))prepare();
    const edit=event.target.closest('[data-edit-product]');if(edit)prepare(Number(edit.dataset.editProduct));
  });
  form.addEventListener('submit',event=>{
    if(!editingAllowed)return;
    const item=editKey?(project.readItems()||[]).find(item=>item.itemKey===editKey):null;
    editingAllowed=!item||item.mode==='custom';if(!editingAllowed)return;
    save(event);
  },true);
  window.addEventListener('vensis-language-changed',()=>{if(!modal.hidden)simplify()});
})();
