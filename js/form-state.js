(function(){
  const timers=new WeakMap();
  const selector='input:not([type="hidden"]), textarea, select';

  function settle(el){
    el.classList.remove('form-editing');
    el.classList.add('form-settled');
  }

  function activate(el){
    el.classList.remove('form-settled');
    el.classList.add('form-editing');
    const old=timers.get(el);
    if(old)clearTimeout(old);
    timers.set(el,setTimeout(()=>settle(el),3000));
  }

  function bind(el){
    if(el.dataset.formStateBound==='1')return;
    el.dataset.formStateBound='1';
    settle(el);
    el.addEventListener('focus',()=>activate(el));
    el.addEventListener('input',()=>activate(el));
    el.addEventListener('change',()=>activate(el));
    el.addEventListener('blur',()=>settle(el));
  }

  function scan(root=document){
    root.querySelectorAll(selector).forEach(bind);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan());
  else scan();

  new MutationObserver(records=>{
    for(const record of records){
      record.addedNodes.forEach(node=>{
        if(node.nodeType!==1)return;
        if(node.matches?.(selector))bind(node);
        scan(node);
      });
    }
  }).observe(document.documentElement,{childList:true,subtree:true});
})();
