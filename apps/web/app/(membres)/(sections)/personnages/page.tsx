import { fullName, type Character } from "@vxv/server";
import { CharacterPicker } from "@/components/CharacterPicker";
import { MyCharacters } from "@/components/MyCharacters";
import { ScreenHeader } from "@/components/ScreenHeader";
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
      <ScreenHeader kicker="Mon compte" kickerClassName="text-lavender" title="Mes personnages" />
      <p className="mt-2 text-muted">Votre main et vos rerolls, choisis parmi les personnages de la guilde.</p>
      <MyCharacters
        characters={mine.map((character) => ({
          ...toSearchable(character),
          isMain: character.isMain,
          inGuild: character.inGuild,
        }))}
      />
      <h2 className="mt-10 font-pixel text-lg text-ivory">Ajouter un personnage</h2>
      <CharacterPicker characters={available.map(toSearchable)} />
    </>
  );
}
