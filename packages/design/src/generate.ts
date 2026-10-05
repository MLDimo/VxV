import { writeFile } from "node:fs/promises";
import { renderCss } from "./css.ts";

/** Writes the files generated from the tokens. */
await writeFile(new URL("tokens.css", import.meta.url), renderCss(), "utf8");
console.log("packages/design/src/tokens.css");
