(function addCrsAtex31Stainless316(){
  'use strict';
  const rows=Array.isArray(window.models)?window.models:[];
  const key='VITLO-CRS-ATEX|CRS/ATEX 31-2T-2|SS316';
  if(rows.some(row=>String(row?.key||'')===key))return;
  const base=rows.find(row=>String(row?.key||'')==='VITLO-CRS-ATEX|CRS/ATEX 31-2T-2');
  if(!base)return;

  // Deep-clone all baseline performance, curve, dimensions, motor and ATEX target data.
  const variant=JSON.parse(JSON.stringify(base));
  const modelTr='CRS/ATEX 31-2T-2 PASLANMAZ 316';
  const modelEn='CRS/ATEX 31-2T-2 STAINLESS STEEL 316';
  const language=(()=>{
    const pathname=String(location.pathname||'').toLowerCase();
    if(/(^|\/)en(\/|$)/.test(pathname))return 'en';
    if(/(^|\/)tr(\/|$)/.test(pathname))return 'tr';
    const active=String(window.VensisI18n?.getLanguage?.()||document.documentElement.lang||'').toLowerCase();
    if(active==='en'||active==='tr')return active;
    try{return localStorage.getItem('vensis_language_v1')==='en'?'en':'tr';}
    catch{return 'tr';}
  })();

  variant.key=key;
  variant.configurationId=modelTr;
  variant.productCode='CRS31-2T-2-ATEX-SS316';
  variant.model=language==='en'?modelEn:modelTr;
  variant.modelTr=modelTr;
  variant.modelEn=modelEn;
  variant.display=(language==='en'?modelEn:modelTr)+' (4400 m³/h)';
  variant.displayTr=modelTr+' (4400 m³/h)';
  variant.displayEn=modelEn+' (4400 m³/h)';
  variant.material='Paslanmaz 316';
  variant.materialEn='Stainless Steel 316';
  variant.materialGrade='AISI 316';
  // Approved price rule: 2.5 × the 2,300 EUR baseline CRS31-2T-2-ATEX
  // list price recorded in data/crs-atex-prices-r4.js.
  variant.baseListPrice=2300;
  variant.priceMultiplier=2.5;
  variant.price=5750;
  variant.priceCurrency='EUR';
  variant.priceSource='Vensis CRS/ATEX baseline list price 2026-08-24 × 2.5 (Metin approval 2026-10-13)';
  variant.constructionMaterials={
    casing:'AISI 316 stainless steel',
    impeller:'AISI 316 stainless steel',
    suctionCone:'AISI 316 stainless steel',
    fanAirContactMetalParts:'AISI 316 stainless steel'
  };
  // This material change is not evidence that the original ATEX certificate
  // covers the new impeller/cone and their potential ignition risks.
  variant.atexCertificationStatus='engineering_approval_pending_for_stainless_variant';
  variant.technicalApprovalRequired=true;
  variant.catalogueInfo={
    ...variant.catalogueInfo,
    general:(variant.catalogueInfo?.general||[]).map(text=>{
      if(/fan casing is produced from hard steel/i.test(text))
        return 'The fan casing is manufactured from high-strength stainless steel.';
      if(/Suction cone is made of copper/i.test(text))
        return 'Suction cone is specified as AISI 316 stainless steel; ATEX non-sparking design must be validated.';
      if(/It is ex-proof as a complete device/i.test(text))
        return 'ATEX design/marking is inherited from the base model as a target only. Approval for this stainless construction is pending.';
      return text;
    })
  };
  // Model-only catalog/quotation description; leave the CRS/ATEX series unchanged.
  variant.productDescription=JSON.parse(JSON.stringify(variant.catalogueInfo));
  variant.sourceNote=(base.sourceNote||'')+
    ' Stainless AISI 316 custom-copy specification requested 2026-10-13. Baseline motor, dimensions, airflow, curve, acoustics and proposed ATEX marking are unchanged as data assumptions, not independently re-tested. The original ATEX certification must not be treated as approval of the stainless variant; manufacturer assessment is required, particularly for the former copper inlet cone.';
  rows.push(variant);
})();
