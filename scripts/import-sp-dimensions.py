#!/usr/bin/env python3
"""Import source-verified S&P dimension drawings/rows into the unified catalog.
Run with --sources DIRECTORY containing the exact PDFs pinned in the manifest.
No performance, pricing, identity, motor or other manufacturers' data is changed.
"""
import argparse,hashlib,io,json,re
from pathlib import Path
import fitz
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--sources',type=Path,required=True);args=parser.parse_args();SRC=args.sources
assets=ROOT/'assets/products/sp-dimensions';assets.mkdir(parents=True,exist_ok=True)
manifest={'date':'2026-10-18','scope':'28 active Soler & Palau series / 163 models','sources':[],'drawings':[],'models':{}}
sources={};drawings={}
manifest_path=ROOT/'docs/sp-dimensions-sources.json'
expected_hashes={s['filename']:s['sha256'] for s in json.loads(manifest_path.read_text()).get('sources',[])} if manifest_path.exists() else {}
def source(name):
 if name in sources:return sources[name]
 p=SRC/(name+'.pdf');b=p.read_bytes();url=''
 if p.name in expected_hashes:assert hashlib.sha256(b).hexdigest()==expected_hashes[p.name], 'Source PDF changed: '+p.name
 if name.startswith('en-'):
  url={'en-cab':'https://statics.solerpalau.com/media/import/documentation/EN_CAB.pdf','en-selector':'https://statics.solerpalau.com/media/import/documentation/Product_Selector_Price_List_Issue.pdf'}[name]
 else:
  h=(SRC/(name+'.html')).read_text();u=re.findall(r"download_pdf\('([^']+)'\)",h)[0];url='https://www.solerpalau.com.tr/'+u.lstrip('./')
 data={'filename':p.name,'url':url,'sha256':hashlib.sha256(b).hexdigest(),'pdfPages':len(fitz.open(p))};sources[name]=data;manifest['sources'].append(data);return data

def crop(key,name,page,box):
 src=source(name);p=fitz.open(SRC/(name+'.pdf'))[page-1]
 pix=p.get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(*box),alpha=False)
 im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
 # Preserve original drawing/labels. Crop bounds are reviewed PDF coordinates.
 out=assets/(key+'.png');im.save(out,optimize=True)
 rel=str(out.relative_to(ROOT));record={'asset':rel,'catalogue':src['filename'],'sourceUrl':src['url'],'sha256':src['sha256'],'pdfPage':page,'cropPoints':box};drawings[key]=record;manifest['drawings'].append(record);return key

def table(headers,rows):
 headers=headers.split();out={}
 for line in rows.strip().splitlines():
  v=line.split();assert len(v)==len(headers)+1,(line,headers)
  out[v[0]]={k:(float(s.replace(',','.')) if re.fullmatch(r'-?\d+(?:[.,]\d+)?',s) else s) for k,s in zip(headers,v[1:])}
 return out

