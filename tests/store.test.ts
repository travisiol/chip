import assert from "node:assert/strict";
import { test } from "node:test";
import { chipConfig } from "@/config/chip";
import { useChip } from "@/lib/store/chip";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("DEMO: a fee becomes a signal, and the input is credited only when it lands", async () => {
  const s = useChip.getState();
  s.resetData();
  s.setChip({ currentInputUsd: 100, targetInputUsd: 1000 });
  s.applyFee(12.81, { credit: true });
  let st = useChip.getState();
  assert.equal(st.fees.length, 1);
  assert.equal(st.fees[0].landed, false);
  assert.equal(st.pendingInputUsd, 12.81);
  assert.equal(st.chip.currentInputUsd, 100, "not credited while travelling");
  await wait(chipConfig.signalMs + 80);
  st = useChip.getState();
  assert.equal(st.fees[0].landed, true);
  assert.equal(st.pendingInputUsd, 0);
  assert.ok(Math.abs(st.chip.currentInputUsd - 112.81) < 1e-9, "credited on landing");
  assert.ok(Math.abs(st.chip.corePowerPercent - 11.281) < 1e-9);
  const input = st.activity.find((a) => a.title === "CORE INPUT");
  assert.equal(input?.value, "+$12.81");
  assert.equal(st.activity[0].title, "CORE POWER", "the checkpoint row follows the landing");
});

test("LIVE: a fee signal is visual only — the chain read is the truth", async () => {
  const s = useChip.getState();
  s.resetData();
  s.setChip({ currentInputUsd: 500, targetInputUsd: 1000 });
  s.applyFee(20, { txHash: "0xabc" });
  assert.equal(useChip.getState().pendingInputUsd, 0);
  await wait(chipConfig.signalMs + 80);
  const st = useChip.getState();
  assert.equal(st.chip.currentInputUsd, 500, "never credited by the signal");
  assert.equal(st.fees[0].landed, true);
  assert.equal(st.activity.find((a) => a.title === "CORE INPUT")?.txHash, "0xabc");
});

test("checkpoints only when the level moved, and a reset wipes everything", () => {
  const s = useChip.getState();
  s.resetData();
  s.setChip({ currentInputUsd: 500, targetInputUsd: 1000 });
  s.checkpoint();
  assert.equal(useChip.getState().activity[0].value, "0.0% → 50.0%");
  s.setChip({ currentInputUsd: 505 });
  s.checkpoint();
  assert.equal(useChip.getState().activity.length, 1, "half a percent is not a checkpoint");
  s.setChip({ currentInputUsd: 530 });
  s.checkpoint();
  assert.equal(useChip.getState().activity[0].value, "50.0% → 53.0%");
  s.resetData();
  assert.equal(useChip.getState().activity.length, 0);
  assert.equal(useChip.getState().chip.currentInputUsd, 0);
});
