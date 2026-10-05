import { copyFile, cp, mkdir, rm, writeFile } from "node:fs/promises";
import { FONTS, fontFile, renderPlainCss } from "@vxv/design";
import { build } from "esbuild";

/**
 * Builds the companion into dist/: the main process and the preload script (Node, CommonJS), the window's script
 * (browser), its page and styles, the charter's fonts and the images. electron-builder packages dist/ as is.
 */
const root = new URL("./", import.meta.url);
const dist = new URL("dist/", root);
const renderer = new URL("renderer/", dist);
const fonts = new URL("fonts/", renderer);

await rm(dist, { recursive: true, force: true });
await build({
  entryPoints: { main: "src/main/main.ts", preload: "src/main/preload.ts" },
  absWorkingDir: root.pathname,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  sourcemap: true,
});
await build({
  entryPoints: { renderer: "src/renderer/renderer.ts" },
  absWorkingDir: root.pathname,
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "chrome130",
  outdir: "dist/renderer",
  sourcemap: true,
});
await mkdir(fonts, { recursive: true });
for (const font of Object.values(FONTS)) {
  const files = new URL(`../../node_modules/@fontsource/${font.file}/`, root);
  await copyFile(new URL("LICENSE", files), new URL(`OFL-${font.file}.txt`, fonts));
  for (const weight of font.weights) {
    await copyFile(new URL(`files/${fontFile(font.file, weight)}`, files), new URL(fontFile(font.file, weight), fonts));
  }
}
await writeFile(new URL("theme.css", renderer), renderPlainCss("fonts"), "utf8");
await copyFile(new URL("src/renderer/index.html", root), new URL("index.html", renderer));
await copyFile(new URL("src/renderer/styles.css", root), new URL("styles.css", renderer));
await cp(new URL("assets/", root), new URL("assets/", dist), { recursive: true });
console.log("apps/companion/dist");
