import luaparse, { type Chunk, type Expression } from "luaparse";

/** A value read from a Lua data file. Tables become objects keyed by text: list items are keyed "1", "2"… */
export type LuaData = string | number | boolean | { readonly [key: string]: LuaData };

/** The file holds something else than plain data: it is never run, only read. */
export class LuaDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LuaDataError";
  }
}

const CHUNK = 0x8000;

/** Each byte as one character, as luaparse reads strings in its "pseudo-latin1" mode. */
function bytesAsText(bytes: Uint8Array): string {
  let text = "";
  for (let start = 0; start < bytes.length; start += CHUNK) {
    text += String.fromCharCode(...bytes.subarray(start, start + CHUNK));
  }
  return text;
}

/** A Lua string, made of bytes, read as the UTF-8 the game writes. */
function utf8(byteText: string): string {
  return new TextDecoder().decode(Uint8Array.from(byteText, (char) => char.charCodeAt(0)));
}

function readValue(node: Expression): LuaData | undefined {
  switch (node.type) {
    case "StringLiteral":
      return utf8(node.value ?? "");
    case "NumericLiteral":
    case "BooleanLiteral":
      return node.value;
    case "NilLiteral":
      return undefined;
    case "UnaryExpression":
      if (node.operator === "-" && node.argument.type === "NumericLiteral") {
        return -node.argument.value;
      }
      break;
    case "TableConstructorExpression": {
      const table: Record<string, LuaData> = {};
      let position = 0;
      for (const field of node.fields) {
        const value = readValue(field.value);
        const key =
          field.type === "TableValue"
            ? String((position += 1))
            : field.type === "TableKeyString"
              ? field.key.name
              : readValue(field.key);
        if (typeof key !== "string" && typeof key !== "number") {
          throw new LuaDataError("A table key that is not a text nor a number.");
        }
        if (value !== undefined) {
          table[String(key)] = value;
        }
      }
      return table;
    }
  }
  throw new LuaDataError(`Not plain data: ${node.type}.`);
}

/**
 * The variables a Lua data file assigns, such as the SavedVariables the game writes ("VXV_SyncDB = { … }"). The
 * file is parsed, never run: anything but texts, numbers, booleans and tables is refused.
 */
export function readLuaData(bytes: Uint8Array): Record<string, LuaData> {
  let chunk: Chunk;
  try {
    chunk = luaparse.parse(bytesAsText(bytes), { luaVersion: "5.1", encodingMode: "pseudo-latin1", comments: false });
  } catch (error) {
    throw new LuaDataError(`Unreadable Lua: ${String(error)}`);
  }
  const variables: Record<string, LuaData> = {};
  for (const statement of chunk.body) {
    if (statement.type !== "AssignmentStatement") {
      throw new LuaDataError(`Not an assignment: ${statement.type}.`);
    }
    statement.variables.forEach((variable, index) => {
      const init = statement.init[index];
      if (variable.type !== "Identifier" || init === undefined) {
        throw new LuaDataError("Only global variables are read.");
      }
      const value = readValue(init);
      if (value !== undefined) {
        variables[variable.name] = value;
      }
    });
  }
  return variables;
}
