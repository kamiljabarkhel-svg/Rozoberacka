import type { Metadata } from "next";
import CityMap from "@/components/CityMap";
import Link from "next/link";
import { notFound } from "next/navigation";
import Crumbs from "@/components/Crumbs";
import SellerStock from "@/components/SellerStock";
import Stars from "@/components/Stars";
import SellerNotice from "@/components/SellerNotice";
import { sellerKind } from "@/lib/legal";
import { getCatalog, getSellerPublic, getSellerReviews, searchListings } from "@/lib/data";
import { pickCatalog } from "@/lib/catalogSort";
import { emptyFilters } from "@/lib/types";
import { pieces } from "@/lib/format";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbLd, sellerPath } from "@/lib/seo";
import Disclaimer from "@/components/Disclaimer";
import { langOf, lhref, tr } from "@/lib/i18n";
import { altLangs } from "@/lib/hreflang";
type P = { params: Promise<{ slug: string; lang: string }> };

export const revalidate = 600;

// Verejná stránka predajcu: celá jeho ponuka (hľadanie, kategórie, načítať ďalšie) a hodnotenia od kupujúcich (overené cez dopyt).
const idOf = (slug: string) => (/^[0-9a-f-]{36}/i.exec(slug)?.[0] || "").toLowerCase();

async function load(slug: string) {
  const s = await getSellerPublic(idOf(slug));
  if (!s) return null;
  const [cat, res, reviews] = await Promise.all([getCatalog(), searchListings({ ...emptyFilters }, [], 0, 24, { seller: s.id }), getSellerReviews(s.id)]);
  return { s, cat, res, reviews };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug, lang: lp } = await params;
  const lang = langOf("/" + lp), pl = lang === "pl";
  const d = await load(slug);
  if (!d) return { title: tr(lang, "Predajca sa nenašiel"), robots: { index: false } };
  const { s, res } = d;
  const title = `${s.name} – ${pl ? "używane części samochodowe" : "použité autodiely"}${s.city ? ", " + s.city : ""}`;
  const description = pl ? `${s.name}${s.city ? " (" + s.city + ", Słowacja)" : ""}: ${pieces(res.total, "pl")} na autosuciastky.eu${s.ratingCount ? `, ocena ${s.ratingAvg?.toLocaleString("pl-PL")} z 5 (${s.ratingCount})` : ""}. Zadzwoń do sprzedawcy bez rejestracji.` : `${s.name}${s.city ? " (" + s.city + ")" : ""}: ${pieces(res.total)} na autosuciastky.eu${s.ratingCount ? `, hodnotenie ${s.ratingAvg?.toLocaleString("sk-SK")} z 5 (${s.ratingCount})` : ""}. Predajcovi zavoláte bez registrácie.`;
  const path = lhref(lang, sellerPath(s.id, s.name));
  return { title, description, alternates: { canonical: path, languages: altLangs(sellerPath(s.id, s.name)) }, robots: res.total ? undefined : { index: false, follow: true },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: path, siteName: SITE_NAME, locale: pl ? "pl_PL" : "sk_SK", type: "website" } };
}

