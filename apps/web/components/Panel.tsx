import type { ReactNode } from "react";

/** A panel of a screen with its title (§2.6); an officers' panel has the gold border and title. */
export function Panel({
  title,
  label = typeof title === "string" ? title : undefined,
  officer = false,
  note,
  className = "",
  children,
}: {
  title: ReactNode;
  /** The panel's name for assistive technologies, its title by default. */
  label?: string;
  officer?: boolean;
  /** A short note on the right of the title ("gain net · Saison 2"). */
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${officer ? "panel-officer" : "panel"} ${className}`} aria-label={label}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={`font-pixel text-xl ${officer ? "text-gold" : "text-ivory"}`}>{title}</h2>
        {note !== undefined && <span className="text-[11px] font-bold text-muted">{note}</span>}
      </div>
      {children}
    </section>
  );
}
