# Zoznam obcí SR pre výber mesta a okruh v km: web/public/obce.json ([názov, šírka, dĺžka]).
# Zdroj: npm balík @geomelon/slovakia (CC0, údaje z Wikidaty). Spustenie:
#   cd /tmp && npm pack @geomelon/slovakia && tar xzf geomelon-slovakia-*.tgz
#   python3 -I web/scripts/gen-obce.py /tmp/package/data.json web/public/obce.json
# Rovnaké názvy obcí sa odlíšia najbližším mestom, napr. „Belá (pri meste Štúrovo)“.
import json,sys,collections
d=json.load(open(sys.argv[1]))
reg={r['id']:r['translations'].get('sk') or r['name'] for r in d['regions']}
out=[]
for x in d['cities']:
    t=set(x.get('settlementTypes',[]))
    if 'municipality of Slovakia' not in t and not (t & {'big city'}): continue
    if 'quarter' in t and 'municipality of Slovakia' not in t: continue
    n=(x['translations'].get('sk') or x['name']).strip()
    out.append([n, round(x['latitude'],4), round(x['longitude'],4), reg.get(x['regionId'],'')])
import math
towns=[((x['translations'].get('sk') or x['name']),x['latitude'],x['longitude']) for x in d['cities'] if set(x.get('settlementTypes',[]))&{'town','city','big city'} and 'municipality of Slovakia' in x.get('settlementTypes',[])+(['municipality of Slovakia'] if 'big city' in x.get('settlementTypes',[]) else [])]
def near(n,la,lo):
    best=min((t for t in towns if t[0]!=n), key=lambda t:(t[1]-la)**2+((t[2]-lo)*math.cos(math.radians(la)))**2)
    return best[0]
cnt=collections.Counter(o[0] for o in out)
res=[]; seen=collections.Counter()
for n,la,lo,k in out:
    label=n
    if cnt[n]>1:
        label=f"{n} (pri meste {near(n,la,lo)})"
    seen[label]+=1
    if seen[label]>1: label=f"{label} {seen[label]}"
    res.append([label,la,lo])
res.sort(key=lambda r:r[0])
print(len(res), sum(1 for c in cnt.values() if c>1), [r for r in res if '2' in r[0][-2:]][:10], file=sys.stderr)
json.dump(res,open(sys.argv[2],'w'),ensure_ascii=False,separators=(',',':'))
