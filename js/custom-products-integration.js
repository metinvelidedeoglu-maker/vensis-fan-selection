(function(){
  'use strict';

  const PAGE=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  let applying=false;

  const copy={
    en:{
      title:'Custom Products',
      nav:'Custom Products',
      card:'Custom Products',
      cardText:'Pre-enter products once and reuse them in projects and quotations.',
      cardAction:'Open library →',
      footerKicker:'CUSTOM PRODUCT LIBRARY',
      footerTitle:'Add a saved product to this project',
      footerText:'Create new manual products in Custom Products. Here, choose from the saved library.',
      footerButton:'Add from Library',
      modalTitle:'Saved Custom Products'
    },
    tr:{
      title:'Özel Ürünler',
      nav:'Özel Ürünler',
      card:'Özel Ürünler',
      cardText:'Ürünleri bir kez önceden girin, proje ve tekliflerde tekrar kullanın.',
      cardAction:'Kütüphaneyi aç →',
      footerKicker:'ÖZEL ÜRÜN KÜTÜPHANESİ',
      footerTitle:'Kayıtlı ürünü bu projeye ekle',
      footerText:'Yeni manuel ürün girişini Özel Ürünler ekranından yapın. Burada kayıtlı kütüphaneden seçin.',
      footerButton:'Kütüphaneden Ekle',
      modalTitle:'Kayıtlı Özel Ürünler'
    }
  };

  function language(){
    return window.VensisI18n?.getLanguage?.()||(()=>{try{return localStorage.getItem('vensis_language_v1')==='tr'?'tr':'en'}catch{return 'en'}})();
  }
  function t(key){return (copy[language()]||copy.en)[key]||key}

  function mountHomeCard(){
    if(PAGE!=='index.html')return;
    const grid=document.querySelector('.workspace-grid');
    if(!grid)return;
    let card=grid.querySelector('a[href="custom-products.html"]');
    if(!card){
      card=document.createElement('a');
      card.className='workspace-card';
      card.href='custom-products.html';
      card.dataset.customProductsCard='1';
      card.innerHTML='<span class="workspace-no">05</span><div class="workspace-symbol">＋</div><h3></h3><p></p><b></b>';
      grid.appendChild(card);
    }
    card.querySelector('h3').textContent=t('card');
    card.querySelector('p').textContent=t('cardText');
    card.querySelector('b').textContent=t('cardAction');
  }

  function mountNavLink(){
    if(PAGE==='custom-products.html')return;
    document.querySelectorAll('.nav,.catalog-nav').forEach(nav=>{
      if(nav.closest('.vensis-language-switch'))return;
      let link=nav.querySelector('a[href="custom-products.html"]');
      if(!link){
        link=document.createElement('a');
        link.href='custom-products.html';
        link.dataset.customProductsNav='1';
        nav.appendChild(link);
      }
      link.textContent=t('nav');
    });
  }

  function decorateProject(){
    if(PAGE!=='project.html')return;
    const footer=document.querySelector('.custom-product-footer');
    if(!footer)return;
    const kicker=footer.querySelector('div span');
    const title=footer.querySelector('div b');
    const small=footer.querySelector('div small');
    const button=footer.querySelector('#addCustomProduct');
    if(kicker)kicker.textContent=t('footerKicker');
    if(title)title.textContent=t('footerTitle');
    if(small)small.textContent=t('footerText');
    if(button)button.textContent=t('footerButton');
  }

  function forceLibraryMode(){
    if(PAGE!=='project.html')return;
    const modal=document.getElementById('customProductModal');
    if(!modal||modal.hidden)return;
    const form=document.getElementById('customProductForm');
    const tabs=document.getElementById('customLibraryTabs');
    const formTab=tabs?.querySelector('[data-custom-tab="form"]');
    const libraryTab=tabs?.querySelector('[data-custom-tab="library"]');
    const grid=form?.querySelector('.custom-grid');
    const actions=form?.querySelector('.custom-actions');
    const pane=document.getElementById('customLibraryPane');
    if(formTab)formTab.hidden=true;
    if(libraryTab){libraryTab.hidden=false;libraryTab.click()}
    if(grid)grid.hidden=true;
    if(actions)actions.hidden=true;
    if(pane)pane.hidden=false;
    const title=document.getElementById('customProductTitle');
    if(title)title.textContent=t('modalTitle');
  }

  function forceEditMode(){
    if(PAGE!=='project.html')return;
    const modal=document.getElementById('customProductModal');
    if(!modal||modal.hidden)return;
    const form=document.getElementById('customProductForm');
    const tabs=document.getElementById('customLibraryTabs');
    const pane=document.getElementById('customLibraryPane');
    const grid=form?.querySelector('.custom-grid');
    const actions=form?.querySelector('.custom-actions');
    tabs?.querySelectorAll('[data-custom-tab]').forEach(button=>button.hidden=true);
    if(pane)pane.hidden=true;
    if(grid)grid.hidden=false;
    if(actions)actions.hidden=false;
  }

  function apply(){
    if(applying)return;
    applying=true;
    try{mountHomeCard();mountNavLink();decorateProject()}finally{applying=false}
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('#addCustomProduct'))setTimeout(forceLibraryMode,0);
    if(event.target.closest('[data-edit-product]'))setTimeout(forceEditMode,0);
  },true);

  window.addEventListener('vensis-language-changed',()=>{apply();if(PAGE==='project.html'&&!document.getElementById('customProductModal')?.hidden)decorateProject()});

  function start(){
    apply();
    const observer=new MutationObserver(()=>apply());
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