# Model suffix N is the source roof range, not the pole count.
roofH=table('ØA B C ØD E F ØG','''
225 570 245 326 183 35 209 10
250 570 245 326 204 35 209 10
280 640 330 435 228 40 273,5 12
315 895 450 560 257 40 324 12
355 895 450 560 289 40 349 12
400 1150 535 630 326 40 363 12
450 1150 535 630 367 40 409 12
500 1150 590 710 407 40 435 14
560 1150 750 900 455 40 486 14
630 1150 750 900 513 40 548 14''')
roofV=table('ØA B C ØD E F ØG','''
250 434 245 326 204 35 260 10
280 560 330 435 228 40 335 12
315 754 450 560 257 40 395 12
355 754 450 560 289 40 395 12
400 857 535 630 326 40 459 12
450 857 535 630 367 40 459 12
500 950 590 710 407 40 530 14
560 1216 750 900 455 40 580 14''')
ctv=table('ØAV BV C ØD E ØF G','''
180 431 378 300 212 245 10 35
225 560 453 435 261 330 12 40
250 750 504 560 289 450 12 40
315 750 545 560 326 450 12 40
400 857 605 630 420 535 12 40
450 950 741 710 457 590 14 40
560 1216 832 905 569 750 14 50
630 1327 1053 1100 639 840 14 50
710 1485 1161 1100 720 840 14 50''')
hct=table('ØA B C ØD ØE F G H','''
400 760 630 535 400 12 40 80 372
450 895 710 590 450 14 40 110 416
500 895 710 590 500 14 40 110 436
560 1150 905 750 560 14 50 165 508
630 1150 905 750 630 14 50 165 508
710 1350 1100 840 710 14 50 200 549
800 1350 1100 840 800 14 50 200 729
900 1580 1250 950 900 14 50 200 763
1000 1580 1250 950 1000 14 50 200 763''')
hdt=table('A B C ØD ØE F G','''
315 400 330 323 315 10 85 329
355 450 380 325 355 10 87 371
400 500 420 336 400 10 90 422
450 560 480 360 450 10 106 476
560 710 630 435 560 10 112 596''')
hv=table('A B C ØD_min ØD_max E_min E_max F_min G H_min','''
150 230 251 109 187 190 3 25 22 160 150
230 300 325 142 259 262 3 25 22 200 185
300 368 403 150 327 330 3 25 22 230 220''')
hx=table('A B C ØD ØD1 ØD2 ØE F HT J K L M','''
500 630 560 450 500 512 536 10 13 176 60 97 12 79
560 710 630 510 560 570 596 10 20 188 70 99 12 89
630 800 710 580 630 640 674 12 25 182 60 103 12 79
710 900 800 637 710 720 733 12 11 206 115 92 17 115''')
hxm=table('A B ØC ØD E F ØG','''
200 222,5 266 9,5 205 88 19,5 211
250 275,5 333 9,5 255 99 31,5 261
300 336,5 400 10,5 305 99 35,5 311
350 390,5 465 10,5 361 106 34,5 371''')
il=table('A B C D E F G ØH','''
200 505 400 198 420 220 440 240 9
225 535 500 248 520 270 540 290 9
250 565 500 298 520 320 540 340 9
285 645 600 298 620 320 640 340 9
315 725 600 348 620 370 640 390 9
355 785 700 398 720 420 740 440 9
400 885 800 498 820 520 840 540 9
450 985 1000 498 1020 520 1040 540 9''')
ir=table('A1 A2 B1 B2 C1 C2 H1 H2 L','''
225 500 250 520 270 540 290 300 730 530
315 600 350 620 370 640 390 405 1020 720
355 700 400 720 420 740 440 460 1135 790
400 800 500 820 520 845 545 565 1330 880
450 1000 500 1020 520 1045 545 565 1430 980''')
tdAtex=table('A B C ØD E F G H I','''
800 302 255 232,5 198 140 100 94 124 228,4
1100 386 324 291 248 168 145 140 155 339
1200 450 392 356 312 210 182 178 188 371''')
th=table('ØA B C ØD E ØF G H I','''
500 400 349 300 150 245 10 20 274 33
800 400 371 300 198 245 10 20 306 36
1300 546 457 435 248 330 12 20 372 42
2000 735 544 560 312 450 12 20 450 50
1100 546 457 435 248 330 12 20 372 42
1200 735 544 560 312 450 12 20 450 50''')
cab=table('A B C ØD E F G','''
125 273 388 395 125 125 162 505
200 328 430 365 200 216 210 475
250 383 525 450 250 263 237 560
315 443 600 505 315 301 264 615
355 513 660 600 355 331 292 710
400 513 660 600 400 331 292 710''')
hcm=table('ØA ØB C D E F','''
150 214 174 60 88 35 98
180 255 205 86 120 35 135
225 298 248 89 119 35 125''')
jet=table('A B1 B2 C1 C2 ØD E F G H I ØJ K','''
100 276 15 15 181 190 95 256 306 70 98 - 15 6,5
125 279 15 15 206 214 120 265 315 70 111 - 15 6,5
150 323 20 20 243,5 252 145 298,5 348 70 130 - 15 6,5
160 323 20 20 243,5 252 155 298,5 348 70 130 - 15 6,5
200 322 30 30 273 281 195 320 369 70 144,5 - 15 6,5
250 329 20 30 293 301 245 326 375 120 154,3 50 15 6,5
315 369 20 33 322 331 310 357,5 407 120 170 50 15 6,5''')
evo=table('A B C ØD E F G H I J ØK L M','''
100 302 181 201 97 28,5 107 133 100 168 100 4,5 89 189
125 302 191 221 122,5 28,5 117 132 100 172 104,5 4,5 91 209
150 306 221 240 147 25 126 165 120 170 142 5,5 121 229
200 346 238 263 197 28 137 190 124 211 161 5,5 161 253
250 390 289 306 247 40 159 230 155 231 194 7 182 295
315 485 353 371 312 40 192 278 188 317 242 7 206 358''')
td=table('X A ØB C ØD E F G H','''
250 188 303 176 115 97 100 90 80 60
350 188 258 176 115 123 100 90 80 60
500 212 295 200 127 147 112 130 80 60
800 232,5 302 217 141 198 124 140 100 94''')
tdBig=table('A B C D ØE ØF G H I J ØK','''
4000 377 238 249 224 426 354 160 368 474 340 8,5
6000 407 249 249 267 487 399 160 425 547 370 8,5''')
silent=table('A ØB C ØD E F G H','''
250 575 97 252 204 100 250 83 121
350 462 123 252 204 100 250 83 121
500 484 147 274 221 116 250 96 134
800 568 198 327 264 145 340 129 164
1000 568 198 327 264 145 340 129 164''')
silentBig=table('A ØB C ØD E F G H','''
1300 680 248 331 387 140 200 280 171
2000 825 312 373 432 152 260 335 192''')
vent=table('A B ØC ØD','''
100 195 23 243 98
125 197 27 243 123
150 213 22 333 147
160 220 27 333 157
200 223 25 333 198
250 205 27 333 248
315 232 25 401 312''')
ventBig=table('A B ØC ØD ØD2 E F G H ØJ','''
355 410 25 508 354 314 552 100 170 587 10,5
400 431 25 568 399 354 628 100 185 647 10,5''')
# Source diagrams, individually cropped away from unrelated data/accessories.
specs=[
('crhb','crhb-n-crht-n',3,[42,661,299,799]),('crvb','crvb-n-crvt-n',4,[42,662,299,800]),
('ctv','ctvb-ctvt',41,[42,457,571,634]),
('hct','hctb-hctt',9,[42,96,210,274]),('hdt','hdt-atex',2,[42,473,293,631]),('hv','hv',4,[42,383,259,518]),('hx','hxbr-hxtr',4,[294,93,554,290]),
('hxm-small','hxm',2,[25,407,281,564]),('hxm-400','hxm',2,[297,407,554,564]),
('il','ilbilt',2,[25,574,193,789]),('il-atex','ilt-atex',2,[25,282,554,431]),('ir','irb-irt',2,[42,538,571,702]),
('td-atex','td-atex',2,[42,231,571,552]),('th-atex','en-selector',68,[42,631,298,801]),('th','th-mixvent',2,[42,372,299,543]),('cab','cab',2,[42,592,302,707]),
('hcm','hcm',1,[403,424,571,526]),('jetline','jetline',2,[25,298,554,652]),('silentub','silentub',2,[42,196,391,355]),
('evo','td-evo',4,[25,264,554,538]),('td','td',5,[296,105,554,243]),('td-big','td',5,[296,263,554,401]),
('td-silent-160','td-silent',5,[25,93,374,233]),('td-silent','td-silent',5,[25,242,554,442]),('td-silent-big','td-silent',5,[25,553,554,800]),
('tdm','tdm',2,[42,94,391,252]),('tdm-300','tdm',2,[42,260,391,419]),('vent','vent-nk',2,[42,353,267,513]),('vent-big','vent-nk',2,[273,353,571,513]),
('edm-80','edm',2,[25,356,203,514]),('edm-100','edm',4,[25,449,374,613]),('edm-200','edm',7,[42,379,391,510]),
('decor-100','decor',2,[42,366,391,525]),('decor-200','decor',5,[25,339,374,497]),('decor-300','decor',7,[25,337,374,504]),
('decor-design-100','decordesign',2,[42,319,391,458]),('decor-design-200','decordesign',4,[42,310,391,462]),('decor-design-300','decordesign',6,[42,309,391,460]),
('silent-design-100','silent-design',3,[42,461,571,612]),('silent-design-200','silent-design',7,[42,373,571,543]),('silent-design-300','silent-design',9,[42,389,571,558]),
('silent-100','silent',2,[42,408,571,596]),('silent-200','silent',7,[25,363,554,538]),('silent-300','silent',9,[25,376,554,550]),
]
for spec in specs:crop(*spec)

