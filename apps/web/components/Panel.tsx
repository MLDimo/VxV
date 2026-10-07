import type { ReactNode } from "react";

/** A panel of a screen with its title (§2.6); an officers' panel has the gold border and title. */
export function Panel({
  title,
  label = typeof title === "string" ? title : undefined,
  officer = false,
  className = "",
  children,
}: {
  title: ReactNode;
  /** The panel's name for assistive technologies, its title by default. */
  label?: string;
  officer?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`${officer ? "panel-officer" : "panel"} ${className}`} aria-label={label}>
      <h2 className={`font-pixel text-xl ${officer ? "text-gold" : "text-ivory"}`}>{title}</h2>
      {children}
    </section>
  );
}
