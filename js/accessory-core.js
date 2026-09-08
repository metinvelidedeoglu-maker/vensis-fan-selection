(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.VensisAccessoryCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const text=value=>String(value??'').trim();
  const clone=value=>JSON.parse(JSON.stringify(value));
  const number=value=>{const n=Number(value);return Number.isFinite(n)?n:0};

  function isAccessory(item){
    return text(item?.productType).toLowerCase()==='accessory'||text(item?.mode).toLowerCase()==='accessory';
  }

  function accessoryChildren(items,parentItemKey){
    const parent=text(parentItemKey);
    return (Array.isArray(items)?items:[]).filter(item=>isAccessory(item)&&text(item.parentItemKey)===parent);
  }

  function uniqueKey(prefix='accessory'){
    const random=Math.random().toString(36).slice(2,9);
    return `${prefix}|${Date.now()}|${random}`;
  }

  function buildAccessoryItem(accessory,parentItemKey,options={}){
    const source=accessory&&typeof accessory==='object'?accessory:{};
    const now=options.now||new Date().toISOString();
    return {
      itemKey:options.itemKey||uniqueKey('accessory'),
      productType:'accessory',
      mode:'accessory',
      parentItemKey:text(parentItemKey),
      model:text(source.model||source.name||'Aksesuar'),
      series:text(source.category||'Aksesuar'),
      manufacturer:text(source.manufacturer||'AVenS'),
      description:text(source.description||source.specs||''),
      price:number(source.price),
      discountPercent:number(options.discountPercent),
      quantity:Math.max(1,Math.round(number(options.quantity)||1)),
      createdAt:now,
      updatedAt:now
    };
  }

  function insertAccessory(items,parentItemKey,accessory,options={}){
    const next=clone(Array.isArray(items)?items:[]);
    const parent=text(parentItemKey);
    const parentIndex=next.findIndex(item=>text(item?.itemKey)===parent&&!isAccessory(item));
    if(parentIndex<0)return {items:next,item:null,index:-1};
    const item=buildAccessoryItem(accessory,parent,options);
    let insertAt=parentIndex+1;
    while(insertAt<next.length&&isAccessory(next[insertAt])&&text(next[insertAt].parentItemKey)===parent)insertAt+=1;
    next.splice(insertAt,0,item);
    return {items:next,item,index:insertAt};
  }

  function fanBlocks(items,itemType){
    const source=Array.isArray(items)?items:[];
    const typeOf=typeof itemType==='function'?itemType:(item=>item?.productType==='electrical'?'electrical':'fan');
    const children=new Map();
    const parents=[];
    const orphans=[];
    source.forEach(item=>{
      if(isAccessory(item)){
        const key=text(item.parentItemKey);
        if(!children.has(key))children.set(key,[]);
        children.get(key).push(item);
        return;
      }
      if(typeOf(item)==='electrical')return;
      parents.push(item);
    });
    const parentKeys=new Set(parents.map(item=>text(item.itemKey)));
    children.forEach((rows,key)=>{if(!parentKeys.has(key))orphans.push(...rows)});
    return {parents,children,orphans,blocks:parents.map(parent=>[parent,...(children.get(text(parent.itemKey))||[])])};
  }

  function reorderFanBlock(items,parentItemKey,direction,itemType){
    const source=Array.isArray(items)?items:[];
    const dir=Number(direction);
    if(dir!==-1&&dir!==1)return clone(source);
    const grouped=fanBlocks(source,itemType);
    const position=grouped.parents.findIndex(item=>text(item.itemKey)===text(parentItemKey));
    const target=position+dir;
    if(position<0||target<0||target>=grouped.blocks.length)return clone(source);
    const blocks=grouped.blocks.slice();
    [blocks[position],blocks[target]]=[blocks[target],blocks[position]];
    const flattened=blocks.flat().concat(grouped.orphans);
    const result=clone(source);
    const fanSlots=[];
    source.forEach((item,index)=>{
      if(isAccessory(item)||itemType?.(item)!=='electrical')fanSlots.push(index);
    });
    fanSlots.forEach((slot,index)=>{if(flattened[index])result[slot]=clone(flattened[index])});
    return result;
  }

  function technicalItems(items){return (Array.isArray(items)?items:[]).filter(item=>!isAccessory(item))}

  return {isAccessory,accessoryChildren,buildAccessoryItem,insertAccessory,fanBlocks,reorderFanBlock,technicalItems};
});
