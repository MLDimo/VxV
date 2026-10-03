// Usage: node run.js <addon folder>. Exits non-zero on any syntax, convention or runtime error.
const fs = require("fs");
const path = require("path");
const luaparse = require("luaparse");
const { loadProbe, readTocFiles } = require("./loadProbe");

// The conventions of .luacheckrc (line length, allowed globals), checked here since luacheck is not installed.
const luacheckrc = fs.readFileSync(path.join(__dirname, "../../.luacheckrc"), "utf8");
const maxLineLength = Number(/^max_line_length\s*=\s*(\d+)/m.exec(luacheckrc)[1]);
const allowedGlobals = new Set(
  [.../^globals\s*=\s*\{([^}]*)\}/m.exec(luacheckrc)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]),
);

const addonDir = path.resolve(process.argv[2]);
const tocFiles = readTocFiles(addonDir);
for (const file of tocFiles) {
  const code = fs.readFileSync(path.join(addonDir, file), "utf8");
  luaparse.parse(code, { luaVersion: "5.1" });
  if (file.startsWith("External/")) continue;
  code.split("\n").forEach((line, index) => {
    if ([...line].length > maxLineLength) {
      throw new Error(`${file}:${index + 1}: line longer than ${maxLineLength} characters`);
    }
  });
}
console.log(`syntax and line length OK (${tocFiles.length} files)`);

const probe = loadProbe(addonDir);
probe.runChunk(fs.readFileSync(path.join(__dirname, "scenario.lua"), "utf8"), "scenario");
console.log("scenario OK");

probe.runChunk("NEW_GLOBALS = NewGlobals()", "globals");
const leaked = probe
  .getGlobalString("NEW_GLOBALS")
  .split(" ")
  .filter((name) => name && !allowedGlobals.has(name));
if (leaked.length > 0) {
  throw new Error(`globals not allowed by .luacheckrc: ${leaked.join(", ")}`);
}
console.log("globals OK");
