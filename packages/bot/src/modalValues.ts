import { ComponentType, type APIModalSubmissionComponent } from "discord-api-types/v10";

/** The values the member sent, by field. */
export function submittedValues(components: readonly APIModalSubmissionComponent[]): Map<string, string> {
  const values = new Map<string, string>();
  for (const container of components) {
    const inner =
      container.type === ComponentType.Label
        ? [container.component]
        : container.type === ComponentType.ActionRow
          ? container.components
          : [];
    for (const field of inner) {
      if ("values" in field) {
        values.set(field.custom_id, field.values[0] ?? "");
      } else if ("value" in field && typeof field.value === "string") {
        values.set(field.custom_id, field.value);
      }
    }
  }
  return values;
}
