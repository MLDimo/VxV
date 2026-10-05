/** Values that can be written as a Lua 5.1 literal. */
export type LuaValue = string | number | boolean | readonly LuaValue[] | { readonly [key: string]: LuaValue };

const INDENT = "    ";
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KEYWORDS = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);

function isList(value: LuaValue): value is readonly LuaValue[] {
  return Array.isArray(value);
}

const FIRST_PRINTABLE_CODE = 0x20;
const DELETE_CODE = 0x7f;

function escapeChar(char: string): string {
  if (char === "\\" || char === '"') {
    return `\\${char}`;
  }
  const code = char.charCodeAt(0);
  const isControl = code < FIRST_PRINTABLE_CODE || code === DELETE_CODE;
  // Three-digit decimal escape: a shorter one could swallow a following digit.
  return isControl ? `\\${code.toString().padStart(3, "0")}` : char;
}

/** Lua 5.1 string literal; non-ASCII characters stay as UTF-8, as the game expects. */
function luaString(text: string): string {
  return `"${[...text].map(escapeChar).join("")}"`;
}

function luaKey(key: string): string {
  return IDENTIFIER.test(key) && !KEYWORDS.has(key) ? key : `[${luaString(key)}]`;
}

/** Writes a value as a readable Lua literal; objects keep their key order, so the output is deterministic. */
export function toLuaLiteral(value: LuaValue, depth = 0): string {
  if (typeof value === "string") {
    return luaString(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`cannot write ${value} as a Lua number`);
    }
    return String(value);
  }
  if (typeof value === "boolean") {
    return String(value);
  }
  const entries = isList(value)
    ? value.map((item) => toLuaLiteral(item, depth + 1))
    : Object.entries(value).map(([key, item]) => `${luaKey(key)} = ${toLuaLiteral(item, depth + 1)}`);
  if (entries.length === 0) {
    return "{}";
  }
  const indent = INDENT.repeat(depth + 1);
  return `{\n${entries.map((entry) => `${indent}${entry},`).join("\n")}\n${INDENT.repeat(depth)}}`;
}
