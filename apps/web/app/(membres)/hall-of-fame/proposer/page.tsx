import { formatDateTime } from "@vxv/server/domain/labels";
import Link from "next/link";
import { LegendProposalForm } from "@/components/LegendProposalForm";
import { legendDay } from "@/components/legendDates";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

/** « Proposer un exploit »: the form, then the member's proposals waiting or refused. */
export default async function ProposeExploitPage() {
  const member = await requireMember();
  const { legend } = getApplication();
  const raidNights = (await legend.raidNights()).map((night) => ({
    id: night.id,
    label: `${night.title}, ${formatDateTime(night.startsAt)}`,
  }));
  const mine = await legend.myProposals(member);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/hall-of-fame" className="text-sm">
        ← Retour au couloir
      </Link>
      <p className="mt-4 text-xs font-extrabold tracking-[0.18em] text-neon uppercase">Hall of Fame</p>
      <h1 className="font-pixel text-4xl font-bold text-ivory">Proposer un exploit</h1>
      <p className="mt-2 max-w-2xl text-lavender">
        Raconte la soirée : un officier la met au mur, dans son chapitre et avec sa rareté, ou te dit pourquoi pas.
      </p>
      <LegendProposalForm raidNights={raidNights} today={new Date().toISOString().slice(0, 10)} />
      {mine.length > 0 && (
        <section aria-label="Mes propositions" className="mt-10">
          <h2 className="font-pixel text-xl text-ivory">Mes propositions</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((view) => (
              <li key={view.exploit.id} className="panel">
                <Link href={`/hall-of-fame/${view.exploit.id}`} className="font-bold">
                  {view.exploit.title}
                </Link>{" "}
                <span className="text-sm text-muted">· {legendDay(view.exploit.occurredOn)}</span>
                <p className={`text-sm ${view.exploit.status === "refused" ? "text-loss" : "text-lavender"}`}>
                  {view.exploit.status === "refused"
                    ? `Refusée : ${view.exploit.refusal ?? ""}`
                    : "En attente d'un officier."}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
