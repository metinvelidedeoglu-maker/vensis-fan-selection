"""Import the ten existing CTVB/CTVT records from the exact supplied PDF.

Usage: python3 scripts/import-ctvb-ctvt-catalogue.py /path/ctvb-ctvt.pdf
Graph labels/table numbers are vector outlines in this edition. Model mapping
and printed axis maxima were visually checked against the hash-locked pages.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import fitz

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("crvb_vectors",ROOT/"scripts/import-crvb-crvt-catalogue.py")
vectors=importlib.util.module_from_spec(spec)
spec.loader.exec_module(vectors)
SHA256="2555a5929c2cbbcf9f41fff56b6c782efef2047b903f810304c2ed837aa0750b"
URL="https://www.solerpalau.com.tr/img/urunlerpdf/fanlar/cati-tipi-fanlar/ctvb-ctvt-3-69031dba2256c.pdf"
WEIGHT_CONFLICT_URL="https://statics.solerpalau.com/media/import/documentation/EN_MAX-TEMP.pdf"
# Existing name: rpm, P1 W, A230, A400, maximum m3/h, inlet/outlet LpA
# at 3m/point2, kg, continuous air temperature C, F400 applicability.
ROWS={
 "CTVB/4-180":[1310,73,0.3,None,870,45,49,11.7,200,False],
 "CTVB/4-225":[1400,166,0.7,None,1910,53,57,19,200,True],
 "CTVB/4-250":[1390,299,1.3,None,2690,55,58,35.5,120,True],
 "CTVB/4-315":[1410,587,2.7,None,4340,59,62,35.5,120,True],
 "CTVT/4-315":[1400,538,2.1,1.2,4320,58,62,36,120,True],
 "CTVT/4-400":[1430,1139,4.0,2.3,6760,64,69,51,120,True],
 "CTVT/4-450":[1460,2163,7.5,4.3,9050,67,71,None,120,True],
 "CTVT/6-560":[970,2558,9.0,5.2,14410,64,68,139,120,True],
 "CTVT/6-630":[970,4387,14.3,8.2,20560,67,71,197,120,True],
 "CTVT/6-710":[980,6714,None,12.9,27280,71,75,247,120,True],
}
# Page, vector drawing indexes, printed maximum m3/h and static Pa on frame.
GRAPHS={
 "CTVB/4-180":(23,[1049],1000,150),
 "CTVB/4-225":(24,[210],2000,300),
 "CTVB/4-250":(24,[448],3000,350),
 "CTVB/4-315":(25,[3304],5000,500),
 "CTVT/4-315":(30,[450],5000,500),
 "CTVT/4-400":(31,[3331],7000,700),
 "CTVT/4-450":(31,[3708,3709,3710,3711],10000,900),
 "CTVT/6-560":(35,[4173,4174,4175,4176],15000,700),
 "CTVT/6-630":(36,[370,371,372,373],24000,800),
 "CTVT/6-710":(36,[783,784,785,786],30000,1200),
}


def plot_bounds(page, path):
 baseline=path[-1][1]
 lo,hi=(0,300) if path[0][0]<300 else (300,590)
 spans=[]
 for d in page.get_drawings():
  if not d.get("color") or max(d["color"])>0.3 or d.get("width",0)>0.85: continue
  for item in d["items"]:
   if item[0]!="l":continue
   a,b=item[1:]
   if lo<a.x<hi and lo<b.x<hi and 190<a.y<baseline+0.7 and abs(a.y-b.y)<0.005 and abs(a.x-b.x)>100:
    spans.append((min(a.x,b.x),a.y,max(a.x,b.x)))
 if len(spans)<4:raise ValueError("Pressure plot grid not found")
 return [min(x for x,y,z in spans),min(y for x,y,z in spans),max(z for x,y,z in spans),max(y for x,y,z in spans)]


def extract(pdf):
 if hashlib.sha256(pdf.read_bytes()).hexdigest()!=SHA256:raise ValueError("Catalogue hash mismatch")
 doc=fitz.open(pdf);models={}
 for name,(pn,indexes,qmax,pmax) in GRAPHS.items():
  page=doc[pn-1];drawings=page.get_drawings();raw=[];origins=[]
  for index in indexes:
   paths=vectors.split_paths(drawings[index]);raw.extend(paths);origins.extend((index,i) for i in range(len(paths)))
  assert len(raw)==4
  x0,y0,x1,y1=plot_bounds(page,raw[0])
  assert abs(raw[0][-1][1]-y1)<0.3
  qa=qmax/(x1-x0);pa=-pmax/(y1-y0)
  controls=["230V","180V","140V","100V"] if name.startswith("CTVB") else ["50Hz","40Hz","30Hz","25Hz"]
  curves=[]
  for control,path,(drawing_index,subpath) in zip(controls,raw,origins):
   points=[[round(max(0,pa*(y-y1)),3),round((x-x0)*qa,3)] for x,y in path]
   if points[0][1]>points[-1][1]:points.reverse()
   assert abs(points[-1][0])<1,(name,control,points[-1])
   points[-1][0]=0
   assert all(p>=0 and q>=0 for p,q in points)
   assert all(a[1]<b[1] for a,b in zip(points,points[1:]))
   curves.append({"control":control,"sourcePage":pn,"sourceDrawingIndex":drawing_index,"sourceSubpathIndex":subpath,
    "sourceMethod":"original vector path calibrated to visually verified printed m3/h and static Pa plot bounds",
    "sourceFrequencyHz":50 if name.startswith("CTVB") else int(control[:-2]),"interpolation":"linear","precomputed":True,"sourcePoints":points})
  assert abs(curves[0]["sourcePoints"][-1][1]/ROWS[name][4]-1)<0.015,(name,curves[0]["sourcePoints"][-1],ROWS[name][4])
  curves.reverse()
  models[name]={"sourceModel":name+"N","technicalTablePage":4,"technicalTableRow":ROWS[name],
    "calibration":{"plotBounds": [x0,y0,x1,y1],"maxAirflowM3h":qmax,"maxStaticPressurePa":pmax},"curves":curves}
 return {"schemaVersion":1,"status":"verified_against_original_catalogue_vector_graphs","extrapolation":False,
  "source":{"catalogue":pdf.name,"sha256":SHA256,"url":URL},"summary":{"models":10,"curves":40,"points":8000},
  "unresolvedFields":{"CTVT/4-450":{"weight":{"printedKg":310,"alternativeManufacturerEditionKg":75,
    "alternativeSource":WEIGHT_CONFLICT_URL,"status":"manufacturer-confirmation-needed","applied":False}}},"models":models}


def apply(artifact):
 target=ROOT/"data/ventilation-catalog.js"
 prefix,payload=target.read_text().split("window.VensisVentilationData=",1)
 data=json.loads(payload.strip().removesuffix(";"))
 matches=[m for m in data["models"] if m["seriesId"]=="CTVB / CTVT"]
 assert {m["model"] for m in matches}==set(ROWS)
 safety="Yangın durumunda fanın maksimum hızda çalışmasını sağlayan emniyet sistemi kullanılmalıdır; termal koruma ve hız kontrolü bu çalışmayı engellememelidir."
 for m in matches:
  name=m["model"];rpm,watts,a230,a400,flow,inlet,outlet,weight,temp,fire=ROWS[name];mono=name.startswith("CTVB")
  curves=artifact["models"][name]["curves"];primary=curves[-1];voltage="220-240 V" if mono else "400-415 V" if name=="CTVT/6-710" else "220-240/400-415 V"
  m["motor"].update(power=watts/1000,speed=rpm,current=a230 if mono else a400,voltage=voltage,frequency="50 Hz",sound=outlet)
  m["technical"].update(weight=weight,ipClass="IP55",insulationClass="F",phase="Single-phase" if mono else "Three-phase",
   poles=4 if "/4-" in name else 6,operatingTemperatureMinC=None,operatingTemperatureMaxC=temp,continuousAirTemperatureC=temp,
   fireRating="F400 / 120 min" if fire else "",smokeTemperatureC=400 if fire else 0,smokeDurationMinutes=120 if fire else 0,
   current230A=a230 or 0,current400A=a400 or 0,currentReferenceVoltageV=230 if mono else 400,
   powerBasis="maximum-electrical-input-P1",soundBasis="outlet-sound-pressure-3m-operating-point-2",
   soundInletDbA3m=inlet,soundOutletDbA3m=outlet,safetyWarning=safety if fire else "Bu model F400-120 sınıflandırması kapsamı dışındadır.")
  if mono:m["technical"]["speedControlledMaxCurrentA"]={"CTVB/4-180":0.3,"CTVB/4-225":0.9,"CTVB/4-250":1.6,"CTVB/4-315":3.4}[name]
  m["pole"]=m["technical"]["poles"];m["catalogOnly"]=False
  ops=[]
  for c in curves:
   full=c is primary
   ops.append({"control":c["control"],"power":watts/1000 if full else 0,"speed":rpm if full else 0,
    "current":(a230 if mono else a400) if full else 0,"sound":outlet if full else 0,
    "nominalAirflow":flow if full else max(p[1] for p in c["sourcePoints"]),"maxPressure":max(p[0] for p in c["sourcePoints"])})
  m["performance"].update(nominalAirflow=flow,maxAirflow=flow,points=[],sourcePoints=primary["sourcePoints"],curves=curves,
    control=primary["control"],controls=[c["control"] for c in curves],operatingPoints=ops,interpolation="linear",precomputed=True)
  general=["Dikey atışlı çatı tipi radyal fan.","Güç: maksimum çekilen elektriksel giriş gücü (P1).",f"Ses: atış {outlet}, emiş {inlet} dB(A); 3 m, katalog çalışma noktası 2.",f"Sürekli taşınan hava sıcaklığı: en fazla {temp} °C."]
  general.append("F400 / 120 dakika duman egzoz sınıfı." if fire else "F400-120 sınıfı bu modele uygulanmaz.")
  current=f"50 Hz katalog akımı: 230 V için {a230:g} A, 400 V için {a400:g} A." if not mono and a230 is not None else f"50 Hz katalog akımı: {230 if mono else 400} V için {(a230 if mono else a400):g} A."
  if weight is None:general.append("Ağırlık: üretici katalog sürümleri uyuşmadığı için doğrulama bekliyor.")
  m["description"]={"general":general,"motor":[f"{voltage}, 50 Hz.","IP55 motor, F sınıfı yalıtım.",current],"applications":[]}
  m["source"].update(page=4,catalogue=artifact["source"]["catalogue"],url=URL,sha256=SHA256,sourceModel=name+"N",curvePages=[primary["sourcePage"]])
  m["verification"]={"status":"catalog-source","sourceCatalogue":artifact["source"]["catalogue"],"sourcePage":4,"sourceSha256":SHA256,
   "caution":"Only the supplied catalogue N variant is used. F400 excludes 180N. Lower-control motor data are unspecified; no extrapolation."}
  if weight is None:m["verification"]["unresolvedFields"]={"weight":artifact["unresolvedFields"][name]["weight"]}
 (ROOT/"assets/products/soler-palau/ctvb-ctvt-verified-curves.json").write_text(json.dumps(artifact,ensure_ascii=False,separators=(",",":"))+"\n")
 target.write_text(prefix+"window.VensisVentilationData="+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n")


if __name__=="__main__":
 parser=argparse.ArgumentParser();parser.add_argument("pdf",type=Path);args=parser.parse_args()
 artifact=extract(args.pdf);apply(artifact);print(json.dumps(artifact["summary"]))
