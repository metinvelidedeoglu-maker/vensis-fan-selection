(function(){
  'use strict';

  const API_BASE='api/edit';
  const state={configured:false,persistentConfigReady:false,authenticated:false,csrf:'',pendingModelKey:'',pendingSeriesKey:'',pendingNewSeriesKey:'',busy:false};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numberValue=value=>Number.isFinite(Number(value))?Number(value):0;
  let launcher,overlay,dialog,toastTimer;
  const isCatalogPage=()=>document.body.classList.contains('app-catalog');

  async function request(path,options={}){
    const headers={Accept:'application/json',...(options.headers||{})};
    if(options.body!==undefined)headers['Content-Type']='application/json';
    if(state.csrf&&options.csrf)headers['X-CSRF-Token']=state.csrf;
    let response;
    try{
      response=await fetch(`${API_BASE}/${path}`,{
        method:options.method||'GET',
        credentials:'same-origin',
        cache:'no-store',
        headers,
        body:options.body===undefined?undefined:JSON.stringify(options.body)
      });
    }catch(error){
      const networkError=new Error('Edit service could not be reached.');
      networkError.status=0;
      throw networkError;
    }
    let payload={};
    try{payload=await response.json()}catch{}
    if(!response.ok||payload.ok===false){
      const error=new Error(payload.error||'Edit request failed.');
      error.status=response.status;
      error.retryAfter=Number(response.headers.get('Retry-After'))||0;
      throw error;
    }
    return payload;
  }

  function mount(){
    if(!document.body.classList.contains('app-shell'))return;
    if(document.getElementById('vensisEditLauncher'))return;
    launcher=document.createElement('button');
    launcher.id='vensisEditLauncher';
    launcher.className='vensis-edit-launcher';
    launcher.type='button';
    launcher.title=isCatalogPage()?'Open secure Edit Mode':'Open secure Project Cloud';
    launcher.setAttribute('aria-label',launcher.title);
    launcher.innerHTML=isCatalogPage()?'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m13.8 7.8 3 3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>':'<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true"><path d="M7.2 18.5h10.1a4.2 4.2 0 0 0 .7-8.3A6.1 6.1 0 0 0 6.4 8.8a4.9 4.9 0 0 0 .8 9.7Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m9.2 13 2.1 2.1 4-4.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    launcher.addEventListener('click',openLauncher);

    overlay=document.createElement('div');
    overlay.id='vensisEditOverlay';
    overlay.className='vensis-edit-overlay';
    overlay.hidden=true;
    overlay.innerHTML='<section class="vensis-edit-dialog is-narrow" role="dialog" aria-modal="true" aria-labelledby="vensisEditTitle"></section>';
    dialog=overlay.firstElementChild;
    overlay.addEventListener('click',event=>{if(event.target===overlay&&!state.busy)closeModal()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay.hidden&&!state.busy)closeModal()});

    const toast=document.createElement('div');
    toast.id='vensisEditToast';
    toast.className='vensis-edit-toast';
    toast.setAttribute('role','status');
    document.body.append(launcher,overlay,toast);
    document.addEventListener('click',event=>{
      const addButton=event.target.closest('[data-add-model]');
      if(addButton){
        event.preventDefault();
        event.stopPropagation();
        openAddModel(addButton.dataset.addModel||'');
        return;
      }
      const editButton=event.target.closest('[data-edit-model]');
      if(editButton){
        event.preventDefault();
        event.stopPropagation();
        openModelEditor(editButton.dataset.editModel||'');
        return;
      }
      const seriesButton=event.target.closest('[data-edit-series]');
      if(seriesButton){
        event.preventDefault();
        event.stopPropagation();
        openSeriesEditor(seriesButton.dataset.editSeries||'');
      }
    });
  }

  function setSession(payload){
    state.configured=Boolean(payload?.configured??true);
    state.persistentConfigReady=Boolean(payload?.persistentConfigReady);
    state.authenticated=Boolean(payload?.authenticated);
    state.csrf=state.authenticated?String(payload?.csrf||''):'';
    document.body.classList.toggle('vensis-edit-authenticated',state.authenticated);
    launcher?.classList.toggle('is-active',state.authenticated);
    if(launcher){
      launcher.title=state.authenticated?(isCatalogPage()?'Edit Mode and Project Cloud are active':'Project Cloud is active'):(isCatalogPage()?'Open secure Edit Mode':'Open secure Project Cloud');
      launcher.setAttribute('aria-label',launcher.title);
    }
    window.dispatchEvent(new CustomEvent('vensis-edit-session-changed',{detail:{
      configured:state.configured,persistentConfigReady:state.persistentConfigReady,authenticated:state.authenticated
    }}));
  }

  function showToast(message){
    const toast=document.getElementById('vensisEditToast');
    if(!toast)return;
    toast.textContent=message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>toast.classList.remove('is-visible'),2600);
  }

  function showModal(content,narrow=false){
    dialog.className=`vensis-edit-dialog${narrow?' is-narrow':''}`;
    dialog.innerHTML=content;
    overlay.hidden=false;
    document.body.style.overflow='hidden';
    setTimeout(()=>dialog.querySelector('input:not([type="hidden"]),button')?.focus(),20);
  }

  function closeModal(){
    overlay.hidden=true;
    dialog.innerHTML='';
    document.body.style.overflow='';
    state.busy=false;
  }

  function head(title,subtitle){
    return `<header class="vensis-edit-head"><div><span class="vensis-edit-kicker">${isCatalogPage()?'Secure Edit Mode':'Secure Project Cloud'}</span><h2 id="vensisEditTitle">${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button class="vensis-edit-close" type="button" data-edit-close aria-label="Close">×</button></header>`;
  }

  async function refreshSession(){
    try{
      const payload=await request('session.php');
      setSession(payload);
    }catch{
      setSession({configured:false,authenticated:false});
    }
  }

  function openLauncher(){
    if(!state.configured){
      showModal(`${head('Setup required','The secure server settings have not been completed yet.')}<div class="vensis-edit-body"><div class="vensis-edit-message is-error">The secure workspace is installed but not configured on Hostinger.</div><p class="vensis-edit-note">The password hash and GitHub access token must be stored only in the server configuration.</p><div class="vensis-edit-actions"><button class="vensis-edit-secondary" type="button" data-edit-close>Close</button></div></div>`,true);
      dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
      return;
    }
    if(!state.authenticated){showLogin();return}
    showSessionPanel();
  }

  function showLogin(message=''){
    showModal(`${head('Sign in','Enter the secure workspace password. It is verified only on the server.')}<form id="vensisEditLogin" class="vensis-edit-body"><div id="vensisEditLoginMessage" class="vensis-edit-message${message?' is-error':''}">${esc(message)}</div><label class="vensis-edit-field"><span>Password</span><input id="vensisEditPassword" type="password" autocomplete="current-password" maxlength="1024" required></label><div class="vensis-edit-actions"><button class="vensis-edit-secondary" type="button" data-edit-close>Cancel</button><button class="vensis-edit-primary" type="submit">Open Secure Workspace</button></div></form>`,true);
    dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    dialog.querySelector('#vensisEditLogin')?.addEventListener('submit',submitLogin);
  }

  async function submitLogin(event){
    event.preventDefault();
    if(state.busy)return;
    const form=event.currentTarget;
    const password=form.querySelector('#vensisEditPassword')?.value||'';
    const message=form.querySelector('#vensisEditLoginMessage');
    const submit=form.querySelector('[type="submit"]');
    state.busy=true;
    submit.disabled=true;
    submit.textContent='Checking…';
    if(message){message.className='vensis-edit-message';message.textContent=''}
    try{
      const payload=await request('login.php',{method:'POST',body:{password}});
      setSession({...payload,configured:true});
      const pendingModel=state.pendingModelKey;
      const pendingSeries=state.pendingSeriesKey;
      const pendingNewSeries=state.pendingNewSeriesKey;
      state.pendingModelKey='';
      state.pendingSeriesKey='';
      state.pendingNewSeriesKey='';
      closeModal();
      showToast(isCatalogPage()?'Secure Edit Mode opened.':'Project Cloud opened. Syncing projects…');
      if(pendingNewSeries)setTimeout(()=>openAddModel(pendingNewSeries==='__choose__'?'':pendingNewSeries),50);
      else if(pendingSeries)setTimeout(()=>openSeriesEditor(pendingSeries),50);
      else if(pendingModel)setTimeout(()=>openModelEditor(pendingModel),50);
    }catch(error){
      state.busy=false;
      submit.disabled=false;
      submit.textContent='Open Secure Workspace';
      if(message){
        message.className='vensis-edit-message is-error';
        message.textContent=error.retryAfter?`${error.message} (${Math.ceil(error.retryAfter/60)} min)`:error.message;
      }
      form.querySelector('#vensisEditPassword')?.select();
    }
  }

  function showSessionPanel(){
    const storageWarning=state.persistentConfigReady?'':'<div class="vensis-edit-message is-error">Server settings are not yet stored outside the deployment folder. Re-save config.local.php before saving changes.</div>';
    const content=isCatalogPage()
      ? `${head('Catalog Edit Mode active','Series information, images and every model-card value can be changed.')}<div class="vensis-edit-body">${storageWarning}<div class="vensis-edit-status"><span class="vensis-edit-status-dot"></span><div><b>Secure session is open</b><small>Catalog changes are committed to GitHub. Projects are synchronized to protected Hostinger storage.</small></div></div><p class="vensis-edit-note">Use Add Product for a new catalog model, Edit Series for series information, and the pencil on a model card for model values. Internal keys and performance curves remain protected.</p><div class="vensis-edit-actions"><button id="vensisEditLogout" class="vensis-edit-danger" type="button">Sign out</button><button id="vensisAddProduct" class="vensis-edit-secondary" type="button">Add Product</button><button class="vensis-edit-primary" type="button" data-edit-close>Continue editing</button></div></div>`
      : `${head('Project Cloud active','Projects are synchronized securely across your devices.')}<div class="vensis-edit-body">${storageWarning}<div class="vensis-edit-status"><span class="vensis-edit-status-dot"></span><div><b>Secure session is open</b><small>${esc(window.VensisProjects?.cloudState?.().message||'Projects are stored outside public_html on Hostinger.')}</small></div></div><p class="vensis-edit-note">Browser copies remain available for speed. The protected Hostinger copy restores them on another signed-in device.</p><div class="vensis-edit-actions"><button id="vensisEditLogout" class="vensis-edit-danger" type="button">Sign out</button><button class="vensis-edit-primary" type="button" data-edit-close>Continue</button></div></div>`;
    showModal(content,true);
    dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    dialog.querySelector('#vensisEditLogout')?.addEventListener('click',logout);
    dialog.querySelector('#vensisAddProduct')?.addEventListener('click',()=>openAddModel(''));
  }

  async function logout(){
    if(state.busy)return;
    state.busy=true;
    const button=dialog.querySelector('#vensisEditLogout');
    if(button){button.disabled=true;button.textContent='Signing out…'}
    try{await request('logout.php',{method:'POST',body:{},csrf:true})}catch{}
    setSession({configured:state.configured,persistentConfigReady:state.persistentConfigReady,authenticated:false});
    closeModal();
    showToast(isCatalogPage()?'Edit Mode closed.':'Project Cloud signed out. Browser copies remain available.');
  }

  function modelRecord(key){
    const model=window.VensisCatalog?.getModel?.(key);
    if(model)return model;
    const row=window.VensisState?.models?.find?.(item=>String(item.id||item.key)===String(key));
    if(!row)return null;
    return {
      id:row.id||row.key,
      model:row.model||'',
      pricing:{listPrice:row.price},
      motor:{power:row.kw,speed:row.rpm,current:row.amps,voltage:row.voltage,frequency:row.frequency,sound:row.spl},
      technical:{fireRating:row.fireRating||row.fire,fanType:row.fanType,mountType:row.mountType,ipClass:row.ipClass},
      performance:{nominalAirflow:row.nominal}
    };
  }

  function field(label,name,value,options={}){
    const attributes=options.type==='text'
      ? `type="text" maxlength="${options.maxLength||120}"${options.required?' required':''}`
      : `type="number" min="${options.min??0}" max="${options.max??10000000}" step="${options.step||'any'}"`;
    return `<label class="vensis-edit-field${options.wide?' is-wide':''}"><span>${esc(label)}</span><input name="${esc(name)}" ${attributes} value="${esc(value)}"></label>`;
  }

  function selectField(label,name,items,selectedValue){
    const options=items.map(item=>`<option value="${esc(item.value)}"${String(item.value)===String(selectedValue)?' selected':''}>${esc(item.label)}</option>`).join('');
    return `<label class="vensis-edit-field is-wide"><span>${esc(label)}</span><select name="${esc(name)}" required>${options}</select></label>`;
  }

  function textareaField(label,name,items,help=''){
    const value=Array.isArray(items)?items.join('\n'):String(items||'');
    return `<label class="vensis-edit-field is-wide"><span>${esc(label)}</span><textarea name="${esc(name)}" rows="5" maxlength="24000">${esc(value)}</textarea>${help?`<small>${esc(help)}</small>`:''}</label>`;
  }

  function seriesRecord(key){
    return window.VensisCatalog?.getSeries?.(key)||window.VensisCatalog?.series?.find?.(item=>String(item.id)===String(key))||null;
  }

  function listValue(value,splitCommas=false){
    const separator=splitCommas?/[,\n]+/:/\n+/;
    return [...new Set(String(value||'').split(separator).map(item=>item.trim()).filter(Boolean))];
  }

  function sameList(left,right){return JSON.stringify(left)===JSON.stringify(right)}

  function readFileDataUrl(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(String(reader.result||''));
      reader.onerror=()=>reject(new Error('The selected image could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  function validateSeriesImage(file){
    if(!file)return '';
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Choose a JPEG, PNG or WebP image.';
    if(file.size>3*1024*1024)return 'The image must be smaller than 3 MB.';
    return '';
  }

  function openSeriesEditor(key){
    if(!key)return;
    if(!state.configured){openLauncher();return}
    if(!state.authenticated){state.pendingSeriesKey=key;showLogin();return}
    const series=seriesRecord(key);
    if(!series){showToast('Series could not be opened for editing.');return}
    const description=series.description||{};
    const categories=Array.isArray(series.categories)?series.categories:[];
    showModal(`${head(series.code||series.title||'Product series','Edit the catalog identity, information and image for this series.')}<form id="vensisSeriesEditForm" class="vensis-edit-body"><input type="hidden" name="seriesKey" value="${esc(key)}"><div id="vensisSeriesEditMessage" class="vensis-edit-message"></div><div class="vensis-edit-section-title">Series Identity</div><div class="vensis-edit-grid">${field('Brand','manufacturer',series.manufacturer||'',{type:'text',required:true,maxLength:180})}${field('Visible Series Code','code',series.code||'',{type:'text',required:true,maxLength:180})}${field('Series Name','title',series.title||'',{type:'text',wide:true,required:true,maxLength:180})}${textareaField('Categories','categories',categories,'Enter one category per line. Commas are also accepted.')}</div><div class="vensis-edit-section-title">Series Image</div><div class="vensis-series-image-editor"><div class="vensis-series-image-preview"><img id="vensisSeriesImagePreview" src="${esc(series.media?.image||'')}" alt="${esc(series.code||series.title||'Series')}"></div><label class="vensis-edit-upload"><span>Choose a new image</span><input id="vensisSeriesImage" type="file" accept="image/jpeg,image/png,image/webp"><small>JPEG, PNG or WebP; maximum 3 MB. Leave empty to keep the current image.</small></label></div><div class="vensis-edit-section-title">Series Information</div><div class="vensis-edit-grid">${textareaField('General Information','general',description.general,'Enter one item per line.')}${textareaField('Motor Information','motor',description.motor,'Enter one item per line.')}${textareaField('Applications','applications',description.applications,'Enter one item per line.')}</div><p class="vensis-edit-note">The internal series key, model links and fan performance curves are protected.</p><div class="vensis-edit-actions"><button class="vensis-edit-secondary" type="button" data-edit-close>Cancel</button><button class="vensis-edit-primary" type="submit">Save to GitHub</button></div></form>`);
    dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    const form=dialog.querySelector('#vensisSeriesEditForm');
    const input=form?.querySelector('#vensisSeriesImage');
    input?.addEventListener('change',async()=>{
      const message=form.querySelector('#vensisSeriesEditMessage');
      const file=input.files?.[0];
      const error=validateSeriesImage(file);
      if(error){input.value='';message.className='vensis-edit-message is-error';message.textContent=error;return}
      if(!file)return;
      try{
        const dataUrl=await readFileDataUrl(file);
        form.querySelector('#vensisSeriesImagePreview').src=dataUrl;
        message.className='vensis-edit-message is-success';
        message.textContent='New image selected. It will be uploaded when you save.';
      }catch(readError){
        input.value='';
        message.className='vensis-edit-message is-error';
        message.textContent=readError.message;
      }
    });
    form?.addEventListener('submit',saveSeries);
  }

  async function saveSeries(event){
    event.preventDefault();
    if(state.busy)return;
    const form=event.currentTarget;
    const message=form.querySelector('#vensisSeriesEditMessage');
    const submit=form.querySelector('[type="submit"]');
    const seriesKey=form.querySelector('[name="seriesKey"]')?.value||'';
    const changes={};
    for(const name of ['manufacturer','code','title']){
      const input=form.querySelector(`[name="${name}"]`);
      const value=input.value.trim();
      if(!value){message.className='vensis-edit-message is-error';message.textContent=`${input.previousElementSibling?.textContent||name} cannot be empty.`;input.focus();return}
      if(value!==input.defaultValue.trim())changes[name]=value;
    }
    const listFields={categories:true,general:false,motor:false,applications:false};
    for(const [name,splitCommas] of Object.entries(listFields)){
      const input=form.querySelector(`[name="${name}"]`);
      const current=listValue(input.value,splitCommas);
      const initial=listValue(input.defaultValue,splitCommas);
      if(!sameList(current,initial))changes[name]=current;
    }
    const file=form.querySelector('#vensisSeriesImage')?.files?.[0]||null;
    const fileError=validateSeriesImage(file);
    if(fileError){message.className='vensis-edit-message is-error';message.textContent=fileError;return}
    if(!Object.keys(changes).length&&!file){message.className='vensis-edit-message is-success';message.textContent='No values changed.';return}

    state.busy=true;
    submit.disabled=true;
    submit.textContent=file?'Uploading…':'Committing…';
    message.className='vensis-edit-message';
    message.textContent=file?'Uploading the image and series information…':'';
    try{
      const image=file?{dataUrl:await readFileDataUrl(file),fileName:file.name}:null;
      const payload=await request('save-series.php',{method:'POST',body:{seriesKey,changes,image},csrf:true});
      state.busy=false;
      if(payload.unchanged){
        message.className='vensis-edit-message is-success';
        message.textContent='No values changed.';
        submit.disabled=false;
        submit.textContent='Save to GitHub';
        return;
      }
      const shortSha=String(payload.commitSha||'').slice(0,7);
      showModal(`${head('Series change committed','Hostinger will deploy the new GitHub commit automatically.')}<div class="vensis-edit-body"><div class="vensis-edit-message is-success">${esc(payload.series||'Product series')} was updated successfully.</div>${payload.commitUrl?`<p class="vensis-edit-note vensis-edit-commit">Commit: <a href="${esc(payload.commitUrl)}" target="_blank" rel="noopener">${esc(shortSha||'Open on GitHub')}</a></p>`:''}<p class="vensis-edit-note">Reload the page after deployment to see the new series information and image.</p><div class="vensis-edit-actions"><button class="vensis-edit-primary" type="button" data-edit-close>Done</button></div></div>`,true);
      dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    }catch(error){
      state.busy=false;
      submit.disabled=false;
      submit.textContent='Save to GitHub';
      if(error.status===401){
        setSession({configured:state.configured,persistentConfigReady:state.persistentConfigReady,authenticated:false});
        state.pendingSeriesKey=seriesKey;
        showLogin(error.message);
        return;
      }
      message.className='vensis-edit-message is-error';
      message.textContent=error.message;
    }
  }

  function newModelDefaults(seriesKey){
    const model=window.VensisCatalog?.modelsForSeries?.(seriesKey)?.[0]||null;
    return {
      voltage:model?.motor?.voltage||'',
      frequency:model?.motor?.frequency||'',
      fire:model?.technical?.fireRating||'',
      fanTypeEn:model?.technical?.fanType||'',
      mountTypeEn:model?.technical?.mountType||'',
      ipClass:model?.technical?.ipClass||''
    };
  }

  function applyNewModelDefaults(form,seriesKey){
    const defaults=newModelDefaults(seriesKey);
    for(const [name,value] of Object.entries(defaults)){
      const input=form.querySelector(`[name="${name}"]`);
      if(input)input.value=value;
    }
  }

  function openAddModel(seriesKey=''){
    if(!isCatalogPage())return;
    if(!state.configured){openLauncher();return}
    if(!state.authenticated){state.pendingNewSeriesKey=seriesKey||'__choose__';showLogin();return}
    const seriesItems=[...(window.VensisCatalog?.series||[])].sort((a,b)=>String(a.code||a.title||'').localeCompare(String(b.code||b.title||'')));
    if(!seriesItems.length){showToast('No catalog series is available.');return}
    const selected=seriesItems.some(item=>String(item.id)===String(seriesKey))?String(seriesKey):String(seriesItems[0].id);
    const defaults=newModelDefaults(selected);
    const options=seriesItems.map(item=>({value:item.id,label:`${item.code||item.id} — ${item.title||'Product series'}`}));
    showModal(`${head('Add Product Manually','Choose an existing series and enter the catalog values.')}<form id="vensisAddModelForm" class="vensis-edit-body"><div id="vensisAddModelMessage" class="vensis-edit-message"></div><div class="vensis-edit-section-title">Product Location</div><div class="vensis-edit-grid">${selectField('Series','seriesKey',options,selected)}${field('Model Name','model','',{type:'text',wide:true,required:true,maxLength:120})}</div><div class="vensis-edit-section-title">Catalog Values</div><div class="vensis-edit-grid">${field('Power (kW)','kw',0,{step:'0.01',max:100000})}${field('Speed (rpm)','rpm',0,{step:'1',max:100000})}${field('Current (A)','amps',0,{step:'0.01',max:1000000})}${field('Voltage','voltage',defaults.voltage,{type:'text'})}${field('Frequency','frequency',defaults.frequency,{type:'text'})}${field('Airflow (m³/h)','nominal',0,{step:'1',max:10000000})}${field('Noise dB(A)','spl',0,{step:'1',max:200})}${field('Fire Rating','fire',defaults.fire,{type:'text'})}${field('Fan Type','fanTypeEn',defaults.fanTypeEn,{type:'text'})}${field('Mount Type','mountTypeEn',defaults.mountTypeEn,{type:'text'})}${field('IP Class','ipClass',defaults.ipClass,{type:'text'})}${field('Price (€)','price',0,{step:'0.01'})}</div><div class="vensis-edit-message is-success vensis-edit-catalog-only"><b>Catalog product</b><br>This product will appear in Product Catalog and can be added to projects. Because no performance curve is entered here, it will not appear in Fan Selection results.</div><div class="vensis-edit-actions"><button class="vensis-edit-secondary" type="button" data-edit-close>Cancel</button><button class="vensis-edit-primary" type="submit">Add to GitHub</button></div></form>`);
    dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    const form=dialog.querySelector('#vensisAddModelForm');
    form?.querySelector('[name="seriesKey"]')?.addEventListener('change',event=>applyNewModelDefaults(form,event.currentTarget.value));
    form?.addEventListener('submit',saveNewModel);
  }

  async function saveNewModel(event){
    event.preventDefault();
    if(state.busy)return;
    const form=event.currentTarget;
    const message=form.querySelector('#vensisAddModelMessage');
    const submit=form.querySelector('[type="submit"]');
    const data=Object.fromEntries(new FormData(form).entries());
    const seriesKey=String(data.seriesKey||'');
    const model=String(data.model||'').trim();
    if(!seriesKey){message.className='vensis-edit-message is-error';message.textContent='Choose a series.';return}
    if(!model){message.className='vensis-edit-message is-error';message.textContent='Model Name cannot be empty.';form.querySelector('[name="model"]')?.focus();return}
    const numericFields=['kw','rpm','amps','nominal','spl','price'];
    const values={model};
    for(const name of numericFields){
      const input=form.querySelector(`[name="${name}"]`);
      if(input.value.trim()===''||!Number.isFinite(Number(input.value))){
        message.className='vensis-edit-message is-error';
        message.textContent=`${input.previousElementSibling?.textContent||name} must be a number.`;
        input.focus();
        return;
      }
      values[name]=Number(input.value);
    }
    for(const name of ['voltage','frequency','fire','fanTypeEn','mountTypeEn','ipClass'])values[name]=String(data[name]||'').trim();

    state.busy=true;
    submit.disabled=true;
    submit.textContent='Adding…';
    message.className='vensis-edit-message';
    message.textContent='Creating the product and committing it to GitHub…';
    try{
      const payload=await request('add-model.php',{method:'POST',body:{seriesKey,values},csrf:true});
      state.busy=false;
      const shortSha=String(payload.commitSha||'').slice(0,7);
      showModal(`${head('Product added','Hostinger will deploy the new GitHub commit automatically.')}<div class="vensis-edit-body"><div class="vensis-edit-message is-success">${esc(payload.model||'New product')} was added to ${esc(seriesRecord(seriesKey)?.code||seriesKey)}.</div>${payload.commitUrl?`<p class="vensis-edit-note vensis-edit-commit">Commit: <a href="${esc(payload.commitUrl)}" target="_blank" rel="noopener">${esc(shortSha||'Open on GitHub')}</a></p>`:''}<p class="vensis-edit-note">Reload the catalog after deployment to see the new product.</p><div class="vensis-edit-actions"><button class="vensis-edit-primary" type="button" data-edit-close>Done</button></div></div>`,true);
      dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    }catch(error){
      state.busy=false;
      submit.disabled=false;
      submit.textContent='Add to GitHub';
      if(error.status===401){
        setSession({configured:state.configured,persistentConfigReady:state.persistentConfigReady,authenticated:false});
        state.pendingNewSeriesKey=seriesKey||'__choose__';
        showLogin(error.message);
        return;
      }
      message.className='vensis-edit-message is-error';
      message.textContent=error.message;
    }
  }

  function openModelEditor(key){
    if(!key)return;
    if(!state.configured){openLauncher();return}
    if(!state.authenticated){state.pendingModelKey=key;showLogin();return}
    const model=modelRecord(key);
    if(!model){showToast('Model could not be opened for editing.');return}
    const motor=model.motor||{},technical=model.technical||{},pricing=model.pricing||{};
    const performance=model.performance||{};
    showModal(`${head(model.model||'Fan model','Edit every value displayed on this catalog model card.')}<form id="vensisModelEditForm" class="vensis-edit-body"><input type="hidden" name="modelKey" value="${esc(key)}"><div id="vensisModelEditMessage" class="vensis-edit-message"></div><div class="vensis-edit-section-title">Model</div><div class="vensis-edit-grid">${field('Model Name','model',model.model||'',{type:'text',wide:true,required:true})}</div><div class="vensis-edit-section-title">Catalog Values</div><div class="vensis-edit-grid">${field('Power (kW)','kw',numberValue(motor.power),{step:'0.01',max:100000})}${field('Speed (rpm)','rpm',numberValue(motor.speed),{step:'1',max:100000})}${field('Current (A)','amps',numberValue(motor.current),{step:'0.01',max:1000000})}${field('Voltage','voltage',motor.voltage||'',{type:'text'})}${field('Frequency','frequency',motor.frequency||'',{type:'text'})}${field('Airflow (m³/h)','nominal',numberValue(performance.nominalAirflow),{step:'1',max:10000000})}${field('Noise dB(A)','spl',numberValue(motor.sound),{step:'1',max:200})}${field('Fire Rating','fire',technical.fireRating||'',{type:'text'})}${field('Fan Type','fanTypeEn',technical.fanType||'',{type:'text'})}${field('Mount Type','mountTypeEn',technical.mountType||'',{type:'text'})}${field('IP Class','ipClass',technical.ipClass||'',{type:'text'})}${field('Price (€)','price',numberValue(pricing.listPrice),{step:'0.01'})}</div><p class="vensis-edit-note">The internal model key and performance curve are protected.</p><div class="vensis-edit-actions"><button class="vensis-edit-secondary" type="button" data-edit-close>Cancel</button><button class="vensis-edit-primary" type="submit">Save to GitHub</button></div></form>`);
    dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    dialog.querySelector('#vensisModelEditForm')?.addEventListener('submit',saveModel);
  }

  async function saveModel(event){
    event.preventDefault();
    if(state.busy)return;
    const form=event.currentTarget;
    const message=form.querySelector('#vensisModelEditMessage');
    const submit=form.querySelector('[type="submit"]');
    const values=Object.fromEntries(new FormData(form).entries());
    const modelKey=values.modelKey;
    const numericFields=new Set(['price','kw','rpm','amps','spl','nominal']);
    const changes={};
    for(const input of form.querySelectorAll('input[name]:not([name="modelKey"])')){
      if(input.value===input.defaultValue)continue;
      if(numericFields.has(input.name)){
        if(input.value.trim()===''||!Number.isFinite(Number(input.value))){
          if(message){message.className='vensis-edit-message is-error';message.textContent=`${input.previousElementSibling?.textContent||input.name} must be a number.`}
          input.focus();
          return;
        }
        changes[input.name]=Number(input.value);
      }else changes[input.name]=input.value.trim();
    }
    if(!Object.keys(changes).length){
      if(message){message.className='vensis-edit-message is-success';message.textContent='No values changed.'}
      return;
    }
    state.busy=true;
    submit.disabled=true;
    submit.textContent='Committing…';
    if(message){message.className='vensis-edit-message';message.textContent=''}
    try{
      const payload=await request('save-model.php',{method:'POST',body:{modelKey,changes},csrf:true});
      state.busy=false;
      if(payload.unchanged){
        if(message){message.className='vensis-edit-message is-success';message.textContent='No values changed.'}
        submit.disabled=false;
        submit.textContent='Save to GitHub';
        return;
      }
      const shortSha=String(payload.commitSha||'').slice(0,7);
      showModal(`${head('Change committed','Hostinger will deploy the new GitHub commit automatically.')}<div class="vensis-edit-body"><div class="vensis-edit-message is-success">${esc(payload.model||'Fan model')} was updated successfully.</div>${payload.commitUrl?`<p class="vensis-edit-note vensis-edit-commit">Commit: <a href="${esc(payload.commitUrl)}" target="_blank" rel="noopener">${esc(shortSha||'Open on GitHub')}</a></p>`:''}<p class="vensis-edit-note">Reload the page after deployment to see the new values.</p><div class="vensis-edit-actions"><button class="vensis-edit-primary" type="button" data-edit-close>Done</button></div></div>`,true);
      dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    }catch(error){
      state.busy=false;
      submit.disabled=false;
      submit.textContent='Save to GitHub';
      if(error.status===401){
        setSession({configured:state.configured,persistentConfigReady:state.persistentConfigReady,authenticated:false});
        state.pendingModelKey=modelKey;
        showLogin(error.message);
        return;
      }
      if(message){message.className='vensis-edit-message is-error';message.textContent=error.message}
    }
  }

  async function init(){
    mount();
    await refreshSession();
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  window.VensisEditMode={open:openLauncher,add:openAddModel,edit:openModelEditor,editSeries:openSeriesEditor,refresh:refreshSession};
})();