export default async function Page({ params }: P) {
  const { slug, lang: lp } = await params;
  const lang = langOf("/" + lp), pl = lang === "pl";
  const t = (x: string) => tr(lang, x);
  const d = await load(slug);
  if (!d) notFound();
  const { s, cat, res, reviews } = d;
  const path = lhref(lang, sellerPath(s.id, s.name));
  const loc = pl ? "pl-PL" : "sk-SK";
  const since = new Date(s.since).toLocaleDateString(loc, { month: "long", year: "numeric" });
  const crumbs = [{ name: t("Úvod"), href: lhref(lang, "/") }];
  // Mapa: mesto z profilu, inak najčastejšie mesto v jeho inzerátoch
  const cityCount = new Map<string, number>(); for (const it of res.items) if (it.city) cityCount.set(it.city, (cityCount.get(it.city) || 0) + 1);
  const mapCity = s.city || [...cityCount].sort((x, y) => y[1] - x[1])[0]?.[0] || "";
  return (
    <main id="main" className="main landing seller-page">
      <JsonLd data={[breadcrumbLd([...crumbs, { name: s.name, href: path }]),
        { "@context": "https://schema.org", "@type": s.type === "Firma" ? "AutoPartsStore" : "Person", name: s.name, url: SITE_URL + path,
          ...(s.address ? { address: { "@type": "PostalAddress", streetAddress: s.address, addressCountry: "SK" }, ...(s.ico ? { taxID: s.ico } : {}) }
            : s.city ? { address: { "@type": "PostalAddress", addressLocality: s.city, addressCountry: "SK" } } : {}) }]} />
      <Crumbs items={crumbs} last={s.name} />
      <div className="seller-head">
        <h1>{s.name}</h1>
        <p className="seller-meta">
          <span>{t(sellerKind(s.type))}</span>{s.city && <span>{s.city}</span>}{s.verified && <span className="ok">✓ {pl ? "Zweryfikowany sprzedawca" : "Overený predajca"}</span>}<span>{pl ? "Na autosuciastky.eu od" : "Na autosuciastky.eu od"} {since}</span>
        </p>
        {s.ratingCount > 0 ? <p><Stars value={s.ratingAvg} count={s.ratingCount} /> <a href="#hodnotenia" className="lnk">{pl ? "Oceny kupujących" : "Hodnotenia kupujúcich"}</a></p>
          : <p className="mute">{pl ? "Na razie bez ocen." : "Zatiaľ bez hodnotení."}</p>}
        {mapCity && <CityMap city={mapCity} note={pl ? (s.city ? "miasto z profilu sprzedawcy, nie dokładny adres" : "miasto z ogłoszeń sprzedawcy, nie dokładny adres") : s.city ? "mesto z profilu predajcu, nie presná adresa" : "mesto z inzerátov predajcu, nie presná adresa"} />}
        <SellerNotice type={s.type} name={s.name} ico={s.ico} address={s.address} />
        <Disclaimer kind="short" />
      </div>
      <SellerStock seller={s.id} cat={pickCatalog(cat, res.items)} initial={{ items: res.items, total: res.total, cats: [...res.cats] }} />
      <section id="hodnotenia" className="reviews">
        <h2>{pl ? "Oceny kupujących" : "Hodnotenia kupujúcich"}</h2>
        {pl ? <p className="mute small review-note"><b>Jak weryfikujemy oceny:</b> ocenić może tylko kupujący, któremu sprzedawca wysłał ofertę na jego zapytanie o część (jedno zapytanie – jedna ocena). Nie sprawdzamy jednak, czy kupujący rzeczywiście kupił lub użył część – portal nie pośredniczy w zakupie. Ocen nie kontrolujemy z góry, nie płaci się za nie i nie wpływają na kolejność; niewłaściwe możesz zgłosić <Link href="/pl/ochrana-osobnych-udajov#kontakt">operatorowi</Link>.</p> : <p className="mute small review-note"><b>Ako overujeme hodnotenia:</b> hodnotiť môže len kupujúci, ktorému predajca poslal ponuku na jeho dopyt na diel (za jeden dopyt jedno hodnotenie). Neoverujeme však, či kupujúci diel naozaj kúpil alebo použil – portál kúpu nesprostredkúva. Hodnotenia nekontrolujeme vopred, neplatí sa za ne a poradie neovplyvňujú; nevhodné môžete nahlásiť na <Link href="/ochrana-osobnych-udajov#kontakt">kontakte prevádzkovateľa</Link>.</p>}
        {reviews.length ? <ul>{reviews.map((r) => (
          <li key={r.id}><Stars value={r.stars} small /> <b>{r.author}</b> <span className="mute">{new Date(r.createdAt).toLocaleDateString(loc)}</span>{r.body && <p>{r.body}</p>}</li>
        ))}</ul> : <p>{pl ? "Na razie brak ocen." : "Zatiaľ žiadne hodnotenia."}</p>}
      </section>
    </main>
  );
}
