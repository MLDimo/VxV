"use client";

import { useActionState } from "react";
import { changeCharacter } from "@/app/actions/characters";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { CharacterName } from "./CharacterName";
import type { SearchableCharacter } from "./characterSearch";

export interface OwnCharacter extends SearchableCharacter {
  isMain: boolean;
  inGuild: boolean;
}

export function MyCharacters({ characters }: { characters: OwnCharacter[] }) {
  const [state, action, pending] = useActionState(changeCharacter, IDLE);
  if (characters.length === 0) {
    return <p className="mt-4 text-zinc-500">Aucun personnage lié pour l&apos;instant.</p>;
  }
  return (
    <>
      <ul className="mt-4 divide-y divide-zinc-800 rounded border border-zinc-800">
        {characters.map((character) => (
          <li key={character.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <CharacterName name={character.name} characterClass={character.characterClass} />
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
              {character.isMain ? "Main" : "Reroll"}
            </span>
            {!character.inGuild && <span className="text-xs text-amber-400">a quitté la guilde</span>}
            <form action={action} className="ml-auto flex gap-3">
              <input type="hidden" name="characterId" value={character.id} />
              {!character.isMain && (
                <button
                  type="submit"
                  name="intent"
                  value="main"
                  disabled={pending}
                  className="text-sm text-indigo-300 hover:text-indigo-200"
                  aria-label={`Définir ${character.name} comme main`}
                >
                  Définir comme main
                </button>
              )}
              <button
                type="submit"
                name="intent"
                value="unlink"
                disabled={pending}
                className="text-sm text-zinc-400 hover:text-red-300"
                aria-label={`Retirer ${character.name}`}
              >
                Retirer
              </button>
            </form>
          </li>
        ))}
      </ul>
      <ActionMessages state={state} />
    </>
  );
}
