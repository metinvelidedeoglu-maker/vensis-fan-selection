(function(){
  function apply(){
    const projectId=new URLSearchParams(location.search).get('project');
    const store=window.VensisProjects;
    const select=document.getElementById('projectDestinationSelect');
    if(!projectId||!store?.get?.(projectId)||!select)return false;
    select.value=projectId;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function start(){
    if(apply())return;
    let attempts=0;
    const timer=setInterval(()=>{attempts+=1;if(apply()||attempts>=20)clearInterval(timer)},50);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();