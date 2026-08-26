const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const mainSource=fs.readFileSync(path.join(__dirname,'../js/main.js'),'utf8');

function createHarness(isMobile){
  const elements={};
  const createSlider=value=>({
    value:String(value),step:'1',style:{},focused:false,
    focus(){this.focused=true}
  });
  for(const prefix of ['q','p']){
    elements[prefix+'minSlider']=createSlider(-10);
    elements[prefix+'maxSlider']=createSlider(20);
    elements[prefix+'min']={value:'-10'};
    elements[prefix+'max']={value:'20'};
    elements[prefix+'minText']={textContent:'-10'};
    elements[prefix+'maxText']={textContent:'20'};
    elements[prefix+'RangeFill']={style:{}};
  }

  const controls=['q','p'].map(prefix=>({
    dataset:{tolerancePrefix:prefix},listeners:{},
    addEventListener(type,listener){this.listeners[type]=listener},
    querySelector(selector){
      return selector==='.dual-range'?{getBoundingClientRect:()=>({left:0,width:150})}:null;
    }
  }));
  const media={
    matches:isMobile,listeners:{},
    addEventListener(type,listener){this.listeners[type]=listener}
  };
  const document={
    readyState:'complete',activeElement:null,
    getElementById:id=>elements[id]||null,
    querySelectorAll:selector=>selector==='.tolerance-control'?controls:[],
    addEventListener(){}
  };
  const window={
    VensisUtils:{byId:id=>elements[id]||null},
    VensisState:{},
    VensisFilters:{render(){}},
    VensisResults:{render(){},setSort(){}},
    matchMedia:()=>media
  };
  const context={window,document,Math,Number,Object,Array,String,Boolean};
  vm.runInNewContext(mainSource,context);
  return {window,document,elements,controls,media};
}

function tap(control,clientX,target={closest:()=>null}){
  let prevented=false;
  control.listeners.click({
    clientX,currentTarget:control,
    target,
    preventDefault(){prevented=true}
  });
  return prevented;
}

test('mobile tolerance controls use 10 percent steps and the full scale is tappable',()=>{
  const {elements,controls,media}=createHarness(true);
  assert.equal(Number(elements.qminSlider.step),10);
  assert.equal(Number(elements.qmaxSlider.step),10);

  assert.equal(tap(controls[0],80),true);
  assert.equal(Number(elements.qmaxSlider.value),30);
  assert.equal(elements.qmax.value,30);
  assert.equal(elements.qmaxText.textContent,30);

  tap(controls[0],10);
  assert.equal(Number(elements.qminSlider.value),-40);
  assert.equal(elements.qmin.value,-40);
  assert.equal(elements.qminSlider.focused,true);

  const endLabel={
    dataset:{toleranceValue:'100'},
    closest(selector){return selector==='[data-tolerance-value]'?this:null}
  };
  tap(controls[0],138,endLabel);
  assert.equal(Number(elements.qmaxSlider.value),100);

  media.matches=false;
  media.listeners.change();
  assert.equal(Number(elements.qminSlider.step),1);
  assert.equal(Number(elements.qmaxSlider.step),1);
});

test('desktop tolerance controls retain one percent precision',()=>{
  const {window,elements,controls}=createHarness(false);
  assert.equal(Number(elements.qminSlider.step),1);
  assert.equal(Number(elements.qmaxSlider.step),1);

  elements.qmaxSlider.value='23';
  window.syncDualTolerance('q','max');
  assert.equal(Number(elements.qmaxSlider.value),23);

  tap(controls[0],83);
  assert.equal(Number(elements.qmaxSlider.value),33);
});

test('selection page exposes responsive tolerance hit areas and cache-busted assets',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../fan-selection.html'),'utf8');
  const css=fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');
  assert.equal((html.match(/class="tolerance-control"/g)||[]).length,2);
  assert.match(html,/data-tolerance-prefix="q"/);
  assert.match(html,/data-tolerance-prefix="p"/);
  assert.equal((html.match(/step="1"/g)||[]).length,4);
  assert.match(html,/css\/app\.css\?v=20260812-responsive-tolerance/);
  assert.match(html,/js\/main\.js\?v=20260812-responsive-tolerance/);
  const mobileCss=css.slice(css.indexOf('@media(max-width:1000px)'),css.indexOf('@media(max-width:560px)'));
  assert.match(mobileCss,/\.tolerance-control\{margin:0 -6px;padding:0 6px 3px\}/);
  assert.match(mobileCss,/\.dual-range-scale\{min-height:34px;padding-top:3px\}/);
});
