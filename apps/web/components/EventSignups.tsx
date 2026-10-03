import { composition, SIGNUP_ROLES, type Signup } from "@vxv/server";
import { CharacterName } from "./CharacterName";
import { classLabel } from "@vxv/server/domain/characterClasses";
import { ROLE_LABELS, STATUS_LABELS } from "./signupLabels";

/** Expected players by role and class, then every sign-up grouped by role. */
export function EventSignups({ signups }: { signups: Signup[] }) {
  const { byRole, byClass, byStatus } = composition(signups);
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">Composition</h2>
      <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        {SIGNUP_ROLES.map((role) => (
          <span key={role}>
            {ROLE_LABELS[role].icon} {ROLE_LABELS[role].label} : {byRole[role]}
          </span>
        ))}
      </p>
      <p className="mt-1 text-sm text-zinc-400">
        {Object.entries(byClass)
          .map(([characterClass, total]) => `${classLabel(characterClass)} ${total}`)
          .join(" · ") || "Aucun joueur attendu pour l'instant."}
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        Peut-être : {byStatus.maybe} · Banc : {byStatus.bench} · Absents : {byStatus.absent}
      </p>

      <h2 className="mt-6 text-lg font-semibold">Inscrits ({signups.length})</h2>
      {signups.length === 0 ? (
        <p className="mt-2 text-zinc-500">Personne n&apos;est encore inscrit.</p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-800 rounded border border-zinc-800">
          {signups.map((signup) => (
            <li key={signup.characterId} className="flex flex-wrap items-center gap-3 px-4 py-2">
              <span aria-label={ROLE_LABELS[signup.role].label} title={ROLE_LABELS[signup.role].label}>
                {ROLE_LABELS[signup.role].icon}
              </span>
              <CharacterName name={signup.characterName} characterClass={signup.characterClass} />
              <span className="text-sm text-zinc-400">{signup.spec}</span>
              <span className="ml-auto text-sm text-zinc-300">{STATUS_LABELS[signup.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
