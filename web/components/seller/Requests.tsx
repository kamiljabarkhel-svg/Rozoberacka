"use client";
// Dopyty kupujúcich: čo ľudia hľadajú. Predajca pošle ponuku (cena, telefón, prípadne odkaz na svoj inzerát).
import { useEffect, useMemo, useState } from "react";
import type { Catalog } from "@/lib/types";
import { carName } from "@/lib/seo";
import { price as fmt } from "@/lib/format";
import { myOffers, openRequests, sendOffer, skError, type MyListing, type MyOffer, type PartRequest, type Profile } from "@/lib/seller";

export default function Requests({ uid, cat, prof, items, onSent }: { uid: string; cat: Catalog; prof: Profile | null; items: MyListing[]; onSent: (m: string) => void }) {
  const [reqs, setReqs] = useState<PartRequest[] | null>(null), [offers, setOffers] = useState<MyOffer[]>([]);
  const [err, setErr] = useState(""), [onlyMine, setOnlyMine] = useState(true), [open, setOpen] = useState<number | null>(null);
  const myBrands = useMemo(() => new Set(items.map((i) => i.brandId)), [items]);
  const load = () => Promise.all([openRequests(), myOffers()]).then(([r, o]) => { setReqs(r); setOffers(o); }).catch((e) => setErr(skError(e)));
  useEffect(() => { load(); }, []);
  const shown = (reqs || []).filter((r) => !onlyMine || !myBrands.size || myBrands.has(r.brandId));
  return (
    <div>
      <header className="pp-h"><h1>Dopyty kupujúcich</h1>
        {myBrands.size > 0 && <label className="pp-chk"><input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /><span>Len značky, ktoré predávam</span></label>}</header>
      <p className="mute pp-note">Kupujúci, ktorí nenašli diel, tu napísali, čo hľadajú. Ak diel máte, zavolajte im alebo pošlite ponuku – uvidia ju na svojej stránke dopytu. Kontakt kupujúceho používajte len na ponuku tohto dielu.</p>
      {err && <p className="pp-err">{err}</p>}
      {reqs && !shown.length && <div className="empty">Zatiaľ žiadne otvorené dopyty{onlyMine && myBrands.size ? " pre vaše značky" : ""}.</div>}
      <ul className="pp-msgs">{shown.map((r) => {
        const mine = offers.find((o) => o.requestId === r.id);
        const car = carName(r, cat, true) + (r.year ? `, ${r.year}` : "");
        return (
          <li key={r.id} className={mine ? "" : "unread"}>
            <div className="pp-mh"><b>{r.partName}</b><span className="mute">{new Date(r.createdAt).toLocaleDateString("sk-SK")} · platí do {new Date(r.expiresAt).toLocaleDateString("sk-SK")}</span></div>
            <div><b>{car}</b>{r.categoryId ? ` · ${cat.categories.find((c) => c.id === r.categoryId)?.name}` : ""}{r.vin ? ` · VIN ${r.vin}` : ""}{r.city ? ` · ${r.city}` : ""}</div>
            {r.note && <p>{r.note}</p>}
            <div className="pp-mf"><span>{r.contactName}: <b>{/@/.test(r.contact) ? <a href={"mailto:" + r.contact}>{r.contact}</a> : <a href={"tel:" + r.contact.replace(/\s/g, "")}>{r.contact}</a>}</b></span>
              {mine ? <span className="tg">✓ Ponuka odoslaná: {fmt(mine.price)}</span> : open === r.id ? null : <button className="btn pp-btn-s" onClick={() => setOpen(r.id)}>Mám tento diel – poslať ponuku</button>}</div>
            {open === r.id && !mine && <OfferForm prof={prof} items={items.filter((i) => i.status === "active" && i.brandId === r.brandId)} cat={cat}
              onCancel={() => setOpen(null)} onSend={async (o) => { await sendOffer(uid, r.id, o); setOpen(null); await load(); onSent("Ponuka odoslaná"); }} />}
          </li>);
      })}</ul>
    </div>
  );
}

function OfferForm({ prof, items, cat, onSend, onCancel }: { prof: Profile | null; items: MyListing[]; cat: Catalog; onSend: (o: { price: number; phone: string; listingId: number | null; note: string }) => Promise<void>; onCancel: () => void }) {
  const [p, setP] = useState(""), [phone, setPhone] = useState(prof?.phone || ""), [lid, setLid] = useState(""), [note, setNote] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const send = async () => {
    const x = Number(p.replace(",", "."));
    if (!(x > 0)) return setErr("Zadajte cenu.");
    if (phone.replace(/\D/g, "").length < 9) return setErr("Telefón musí mať aspoň 9 číslic.");
    setBusy(true); setErr("");
    try { await onSend({ price: Math.round(x * 100) / 100, phone, listingId: lid ? Number(lid) : null, note }); } catch (e) { setErr(skError(e)); setBusy(false); }
  };
  return (
    <div className="pp-form pp-grid rq-offer">
      <label>Cena (€) *<input value={p} inputMode="decimal" onChange={(e) => setP(e.target.value)} placeholder="napr. 90" /></label>
      <label>Telefón *<input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} /></label>
      {items.length > 0 && <label className="full">Môj inzerát (nepovinné)<select value={lid} onChange={(e) => setLid(e.target.value)}><option value="">—</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} – {carName(i, cat)} ({fmt(i.price)})</option>)}</select></label>}
      <label className="full">Poznámka<textarea value={note} rows={2} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="stav, záruka, doprava…" /></label>
      {err && <p className="full pp-err">{err}</p>}
      <div className="full pp-actions"><button className="ubtn" onClick={onCancel}>Zrušiť</button><button className="btn" disabled={busy} onClick={send}>{busy ? "Odosielam…" : "Poslať ponuku"}</button></div>
    </div>
  );
}
