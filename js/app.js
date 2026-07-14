const models=window.models||[];
let results=[],selected=0;
function toggleSec(el){el.parentElement.classList.toggle('open')}
function n(id){return Number(document.getElementById(id).value)}
function fmt(x,d=0){return new Intl.NumberFormat('tr-TR',{maximumFractionDigits:d,minimumFractionDigits:d}).format(x)}
function interpolate(points,p){
 points=points.slice().sort((a,b)=>a[0]-b[0]); if(p<points[0][0]||p>points.at(-1)[0])return null;
 for(let i=0;i<points.length;i++){if(p===points[i][0])return points[i][1];if(i<points.length-1){let [p1,q1]=points[i],[p2,q2]=points[i+1];if(p>p1&&p<p2)return q1+(p-p1)/(p2-p1)*(q2-q1)}} return null;
}


let holdSpeechRecognition=null;
let holdSpeechActive=false;
let holdSpeechFinal='';

function holdSpeechSupported(){
  return !!(window.SpeechRecognition||window.webkitSpeechRecognition);
}

function normalizeSpeechTranscript(text){
  return String(text||'')
    .replace(/\s+/g,' ')
    .replace(/\bmetreküp(?:\s*\/?\s*saat)?\b/gi,'m³/h')
    .replace(/\bmetre\s*küp(?:\s*\/?\s*saat)?\b/gi,'m³/h')
    .replace(/\bpascal\b/gi,'Pa')
    .replace(/\bmilimetre\s*su\s*sütunu\b/gi,'mmSS')
    .replace(/\bmilimetre\s*su\b/gi,'mmSS')
    .replace(/\baksiyel\b/gi,'axial')
    .replace(/\s*,\s*/g,', ')
    .trim();
}

function buildHoldSpeech(){
  if(!holdSpeechSupported())return null;

  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new SR();
  rec.lang='tr-TR';
  rec.continuous=false;
  rec.interimResults=false;
  rec.maxAlternatives=1;

  rec.onstart=()=>{
    holdSpeechActive=true;
    holdSpeechFinal='';
    const b=document.getElementById('holdMicBtn');
    b.classList.add('recording');
    b.innerHTML='<span class="icon-label"><span class="ui-icon">🔴</span>Listening... Release to transcribe</span>';
    document.getElementById('holdMicStatus').textContent='Speak now.';
  };

  rec.onresult=(event)=>{
    let finalText='';
    for(let i=event.resultIndex;i<event.results.length;i++){
      if(event.results[i].isFinal){
        finalText+=event.results[i][0].transcript+' ';
      }
    }
    holdSpeechFinal=normalizeSpeechTranscript(finalText);
  };

  rec.onerror=(event)=>{
    document.getElementById('holdMicStatus').textContent='Microphone error: '+event.error;
  };

  rec.onend=()=>{
    holdSpeechActive=false;
    const b=document.getElementById('holdMicBtn');
    b.classList.remove('recording');
    b.innerHTML='<span class="icon-label"><span class="ui-icon">🎙</span>Hold to Speak</span>';

    if(holdSpeechFinal){
      document.getElementById('smartText').value=holdSpeechFinal;
      document.getElementById('holdMicStatus').textContent='Transcribed. Review the text, then press Process Request.';
    }else{
      document.getElementById('holdMicStatus').textContent='No speech detected.';
    }
  };

  return rec;
}

function startHoldSpeech(event){
  event.preventDefault();

  if(!holdSpeechSupported()){
    alert('Speech recognition is not supported. Use Chrome or Edge.');
    return;
  }

  if(holdSpeechActive)return;
  if(!holdSpeechRecognition)holdSpeechRecognition=buildHoldSpeech();

  holdSpeechFinal='';

  try{
    holdSpeechRecognition.start();
  }catch(e){
    document.getElementById('holdMicStatus').textContent='Microphone could not be started.';
  }
}

function stopHoldSpeech(event){
  event.preventDefault();
  if(holdSpeechRecognition&&holdSpeechActive){
    holdSpeechRecognition.stop();
  }
}

function cancelHoldSpeech(event){
  if(event)event.preventDefault();
  if(holdSpeechRecognition&&holdSpeechActive){
    holdSpeechRecognition.abort();
  }
}

