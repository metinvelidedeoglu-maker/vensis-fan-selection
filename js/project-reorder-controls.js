(function(){
  'use strict';

  const BUILD='20260905-r3';
  const page=(location.pathname||'').toLowerCase();
  if(!page.endsWith('/project.html'))return;

  const isTr=()=>String(document.documentElement.lang||'').toLowerCase().startsWith('tr');
  const labels=()=>isTr()
    ?{header:'Sıra',up:'Yukarı taşı',down:'Aşağı taşı'}
    :{header:'Order',up:'Move up',down:'Move down'};
  const projectId=()=>window.VensisProject?.projectId||window.VensisProjects?.activeId?.()||'';
  const itemKind=item=>window.VensisQuotationFormats?.itemType?.(item)==='electrical'?'electrical':'fan';
  const scrollPositions=new Map();

  function scrollKey(node){
    const group=node?.closest?.('.project-edit-group');
    if(group?.classList.contains('project-edit-electrical'))return 'electrical';
    if(group?.classList.contains('project-edit-fan'))return 'fan';
    return 'default';
  }

  function rememberScroll(node){
    if(!node?.classList?.contains('project-edit-scroll'))return;
    scrollPositions.set(scrollKey(node),node.scrollLeft||0);
  }

  function restoreScroll(table){
    const scroll=table.closest('.project-edit-scroll');
    if(!scroll)return;
    const key=scrollKey(scroll);
    if(!scrollPositions.has(key))return;
    const left=scrollPositions.get(key)||0;
    if(scroll.scrollLeft!==left)scroll.scrollLeft=left;
  }

  function ensureStyles(){
    if(document.getElementById('projectReorderControlsStyles'))return;
    const style=document.createElement('style');
    style.id='projectReorderControlsStyles';
    style.textContent=`
      .project-reorder-column{width:34px!important;min-width:34px!important;max-width:34px!important;padding:4px 3px!important;text-align:center!important}
      .project-reorder-controls{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
      .project-reorder-button{width:24px;height:22px;padding:0;border:1px solid #d4dfdc;border-radius:5px;background:#edf3f3;color:#29484d;font:900 12px/1 Arial,Helvetica,sans-serif;cursor:pointer}
      .project-reorder-button:hover:not(:disabled){border-color:#8db9a6;background:#edf7f2;color:#087f4f}
      .project-reorder-button:focus-visible{outline:2px solid rgba(8,127,79,.16);outline-offset:1px}
      .project-reorder-button:disabled{opacity:.32;cursor:not-allowed}

      .project-edit-fan .project-edit-table{min-width:1510px!important}
      .project-edit-fan th:nth-child(n+4):nth-child(-n+12){white-space:normal!important;line-height:1.15;padding-left:6px!important;padding-right:6px!important}
      .project-edit-fan th:nth-child(4),.project-edit-fan td:nth-child(4),
      .project-edit-fan th:nth-child(5),.project-edit-fan td:nth-child(5){width:136px!important;min-width:136px!important;max-width:136px!important}
      .project-edit-fan th:nth-child(6),.project-edit-fan td:nth-child(6){width:96px!important;min-width:96px!important;max-width:96px!important}
      .project-edit-fan th:nth-child(7),.project-edit-fan td:nth-child(7),
      .project-edit-fan th:nth-child(8),.project-edit-fan td:nth-child(8){width:94px!important;min-width:94px!important;max-width:94px!important}
      .project-edit-fan th:nth-child(9),.project-edit-fan td:nth-child(9){width:86px!important;min-width:86px!important;max-width:86px!important}
      .project-edit-fan th:nth-child(10),.project-edit-fan td:nth-child(10){width:84px!important;min-width:84px!important;max-width:84px!important}
      .project-edit-fan th:nth-child(11),.project-edit-fan td:nth-child(11){width:96px!important;min-width:96px!important;max-width:96px!important}
      .project-edit-fan th:nth-child(12),.project-edit-fan td:nth-child(12){width:80px!important;min-width:80px!important;max-width:80px!important}
      .project-edit-fan td:nth-child(n+4):nth-child(-n+12){padding-left:5px!important;padding-right:5px!important}
      .project-edit-fan td:nth-child(4) .project-point-editor,
      .project-edit-fan td:nth-child(5) .project-point-editor{min-width:126px!important}
      .project-edit-fan td:nth-child(4) .project-inline-input,
      .project-edit-fan td:nth-child(5) .project-inline-input{min-width:122px!important}
      .project-edit-fan td:nth-child(6) .project-inline-input,
      .project-edit-fan td:nth-child(7) .project-inline-input,
      .project-edit-fan td:nth-child(8) .project-inline-input{min-width:84px!important}
      .project-edit-fan td:nth-child(9) .project-list-price{min-width:72px!important;padding-left:7px!important;padding-right:7px!important}
      .project-edit-fan td:nth-child(10) .project-inline-input,
      .project-edit-fan td:nth-child(11) .project-inline-input{min-width:70px!important}
      .project-edit-fan td:nth-child(12) .project-inline-input{min-width:68px!important}
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
    header.title=text.header;

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
    restoreScroll(table);
  }

  function enhance(){
    ensureStyles();
    document.querySelectorAll('.project-edit-table').forEach(enhanceTable);
  }

  function move(index,direction){
    const store=window.VensisProjects;
    const id=projectId();
    if(!store?.readItems||!store?.writeItems||!id)return;

    document.querySelectorAll('.project-edit-scroll').forEach(rememberScroll);
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
    document.addEventListener('scroll',event=>rememberScroll(event.target),true);
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
