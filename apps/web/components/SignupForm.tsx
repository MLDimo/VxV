"use client";

// Client component: only the pure domain module is imported, never the server package itself.
import { SIGNUP_ROLES, SIGNUP_STATUSES, type Signup } from "@vxv/server/domain/signups";
import { useActionState, useId, useState } from "react";
import { signUp } from "@/app/actions/signups";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { ROLE_LABELS, SPEC_SUGGESTIONS, STATUS_LABELS } from "./signupLabels";

export interface SignupCharacter {
  id: string;
  name: string;
  characterClass: string;
}

const FIELD = "field";

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
      <label className="block">
        <span className="text-sm text-lavender">Personnage</span>
        <select
          name="characterId"
          value={characterId}
          onChange={(event) => setCharacterId(event.target.value)}
          className={FIELD}
        >
          {characters.map((character) => (
            <option key={character.id} value={character.id}>
              {character.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Rôle</span>
        <select name="role" defaultValue={current?.role ?? "dps"} className={FIELD}>
          {SIGNUP_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role].label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Spécialisation</span>
        <input
          name="spec"
          list={specListId}
          defaultValue={current?.spec ?? ""}
          maxLength={maxSpecLength}
          required
          className={FIELD}
        />
        <datalist id={specListId}>
          {(SPEC_SUGGESTIONS[characterClass] ?? []).map((spec) => (
            <option key={spec} value={spec} />
          ))}
        </datalist>
      </label>
      <label className="block">
        <span className="text-sm text-lavender">Statut</span>
        <select name="status" defaultValue={current?.status ?? "present"} className={FIELD}>
          {SIGNUP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button type="submit" disabled={pending} className="button-pixel">
          {current ? "Mettre à jour mon inscription" : "M'inscrire"}
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
