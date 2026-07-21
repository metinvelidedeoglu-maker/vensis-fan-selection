(function(){
  function addStyles(){
    if(document.getElementById('projectProductSourcesStyles'))return;
    const style=document.createElement('style');
    style.id='projectProductSourcesStyles';
    style.textContent=`.project-product-sources{margin-top:15px;padding:18px 20px;border:1px dashed #a8c2b7;border-radius:18px;background:linear-gradient(135deg,#fff,#f2faf6);box-shadow:0 2px 8px rgba(23,48,51,.05)}.project-product-sources-head span{display:block;color:#087f4f;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.project-product-sources-head b{display:block;margin-top:4px;font-size:17px}.project-product-sources-head small{display:block;margin-top:4px;color:#64748b}.project-product-source-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:15px}.project-product-source{display:grid;grid-template-columns:42px 1fr;gap:11px;align-items:center;min-height:78px;padding:13px;border:1px solid #d8e5df;border-radius:13px;background:#fff;color:#173033;text-align:left;text-decoration:none;cursor:pointer}.project-product-source:hover{border-color:#8fbda8;background:#f8fcfa;transform:translateY(-1px);box-shadow:0 8px 18px rgba(23,48,51,.07)}.project-product-source .source-icon{display:flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:11px;background:#edf7f2;color:#087f4f;font-size:22px;font-weight:900}.project-product-source b,.project-product-source small{display:block}.project-product-source b{font-size:14px}.project-product-source small{margin-top:3px;color:#64748b;font-size:11px;line-height:1.35}.project-product-source.custom-source{font:inherit}.project-product-source.custom-source .source-icon{background:#eaf4f7;color:#0f6f86}@media(max-width:820px){.project-product-source-grid{grid-template-columns:1fr}}@media print{.project-product-sources{display:none!important}}`;
    document.head.appendChild(style);
  }
  function mount(){
    const project=window.VensisProject;
    const footer=document.querySelector('.custom-product-footer');
    if(!project?.projectId||!footer)return;
    addStyles();
    const projectId=encodeURIComponent(project.projectId);
    footer.className='project-product-sources';
    footer.innerHTML=`<div class="project-product-sources-head"><span>Add Products</span><b>Choose a product source</b><small>Products selected from either screen will return to this project as the default destination.</small></div><div class="project-product-source-grid"><a class="project-product-source" href="index.html?project=${projectId}"><span class="source-icon">⌕</span><span><b>Select from Fan Selection</b><small>Choose a fan from airflow and pressure requirements.</small></span></a><a class="project-product-source" href="catalog.html?project=${projectId}"><span class="source-icon">▦</span><span><b>Add from Product Catalog</b><small>Browse a series and add a catalog model.</small></span></a><button id="addCustomProduct" class="project-product-source custom-source" type="button"><span class="source-icon">+</span><span><b>Add Custom Product</b><small>Enter a product that is not available in the database.</small></span></button></div>`;
    footer.querySelector('#addCustomProduct')?.addEventListener('click',()=>project.openProductEditor?.());
    const emptyLink=document.querySelector('#projectEmpty a');
    if(emptyLink)emptyLink.href=`index.html?project=${projectId}`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();