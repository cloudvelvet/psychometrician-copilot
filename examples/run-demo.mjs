import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadScale, scoreAssessment } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const scale = await loadScale(join(here, "../scales/big-five-demo.json"));

const responses = {
  bf_o_1: 5,
  bf_o_2: 2,
  bf_c_1: 4,
  bf_c_2: 2,
  bf_e_1: 3,
  bf_e_2: 4,
  bf_a_1: 5,
  bf_a_2: 2,
  bf_n_1: 4,
  bf_n_2: 2,
  bf_attention_1: 3
};

const result = scoreAssessment(scale, responses);

console.log(JSON.stringify({
  scaleId: result.scaleId,
  subscales: Object.fromEntries(
    Object.entries(result.scoring.subscales).map(([id, value]) => [id, value.score])
  ),
  validity: result.validity,
  interpretationInput: result.interpretationInput
}, null, 2));
