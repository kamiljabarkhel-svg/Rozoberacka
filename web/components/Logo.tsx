// Logo autosuciastky.eu: korálový náboj kolesa s piatimi otvormi na skrutky v čiernom štvorci.
// Vlastný jednoduchý tvar – nie je odvodený od žiadnej značky.
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const holes = [0, 1, 2, 3, 4].map((i) => { const a = (-90 + i * 72) * (Math.PI / 180); return [16 + 6.6 * Math.cos(a), 16 + 6.6 * Math.sin(a)]; });
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="6" fill="#14161a" />
      <circle cx="16" cy="16" r="11.5" fill="#ff4b3e" />
      <circle cx="16" cy="16" r="3.4" fill="#14161a" />
      {holes.map(([x, y], i) => <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.7" fill="#14161a" />)}
    </svg>
  );
}

export function Wordmark() {
  return <span className="wm">autosuciastky<span className="wm-eu">.eu</span></span>;
}