function normalizeTRNumber(s){
  if(!s) return null;
  s=s.toLowerCase().trim().replace(/bin/g,'000').replace(/\s/g,'');
  if(s.includes('.')&&s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  else if(s.includes(',')) s=s.replace(',','.');
  else if(/^\d{1,3}(?:\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  const v=Number(s); return Number.isFinite(v)?v:null;
}

function cleanSmartText(raw){
  return String(raw||'')
    .toLowerCase()
    .replace(/₂/g,'2').replace(/³/g,'3').replace(/\^3/g,'3')
    .replace(/ı/g,'i')
    .replace(/metre\s*küp|metreküp|metrekub|metrekup/g,'m3')
    .replace(/milimetre\s*su\s*sütunu|milimetre\s*su|mm\s*su/g,'mmss')
    .replace(/pascal/g,'pa')
    .replace(/çift\s*kutup/g,'2 kutup')
    .replace(/dört\s*kutup/g,'4 kutup')
    .replace(/altı\s*kutup/g,'6 kutup')
    .replace(/sekiz\s*kutup/g,'8 kutup')
    .replace(/\s+/g,' ')
    .trim();
}

function normalizeWord(value){
  return String(value||'')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'')
    .trim();
}

function editDistance(a,b){
  a=normalizeWord(a); b=normalizeWord(b);
  const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let prev=row[0]; row[0]=i;
    for(let j=1;j<=b.length;j++){
      const tmp=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
      prev=tmp;
    }
  }
  return row[b.length];
}

function hasAlias(text,aliases){
  const words=text.split(/[^a-z0-9çğıöşü-]+/i).filter(Boolean);
  return aliases.some(alias=>{
    const cleanAlias=alias.toLowerCase();
    if(cleanAlias.includes(' ')||cleanAlias.includes('-')){
      if(text.includes(cleanAlias))return true;
    }
    const target=normalizeWord(cleanAlias);
    return words.some(word=>{
      const w=normalizeWord(word);
      if(w===target)return true;
      if(target.length>=5 && editDistance(w,target)<=1)return true;
      return false;
    });
  });
}

function getNumberImmediatelyBeforeUnit(text,unitRegex){
  const re=new RegExp('(\\d{1,3}(?:[\\.,]\\d{3})+|\\d+(?:[\\.,]\\d+)?)\\s*'+unitRegex,'i');
  const m=text.match(re);
  return m?normalizeTRNumber(m[1]):null;
}

function getNumberNearWords(text,words){
  const joined=words.join('|');
  let m=text.match(new RegExp('(\\d{1,3}(?:[\\.,]\\d{3})+|\\d+(?:[\\.,]\\d+)?)\\s*(?:'+joined+')\\b','i'));
  if(m)return normalizeTRNumber(m[1]);
  m=text.match(new RegExp('(?:'+joined+')\\s*[:=]?\\s*(\\d{1,3}(?:[\\.,]\\d{3})+|\\d+(?:[\\.,]\\d+)?)','i'));
  return m?normalizeTRNumber(m[1]):null;
}

function addRecognitionChip(label,value,warning=false){
  const box=document.getElementById('aiRecognition');
  if(!box)return;
  const chip=document.createElement('span');
  chip.className='ai-chip'+(warning?' warn':'');
  chip.textContent=label+': '+value;
  box.appendChild(chip);
}

function parseSmart(){
  const raw=document.getElementById('smartText').value;
  const t=cleanSmartText(raw);
  const recognition=document.getElementById('aiRecognition');
  if(recognition)recognition.innerHTML='';

  selectedTags.clear();
  selectedSeries.clear();

  let q=null,pPa=null,pole=null,maxkw=null,m;

  q=getNumberImmediatelyBeforeUnit(
    t,
    '(?:m3\\s*\\/?\\s*h|m3h|m3|l\\s*\\/?\\s*s|l\\s*\\/?\\s*sn|lps)\\b'
  );
  if(q===null)q=getNumberNearWords(t,['airflow','flow','debi']);
  if(q!==null && /(?:l\s*\/?\s*s|l\s*\/?\s*sn|lps)\b/i.test(t))q=q*3.6;

  let v=getNumberImmediatelyBeforeUnit(t,'kpa\\b');
  if(v!==null)pPa=v*1000;
  if(pPa===null){
    v=getNumberImmediatelyBeforeUnit(t,'(?:mbar|millibar)\\b');
    if(v!==null)pPa=v*100;
  }
  if(pPa===null){
    v=getNumberImmediatelyBeforeUnit(t,'bar\\b');
    if(v!==null)pPa=v*100000;
  }
  if(pPa===null){
    v=getNumberImmediatelyBeforeUnit(t,'(?:mmss|mm\\s*ss|mmh2o|mm\\s*h2o|mmwg|mm\\s*wg|mmca|mmssu)\\b');
    if(v!==null)pPa=v*9.80665;
  }
  if(pPa===null){
    v=getNumberImmediatelyBeforeUnit(t,'pa\\b');
    if(v!==null)pPa=v;
  }
  if(pPa===null)pPa=getNumberNearWords(t,['pressure','basinc','basınç']);

  m=t.match(/\b([2468])\s*(?:kutup|pole|poles)\b/i);
  if(m)pole=m[1];

  m=t.match(/(?:max(?:imum)?|under|below|altinda|altında)?\s*(\d+(?:[\\.,]\d+)?)\s*kw\b/i);
  if(m)maxkw=normalizeTRNumber(m[1]);

  if(q===null||pPa===null){
    m=t.match(/(\d{3,6})\s*[@\/\-]\s*(\d{2,4})\b/);
    if(m){
      if(q===null)q=normalizeTRNumber(m[1]);
      if(pPa===null)pPa=normalizeTRNumber(m[2]);
    }
  }

  const tagAliases=[
    ['Aksiyal',['axial','aksiyal','aksiyel','axiall']],
    ['Radyal',['radial','radyal','radyel']],
    ['Salyangoz',['centrifugal','salyangoz','snail']],
    ['Kanal Tipi',['duct','dukt','kanal','inline']],
    ['Hücreli',['cabinet','cab','cell','hucreli','hücreli','box']],
    ['Çatı Tipi',['roof','cati','çatı']],
    ['Jetfan',['jet','jetfan','jet fan']],
    ['Tünel Tipi',['tunnel','tunel','tünel']],
    ['Exproof / ATEX',['exproof','ex-proof','exproff','explosion proof','explosion-proof','atex','attex']],
    ['Duman Tahliye',['smoke','smooke','smoke exhaust','smoke extract','duman','duman tahliye','duman egzost','egzoz','aspirasyon']],
    ['Duvar Tipi',['wall','wall mounted','wall-mounted','duvar']],
    ['Mobil',['mobile','mobil','portable']],
    ['Bifurcated',['bifurcated','bifurcate']],
    ['Kısa Kasalı',['short casing','short-casing','kisa kasa','kısa kasa']],
    ['EC',['ec fan','electronically commutated','high efficiency','energy saving','yuksek verim','yüksek verim','enerji tasarrufu']],
    ['Isı Geri Kazanım',['heat recovery','isi geri kazanim','ısı geri kazanım']],
    ['Sığınak',['shelter','siginak','sığınak']]
  ];

  for(const [tag,aliases] of tagAliases){
    if(hasAlias(t,aliases))selectedTags.add(tag);
  }

  if(/ucuz|ekonomik|lowest price|cheap/i.test(t))document.getElementById('sort').value='economic';
  else if(/sessiz|dusuk ses|düşük ses|az ses|quiet|low noise/i.test(t))document.getElementById('sort').value='quiet';
  else if(/dusuk motor|düşük motor|az kw|az guc|az güç|low power/i.test(t))document.getElementById('sort').value='power';
  else document.getElementById('sort').value='closest';

  if(q!==null){
    document.getElementById('q').value=Math.round(q);
    addRecognitionChip('Flow',Math.round(q)+' m³/h');
  }
  if(pPa!==null){
    document.getElementById('p').value=Math.round(pPa);
    addRecognitionChip('Pressure',Math.round(pPa)+' Pa');
  }
  if(pole){
    document.getElementById('pole').value=pole;
    addRecognitionChip('Motor',pole+' pole');
  }
  if(maxkw!==null){
    document.getElementById('maxkw').value=maxkw;
    addRecognitionChip('Max Power',maxkw+' kW');
  }
  if(/f\s*[- ]?300/i.test(t))document.getElementById('fire').value='F300';

  selectedTags.forEach(tag=>addRecognitionChip('Type',tagDisplayName(tag)));

  if(q===null)addRecognitionChip('Flow','not detected',true);
  if(pPa===null)addRecognitionChip('Pressure','not detected',true);

  renderTagSeries();
updateSelectionProjectCount();

  if(q!==null&&pPa!==null)runSelection();
  else{
    document.getElementById('range').innerHTML='Review the detected values before running selection.';
    results=[];
    render();
  }
}

function dualRangePercent(value){
  return ((Number(value)+50)/150)*100;
}

function syncDualTolerance(prefix){
  const minSlider=document.getElementById(prefix+'minSlider');
  const maxSlider=document.getElementById(prefix+'maxSlider');
  if(!minSlider||!maxSlider)return;

  let minValue=Math.round(Number(minSlider.value)/5)*5;
  let maxValue=Math.round(Number(maxSlider.value)/5)*5;

  if(minValue>maxValue-5){
    if(document.activeElement===minSlider)minValue=maxValue-5;
    else maxValue=minValue+5;
  }

  minValue=Math.max(-50,Math.min(95,minValue));
  maxValue=Math.max(-45,Math.min(100,maxValue));

  minSlider.value=minValue;
  maxSlider.value=maxValue;

  document.getElementById(prefix+'min').value=minValue;
  document.getElementById(prefix+'max').value=maxValue;
  document.getElementById(prefix+'minText').textContent=minValue;
  document.getElementById(prefix+'maxText').textContent=maxValue;

  const fill=document.getElementById(prefix+'RangeFill');
  if(fill){
    const left=dualRangePercent(minValue);
    const right=dualRangePercent(maxValue);
    fill.style.left=left+'%';
    fill.style.right=(100-right)+'%';
  }

  minSlider.style.zIndex=minValue>90?'5':'3';
  maxSlider.style.zIndex='4';
}

function setToleranceControls(qmin,qmax,pmin,pmax){
  const values={qmin,qmax,pmin,pmax};
  Object.entries(values).forEach(([id,value])=>{
    const input=document.getElementById(id);
    const slider=document.getElementById(id+'Slider');
    const text=document.getElementById(id+'Text');
    if(input)input.value=value;
    if(slider)slider.value=value;
    if(text)text.textContent=value;
  });
  syncDualTolerance('q');
  syncDualTolerance('p');
}

function resetAll(){
 document.getElementById('q').value='';
 document.getElementById('p').value='';
 setToleranceControls(-10,20,-10,20);
 selectedTags.clear();
 selectedSeries.clear();
 if(document.getElementById('typeSearch'))document.getElementById('typeSearch').value='';
 if(document.getElementById('seriesSearch'))document.getElementById('seriesSearch').value='';
 renderTagSeries();
 document.getElementById('pole').value='';
 document.getElementById('maxkw').value='';
 document.getElementById('sort').value='closest';
 results=[];
 const rec=document.getElementById('aiRecognition'); if(rec)rec.innerHTML='';
 document.getElementById('range').innerHTML='Enter flow and pressure values to begin.';
 render();
}

const selectedTags=new Set();
const selectedSeries=new Set();



const SELECTION_PROJECT_KEY='vensis_selection_project_v1';

function loadSelectionProject(){
  try{
    const data=JSON.parse(localStorage.getItem(SELECTION_PROJECT_KEY)||'[]');
    return Array.isArray(data)?data:[];
  }catch(e){
    return [];
  }
}

function saveSelectionProject(items){
  localStorage.setItem(SELECTION_PROJECT_KEY,JSON.stringify(items));
  updateSelectionProjectCount();
}

function updateSelectionProjectCount(){
  const el=document.getElementById('projectItemCount');
  if(!el)return;
  const items=loadSelectionProject();
  const total=items.reduce((sum,item)=>sum+(Number(item.quantity)||1),0);
  el.textContent=total+' selected product(s)';
}

function addToSelectionProject(resultIndex){
  const result=results[resultIndex];
  if(!result)return;

  const items=loadSelectionProject();
  const signature=[
    result.key,
    Math.round(Number(result.qq)||0),
    Math.round(Number(result.pp)||0)
  ].join('|');

  const existing=items.find(item=>item.signature===signature);
  if(existing){
    existing.quantity=(Number(existing.quantity)||1)+1;
  }else{
    items.push({
      id:'item_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),
      signature,
      key:result.key,
      model:result.model||result.display,
      series:result.series||'',
      flow:Math.round(Number(result.qq)||0),
      pressure:Math.round(Number(result.pp)||0),
      motorPower:Number(result.kw)||0,
      noise:Number(result.spl)||0,
      unitPrice:result.price==null?null:Number(result.price),
      quantity:1,
      addedAt:new Date().toISOString()
    });
  }

  saveSelectionProject(items);
}

function openProjectPage(){
  window.location.href='project.html';
}

function normalizeSearchText(value){
  return String(value||'')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
}

function levenshtein(a,b){
  if(a===b)return 0;
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let prev=row[0];
    row[0]=i;
    for(let j=1;j<=b.length;j++){
      const tmp=row[j];
      row[j]=Math.min(
        row[j]+1,
        row[j-1]+1,
        prev+(a[i-1]===b[j-1]?0:1)
      );
      prev=tmp;
    }
  }
  return row[b.length];
}

