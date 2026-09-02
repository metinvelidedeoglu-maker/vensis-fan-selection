(function(){
  'use strict';

  const DESKTOP='(min-width: 1101px)';
  const media=window.matchMedia(DESKTOP);
  const page=(location.pathname||'').toLowerCase();
  const config=page.endsWith('/project.html')
    ?{
      workspace:'.project-workspace',panel:'.project-editor',head:'.project-editor-head',
      key:'vensis_project_editor_collapsed_v1',kind:'project'
    }
    :page.endsWith('/quotation.html')
      ?{
        workspace:'.quotation-workspace',panel:'.quotation-editor',head:'.quotation-editor-head',
        key:'vensis_quotation_editor_collapsed_v1',kind:'quotation'
      }
      :null;
  if(!config)return;

  function readState(){
    try{return localStorage.getItem(config.key)==='1'}catch{return false}
  }
  function writeState(value){
    try{localStorage.setItem(config.key,value?'1':'0')}catch{}
  }
  function isTr(){return String(document.documentElement.lang||'').toLowerCase().startsWith('tr')}
  function labels(collapsed){
    if(config.kind==='project'){
      return isTr()
        ?(collapsed?{label:'Proje editörünü aç',title:'Proje editörünü aç'}:{label:'Proje editörünü kapat',title:'Proje editörünü kapat'})
        :(collapsed?{label:'Open project editor',title:'Open project editor'}:{label:'Close project editor',title:'Close project editor'});
    }
    return isTr()
      ?(collapsed?{label:'Teklif editörünü aç',title:'Teklif editörünü aç'}:{label:'Teklif editörünü kapat',title:'Teklif editörünü kapat'})
      :(collapsed?{label:'Open quotation editor',title:'Open quotation editor'}:{label:'Close quotation editor',title:'Close quotation editor'});
  }
  function installStyle(){
    if(document.getElementById('vensisDesktopEditorToggleStyle'))return;
    const style=document.createElement('style');
    style.id='vensisDesktopEditorToggleStyle';
    style.textContent=`
      .vensis-editor-toggle{display:none}
      @media (min-width:1101px){
        .project-workspace,.quotation-workspace{transition:grid-template-columns .18s ease}
        .project-editor-head,.quotation-editor-head{position:relative;padding-right:62px}
        .vensis-editor-toggle{display:inline-flex;position:absolute;top:14px;right:14px;width:38px;height:38px;align-items:center;justify-content:center;border:1px solid #c8d7d3;border-radius:10px;background:#fff;color:#087f4f;font:900 25px/1 Arial,Helvetica,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(23,48,51,.08);z-index:2}
        .vensis-editor-toggle:hover{background:#edf7f2;border-color:#87b9a4}
        .vensis-editor-toggle:focus-visible{outline:3px solid rgba(8,127,79,.18);outline-offset:2px}
        .project-workspace.vensis-editor-collapsed,.quotation-workspace.vensis-editor-collapsed{grid-template-columns:64px minmax(0,1fr)!important}
        .project-editor.vensis-editor-collapsed,.quotation-editor.vensis-editor-collapsed{max-height:64px;overflow:hidden}
        .project-editor.vensis-editor-collapsed> :not(.project-editor-head),.quotation-editor.vensis-editor-collapsed> :not(.quotation-editor-head){display:none!important}
        .project-editor.vensis-editor-collapsed .project-editor-head,.quotation-editor.vensis-editor-collapsed .quotation-editor-head{height:64px;min-height:64px;padding:12px;display:flex;align-items:center;justify-content:center;border-bottom:0}
        .project-editor.vensis-editor-collapsed .project-editor-head> :not(.vensis-editor-toggle),.quotation-editor.vensis-editor-collapsed .quotation-editor-head> :not(.vensis-editor-toggle){display:none!important}
        .project-editor.vensis-editor-collapsed .vensis-editor-toggle,.quotation-editor.vensis-editor-collapsed .vensis-editor-toggle{position:static;flex:0 0 38px}
      }
    `;
    document.head.appendChild(style);
  }

  function start(){
    const workspace=document.querySelector(config.workspace);
    const panel=document.querySelector(config.panel);
    const head=panel?.querySelector(config.head);
    if(!workspace||!panel||!head)return;
    if(head.querySelector('.vensis-editor-toggle'))return;

    installStyle();
    let collapsed=readState();
    const button=document.createElement('button');
    button.type='button';
    button.className='vensis-editor-toggle';
    button.setAttribute('aria-expanded','true');
    head.appendChild(button);

    function apply(){
      const active=media.matches&&collapsed;
      workspace.classList.toggle('vensis-editor-collapsed',active);
      panel.classList.toggle('vensis-editor-collapsed',active);
      button.textContent=active?'›':'‹';
      button.setAttribute('aria-expanded',String(!active));
      const copy=labels(active);
      button.setAttribute('aria-label',copy.label);
      button.title=copy.title;
    }
    button.addEventListener('click',()=>{
      if(!media.matches)return;
      collapsed=!collapsed;
      writeState(collapsed);
      apply();
    });
    const onMediaChange=()=>apply();
    if(typeof media.addEventListener==='function')media.addEventListener('change',onMediaChange);
    else if(typeof media.addListener==='function')media.addListener(onMediaChange);
    window.addEventListener('vensis-language-changed',apply);
    apply();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
