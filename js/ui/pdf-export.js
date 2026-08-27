(function(){
  'use strict';

  const renderer=window.VensisDatasheet;
  if(!renderer?.html)return;

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[ch]));
  }

  function escapeAttr(value){
    return String(value??'').replace(/[&<>"]/g,ch=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
    }[ch]));
  }

  function asArray(value){
    if(Array.isArray(value))return value.filter(item=>item!=null&&item!=='');
    if(value==null||value==='')return [];
    return [value];
  }

  function objectOrEmpty(value){
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }

  function sanitizePayload(payload={}){
    const product=objectOrEmpty(payload.product);
    const model=objectOrEmpty(payload.model);
    const productPerformance=objectOrEmpty(product.performance);
    const modelPerformance=objectOrEmpty(model.performance);
    const rawDescription=objectOrEmpty(product.description);
    const description={
      ...rawDescription,
      general:asArray(rawDescription.general),
      motor:asArray(rawDescription.motor),
      applications:asArray(rawDescription.applications)
    };

    return {
      ...payload,
      product:{
        ...product,
        description,
        performance:{...productPerformance,controls:asArray(productPerformance.controls)}
      },
      model:{
        ...model,
        performance:{...modelPerformance,controls:asArray(modelPerformance.controls)}
      }
    };
  }

  function withBase(html){
    const base=new URL('.',window.location.href).href;
    if(/<head(?:\s[^>]*)?>/i.test(html)){
      return html.replace(/<head(\s[^>]*)?>/i,match=>`${match}<base href="${escapeAttr(base)}">`);
    }
    return `<base href="${escapeAttr(base)}">`+html;
  }

  function fallbackHtml(payload,error){
    const safe=sanitizePayload(payload);
    const product=safe.product||{};
    const model=safe.model||{};
    const series=objectOrEmpty(product.series);
    const motor=objectOrEmpty(model.motor||product.motor);
    const performance=objectOrEmpty(model.performance||product.performance);
    const technical=objectOrEmpty(model.technical||product.technical);
    const image=product.media?.image||model.image||'';
    const name=model.model||product.model||model.display||'Ürün';
    const title=series.title||model.seriesTitle||model.series||'';
    const brand=series.manufacturer||model.manufacturer||'Vensis';
    const rows=[
      ['Debi',performance.nominalAirflow??model.nominal??model.qq,'m³/h'],
      ['Basınç',model.pp,'Pa'],
      ['Motor Gücü',motor.power??model.kw,'kW'],
      ['Akım',motor.current??model.amps,'A'],
      ['Devir',motor.speed??model.rpm,'rpm'],
      ['Voltaj',motor.voltage??model.voltage,''],
      ['Ses',motor.sound??model.spl,'dB(A)'],
      ['Fan Tipi',technical.fanType??model.fanType,''],
      ['Montaj',technical.mountType??model.mountType,''],
      ['IP Sınıfı',technical.ipClass??model.ipClass,'']
    ].filter(([,value])=>value!=null&&value!=='');
    const points=safe.mode==='selection'?`<div class="points"><div><span>İstenen Nokta</span><b>${escapeHtml(safe.required?.q||0)} m³/h @ ${escapeHtml(safe.required?.p||0)} Pa</b></div><div><span>Seçilen Nokta</span><b>${escapeHtml(safe.selected?.q||0)} m³/h @ ${escapeHtml(safe.selected?.p||0)} Pa</b></div></div>`:'';
    const errorNote=error?`<small>Standart föy motoru hata verdiği için güvenli önizleme gösterildi.</small>`:'';
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(name)} Önizleme</title><style>*{box-sizing:border-box}body{margin:0;background:#edf2f1;color:#173033;font-family:Arial,Helvetica,sans-serif}.toolbar{max-width:210mm;margin:12px auto 0;display:flex;justify-content:flex-end}.toolbar button{border:0;border-radius:8px;background:#087f4f;color:#fff;font-weight:800;padding:10px 15px;cursor:pointer}.sheet{width:min(210mm,calc(100% - 24px));min-height:260mm;margin:10px auto 24px;background:#fff;padding:12mm;box-shadow:0 8px 30px rgba(0,0,0,.12)}.head{border-bottom:3px solid #087f4f;padding-bottom:12px}.brand{font-size:12px;font-weight:900;color:#087f4f;text-transform:uppercase}.head h1{margin:5px 0 2px;font-size:28px}.head h2{margin:0;color:#58706b;font-size:16px}.hero{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center;margin-top:28px}.hero img{width:100%;height:250px;object-fit:contain}.spec{border:1px solid #cbd8d4;border-radius:10px;overflow:hidden}.row{display:grid;grid-template-columns:1fr 1fr;padding:9px 12px;border-top:1px solid #e3ebe8}.row:first-child{border-top:0}.row span{font-weight:700}.row b{text-align:right}.points{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px}.points div{border:1px solid #b9d3c7;border-radius:9px;padding:12px}.points span{display:block;font-size:11px;color:#58706b;font-weight:800}.points b{display:block;margin-top:4px}small{display:block;margin-top:18px;color:#71817d}@media(max-width:700px){.hero,.points{grid-template-columns:1fr}.sheet{padding:20px}.hero img{height:200px}}@media print{body{background:#fff}.toolbar{display:none}.sheet{box-shadow:none;margin:0;width:100%;min-height:auto}}</style></head><body><div class="toolbar"><button onclick="window.print()">Yazdır / PDF</button></div><main class="sheet"><div class="head"><div class="brand">${escapeHtml(brand)}</div><h1>${escapeHtml(name)}</h1><h2>${escapeHtml(title)}</h2></div><div class="hero">${image?`<img src="${escapeAttr(image)}" alt="${escapeAttr(name)}">`:'<div></div>'}<div class="spec">${rows.map(([label,value,unit])=>`<div class="row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}${unit?' '+escapeHtml(unit):''}</b></div>`).join('')}</div></div>${points}${errorNote}</main></body></html>`;
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

      const safe=sanitizePayload(payload);
      const html=withBase(renderer.html(safe));
      preview.document.open();
      preview.document.write(html);
      preview.document.close();
      preview.focus();
      return preview;
    }catch(error){
      console.error('Vensis direct preview error',error);
      try{
        preview.document.open();
        preview.document.write(withBase(fallbackHtml(payload,error)));
        preview.document.close();
        preview.focus();
        return preview;
      }catch(fallbackError){
        console.error('Vensis fallback preview error',fallbackError);
        try{
          preview.document.open();
          preview.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Önizleme Hatası</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#8a1c1c"><h2>Önizleme oluşturulamadı</h2><p>Tarayıcı konsolunda hata kaydı oluşturuldu.</p></body></html>');
          preview.document.close();
        }catch{}
        return null;
      }
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
      series:{title:row?.catalogNameEn||row?.series||'',manufacturer:row?.manufacturer||'Vitlo'},
      media:{image:row?.image||''},
      motor:{speed:Number(row?.rpm)||0,voltage:row?.voltage||'',sound:Number(row?.spl)||0},
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
      required:{q:typeof utils?.number==='function'?utils.number('q'):0,p:typeof utils?.number==='function'?utils.number('p'):0},
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
