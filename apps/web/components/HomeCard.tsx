import type { ReactNode } from "react";

/** A card under the tavern (§5.1): kicker, big title, a few lines, the call to action. */
export function HomeCard({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="bg-[#1a1222] p-6 shadow-[0_0_0_2px_var(--color-ink),0_0_0_5px_var(--color-beam),0_0_0_7px_var(--color-ink)]">
      <p className="font-pixel text-[15px] text-sakura">{kicker}</p>
      <h2 className="mt-2 font-pixel text-[30px] leading-tight text-ivory">{title}</h2>
      <div className="mt-3 space-y-3 text-lavender">{children}</div>
    </section>
  );
}
