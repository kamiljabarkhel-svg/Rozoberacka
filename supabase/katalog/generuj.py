#!/usr/bin/env python3
"""Z údajov v supabase/katalog/*.txt vytvorí supabase/16_katalog_europa.sql.

Spustenie (z priečinka supabase/katalog):  python3 generuj.py
Skript sa dá spustiť opakovane; SQL je idempotentné (on conflict do nothing), existujúce záznamy a ich id sa nemenia.
Pri chybe v údajoch (zlý formát, rok, duplicita) skončí s popisom chyby a nič nezapíše.
"""
import glob, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "16_katalog_europa.sql")
OUT2 = os.path.join(ROOT, "20_katalog_vozidla.sql")
OUT3 = os.path.join(ROOT, "30_katalog_veterany.sql")
VTYPES = ("osobne", "dodavky", "nakladne", "autobusy", "motorky", "veterany")

def existing():
    """Značky a modely, ktoré už sú v 03_katalog.sql a 09_katalog_opravy.sql."""
    brands, models = set(), set()
    for f in ("03_katalog.sql", "09_katalog_opravy.sql"):
        for line in open(os.path.join(ROOT, f), encoding="utf-8"):
            m = re.search(r"insert into public\.brands \(name, popular\) values \('([^']+)'", line)
            if m: brands.add(m.group(1))
            m = re.search(r"select id, '([^']+)', \d+, (?:\d+|null) from public\.brands where name = '([^']+)'", line)
            if m: models.add((m.group(2), m.group(1)))
    return brands, models

def q(s): return "'" + s.replace("'", "''") + "'"

def main():
    ex_brands, ex_models = existing()
    errors16 = run_group("0*.txt", ex_brands, ex_models)
    if errors16 is not None: sys.exit(1)
    run_typed(ex_brands, ex_models)

def run_group(pattern, ex_brands, ex_models):
    errors, brands, order = [], {}, []
    cur = None
    for path in sorted(glob.glob(os.path.join(HERE, pattern))):
        name = os.path.basename(path)
        for no, raw in enumerate(open(path, encoding="utf-8"), 1):
            line = raw.strip()
            if not line or line == "#" or line.startswith("# "): continue
            where = f"{name}:{no}"
            if line.startswith("@"):
                b, _, pop = line[1:].partition("|")
                b = b.strip()
                if pop not in ("0", "1"): errors.append(f"{where}: pri značke chýba |0 alebo |1"); continue
                if b in brands: errors.append(f"{where}: značka {b} je v súboroch dvakrát"); continue
                brands[b] = {"popular": pop == "1", "models": []}; order.append(b); cur = b
                continue
            if cur is None: errors.append(f"{where}: model pred prvou značkou"); continue
            parts = line.split("|")
            if len(parts) != 4: errors.append(f"{where}: očakávam 4 časti oddelené |, je ich {len(parts)}"); continue
            mname, y1, y2, eng = (p.strip() for p in parts)
            if not mname or "'" in mname: errors.append(f"{where}: prázdny názov alebo apostrof v názve modelu"); continue
            if not re.fullmatch(r"(19[5-9]\d|20[0-3]\d)", y1): errors.append(f"{where}: zlý rok od {y1}"); continue
            if y2 != "-" and not re.fullmatch(r"(19[5-9]\d|20[0-3]\d)", y2): errors.append(f"{where}: zlý rok do {y2}"); continue
            if y2 != "-" and int(y2) < int(y1): errors.append(f"{where}: rok do je menší ako rok od"); continue
            if int(y1) > 2026: errors.append(f"{where}: rok od v budúcnosti"); continue
            if any(m["name"] == mname for m in brands[cur]["models"]): errors.append(f"{where}: model {mname} je pri {cur} dvakrát"); continue
            if (cur, mname) in ex_models: errors.append(f"{where}: model {cur} {mname} už je v 03_katalog.sql – vynechajte ho"); continue
            engines, seen = [], set()
            for e in (x.strip() for x in eng.split(";")):
                if not e: continue
                if "'" in e or len(e) > 60: errors.append(f"{where}: zlá motorizácia {e!r}"); continue
                if not re.search(r"\d+ kW", e): errors.append(f"{where}: pri motorizácii chýba výkon v kW: {e!r}"); continue
                if re.search(r"[^\w\s.,+/()\-–&:°#]", e): errors.append(f"{where}: nečakaný znak v {e!r}"); continue
                if e.lower() in seen: continue  # duplicitu ticho vynecháme
                seen.add(e.lower()); engines.append(e)
            brands[cur]["models"].append({"name": mname, "from": int(y1), "to": None if y2 == "-" else int(y2), "engines": engines})
    if errors:
        print("CHYBY V ÚDAJOCH:\n" + "\n".join(errors), file=sys.stderr); return errors

    out = ["-- 16_katalog_europa.sql – všetky značky, modely (generácie od roku 1995) a bežné motorizácie áut na európskom trhu.",
           "-- VYGENEROVANÉ skriptom supabase/katalog/generuj.py zo súborov supabase/katalog/*.txt – needitujte ručne.",
           "-- Údaje sú písané z pamäte (8. 11. 2026) a môžu obsahovať chyby. Nie je to overený katalóg; nahradiť licencovanými dátami (TecDoc).",
           "-- Idempotentné: existujúce značky, modely a motorizácie (aj ich id) sa nemenia, pridajú sa len chýbajúce.",
           "begin;"]
    nm = ne = 0
    for b in order:
        d = brands[b]
        if b in ex_brands:
            out.append(f"-- {b}: doplnenie chýbajúcich generácií")
        else:
            out.append(f"insert into public.brands (name, popular) values ({q(b)}, {'true' if d['popular'] else 'false'}) on conflict (name) do nothing;")
        for m in d["models"]:
            nm += 1
            to = "null" if m["to"] is None else str(m["to"])
            out.append(f"insert into public.models (brand_id, name, year_from, year_to) select id, {q(m['name'])}, {m['from']}, {to} from public.brands where name = {q(b)} on conflict (brand_id, name) do nothing;")
            if m["engines"]:
                ne += len(m["engines"])
                vals = ", ".join(f"({q(e)})" for e in m["engines"])
                out.append(f"insert into public.engines (model_id, name) select m.id, v.n from public.models m join public.brands b on b.id = m.brand_id cross join (values {vals}) as v(n) where b.name = {q(b)} and m.name = {q(m['name'])} on conflict (model_id, name) do nothing;")
    out.append("commit;")
    open(OUT, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"OK: {len(order)} značiek ({sum(1 for b in order if b not in ex_brands)} nových), {nm} modelov, {ne} motorizácií -> {os.path.relpath(OUT, ROOT)}")
    for b in order:
        ex_brands.add(b)
        for m in brands[b]["models"]: ex_models.add((b, m["name"]))
    return None

