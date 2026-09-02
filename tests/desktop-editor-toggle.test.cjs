const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('access gate loads the desktop editor toggle only on project documents',()=>{
  const access=read('js/access-gate.js');
  assert.match(access,/desktopEditorPages=\['\/project\.html','\/quotation\.html'\]/);
  assert.match(access,/js\/desktop-editor-toggle\.js\?v=20260902-r1/);
  assert.match(access,/data\.vensisDesktopEditorToggle|dataset\.vensisDesktopEditorToggle/);
});

test('project and quotation editors collapse only on desktop',()=>{
  const source=read('js/desktop-editor-toggle.js');
  assert.match(source,/\(min-width: 1101px\)/);
  assert.match(source,/\.project-workspace/);
  assert.match(source,/\.project-editor/);
  assert.match(source,/\.quotation-workspace/);
  assert.match(source,/\.quotation-editor/);
  assert.match(source,/grid-template-columns:64px minmax\(0,1fr\)/);
  assert.match(source,/media\.matches&&collapsed/);
});

test('each editor remembers its own collapsed state and remains accessible',()=>{
  const source=read('js/desktop-editor-toggle.js');
  assert.match(source,/vensis_project_editor_collapsed_v1/);
  assert.match(source,/vensis_quotation_editor_collapsed_v1/);
  assert.match(source,/localStorage\.getItem/);
  assert.match(source,/localStorage\.setItem/);
  assert.match(source,/aria-expanded/);
  assert.match(source,/button\.type='button'/);
});
