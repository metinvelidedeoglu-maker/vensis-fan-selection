#!/usr/bin/env python3
"""Extract five source vector curves for ten existing standard bath fans.

Uses the exact supplied editions, printed m3/h and Pa ticks (not mmWG), native
polylines or adaptive Bezier flattening. No fan-law scaling or curve extension.
"""
import argparse
import bisect
import copy
import hashlib
import json
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE="d0845f2f5f94e9d43a972d86e97358fa8167b2c4"
EVIDENCE="assets/products/soler-palau/bath-verified-curves.json"
SOURCES={"edm-0.pdf":"32612e469eaa3ef607117bae2a0def0d5e9aa19168e83f28fc96210a7a6c27a8",
         "silent-4-69aeb6f4ad3c8.pdf":"6fbd2da01dca8478181b41613d407b03f1c1d15f87c15335017cf2efa6017d4e"}
# Axis coordinates are original PDF points. Pa zero is aligned to the printed
# frame baseline, removing only the separate Pa column's tiny zero offset.
GRAPHS={
 "EDM-100":{"source":"edm-0.pdf","page":4,"drawing":15,"gridDrawings":[13],"baseline":513.048,
   "flowTicks":[[422.569,0],[447.775,20],[473.484,40],[498.108,60],[523.037,80],[548.409,100]],
   "paTicks":[[512.799,0],[485.596,5],[457.305,10],[430.102,15],[401.811,20],[373.519,25],[345.229,30]],
   "flowTextRange":[518,530],"paTextXRange":[385,400]},
 "EDM-200":{"source":"edm-0.pdf","page":7,"drawing":149,"gridDrawings":[147,150],"baseline":452.548,
   "flowTicks":[[432.918,0],[454.780,40],[477.079,80],[498.435,120],[520.058,160],[542.061,200]],
   "paTicks":[[452.331,0],[409.862,10],[367.393,20],[325.869,30],[284.343,40]],
   "flowTextRange":[456,465],"paTextXRange":[402,414]},
 "SILENT-100":{"source":"silent-4-69aeb6f4ad3c8.pdf","page":2,"drawing":141,"gridDrawings":[140,142],"baseline":291.560,
   "flowTicks":[[439.612,0],[460.508,20],[481.050,40],[501.499,60],[521.947,80],[542.859,100]],
   "paTicks":[[291.578,0],[269.348,5],[247.341,10],[225.335,15],[203.329,20],[181.322,25],[159.316,30],[137.309,35],[115.165,40]],
   "flowTextRange":[296,304],"paTextXRange":[400,414]},
 "SILENT-200":{"source":"silent-4-69aeb6f4ad3c8.pdf","page":7,"drawing":14,"gridDrawings":[11,12,13,15,16],"baseline":300.499,
   "flowTicks":[[417.877,0],[442.464,40],[466.978,80],[491.343,120],[515.930,160],[540.369,200]],
   "paTicks":[[300.499,0],[279.912,10],[259.471,20],[238.957,30],[218.518,40],[198.004,50],[177.564,60],[156.976,70],[136.536,80],[116.022,90]],
   "flowTextRange":[305,313],"paTextXRange":[386,399]},
 "SILENT-300":{"source":"silent-4-69aeb6f4ad3c8.pdf","page":9,"drawing":174,"excludedPlusDrawing":175,
   "gridDrawings":[10,64,65,66,67,68,69,78,145,146,147,148,149,150,151,152,153,154,162,173],"baseline":311.535,
   "flowTicks":[[411.162,0],[429.142,50],[447.100,100],[465.079,150],[483.060,200],[501.040,250],[518.997,300]],
   "paTicks":[[311.535,0],[294.376,10],[277.218,20],[260.059,30],[242.878,40],[225.742,50],[208.560,60],[191.424,70],[174.243,80],[157.085,90],[139.904,100]],
   "tickVerification":"render-reviewed outlined numerals: 50 m3/h and 10 Pa major-grid intervals; standard lower curve, not PLUS"},
}
WARNING="The existing performance curve does not match this catalogue; verify it before using the fan for selection."


def axis(value,ticks):
    pairs=sorted(ticks);i=min(max(bisect.bisect_right([p[0] for p in pairs],value)-1,0),len(pairs)-2)
    (x0,y0),(x1,y1)=pairs[i:i+2]
    return y0+(value-x0)*(y1-y0)/(x1-x0)


def point_line_distance(p,a,b):
    length=math.dist(a,b)
    return math.dist(p,a) if length<1e-12 else abs((b[0]-a[0])*(a[1]-p[1])-(a[0]-p[0])*(b[1]-a[1]))/length


