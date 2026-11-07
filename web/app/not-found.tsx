import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="soon">
      <h1>Stránka neexistuje</h1>
      <p className="mute">Odkaz je nesprávny alebo inzerát už nie je aktívny. Diel môžete nájsť znova podľa auta alebo OEM čísla.</p>
      <div className="nf-l">
        <Link className="btn" href="/">Hľadať diely</Link>
        <Link className="btn2" href="/dopyt">Zadať dopyt na diel</Link>
      </div>
    </main>
  );
}
