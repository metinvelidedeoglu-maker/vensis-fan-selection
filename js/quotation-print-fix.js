(function(){
  let printing=false;
  async function waitForImages(){
    const images=[...document.images];
    await Promise.race([
      Promise.all(images.map(img=>{
        if(img.complete)return Promise.resolve();
        return new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})});
      })),
      new Promise(resolve=>setTimeout(resolve,1800))
    ]);
  }
  async function safePrint(){
    if(printing)return;
    printing=true;
    const button=document.querySelector('.toolbar .primary');
    const oldText=button?.textContent||'';
    if(button){button.disabled=true;button.textContent='Preparing...'}
    try{
      await waitForImages();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      window.print();
    }finally{
      setTimeout(()=>{printing=false;if(button){button.disabled=false;button.textContent=oldText}},500);
    }
  }
  function install(){
    const button=document.querySelector('.toolbar .primary');
    if(!button)return;
    button.onclick=safePrint;
    window.safeQuotationPrint=safePrint;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();