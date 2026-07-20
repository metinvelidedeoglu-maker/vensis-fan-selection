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
        #pdfPreparing .pdf-status{background:#fff;border:1px solid #d8e3e5;border-radius:12px;padding:20px 26px;box-shadow:0 10px 35px rgba(18,52,59,.16);font-weight:700;text-align:center}
        #pdfPreparing small{display:block;margin-top:7px;color:#64748b;font-weight:400}
        body.pdf-exporting{background:#fff!important}
        body.pdf-exporting .toolbar{display:none!important}
        body.pdf-exporting .sheet{width:210mm!important;min-height:297mm!important;height:auto!important;margin:0!important;padding:10mm 10mm 8mm!important;box-shadow:none!important}
        body.pdf-exporting .hero{grid-template-columns:1.04fr .96fr!important}
        body.pdf-exporting .bottom-grid{grid-template-columns:1.08fr .92fr!important}
        body.pdf-exporting .point-summary{grid-template-columns:1fr 1fr!important}
        body.pdf-exporting .product-image{height:64mm!important}
        body.pdf-exporting .curve{height:91mm!important;padding:2mm!important}
        .pdf-a4-stage{position:fixed;left:-100000px;top:0;width:794px;height:1123px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}
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
            let stage=null;

            try{
              if(!window.html2pdf||!window.html2canvas)throw new Error('PDF library could not be loaded.');
              await waitForImages();
              if(document.fonts?.ready)await document.fonts.ready;

              const sheet=document.querySelector('.sheet');
              if(!sheet)throw new Error('Datasheet was not found.');

              document.body.classList.add('pdf-exporting');
              await nextFrame();

              const canvas=await window.html2canvas(sheet,{
                scale:2,
                useCORS:true,
                allowTaint:false,
                backgroundColor:'#ffffff',
                scrollX:0,
                scrollY:0,
                width:sheet.scrollWidth,
                height:sheet.scrollHeight,
                windowWidth:Math.max(sheet.scrollWidth,794),
                windowHeight:Math.max(sheet.scrollHeight,1123),
                logging:false
              });

              stage=document.createElement('div');
              stage.className='pdf-a4-stage';
              const image=document.createElement('img');
              image.src=canvas.toDataURL('image/jpeg',0.98);
              const scale=Math.min(794/canvas.width,1123/canvas.height);
              image.width=Math.max(1,Math.floor(canvas.width*scale));
              image.height=Math.max(1,Math.floor(canvas.height*scale));
              image.style.display='block';
              stage.appendChild(image);
              document.body.appendChild(stage);
              await new Promise(resolve=>{if(image.complete)resolve();else{image.onload=resolve;image.onerror=resolve;}});

              await window.html2pdf().set({
                margin:0,
                filename,
                image:{type:'jpeg',quality:0.98},
                html2canvas:{scale:1,useCORS:true,backgroundColor:'#ffffff',logging:false},
                jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
                pagebreak:{mode:[]}
              }).from(stage).save();

              status.innerHTML='PDF kaydedildi.<small>Dosyayı İndirilenler klasöründe bulabilirsiniz.</small>';
              setTimeout(()=>window.close(),1200);
            }catch(error){
              console.error(error);
              busy=false;
              status.innerHTML='PDF kaydedilemedi.<small>İnternet bağlantısını kontrol edip tekrar deneyin.</small>';
              setTimeout(()=>{overlay.style.display='none';},1800);
              alert('PDF kaydedilemedi. İnternet bağlantısını kontrol edip tekrar deneyin.');
            }finally{
              document.body.classList.remove('pdf-exporting');
              if(stage)stage.remove();
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