file=ROOT/'data/ventilation-catalog.js';text=file.read_text();prefix='window.VensisVentilationData=';data=json.loads(text.split(prefix,1)[1].rstrip().rstrip(';'));before=json.loads(json.dumps(data));series={s['id']:s for s in data['series']}
for m in data['models']:
 if series[m['seriesId']]['manufacturer']!='Soler & Palau':continue
 s=m['seriesId'];model=m['model'];size=re.search(r'/(?:\d(?:/\d)?)-(\d+)',model)
 size=size.group(1) if size else re.search(r'(\d+)',model).group(1);values={};key='';row=size;note=''
 if s=='CRHB-N / CRHT-N':key='crhb';values=roofH[size]
 elif s=='CRVB-N / CRVT-N':key='crvb';values=roofV[size]
 elif s=='CTVB / CTVT':key='ctv';values=ctv[size];note='CTVB/CTVT vertical-discharge table; N size row, not CTHB/CTHT horizontal-discharge table.'
 elif s=='HCTB / HCTT':key='hct';values=hct[size]
 elif s=='HDB / HDT ATEX':key='hdt';values=hdt[size];note='C uses /4 pole column.'
 elif s=='HV-STYLVENT':key='hv';values=hv[size]
 elif s=='HXBR / HXTR':key='hx';values=hx[size];note='F, HT and M use the three-phase column; /4 for 500/560/630, /6 for 710.'
 elif s=='HXM':key='hxm-400' if size=='400' else 'hxm-small';values=hxm.get(size,{})
 elif s=='ILB / ILT':key='il';values=il[size]
 elif s=='ILT ATEX':key='il-atex';values=il[size]
 elif s=='IRB / IRT':key='ir';values=ir[size]
 elif s=='TD ATEX':key='td-atex';values=tdAtex[size]
 elif s=='TH ATEX':key='th-atex';values=th[size];note='Legacy TH-ATEX geometry from the manufacturer selector matching all three EX model names. Do not substitute the newer two-model geometry.'
 elif s=='TH-MIXVENT':key='th';values=th[size]
 elif s=='CAB':key='cab';values=cab[size]
 elif s=='HCM-N':key='hcm';values=hcm[size]
 elif s=='JETLINE':key='jetline';values=jet[size]
 elif s=='SILENTUB':key='silentub'
 elif s=='TD-EVO':key='evo';values=evo[size]
 elif s=='TD-MIXVENT':key='td-big' if int(size)>=4000 else 'td';values=(tdBig if int(size)>=4000 else td)[size]
 elif s=='TD-SILENT':
  key='td-silent-160' if size=='160' else 'td-silent-big' if int(size)>=1300 else 'td-silent';values={} if size=='160' else (silentBig if int(size)>=1300 else silent)[size]
  if size=='500':note='150 mm configuration; manufacturer also supplies a gasket for 160 mm ducts.'
 elif s=='TDM':key='tdm-300' if size=='300' else 'tdm';values={} if size=='300' else {'ØD':99 if size=='100' else 118,'L':67.5 if size=='100' else 78}
 elif s=='VENT-NK / VENT-N':key='vent-big' if int(size)>=355 else 'vent';values=(ventBig if int(size)>=355 else vent)[size]
 elif s=='EDM':key='edm-'+size
 elif s=='DECOR':key='decor-'+size
 elif s=='DECOR DESIGN':key='decor-design-'+size
 elif s=='SILENT DESIGN':key='silent-design-'+size
 elif s=='SILENT':key='silent-'+size
 else:raise ValueError(s)
 assert key in drawings,model
 drawing=drawings[key];src={'catalogue':drawing['catalogue'],'page':drawing['pdfPage'],'url':drawing['sourceUrl'],'sha256':drawing['sha256']}
 if s=='CAB' and size=='250':
  en=source('en-cab');src={**src,'tableCatalogue':'en-cab.pdf','tablePage':2,'tableUrl':en['url'],'tableSha256':en['sha256']};note='CAB-250N row verified in EN_CAB.pdf page 2; matches the 250 housing in the Turkish drawing.'
 m['media']['dimensionImage']=drawing['asset'];m['dimensions']={'headers':list(values),'values':values,'unit':'mm','source':src,'drawing':{'asset':drawing['asset']}}
 if values:m['technical']['dimensions']=values.copy()
 record={'seriesId':s,'model':model,'drawing':key,'sourceRow':row,'values':values,'source':src,'directNumericDrawing':not bool(values)}
 if note:record['note']=note
 manifest['models'][m['id']]=record
assert len(manifest['models'])==163
for a,b in zip(before['models'],data['models']):
 for k in ['id','seriesId','model','motor','performance','pricing','source','verification']:assert a.get(k)==b.get(k),(a['id'],k)
 if a['id'] not in manifest['models']:assert a==b,a['id']
assert before['series']==data['series']
file.write_text(text.split(prefix,1)[0]+prefix+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n')
(ROOT/'docs/sp-dimensions-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'models':len(manifest['models']),'drawings':len(drawings),'sourceFiles':len(sources),'uniqueSourcePDFs':len(set(s['sha256'] for s in sources.values())),'modelTables':sum(bool(m['values']) for m in manifest['models'].values())}))
