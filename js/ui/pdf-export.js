(function(){
  'use strict';

  const renderer=window.VensisDatasheet;
  if(!renderer?.html)return;

  function escapeAttr(value){
    return String(value??'').replace(/[&<>"]/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
    }[ch]));
  }

  function withBase(html){
    const base=new URL('.',window.location.href).href;
    if(/<head(?:\s[^>]*)?>/i.test(html)){
      return html.replace(/<head(\s[^>]*)?>/i,match=>`${match}<base href="${escapeAttr(base)}">`);
    }
    return `<base href="${escapeAttr(base)}">`+html;
  }

  function openDirect(payload){
    const preview=window.open('about:blank','_blank');
    if(!preview){
      alert('Önizleme tarayıcı tarafından engellendi. select.vensis.com.tr için açılır pencereye izin verin.');
      return null;
    }

    try{
      preview.document.open();
      preview.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Vensis Önizleme</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#173033">Önizleme hazırlanıyor...</body></html>');
      preview.document.close();

      const html=withBase(renderer.html(payload));
      preview.document.open();
      preview.document.write(html);
      preview.document.close();
      preview.focus();
      return preview;
    }catch(error){
      try{
        preview.document.open();
        preview.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Önizleme Hatası</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#8a1c1c"><h2>Önizleme oluşturulamadı</h2><p>Sayfayı yenileyip tekrar deneyin.</p></body></html>');
        preview.document.close();
      }catch{}
      console.error('Vensis direct preview error',error);
      return null;
    }
  }

  function catalogPayload(id){
    const catalog=window.VensisCatalog;
    const model=catalog?.getModel?.(id)||(catalog?.models||[]).find(item=>String(item.id)===String(id));
    if(!model)return null;
    const product=catalog?.product?.(id)||null;
    return {mode:'catalog',product,model};
  }

  function selectionProduct(row){
    const catalog=window.VensisCatalog;
    const product=catalog?.product?.(row?.productKey||row?.key||row?.id)||window.VensisProducts?.fromResult?.(row);
    if(product)return product;
    return {
      model:row?.model||row?.display||'',
      series:{
        title:row?.catalogNameEn||row?.series||'',
        manufacturer:row?.manufacturer||'Vitlo'
      },
      media:{image:row?.image||''},
      motor:{
        speed:Number(row?.rpm)||0,
        voltage:row?.voltage||'',
        sound:Number(row?.spl)||0
      },
      description:row?.catalogueInfo||{general:[],motor:[],applications:[]}
    };
  }

  function selectionPayload(index){
    const state=window.VensisState;
    const utils=window.VensisUtils;
    const row=state?.results?.[Number(index)];
    if(!row)return null;
    return {
      mode:'selection',
      product:selectionProduct(row),
      model:row,
      required:{
        q:typeof utils?.number==='function'?utils.number('q'):0,
        p:typeof utils?.number==='function'?utils.number('p'):0
      },
      selected:{q:Number(row.qq)||0,p:Number(row.pp)||0}
    };
  }

  function makeCatalogButton(oldButton){
    const id=oldButton.dataset.modelDatasheet;
    const button=document.createElement('button');
    button.type='button';
    button.className='model-datasheet-btn vensis-preview-new';
    button.textContent='Önizleme';
    button.dataset.vensisPreviewModel=id;
    button.style.marginTop='0';
    button.addEventListener('click',()=>{
      const payload=catalogPayload(id);
      if(!payload){alert('Ürün bilgisi bulunamadı.');return;}
      openDirect(payload);
    });
    oldButton.replaceWith(button);
  }

  function makeSelectionButton(oldButton){
    const index=oldButton.dataset.viewDatasheet;
    const button=document.createElement('button');
    button.type='button';
    button.className='detail-icon-btn vensis-preview-new';
    button.textContent='Önizleme';
    button.dataset.vensisPreviewSelection=index;
    button.title='Teknik föy önizleme';
    button.setAttribute('aria-label','Teknik föy önizleme');
    button.style.cssText='min-width:82px;height:36px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;white-space:nowrap';
    button.addEventListener('click',()=>{
      const payload=selectionPayload(index);
      if(!payload){alert('Fan seçim bilgisi bulunamadı.');return;}
      openDirect(payload);
    });
    oldButton.replaceWith(button);
  }

  function replaceOldPreviewButtons(root=document){
    root.querySelectorAll?.('[data-model-datasheet]').forEach(makeCatalogButton);
    root.querySelectorAll?.('[data-view-datasheet]').forEach(makeSelectionButton);
  }

  renderer.save=openDirect;
  renderer.preview=openDirect;
  renderer.open=openDirect;

  const start=()=>replaceOldPreviewButtons(document);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes||[]){
        if(node?.nodeType!==1)continue;
        if(node.matches?.('[data-model-datasheet]'))makeCatalogButton(node);
        else if(node.matches?.('[data-view-datasheet]'))makeSelectionButton(node);
        else replaceOldPreviewButtons(node);
      }
    }
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.VensisDirectPreview={open:openDirect,refresh:replaceOldPreviewButtons};
})();
