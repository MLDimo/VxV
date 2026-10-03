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

const FIELD = "mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2";

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
    <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <label className="block">
        <span className="text-sm text-zinc-300">Personnage</span>
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
        <span className="text-sm text-zinc-300">Rôle</span>
        <select name="role" defaultValue={current?.role ?? "dps"} className={FIELD}>
          {SIGNUP_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role].label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Spécialisation</span>
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
        <span className="text-sm text-zinc-300">Statut</span>
        <select name="status" defaultValue={current?.status ?? "present"} className={FIELD}>
          {SIGNUP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {current ? "Mettre à jour mon inscription" : "M'inscrire"}
        </button>
        <ActionMessages state={state} />
      </div>
    </form>
  );
}
