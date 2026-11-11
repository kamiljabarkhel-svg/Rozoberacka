"use client";
// Hromadné doplnenie fotiek k existujúcim inzerátom. Fotky sa priradia podľa názvu súboru:
// číslo dielu (5E1941015_1.jpg) alebo číslo inzerátu (ID123_1.jpg). Nič sa neuloží, kým predajca nepotvrdí náhľad.
import { useEffect, useMemo, useState } from "react";
import { addPhotos, skError, type MyListing } from "@/lib/seller";
import { baseName, groupByKey, isPhoto, keyOf, MAX_PHOTOS, sortPhotos } from "@/lib/bulkPhotos";

type Plan = { l: MyListing; files: File[]; cut: number; how: string };

export default function BulkPhotos({ uid, items, onDone }: { uid: string; items: MyListing[]; onDone: (msg: string) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [activate, setActivate] = useState(true);
  const [busy, setBusy] = useState(false), [done, setDone] = useState(0), [errs, setErrs] = useState<string[]>([]);
  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const add = [...list].filter(isPhoto);
    setFiles((o) => { const seen = new Set(o.map((f) => baseName(f).toLowerCase() + f.size)); return [...o, ...add.filter((f) => !seen.has(baseName(f).toLowerCase() + f.size))]; });
    setErrs([]);
  };

  const { plans, unused, ambiguous } = useMemo(() => {
    const open = items.filter((l) => l.status !== "blocked" && l.status !== "sold");
    const { byKey, byId } = groupByKey(files);
    const byOem = new Map<string, MyListing[]>();
    for (const l of open) { const k = keyOf(l.oem); if (k.length >= 4) byOem.set(k, [...(byOem.get(k) || []), l]); }
    const got = new Map<number, { files: File[]; how: Set<string> }>();
    const give = (l: MyListing, fs: File[], how: string) => {
      const g = got.get(l.id) || { files: [], how: new Set<string>() };
      for (const f of fs) if (!g.files.includes(f)) g.files.push(f);
      g.how.add(how); got.set(l.id, g);
    };
    const ambiguous: { key: string; n: number }[] = [];
    for (const [id, fs] of byId) { const l = open.find((x) => x.id === id); if (l) give(l, fs, "číslo inzerátu"); }
    for (const [k, fs] of byKey) {
      const ls = byOem.get(k); if (!ls) continue;
      // viac inzerátov s rovnakým číslom dielu: fotky dostane ten jediný, ktorý ešte nemá fotky
      const target = ls.length === 1 ? ls[0] : ls.filter((l) => !l.photos.length).length === 1 ? ls.find((l) => !l.photos.length)! : null;
      if (target) give(target, fs, "číslo dielu"); else ambiguous.push({ key: k, n: ls.length });
    }
    const plans: Plan[] = [];
    for (const l of open) {
      const g = got.get(l.id); if (!g) continue;
      const room = Math.max(0, MAX_PHOTOS - l.photos.length);
      const sorted = sortPhotos(g.files);
      plans.push({ l, files: sorted.slice(0, room), cut: Math.max(0, sorted.length - room), how: [...g.how].join(", ") });
    }
    const used = new Set(plans.flatMap((p) => p.files).concat(plans.flatMap((p) => sortPhotos(got.get(p.l.id)!.files).slice(p.files.length))));
    return { plans: plans.filter((p) => p.files.length || p.cut), unused: files.filter((f) => !used.has(f)), ambiguous };
  }, [files, items]);

  const urls = useMemo(() => new Map(files.map((f) => [f, URL.createObjectURL(f)])), [files]);
  useEffect(() => () => { for (const u of urls.values()) URL.revokeObjectURL(u); }, [urls]);
  const todo = plans.filter((p) => p.files.length);
  const publish = todo.filter((p) => activate && p.l.status === "paused" && !p.l.photos.length).length;
  const total = todo.reduce((a, p) => a + p.files.length, 0);
  const noPhoto = items.filter((l) => !l.photos.length && l.status !== "sold" && l.status !== "blocked");

  async function run() {
    setBusy(true); setDone(0); const e: string[] = []; let n = 0, ok = 0;
    for (const p of todo) {
      try { await addPhotos(uid, p.l, p.files, activate); ok++; }
      catch (x) { e.push(`${p.l.name}: ${skError(x)}`); }
      n += p.files.length; setDone(n);
    }
    setBusy(false); setErrs(e);
    if (ok) { setFiles([]); onDone(`Fotky doplnené k ${ok} ${ok === 1 ? "inzerátu" : "inzerátom"}`); }
  }

  return (
    <div>
            <div className="pp-box">
        <p>Nafoťte diely a pomenujte súbory podľa <b>čísla dielu</b> – web ich sám priradí k vašim inzerátom. Napríklad <code>5E1941015.jpg</code>, <code>5E1941015_2.jpg</code>, <code>5E1941015 (3).jpg</code>. Medzery a pomlčky v čísle nevadia.</p>
        <p className="mute">Ak má viac inzerátov rovnaké číslo dielu, použite číslo inzerátu: <code>ID123_1.jpg</code> (číslo nájdete v „Moje inzeráty“ pri inzeráte). Fotky sa pridajú za existujúce, najviac {MAX_PHOTOS} na inzerát. Formát JPG, PNG alebo WebP; na iPhone zvoľte v Nastavenia → Fotoaparát → Formáty „Najkompatibilnejší“.</p>
        {noPhoto.length > 0 && <p className="pp-photosum">Bez fotky máte {noPhoto.length} {noPhoto.length === 1 ? "inzerát" : noPhoto.length < 5 ? "inzeráty" : "inzerátov"}.</p>}
        <span className="pp-bulkbtns">
          <label className="pp-add pp-bulkph"><input type="file" accept="image/*" multiple onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať fotky</span></label>
          <label className="pp-add pp-folder"><input type="file" multiple {...{ webkitdirectory: "" }} onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /><span>Vybrať celý priečinok</span></label>
          {files.length > 0 && <button type="button" className="lnk" onClick={() => setFiles([])}>Odobrať fotky ({files.length})</button>}
        </span>
        <label className="pp-chk"><input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} /><span>Zverejniť pozastavené inzeráty, ktoré čakali na prvú fotku</span></label>
      </div>
      {files.length > 0 && (
        <div className="pp-box">
          <div className="pp-h"><h2>Náhľad: {total} {total === 1 ? "fotka" : total < 5 ? "fotky" : "fotiek"} k {todo.length} {todo.length === 1 ? "inzerátu" : "inzerátom"}</h2>
            <button className="btn" disabled={!todo.length || busy} onClick={run}>{busy ? `Nahrávam ${done} / ${total}…` : "Pridať fotky"}</button></div>
          {publish > 0 && <p className="pp-photosum">{publish} {publish === 1 ? "inzerát sa" : "inzerátov sa"} po pridaní fotiek zverejní.</p>}
          <ul className="pp-pre">{plans.map((p) => (
            <li key={p.l.id} className="ok"><b>{p.l.name}</b> <span className="mute">ID{p.l.id}{p.l.oem ? ` · číslo dielu ${p.l.oem}` : ""} · {p.l.status === "paused" ? "pozastavený" : "aktívny"} · má {p.l.photos.length} fotiek · podľa: {p.how}</span>
              <span className="pp-prephotos">{p.files.slice(0, 6).map((f) => <img key={baseName(f) + f.size} src={urls.get(f)} alt={baseName(f)} title={baseName(f)} loading="lazy" decoding="async" />)}<span className="mute">{p.files.length} {p.files.length === 1 ? "nová" : p.files.length < 5 ? "nové" : "nových"}</span></span>
              {p.cut > 0 && <span className="mute">! {p.cut} {p.cut === 1 ? "fotka sa nezmestí" : "fotiek sa nezmestí"} (najviac {MAX_PHOTOS} na inzerát)</span>}</li>
          ))}</ul>
          {ambiguous.length > 0 && <p className="pp-err">Číslo dielu má viac inzerátov – pomenujte fotky podľa čísla inzerátu (ID…): {ambiguous.map((a) => `${a.key} (${a.n}×)`).join(", ")}</p>}
          {unused.length > 0 && <p className="mute">Nepriradené ({unused.length}): {unused.slice(0, 12).map(baseName).join(", ")}{unused.length > 12 ? "…" : ""} – názov súboru sa nezhoduje so žiadnym číslom dielu ani ID inzerátu.</p>}
          {errs.length > 0 && <div className="pp-err">{errs.map((r) => <div key={r}>{r}</div>)}</div>}
        </div>
      )}
    </div>
  );
}
