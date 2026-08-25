(function(){
  'use strict';
  const BUILD='20260825-r11';
  function load(src,id){
    if(document.getElementById(id)) return;
    const s=document.createElement('script');
    s.id=id;
    s.src=src+'?v='+BUILD;
    document.head.appendChild(s);
  }
  load('js/suite-shell.js','vensisSuiteShellScript');
  load('js/project-nav-core.js','vensisProjectNavCoreScript');
})();