def parse_engines(eng, where, errors):
    engines, seen = [], set()
    for e in (x.strip() for x in eng.split(";")):
        if not e: continue
        if "'" in e or len(e) > 60: errors.append(f"{where}: zlá motorizácia {e!r}"); continue
        if not re.search(r"\d+ kW", e): errors.append(f"{where}: pri motorizácii chýba výkon v kW: {e!r}"); continue
        if re.search(r"[^\w\s.,+/()\-–&:°#³]", e): errors.append(f"{where}: nečakaný znak v {e!r}"); continue
        if e.lower() in seen: continue
        seen.add(e.lower()); engines.append(e)
    return engines

def run_typed(ex_brands, ex_models):
    """Súbory 1*.txt: dodávky, nákladné, autobusy, motorky -> 20_katalog_vozidla.sql (spúšťa sa po 18)."""
    errors, brands, order, vtype, cur = [], {}, [], None, None
    for path in sorted(glob.glob(os.path.join(HERE, "1*.txt"))):
        name = os.path.basename(path); cur = None; vtype = None
        for no, raw in enumerate(open(path, encoding="utf-8"), 1):
            line = raw.strip(); where = f"{name}:{no}"
            if not line or line == "#" or line.startswith("# "): continue
            if line.startswith("!druh"):
                vtype = line.split()[1] if len(line.split()) > 1 else ""
                if vtype not in VTYPES: errors.append(f"{where}: neznámy druh vozidla {vtype!r}")
                continue
            if vtype is None: errors.append(f"{where}: na začiatku súboru chýba riadok !druh"); continue
            if line.startswith("@"):
                b, _, pop = line[1:].partition("|"); b = b.strip()
                if pop not in ("0", "1"): errors.append(f"{where}: pri značke chýba |0 alebo |1"); continue
                if b not in brands: brands[b] = {"popular": pop == "1", "models": []}; order.append(b)
                cur = b; continue
            if cur is None: errors.append(f"{where}: model pred prvou značkou"); continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) == 2 and parts[1] == "=":
                if (cur, parts[0]) not in ex_models: errors.append(f"{where}: model {cur} {parts[0]} v katalógu nie je – nedá sa mu nastaviť druh"); continue
                brands[cur]["models"].append({"name": parts[0], "retype": True, "vtype": vtype, "src": name}); continue
            if len(parts) != 4: errors.append(f"{where}: očakávam 4 časti oddelené | (alebo Model|=)"); continue
            mname, y1, y2, eng = parts
            if not mname or "'" in mname: errors.append(f"{where}: prázdny názov alebo apostrof"); continue
            yr = r"(19[5-9]\d|20[0-3]\d)" if vtype != "veterany" else r"(19\d\d|20[0-3]\d)"  # veterány aj pred rokom 1950
            if not re.fullmatch(yr, y1) or (y2 != "-" and not re.fullmatch(yr, y2)): errors.append(f"{where}: zlý rok"); continue
            if y2 != "-" and int(y2) < int(y1): errors.append(f"{where}: rok do je menší ako rok od"); continue
            if (cur, mname) in ex_models or any(m["name"] == mname for m in brands[cur]["models"]): errors.append(f"{where}: model {cur} {mname} už existuje"); continue
            brands[cur]["models"].append({"name": mname, "from": int(y1), "to": None if y2 == "-" else int(y2), "engines": parse_engines(eng, where, errors), "vtype": vtype, "src": name})
    if errors:
        print("CHYBY V ÚDAJOCH (druhy vozidiel):\n" + "\n".join(errors), file=sys.stderr); sys.exit(1)
    vet = lambda m: m["src"].startswith("14_")   # súbor 14_veterany.txt ide do 30_katalog_veterany.sql
    write_typed(OUT2, lambda m: not vet(m), order, brands, ex_brands,
                ["-- 20_katalog_vozidla.sql – dodávky, nákladné autá, autobusy a motorky (druh vozidla v models.vehicle_type). Spúšťa sa po 18.",
                 "-- VYGENEROVANÉ skriptom supabase/katalog/generuj.py zo súborov supabase/katalog/1*.txt – needitujte ručne.",
                 "-- Údaje z pamäte (8. 11. 2026), nie overený katalóg; nahradiť licencovanými dátami (TecDoc). Idempotentné.",
                 "begin;"], [])
    write_typed(OUT3, vet, order, brands, ex_brands,
                ["-- 30_katalog_veterany.sql – veterány (osobné autá, ktorých výroba sa začala najneskôr 1989) a chýbajúce staršie osobné autá od 1990. Spúšťa sa po 29.",
                 "-- VYGENEROVANÉ skriptom supabase/katalog/generuj.py zo súboru supabase/katalog/14_veterany.txt – needitujte ručne.",
                 "-- Údaje z pamäte (13. 11. 2026), nie overený katalóg. Idempotentné.",
                 "begin;"],
                ["-- „Iný model (veterán)“ pri každej značke, ktorá má veterány, a pri „Iná značka“ (ako supabase/27)",
                 "insert into public.models (brand_id, name, year_from, year_to, vehicle_type) select b.id, 'Iný model (veterán)', 1900, 1989, 'veterany' from public.brands b where b.name = 'Iná značka' on conflict (brand_id, name) do nothing;",
                 "insert into public.models (brand_id, name, year_from, year_to, vehicle_type) select m.brand_id, 'Iný model (veterán)', min(m.year_from), 1989, 'veterany' from public.models m join public.brands b on b.id = m.brand_id and b.name <> 'Iná značka' where m.vehicle_type = 'veterany' and m.name not like 'Iný model%' group by m.brand_id on conflict (brand_id, name) do nothing;"])