def flatten(commands,tolerance=.01):
    result=[]
    def append(p):
        if not result or math.dist(result[-1],p)>1e-8:result.append(tuple(p))
    def bezier(a,b,c,d,depth=0):
        if max(point_line_distance(b,a,d),point_line_distance(c,a,d))<=tolerance:
            append(a);append(d);return
        assert depth<24,"Bezier did not converge"
        ab=tuple((x+y)/2 for x,y in zip(a,b));bc=tuple((x+y)/2 for x,y in zip(b,c));cd=tuple((x+y)/2 for x,y in zip(c,d))
        abc=tuple((x+y)/2 for x,y in zip(ab,bc));bcd=tuple((x+y)/2 for x,y in zip(bc,cd));mid=tuple((x+y)/2 for x,y in zip(abc,bcd))
        bezier(a,ab,abc,mid,depth+1);bezier(mid,bcd,cd,d,depth+1)
    for command in commands:
        kind,*pts=command
        if result:assert math.dist(result[-1],pts[0])<.002,"Mixed disjoint paths"
        if kind=="l":append(pts[0]);append(pts[1])
        elif kind=="c":bezier(*pts)
        else:raise ValueError("Unexpected fan curve path command")
    return result


def convert(native,graph):
    pa=graph["alignedPaTicks"];q=graph["flowTicks"];points=[];clipped=False
    for x,y in native:
        pressure=axis(y,pa);flow=axis(x,q)
        assert flow>=-.01
        if pressure<0:
            # Only a native stroke tail crossing the printed zero axis is clipped.
            # This interpolates inside the drawn segment; it never extends it.
            assert pressure>-.2 and points and points[-1][0]>=0
            p0,q0=points[-1];fraction=p0/(p0-pressure)
            points.append([0,q0+fraction*(flow-q0)]);clipped=True;break
        points.append([pressure,max(0,flow)])
    points=[[round(p,4),round(q,4)] for p,q in points]
    assert len(points)>30 and points[-1][1]>points[0][1]
    return points,clipped


def extract(directory):
    import fitz
    docs={}
    for name,sha in SOURCES.items():
        raw=(directory/name).read_bytes();assert hashlib.sha256(raw).hexdigest()==sha,name
        docs[name]=fitz.open(stream=raw,filetype="pdf")
    result={}
    for family,definition in GRAPHS.items():
        g=copy.deepcopy(definition);page=docs[g["source"]][g["page"]-1];drawings=page.get_drawings();d=drawings[g["drawing"]]
        assert family in page.get_text() and d["type"]=="s" and 1<d["width"]<1.5
        commands=[[item[0],*[list(p) for p in item[1:]]] for item in d["items"]]
        assert all(c[0] in ("l","c") for c in commands)
        # Every calibration anchor must coincide with a pinned native grid/tick
        # endpoint; labels may be rendered to outlines on SILENT-300's page.
        endpoints=[]
        for index in g["gridDrawings"]:
            for item in drawings[index]["items"]:
                if item[0]=="l":endpoints.extend(tuple(p) for p in item[1:])
                elif item[0]=="re":endpoints.extend(tuple(p) for p in [item[1].tl,item[1].tr,item[1].bl,item[1].br])
        for x,_ in g["flowTicks"]:assert min(abs(p[0]-x) for p in endpoints)<.002,(family,"flow anchor",x)
        for y,_ in g["paTicks"]:assert min(abs(p[1]-y) for p in endpoints)<.002,(family,"Pa anchor",y)
        checked={"flow":[],"pressure":[]}
        if "tickVerification" not in g:
            words=page.get_text("words")
            for key,ticks in [("flow",g["flowTicks"]),("pressure",g["paTicks"])]:
                for position,value in ticks:
                    candidates=[]
                    for a,b,c,e,text,*_ in words:
                        if text!=str(value):continue
                        cx,cy=(a+c)/2,(b+e)/2
                        valid=(g["flowTextRange"][0]<cy<g["flowTextRange"][1] and abs(cx-position)<3) if key=="flow" else (g["paTextXRange"][0]<cx<g["paTextXRange"][1] and abs(cy-position)<1.6)
                        if valid:candidates.append([round(cx,3),round(cy,3),text])
                    # Rightmost frame boundaries without a numeral follow the
                    # same visible major-grid interval; all interior ticks checked.
                    if not candidates and key=="flow" and value==ticks[-1][1]:continue
                    assert candidates,(family,key,position,value)
                    checked[key].append(candidates[0])
            assert len(checked["flow"])>=5
            assert len(checked["pressure"]) >= (7 if family in ("SILENT-100","SILENT-200","EDM-100") else 5)
        offset=g["baseline"]-next(pos for pos,value in g["paTicks"] if value==0)
        g["alignedPaTicks"]=[[round(pos+offset,6),value] for pos,value in g["paTicks"]]
        native=flatten(commands);points,clipped=convert(native,g)
        result[family]={**g,"sourceSha256":SOURCES[g["source"]],"sourceFrequencyHz":50,"nativeCommands":commands,
                        "flatteningTolerancePdfPoints":.01,"nativeVertexCount":len(native),"checkedPrintedTicks":checked,
                        "pressureCalibration":"printed Pa ticks, zero aligned to original plot baseline; never mmWG conversion",
                        "axisInterpolation":"piecewise-linear between native major tick positions",
                        "zeroAxisTailClipped":clipped,"sourcePoints":points,
                        "domain":{"flowMin":min(q for p,q in points),"flowMax":max(q for p,q in points),"pressureMin":min(p for p,q in points),"pressureMax":max(p for p,q in points)},
                        "noExtrapolation":True}
    return {"schemaVersion":1,"verifiedOn":"2026-10-23","sources":SOURCES,"graphs":result}


