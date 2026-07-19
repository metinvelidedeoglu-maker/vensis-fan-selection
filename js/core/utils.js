(function(){
  function byId(id){return document.getElementById(id)}
  function number(id){return Number(byId(id)?.value||0)}
  function format(value,digits=0){return new Intl.NumberFormat('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)||0)}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}

  function cleanPoints(points){
    const map=new Map();
    for(const point of points||[]){
      const p=Number(point?.[0]),q=Number(point?.[1]);
      if(Number.isFinite(p)&&Number.isFinite(q))map.set(p,q);
    }
    return [...map.entries()].sort((a,b)=>a[0]-b[0]);
  }

  function pchipSlopes(points){
    const n=points.length;
    if(n<2)return [];
    if(n===2){
      const slope=(points[1][1]-points[0][1])/(points[1][0]-points[0][0]);
      return [slope,slope];
    }
    const h=[],delta=[];
    for(let i=0;i<n-1;i++){
      h[i]=points[i+1][0]-points[i][0];
      delta[i]=(points[i+1][1]-points[i][1])/h[i];
    }
    const d=new Array(n).fill(0);
    for(let i=1;i<n-1;i++){
      if(delta[i-1]===0||delta[i]===0||Math.sign(delta[i-1])!==Math.sign(delta[i]))d[i]=0;
      else{
        const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];
        d[i]=(w1+w2)/(w1/delta[i-1]+w2/delta[i]);
      }
    }
    d[0]=((2*h[0]+h[1])*delta[0]-h[0]*delta[1])/(h[0]+h[1]);
    if(Math.sign(d[0])!==Math.sign(delta[0]))d[0]=0;
    else if(Math.sign(delta[0])!==Math.sign(delta[1])&&Math.abs(d[0])>Math.abs(3*delta[0]))d[0]=3*delta[0];
    const k=n-1;
    d[k]=((2*h[k-1]+h[k-2])*delta[k-1]-h[k-1]*delta[k-2])/(h[k-1]+h[k-2]);
    if(Math.sign(d[k])!==Math.sign(delta[k-1]))d[k]=0;
    else if(Math.sign(delta[k-1])!==Math.sign(delta[k-2])&&Math.abs(d[k])>Math.abs(3*delta[k-1]))d[k]=3*delta[k-1];
    return d;
  }

  function pchipValue(points,slopes,x){
    if(points.length<2)return points[0]?.[1]??null;
    if(x<points[0][0]||x>points.at(-1)[0])return null;
    let lo=0,hi=points.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid][0]<=x)lo=mid;else hi=mid}
    if(x===points[hi][0])return points[hi][1];
    const x0=points[lo][0],x1=points[hi][0],y0=points[lo][1],y1=points[hi][1],h=x1-x0,t=(x-x0)/h;
    const h00=2*t*t*t-3*t*t+1,h10=t*t*t-2*t*t+t,h01=-2*t*t*t+3*t*t,h11=t*t*t-t*t;
    return h00*y0+h10*h*slopes[lo]+h01*y1+h11*h*slopes[hi];
  }

  function densifyPoints(points,targetCount=201){
    const source=cleanPoints(points);
    if(source.length<3)return source;
    const minP=source[0][0],maxP=source.at(-1)[0];
    if(!(maxP>minP))return source;
    const count=Math.max(source.length,Math.floor(targetCount));
    const slopes=pchipSlopes(source),dense=[];
    for(let i=0;i<count;i++){
      const pressure=i===count-1?maxP:minP+(maxP-minP)*i/(count-1);
      const flow=pchipValue(source,slopes,pressure);
      dense.push([Number(pressure.toFixed(4)),Number(Math.max(0,flow).toFixed(4))]);
    }
    for(const point of source){
      const index=Math.round((point[0]-minP)/(maxP-minP)*(count-1));
      dense[index]=[point[0],point[1]];
    }
    return cleanPoints(dense);
  }

  function interpolate(points,pressure){
    const sorted=cleanPoints(points);
    if(!sorted.length||pressure<sorted[0][0]||pressure>sorted.at(-1)[0])return null;
    for(let i=0;i<sorted.length;i++){
      if(pressure===sorted[i][0])return sorted[i][1];
      if(i<sorted.length-1){
        const [p1,q1]=sorted[i],[p2,q2]=sorted[i+1];
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
  window.VensisUtils={byId,number,format,escapeHtml,interpolate,densifyPoints,normalize,smartMatch};
})();