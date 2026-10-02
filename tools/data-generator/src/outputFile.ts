import { mkdir, writeFile } from "node:fs/promises";

/** A generated file, its path relative to the output directory. */
export interface OutputFile {
  path: string;
  content: string;
}

export async function writeOutputFiles(directory: URL, files: readonly OutputFile[]): Promise<void> {
  for (const file of files) {
    const target = new URL(file.path, directory);
    await mkdir(new URL(".", target), { recursive: true });
    await writeFile(target, file.content, "utf8");
  }
}
