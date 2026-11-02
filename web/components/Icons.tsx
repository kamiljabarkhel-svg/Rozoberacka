// Ikony z prototypu (SVG sprite). <IconSprite/> je raz v layoute, <Icon id="i-motor"/> ich používa.
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <symbol id="i-motor" viewBox="0 0 24 24"><path d="M3 10h3V8h3V6h6v2h2v2h3v6h-3v2H8l-2-2H3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></symbol>
        <symbol id="i-kar" viewBox="0 0 24 24"><path d="M3 15l2-6c.3-.9 1-1.5 2-1.5h10c1 0 1.7.6 2 1.5l2 6v3H3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="7.5" cy="15.5" r="1.2" fill="currentColor" /><circle cx="16.5" cy="15.5" r="1.2" fill="currentColor" /></symbol>
        <symbol id="i-sv" viewBox="0 0 24 24"><path d="M10 5a7 7 0 000 14c4 0 9-2 9-7s-5-7-9-7z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M3 9h3M3 12h3M3 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></symbol>
        <symbol id="i-el" viewBox="0 0 24 24"><path d="M13 3L5 14h6l-1 7 8-11h-6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></symbol>
        <symbol id="i-pr" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></symbol>
        <symbol id="i-int" viewBox="0 0 24 24"><path d="M8 4h5l1 8h4l1 4H8z M8 20h11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></symbol>
        <symbol id="i-q" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" /><path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></symbol>
      </defs>
    </svg>
  );
}

const CAT_ICON: Record<string, string> = { motor: "i-motor", kar: "i-kar", sv: "i-sv", el: "i-el", pr: "i-pr", int: "i-int" };
export const catIcon = (cat: string) => CAT_ICON[cat] || "i-pr";

export function Icon({ id }: { id: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><use href={"#" + id} /></svg>;
}
