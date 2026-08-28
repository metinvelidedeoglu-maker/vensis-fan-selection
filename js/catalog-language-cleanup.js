(function(){
  'use strict';

  const pairs=new Map([
    ['Back to Series','Serilere Dön'],
    ['← Back to Series','← Serilere Dön'],
    ['View Series →','Seriyi Gör →'],
    ['Curve available · selection ready','Eğri mevcut · seçime hazır'],
    ['Available · selection ready','Mevcut · seçime hazır'],
    ['Catalog only','Yalnızca katalog'],
    ['Catalog Only','Yalnızca Katalog'],
    ['Catalog Operating Points','Katalog Çalışma Noktaları'],
    ['Dimension Drawing','Ölçü Çizimi'],
    ['Safety:','Güvenlik:'],
    ['No data','Veri yok']
  ]);
  const reverse=new Map([...pairs.entries()].map(([en,tr])=>[tr,en]));
  let applying=false;

  function language(){
    return window.VensisI18n?.getLanguage?.()||(()=>{try{return localStorage.getItem('vensis_language_v1')||'en'}catch{return 'en'}})();
  }

  function translate(value,lang=language()){
    const text=String(value||'').trim();
    if(!text)return text;
    const en=reverse.get(text)||text;
    return lang==='tr'?(pairs.get(en)||text):en;
  }

  function setNodeText(node){
    if(!node)return;
    const current=String(node.textContent||'').trim();
    const next=translate(current);
    if(next!==current)node.textContent=next;
  }

  function apply(root=document){
    if(applying)return;
    applying=true;
    try{
      const scope=root?.querySelectorAll?root:document;
      scope.querySelectorAll('.detail-back,.series-card-footer span,.model-catalog-only,.model-operating-title,.model-dimension summary,.model-safety-warning b,.empty-note,.empty-state').forEach(setNodeText);

      scope.querySelectorAll('.model-field').forEach(field=>{
        const label=field.querySelector('span');
        const value=field.querySelector('b');
        if(!label||!value)return;
        const labelText=String(label.textContent||'').trim();
        if(labelText==='Performance Curve'||labelText==='Performans Eğrisi')setNodeText(value);
      });
    }finally{applying=false}
  }

  function start(){
    apply(document);
    const observer=new MutationObserver(mutations=>{
      if(applying)return;
      for(const mutation of mutations){
        for(const node of mutation.addedNodes){
          if(node.nodeType===1)apply(node);
          else if(node.nodeType===3)apply(node.parentElement||document);
        }
      }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    window.addEventListener('vensis-language-changed',()=>apply(document));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
