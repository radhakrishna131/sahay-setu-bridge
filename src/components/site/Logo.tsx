import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground" aria-label="SAHAY-SETU home">
      <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden className="text-primary">
        <path d="M1 15 Q13 1 25 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M1 15 H25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M7 15 V9.5 M13 15 V6.5 M19 15 V9.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span className="text-[15px]">SAHAY<span className="text-primary">-</span>SETU</span>
    </Link>
  );
}
