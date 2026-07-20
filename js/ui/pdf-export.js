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
        #pdfPreparing{position:fixed;inset:0;z-index:99999;background:#eef3f4;display:flex;align-items:center;justify-content:center;font-family:Arial,Helvetica,sans-serif;color:#173033}
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
      </style>
      <div id="pdfPreparing"><div class="pdf-status">PDF hazırlanıyor…<small>Dosya cihazınıza kaydedilecek.</small></div></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" integrity="sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
      <script>
        (function(){
          const filename=${file};
          const status=document.querySelector('#pdfPreparing .pdf-status');
          const waitForImages=()=>Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
          const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
          let busy=false;

          async function createPdf(){
            if(busy)return;
            busy=true;
            try{
              if(!window.html2canvas||!window.jspdf?.jsPDF)throw new Error('PDF library could not be loaded.');
              if(status)status.innerHTML='PDF hazırlanıyor…<small>Dosya cihazınıza kaydedilecek.</small>';
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

              const {jsPDF}=window.jspdf;
              const pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
              const pageWidth=210,pageHeight=297,margin=2;
              const usableWidth=pageWidth-margin*2,usableHeight=pageHeight-margin*2;
              const imageRatio=canvas.width/canvas.height;
              let drawWidth=usableWidth,drawHeight=drawWidth/imageRatio;
              if(drawHeight>usableHeight){drawHeight=usableHeight;drawWidth=drawHeight*imageRatio;}
              const drawX=(pageWidth-drawWidth)/2,drawY=(pageHeight-drawHeight)/2;

              pdf.addImage(canvas.toDataURL('image/jpeg',0.98),'JPEG',drawX,drawY,drawWidth,drawHeight,undefined,'FAST');
              pdf.setProperties({title:filename.replace(/\.pdf$/i,''),subject:'Vensis Product Datasheet',creator:'Vensis Engineering Suite'});

              const blob=pdf.output('blob');
              const url=URL.createObjectURL(blob);
              const link=document.createElement('a');
              link.href=url;
              link.download=filename;
              link.style.display='none';
              document.body.appendChild(link);
              link.click();

              if(status)status.innerHTML='PDF kaydedildi.<small>Dosyayı İndirilenler klasöründe bulabilirsiniz.</small>';
              setTimeout(()=>{link.remove();URL.revokeObjectURL(url)},30000);
              setTimeout(()=>window.close(),1800);
            }catch(error){
              console.error(error);
              busy=false;
              document.body.classList.remove('pdf-exporting');
              document.getElementById('pdfPreparing').style.display='none';
              if(status)status.innerHTML='PDF otomatik kaydedilemedi.<small>Save as PDF düğmesine tekrar dokunun.</small>';
              alert('PDF kaydedilemedi. Save as PDF düğmesine tekrar dokunun.');
            }
          }

          window.saveVensisPdf=createPdf;
          window.addEventListener('load',()=>setTimeout(createPdf,180));
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
