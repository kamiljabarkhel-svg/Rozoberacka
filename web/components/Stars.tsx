/** Hviezdičky hodnotenia (len zobrazenie). */
export default function Stars({ value, count, small }: { value: number | null; count?: number; small?: boolean }) {
  if (value == null) return null;
  const full = Math.round(value);
  return (
    <span className={"stars" + (small ? " sm" : "")} aria-label={`Hodnotenie ${value.toLocaleString("sk-SK")} z 5${count != null ? `, ${count} hodnotení` : ""}`}>
      <span aria-hidden>{"★".repeat(full)}<i>{"★".repeat(5 - full)}</i></span>
      <b>{value.toLocaleString("sk-SK", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</b>
      {count != null && <span className="mute">({count})</span>}
    </span>
  );
}
