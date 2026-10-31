(function(){
  function addStyles(){
    if(document.getElementById('projectProductSourcesStyles'))return;
    const style=document.createElement('style');
    style.id='projectProductSourcesStyles';
    style.textContent=`.project-product-sources{margin-top:15px;padding:18px 20px;border:1px dashed #a8c2b7;border-radius:18px;background:linear-gradient(135deg,#fff,#f2faf6);box-shadow:0 2px 8px rgba(23,48,51,.05)}.project-product-sources-head span{display:block;color:#087f4f;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.project-product-sources-head b{display:block;margin-top:4px;font-size:17px}.project-product-sources-head small{display:block;margin-top:4px;color:#64748b}.project-product-source-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:15px}.project-product-source{display:grid;grid-template-columns:42px 1fr;gap:11px;align-items:center;min-height:78px;padding:13px;border:1px solid #d8e5df;border-radius:13px;background:#fff;color:#173033;text-align:left;text-decoration:none;cursor:pointer}.project-product-source:hover{border-color:#8fbda8;background:#f8fcfa;transform:translateY(-1px);box-shadow:0 8px 18px rgba(23,48,51,.07)}.project-product-source .source-icon{display:flex;width:42px;height:42px;align-items:center;justify-content:center;border-radius:11px;background:#edf7f2;color:#087f4f;font-size:22px;font-weight:900}.project-product-source b,.project-product-source small{display:block}.project-product-source b{font-size:14px}.project-product-source small{margin-top:3px;color:#64748b;font-size:11px;line-height:1.35}.project-product-source.custom-source{font:inherit}.project-product-source.custom-source .source-icon{background:#eaf4f7;color:#0f6f86}.project-product-source.catalog-source{cursor:default;align-items:start}.project-product-source.catalog-source:hover{transform:none;box-shadow:none;background:#fff;border-color:#d8e5df}.catalog-source-content{min-width:0}.catalog-source-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}.catalog-source-link{display:flex;align-items:center;justify-content:center;min-height:34px;padding:8px 9px;border:1px solid #cfe0d8;border-radius:9px;background:#f4faf7;color:#087f4f;text-decoration:none;font-size:11px;font-weight:900;text-align:center}.catalog-source-link:hover{border-color:#087f4f;background:#edf8f3}.catalog-source-link.electrical{background:#f2f7fa;color:#0f6f86;border-color:#d4e3e8}.catalog-source-link.electrical:hover{border-color:#0f6f86;background:#eaf4f7}@media(max-width:820px){.project-product-source-grid{grid-template-columns:1fr}}@media(max-width:420px){.catalog-source-links{grid-template-columns:1fr}}@media print{.project-product-sources{display:none!important}}`;
    document.head.appendChild(style);
  }
  function mount(event){
    const project=window.VensisProject;
    const footer=document.querySelector('.custom-product-footer,.project-product-sources');
    if(!project?.projectId||!footer)return;
    addStyles();
    const projectId=encodeURIComponent(project.projectId);
    footer.className='project-product-sources';
    const requested=event?.detail?.language||event?.detail?.lang;
    const routeLanguage=window.location?.pathname?.match(/^\/(tr|en)\//)?.[1];
    const tr=(requested||routeLanguage||window.VensisI18n?.getLanguage?.()||document.documentElement.lang)==='tr';
    const catalogUrl=`/${tr?'tr':'en'}/catalog-hub.html?project=${projectId}`;
    footer.innerHTML=`<div class="project-product-sources-head"><span>${tr?'Ürün Ekle':'Add Products'}</span><b>${tr?'Ürün kaynağını seçin':'Choose a product source'}</b><small>${tr?'Seçtiğiniz ürünler bu projeye eklenecek.':'Selected products will be added to this project.'}</small></div><div class="project-product-source-grid"><a class="project-product-source" href="fan-selection.html?project=${projectId}"><span class="source-icon">⌕</span><span><b>${tr?'Fan Seçimi':'Fan Selection'}</b><small>${tr?'Debi ve basınca göre fan seçin.':'Select a fan using airflow and pressure.'}</small></span></a><a class="project-product-source" href="${catalogUrl}"><span class="source-icon">▦</span><span><b>${tr?'Katalogdan Ekle':'Add from Catalog'}</b><small>${tr?'Ana katalogdaki tüm ürün gruplarını inceleyin.':'Browse all product groups in the main catalog.'}</small></span></a><button id="addCustomProduct" class="project-product-source custom-source" type="button"><span class="source-icon">+</span><span><b>${tr?'Projeye Özel Ürün':'Project-specific Product'}</b><small>${tr?'Bu proje için ürün bilgilerini elle girin.':'Enter product details for this project.'}</small></span></button></div>`;
    footer.querySelector('#addCustomProduct')?.addEventListener('click',()=>project.openProductEditor?.());
    const emptyLink=document.querySelector('#projectEmpty a');
    if(emptyLink)emptyLink.href=`fan-selection.html?project=${projectId}`;
    const catalogNav=document.querySelector('.nav a[href^="catalog.html"]');
    if(catalogNav)catalogNav.href=`catalog-hub.html?project=${projectId}`;
  }
  window.addEventListener('vensis-language-changed',mount);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
