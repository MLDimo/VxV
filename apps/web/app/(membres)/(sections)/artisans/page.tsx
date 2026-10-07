import type { ArtisanProfession } from "@vxv/server";
import { formatDateTime } from "@vxv/server/domain/labels";
import { CharacterName } from "@/components/CharacterName";
import { ScreenHeader } from "@/components/ScreenHeader";
import { getApplication } from "@/server/application";
import { requireMember } from "@/server/session";
import { Panel } from "@/components/Panel";

/** A crafter: the character in their class color, their level and when the game last told it. */
function Crafter({ entry }: { entry: ArtisanProfession }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3">
      <CharacterName name={entry.characterName} characterClass={entry.characterClass} />
      <span className="text-lavender">
        {entry.name} {entry.level}/{entry.maxLevel}
      </span>
      <span className="text-xs text-muted">mis à jour le {formatDateTime(entry.recipesReadAt ?? entry.readAt)}</span>
    </li>
  );
}

/** Artisans (P14.3): « qui peut fabriquer… ? », then the guild's professions. */
export default async function ArtisansPage({
  searchParams,
}: {
  searchParams: Promise<{ recherche?: string | string[] }>;
}) {
  await requireMember();
  const { recherche } = await searchParams;
  const search = typeof recherche === "string" ? recherche.trim() : "";
  const { artisans } = getApplication();
  const directory = await artisans.directory();
  const found = search === "" ? undefined : await artisans.search(search);
  const professions = [...new Set(directory.map((entry) => entry.name))];
  return (
    <>
      <ScreenHeader kicker="La forge" kickerClassName="text-ember" title="Artisans" />
      <p className="mt-4 max-w-3xl text-lavender">
        Les métiers de chaque personnage, relevés en jeu par l&apos;addon : le niveau à chaque connexion, les recettes à
        l&apos;ouverture de la fenêtre du métier. Le compagnon les envoie ici.
      </p>
      <form className="mt-6 flex max-w-xl gap-3" role="search">
        <label className="sr-only" htmlFor="recherche">
          Objet à fabriquer
        </label>
        <input
          id="recherche"
          name="recherche"
          defaultValue={search}
          placeholder="Qui peut fabriquer… ?"
          className="field flex-1"
        />
        <button type="submit" className="button-pixel">
          Chercher
        </button>
      </form>
      {found !== undefined && (
        <Panel title={<>Qui peut fabriquer « {search} » ?</>} label="Résultats" className="mt-6">
          {found.length === 0 && <p className="mt-3 text-muted">Aucune recette connue de la guilde ne correspond.</p>}
          <ul className="mt-3 space-y-4">
            {found.map(({ recipe, crafters }) => (
              <li key={recipe.id}>
                <h3 className="font-bold text-ivory">{recipe.name}</h3>
                {crafters.length === 0 ? (
                  <p className="text-sm text-muted">Plus personne ne la connaît.</p>
                ) : (
                  <ul className="mt-1 space-y-1 text-sm" aria-label={`Qui sait faire ${recipe.name}`}>
                    {crafters.map((entry) => (
                      <Crafter key={`${entry.characterId}-${String(entry.professionId)}`} entry={entry} />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Annuaire">
        {professions.length === 0 && (
          <p className="text-muted">
            Aucun métier relevé : ils arrivent quand les membres équipés du compagnon se connectent en jeu.
          </p>
        )}
        {professions.map((profession) => (
          <article key={profession} className="panel">
            <h2 className="font-pixel text-lg text-ember">{profession}</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {directory
                .filter((entry) => entry.name === profession)
                .map((entry) => (
                  <Crafter key={`${entry.characterId}-${String(entry.professionId)}`} entry={entry} />
                ))}
            </ul>
          </article>
        ))}
      </section>
    </>
  );
}
