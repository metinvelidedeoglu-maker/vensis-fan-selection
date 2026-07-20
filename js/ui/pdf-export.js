(function(){
  const renderer=window.VensisDatasheet;
  if(!renderer?.html)return;

  function safeFilename(value){
    return String(value||'Vensis-Datasheet')
      .replace(/[\\/:*?"<>|]+/g,'-')
      .replace(/\s+/g,' ')
      .trim()||'Vensis-Datasheet';
  }

  function pdfRuntime(filename){
    const file=JSON.stringify(`${safeFilename(filename)}.pdf`);
    return `
      <style>
        #pdfPreparing{position:fixed;inset:0;z-index:99999;background:rgba(238,243,244,.96);display:none;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;color:#173033}
        #pdfPreparing .pdf-status{background:#fff;border:1px solid #d8e3e5;border-radius:12px;padding:20px 26px;box-shadow:0 10px 35px rgba(18,52,59,.16);font-weight:700;text-align:center;max-width:330px}
        #pdfPreparing small{display:block;margin-top:7px;color:#64748b;font-weight:400;line-height:1.35}
        body.pdf-exporting{background:#fff!important}
        body.pdf-exporting .toolbar{display:none!important}
        body.pdf-exporting .sheet{width:210mm!important;min-height:297mm!important;height:auto!important;margin:0!important;padding:10mm 10mm 8mm!important;box-shadow:none!important}
        body.pdf-exporting .hero{grid-template-columns:1.04fr .96fr!important}
        body.pdf-exporting .bottom-grid{grid-template-columns:1.08fr .92fr!important}
        body.pdf-exporting .point-summary{grid-template-columns:1fr 1fr!important}
        body.pdf-exporting .product-image{height:64mm!important}
        body.pdf-exporting .curve{height:91mm!important;padding:2mm!important}
      </style>
      <div id="pdfPreparing"><div class="pdf-status">PDF hazırlanıyor…<small>Dosya cihazınıza kaydedilecek.</small></div></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" integrity="sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
      <script>
        (function(){
          const filename=${file};
          const overlay=document.getElementById('pdfPreparing');
          const status=overlay.querySelector('.pdf-status');
          const waitForImages=()=>Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
          const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          let busy=false;

          async function createPdf(){
            if(busy)return;
            busy=true;
            overlay.style.display='flex';
            status.innerHTML='PDF hazırlanıyor…<small>Dosya cihazınıza kaydedilecek.</small>';
            let blank=null;

            try{
              if(!window.html2pdf)throw new Error('PDF library could not be loaded.');
              await waitForImages();
              if(document.fonts?.ready)await document.fonts.ready;

              const sheet=document.querySelector('.sheet');
              if(!sheet)throw new Error('Datasheet was not found.');

              document.body.classList.add('pdf-exporting');
              await nextFrame();

              const canvasWorker=window.html2pdf().set({
                html2canvas:{
                  scale:2,
                  useCORS:true,
                  allowTaint:false,
                  backgroundColor:'#ffffff',
                  scrollX:0,
                  scrollY:0,
                  windowWidth:Math.max(sheet.scrollWidth,794),
                  windowHeight:Math.max(sheet.scrollHeight,1123),
                  logging:false
                }
              }).from(sheet).toCanvas();

              const canvas=await canvasWorker.get('canvas');
              if(!canvas)throw new Error('Datasheet image could not be created.');

              blank=document.createElement('div');
              blank.style.width='1px';
              blank.style.height='1px';
              blank.style.position='fixed';
              blank.style.left='-10000px';
              document.body.appendChild(blank);

              const pdfWorker=window.html2pdf().set({
                margin:0,
                jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
                html2canvas:{scale:1,backgroundColor:'#ffffff',logging:false},
                pagebreak:{mode:[]}
              }).from(blank).toPdf();

              const pdf=await pdfWorker.get('pdf');
              if(!pdf)throw new Error('PDF document could not be created.');

              const pageWidth=210,pageHeight=297,margin=2;
              const usableWidth=pageWidth-margin*2,usableHeight=pageHeight-margin*2;
              const imageRatio=canvas.width/canvas.height;
              let drawWidth=usableWidth,drawHeight=drawWidth/imageRatio;
              if(drawHeight>usableHeight){drawHeight=usableHeight;drawWidth=drawHeight*imageRatio;}
              const drawX=(pageWidth-drawWidth)/2,drawY=(pageHeight-drawHeight)/2;

              pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',drawX,drawY,drawWidth,drawHeight,undefined,'FAST');
              pdf.setProperties({title:filename.replace(/\.pdf$/i,''),subject:'Vensis Product Datasheet',creator:'Vensis Engineering Suite'});
              pdf.save(filename);

              status.innerHTML='PDF kaydedildi.<small>Dosyayı İndirilenler klasöründe bulabilirsiniz.</small>';
              setTimeout(()=>window.close(),1200);
            }catch(error){
              console.error(error);
              busy=false;
              const message=String(error?.message||error||'Unknown error.');
              status.innerHTML='PDF kaydedilemedi.<small>'+message+'</small>';
              setTimeout(()=>{overlay.style.display='none';},2400);
            }finally{
              document.body.classList.remove('pdf-exporting');
              if(blank)blank.remove();
            }
          }

          window.saveVensisPdf=createPdf;
        })();
      </script>`;
  }

  renderer.save=function(payload){
    const productModel=payload?.model?.model||payload?.product?.model||payload?.model?.display||'Vensis-Datasheet';
    let documentHtml=renderer.html(payload)
      .replace('Print / Save PDF','Save as PDF')
      .replace('onclick="window.print()"','onclick="window.saveVensisPdf?window.saveVensisPdf():window.print()"');
    documentHtml=documentHtml.replace('</body>',pdfRuntime(productModel)+'</body>');
    const key='vensis_detail_'+Date.now();
    localStorage.setItem(key,documentHtml);
    window.open('detail.html?key='+encodeURIComponent(key),'_blank');
  };
  renderer.open=renderer.save;
})();
