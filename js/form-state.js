(function(){
  const timers=new WeakMap();
  const selector='input:not([type="hidden"]), textarea, select';

  function settle(element){
    element.classList.remove('form-editing');
    element.classList.add('form-settled');
  }

  function activate(element){
    element.classList.remove('form-settled');
    element.classList.add('form-editing');
    const timer=timers.get(element);
    if(timer)clearTimeout(timer);
    timers.set(element,setTimeout(()=>settle(element),3000));
  }

  function bind(element){
    settle(element);
    element.addEventListener('focus',()=>activate(element));
    element.addEventListener('input',()=>activate(element));
    element.addEventListener('change',()=>activate(element));
    element.addEventListener('blur',()=>settle(element));
  }

  function init(){document.querySelectorAll(selector).forEach(bind)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();