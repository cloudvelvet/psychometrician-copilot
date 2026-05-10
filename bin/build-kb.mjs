import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const kbRoot = join(root, "psychometrics_kb");
const outFile = join(root, "knowledge", "generated-kb.js");

const files = (await listMarkdownFiles(kbRoot))
  .filter((file) => !file.endsWith(`${sep}README.md`))
  .sort((a, b) => a.localeCompare(b));

const topics = [];
const ids = new Set();

for (const file of files) {
  const raw = await readFile(file, "utf8");
  const topic = parseTopic(raw, file);
  if (!topic) {
    continue;
  }
  if (ids.has(topic.id)) {
    throw new Error(`Duplicate KB topic id: ${topic.id}`);
  }
  ids.add(topic.id);
  topics.push(topic);
}

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, renderModule(topics), "utf8");
console.log(`Built ${topics.length} KB topics at ${relative(root, outFile)}`);

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }

  return files;
}

function parseTopic(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return null;
  }

  const frontmatter = parseFrontmatter(match[1]);
  const body = match[2];
  const relativePath = relative(root, file).replaceAll("\\", "/");
  const id = requiredString(frontmatter.id, `${relativePath}: id`);
  const title = requiredString(frontmatter.title, `${relativePath}: title`);
  const keywords = requiredArray(frontmatter.keywords, `${relativePath}: keywords`);
  const relatedAnalyses = arrayValue(frontmatter.relatedAnalyses);
  const summary = sectionText(body, "Summary");
  const checks = bulletSection(body, "Checks");
  const useWhen = bulletSection(body, "Use When");

  if (!summary) {
    throw new Error(`${relativePath}: missing ## Summary`);
  }
  if (checks.length === 0) {
    throw new Error(`${relativePath}: missing ## Checks bullets`);
  }

  return {
    id,
    title,
    source: {
      citation: frontmatter.sourceCitation ?? "Psychometrics KB",
      type: frontmatter.sourceType ?? "kb_note",
      note: frontmatter.sourceNote ?? "Curated structured knowledge note.",
      path: relativePath
    },
    relatedAnalyses,
    keywords,
    summary,
    checks,
    useWhen
  };
}

function parseFrontmatter(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const index = trimmed.indexOf(":");
    if (index < 0) {
      continue;
    }
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    result[key] = parseFrontmatterValue(rawValue);
  }
  return result;
}

function parseFrontmatterValue(value) {
  const unquoted = stripQuotes(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner.split(",").map((item) => stripQuotes(item.trim())).filter(Boolean);
  }
  return unquoted;
}

function sectionText(body, heading) {
  const content = sectionBody(body, heading);
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("- "))
    .join(" ")
    .trim();
}

function bulletSection(body, heading) {
  return sectionBody(body, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function sectionBody(body, heading) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) {
    return "";
  }

  const collected = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    collected.push(line);
  }

  return collected.join("\n").trim();
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function requiredArray(value, label) {
  const array = arrayValue(value);
  if (array.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  return array;
}

function arrayValue(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((entry) => entry.trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, "");
}

function renderModule(topics) {
  return [
    "// Generated by bin/build-kb.mjs from psychometrics_kb/**/*.md.",
    "// Edit the Markdown KB files, then run npm run kb:build.",
    `export const MARKDOWN_KB_TOPICS = ${JSON.stringify(topics, null, 2)};`,
    ""
  ].join("\n");
}
