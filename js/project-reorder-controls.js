(function(){
  'use strict';

  const BUILD='20260905-r1';
  const page=(location.pathname||'').toLowerCase();
  if(!page.endsWith('/project.html'))return;

  const isTr=()=>String(document.documentElement.lang||'').toLowerCase().startsWith('tr');
  const labels=()=>isTr()
    ?{header:'Sıra',up:'Yukarı taşı',down:'Aşağı taşı'}
    :{header:'Order',up:'Move up',down:'Move down'};
  const projectId=()=>window.VensisProject?.projectId||window.VensisProjects?.activeId?.()||'';
  const itemKind=item=>window.VensisQuotationFormats?.itemType?.(item)==='electrical'?'electrical':'fan';

  function ensureStyles(){
    if(document.getElementById('projectReorderControlsStyles'))return;
    const style=document.createElement('style');
    style.id='projectReorderControlsStyles';
    style.textContent=`
      .project-reorder-column{width:68px;min-width:68px;text-align:center!important}
      .project-reorder-controls{display:flex;align-items:center;justify-content:center;gap:4px}
      .project-reorder-button{width:29px;height:29px;border:1px solid #d4dfdc;border-radius:7px;background:#edf3f3;color:#29484d;font:900 15px/1 Arial,Helvetica,sans-serif;cursor:pointer}
      .project-reorder-button:hover:not(:disabled){border-color:#8db9a6;background:#edf7f2;color:#087f4f}
      .project-reorder-button:focus-visible{outline:3px solid rgba(8,127,79,.16);outline-offset:1px}
      .project-reorder-button:disabled{opacity:.32;cursor:not-allowed}
    `;
    document.head.appendChild(style);
  }

  function enhanceTable(table){
    const text=labels();
    const headRow=table.querySelector('thead tr');
    if(!headRow)return;
    let header=headRow.querySelector('[data-project-reorder-header]');
    if(!header){
      header=document.createElement('th');
      header.className='project-reorder-column';
      header.dataset.projectReorderHeader='1';
      headRow.prepend(header);
    }
    if(header.textContent!==text.header)header.textContent=text.header;

    const rows=[...table.querySelectorAll('tbody tr[data-project-edit-row]')];
    rows.forEach((row,position)=>{
      let cell=row.querySelector(':scope > td[data-project-reorder-cell]');
      if(!cell){
        cell=document.createElement('td');
        cell.className='project-reorder-column';
        cell.dataset.projectReorderCell='1';
        cell.innerHTML='<div class="project-reorder-controls"><button type="button" class="project-reorder-button" data-project-reorder="-1">↑</button><button type="button" class="project-reorder-button" data-project-reorder="1">↓</button></div>';
        row.prepend(cell);
      }
      const up=cell.querySelector('[data-project-reorder="-1"]');
      const down=cell.querySelector('[data-project-reorder="1"]');
      if(up){
        up.disabled=position===0;
        up.title=text.up;
        up.setAttribute('aria-label',text.up);
      }
      if(down){
        down.disabled=position===rows.length-1;
        down.title=text.down;
        down.setAttribute('aria-label',text.down);
      }
    });
  }

  function enhance(){
    ensureStyles();
    document.querySelectorAll('.project-edit-table').forEach(enhanceTable);
  }

  function move(index,direction){
    const store=window.VensisProjects;
    const id=projectId();
    if(!store?.readItems||!store?.writeItems||!id)return;

    window.VensisProjectPrint?.flushInlineEditors?.();
    const items=store.readItems(id);
    if(!Array.isArray(items)||!items[index])return;

    const kind=itemKind(items[index]);
    const peers=[];
    items.forEach((item,itemIndex)=>{if(itemKind(item)===kind)peers.push(itemIndex)});
    const position=peers.indexOf(index);
    const targetPosition=position+direction;
    if(position<0||targetPosition<0||targetPosition>=peers.length)return;

    const target=peers[targetPosition];
    [items[index],items[target]]=[items[target],items[index]];
    const stamp=new Date().toISOString();
    if(items[index])items[index].updatedAt=stamp;
    if(items[target])items[target].updatedAt=stamp;
    store.writeItems(items,id);
    window.VensisProject?.render?.();
    schedule();
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;enhance()});
  }

  function start(){
    ensureStyles();
    schedule();
    const root=document.getElementById('projectContent')||document.body;
    new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-project-reorder]');
      if(!button)return;
      const row=button.closest('[data-project-edit-row]');
      const index=Number(row?.dataset.projectEditRow);
      const direction=Number(button.dataset.projectReorder);
      if(!Number.isInteger(index)||(direction!==-1&&direction!==1))return;
      event.preventDefault();
      event.stopPropagation();
      move(index,direction);
    });
    window.addEventListener('vensis-language-changed',schedule);
    window.VensisProjectReorder={build:BUILD,refresh:schedule,move};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
