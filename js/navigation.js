const NAV_ACTIVE_PROJECT='vensis_active_project_v2';
const NAV_LEGACY_ITEMS='vensis_selection_project_v1';
const NAV_LEGACY_META='vensis_selection_project_meta_v1';

function goHomeAndClearProject(){
  localStorage.removeItem(NAV_ACTIVE_PROJECT);
  localStorage.removeItem(NAV_LEGACY_ITEMS);
  localStorage.removeItem(NAV_LEGACY_META);
  window.location.href='index.html';
}

function goFanSelectionWithProject(){
  const activeId=localStorage.getItem(NAV_ACTIVE_PROJECT);
  if(!activeId){
    alert('No active project selected. Please open a project first.');
    window.location.href='project.html';
    return;
  }
  window.location.href='index.html';
}
