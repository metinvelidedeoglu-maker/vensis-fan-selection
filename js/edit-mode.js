(function(){
  'use strict';

  const API_BASE='api/edit';
  const state={configured:false,authenticated:false,csrf:'',pendingModelKey:'',busy:false};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const numberValue=value=>Number.isFinite(Number(value))?Number(value):0;
  let launcher,overlay,dialog,toastTimer;

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
    if(!document.body.classList.contains('app-catalog'))return;
    if(document.getElementById('vensisEditLauncher'))return;
    launcher=document.createElement('button');
    launcher.id='vensisEditLauncher';
    launcher.className='vensis-edit-launcher';
    launcher.type='button';
    launcher.title='Open secure Edit Mode';
    launcher.setAttribute('aria-label','Open secure Edit Mode');
    launcher.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="m13.8 7.8 3 3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
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
      const editButton=event.target.closest('[data-edit-model]');
      if(!editButton)return;
      event.preventDefault();
      event.stopPropagation();
      openModelEditor(editButton.dataset.editModel||'');
    });
  }

  function setSession(payload){
    state.configured=Boolean(payload?.configured??true);
    state.authenticated=Boolean(payload?.authenticated);
    state.csrf=state.authenticated?String(payload?.csrf||''):'';
    document.body.classList.toggle('vensis-edit-authenticated',state.authenticated);
    launcher?.classList.toggle('is-active',state.authenticated);
    if(launcher){
      launcher.title=state.authenticated?'Edit Mode is active':'Open secure Edit Mode';
      launcher.setAttribute('aria-label',launcher.title);
    }
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
    return `<header class="vensis-edit-head"><div><span class="vensis-edit-kicker">Secure Edit Mode</span><h2 id="vensisEditTitle">${esc(title)}</h2>${subtitle?`<p>${esc(subtitle)}</p>`:''}</div><button class="vensis-edit-close" type="button" data-edit-close aria-label="Close">×</button></header>`;
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
      showModal(`${head('Setup required','The secure server settings have not been completed yet.')}<div class="vensis-edit-body"><div class="vensis-edit-message is-error">Edit Mode is installed but not configured on Hostinger.</div><p class="vensis-edit-note">The password hash and GitHub access token must be stored only in the server configuration.</p><div class="vensis-edit-actions"><button class="vensis-edit-secondary" type="button" data-edit-close>Close</button></div></div>`,true);
      dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
      return;
    }
    if(!state.authenticated){showLogin();return}
    showSessionPanel();
  }

  function showLogin(message=''){
    showModal(`${head('Sign in','Enter the Edit Mode password. It is verified only on the server.')}<form id="vensisEditLogin" class="vensis-edit-body"><div id="vensisEditLoginMessage" class="vensis-edit-message${message?' is-error':''}">${esc(message)}</div><label class="vensis-edit-field"><span>Password</span><input id="vensisEditPassword" type="password" autocomplete="current-password" maxlength="1024" required></label><div class="vensis-edit-actions"><button class="vensis-edit-secondary" type="button" data-edit-close>Cancel</button><button class="vensis-edit-primary" type="submit">Open Edit Mode</button></div></form>`,true);
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
      const pending=state.pendingModelKey;
      state.pendingModelKey='';
      closeModal();
      showToast('Secure Edit Mode opened.');
      if(pending)setTimeout(()=>openModelEditor(pending),50);
    }catch(error){
      state.busy=false;
      submit.disabled=false;
      submit.textContent='Open Edit Mode';
      if(message){
        message.className='vensis-edit-message is-error';
        message.textContent=error.retryAfter?`${error.message} (${Math.ceil(error.retryAfter/60)} min)`:error.message;
      }
      form.querySelector('#vensisEditPassword')?.select();
    }
  }

  function showSessionPanel(){
    showModal(`${head('Catalog Edit Mode active','All values shown on catalog model cards can be changed.')}<div class="vensis-edit-body"><div class="vensis-edit-status"><span class="vensis-edit-status-dot"></span><div><b>Secure session is open</b><small>Changes are committed to GitHub and then deployed by Hostinger.</small></div></div><p class="vensis-edit-note">Open a product series and use the pencil button on the model card. The internal model key and performance curve remain protected.</p><div class="vensis-edit-actions"><button id="vensisEditLogout" class="vensis-edit-danger" type="button">Sign out</button><button class="vensis-edit-primary" type="button" data-edit-close>Continue editing</button></div></div>`,true);
    dialog.querySelectorAll('[data-edit-close]').forEach(button=>button.addEventListener('click',closeModal));
    dialog.querySelector('#vensisEditLogout')?.addEventListener('click',logout);
  }

  async function logout(){
    if(state.busy)return;
    state.busy=true;
    const button=dialog.querySelector('#vensisEditLogout');
    if(button){button.disabled=true;button.textContent='Signing out…'}
    try{await request('logout.php',{method:'POST',body:{},csrf:true})}catch{}
    setSession({configured:state.configured,authenticated:false});
    closeModal();
    showToast('Edit Mode closed.');
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
      ? `type="text" maxlength="120"${options.required?' required':''}`
      : `type="number" min="${options.min??0}" max="${options.max??10000000}" step="${options.step||'any'}"`;
    return `<label class="vensis-edit-field${options.wide?' is-wide':''}"><span>${esc(label)}</span><input name="${esc(name)}" ${attributes} value="${esc(value)}"></label>`;
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
        setSession({configured:state.configured,authenticated:false});
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
  window.VensisEditMode={open:openLauncher,edit:openModelEditor,refresh:refreshSession};
})();
