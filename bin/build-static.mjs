import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "public");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await cp(join(root, "index.html"), join(outDir, "index.html"));
await cp(join(root, "web"), join(outDir, "web"), { recursive: true });
await cp(join(root, "scales"), join(outDir, "scales"), { recursive: true });
await cp(join(root, "src"), join(outDir, "src"), { recursive: true });
await writeFile(join(outDir, ".nojekyll"), "");

console.log(`Static web app built at ${outDir}`);
