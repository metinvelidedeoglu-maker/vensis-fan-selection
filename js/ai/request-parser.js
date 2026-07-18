(function(){
  const U=window.VensisUtils,S=window.VensisState;
  let recognition=null,active=false,finalText='';
  function clean(text){return String(text||'').toLowerCase().replace(/ı/g,'i').replace(/metre\s*küp|metreküp|metrekub|metrekup/g,'m3').replace(/milimetre\s*su\s*sütunu|milimetre\s*su|mm\s*su/g,'mmss').replace(/pascal/g,'pa').replace(/\s+/g,' ').trim()}
  function numberBefore(text,unit){const m=text.match(new RegExp('(\\d{1,3}(?:[\\.,]\\d{3})+|\\d+(?:[\\.,]\\d+)?)\\s*'+unit,'i'));if(!m)return null;let value=m[1].replace(/\./g,'').replace(',','.');return Number.isFinite(Number(value))?Number(value):null}
  function chip(label,value,warn=false){const box=U.byId('aiRecognition');if(!box)return;const el=document.createElement('span');el.className='ai-chip'+(warn?' warn':'');el.textContent=label+': '+value;box.appendChild(el)}
  function parse(){
    const text=clean(U.byId('smartText')?.value),box=U.byId('aiRecognition');if(box)box.innerHTML='';S.selectedTags.clear();S.selectedSeries.clear();
    let flow=numberBefore(text,'(?:m3\\s*\\/?\\s*h|m3h|m3|l\\s*\\/?\\s*s|lps)\\b');
    if(flow!=null&&/(?:l\s*\/?\s*s|lps)\b/i.test(text))flow*=3.6;
    let pressure=numberBefore(text,'kpa\\b');if(pressure!=null)pressure*=1000;
    if(pressure==null){pressure=numberBefore(text,'(?:mbar|millibar)\\b');if(pressure!=null)pressure*=100}
    if(pressure==null){pressure=numberBefore(text,'(?:mmss|mmh2o|mmwg)\\b');if(pressure!=null)pressure*=9.80665}
    if(pressure==null)pressure=numberBefore(text,'pa\\b');
    const aliases=[['Aksiyal',['axial','aksiyal','aksiyel']],['Radyal',['radial','radyal']],['Kanal Tipi',['duct','kanal','inline']],['Hücreli',['cabinet','cell','hucreli','hücreli']],['Çatı Tipi',['roof','cati','çatı']],['Jetfan',['jetfan','jet fan']],['Tünel Tipi',['tunnel','tunel','tünel']],['Exproof / ATEX',['exproof','ex-proof','atex']],['Duman Tahliye',['smoke','duman','egzoz']],['Duvar Tipi',['wall','duvar']],['Mobil',['mobile','mobil']],['EC',['ec fan','energy saving']],['Isı Geri Kazanım',['heat recovery','isi geri kazanim','ısı geri kazanım']],['Sığınak',['shelter','siginak','sığınak']]];
    aliases.forEach(([tag,words])=>{if(words.some(word=>text.includes(word)))S.selectedTags.add(tag)});
    if(flow!=null){U.byId('q').value=Math.round(flow);chip('Flow',Math.round(flow)+' m³/h')}else chip('Flow','not detected',true);
    if(pressure!=null){U.byId('p').value=Math.round(pressure);chip('Pressure',Math.round(pressure)+' Pa')}else chip('Pressure','not detected',true);
    S.selectedTags.forEach(tag=>chip('Type',window.VensisFilters.tagName(tag)));
    window.VensisFilters.render();if(flow!=null&&pressure!=null)window.runSelection();
  }
  function supported(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition)}
  function build(){if(!supported())return null;const SR=window.SpeechRecognition||window.webkitSpeechRecognition,r=new SR();r.lang='tr-TR';r.continuous=false;r.interimResults=false;r.onstart=()=>{active=true;finalText='';U.byId('holdMicStatus').textContent='Speak now.'};r.onresult=e=>{finalText=[...e.results].filter(x=>x.isFinal).map(x=>x[0].transcript).join(' ')};r.onend=()=>{active=false;if(finalText){U.byId('smartText').value=finalText;U.byId('holdMicStatus').textContent='Transcribed. Review and process.'}else U.byId('holdMicStatus').textContent='No speech detected.'};r.onerror=e=>{U.byId('holdMicStatus').textContent='Microphone error: '+e.error};return r}
  function start(e){e.preventDefault();if(!supported()){alert('Speech recognition is not supported. Use Chrome or Edge.');return}if(!recognition)recognition=build();if(!active)try{recognition.start()}catch(_){} }
  function stop(e){e.preventDefault();if(recognition&&active)recognition.stop()}
  function cancel(e){if(e)e.preventDefault();if(recognition&&active)recognition.abort()}
  window.VensisAI={parse,start,stop,cancel,supported};
})();