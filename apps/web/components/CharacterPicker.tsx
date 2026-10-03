"use client";

import { useActionState, useId, useState } from "react";
import { linkCharacter } from "@/app/actions/characters";
import { ActionMessages } from "./ActionMessages";
import { IDLE } from "./actionState";
import { CharacterName } from "./CharacterName";
import { searchCharacters, type SearchableCharacter } from "./characterSearch";

const MAX_SUGGESTIONS = 8;

/** Type a few letters of a guild character, pick it, then add it as main or reroll. */
export function CharacterPicker({ characters }: { characters: SearchableCharacter[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [state, action, pending] = useActionState(linkCharacter, IDLE);
  const listId = useId();
  // Once linked, the character leaves the available list: the selection then clears itself.
  const selected = characters.find((character) => character.id === selectedId);
  const suggestions = selected ? [] : searchCharacters(characters, query, MAX_SUGGESTIONS);

  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block">
        <span className="text-sm text-zinc-300">Nom du personnage</span>
        <input
          role="combobox"
          aria-controls={listId}
          aria-expanded={suggestions.length > 0}
          aria-autocomplete="list"
          autoComplete="off"
          value={selected?.name ?? query}
          onChange={(event) => {
            setSelectedId(undefined);
            setQuery(event.target.value);
          }}
          placeholder="Tapez quelques lettres"
          className="mt-1 block w-full rounded border border-zinc-700 bg-zinc-900 p-2"
        />
      </label>
      {suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="divide-y divide-zinc-800 rounded border border-zinc-700">
          {suggestions.map((character) => (
            <li key={character.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => setSelectedId(character.id)}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                <CharacterName name={character.name} characterClass={character.characterClass} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name="characterId" value={selected?.id ?? ""} />
      <div className="flex gap-3">
        <button
          type="submit"
          name="as"
          value="main"
          disabled={!selected || pending}
          className="rounded bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Ajouter comme main
        </button>
        <button
          type="submit"
          name="as"
          value="reroll"
          disabled={!selected || pending}
          className="rounded border border-zinc-600 px-4 py-2 font-semibold hover:bg-zinc-800 disabled:opacity-50"
        >
          Ajouter comme reroll
        </button>
      </div>
      <ActionMessages state={state} />
    </form>
  );
}
