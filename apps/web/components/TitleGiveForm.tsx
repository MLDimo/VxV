"use client";

import { OFFICER_TITLES } from "@vxv/server/domain/titles";
import { useActionState } from "react";
import { giveTitle } from "@/app/actions/ranking";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { Field, Options, ReasonField } from "./Field";

/** Officers give a title the game does not measure, for the week. */
export function TitleGiveForm({ members }: { members: readonly { memberId: string; name: string }[] }) {
  const [state, action, pending] = useActionState(giveTitle, IDLE);
  return (
    <form action={action} aria-label="Donner un titre de la semaine" className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Titre">
        <select name="titleId" required className="field">
          <Options options={OFFICER_TITLES.map((title) => [title.id, title.name] as const)} />
        </select>
      </Field>
      <Field label="Membre">
        <select name="memberId" required className="field">
          <Options options={members.map((member) => [member.memberId, member.name] as const)} />
        </select>
      </Field>
      <ReasonField placeholder="A reçu tous les soins du raid" className="sm:col-span-2" />
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="button-wood text-gold">
          Donner le titre
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