function smartMatch(label,query){
  const q=normalizeSearchText(query);
  if(!q)return true;
  const labelNorm=normalizeSearchText(label);
  const labelWords=labelNorm.split(' ');
  const queryWords=q.split(' ').filter(Boolean);

  return queryWords.every(token=>{
    if(labelNorm.includes(token))return true;
    return labelWords.some(word=>{
      if(word.startsWith(token)||token.startsWith(word))return true;
      if(token.length<4)return false;
      const limit=token.length<=5?1:2;
      return levenshtein(word,token)<=limit;
    });
  });
}

function allTagNames(){
  return [...new Set(models.flatMap(m=>m.tags||[]))]
    .sort((a,b)=>tagDisplayName(a).localeCompare(tagDisplayName(b),'en'));
}

function seriesForTags(){
  return [...new Set(models
    .filter(m=>!selectedTags.size||[...selectedTags].every(t=>(m.tags||[]).includes(t)))
    .map(m=>m.series)
    .filter(Boolean))]
    .sort((a,b)=>seriesDisplayName(a).localeCompare(seriesDisplayName(b),'en'));
}

function seriesModelCount(series){
  return new Set(models.filter(m=>m.series===series).map(m=>m.key)).size;
}

function toggleTag(t){
  selectedTags.has(t)?selectedTags.delete(t):selectedTags.add(t);
  const allowed=new Set(seriesForTags());
  [...selectedSeries].forEach(s=>{if(!allowed.has(s))selectedSeries.delete(s)});
  renderTagSeries();
  runSelection();
}

