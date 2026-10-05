import { fullName, type Character } from "@vxv/server";
import { CharacterPicker } from "@/components/CharacterPicker";
import { MyCharacters } from "@/components/MyCharacters";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";

function toSearchable(character: Character) {
  return { id: character.id, name: fullName(character), characterClass: character.characterClass };
}

export default async function CharactersPage() {
  const member = await requireMember();
  const { characters } = getApplication();
  const [mine, available] = await Promise.all([characters.listMine(member), characters.listAvailable()]);
  return (
    <>
      <h1 className="text-2xl font-bold">Mes personnages</h1>
      <p className="mt-2 text-zinc-400">Votre main et vos rerolls, choisis parmi les personnages de la guilde.</p>
      <MyCharacters
        characters={mine.map((character) => ({
          ...toSearchable(character),
          isMain: character.isMain,
          inGuild: character.inGuild,
        }))}
      />
      <h2 className="mt-10 text-lg font-semibold">Ajouter un personnage</h2>
      <CharacterPicker characters={available.map(toSearchable)} />
    </>
  );
}
