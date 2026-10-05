/** Where to go after signing in: a path of this website only, never another site ("//…", "/\…" or a full URL). */
export function safeNextPath(value: string | null | undefined): string {
  return value && /^\/(?![/\\])/.test(value) ? value : "/";
}
