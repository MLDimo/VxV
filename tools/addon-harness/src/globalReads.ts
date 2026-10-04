import luaparse from "luaparse";

interface Node {
  type?: string;
  [key: string]: unknown;
}

function children(node: Node): Node[] {
  return Object.values(node).flatMap((value) =>
    Array.isArray(value) ? (value as Node[]) : value !== null && typeof value === "object" ? [value as Node] : [],
  );
}

/**
 * Globals a Lua file refers to, read or written: names ("CreateFrame") and fields of namespaces
 * ("C_ChatInfo.SendAddonMessage"), but not the strings resolved at run time (Compat's candidates).
 */
export function globalReferences(code: string): Set<string> {
  const references = new Set<string>();
  const visit = (node: Node): void => {
    if (node.type === "Identifier" && node.isLocal === false) {
      references.add(String(node.name));
    }
    const base = node.base as Node | undefined;
    const field = node.identifier as Node | undefined;
    if (
      node.type === "MemberExpression" &&
      node.indexer === "." &&
      base?.type === "Identifier" &&
      base.isLocal === false
    ) {
      references.add(`${String(base.name)}.${String(field?.name)}`);
    }
    children(node).forEach(visit);
  };
  visit(luaparse.parse(code, { luaVersion: "5.1", scope: true }) as unknown as Node);
  return references;
}