def write_typed(path, pick, order, brands, ex_brands, out, tail):
    cnt = {}; ne = nb = 0
    for b in order:
        d = brands[b]
        ms = [m for m in d["models"] if pick(m)]
        if not ms: continue
        if b not in ex_brands:
            nb += 1
            out.append(f"insert into public.brands (name, popular) values ({q(b)}, {'true' if d['popular'] else 'false'}) on conflict (name) do nothing;")
        for m in ms:
            cnt[m["vtype"]] = cnt.get(m["vtype"], 0) + 1
            if m.get("retype"):
                out.append(f"update public.models set vehicle_type = {q(m['vtype'])} where name = {q(m['name'])} and brand_id = (select id from public.brands where name = {q(b)});")
                continue
            to = "null" if m["to"] is None else str(m["to"])
            out.append(f"insert into public.models (brand_id, name, year_from, year_to, vehicle_type) select id, {q(m['name'])}, {m['from']}, {to}, {q(m['vtype'])} from public.brands where name = {q(b)} on conflict (brand_id, name) do update set vehicle_type = excluded.vehicle_type;")
            if m["engines"]:
                ne += len(m["engines"])
                vals = ", ".join(f"({q(e)})" for e in m["engines"])
                out.append(f"insert into public.engines (model_id, name) select m.id, v.n from public.models m join public.brands b on b.id = m.brand_id cross join (values {vals}) as v(n) where b.name = {q(b)} and m.name = {q(m['name'])} on conflict (model_id, name) do nothing;")
    out += tail
    out.append("commit;")
    open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print(f"OK: {cnt}, nových značiek {nb}, motorizácií {ne} -> {os.path.relpath(path, ROOT)}")

if __name__ == "__main__":
    main()
