import { readFile } from "node:fs/promises";

export async function loadScale(pathOrUrl) {
  const text = await readFile(pathOrUrl, "utf8");
  return JSON.parse(text);
}
