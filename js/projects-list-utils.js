(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.VensisProjectListUtils=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  function text(value){return String(value??'').trim()}
  function dateValue(project){
    const created=Date.parse(project?.createdAt||'');
    if(Number.isFinite(created))return created;
    const updated=Date.parse(project?.updatedAt||'');
    return Number.isFinite(updated)?updated:0;
  }
  function dateFor(project){return new Date(dateValue(project))}
  function datePart(value){return String(value).padStart(2,'0')}
  function projectCode(project){
    const date=dateFor(project);
    const stamp=dateValue(project)>0?`${date.getFullYear()}${datePart(date.getMonth()+1)}${datePart(date.getDate())}`:'00000000';
    const idPart=text(project?.id).split('_').pop().replace(/[^a-z0-9]/gi,'').toUpperCase().slice(-6).padStart(6,'0');
    return `PRJ-${stamp}-${idPart}`;
  }
  function monthKey(project){
    const value=dateValue(project);
    if(!value)return '';
    const date=new Date(value);
    return `${date.getFullYear()}-${datePart(date.getMonth()+1)}`;
  }
  function searchKey(value){
    return text(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
  }
  function matchesSearch(project,query){
    const needle=searchKey(query);
    if(!needle)return true;
    return [project?.name,project?.reference].some(value=>searchKey(value).includes(needle));
  }
  function filterAndSort(projects,options={}){
    const month=text(options.month);
    const query=text(options.query);
    return (Array.isArray(projects)?projects:[])
      .filter(project=>(!month||monthKey(project)===month)&&matchesSearch(project,query))
      .slice()
      .sort((left,right)=>dateValue(right)-dateValue(left)||text(left?.name).localeCompare(text(right?.name),'tr'));
  }
  function availableMonths(projects){
    return [...new Set((Array.isArray(projects)?projects:[]).map(monthKey).filter(Boolean))].sort().reverse();
  }
  return {availableMonths,dateValue,filterAndSort,matchesSearch,monthKey,projectCode,searchKey};
});