function toggleSeries(s){
  selectedSeries.has(s)?selectedSeries.delete(s):selectedSeries.add(s);
  renderTagSeries();
  runSelection();
}

function tagDisplayName(tag){
  const map={"Aksiyal":"Axial Fan","Radyal":"Radial Fan","Kanal Tipi":"Duct Fan","Hücreli":"Cabinet Fan","Jetfan":"Jet Fan","Tünel Tipi":"Tunnel Fan","Çatı Tipi":"Roof Fan","Duvar Tipi":"Wall-Mounted Fan","Mobil":"Mobile Fan","Salyangoz":"Centrifugal Fan","Bifurcated":"Bifurcated Fan","Kısa Kasalı":"Short-Casing Fan","Duman Tahliye":"Smoke Exhaust Fan","Exproof / ATEX":"Explosion-Proof / ATEX Fan","EC":"EC Fan","Isı Geri Kazanım":"Heat Recovery Unit","Sığınak":"Shelter Fan"};
  return map[tag]||tag;
}

const catalogSeriesNames={"AXF": "AXF Axial Duct Smoke Exhaust Fans", "AXJ": "AXJ Axial Jet Fans", "RXJ": "RXJ Radial Jet Fans", "TUNEL-AXF": "TUNEL-AXF Tunnel Type Axial Fans", "BOX-AXF": "BOX-AXF Axial Cabinet Smoke Exhaust Fans", "AXW/ATEX": "AXW/ATEX Axial Wall-Mounted Explosion-Proof Fans", "AXD/ATEX": "AXD/ATEX Axial Duct Explosion-Proof Fans", "MOB-AXD/ATEX": "MOB-AXD/ATEX Mobile Axial Explosion-Proof Fans", "AXR/ATEX": "AXR/ATEX Horizontal Discharge Axial Roof Explosion-Proof Fans", "CRH/ATEX": "CRH/ATEX Radial Roof Explosion-Proof Fans", "CRD/ATEX": "CRD/ATEX Radial Duct Explosion-Proof Fans", "CRS/ATEX": "CRS/ATEX Single-Inlet Centrifugal Explosion-Proof Fans", "AXD": "AXD Axial Duct Fans", "AXD/MOB": "MOB-AXD Mobile Axial Fans", "MOB-AXD": "MOB-AXD Mobile Axial Fans", "AXS": "AXS Short-Casing Axial Fans", "AXW": "AXW Axial Wall-Mounted Fans", "AXB": "AXB Bifurcated Axial Duct Fans", "AXH": "AXH Axial Cabinet Fans", "CD": "CD Radial Duct Fans", "CRB": "CRB Rectangular Duct Radial Fans", "CRD": "CRD Rectangular Duct Radial Fans", "CRK": "CRK Single-Inlet Cabinet Radial Fans", "CRC": "CRC Cabinet Radial Fans", "CRS": "CRS Single-Inlet Centrifugal Fans", "CR": "CR Horizontal Discharge Radial Roof Fans", "CRH": "CRH Horizontal Discharge Radial Roof Fans", "CRV": "CRV Vertical Discharge Radial Roof Fans", "CRU": "CRU Vertical Discharge Radial Roof Fans", "AXR": "AXR Horizontal Discharge Axial Roof Fans", "AXV": "AXV Vertical Discharge Axial Roof Fans", "CR-EC": "CR-EC Horizontal Discharge EC Radial Roof Fans", "CRU-EC": "CRU-EC Vertical Discharge EC Radial Roof Fans", "CRB-EC": "CRB-EC Rectangular Duct EC Radial Fans", "CRC-EC": "CRC-EC Cabinet EC Radial Fans", "VHR": "VHR Heat Recovery Units", "CRR": "CRR Shelter Duct Fans"};

