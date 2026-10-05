import { SIGNUP_ROLES, type Signup, type SignupRole } from "@vxv/server";
import { isComing } from "@vxv/server/domain/signups";
import { CharacterName } from "./CharacterName";
import { ROLE_LABELS, STATUS_LABELS } from "./signupLabels";

/** Bars of the roles (§7.1): tanks green, healers gold, DPS amethyst. */
const ROLE_BARS: Record<SignupRole, string> = { tank: "bg-gain", healer: "bg-gold", dps: "bg-amethyst" };
const PERCENT = 100;

function SignupItem({ signup }: { signup: Signup }) {
  return (
    <li className={signup.status === "late" ? "opacity-55" : ""}>
      <CharacterName name={signup.characterName} characterClass={signup.characterClass} />{" "}
      <span className="text-xs text-muted">{signup.spec}</span>
      {/* Late players are dimmed: the status says so to screen readers too. */}
      <span className="sr-only"> · {STATUS_LABELS[signup.status]}</span>
    </li>
  );
}

/** The composition (§7.1): one block per role with the expected players, the late ones dimmed; then the others. */
export function EventSignups({ signups }: { signups: Signup[] }) {
  const coming = signups.filter((signup) => isComing(signup.status));
  const others = signups.filter((signup) => !isComing(signup.status));
  const count = (status: Signup["status"]) => signups.filter((signup) => signup.status === status).length;
  return (
    <section className="panel">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-pixel text-lg text-ivory">Composition</h2>
        <p className="text-sm text-muted">
          {count("present")} présents · {count("late")} en retard · {count("bench")} au banc
        </p>
      </div>
      {SIGNUP_ROLES.map((role) => {
        const players = coming.filter((signup) => signup.role === role);
        const share = coming.length === 0 ? 0 : Math.round((players.length / coming.length) * PERCENT);
        return (
          <div key={role} role="group" aria-label={ROLE_LABELS[role].label} className="mt-4 bg-night/60 p-3 ring-pixel">
            <div className="flex items-center justify-between font-pixel text-ivory">
              <span>
                {ROLE_LABELS[role].icon} {ROLE_LABELS[role].label}
              </span>
              <span>{players.length}</span>
            </div>
            <div className="mt-2 h-1 bg-line">
              <div className={`h-1 ${ROLE_BARS[role]}`} style={{ width: `${String(share)}%` }} />
            </div>
            {players.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {players.map((signup) => (
                  <SignupItem key={signup.characterId} signup={signup} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
      {others.length > 0 && (
        <>
          <h3 className="mt-6 font-pixel text-ivory">Peut-être, banc et absents</h3>
          <ul className="mt-2 space-y-1">
            {others.map((signup) => (
              <li key={signup.characterId}>
                <CharacterName name={signup.characterName} characterClass={signup.characterClass} />{" "}
                <span className="text-xs text-muted">
                  {signup.spec} · {STATUS_LABELS[signup.status]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {signups.length === 0 && <p className="mt-4 text-muted">Personne n&apos;est encore inscrit.</p>}
    </section>
  );
}