def apply(artifact,data):
    changes=[];rows=[]
    def set_value(m,path,value):
        p=m
        for key in path[:-1]:p=p[key]
        key=path[-1]
        if key in p and p[key]==value:return
        changes.append({"id":m["id"],"path":path,"previousPresent":key in p,"previous":copy.deepcopy(p.get(key)),"value":copy.deepcopy(value)})
        p[key]=copy.deepcopy(value)
    for m in data["models"]:
        if m["model"] in ("EDM-100","EDM-200"):family=m["model"]
        elif m["seriesId"]=="SILENT":family=m["model"].split()[0]
        else:continue
        g=artifact["graphs"][family];points=g["sourcePoints"]
        c={"control":"Nominal","sourcePage":g["page"],"sourceDrawingIndexes":[g["drawing"]],"sourceFrequencyHz":50,
           "sourceSha256":g["sourceSha256"],"interpolation":"linear","precomputed":True,"sourcePoints":points}
        p=copy.deepcopy(m["performance"]);p.update(points=[],sourcePoints=points,curves=[c],control="Nominal",controls=["Nominal"],interpolation="linear",precomputed=True)
        if m["seriesId"]=="SILENT":
            p["operatingPoints"]=[{"control":"Nominal",**{key:m["motor"].get(key,0) for key in ("power","speed","current","sound")},"nominalAirflow":p["nominalAirflow"],"maxPressure":g["domain"]["pressureMax"]}]
            set_value(m,["catalogOnly"],False);set_value(m,["verification","status"],"catalog-source")
        else:
            assert len(p["operatingPoints"])==1
            p["operatingPoints"][0]["maxPressure"]=g["domain"]["pressureMax"]
            desc=copy.deepcopy(m["description"]);desc["general"]=[s for s in desc["general"] if s!=WARNING];set_value(m,["description"],desc)
            set_value(m,["technical","curveSourceReview"],{"status":"verified-against-source","evidence":EVIDENCE,"source":g["source"],"page":g["page"],"action":"replaced-with-original-vector-curve"})
        set_value(m,["performance"],p)
        set_value(m,["verification","bathCurves"],{"status":"verified-against-original-vector-curve","evidence":EVIDENCE,"source":g["source"],"sha256":g["sourceSha256"],"page":g["page"],"drawing":g["drawing"],"family":family,"verifiedOn":artifact["verifiedOn"],"extrapolation":False})
        rows.append({"id":m["id"],"model":m["model"],"family":family,"source":g["source"],"page":g["page"],"domain":g["domain"]})
    assert len(rows)==10
    assert {r["model"] for r in rows} == {"EDM-100","EDM-200","SILENT-100 CZ","SILENT-100 CRZ","SILENT-100 CZ SILVER","SILENT-100 CRZ SILVER","SILENT-200 CZ","SILENT-200 CRZ","SILENT-300 CZ","SILENT-300 CRZ"}
    artifact["models"]=rows
    return changes


def protected(data):
    d=copy.deepcopy(data)
    for m in d["models"]:
        if m["seriesId"]=="SILENT" or m["model"] in ("EDM-100","EDM-200"):
            m.pop("performance");m.pop("catalogOnly",None);m["verification"].pop("bathCurves",None)
            if m["seriesId"]=="SILENT":m["verification"].pop("status",None)
            else:
                m["technical"].pop("curveSourceReview",None)
                m["description"]["general"]=[s for s in m["description"]["general"] if s!=WARNING]
    return d


def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument("directory",type=Path);parser.add_argument("--apply",action="store_true");parser.add_argument("--output",type=Path);args=parser.parse_args()
    artifact=extract(args.directory)
    if args.apply:
        target=ROOT/"data/ventilation-catalog.js";prefix,payload=target.read_text().split("window.VensisVentilationData=",1);data=json.loads(payload.strip().removesuffix(";"))
        protected_hash=digest(protected(data));changes=apply(artifact,data);assert digest(protected(data))==protected_hash
        evidence=ROOT/EVIDENCE
        if evidence.exists():
            old=json.loads(evidence.read_text());assert not changes and old["graphs"]==artifact["graphs"]
        else:
            artifact["preservation"]={"baseCommit":BASE,"protectedDataSha256":protected_hash,"modelChanges":changes}
            evidence.write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+"\n")
            target.write_text(prefix+"window.VensisVentilationData="+json.dumps(data,ensure_ascii=False,separators=(",",":"))+";\n")
    if args.output:args.output.write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+"\n")
    print(json.dumps({name:{"vertices":len(g["sourcePoints"]),"domain":g["domain"]} for name,g in artifact["graphs"].items()}))