function seriesDisplayName(series){
  return catalogSeriesNames[series]||series;
}

function renderTagSeries(){
  const tb=document.getElementById('tagList');
  const sb=document.getElementById('seriesList');
  if(!tb||!sb)return;

  const typeQuery=document.getElementById('typeSearch')?.value||'';
  const seriesQuery=document.getElementById('seriesSearch')?.value||'';

  const types=allTagNames().filter(t=>smartMatch(tagDisplayName(t),typeQuery));
  const typeCount=document.getElementById('typeCount');
  if(typeCount)typeCount.textContent=`${types.length} of ${allTagNames().length}`;
  tb.innerHTML=types.length?types.map(t=>{
    const active=selectedTags.has(t);
    return `<button type="button" class="list-item ${active?'active':''}" onclick="toggleTag('${t.replace(/'/g,"\\'")}')">
      <span class="checkmark">${active?'✓':''}</span>
      <span>${tagDisplayName(t)}</span>
    </button>`;
  }).join(''):'<div style="padding:12px;color:#6b7d80;font-size:12px">No product type found.</div>';

  const allSeries=seriesForTags();
  const series=allSeries.filter(s=>smartMatch(seriesDisplayName(s),seriesQuery));
  const seriesCount=document.getElementById('seriesCount');
  if(seriesCount)seriesCount.textContent=`${series.length} of ${allSeries.length}`;
  sb.innerHTML=series.length?series.map(s=>{
    const active=selectedSeries.has(s);
    return `<button type="button" class="list-item ${active?'series-active':''}" onclick="toggleSeries('${s.replace(/'/g,"\\'")}')">
      <span class="checkmark">${active?'✓':''}</span>
      <span>${seriesDisplayName(s)} <b style="color:#0b7f4c">(${seriesModelCount(s)})</b></span>
    </button>`;
  }).join(''):'<div style="padding:12px;color:#6b7d80;font-size:12px">No product series found.</div>';
}

