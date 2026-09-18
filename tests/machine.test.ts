import assert from "node:assert/strict";
import { test } from "node:test";
import { nextStatus, runExecutionSequence, SEQUENCE } from "@/lib/chip/machine";
import type { Execution } from "@/types/cycle";

test("status transitions follow the loop and ignore out-of-order events", () => {
  assert.equal(nextStatus("IDLE", "data_ready"), "POWERING");
  assert.equal(nextStatus("IDLE", "power_reached"), "IDLE");
  assert.equal(nextStatus("POWERING", "power_reached"), "FULL");
  assert.equal(nextStatus("POWERING", "execution_confirmed"), "POWERING");
  assert.equal(nextStatus("FULL", "execution_started"), "EXECUTING");
  assert.equal(nextStatus("FULL", "execution_confirmed"), "CONFIRMED");
  assert.equal(nextStatus("FULL", "power_dropped"), "POWERING");
  assert.equal(nextStatus("EXECUTING", "execution_failed"), "FULL");
  assert.equal(nextStatus("EXECUTING", "execution_confirmed"), "CONFIRMED");
  assert.equal(nextStatus("CONFIRMED", "reset_started"), "RESETTING");
  assert.equal(nextStatus("RESETTING", "reset_done"), "POWERING");
  assert.equal(nextStatus("FULL", "data_lost"), "IDLE");
});

test("the sequence plays FULL → EXECUTING → CONFIRMED → RESETTING → POWERING and starts the next cycle", async () => {
  const statuses: string[] = [];
  const activity: string[] = [];
  const executions: Execution[] = [];
  let chip = { corePowerPercent: 100, currentInputUsd: 1000, targetInputUsd: 1000, currentCycle: 28, status: "POWERING" as const, lastUpdated: 0, cycleStartedAt: null as number | null };
  const store = {
    chip,
    reserve: { reserveValueUsd: null, nvdaTokenBalance: 0, totalCycles: 0, totalRouted: null, lastExecution: null, lastUpdated: 0 },
    setStatus: (s: string) => statuses.push(s),
    flash: () => statuses.push("flash"),
    pushActivity: (a: { title: string; value: string }) => activity.push(`${a.title} ${a.value}`),
    addExecution: (e: Execution) => executions.push(e),
    setReserve: () => {},
    setChip: (patch: Partial<typeof chip>) => {
      chip = { ...chip, ...patch };
    },
  };
  const t0 = Date.now();
  await runExecutionSequence(store as never, { id: "x", cycle: 28, at: t0, inputUsd: 1000, nvdaAmount: 5.67, executionPrice: 176.4, txHash: null, status: "confirmed" });
  const took = Date.now() - t0;
  assert.deepEqual(statuses, ["FULL", "flash", "EXECUTING", "CONFIRMED", "RESETTING", "POWERING"]);
  assert.equal(chip.currentCycle, 29);
  assert.equal(chip.currentInputUsd, 0);
  assert.equal(executions.length, 1);
  assert.ok(activity.includes("CORE FULL 100%"));
  assert.ok(activity.includes("CYCLE #028 COMPLETE +$1,000 NVDA"));
  assert.ok(activity.includes("NEW CYCLE STARTED #029"));
  const expected = SEQUENCE.fullMs + SEQUENCE.executingMs + SEQUENCE.confirmedMs + SEQUENCE.resettingMs;
  assert.ok(took >= expected - 50 && took < expected + 800, `sequence took ${took}ms, expected ≈${expected}ms`);
});

test("skipExecuting (LIVE: the chain only shows the result) goes FULL → CONFIRMED", async () => {
  const statuses: string[] = [];
  let chip = { corePowerPercent: 100, currentInputUsd: 1000, targetInputUsd: 1000, currentCycle: 3, status: "FULL" as const, lastUpdated: 0, cycleStartedAt: null as number | null };
  const store = {
    chip,
    reserve: { reserveValueUsd: null, nvdaTokenBalance: 0, totalCycles: 0, totalRouted: null, lastExecution: null, lastUpdated: 0 },
    setStatus: (s: string) => statuses.push(s),
    flash: () => {},
    pushActivity: () => {},
    addExecution: () => {},
    setReserve: () => {},
    setChip: (patch: Partial<typeof chip>) => {
      chip = { ...chip, ...patch };
    },
  };
  await runExecutionSequence(store as never, { id: "y", cycle: 3, at: 1000, inputUsd: null, nvdaAmount: 0.5, executionPrice: null, txHash: "0xabc", status: "confirmed" }, { skipExecuting: true, nextCycleStartsAt: 1234 });
  assert.deepEqual(statuses, ["FULL", "CONFIRMED", "RESETTING", "POWERING"]);
  assert.equal(chip.cycleStartedAt, 1234);
  assert.equal(chip.currentCycle, 4);
});
