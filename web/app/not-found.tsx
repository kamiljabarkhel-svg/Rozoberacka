import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="soon">
      <h1>Stránka neexistuje</h1>
      <p className="mute">Odkaz je nesprávny alebo inzerát už nie je aktívny.</p>
      <Link className="back" href="/">← Na úvod</Link>
    </main>
  );
}