function runSelection(){
 const q=n('q'),p=n('p'),qL=q*(1+n('qmin')/100),qH=q*(1+n('qmax')/100),pL=p*(1+n('pmin')/100),pH=p*(1+n('pmax')/100);
 const pole=document.getElementById('pole').value;
 const maxText=document.getElementById('maxkw').value.trim();
 const maxkw=maxText?Number(maxText):Infinity;
 const sort=document.getElementById('sort').value;
 let out=[];
 for(const m of models){
  if(selectedTags.size && ![...selectedTags].every(t=>(m.tags||[]).includes(t))) continue;
  if(selectedSeries.size && !selectedSeries.has(m.series)) continue;
  if(pole && String(m.pole)!==pole) continue;
  if(Number(m.kw)>maxkw) continue;

  if(!m.points || !m.points.length) continue;
  let best=null;
  for(let pp=Math.ceil(pL);pp<=Math.floor(pH);pp++){
    let qq=interpolate(m.points,pp);
    if(qq===null)continue;
    if(qq>=qL&&qq<=qH){
      let qd=(qq-q)/q,pd=(pp-p)/p,score=Math.abs(qd)+Math.abs(pd);
      if(!best||score<best.score)best={pp,qq,qd,pd,score};
    }
  }
  if(best)out.push({...m,...best});
 }
 if(sort==='closest')out.sort((a,b)=>a.score-b.score||a.kw-b.kw);
 if(sort==='economic')out.sort((a,b)=>a.price-b.price||a.score-b.score);
 if(sort==='quiet')out.sort((a,b)=>a.spl-b.spl||a.score-b.score);
 if(sort==='power')out.sort((a,b)=>a.kw-b.kw||a.score-b.score);
 results=out;selected=0;
 document.getElementById('range').innerHTML=`Flow range: <b>${fmt(qL)}–${fmt(qH)} m³/h</b> &nbsp; | &nbsp; Pressure range: <b>${fmt(pL)}–${fmt(pH)} Pa</b>`;
 render();
}

let tableSortKey='closest';
let tableSortDirection=1;

function setTableSort(key){
  if(tableSortKey===key){
    tableSortDirection*=-1;
  }else{
    tableSortKey=key;
    tableSortDirection=1;
  }
  render();
}

function tableSortValue(row,key){
  if(key==='flow')return Number(row.qq)||0;
  if(key==='pressure')return Number(row.pp)||0;
  if(key==='price')return row.price==null?Infinity:Number(row.price);
  return Number(row.score)||0;
}

function sortArrow(key){
  if(tableSortKey!==key)return '↕';
  return tableSortDirection===1?'↑':'↓';
}

