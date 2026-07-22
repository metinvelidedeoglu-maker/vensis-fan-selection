(function(){
  const OVERRIDES_KEY='vensis_catalog_overrides_v1';
  const CREDENTIAL_KEY='vensis_catalog_edit_credential_v1';
  const SESSION_KEY='vensis_catalog_edit_unlocked_v1';
  const catalog=window.VensisCatalog;
  if(!catalog)return;

  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const readJson=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'');return value==null?fallback:value}catch{return fallback}};
  const writeJson=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const emptyOverrides=()=>({version:1,updatedAt:'',series:{},models:{}});
  const readOverrides=()=>{const value=readJson(OVERRIDES_KEY,emptyOverrides());return value&&typeof value==='object'?{...emptyOverrides(),...value,series:value.series||{},models:value.models||{}}:emptyOverrides()};
  const state={unlocked:sessionStorage.getItem(SESSION_KEY)==='1',editing:null};

  function deepMerge(target,patch){
    Object.entries(patch||{}).forEach(([key,value])=>{
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        if(!target[key]||typeof target[key]!=='object'||Array.isArray(target[key]))target[key]={};
        deepMerge(target[key],value);
      }else target[key]=clone(value);
    });
    return target;
  }
  function applyOverrides(){
    const overrides=readOverrides();
    Object.entries(overrides.series).forEach(([id,patch])=>{const record=catalog.getSeries?.(id);if(record)deepMerge(record,patch)});
    Object.entries(overrides.models).forEach(([id,patch])=>{const record=catalog.getModel?.(id);if(record)deepMerge(record,patch)});
  }
  applyOverrides();

  async function sha256(text){
    const bytes=new TextEncoder().encode(text);
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  function randomSalt(){
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
    return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  async function passwordHash(password,salt){return sha256(`${salt}:${password}`)}

  function addStyles(){
    if(document.getElementById('catalogEditModeStyles'))return;
    const style=document.createElement('style');
    style.id='catalogEditModeStyles';
    style.textContent=`
      .catalog-edit-launch{display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border:1px solid #cfdbd7;border-radius:10px;background:#fff;color:#087f4f;font-size:19px;cursor:pointer;flex:0 0 40px}
      .catalog-edit-launch.active{background:#173033;color:#fff;border-color:#173033;box-shadow:0 6px 16px rgba(23,48,51,.18)}
      .catalog-edit-toolbar{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid #cfe0d8;border-radius:12px;background:#f3faf6;box-shadow:0 5px 16px rgba(23,48,51,.07)}
      .catalog-edit-toolbar[hidden]{display:none}.catalog-edit-toolbar b{color:#087f4f;font-size:12px;white-space:nowrap}.catalog-edit-toolbar button,.catalog-edit-toolbar label{display:inline-flex;align-items:center;justify-content:center;min-height:34px;margin:0;padding:7px 10px;border:0;border-radius:8px;background:#fff;color:#355259;font:750 11px Arial,Helvetica,sans-serif;cursor:pointer}.catalog-edit-toolbar .danger{color:#b8322c;background:#fff1f0}.catalog-edit-toolbar input{display:none}
      .catalog-inline-edit{position:absolute;right:10px;top:10px;z-index:6;display:flex;align-items:center;gap:5px;border:1px solid #cbdcd4;border-radius:9px;padding:7px 9px;background:rgba(255,255,255,.94);color:#087f4f;font:800 11px Arial;cursor:pointer;box-shadow:0 4px 14px rgba(23,48,51,.1)}
      .series-card{position:relative}.series-edit-detail{display:inline-flex;margin-top:12px;margin-left:8px;padding:10px 13px;border:1px solid #a9cbbb;border-radius:9px;background:#fff;color:#087f4f;font-weight:800;cursor:pointer}.model-edit-btn{width:100%;margin-top:8px;border:1px solid #b9d3c7!important;border-radius:9px!important;padding:9px 11px!important;background:#f2faf6!important;color:#087f4f!important;font-weight:800!important;cursor:pointer}
      .catalog-editor-overlay{position:fixed;inset:0;z-index:500;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(13,34,38,.65);backdrop-filter:blur(5px)}.catalog-editor-overlay[hidden]{display:none}
      .catalog-editor-dialog{width:min(980px,100%);max-height:calc(100vh - 36px);display:flex;flex-direction:column;overflow:hidden;border-radius:18px;background:#fff;box-shadow:0 28px 90px rgba(0,0,0,.35)}.catalog-editor-dialog.small{width:min(480px,100%)}
      .catalog-editor-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:18px 21px;border-bottom:1px solid #dfe8e5;background:linear-gradient(135deg,#f9fcfa,#edf7f2)}.catalog-editor-head span{display:block;color:#087f4f;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.07em}.catalog-editor-head h2{margin:4px 0 0;font-size:23px}.catalog-editor-head p{margin:5px 0 0;color:#64748b;font-size:12px}.catalog-editor-close{width:36px;height:36px;border:0;border-radius:9px;background:#e4ece9;color:#355259;font-size:23px;cursor:pointer}
      .catalog-editor-body{padding:18px 20px;overflow:auto}.catalog-editor-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.catalog-editor-grid label{display:block;margin:0;color:#52666b;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.045em}.catalog-editor-grid input,.catalog-editor-grid textarea{width:100%;margin-top:6px;border:1px solid #c9d7d4;border-radius:9px;padding:10px 11px;background:#fbfdfc;color:#173033;font:600 13px/1.4 Arial,Helvetica,sans-serif}.catalog-editor-grid textarea{resize:vertical;min-height:86px}.catalog-editor-grid input:disabled{background:#edf2f0;color:#778783}.catalog-editor-wide{grid-column:1/-1}.catalog-editor-span2{grid-column:span 2}.catalog-editor-section{grid-column:1/-1;margin-top:5px;padding-top:14px;border-top:1px solid #e2eae7;color:#087f4f;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.catalog-editor-help{display:block;margin-top:5px;color:#748589;font-size:10px;font-weight:500;text-transform:none;letter-spacing:0}
      .catalog-editor-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:13px 20px;border-top:1px solid #dfe8e5;background:#f8faf9}.catalog-editor-actions button{border:0;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}.catalog-editor-cancel{background:#eaf0ee;color:#52666b}.catalog-editor-reset{margin-right:auto;background:#fff1f0;color:#b8322c}.catalog-editor-save{background:#087f4f;color:#fff}
      .catalog-password-form{display:grid;gap:13px}.catalog-password-form label{display:block;color:#52666b;font-size:11px;font-weight:850}.catalog-password-form input{width:100%;margin-top:6px;border:1px solid #c9d7d4;border-radius:9px;padding:11px;font-size:14px}.catalog-password-error{min-height:17px;color:#b8322c;font-size:11px;font-weight:700}
      .catalog-edit-toast{position:fixed;right:18px;bottom:18px;z-index:700;padding:11px 15px;border-radius:10px;background:#173033;color:#fff;font:750 12px Arial;box-shadow:0 9px 28px rgba(0,0,0,.22);opacity:0;transform:translateY(8px);transition:.2s}.catalog-edit-toast.show{opacity:1;transform:translateY(0)}
      @media(max-width:760px){.catalog-edit-toolbar{width:100%;overflow:auto}.catalog-edit-toolbar b{position:sticky;left:0;background:#f3faf6;padding-right:5px}.catalog-editor-overlay{padding:7px}.catalog-editor-dialog{max-height:calc(100vh - 14px)}.catalog-editor-grid{grid-template-columns:1fr 1fr}.catalog-editor-wide,.catalog-editor-section{grid-column:1/-1}.catalog-editor-span2{grid-column:1/-1}.catalog-editor-actions{flex-wrap:wrap}.catalog-editor-reset{margin-right:0}.catalog-editor-actions button{flex:1}.series-edit-detail{margin-left:0}.catalog-inline-edit{top:8px;right:8px}}
      @media(max-width:480px){.catalog-editor-grid{grid-template-columns:1fr}.catalog-editor-wide,.catalog-editor-span2,.catalog-editor-section{grid-column:1}.catalog-editor-head,.catalog-editor-body,.catalog-editor-actions{padding-left:14px;padding-right:14px}}
    `;
    document.head.appendChild(style);
  }

  function toast(text){
    let node=document.getElementById('catalogEditToast');
    if(!node){node=document.createElement('div');node.id='catalogEditToast';node.className='catalog-edit-toast';document.body.appendChild(node)}
    node.textContent=text;node.classList.add('show');clearTimeout(node._timer);node._timer=setTimeout(()=>node.classList.remove('show'),1900);
  }
  function closeOverlay(id){const overlay=document.getElementById(id);if(overlay)overlay.hidden=true;document.body.style.overflow=''}
  function openOverlay(id){const overlay=document.getElementById(id);if(overlay)overlay.hidden=false;document.body.style.overflow='hidden'}

  function mountShell(){
    addStyles();
    const nav=document.querySelector('.catalog-nav');
    if(nav&&!document.getElementById('catalogEditLaunch')){
      const button=document.createElement('button');button.id='catalogEditLaunch';button.className='catalog-edit-launch';button.type='button';button.title='Edit Mode';button.setAttribute('aria-label','Open Edit Mode');button.textContent='✎';nav.appendChild(button);button.addEventListener('click',handleLaunch);
    }
    const header=document.querySelector('.catalog-top');
    if(header&&!document.getElementById('catalogEditToolbar')){
      const toolbar=document.createElement('div');toolbar.id='catalogEditToolbar';toolbar.className='catalog-edit-toolbar';toolbar.hidden=true;
      toolbar.innerHTML='<b>Edit Mode</b><button type="button" data-edit-export>Export</button><label>Import<input type="file" accept="application/json,.json" data-edit-import></label><button type="button" class="danger" data-edit-reset-all>Reset Changes</button><button type="button" data-edit-lock>Lock</button>';
      header.insertAdjacentElement('afterend',toolbar);
      toolbar.querySelector('[data-edit-export]').addEventListener('click',exportOverrides);
      toolbar.querySelector('[data-edit-import]').addEventListener('change',importOverrides);
      toolbar.querySelector('[data-edit-reset-all]').addEventListener('click',resetAllOverrides);
      toolbar.querySelector('[data-edit-lock]').addEventListener('click',lockEditMode);
    }
    mountAuthModal();mountEditorModal();updateModeUi();
  }

  function mountAuthModal(){
    if(document.getElementById('catalogAuthOverlay'))return;
    const overlay=document.createElement('div');overlay.id='catalogAuthOverlay';overlay.className='catalog-editor-overlay';overlay.hidden=true;
    overlay.innerHTML='<section class="catalog-editor-dialog small" role="dialog" aria-modal="true"><header class="catalog-editor-head"><div><span>Catalog Security</span><h2 id="catalogAuthTitle">Edit Mode</h2><p id="catalogAuthCopy"></p></div><button class="catalog-editor-close" type="button" data-auth-close>×</button></header><div class="catalog-editor-body"><form id="catalogPasswordForm" class="catalog-password-form"><label id="catalogPasswordLabel">Password<input id="catalogPassword" type="password" autocomplete="current-password" required></label><label id="catalogPasswordConfirmLabel" hidden>Confirm Password<input id="catalogPasswordConfirm" type="password" autocomplete="new-password"></label><div id="catalogPasswordError" class="catalog-password-error"></div><div class="catalog-editor-actions" style="padding:0;border:0;background:transparent"><button class="catalog-editor-cancel" type="button" data-auth-cancel>Cancel</button><button class="catalog-editor-save" type="submit">Continue</button></div></form></div></section>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeOverlay('catalogAuthOverlay')});
    overlay.querySelector('[data-auth-close]').addEventListener('click',()=>closeOverlay('catalogAuthOverlay'));
    overlay.querySelector('[data-auth-cancel]').addEventListener('click',()=>closeOverlay('catalogAuthOverlay'));
    overlay.querySelector('form').addEventListener('submit',submitPassword);
  }

  function mountEditorModal(){
    if(document.getElementById('catalogEditorOverlay'))return;
    const overlay=document.createElement('div');overlay.id='catalogEditorOverlay';overlay.className='catalog-editor-overlay';overlay.hidden=true;
    overlay.innerHTML='<section class="catalog-editor-dialog" role="dialog" aria-modal="true"><header class="catalog-editor-head"><div><span>Catalog Edit Mode</span><h2 id="catalogEditorTitle">Edit Catalog Record</h2><p id="catalogEditorCopy">Changes are stored in this browser.</p></div><button class="catalog-editor-close" type="button" data-editor-close>×</button></header><form id="catalogEditorForm"><div id="catalogEditorBody" class="catalog-editor-body"></div><footer class="catalog-editor-actions"><button id="catalogResetRecord" class="catalog-editor-reset" type="button">Reset This Item</button><button class="catalog-editor-cancel" type="button" data-editor-cancel>Cancel</button><button class="catalog-editor-save" type="submit">Save Changes</button></footer></form></section>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{if(event.target===overlay)closeOverlay('catalogEditorOverlay')});
    overlay.querySelector('[data-editor-close]').addEventListener('click',()=>closeOverlay('catalogEditorOverlay'));
    overlay.querySelector('[data-editor-cancel]').addEventListener('click',()=>closeOverlay('catalogEditorOverlay'));
    overlay.querySelector('form').addEventListener('submit',saveEditor);
    overlay.querySelector('#catalogResetRecord').addEventListener('click',resetCurrentRecord);
  }

  async function handleLaunch(){
    if(state.unlocked){lockEditMode();return}
    const credential=readJson(CREDENTIAL_KEY,null);
    const first=!credential?.salt||!credential?.hash;
    document.getElementById('catalogAuthTitle').textContent=first?'Set Edit Password':'Unlock Edit Mode';
    document.getElementById('catalogAuthCopy').textContent=first?'Create a password for this browser. This is an interface lock, not server-side security.':'Enter the Edit Mode password for this browser.';
    document.getElementById('catalogPasswordLabel').firstChild.textContent=first?'New Password':'Password';
    document.getElementById('catalogPasswordConfirmLabel').hidden=!first;
    document.getElementById('catalogPassword').value='';document.getElementById('catalogPasswordConfirm').value='';document.getElementById('catalogPasswordError').textContent='';
    openOverlay('catalogAuthOverlay');setTimeout(()=>document.getElementById('catalogPassword').focus(),0);
  }
  async function submitPassword(event){
    event.preventDefault();
    const password=document.getElementById('catalogPassword').value;
    const error=document.getElementById('catalogPasswordError');
    const credential=readJson(CREDENTIAL_KEY,null);
    const first=!credential?.salt||!credential?.hash;
    if(password.length<4){error.textContent='Use at least 4 characters.';return}
    if(first){
      if(password!==document.getElementById('catalogPasswordConfirm').value){error.textContent='Passwords do not match.';return}
      const salt=randomSalt();writeJson(CREDENTIAL_KEY,{version:1,salt,hash:await passwordHash(password,salt),createdAt:new Date().toISOString()});
    }else if(await passwordHash(password,credential.salt)!==credential.hash){error.textContent='Incorrect password.';return}
    state.unlocked=true;sessionStorage.setItem(SESSION_KEY,'1');closeOverlay('catalogAuthOverlay');updateModeUi();decorate();toast('Edit Mode unlocked.');
  }
  function lockEditMode(){state.unlocked=false;sessionStorage.removeItem(SESSION_KEY);updateModeUi();decorate();toast('Edit Mode locked.')}
  function updateModeUi(){
    document.getElementById('catalogEditLaunch')?.classList.toggle('active',state.unlocked);
    const toolbar=document.getElementById('catalogEditToolbar');if(toolbar)toolbar.hidden=!state.unlocked;
    document.body.classList.toggle('catalog-edit-active',state.unlocked);
  }

  const lines=value=>(Array.isArray(value)?value:[]).join('\n');
  const pointLines=value=>(Array.isArray(value)?value:[]).map(point=>`${Number(point.q)||0}, ${Number(point.p)||0}`).join('\n');
  const field=(label,name,value,type='text',classes='')=>`<label class="${classes}">${esc(label)}<input name="${esc(name)}" type="${esc(type)}" value="${esc(value??'')}"${type==='number'?' step="any" inputmode="decimal"':''}></label>`;
  const area=(label,name,value,classes='catalog-editor-wide',help='')=>`<label class="${classes}">${esc(label)}<textarea name="${esc(name)}">${esc(value??'')}</textarea>${help?`<small class="catalog-editor-help">${esc(help)}</small>`:''}</label>`;

  function editSeries(id){
    if(!state.unlocked)return handleLaunch();
    const record=catalog.getSeries?.(id);if(!record)return;
    state.editing={type:'series',id};
    document.getElementById('catalogEditorTitle').textContent=`Edit Series — ${record.code||id}`;
    document.getElementById('catalogEditorBody').innerHTML=`<div class="catalog-editor-grid">
      ${field('Series ID','id',record.id,'text','')} ${field('Series Code','code',record.code)} ${field('Manufacturer','manufacturer',record.manufacturer)}
      ${field('Title','title',record.title,'text','catalog-editor-span2')} ${area('Categories — one per line','categories',lines(record.categories),'')}
      ${field('Product Image URL / Path','image',record.media?.image||'','text','catalog-editor-span2')} ${field('Catalog PDF URL / Path','pdf',record.catalogue?.pdf||'')}
      ${field('Catalog Page / Source','page',record.catalogue?.page||'')}
      <div class="catalog-editor-section">Series Descriptions</div>
      ${area('General Features — one item per line','general',lines(record.description?.general))}
      ${area('Motor — one item per line','motor',lines(record.description?.motor))}
      ${area('Areas of Usage — one item per line','applications',lines(record.description?.applications))}
    </div>`;
    const idField=document.querySelector('#catalogEditorBody [name="id"]');if(idField)idField.disabled=true;
    openOverlay('catalogEditorOverlay');
  }

  function editModel(id){
    if(!state.unlocked)return handleLaunch();
    const record=catalog.getModel?.(id);if(!record)return;
    state.editing={type:'model',id};
    document.getElementById('catalogEditorTitle').textContent=`Edit Model — ${record.model||id}`;
    document.getElementById('catalogEditorBody').innerHTML=`<div class="catalog-editor-grid">
      ${field('Model ID','id',record.id)} ${field('Series ID','seriesId',record.seriesId)} ${field('Model Name','model',record.model)}
      ${field('Display Name','display',record.display,'text','catalog-editor-span2')} ${field('List Price EUR','listPrice',record.pricing?.listPrice??'','number')}
      <div class="catalog-editor-section">Motor</div>
      ${field('Power kW','power',record.motor?.power??'','number')} ${field('Speed rpm','speed',record.motor?.speed??'','number')} ${field('Current A','current',record.motor?.current??'','number')}
      ${field('Voltage','voltage',record.motor?.voltage||'')} ${field('Frequency','frequency',record.motor?.frequency||'')} ${field('Sound dB(A)','sound',record.motor?.sound??'','number')}
      <div class="catalog-editor-section">Technical</div>
      ${field('Weight kg','weight',record.technical?.weight??'','number')} ${field('IP Class','ipClass',record.technical?.ipClass||'')} ${field('Insulation Class','insulationClass',record.technical?.insulationClass||'')}
      ${field('Efficiency Class','efficiencyClass',record.technical?.efficiencyClass||'')} ${field('Fire Rating','fireRating',record.technical?.fireRating||'')} ${field('Fan Type','fanType',record.technical?.fanType||'')}
      ${field('Mount Type','mountType',record.technical?.mountType||'')} ${field('Product Group','productGroup',record.technical?.productGroup||'')} ${field('Source Page','sourcePage',record.source?.page||'')}
      <div class="catalog-editor-section">Performance</div>
      ${field('Nominal Airflow m³/h','nominalAirflow',record.performance?.nominalAirflow??'','number')}
      ${area('Performance Curve Points','points',pointLines(record.performance?.points),'catalog-editor-span2','One point per line: airflow, pressure. Example: 2500, 180')}
      ${area('Source Curve Points','sourcePoints',pointLines(record.performance?.sourcePoints),'catalog-editor-wide','One point per line: airflow, pressure. Leave identical to performance points when no separate source curve exists.')}
    </div>`;
    ['id','seriesId'].forEach(name=>{const input=document.querySelector(`#catalogEditorBody [name="${name}"]`);if(input)input.disabled=true});
    openOverlay('catalogEditorOverlay');
  }

  function parseList(value){return String(value||'').split(/\n/).map(item=>item.trim()).filter(Boolean)}
  function parsePoints(value){
    const result=[];
    String(value||'').split(/\n/).map(line=>line.trim()).filter(Boolean).forEach((line,index)=>{
      const parts=line.split(/[;,\t]/).map(part=>part.trim()).filter(Boolean);
      if(parts.length<2||!Number.isFinite(Number(parts[0]))||!Number.isFinite(Number(parts[1])))throw new Error(`Invalid curve point on line ${index+1}. Use airflow, pressure.`);
      result.push({q:Number(parts[0]),p:Number(parts[1])});
    });
    return result;
  }
  function formData(){const form=document.getElementById('catalogEditorForm');return new FormData(form)}
  function numeric(data,name){const raw=String(data.get(name)||'').trim();return raw===''?0:Number(raw)}
  function saveEditor(event){
    event.preventDefault();if(!state.editing)return;
    const data=formData();const overrides=readOverrides();
    try{
      if(state.editing.type==='series'){
        const patch={code:String(data.get('code')||'').trim(),manufacturer:String(data.get('manufacturer')||'').trim(),title:String(data.get('title')||'').trim(),categories:parseList(data.get('categories')),media:{image:String(data.get('image')||'').trim()},catalogue:{pdf:String(data.get('pdf')||'').trim(),page:String(data.get('page')||'').trim()},description:{general:parseList(data.get('general')),motor:parseList(data.get('motor')),applications:parseList(data.get('applications'))}};
        overrides.series[state.editing.id]=patch;deepMerge(catalog.getSeries(state.editing.id),patch);
      }else{
        const patch={model:String(data.get('model')||'').trim(),display:String(data.get('display')||'').trim(),pricing:{listPrice:numeric(data,'listPrice'),currency:'EUR'},motor:{power:numeric(data,'power'),speed:numeric(data,'speed'),current:numeric(data,'current'),voltage:String(data.get('voltage')||'').trim(),frequency:String(data.get('frequency')||'').trim(),sound:numeric(data,'sound')},technical:{weight:numeric(data,'weight'),ipClass:String(data.get('ipClass')||'').trim(),insulationClass:String(data.get('insulationClass')||'').trim(),efficiencyClass:String(data.get('efficiencyClass')||'').trim(),fireRating:String(data.get('fireRating')||'').trim(),fanType:String(data.get('fanType')||'').trim(),mountType:String(data.get('mountType')||'').trim(),productGroup:String(data.get('productGroup')||'').trim()},performance:{nominalAirflow:numeric(data,'nominalAirflow'),points:parsePoints(data.get('points')),sourcePoints:parsePoints(data.get('sourcePoints'))},source:{page:String(data.get('sourcePage')||'').trim()}};
        overrides.models[state.editing.id]=patch;deepMerge(catalog.getModel(state.editing.id),patch);
      }
      overrides.updatedAt=new Date().toISOString();writeJson(OVERRIDES_KEY,overrides);closeOverlay('catalogEditorOverlay');refreshCatalog();toast('Catalog changes saved.');
    }catch(error){alert(error.message||'The catalog changes could not be saved.')}
  }

  function resetCurrentRecord(){
    if(!state.editing||!confirm('Reset all Edit Mode changes for this item?'))return;
    const overrides=readOverrides();delete overrides[state.editing.type==='series'?'series':'models'][state.editing.id];overrides.updatedAt=new Date().toISOString();writeJson(OVERRIDES_KEY,overrides);location.reload();
  }
  function resetAllOverrides(){if(!confirm('Reset every catalog change made in Edit Mode?'))return;localStorage.removeItem(OVERRIDES_KEY);location.reload()}
  function exportOverrides(){
    const payload={...readOverrides(),exportedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`vensis-catalog-edits-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);toast('Catalog edits exported.');
  }
  function importOverrides(event){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const reader=new FileReader();reader.onload=()=>{try{const value=JSON.parse(String(reader.result||''));if(!value||typeof value!=='object'||!value.series||!value.models)throw new Error('Invalid catalog edit file.');writeJson(OVERRIDES_KEY,{...emptyOverrides(),...value,updatedAt:new Date().toISOString()});location.reload()}catch(error){alert(error.message||'Import failed.')}};reader.readAsText(file);
  }

  function refreshCatalog(){
    const seriesId=new URLSearchParams(location.search).get('series');
    if(seriesId&&window.Catalog?.showSeries)window.Catalog.showSeries(seriesId);else window.Catalog?.render?.();
    setTimeout(decorate,0);
  }
  function decorate(){
    document.querySelectorAll('.catalog-inline-edit,.series-edit-detail,.model-edit-btn').forEach(node=>node.remove());
    if(!state.unlocked)return;
    document.querySelectorAll('.series-card[data-series]').forEach(card=>{
      const button=document.createElement('button');button.type='button';button.className='catalog-inline-edit';button.innerHTML='✎ Edit';button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();editSeries(card.dataset.series)});card.appendChild(button);
    });
    const seriesId=new URLSearchParams(location.search).get('series');
    const hero=document.querySelector('#detailPage .series-hero-copy');
    if(seriesId&&hero){const button=document.createElement('button');button.type='button';button.className='series-edit-detail';button.textContent='✎ Edit Series';button.addEventListener('click',()=>editSeries(seriesId));hero.appendChild(button)}
    document.querySelectorAll('#detailPage .model-card').forEach(card=>{
      const modelId=card.querySelector('[data-model-datasheet]')?.dataset.modelDatasheet;if(!modelId)return;
      const button=document.createElement('button');button.type='button';button.className='model-edit-btn';button.textContent='✎ Edit Model';button.addEventListener('click',()=>editModel(modelId));card.appendChild(button);
    });
  }

  function observe(){
    const observer=new MutationObserver(()=>setTimeout(decorate,0));
    ['catalogGrid','detailPage'].forEach(id=>{const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:false})});
  }
  function start(){mountShell();observe();setTimeout(decorate,0)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.VensisCatalogEditMode={read:readOverrides,apply:applyOverrides,editSeries,editModel,lock:lockEditMode};
})();