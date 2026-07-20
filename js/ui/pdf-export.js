(function(){
  const renderer=window.VensisDatasheet;
  if(!renderer?.html)return;

  function safeFilename(value){
    return String(value||'Vensis-Datasheet')
      .replace(/[\\/:*?"<>|]+/g,'-')
      .replace(/\s+/g,' ')
      .trim()||'Vensis-Datasheet';
  }

  function printRuntime(filename){
    const title=JSON.stringify(`${safeFilename(filename)}.pdf`);
    return `
      <style>
        @page{size:A4 portrait;margin:0}
        @media print{
          html,body{width:210mm!important;height:297mm!important;margin:0!important;padding:0!important;background:#fff!important;overflow:hidden!important}
          .toolbar{display:none!important}
          .sheet{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:10mm 10mm 8mm!important;box-shadow:none!important;overflow:hidden!important}
          .hero{display:grid!important;grid-template-columns:1.04fr .96fr!important;gap:8mm!important;align-items:center!important}
          .bottom-grid{display:grid!important;grid-template-columns:1.08fr .92fr!important;gap:5mm!important}
          .point-summary{display:grid!important;grid-template-columns:1fr 1fr!important}
          .product-image{height:64mm!important}
          .curve{height:91mm!important;padding:2mm!important}
        }
      </style>
      <script>
        (function(){
          const filename=${title};
          window.saveVensisPdf=function(){
            document.title=filename;
            requestAnimationFrame(()=>setTimeout(()=>window.print(),80));
          };
        })();
      </script>`;
  }

  renderer.save=function(payload){
    const productModel=payload?.model?.model||payload?.product?.model||payload?.model?.display||'Vensis-Datasheet';
    let documentHtml=renderer.html(payload)
      .replace('Print / Save PDF','Save as PDF')
      .replace('onclick="window.print()"','onclick="window.saveVensisPdf()"');
    documentHtml=documentHtml.replace('</body>',printRuntime(productModel)+'</body>');
    const key='vensis_detail_'+Date.now();
    localStorage.setItem(key,documentHtml);
    window.open('detail.html?key='+encodeURIComponent(key),'_blank');
  };

  renderer.open=renderer.save;
})();
