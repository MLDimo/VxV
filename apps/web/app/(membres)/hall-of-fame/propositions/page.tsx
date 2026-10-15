import { EXPLOIT_CATEGORY_LABELS } from "@vxv/server/domain/legend";
import Link from "next/link";
import { CharacterName } from "@/components/CharacterName";
import { LegendChapterForm, LegendPublishForm, LegendRefuseForm } from "@/components/LegendOfficerForms";
import { legendDay } from "@/components/legendDates";
import { Panel } from "@/components/Panel";
import { getApplication } from "@/server/application";
import { guildMembers } from "@/server/guildMembers";
import { requireOfficer } from "@/server/session";

/** The officers' zone of the Hall of Fame: the chapters, and the proposals to hang or refuse. */
export default async function LegendProposalsPage() {
  const officer = await requireOfficer();
  const { legend } = getApplication();
  const proposals = await legend.proposals(officer);
  const chapters = await legend.chapters();
  const members = await guildMembers();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/hall-of-fame" className="text-sm">
        ← Retour au couloir
      </Link>
      <p className="mt-4 text-xs font-extrabold tracking-[0.18em] text-neon uppercase">Hall of Fame · officiers</p>
      <h1 className="font-pixel text-4xl font-bold text-ivory">Propositions</h1>
      <Panel officer title="Chapitres" className="mt-6">
        <p className="mt-2 text-sm text-lavender">
          {chapters.length === 0
            ? "Aucun chapitre : ouvre le premier pour accrocher les tableaux."
            : chapters.map((chapter) => chapter.title).join(" · ")}
        </p>
        <LegendChapterForm />
      </Panel>
      {proposals.length === 0 && <p className="mt-8 text-muted">Aucune proposition en attente.</p>}
      {proposals.map((view) => (
        <Panel key={view.exploit.id} officer title={view.exploit.title} className="mt-6">
          <p className="mt-1 text-sm text-lavender">
            {EXPLOIT_CATEGORY_LABELS[view.exploit.category]} · {legendDay(view.exploit.occurredOn)} · proposé par{" "}
            <CharacterName name={view.proposedBy.name} characterClass={view.proposedBy.characterClass ?? ""} /> ·{" "}
            {view.imageIds.length} capture(s) · <Link href={`/hall-of-fame/${view.exploit.id}`}>voir la fiche</Link>
          </p>
          <p className="mt-2 line-clamp-3 text-sm whitespace-pre-line text-lavender">{view.exploit.story}</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <LegendPublishForm exploitId={view.exploit.id} chapters={chapters} members={members} />
            <LegendRefuseForm exploitId={view.exploit.id} />
          </div>
        </Panel>
      ))}
    </div>
  );
}
