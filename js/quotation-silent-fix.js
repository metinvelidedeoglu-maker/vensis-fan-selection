(function(root){
  'use strict';

  const document=root.document;
  if(!document)return;
  const pathname=String(root.location?.pathname||'');
  if(!/(^|\/)quotation\.html$/.test(pathname))return;

  const STYLE_ID='vensis-quotation-print-fit-20260908';
  function installPrintStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
@media print{
  #quotationContent>.quote-page:first-child{padding:7mm 8mm 6mm}
  #quotationContent>.quote-page:first-child .quote-header{padding-bottom:3mm}
  #quotationContent>.quote-page:first-child .quote-header img{height:15mm}
  #quotationContent>.quote-page:first-child .quote-title h1{font-size:22px}
  #quotationContent>.quote-page:first-child .quote-title p{margin-top:3px;font-size:8px}
  #quotationContent>.quote-page:first-child .meta-grid{gap:4mm;margin-top:4mm}
  #quotationContent>.quote-page:first-child .meta-head{padding:5px 8px;font-size:8px}
  #quotationContent>.quote-page:first-child .meta-row{grid-template-columns:95px 1fr;padding:5px 8px;font-size:9px}
  #quotationContent>.quote-page:first-child .quote-product-group+.quote-product-group{margin-top:3mm}
  #quotationContent>.quote-page:first-child .quote-product-group-title{margin:3mm 0 -2mm;font-size:9px}
  #quotationContent>.quote-page:first-child .quote-table-wrap{margin-top:4mm}
  #quotationContent>.quote-page:first-child .quote-table th{padding:5px 4px;font-size:7px}
  #quotationContent>.quote-page:first-child .quote-table td{padding:5px 4px;font-size:8px}
  #quotationContent>.quote-page:first-child .product{gap:5px;min-width:145px}
  #quotationContent>.quote-page:first-child .product-image-slot{width:30px;height:30px;flex-basis:30px;padding:2px}
  #quotationContent>.quote-page:first-child .product strong{font-size:9px}
  #quotationContent>.quote-page:first-child .product span,#quotationContent>.quote-page:first-child .product small{margin-top:1px;font-size:7.5px}
  #quotationContent>.quote-page:first-child .product-description{margin-top:2px;max-width:180px;font-size:7px;line-height:1.2}
  #quotationContent>.quote-page:first-child .silent-controller-note{margin-top:2px;font-size:7px;line-height:1.2}
  #quotationContent>.quote-page:first-child .totals{margin-top:4mm}
  #quotationContent>.quote-page:first-child .total-row{padding:6px 9px;font-size:9px}
  #quotationContent>.quote-page:first-child .total-row.grand{padding:7px 9px}
  #quotationContent>.quote-page:first-child .total-row.grand b{font-size:12px}
  #quotationContent>.quote-page:first-child .commercial-summary{gap:2mm;margin-top:4mm}
  #quotationContent>.quote-page:first-child .term-card{grid-template-columns:30mm 1fr;gap:2mm;padding:5px 7px;font-size:8.2px}
  #quotationContent>.quote-page:first-child .term-card span{font-size:7.5px}
  #quotationContent>.quote-page:first-child .term-card b{line-height:1.25}
  #quotationContent>.quote-page:first-child .quote-note{margin-top:3mm;padding:2.5mm;font-size:8px;line-height:1.3}
  #quotationContent>.quote-page:first-child .quote-note b{margin-bottom:2px;font-size:8px}
  #quotationContent>.quote-page:first-child .footer{padding-top:2mm;font-size:7px}
}
`;
    document.head.appendChild(style);
  }

  const normalize=value=>String(value??'').replace(/\s+/g,' ').trim().toUpperCase();
  function silentSpec(modelName){
    const target=normalize(modelName);
    return (root.VensisSPSilentPolicy20260908?.rows||[]).find(row=>normalize(row.altModel)===target)||null;
  }
  function decorateSilentRows(){
    document.querySelectorAll('#quotationProductTables tbody tr').forEach(row=>{
      const nameNode=row.querySelector('.product strong');
      const product=row.querySelector('.product>div');
      if(!nameNode||!product)return;
      const spec=silentSpec(nameNode.textContent);
      if(!spec?.speedControllerIncluded){
        row.querySelector('.silent-controller-note')?.remove();
        return;
      }
      let note=row.querySelector('.silent-controller-note');
      if(!note){
        note=document.createElement('span');
        note.className='silent-controller-note';
        note.style.display='block';
        note.style.color='#52666b';
        note.style.fontWeight='700';
        product.appendChild(note);
      }
      const value=`Hız Anahtarı / Speed Controller: ${spec.speedControllerIncluded}`;
      if(note.textContent!==value)note.textContent=value;
    });
  }

  function refresh(){
    try{root.VensisSPSilentPolicy20260908?.applyCatalog?.()}catch{}
    decorateSilentRows();
  }
  function start(){
    installPrintStyle();
    refresh();
    const target=document.getElementById('quotationProductTables');
    if(root.MutationObserver&&target){
      let queued=false;
      new root.MutationObserver(()=>{
        if(queued)return;
        queued=true;
        (root.requestAnimationFrame||root.setTimeout)(()=>{queued=false;refresh()},0);
      }).observe(target,{childList:true,subtree:true});
    }
    root.addEventListener?.('beforeprint',refresh);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);
