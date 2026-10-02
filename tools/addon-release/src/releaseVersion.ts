const SEMANTIC_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/;

/** Turns a git tag such as "v1.2.0" (or a bare "1.2.0") into the version written in the addon. */
export function releaseVersion(input: string): string {
  const version = input.startsWith("v") ? input.slice(1) : input;
  if (!SEMANTIC_VERSION.test(version)) {
    throw new Error(`"${input}" is not a release version such as v1.2.0`);
  }
  return version;
}
