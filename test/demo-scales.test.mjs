import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadScale, scoreAssessment } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const scalesDir = join(here, "../scales");

test("all demo scale JSON files validate and score neutral responses", async () => {
  const files = (await readdir(scalesDir)).filter((file) => file.endsWith(".json"));

  assert.deepEqual(files.sort(), [
    "affect-state-demo.json",
    "big-five-demo.json",
    "burnout-brief-demo.json",
    "job-fit-demo.json",
    "stress-brief-demo.json"
  ]);

  for (const file of files) {
    const scale = await loadScale(join(scalesDir, file));
    const responses = Object.fromEntries(scale.items.map((item) => [
      item.id,
      item.attentionCheck?.expected ?? (item.reverse ? 2 : 4)
    ]));

    const result = scoreAssessment(scale, responses);
    assert.equal(result.scaleId, scale.id);
    assert.equal(result.validity.flag, "usable");
    assert.equal(result.interpretationInput.nonDiagnostic, true);
    assert.equal(Object.keys(result.scoring.subscales).length, Object.keys(scale.subscales).length);
  }
});
