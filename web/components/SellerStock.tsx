"use client";
// Celá ponuka jedného predajcu (verejná stránka /predajci/…): hľadanie v jeho dieloch, kategórie s počtami,
// zoradenie a „Načítať viac“, kým sa nezobrazia všetky. Prvú stránku pripraví server (rýchle a pre Google).
import { useEffect, useRef, useState } from "react";
import type { Catalog, Filters, Listing } from "@/lib/types";
import { emptyFilters } from "@/lib/types";
import { getCatalog, searchListings } from "@/lib/data";
import { pieces } from "@/lib/format";
import { useFavs } from "@/lib/favs";
import { Icon, catIcon } from "./Icons";
import ListingCard from "./ListingCard";

const PAGE = 24;

export default function SellerStock({ seller, cat: cat0, initial }: {
  seller: string; cat: Catalog;
  initial: { items: Listing[]; total: number; cats: [string, number][] };
}) {
  const { favs, toggle } = useFavs();
  const [q, setQ] = useState(""), [qx, setQx] = useState("");
  const [c, setC] = useState(""), [sort, setSort] = useState<Filters["sort"]>("new");
  const [items, setItems] = useState(initial.items), [total, setTotal] = useState(initial.total);
  // Server posiela len časť katalógu (autá z prvej stránky); pri ďalších dieloch sa celý katalóg načíta raz v prehliadači.
  const [cat, setCat] = useState(cat0);
  useEffect(() => {
    const miss = items.some((l) => (l.modelId != null && !cat.models.some((m) => m.id === l.modelId)) || (l.engineId != null && !cat.engines.some((e) => e.id === l.engineId)));
    if (miss) getCatalog().then(setCat).catch(() => {});
  }, [items, cat]);
  const [cats, setCats] = useState(new Map(initial.cats)), [base, setBase] = useState(initial.total);
  const [busy, setBusy] = useState(false), [err, setErr] = useState("");
  const first = useRef(true);

  // text sa hľadá až chvíľu po dopísaní
  useEffect(() => { const t = setTimeout(() => setQx(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const f: Filters = { ...emptyFilters, q: qx, cat: c, sort };
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let off = false;
    setBusy(true); setErr("");
    searchListings(f, [], 0, PAGE, { seller })
      .then((r) => { if (off) return; setItems(r.items); setTotal(r.total); setCats(r.cats); setBase(r.base); })
      .catch((e) => { if (!off) setErr(String((e as Error).message || e)); })
      .finally(() => { if (!off) setBusy(false); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qx, c, sort, seller]);

  const more = async () => {
    setBusy(true); setErr("");
    try { const r = await searchListings(f, [], items.length, PAGE, { seller }); setItems([...items, ...r.items]); setTotal(r.total); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setBusy(false); }
  };

  const catList = [...cat.categories].sort((a, b) => a.sort - b.sort).filter((x) => cats.get(x.id) || c === x.id);
  const filtered = qx || c;
  return (
    <section className="stock" aria-label="Ponuka predajcu">
      <div className="stock-h">
        <h2>Diely v ponuke <span className="mute">({filtered ? `${total} z ${initial.total}` : total})</span></h2>
        {initial.total > 0 && <div className="stock-t">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hľadať v ponuke predajcu (diel, OEM, auto)" aria-label="Hľadať v ponuke predajcu" />
          <select value={sort} onChange={(e) => setSort(e.target.value as Filters["sort"])} aria-label="Zoradiť">
            <option value="new">Najnovšie</option><option value="asc">Najlacnejšie</option><option value="desc">Najdrahšie</option>
          </select>
          <a className="rank-note" href="/ako-zoradujeme">Ako zoraďujeme ponuky</a>
        </div>}
      </div>
      {initial.total > 0 && catList.length > 1 && <div className="chips" aria-label="Kategórie v ponuke predajcu">
        <button className="chip" aria-pressed={!c} onClick={() => setC("")}>Všetky ({base})</button>
        {catList.map((x) => <button key={x.id} className="chip" aria-pressed={c === x.id} onClick={() => setC(c === x.id ? "" : x.id)}><Icon id={catIcon(x.id)} />{x.name} ({cats.get(x.id) || 0})</button>)}
      </div>}
      {err && <div className="err" role="alert">Diely sa nepodarilo načítať: {err}</div>}
      {items.length
        ? <div className={"grid" + (busy ? " is-busy" : "")}>{items.map((l) => <ListingCard key={l.id} l={l} cat={cat} fav={favs.includes(l.id)} onFav={toggle} />)}</div>
        : <div className="empty">{initial.total ? <>V ponuke predajcu sme nič nenašli. <button className="lnk" onClick={() => { setQ(""); setC(""); }}>Zobraziť všetky diely</button></> : "Predajca teraz nemá aktívne inzeráty."}</div>}
      {total > items.length && <p className="stock-more"><button className="add more" disabled={busy} onClick={more}>{busy ? "Načítavam…" : `Načítať ďalšie (zobrazených ${items.length} z ${pieces(total)})`}</button></p>}
    </section>
  );
}
