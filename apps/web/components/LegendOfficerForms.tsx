"use client";

import { EXPLOIT_RARITIES, EXPLOIT_RARITY_LABELS, LEGEND_LIMITS } from "@vxv/server/domain/legend";
import { useActionState } from "react";
import { createLegendChapter, publishExploit, refuseExploit } from "@/app/actions/legend";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options, ReasonField } from "./Field";

/** An officer hangs a proposal: its chapter, its rarity, its MVP and loot, and the reason. */
export function LegendPublishForm({
  exploitId,
  chapters,
  members,
}: {
  exploitId: string;
  chapters: readonly { id: string; title: string }[];
  members: readonly { memberId: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(publishExploit, IDLE);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="exploitId" value={exploitId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Chapitre">
          <select name="chapterId" required className="field">
            <Options options={chapters.map((chapter) => [chapter.id, chapter.title] as const)} />
          </select>
        </Field>
        <Field label="Rareté">
          <select name="rarity" required className="field" defaultValue="rare">
            <Options options={EXPLOIT_RARITIES.map((rarity) => [rarity, EXPLOIT_RARITY_LABELS[rarity]] as const)} />
          </select>
        </Field>
        <Field label="MVP de la soirée (facultatif)">
          <select name="mvpId" className="field" defaultValue="">
            <option value="">Aucun</option>
            <Options options={members.map((member) => [member.memberId, member.name] as const)} />
          </select>
        </Field>
        <Field label="Pourquoi lui">
          <input name="mvpWhy" maxLength={LEGEND_LIMITS.mvpWhy} className="field" />
        </Field>
        <Field label="Butin notable (facultatif)" className="sm:col-span-2">
          <input name="loot" maxLength={LEGEND_LIMITS.loot} className="field" />
        </Field>
      </div>
      <ReasonField placeholder="Premier clear de la guilde" />
      <button type="submit" disabled={pending || chapters.length === 0} className="button-gold">
        Mettre au mur
      </button>
      <ActionMessages state={state} />
    </form>
  );
}

/** An officer refuses a proposal, the reason for its proposer and the journal. */
export function LegendRefuseForm({ exploitId }: { exploitId: string }) {
  const [state, action, pending] = useActionState(refuseExploit, IDLE);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="exploitId" value={exploitId} />
      <ReasonField label="Motif du refus" placeholder="Doublon du tableau de jeudi" />
      <button type="submit" disabled={pending} className="button-wood">
        Refuser
      </button>
      <ActionMessages state={state} />
    </form>
  );
}

/** An officer opens a chapter of the corridor. */
export function LegendChapterForm() {
  const [state, action, pending] = useActionState(createLegendChapter, IDLE);
  return (
    <form action={action} className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Titre du chapitre">
          <input
            name="title"
            required
            maxLength={LEGEND_LIMITS.chapterTitle}
            placeholder="Le Cœur du Magma"
            className="field"
          />
        </Field>
        <Field label="Période (facultative)">
          <input name="period" maxLength={LEGEND_LIMITS.chapterPeriod} placeholder="septembre 2026" className="field" />
        </Field>
      </div>
      <ReasonField placeholder="Nouvelle phase" />
      <button type="submit" disabled={pending} className="button-gold">
        Ouvrir le chapitre
      </button>
      <ActionMessages state={state} />
    </form>
  );
}
