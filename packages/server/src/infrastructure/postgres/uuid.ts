const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from URLs and forms: a malformed one must mean "not found", not a database error. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
