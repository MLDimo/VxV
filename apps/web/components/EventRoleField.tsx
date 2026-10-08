import type { EventRoleChoice } from "@vxv/server";
import { Field, Options } from "./Field";

/** Who may sign up to the event: one of the guild's Discord roles, everybody first; the officer always chooses. */
export function EventRoleField({ roles }: { roles: readonly EventRoleChoice[] }) {
  return (
    <Field label="Qui peut s'inscrire (rôle Discord)">
      <select name="roleId" required defaultValue="" className="field">
        <option value="" disabled>
          Choisir un rôle
        </option>
        <Options options={roles.map((role) => [role.id, role.name] as const)} />
      </select>
    </Field>
  );
}
