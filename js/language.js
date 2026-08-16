(function(){
  'use strict';

  const STORAGE_KEY='vensis_language_v1';
  const DEFAULT_LANGUAGE='en';

  const translations={
    'Fan Selection':'Fan Seçimi',
    '⌕ Fan Selection':'⌕ Fan Seçimi',
    'Open Fan Selection':'Fan Seçimini Aç',
    'Product Catalog':'Ürün Kataloğu',
    '▦ Product Catalog':'▦ Ürün Kataloğu',
    'Open Product Catalog':'Ürün Kataloğunu Aç',
    'Projects':'Projeler',
    '▣ Projects':'▣ Projeler',
    'Open Projects':'Projeleri Aç',
    'View Projects':'Projeleri Gör',
    'Selection Workspace':'Seçim Çalışma Alanı',
    'Airflow / Pressure':'Debi / Basınç',
    'Flow (m³/h)':'Debi (m³/h)',
    'Flow':'Debi',
    'Airflow':'Debi',
    'Enter airflow':'Debi girin',
    'Airflow tolerance':'Debi toleransı',
    'Minimum airflow tolerance':'Minimum debi toleransı',
    'Maximum airflow tolerance':'Maksimum debi toleransı',
    'Pressure (Pa)':'Basınç (Pa)',
    'Pressure':'Basınç',
    'Enter pressure':'Basınç girin',
    'Pressure tolerance':'Basınç toleransı',
    'Minimum pressure tolerance':'Minimum basınç toleransı',
    'Maximum pressure tolerance':'Maksimum basınç toleransı',
    'Product Filter':'Ürün Filtresi',
    'Category':'Kategori',
    'Search category...':'Kategori ara...',
    'Brand':'Marka',
    'Model':'Model',
    'Search model or product code...':'Model veya ürün kodu ara...',
    'Reset':'Sıfırla',
    'Find Fans':'Fanları Bul',
    'Matching Fans':'Uygun Fanlar',
    'Enter flow and pressure values to begin.':'Başlamak için debi ve basınç değerlerini girin.',
    'No matching fan found for these conditions.':'Bu koşullara uygun fan bulunamadı.',
    'Closest Match':'En Yakın Eşleşme',
    'Filters':'Filtreler',
    'Manufacturer':'Üretici',
    'Reset Filters':'Filtreleri Sıfırla',
    'Series':'Seri',
    '＋ Add Product':'＋ Ürün Ekle',
    'Add Product':'Ürün Ekle',
    'Specifications':'Teknik Özellikler',
    'Specification':'Teknik Özellik',
    'Performance':'Performans',
    'Dimensions':'Ölçüler',
    'Dimension':'Ölçü',
    'Operating Points':'Çalışma Noktaları',
    'Operating Point':'Çalışma Noktası',
    'Datasheet':'Teknik Föy',
    'Technical Datasheet':'Teknik Föy',
    'View datasheet':'Teknik föyü görüntüle',
    'Back to Catalog':'Kataloğa Dön',
    'Project Destination':'Proje Hedefi',
    'Add selected fans to a project':'Seçilen fanları bir projeye ekleyin',
    'Select project destination':'Proje hedefini seçin',
    'A new project will be created when you add the first fan.':'İlk fanı eklediğinizde yeni bir proje oluşturulacaktır.',
    'Selected Project':'Seçilen Proje',
    'Open Project':'Projeyi Aç',
    'Add to selected project':'Seçilen projeye ekle',
    'Datasheet renderer is unavailable.':'Teknik föy görüntüleyici kullanılamıyor.',
    'Create, select and manage project workspaces.':'Proje çalışma alanlarını oluşturun, seçin ve yönetin.',
    '+ New Project':'+ Yeni Proje',
    'New Project':'Yeni Proje',
    'Untitled Project':'Adsız Proje',
    'Total Projects':'Toplam Proje',
    'Total Units':'Toplam Adet',
    'Combined Net Value':'Toplam Net Tutar',
    'Search':'Ara',
    'Search project or company':'Proje veya firma ara',
    'Project Month':'Proje Ayı',
    'All months':'Tüm aylar',
    'Showing all projects':'Tüm projeler gösteriliyor',
    'No projects yet':'Henüz proje yok',
    'Create your first project to start adding products.':'Ürün eklemeye başlamak için ilk projenizi oluşturun.',
    'Create Project':'Proje Oluştur',
    'No matching projects':'Eşleşen proje yok',
    'Try another project name, company or month.':'Başka bir proje adı, firma veya ay deneyin.',
    'Clear Filters':'Filtreleri Temizle',
    'Create a separate workspace for products, pricing and quotation settings.':'Ürünler, fiyatlandırma ve teklif ayarları için ayrı bir çalışma alanı oluşturun.',
    'Project Name':'Proje Adı',
    'Enter project name':'Proje adını girin',
    'Customer / Reference':'Müşteri / Referans',
    'Enter customer or reference':'Müşteri veya referans girin',
    'Contact Person / İlgili':'İlgili Kişi',
    'Contact Person':'İlgili Kişi',
    'Enter contact person':'İlgili kişiyi girin',
    'Cancel':'İptal',
    'Draft':'Taslak',
    'Quoted':'Teklif Verildi',
    'Won':'Kazanıldı',
    'Ordered':'Sipariş Verildi',
    'Lost':'Kaybedildi',
    'Cloud synced':'Bulut senkronize',
    '☁ Cloud synced':'☁ Bulut senkronize',
    'Syncing…':'Senkronize ediliyor…',
    '☁ Syncing…':'☁ Senkronize ediliyor…',
    'Sync error':'Senkronizasyon hatası',
    '⚠ Sync error':'⚠ Senkronizasyon hatası',
    'Browser only':'Yalnızca tarayıcı',
    '☁ Browser only':'☁ Yalnızca tarayıcı',
    'Project cloud status':'Proje bulut durumu',
    'Checking cloud storage…':'Bulut depolama kontrol ediliyor…',
    'Saving projects to cloud…':'Projeler buluta kaydediliyor…',
    'Syncing browser projects with cloud…':'Tarayıcı projeleri bulutla senkronize ediliyor…',
    'Cloud connection failed; projects remain in this browser.':'Bulut bağlantısı kurulamadı; projeler bu tarayıcıda kalacak.',
    'Browser only — sign in to sync.':'Yalnızca tarayıcı — senkronizasyon için giriş yapın.',
    'Sync failed; your projects are still safe in this browser.':'Senkronizasyon başarısız; projeleriniz bu tarayıcıda güvende.',
    'All Projects':'Tüm Projeler',
    '← All Projects':'← Tüm Projeler',
    'Back to Projects':'Projelere Dön',
    'Project Workspace':'Proje Çalışma Alanı',
    'Project Details':'Proje Bilgileri',
    'Project Status':'Proje Durumu',
    'Status':'Durum',
    'Save':'Kaydet',
    'Saved':'Kaydedildi',
    'Saving…':'Kaydediliyor…',
    'Print Project':'Projeyi Yazdır',
    'Print Quotation':'Teklifi Yazdır',
    'Quotation':'Teklif',
    'Create Quotation':'Teklif Oluştur',
    'Commercial Quotation':'Ticari Teklif',
    'Print / PDF':'Yazdır / PDF',
    'PDF / Print':'PDF / Yazdır',
    'Preview':'Önizleme',
    'Order Form':'Sipariş Formu',
    'Clear Project':'Projeyi Temizle',
    'Project Discount':'Proje İskontosu',
    'Apply one discount rate to all products':'Tüm ürünlere tek iskonto oranı uygulayın',
    'An individual product discount replaces the project discount for that product. Percentages are never added together.':'Ürüne özel iskonto varsa proje iskontosunun yerine geçer. İskonto oranları birbiriyle toplanmaz.',
    'Project discount percentage':'Proje iskonto yüzdesi',
    'Apply to All':'Tümüne Uygula',
    'Quantity':'Adet',
    'Qty':'Adet',
    'Unit Price':'Birim Fiyat',
    'List Price':'Liste Fiyatı',
    'List Price (€)':'Liste Fiyatı (€)',
    'Price (€)':'Fiyat (€)',
    'Total':'Toplam',
    'Net Total':'Net Toplam',
    'Discount':'İskonto',
    'Global Discount':'Genel İskonto',
    'Net Unit Price':'Net Birim Fiyat',
    'Product':'Ürün',
    'Product / Free Note':'Ürün / Serbest Not',
    'Product / Model':'Ürün / Model',
    'Selected / Nominal':'Seçilen / Nominal',
    'Selected / Nominal Airflow (m³/h)':'Seçilen / Nominal Debi (m³/h)',
    'Required':'İstenen',
    'Required / Source':'İstenen / Kaynak',
    'Power':'Güç',
    'Motor Power':'Motor Gücü',
    'Motor Power (kW)':'Motor Gücü (kW)',
    'Speed':'Devir',
    'Speed (rpm)':'Devir (rpm)',
    'Noise':'Ses',
    'Noise dB(A)':'Ses dB(A)',
    'Voltage':'Gerilim',
    'Frequency':'Frekans',
    'Current':'Akım',
    'Current (A)':'Akım (A)',
    'Order':'Sıra',
    'Actions':'İşlemler',
    'Remove':'Kaldır',
    'Edit':'Düzenle',
    'No products added yet':'Henüz ürün eklenmedi',
    'Add fans from Fan Selection, Product Catalog or the custom product form below.':'Fan Seçimi, Ürün Kataloğu veya aşağıdaki özel ürün formundan ürün ekleyin.',
    'Manual Project Item':'Manuel Proje Kalemi',
    'Add a product outside the selection database':'Seçim veritabanı dışından ürün ekleyin',
    'The product will be added at the bottom of the current project list.':'Ürün mevcut proje listesinin sonuna eklenecektir.',
    'Project Product Editor':'Proje Ürün Editörü',
    'Add Custom Product':'Özel Ürün Ekle',
    'Enter a product that is not available in the selection program.':'Seçim programında bulunmayan bir ürünü girin.',
    'Series / Type':'Seri / Tip',
    'Free Description':'Serbest Açıklama',
    'Add a project-specific description, option, material, accessory or note.':'Projeye özel açıklama, opsiyon, malzeme, aksesuar veya not ekleyin.',
    'Image URL (optional)':'Görsel URL (opsiyonel)',
    'Add to Project':'Projeye Ekle',
    'Quotation Total':'Teklif Toplamı',
    'Quotation Scope':'Teklif Kapsamı',
    'Commercial Terms':'Ticari Şartlar',
    'Page 1 / 3':'Sayfa 1 / 3',
    'Page 2 / 3':'Sayfa 2 / 3',
    'Page 3 / 3':'Sayfa 3 / 3',
    'Back to Project':'Projeye Dön',
    '← Back to Project':'← Projeye Dön',
    'No quotation found':'Teklif bulunamadı',
    'Return to the project and choose Print Quotation.':'Projeye dönüp Teklifi Yazdır seçeneğini kullanın.',
    'Main Page':'Ana Sayfa',
    'Send by Email':'E-posta ile Gönder',
    'Send Project Report':'Proje Raporunu Gönder',
    'Company Name':'Firma Adı',
    'To':'Kime',
    'Subject':'Konu',
    'Message':'Mesaj',
    'Your email application will open with these details.':'E-posta uygulamanız bu bilgilerle açılacaktır.',
    'Please enter an email address.':'Lütfen bir e-posta adresi girin.',
    'Order Management':'Sipariş Yönetimi',
    'New Order':'Yeni Sipariş',
    '+ New Order':'+ Yeni Sipariş',
    'Order Form Editor':'Sipariş Formu Editörü',
    'Edit company, delivery conditions and products to be ordered.':'Firma, teslim koşulları ve siparişe girecek ürünleri düzenleyin.',
    'Order No':'Sipariş No',
    'Order Date':'Sipariş Tarihi',
    'Ordering Company':'Sipariş Veren',
    'Recipient Type':'Alıcı Türü',
    'Supplier':'Tedarikçi',
    'Company':'Firma',
    'Contact':'Yetkili',
    'Email':'E-posta',
    'Delivery Time':'Teslim Süresi',
    'Delivery Place':'Teslim Yeri',
    'Payment Terms':'Ödeme Şekli',
    'Order Note':'Sipariş Notu',
    'Order Items':'Sipariş Kalemleri',
    'Save Draft':'Taslağı Kaydet',
    'Order Sent':'Sipariş Verildi',
    'Purchase Order':'Sipariş Formu',
    'Order Information':'Sipariş Bilgileri',
    'Source Quotation':'Kaynak Teklif',
    'Supplier / Project':'Tedarikçi / Proje',
    'Project':'Proje',
    'Line':'Sıra',
    'Product / Model / Technical Description':'Ürün / Model / Teknik Açıklama',
    'Electrical / Motor':'Elektrik / Motor',
    'Total Quantity':'Toplam Adet',
    'Ordered By':'Siparişi Veren',
    'Received By':'Siparişi Alan',
    'No order form found':'Sipariş formu bulunamadı',
    'Return to the project and recreate the order form.':'Projeye dönüp sipariş formunu yeniden oluşturun.',
    'Notes':'Notlar',
    'Note':'Not',
    'Description':'Açıklama',
    'Technical Description':'Teknik Açıklama',
    'Model Code':'Model Kodu',
    'Product Code':'Ürün Kodu',
    'Project No':'Proje No',
    'Quotation No':'Teklif No',
    'Reference':'Referans',
    'Customer':'Müşteri',
    'Date':'Tarih',
    'Close':'Kapat',
    'Product details could not be opened.':'Ürün detayları açılamadı.',
    'No product key received.':'Ürün anahtarı alınamadı.',
    'Product detail data was not found.':'Ürün detay verisi bulunamadı.'
  };

  const reverse=Object.create(null);
  Object.keys(translations).forEach(key=>{if(!reverse[translations[key]])reverse[translations[key]]=key});

  const ignoredParents=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','CODE','PRE']);
  const attributes=['placeholder','title','aria-label'];
  let currentLanguage=readLanguage();
  let observer=null;
  let applying=false;

  function readLanguage(){
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      return saved==='tr'||saved==='en'?saved:DEFAULT_LANGUAGE;
    }catch{return DEFAULT_LANGUAGE}
  }

  function canonical(value){
    const clean=String(value||'').trim();
    if(!clean)return clean;
    if(Object.prototype.hasOwnProperty.call(translations,clean))return clean;
    if(Object.prototype.hasOwnProperty.call(reverse,clean))return reverse[clean];
    return clean;
  }

  function translateExact(value,lang=currentLanguage){
    const source=canonical(value);
    if(lang==='tr'&&Object.prototype.hasOwnProperty.call(translations,source))return translations[source];
    return source;
  }

  const dynamicPairs=[
    {
      en:/^(\d+) matching fans?$/i,
      tr:/^(\d+) uygun fan$/i,
      enOut:m=>`${m[1]} matching fans`,
      trOut:m=>`${m[1]} uygun fan`
    },
    {
      en:/^Showing (\d+) of (\d+) projects$/i,
      tr:/^(\d+) \/ (\d+) proje gösteriliyor$/i,
      enOut:m=>`Showing ${m[1]} of ${m[2]} projects`,
      trOut:m=>`${m[1]} / ${m[2]} proje gösteriliyor`
    },
    {
      en:/^(\d+) products?$/i,
      tr:/^(\d+) ürün$/i,
      enOut:m=>`${m[1]} products`,
      trOut:m=>`${m[1]} ürün`
    },
    {
      en:/^(\d+) models?$/i,
      tr:/^(\d+) model$/i,
      enOut:m=>`${m[1]} models`,
      trOut:m=>`${m[1]} model`
    },
    {
      en:/^Page (\d+) \/ (\d+)$/i,
      tr:/^Sayfa (\d+) \/ (\d+)$/i,
      enOut:m=>`Page ${m[1]} / ${m[2]}`,
      trOut:m=>`Sayfa ${m[1]} / ${m[2]}`
    },
    {
      en:/^(\d+) units in project$/i,
      tr:/^Projede (\d+) adet$/i,
      enOut:m=>`${m[1]} units in project`,
      trOut:m=>`Projede ${m[1]} adet`
    },
    {
      en:/^Selected fans will be added to (.+)\.$/i,
      tr:/^Seçilen fanlar (.+) projesine eklenecek\.$/i,
      enOut:m=>`Selected fans will be added to ${m[1]}.`,
      trOut:m=>`Seçilen fanlar ${m[1]} projesine eklenecek.`
    },
    {
      en:/^(.+) quantity increased\.$/i,
      tr:/^(.+) adedi artırıldı\.$/i,
      enOut:m=>`${m[1]} quantity increased.`,
      trOut:m=>`${m[1]} adedi artırıldı.`
    },
    {
      en:/^Catalog model added to (.+)\.$/i,
      tr:/^Katalog modeli (.+) projesine eklendi\.$/i,
      enOut:m=>`Catalog model added to ${m[1]}.`,
      trOut:m=>`Katalog modeli ${m[1]} projesine eklendi.`
    }
  ];

  function translatePattern(value,lang=currentLanguage){
    const text=String(value||'').trim();
    if(!text)return text;
    const exact=translateExact(text,lang);
    if(exact!==text||Object.prototype.hasOwnProperty.call(translations,text)||Object.prototype.hasOwnProperty.call(reverse,text))return exact;
    for(const pair of dynamicPairs){
      let match=text.match(pair.en);
      if(match)return lang==='tr'?pair.trOut(match):pair.enOut(match);
      match=text.match(pair.tr);
      if(match)return lang==='tr'?pair.trOut(match):pair.enOut(match);
    }
    return text;
  }

  function replaceTrimmed(original,replacement){
    const text=String(original||'');
    const start=text.match(/^\s*/)?.[0]||'';
    const end=text.match(/\s*$/)?.[0]||'';
    return start+replacement+end;
  }

  function translateTextNode(node){
    if(!node||node.nodeType!==Node.TEXT_NODE||ignoredParents.has(node.parentElement?.tagName))return;
    const clean=String(node.nodeValue||'').trim();
    if(!clean)return;
    const next=translatePattern(clean,currentLanguage);
    if(next!==clean)node.nodeValue=replaceTrimmed(node.nodeValue,next);
  }

  function translateAttributes(element){
    if(!element||element.nodeType!==Node.ELEMENT_NODE)return;
    attributes.forEach(name=>{
      if(!element.hasAttribute(name))return;
      const value=element.getAttribute(name)||'';
      const next=translatePattern(value,currentLanguage);
      if(next!==value)element.setAttribute(name,next);
    });
  }

  function apply(root=document){
    if(applying)return;
    applying=true;
    try{
      document.documentElement.lang=currentLanguage;
      if(root.nodeType===Node.TEXT_NODE){translateTextNode(root);return}
      if(root.nodeType===Node.ELEMENT_NODE)translateAttributes(root);
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
      let node;
      while((node=walker.nextNode())){
        if(node.nodeType===Node.TEXT_NODE)translateTextNode(node);
        else translateAttributes(node);
      }
      updateSelector();
    }finally{applying=false}
  }

  function setLanguage(lang){
    if(lang!=='en'&&lang!=='tr')return;
    currentLanguage=lang;
    try{localStorage.setItem(STORAGE_KEY,lang)}catch{}
    apply(document.body||document);
    window.dispatchEvent(new CustomEvent('vensis-language-changed',{detail:{language:lang}}));
  }

  function selectorTarget(){
    return document.querySelector('.app-nav,.catalog-nav,.nav,.toolbar');
  }

  function mountSelector(){
    if(document.getElementById('vensisLanguageSwitch')){updateSelector();return}
    const target=selectorTarget();
    if(!target)return;
    if(!document.getElementById('vensisLanguageStyles')){
      const style=document.createElement('style');
      style.id='vensisLanguageStyles';
      style.textContent='.vensis-language-switch{display:inline-flex;align-items:center;gap:2px;min-height:36px;padding:3px;border:1px solid #cbdad4;border-radius:9px;background:#fff;white-space:nowrap}.vensis-language-switch button{min-width:36px!important;min-height:28px!important;border:0!important;border-radius:6px!important;padding:5px 8px!important;background:transparent!important;color:#52666b!important;font:800 11px Arial,Helvetica,sans-serif!important;cursor:pointer!important;box-shadow:none!important}.vensis-language-switch button.active{background:#087f4f!important;color:#fff!important}.vensis-language-switch button:focus-visible{outline:2px solid #087f4f;outline-offset:1px}@media print{.vensis-language-switch{display:none!important}}';
      document.head.appendChild(style);
    }
    const wrap=document.createElement('div');
    wrap.id='vensisLanguageSwitch';
    wrap.className='vensis-language-switch';
    wrap.setAttribute('aria-label','Language / Dil');
    wrap.innerHTML='<button type="button" data-lang="en" aria-label="English">EN</button><button type="button" data-lang="tr" aria-label="Türkçe">TR</button>';
    wrap.addEventListener('click',event=>{
      const button=event.target.closest('[data-lang]');
      if(button)setLanguage(button.dataset.lang);
    });
    target.appendChild(wrap);
    updateSelector();
  }

  function updateSelector(){
    const wrap=document.getElementById('vensisLanguageSwitch');
    if(!wrap)return;
    wrap.querySelectorAll('[data-lang]').forEach(button=>{
      const active=button.dataset.lang===currentLanguage;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function observe(){
    if(observer||!document.body)return;
    observer=new MutationObserver(mutations=>{
      if(applying)return;
      let shouldMount=false;
      mutations.forEach(mutation=>{
        if(mutation.type==='characterData')translateTextNode(mutation.target);
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType===Node.TEXT_NODE)translateTextNode(node);
          else if(node.nodeType===Node.ELEMENT_NODE){apply(node);shouldMount=true}
        });
        if(mutation.type==='attributes'&&mutation.target)translateAttributes(mutation.target);
      });
      if(shouldMount&&!document.getElementById('vensisLanguageSwitch'))mountSelector();
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  }

  function init(){
    apply(document.body||document);
    mountSelector();
    observe();
  }

  window.VensisI18n={
    setLanguage,
    getLanguage:()=>currentLanguage,
    t:(value,lang=currentLanguage)=>translatePattern(value,lang),
    apply,
    translations
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
