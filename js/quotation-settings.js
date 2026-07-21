(function(){
  const KEY='vensis_quotation_settings_v1';
  const ACTIVE_KEY='vensis_active_quotation_v1';
  const DEFAULTS={
    summary:{
      payment:'Siparişte peşin',
      exchangeRate:'Fatura tarihindeki Türkiye Vakıflar Bankası Euro satış kuru esas alınacaktır.',
      validity:'7 gün',
      deliveryPlace:'AVENS depo teslim',
      vat:'Fiyatlarımıza KDV dahil değildir.',
      commissioning:'Devreye alma hizmeti teklif fiyatına dahil değildir.',
      quotationNote:'Teklifimiz tarafımıza iletilen keşif ve teknik bilgilere göre hazırlanmıştır. Teklif edilen ürünlerin proje ve uygulama koşullarına uygunluğunun müşteri tarafından kontrol edilmesi gerekmektedir.'
    },
    scope:{
      included:'Teklifimiz, birinci sayfadaki ürün tablosunda model ve adetleri açıkça belirtilen cihaz ve ekipmanların satışını kapsamaktadır.\n\nTeklifte yazılı olarak belirtilmeyen ürün, aksesuar, hizmet ve saha uygulamaları teklif kapsamına dahil değildir.',
      exclusions:[
        'Cihaz ve ekipmanların sahada montaj işçiliği.',
        'Ana elektrik beslemesi, güç ve MCC panoları ile her türlü kablolama işi.',
        'Fan montajı için gerekli somun, cıvata, dübel, konsol ve ankraj malzemelerinin temini.',
        'Nakliye, vinç, indirme ve saha içi taşıma hizmetleri; teklifte ayrıca belirtilmedikçe.',
        'Teklif tablosunda açıkça belirtilmeyen aksesuar, otomasyon elemanı ve cihazlar.',
        'Devreye alma, saha testi, balans kontrolü ve otomasyon bağlantıları.'
      ],
      deliveryControl:[
        'Teslim süreleri iş günü olarak değerlendirilir; cumartesi, pazar ve resmî tatiller süreye dahil değildir.',
        'Ürünler teslim alınırken ambalaj, hasar ve eksik adet açısından kontrol edilmelidir.',
        'Teslim sonrasında oluşabilecek depolama, taşıma ve montaj kaynaklı hasarlar müşteri sorumluluğundadır.'
      ],
      suitability:'Ürün seçimi, tarafımıza iletilen bilgi ve çalışma noktalarına göre hazırlanmıştır. Nihai sistem uygunluğu, yerleşim, kanal dirençleri, elektrik altyapısı ve montaj koşulları müşteri veya proje müellifi tarafından doğrulanmalıdır.'
    },
    terms:{
      priceCurrency:[
        'Fiyatlar Euro bazında ve KDV hariçtir.',
        'Faturalama, fatura tarihindeki teklif üzerinde belirtilen Euro satış kuru üzerinden yapılacaktır.',
        'Teklif, belirtilen ürün ve adetlerin birlikte sipariş edilmesi için geçerlidir.',
        'Ürün miktarı, teknik özellik veya teslim koşullarındaki değişiklikler fiyat revizyonuna neden olabilir.'
      ],
      payment:[
        'Sipariş, avans ödemesinin alınması ve yazılı sipariş onayının verilmesiyle geçerlilik kazanır.',
        'Avans alınmadan üretim veya tedarik süreci başlamaz.',
        'Ödemelerin gecikmesi halinde kur farkı ve doğabilecek finansman giderleri ayrıca değerlendirilir.'
      ],
      delivery:[
        'Teslim süresi, sipariş ve ödeme koşullarının tamamlanmasından sonra başlar.',
        'Teklif geçerlilik süresi sonrasında fiyatlar ve teslim süreleri yeniden teyit edilir.',
        'Mücbir sebepler, tedarik zinciri kesintileri ve resmî makam kararlarından kaynaklanan gecikmeler ayrıca değerlendirilir.'
      ],
      standard:[
        'Bu teklif, Vitlo standart satış, teslimat ve teknik kullanım koşullarına tabidir.',
        'Ürünler kataloglarda belirtilen çalışma, montaj ve bakım sınırları içerisinde kullanılmalıdır.',
        'Üretici, teknik zorunluluk halinde eşdeğer performansı koruyacak ürün geliştirmeleri yapma hakkını saklı tutar.'
      ],
      acceptance:'Bu teklifin imzalanması veya yazılı siparişe dönüştürülmesi; ürün tablosu, ticari özet, kapsam, hariç işler ve bu sayfadaki şartların birlikte kabul edildiği anlamına gelir.',
      preparedTitle:'Teklifi Hazırlayan',
      preparedLine:'Ad / Soyad   İmza   Tarih',
      customerTitle:'Müşteri Onayı',
      customerLine:'Firma / Yetkili   Kaşe / İmza   Tarih'
    }
  };

  const clone=value=>JSON.parse(JSON.stringify(value));
  function merge(base,custom){
    if(Array.isArray(base))return Array.isArray(custom)?custom.slice():base.slice();
    if(base&&typeof base==='object'){
      const out={};
      Object.keys(base).forEach(key=>{out[key]=merge(base[key],custom&&typeof custom==='object'?custom[key]:undefined)});
      return out;
    }
    return custom===undefined||custom===null?base:custom;
  }
  function read(){
    try{return merge(DEFAULTS,JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return clone(DEFAULTS)}
  }
  function write(value){
    const normalized=merge(DEFAULTS,value||{});
    localStorage.setItem(KEY,JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('vensis-quotation-settings-updated',{detail:normalized}));
    return normalized;
  }
  function getPath(object,path){return path.split('.').reduce((value,key)=>value==null?undefined:value[key],object)}
  function setPath(object,path,value){
    const keys=path.split('.');
    const last=keys.pop();
    const target=keys.reduce((value,key)=>(value[key]||(value[key]={})),object);
    target[last]=value;
  }
  function lines(value){return String(value||'').split(/\r?\n/).map(item=>item.trim()).filter(Boolean)}

  function panelHtml(){
    return `<section id="quotationSettingsPanel" class="quotation-settings" hidden>
      <div class="quotation-settings-head"><div><span>Quotation Editor</span><h2>Quotation Settings</h2><p>Edit the reusable text shown on the three quotation pages.</p></div><button id="closeQuotationSettings" class="settings-close" type="button" aria-label="Close quotation settings">×</button></div>
      <div class="settings-tabs" role="tablist"><button class="active" type="button" data-settings-tab="summary">Commercial Summary</button><button type="button" data-settings-tab="scope">Scope & Exclusions</button><button type="button" data-settings-tab="terms">Commercial Terms</button></div>
      <div class="settings-body">
        <div data-settings-panel="summary">
          <div class="settings-grid">
            <label>Payment<input data-setting="summary.payment" type="text"></label>
            <label>Exchange Rate<textarea data-setting="summary.exchangeRate" rows="3"></textarea></label>
            <label>Validity<input data-setting="summary.validity" type="text"></label>
            <label>Delivery Place<input data-setting="summary.deliveryPlace" type="text"></label>
            <label>VAT<textarea data-setting="summary.vat" rows="2"></textarea></label>
            <label>Commissioning<textarea data-setting="summary.commissioning" rows="2"></textarea></label>
          </div>
          <label class="settings-wide">Quotation Note<textarea data-setting="summary.quotationNote" rows="4"></textarea></label>
        </div>
        <div data-settings-panel="scope" hidden>
          <label class="settings-wide">Quotation Scope<textarea data-setting="scope.included" rows="6"></textarea></label>
          <div class="settings-grid settings-grid-large">
            <label>Excluded Works <small>One item per line</small><textarea data-setting="scope.exclusions" data-setting-type="list" rows="10"></textarea></label>
            <label>Delivery and Control <small>One item per line</small><textarea data-setting="scope.deliveryControl" data-setting-type="list" rows="10"></textarea></label>
          </div>
          <label class="settings-wide">Project Suitability Note<textarea data-setting="scope.suitability" rows="5"></textarea></label>
        </div>
        <div data-settings-panel="terms" hidden>
          <div class="settings-grid settings-grid-large">
            <label>Price and Currency <small>One item per line</small><textarea data-setting="terms.priceCurrency" data-setting-type="list" rows="9"></textarea></label>
            <label>Payment Terms <small>One item per line</small><textarea data-setting="terms.payment" data-setting-type="list" rows="9"></textarea></label>
            <label>Delivery Terms <small>One item per line</small><textarea data-setting="terms.delivery" data-setting-type="list" rows="9"></textarea></label>
            <label>Standard Conditions <small>One item per line</small><textarea data-setting="terms.standard" data-setting-type="list" rows="9"></textarea></label>
          </div>
          <label class="settings-wide">Acceptance Note<textarea data-setting="terms.acceptance" rows="4"></textarea></label>
          <div class="settings-grid">
            <label>Prepared By Title<input data-setting="terms.preparedTitle" type="text"></label>
            <label>Prepared By Signature Line<input data-setting="terms.preparedLine" type="text"></label>
            <label>Customer Approval Title<input data-setting="terms.customerTitle" type="text"></label>
            <label>Customer Signature Line<input data-setting="terms.customerLine" type="text"></label>
          </div>
        </div>
      </div>
      <div class="settings-footer"><div id="quotationSettingsStatus" class="settings-status">Saved locally in this browser.</div><button id="resetQuotationSettings" class="settings-reset" type="button">Restore Defaults</button><button id="saveQuotationSettings" class="settings-save" type="button">Save Settings</button></div>
    </section>`;
  }

  function addStyles(){
    if(document.getElementById('quotationSettingsStyles'))return;
    const style=document.createElement('style');
    style.id='quotationSettingsStyles';
    style.textContent=`.settings-btn{background:#e8eff0;color:#29484d}.quotation-settings{background:#fff;border:1px solid #cfdadc;border-radius:14px;margin-bottom:14px;overflow:hidden;box-shadow:0 10px 30px rgba(23,48,51,.08)}.quotation-settings-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:18px 20px;border-bottom:1px solid #dfe7e8;background:linear-gradient(135deg,#f8fbfa,#edf6f1)}.quotation-settings-head span{color:#087f4f;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.quotation-settings-head h2{margin:4px 0 0;font-size:22px}.quotation-settings-head p{margin:5px 0 0;color:#64748b;font-size:12px}.settings-close{width:34px;height:34px;border:0;border-radius:8px;background:#dfe8e9;color:#29484d;font-size:23px;cursor:pointer}.settings-tabs{display:flex;gap:6px;padding:12px 16px;border-bottom:1px solid #e1e9ea;overflow:auto}.settings-tabs button{border:0;border-radius:8px;padding:9px 13px;background:#edf3f3;color:#52666b;font-weight:800;white-space:nowrap;cursor:pointer}.settings-tabs button.active{background:#087f4f;color:#fff}.settings-body{padding:18px}.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.settings-grid-large{align-items:start}.settings-body label{display:block;color:#52666b;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.settings-body label small{display:block;margin:3px 0 5px;color:#8a989c;font-size:9px;font-weight:700;text-transform:none;letter-spacing:0}.settings-body input,.settings-body textarea{width:100%;margin-top:6px;border:1px solid #c9d6d8;border-radius:8px;padding:10px 11px;background:#fbfdfd;color:#173033;font:600 13px Arial,Helvetica,sans-serif;line-height:1.4;resize:vertical}.settings-body input:focus,.settings-body textarea:focus{outline:2px solid rgba(8,127,79,.18);border-color:#087f4f}.settings-wide{margin-top:13px}.settings-body [data-settings-panel]>.settings-wide:first-child{margin-top:0}.settings-footer{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:13px 18px;border-top:1px solid #dfe7e8;background:#f8fbfb}.settings-footer button{border:0;border-radius:8px;padding:10px 13px;font-weight:800;cursor:pointer}.settings-save{background:#087f4f;color:#fff}.settings-reset{background:#edf3f3;color:#52666b}.settings-status{margin-right:auto;color:#64748b;font-size:11px;font-weight:700}.settings-status.dirty{color:#b57913}.settings-status.saved{color:#087f4f}@media(max-width:760px){.settings-grid{grid-template-columns:1fr}.settings-footer{align-items:stretch;flex-direction:column}.settings-status{margin:0 0 4px}.settings-footer button{width:100%}}@media print{.quotation-settings{display:none!important}}`;
    document.head.appendChild(style);
  }

  function fillForm(settings){
    const panel=document.getElementById('quotationSettingsPanel');
    if(!panel)return;
    panel.querySelectorAll('[data-setting]').forEach(field=>{
      const value=getPath(settings,field.dataset.setting);
      field.value=field.dataset.settingType==='list'?(Array.isArray(value)?value.join('\n'):String(value||'')):String(value||'');
    });
  }
  function collectForm(){
    const panel=document.getElementById('quotationSettingsPanel');
    const result=read();
    if(!panel)return result;
    panel.querySelectorAll('[data-setting]').forEach(field=>{
      setPath(result,field.dataset.setting,field.dataset.settingType==='list'?lines(field.value):field.value.trim());
    });
    return result;
  }
  function setStatus(text,className){
    const status=document.getElementById('quotationSettingsStatus');
    if(!status)return;
    status.textContent=text;
    status.className='settings-status'+(className?' '+className:'');
  }
  function saveFromForm(options={}){
    const value=write(collectForm());
    if(!options.silent)setStatus('Quotation settings saved.','saved');
    return value;
  }
  function showTab(name){
    document.querySelectorAll('[data-settings-tab]').forEach(button=>button.classList.toggle('active',button.dataset.settingsTab===name));
    document.querySelectorAll('[data-settings-panel]').forEach(panel=>{panel.hidden=panel.dataset.settingsPanel!==name});
  }
  function mount(){
    const actions=document.querySelector('.head-actions');
    const meta=document.querySelector('.project-meta');
    const quotationButton=document.getElementById('convertQuotation');
    if(!actions||!meta||!quotationButton||document.getElementById('quotationSettingsPanel'))return;
    addStyles();
    const button=document.createElement('button');
    button.id='openQuotationSettings';
    button.className='settings-btn';
    button.type='button';
    button.textContent='Quotation Settings';
    button.setAttribute('aria-expanded','false');
    actions.insertBefore(button,quotationButton);
    meta.insertAdjacentHTML('afterend',panelHtml());
    fillForm(read());
    const panel=document.getElementById('quotationSettingsPanel');
    const toggle=open=>{panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)panel.scrollIntoView({behavior:'smooth',block:'start'})};
    button.addEventListener('click',()=>toggle(panel.hidden));
    document.getElementById('closeQuotationSettings')?.addEventListener('click',()=>toggle(false));
    document.querySelectorAll('[data-settings-tab]').forEach(tab=>tab.addEventListener('click',()=>showTab(tab.dataset.settingsTab)));
    document.getElementById('saveQuotationSettings')?.addEventListener('click',()=>saveFromForm());
    document.getElementById('resetQuotationSettings')?.addEventListener('click',()=>{
      if(!confirm('Restore all quotation texts to the default values?'))return;
      write(DEFAULTS);fillForm(read());setStatus('Default quotation settings restored.','saved');showTab('summary');
    });
    panel.addEventListener('input',()=>setStatus('Unsaved changes.','dirty'));
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('#convertQuotation'))saveFromForm({silent:true});
  },true);
  document.getElementById('convertQuotation')?.addEventListener('click',()=>{
    try{
      const quotation=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null');
      if(quotation){quotation.settings=read();localStorage.setItem(ACTIVE_KEY,JSON.stringify(quotation))}
    }catch{}
  });
  window.addEventListener('storage',event=>{if(event.key===KEY)fillForm(read())});
  window.VensisQuotationSettings={key:KEY,defaults:clone(DEFAULTS),read,write,fillForm,collectForm,saveFromForm};
  mount();
})();