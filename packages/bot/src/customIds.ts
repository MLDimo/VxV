/** What follows the prefix of a button or form id (an event id), or undefined for another id. */
export function afterPrefix(customId: string, prefix: string): string | undefined {
  return customId.startsWith(prefix) ? customId.slice(prefix.length) : undefined;
}
