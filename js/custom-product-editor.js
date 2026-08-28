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

  function ensureFields(){
    const type=byId('custom-productType');
    if(type&&!type.querySelector('option[value=""]')){
      const option=document.createElement('option');
      option.value='';option.textContent='Ürün tipi seçin';
      type.insertBefore(option,type.firstChild);type.required=true;
    }

    fanIds.forEach(id=>{const label=labelFor(id);if(label)label.dataset.customFan='1'});

    const voltageLabel=labelFor('custom-voltage');
    const electricalFields=[
      ['custom-power','Güç','text','Örn. 2x18 W'],
      ['custom-lumen','Lümen','text','Örn. 3200 lm'],
      ['custom-ip','IP Sınıfı','text','Örn. IP66']
    ];
    let anchor=voltageLabel;
    electricalFields.forEach(([id,title,inputType,placeholder])=>{
      if(byId(id)){anchor=labelFor(id)||anchor;return}
      const label=document.createElement('label');
      label.dataset.customElectrical='1';
      label.innerHTML=`${title}<input id="${id}" data-custom-core type="${inputType}" placeholder="${placeholder}">`;
      if(anchor){anchor.insertAdjacentElement('afterend',label);anchor=label}else grid.appendChild(label);
    });

    if(!byId('custom-imageFile')){
      const urlLabel=labelFor('custom-image');
      const label=document.createElement('label');
      label.className='custom-wide';
      label.dataset.customImageUpload='1';
      label.innerHTML='Masaüstünden Görsel Yükle (opsiyonel)<input id="custom-imageFile" type="file" accept="image/*"><small id="customImageHelp" style="display:block;margin-top:6px;color:#64748b;font-size:10px;font-weight:600;text-transform:none;letter-spacing:0">Görsel proje içine küçük boyutta optimize edilerek kaydedilir.</small><div id="customImagePreview" style="display:none;margin-top:8px"><img alt="Görsel önizleme" style="width:84px;height:84px;object-fit:contain;border:1px solid #d8e3e5;border-radius:8px;background:#fff;padding:4px"></div>';
      if(urlLabel)urlLabel.insertAdjacentElement('beforebegin',label);else grid.appendChild(label);
    }

    const urlLabel=labelFor('custom-image');
    if(urlLabel){
      const textNode=[...urlLabel.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
      if(textNode)textNode.textContent='Görsel URL (opsiyonel)';
    }
  }

  function syncTypeFields(){
    const type=value('custom-productType');
    form.querySelectorAll('[data-custom-fan]').forEach(label=>{label.hidden=type!=='fan'});
    form.querySelectorAll('[data-custom-electrical]').forEach(label=>{label.hidden=type!=='electrical'});
    const note=byId('customProductModeNote');
    if(note){
      note.textContent=type==='electrical'
        ?'Elektrik ürünü için güç, lümen, voltaj ve IP bilgilerini girin.'
        :type==='fan'
          ?'Fan için debi, voltaj, güç ve devir bilgilerini girin.'
          :'Önce ürün tipini seçin.';
    }
  }

  function clearFormForNew(){
    form.dataset.editIndex='';
    form.dataset.existingImage='';
    setValue('custom-productType','');
    [...commonIds,...fanIds,...electricalIds].forEach(id=>setValue(id,''));
    const file=byId('custom-imageFile');if(file)file.value='';
    const preview=byId('customImagePreview');if(preview)preview.style.display='none';
    syncTypeFields();
    byId('custom-productType')?.focus();
  }

  function loadImagePreview(src){
    const preview=byId('customImagePreview');const image=preview?.querySelector('img');
    if(!preview||!image)return;
    if(src){image.src=src;preview.style.display='block'}else{image.removeAttribute('src');preview.style.display='none'}
  }

  function prepareEdit(index){
    const items=project.readItems?.()||[];
    const item=items[index];if(!item)return;
    form.dataset.editIndex=String(index);
    form.dataset.existingImage=String(item.image||'');
    setValue('custom-productType',item.productType==='electrical'?'electrical':'fan');
    setValue('custom-power',item.power||'');
    setValue('custom-lumen',item.lumen||'');
    setValue('custom-ip',item.ip||'');
    const file=byId('custom-imageFile');if(file)file.value='';
    if(String(item.image||'').startsWith('data:'))setValue('custom-image','');
    loadImagePreview(item.image||'');
    syncTypeFields();
  }

  function imageFromFile(file){
    return new Promise((resolve,reject)=>{
      if(!file){resolve('');return}
      if(!String(file.type||'').startsWith('image/')){reject(new Error('Lütfen bir görsel dosyası seçin.'));return}
      const source=URL.createObjectURL(file);
      const image=new Image();
      image.onload=()=>{
        try{
          let maxSide=240;
          let quality=.78;
          let data='';
          while(maxSide>=64){
            const scale=Math.min(1,maxSide/Math.max(image.naturalWidth||1,image.naturalHeight||1));
            const width=Math.max(1,Math.round((image.naturalWidth||1)*scale));
            const height=Math.max(1,Math.round((image.naturalHeight||1)*scale));
            const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
            const ctx=canvas.getContext('2d');
            ctx.clearRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
            data=canvas.toDataURL('image/webp',quality);
            if(data.length<=3800)break;
            maxSide=Math.floor(maxSide*.78);quality=Math.max(.46,quality-.08);
          }
          URL.revokeObjectURL(source);
          if(!data||data.length>4000){reject(new Error('Görsel proje için yeterince küçültülemedi. Daha sade veya küçük bir görsel seçin.'));return}
          resolve(data);
        }catch(error){URL.revokeObjectURL(source);reject(error)}
      };
      image.onerror=()=>{URL.revokeObjectURL(source);reject(new Error('Görsel okunamadı.'))};
      image.src=source;
    });
  }

  function closeModal(){
    modal.hidden=true;
    document.body.classList.remove('modal-open');
    form.dataset.editIndex='';
  }

  async function saveCustomProduct(event){
    event.preventDefault();
    event.stopImmediatePropagation();

    const type=value('custom-productType');
    if(type!=='fan'&&type!=='electrical'){byId('custom-productType')?.focus();return}
    const model=value('custom-model');
    if(!model){byId('custom-model')?.focus();return}

    const items=project.readItems?.()||[];
    const indexText=String(form.dataset.editIndex||'');
    const index=indexText===''?null:Number(indexText);
    const existing=Number.isInteger(index)&&items[index]?items[index]:null;
    const stamp=new Date().toISOString();
    const item=existing||{itemKey:`custom|${Date.now()}|${Math.random().toString(36).slice(2,8)}`,mode:'custom',productKey:'',required:null,selected:null,addedAt:stamp};

    let image=String(form.dataset.existingImage||item.image||'');
    const file=byId('custom-imageFile')?.files?.[0];
    if(file){
      const help=byId('customImageHelp');if(help)help.textContent='Görsel hazırlanıyor…';
      try{image=await imageFromFile(file)}catch(error){alert(error.message||'Görsel yüklenemedi.');if(help)help.textContent='Görsel proje içine küçük boyutta optimize edilerek kaydedilir.';return}
      if(help)help.textContent='Görsel proje içine küçük boyutta optimize edilerek kaydedilir.';
    }else if(value('custom-image'))image=value('custom-image');

    Object.assign(item,{
      mode:'custom',productType:type,model,
      series:value('custom-series'),manufacturer:value('custom-manufacturer'),description:value('custom-description'),
      voltage:value('custom-voltage'),price:Math.max(0,number(value('custom-price'))),priceCurrency:'EUR',
      discountPercent:clampDiscount(value('custom-discountPercent')),quantity:Math.max(1,Math.round(number(value('custom-quantity'))||1)),
      image,updatedAt:stamp
    });

    if(type==='electrical'){
      Object.assign(item,{power:value('custom-power'),lumen:value('custom-lumen'),ip:value('custom-ip'),nominalAirflow:0,frequency:'',motorPower:0,speed:0,current:0,noise:0});
    }else{
      Object.assign(item,{nominalAirflow:Math.max(0,number(value('custom-nominalAirflow'))),frequency:value('custom-frequency'),motorPower:Math.max(0,number(value('custom-motorPower'))),speed:Math.max(0,number(value('custom-speed'))),current:Math.max(0,number(value('custom-current'))),noise:Math.max(0,number(value('custom-noise'))),power:'',lumen:'',ip:''});
    }

    if(existing)items[index]=item;else items.push(item);
    project.writeItems?.(items);
    closeModal();
    project.render?.();
  }

  ensureFields();
  syncTypeFields();

  byId('custom-productType')?.addEventListener('change',syncTypeFields);
  byId('custom-imageFile')?.addEventListener('change',event=>{
    const file=event.target.files?.[0];
    if(!file){loadImagePreview(form.dataset.existingImage||'');return}
    const url=URL.createObjectURL(file);loadImagePreview(url);
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  });

  document.addEventListener('click',event=>{
    if(event.target.closest('#addCustomProduct')){clearFormForNew();return}
    const edit=event.target.closest('[data-edit-product]');
    if(edit)prepareEdit(Number(edit.dataset.editProduct));
  });

  form.addEventListener('submit',saveCustomProduct,true);
})();
