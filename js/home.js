(function(){
  'use strict';
  const projects=window.VensisProjects;
  const customers=window.VensisCustomers;
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const t=value=>window.VensisI18n?.t?.(value)||value;
  const language=()=>window.VensisI18n?.getLanguage?.()||'en';
  const statuses=[['draft','Draft','#7c8d90'],['quoted','Quoted','#4877c2'],['won','Won','#d39c21'],['ordered','Ordered','#078453'],['lost','Lost','#c55a53']];

  function projectData(){
    return (projects?.list?.()||[]).map(project=>{
      const meta=projects.readMeta(project.id)||{};
      const items=projects.readItems(project.id)||[];
      const units=items.filter(item=>item?.included!==false).reduce((sum,item)=>sum+Math.max(1,Number(item?.quantity)||1),0);
      const net=items.filter(item=>item?.included!==false).reduce((sum,item)=>{
        const quantity=Math.max(1,Number(item?.quantity)||1);
        const price=Math.max(0,Number(item?.price)||0);
        const discount=item?.discountPercent==null?Math.max(0,Number(meta.globalDiscount)||0):Math.max(0,Number(item.discountPercent)||0);
        return sum+(price*quantity*(1-Math.min(100,discount)/100));
      },0);
      return {...project,name:meta.name||project.name||t('Untitled Project'),reference:meta.reference||project.reference||'',status:meta.status||project.status||'draft',units,net};
    });
  }
  function money(value){return new Intl.NumberFormat(language()==='tr'?'tr-TR':'en-US',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0)}
  function date(value){try{return new Intl.DateTimeFormat(language()==='tr'?'tr-TR':'en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value))}catch{return '-'}}
  function setText(selector,value){const element=$(selector);if(element)element.textContent=value}

  function render(){
    const rows=projectData();
    const customerRows=customers?.list?.()||[];
    const units=rows.reduce((sum,row)=>sum+row.units,0);
    const pipeline=rows.reduce((sum,row)=>sum+row.net,0);
    const active=rows.filter(row=>!['ordered','lost'].includes(row.status)).length;
    setText('#homeProjectCount',rows.length);
    setText('#homeActiveProjects',`${active} ${t('active')}`);
    setText('#homeCustomerCount',customerRows.length);
    setText('#homeUnitCount',units);
    setText('#homePipeline',money(pipeline));
    setText('#homeDate',new Intl.DateTimeFormat(language()==='tr'?'tr-TR':'en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date()));

    const recent=$('#homeRecentProjects');
    if(recent)recent.innerHTML=rows.length?rows.slice(0,5).map(row=>`<a class="recent-row" href="${esc(projects.projectUrl(row.id))}"><div class="recent-main"><b>${esc(row.name)}</b><span>${esc(row.reference||t('No customer or reference entered'))} · ${esc(date(row.updatedAt))}</span></div><div class="recent-units">${row.units} ${esc(t('units'))}</div><span class="status-pill" data-status="${esc(row.status)}">${esc(t(statuses.find(item=>item[0]===row.status)?.[1]||'Draft'))}</span><span class="recent-arrow">›</span></a>`).join(''):`<div class="home-empty">${esc(t('No projects yet'))}<br>${esc(t('Create your first project to start adding products.'))}</div>`;

    const status=$('#homeStatusOverview');
    if(status){
      const maximum=Math.max(1,...statuses.map(([key])=>rows.filter(row=>row.status===key).length));
      status.innerHTML=statuses.map(([key,label,color])=>{
        const count=rows.filter(row=>row.status===key).length;
        const width=count?Math.max(7,Math.round(count/maximum*100)):0;
        return `<div class="status-line" style="--bar-color:${color};--bar-width:${width}%"><div class="status-line-head"><span><i></i>${esc(t(label))}</span><b>${count}</b></div><div class="status-track"><i></i></div></div>`;
      }).join('');
    }
  }

  window.addEventListener('vensis-projects-updated',render);
  window.addEventListener('vensis-project-cloud-applied',render);
  window.addEventListener('vensis-customers-updated',render);
  window.addEventListener('vensis-language-changed',render);
  render();
})();
