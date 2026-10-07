"use client";

// Client component: only the pure domain module is imported, never the server package itself.
import { SIGNUP_ROLES, SIGNUP_STATUSES, type Signup } from "@vxv/server/domain/signups";
import { useActionState, useId, useState } from "react";
import { signUp } from "@/app/actions/signups";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { ROLE_LABELS, SPEC_SUGGESTIONS, STATUS_LABELS } from "./signupLabels";
import { Field, Options } from "./Field";

interface SignupCharacter {
  id: string;
  name: string;
  characterClass: string;
}

export function SignupForm({
  eventId,
  characters,
  current,
  maxSpecLength,
}: {
  eventId: string;
  characters: SignupCharacter[];
  current: Pick<Signup, "characterId" | "role" | "spec" | "status"> | undefined;
  maxSpecLength: number;
}) {
  const [state, action, pending] = useActionState(signUp, IDLE);
  const [characterId, setCharacterId] = useState(current?.characterId ?? characters[0]?.id ?? "");
  const specListId = useId();
  const characterClass = characters.find((character) => character.id === characterId)?.characterClass ?? "";

  return (
    <form action={action} className="mt-4 grid gap-4">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Personnage">
        <select
          name="characterId"
          value={characterId}
          onChange={(event) => setCharacterId(event.target.value)}
          className="field"
        >
          <Options options={characters.map((character) => [character.id, character.name] as const)} />
        </select>
      </Field>
      <Field label="Rôle">
        <select name="role" defaultValue={current?.role ?? "dps"} className="field">
          <Options options={SIGNUP_ROLES.map((role) => [role, ROLE_LABELS[role].label] as const)} />
        </select>
      </Field>
      <Field label="Spécialisation">
        <input
          name="spec"
          list={specListId}
          defaultValue={current?.spec ?? ""}
          maxLength={maxSpecLength}
          required
          className="field"
        />
        <datalist id={specListId}>
          {(SPEC_SUGGESTIONS[characterClass] ?? []).map((spec) => (
            <option key={spec} value={spec} />
          ))}
        </datalist>
      </Field>
      <Field label="Statut">
        <select name="status" defaultValue={current?.status ?? "present"} className="field">
          <Options options={SIGNUP_STATUSES.map((status) => [status, STATUS_LABELS[status]] as const)} />
        </select>
      </Field>
      <div>
        <button type="submit" disabled={pending} className="button-pixel">
          {current ? "Mettre à jour mon inscription" : "M'inscrire"}
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
