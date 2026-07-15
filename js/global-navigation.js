(function(){
  const PROJECTS='vensis_projects_v2';
  const ACTIVE='vensis_active_project_v2';
  const ITEMS='vensis_selection_project_v1';
  const META='vensis_selection_project_meta_v1';

  function loadProjects(){
    try{
      const data=JSON.parse(localStorage.getItem(PROJECTS)||'[]');
      return Array.isArray(data)?data:[];
    }catch(e){return []}
  }

  window.goMainPage=function(){
    localStorage.removeItem(ACTIVE);
    localStorage.removeItem(ITEMS);
    localStorage.removeItem(META);
    location.href='index.html';
  };

  window.goFanSelectionForActiveProject=function(){
    const id=localStorage.getItem(ACTIVE);
    const project=loadProjects().find(p=>p.id===id);
    if(!project){
      alert('Please open a project first.');
      location.href='project.html';
      return;
    }
    localStorage.setItem(ITEMS,JSON.stringify(project.items||[]));
    localStorage.setItem(META,JSON.stringify(project.meta||{}));
    location.href='index.html';
  };

  function activeProject(){
    const id=localStorage.getItem(ACTIVE);
    return loadProjects().find(p=>p.id===id)||null;
  }

  function renamePreviewButton(){
    const page=(location.pathname.split('/').pop()||'').toLowerCase();
    if(page!=='project-edit.html')return;
    document.querySelectorAll('button').forEach(btn=>{
      if(btn.textContent.trim()==='PDF / Print')btn.textContent='Preview';
    });
  }

  function installEmailAction(){
    const page=(location.pathname.split('/').pop()||'').toLowerCase();
    if(page!=='project-report.html')return;
    const toolbar=document.querySelector('.toolbar');
    if(!toolbar||document.getElementById('sendEmailBtn'))return;

    const btn=document.createElement('button');
    btn.id='sendEmailBtn';
    btn.className='primary';
    btn.textContent='Send by Email';
    btn.onclick=openEmailDialog;
    toolbar.appendChild(btn);

    const modal=document.createElement('div');
    modal.id='emailDialog';
    modal.style.cssText='display:none;position:fixed;inset:0;z-index:100000;background:rgba(10,25,20,.55);padding:18px;align-items:center;justify-content:center';
    modal.innerHTML=`<div style="width:min(94vw,520px);background:#fff;border-radius:14px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.25)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px"><h3 style="margin:0">Send Project Report</h3><button type="button" onclick="closeEmailDialog()" style="border:0;background:#eef3f0;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer">×</button></div>
      <label style="display:block;font-size:12px;font-weight:700;margin:10px 0 5px">Company Name</label><input id="emailCompany" style="width:100%;padding:10px;border:1px solid #cfdcd4;border-radius:8px"><label style="display:block;font-size:12px;font-weight:700;margin:10px 0 5px">Contact Person</label><input id="emailContact" style="width:100%;padding:10px;border:1px solid #cfdcd4;border-radius:8px"><label style="display:block;font-size:12px;font-weight:700;margin:10px 0 5px">To</label><input id="emailTo" type="email" style="width:100%;padding:10px;border:1px solid #cfdcd4;border-radius:8px">
      <label style="display:block;font-size:12px;font-weight:700;margin:10px 0 5px">CC</label><input id="emailCc" type="email" style="width:100%;padding:10px;border:1px solid #cfdcd4;border-radius:8px">
      <label style="display:block;font-size:12px;font-weight:700;margin:10px 0 5px">Subject</label><input id="emailSubject" style="width:100%;padding:10px;border:1px solid #cfdcd4;border-radius:8px">
      <label style="display:block;font-size:12px;font-weight:700;margin:10px 0 5px">Message</label><textarea id="emailMessage" style="width:100%;min-height:130px;padding:10px;border:1px solid #cfdcd4;border-radius:8px;font:inherit"></textarea>
      <div style="font-size:11px;color:#6f7d76;margin-top:9px">Your email application will open with these details.</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" onclick="closeEmailDialog()" style="border:1px solid #173f46;background:#fff;color:#173f46;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer">Cancel</button><button type="button" onclick="sendProjectEmail()" style="border:0;background:#006b3c;color:#fff;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer">Send by Email</button></div>
    </div>`;
    document.body.appendChild(modal);
  }

  window.openEmailDialog=function(){
    const p=activeProject();
    const meta=p?.meta||{};
    const no=meta.projectNo||'Project';
    document.getElementById('emailCompany').value=meta.companyName||meta.customer||'';
    document.getElementById('emailContact').value=meta.contactPerson||'';
    document.getElementById('emailTo').value=meta.email||'';
    document.getElementById('emailSubject').value='VENSIS Fan Selection - '+no;
    const greeting=meta.contactPerson?('Dear '+meta.contactPerson+','):'Dear Sir/Madam,';
    document.getElementById('emailMessage').value=greeting+'\n\nPlease find the fan selection report for '+(meta.name||no)+'.\n\nBest regards,\nVENSIS';
    const modal=document.getElementById('emailDialog');
    modal.style.display='flex';
    setTimeout(()=>document.getElementById('emailTo')?.focus(),50);
  };

  window.closeEmailDialog=function(){
    const modal=document.getElementById('emailDialog');
    if(modal)modal.style.display='none';
  };

  window.sendProjectEmail=function(){
    const company=document.getElementById('emailCompany').value.trim();
    const contact=document.getElementById('emailContact').value.trim();
    const to=document.getElementById('emailTo').value.trim();
    const cc=document.getElementById('emailCc').value.trim();
    const subject=document.getElementById('emailSubject').value.trim();
    const body=document.getElementById('emailMessage').value;
    if(!to){alert('Please enter an email address.');return;}
    const id=localStorage.getItem(ACTIVE);
    const projects=loadProjects();
    const index=projects.findIndex(p=>p.id===id);
    if(index>=0){
      projects[index].meta={...(projects[index].meta||{}),companyName:company,customer:company,contactPerson:contact,email:to};
      projects[index].updatedAt=new Date().toISOString();
      localStorage.setItem(PROJECTS,JSON.stringify(projects));
      localStorage.setItem(META,JSON.stringify(projects[index].meta));
    }
    const params=new URLSearchParams();
    if(cc)params.set('cc',cc);
    if(subject)params.set('subject',subject);
    if(body)params.set('body',body);
    location.href='mailto:'+encodeURIComponent(to)+'?'+params.toString();
  };

  function installSaveFeedback(){
    const page=(location.pathname.split('/').pop()||'').toLowerCase();
    if(page!=='project-edit.html')return;
    const state=document.getElementById('saveState');
    if(!state)return;

    state.style.minWidth='92px';
    state.style.transition='opacity .25s ease, transform .25s ease';
    state.style.opacity='0';

    let timer;
    const saving=()=>{
      clearTimeout(timer);
      state.textContent='⟳ Saving…';
      state.style.color='#fff4c2';
      state.style.opacity='1';
      state.style.transform='translateY(0)';
      timer=setTimeout(()=>{
        state.textContent='✓ Saved';
        state.style.color='#d9ffe9';
        state.style.opacity='1';
        timer=setTimeout(()=>{
          state.style.opacity='0';
          state.style.transform='translateY(-2px)';
        },1300);
      },300);
    };

    ['projectName','customer','projectDate','status','notes'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el)return;
      el.addEventListener('input',saving,{capture:true});
      el.addEventListener('change',saving,{capture:true});
    });

    state.textContent='✓ Saved';
    state.style.color='#d9ffe9';
    state.style.opacity='1';
    setTimeout(()=>state.style.opacity='0',900);
  }

  function inject(){
    renamePreviewButton();
    installEmailAction();
    installSaveFeedback();
    if(document.getElementById('globalNavDock'))return;
    const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const dock=document.createElement('div');
    dock.id='globalNavDock';
    dock.style.cssText='position:fixed;right:14px;bottom:14px;z-index:99999;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end';
    const home=document.createElement('button');
    home.textContent='⌂ Main Page';
    home.onclick=window.goMainPage;
    home.style.cssText='border:0;border-radius:9px;padding:10px 13px;font-weight:700;cursor:pointer;background:#173f46;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)';
    dock.appendChild(home);
    if(page==='project-edit.html'||page==='project-report.html'){
      const fan=document.createElement('button');
      fan.textContent='＋ Fan Selection';
      fan.onclick=window.goFanSelectionForActiveProject;
      fan.style.cssText='border:0;border-radius:9px;padding:10px 13px;font-weight:700;cursor:pointer;background:#006b3c;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.18)';
      dock.insertBefore(fan,home);
    }
    document.body.appendChild(dock);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);
  else inject();
})();