function render(){
  const cards=document.getElementById('cards');

  if(!results.length){
    cards.innerHTML='<div class="empty">No matching fan found for these conditions.</div>';
    return;
  }

  const sorted=results.map((row,index)=>({row,index})).sort((a,b)=>{
    const av=tableSortValue(a.row,tableSortKey);
    const bv=tableSortValue(b.row,tableSortKey);
    if(av===bv)return a.index-b.index;
    return (av-bv)*tableSortDirection;
  });

  const closestButton=document.getElementById('sortClosest');
  const closestArrow=document.getElementById('arrowClosest');
  if(closestButton){
    closestButton.classList.toggle('active',tableSortKey==='closest');
    closestArrow.textContent=sortArrow('closest');
  }

  cards.innerHTML=`<table class="results-table">
    <thead><tr>
      <th>Model</th>
      <th><button class="sort-head" onclick="setTableSort('flow')">Flow <span class="sort-arrow">${sortArrow('flow')}</span></button></th>
      <th><button class="sort-head" onclick="setTableSort('pressure')">Pressure <span class="sort-arrow">${sortArrow('pressure')}</span></button></th>
      <th>Motor Power</th>
      <th>Noise</th>
      ${VensisAuth.isLoggedIn()?`<th><button class="sort-head" onclick="setTableSort('price')">Price <span class="sort-arrow">${sortArrow('price')}</span></button></th><th style="text-align:center">Project</th>`:''}
      <th style="text-align:center">Details</th>
    </tr></thead>
    <tbody>
      ${sorted.map(({row:x,index})=>`<tr>
        <td><div class="model-main">${x.model||x.display}</div></td>
        <td>${fmt(x.qq)} m³/h</td>
        <td>${fmt(x.pp)} Pa</td>
        <td>${fmt(x.kw,2)} kW</td>
        <td>${fmt(x.spl)} dB(A)</td>
        ${VensisAuth.isLoggedIn()?`<td>${x.price==null?'Not available':fmt(x.price)+' €'}</td><td style="text-align:center"><button class="project-row-btn" onclick="addToSelectionProject(${index})" title="Add to project">＋</button></td>`:''}
        <td style="text-align:center">
          <button class="detail-icon-btn" onclick="openProductTab(${index})" title="Open product details">👁</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function esc(v){
  return String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}
function detailField(label,value){
  return `<div class="field"><span>${label}</span><b>${value}</b></div>`;
}
function bulletList(items){
  if(!items||!items.length)return '<p class="muted">No catalogue text available for this section.</p>';
  return `<ul>${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
}

function getCurveSvg(r){
  if(!r.points||!r.points.length){
    return '<div style="padding:40px;text-align:center;color:#6b7280">No performance curve data available.</div>';
  }

  const pts=r.points.slice().sort((a,b)=>a[0]-b[0]);
  const maxQ=Math.max(...pts.map(x=>x[1]))*1.08;
  const maxP=Math.max(...pts.map(x=>x[0]))*1.08;

  const W=760,H=360,L=70,R=20,T=25,B=50;
  const x=q=>L+(q/maxQ)*(W-L-R);
  const y=p=>T+(H-T-B)-(p/maxP)*(H-T-B);

  const grid=[];
  for(let i=0;i<=5;i++){
    const yy=T+i*(H-T-B)/5;
    grid.push(`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#dbe6e7"/>`);
  }
  for(let i=0;i<=5;i++){
    const xx=L+i*(W-L-R)/5;
    grid.push(`<line x1="${xx}" y1="${T}" x2="${xx}" y2="${H-B}" stroke="#dbe6e7"/>`);
  }

  const poly=pts.map(p=>`${x(p[1])},${y(p[0])}`).join(' ');
  const point=(!r.catalogOnly&&r.qq&&r.pp)
    ? `<circle cx="${x(r.qq)}" cy="${y(r.pp)}" r="7" fill="#e49a27"/>
       <text x="${x(r.qq)+10}" y="${y(r.pp)-10}" font-size="13">${fmt(r.qq)} m³/h @ ${fmt(r.pp)} Pa</text>`
    : '';

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
    ${grid.join('')}
    <polyline fill="none" stroke="#123c43" stroke-width="3" points="${poly}"/>
    ${point}
    <text x="${W/2-40}" y="${H-10}" font-size="13">Airflow (m³/h)</text>
    <text x="15" y="${H/2}" font-size="13" transform="rotate(-90 15 ${H/2})">Pressure (Pa)</text>
  </svg>`;
}

function openProductTab(i){
  const r=results[i];
  if(!r)return;

  const ci=r.catalogueInfo||{general:[],motor:[],applications:[]};
  const priceText=VensisAuth.isLoggedIn()?(r.price ? fmt(r.price)+' €' : 'Price not available'):'';
  const qText=fmt(r.qq)+' m³/h';
  const pText=fmt(r.pp)+' Pa';
  const tags=(r.tagsEn||[]).join(' · ')||'-';

  const detail=`<!doctype html><html lang="en"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(r.display)}</title>
  <style>
  :root{--green:#087f4f;--dark:#123c43;--line:#d8e3e5;--soft:#f7fafb;--text:#173033}
  *{box-sizing:border-box}
  body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--text);background:#eef3f4}
  .wrap{max-width:1100px;margin:18px auto;padding:0 14px}
  .sheet{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:0 4px 16px rgba(0,0,0,.05)}
  .top{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid var(--green);padding-bottom:12px}
  .logoimg{height:58px;max-width:310px;object-fit:contain}
  h1{font-size:23px;margin:18px 0 6px}.subtitle{color:#64748b;font-size:13px}
  .actionbar{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}
  button{border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}
  .primary{background:var(--green);color:#fff}.secondary{background:#e8eff0;color:#29484d}
  .section{margin-top:16px;break-inside:avoid}
  .section-title{background:var(--green);color:#fff;padding:8px 11px;font-weight:700;border-radius:7px 7px 0 0}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
  .field{border:1px solid var(--line);background:var(--soft);border-radius:7px;padding:9px;min-height:52px}
  .field span{display:block;color:#64748b;font-size:11px;margin-bottom:4px}.field b{font-size:14px}
  .curve{border:1px solid var(--line);padding:8px;margin-top:8px;border-radius:7px}
  .catalogue{border:1px solid var(--line);padding:13px;background:#fbfefe;margin-top:8px;border-radius:7px}
  .catalogue h3{color:var(--green);margin:0 0 8px}.catalogue h4{margin:13px 0 6px}
  .catalogue ul{margin:5px 0 0;padding-left:20px;line-height:1.5;font-size:13px}
  .muted{color:#64748b;font-size:12px}
  .inputgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  input,textarea{width:100%;border:1px solid #b9cbce;border-radius:7px;padding:9px;font:inherit}
  textarea{min-height:70px;resize:vertical}
  label{font-size:11px;color:#64748b;display:block;margin-bottom:4px}
  @media(max-width:700px){.grid,.inputgrid{grid-template-columns:1fr}.top{align-items:flex-start}.logoimg{max-width:220px;height:48px}}
  @media print{
    body{background:#fff}.wrap{max-width:none;margin:0;padding:0}.sheet{border:0;box-shadow:none;padding:0}
    .no-print{display:none}.section{break-inside:avoid}
    @page{size:A4;margin:11mm}
  }
  </style></head><body>
  <div class="wrap"><div class="sheet">
    <div class="top">
      <img class="logoimg" src="__LOGO__" alt="Vensis">
      <div style="text-align:right"><b>FAN SELECTION DETAILS</b><div class="muted">${new Date().toLocaleDateString('en-GB')}</div></div>
    </div>

    <h1>${esc(r.display)}</h1>
    <div class="subtitle">${esc(r.catalogNameEn||r.series)} · ${esc(tags)}</div>

    <div class="actionbar no-print">
      <button class="primary" onclick="window.print()">🖨 Create PDF / Print</button>
      <button class="secondary" onclick="location.href='index.html'">⌂ Home</button><button class="secondary" onclick="window.close()">✕ Close Tab</button>
    </div>

    <div class="section">
      <div class="section-title">📄 Report Information</div>
      <div class="inputgrid" style="margin-top:8px">
        <div><label>Customer / Company</label><input placeholder="Customer name"></div>
        <div><label>Project</label><input placeholder="Project name"></div>
        <div><label>Report No.</label><input placeholder="Report number"></div>
      </div>
      <div style="margin-top:8px"><label>Additional Note</label><textarea placeholder="Optional note"></textarea></div>
    </div>

    <div class="section">
      <div class="section-title">🎯 Operating Point</div>
      <div class="grid">
        ${detailField('Airflow',qText)}
        ${detailField('Static Pressure',pText)}
        ${detailField('Nominal Airflow',fmt(r.nominal||0)+' m³/h')}
        ${detailField('Airflow Deviation',fmt(r.qd*100,1)+'%')}
        ${detailField('Pressure Deviation',fmt(r.pd*100,1)+'%')}
        ${detailField('Catalogue Price',priceText)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">🔧 Technical Data</div>
      <div class="grid">
        ${detailField('Brand',esc(r.brand||'-'))}
        ${detailField('Series',esc(r.series||'-'))}
        ${detailField('Product Group',esc(r.productGroupEn||r.productGroup||'-'))}
        ${detailField('Fan Type',esc((r.fanTypeEn||r.fanType||'-')+' / '+(r.mountTypeEn||r.mountType||'-')))}
        ${detailField('Motor Power',fmt(r.kw||0,2)+' kW')}
        ${detailField('Speed',fmt(r.rpm||0)+' rpm')}
        ${detailField('Current',fmt(r.amps||0,2)+' A')}
        ${detailField('Sound Level',fmt(r.spl||0)+' dB(A)')}
        ${detailField('Voltage',esc(r.voltage||'-'))}
        ${detailField('ATEX',r.atex?'Yes':'No')}
        ${detailField('Fire Class',esc(r.fire||'-'))}
        ${detailField('Catalogue Page',esc(r.sourcePage||'-'))}
      </div>
    </div>

    <div class="section">
      <div class="section-title">📈 Performance Curve</div>
      <div class="curve">${getCurveSvg(r)}</div>
    </div>

    <div class="section">
      <div class="section-title">📚 Catalogue Information</div>
      <div class="catalogue">
        <h3>${esc(r.catalogNameEn||r.series)}</h3>
        <h4>General Features</h4>
        ${bulletList(ci.general)}
        <h4>Motor</h4>
        ${bulletList(ci.motor)}
        <h4>Areas of Usage</h4>
        ${bulletList(ci.applications)}
        <p class="muted"><b>Source:</b> Vitlo Turkish-English Catalogue, page ${esc(r.sourcePage||'-')}.</p>
      </div>
    </div>
  </div></div>
  <script src="js/global-navigation.js"></script></body></html>`;

  const completedDetail=detail.replace('__LOGO__','assets/vensis-logo.png');
  const detailKey='vensis_detail_'+Date.now()+'_'+Math.random().toString(36).slice(2);

  try{
    localStorage.setItem(detailKey,completedDetail);
  }catch(err){
    alert('Product details could not be prepared: '+(err.message||err));
    return;
  }

  const detailWindow=window.open('detail.html?key='+encodeURIComponent(detailKey),'_blank');
  if(!detailWindow){
    localStorage.removeItem(detailKey);
    alert('The browser blocked the new tab. Please allow pop-ups for this site.');
    return;
  }
  detailWindow.focus();
}
function clearCanvas(){let c=document.getElementById('curve');c.getContext('2d').clearRect(0,0,c.width,c.height)}
function drawCurve(r){
 let c=document.getElementById('curve'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);let pts=r.points.slice().sort((a,b)=>a[0]-b[0]);
 let maxQ=Math.max(...pts.map(x=>x[1]))*1.08,maxP=Math.max(...pts.map(x=>x[0]))*1.08,L=70,R=25,T=25,B=55,W=c.width-L-R,H=c.height-T-B,x=q=>L+q/maxQ*W,y=p=>T+H-p/maxP*H;
 ctx.strokeStyle='#dbe6e7';ctx.lineWidth=1;for(let i=0;i<=5;i++){let yy=T+i*H/5;ctx.beginPath();ctx.moveTo(L,yy);ctx.lineTo(L+W,yy);ctx.stroke()}for(let i=0;i<=5;i++){let xx=L+i*W/5;ctx.beginPath();ctx.moveTo(xx,T);ctx.lineTo(xx,T+H);ctx.stroke()}
 ctx.strokeStyle='#123c43';ctx.lineWidth=3;ctx.beginPath();pts.forEach((pt,i)=>{if(i===0)ctx.moveTo(x(pt[1]),y(pt[0]));else ctx.lineTo(x(pt[1]),y(pt[0]))});ctx.stroke();
 ctx.fillStyle='#e49a27';ctx.beginPath();ctx.arc(x(r.qq),y(r.pp),8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#183337';ctx.font='13px Arial';ctx.fillText(`${fmt(r.qq)} m³/h @ ${fmt(r.pp)} Pa`,x(r.qq)+10,y(r.pp)-10);
}

const r=document.getElementById('range');
if(r) r.innerHTML='Enter flow and pressure values to begin.';
renderTagSeries();
if(!holdSpeechSupported())document.getElementById('holdMicStatus').textContent='Noise girişi için Chrome veya Edge kullanın.';
