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
      </style>
      <div id="pdfPreparing"><div class="pdf-status">PDF hazırlanıyor…<small>Chrome PDF görüntüleyicisinde açılacak.</small></div></div>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" integrity="sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
      <script>
        (function(){
          const filename=${file};
          const status=document.querySelector('#pdfPreparing .pdf-status');
          const waitForImages=()=>Promise.all([...document.images].map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})})));
          async function createPdf(){
            try{
              if(!window.html2pdf)throw new Error('PDF library could not be loaded.');
              await waitForImages();
              if(document.fonts?.ready)await document.fonts.ready;
              const sheet=document.querySelector('.sheet');
              if(!sheet)throw new Error('Datasheet was not found.');
              const options={
                margin:0,
                filename,
                image:{type:'jpeg',quality:0.98},
                html2canvas:{scale:2,useCORS:true,allowTaint:false,backgroundColor:'#ffffff',scrollX:0,scrollY:0,windowWidth:sheet.scrollWidth},
                jsPDF:{unit:'mm',format:'a4',orientation:'portrait',compress:true},
                pagebreak:{mode:['avoid-all','css','legacy']}
              };
              const worker=window.html2pdf().set(options).from(sheet).toPdf();
              const pdf=await worker.get('pdf');
              pdf.setProperties({title:filename.replace(/\.pdf$/i,''),subject:'Vensis Product Datasheet',creator:'Vensis Engineering Suite'});
              const blob=pdf.output('blob');
              const url=URL.createObjectURL(blob);
              window.location.replace(url);
            }catch(error){
              console.error(error);
              document.getElementById('pdfPreparing').style.display='none';
              if(status)status.innerHTML='PDF otomatik oluşturulamadı.<small>Üstteki Print / Save PDF düğmesini kullanabilirsiniz.</small>';
              alert('PDF otomatik oluşturulamadı. Sayfadaki Print / Save PDF düğmesini kullanabilirsiniz.');
            }
          }
          window.addEventListener('load',()=>setTimeout(createPdf,120));
        })();
      </script>`;
  }

  renderer.open=function(payload){
    const productModel=payload?.model?.model||payload?.product?.model||payload?.model?.display||'Vensis-Datasheet';
    let documentHtml=renderer.html(payload);
    documentHtml=documentHtml.replace('</body>',pdfRuntime(productModel)+'</body>');
    const key='vensis_detail_'+Date.now();
    localStorage.setItem(key,documentHtml);
    window.open('detail.html?key='+encodeURIComponent(key),'_blank');
  };
})();
