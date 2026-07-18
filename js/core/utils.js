(function(){
  function byId(id){return document.getElementById(id)}
  function number(id){return Number(byId(id)?.value||0)}
  function format(value,digits=0){return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)||0)}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
  function interpolate(points,pressure){
    const sorted=(points||[]).slice().sort((a,b)=>a[0]-b[0]);
    if(!sorted.length||pressure<sorted[0][0]||pressure>sorted.at(-1)[0])return null;
    for(let i=0;i<sorted.length;i++){
      if(pressure===sorted[i][0])return sorted[i][1];
      if(i<sorted.length-1){
        const [p1,q1]=sorted[i], [p2,q2]=sorted[i+1];
        if(pressure>p1&&pressure<p2)return q1+(pressure-p1)/(p2-p1)*(q2-q1);
      }
    }
    return null;
  }
  function normalize(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim()}
  function levenshtein(a,b){
    if(a===b)return 0; const row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}
    return row[b.length];
  }
  function smartMatch(label,query){
    const q=normalize(query); if(!q)return true;
    const words=normalize(label).split(' ');
    return q.split(' ').every(token=>words.some(word=>word.includes(token)||token.includes(word)||(token.length>=4&&levenshtein(word,token)<=2)));
  }
  window.VensisUtils={byId,number,format,escapeHtml,interpolate,normalize,smartMatch};
})();