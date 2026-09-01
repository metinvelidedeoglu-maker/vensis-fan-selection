(function(){
  'use strict';
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='quotation.html')return;
  const language=()=>{try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}};
  function apply(){
    const tr=language()==='tr';
    const aliases=tr?{
      'Product':'Ürün','Ürün':'Ürün','Power':'Güç','Güç':'Güç','Lumen':'Lümen','Lümen':'Lümen','Voltaj / Voltage':'Voltaj','Voltage':'Voltaj','Voltaj':'Voltaj','Unit Price':'Birim Fiyat','Birim Fiyat':'Birim Fiyat','Qty':'Adet','Quantity':'Adet','Adet':'Adet','Total':'Toplam','Toplam':'Toplam','Selected / Nominal':'Seçilen / Nominal','Seçilen / Nominal':'Seçilen / Nominal'
    }:{
      'Product':'Product','Ürün':'Product','Power':'Power','Güç':'Power','Lumen':'Lumen','Lümen':'Lumen','Voltaj / Voltage':'Voltage','Voltage':'Voltage','Voltaj':'Voltage','Unit Price':'Unit Price','Birim Fiyat':'Unit Price','Qty':'Qty','Quantity':'Qty','Adet':'Qty','Total':'Total','Toplam':'Total','Selected / Nominal':'Selected / Nominal','Seçilen / Nominal':'Selected / Nominal'
    };
    document.querySelectorAll('.quote-table th').forEach(node=>{const key=node.textContent.trim(),next=aliases[key];if(next&&node.textContent!==next)node.textContent=next});
    document.querySelectorAll('.quote-product-group-title').forEach(node=>{const key=node.textContent.trim();const next=tr?(key==='Fan Products'?'Fan Ürünleri':key==='Electrical Products'?'Elektrik Ürünleri':key):(key==='Fan Ürünleri'?'Fan Products':key==='Elektrik Ürünleri'?'Electrical Products':key);if(next!==node.textContent)node.textContent=next});
  }
  function start(){
    apply();
    const root=document.getElementById('quotationProductTables');
    if(root)new MutationObserver(mutations=>{if(mutations.some(m=>m.addedNodes.length))apply()}).observe(root,{childList:true,subtree:true});
    window.addEventListener('beforeprint',apply);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
