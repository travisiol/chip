import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveCycles, deriveMetrics, reserveSeries, totalRoutedUsd } from "@/lib/reserve/cycles";
import type { ChipState } from "@/types/chip";
import type { Execution } from "@/types/cycle";

const HOUR = 3_600_000;
const chip: ChipState = { corePowerPercent: 84.2, currentInputUsd: 842.1, targetInputUsd: 1000, currentCycle: 4, status: "POWERING", lastUpdated: 0, cycleStartedAt: 10 * HOUR };
const executions: Execution[] = [
  { id: "c3", cycle: 3, at: 10 * HOUR, inputUsd: 1000, nvdaAmount: 5.5, executionPrice: 181.8, txHash: null, status: "confirmed" },
  { id: "c1", cycle: 1, at: 2 * HOUR, inputUsd: 1000, nvdaAmount: 6, executionPrice: 166.7, txHash: null, status: "confirmed" },
  { id: "c2", cycle: 2, at: 6 * HOUR, inputUsd: 1000, nvdaAmount: 5.8, executionPrice: 172.4, txHash: null, status: "confirmed" },
];

test("cycles are derived newest first with the active one on top, starts chained to the previous execution", () => {
  const cycles = deriveCycles(executions, chip);
  assert.deepEqual(
    cycles.map((c) => c.id),
    [4, 3, 2, 1],
  );
  assert.equal(cycles[0].status, "active");
  assert.equal(cycles[0].inputUsd, 842.1);
  assert.equal(cycles[1].startedAt, 6 * HOUR);
  assert.equal(cycles[1].completedAt, 10 * HOUR);
  assert.equal(cycles[3].startedAt, null);
});

test("metrics: active duration, mean of completed cycles with a known start, last execution", () => {
  const m = deriveMetrics(deriveCycles(executions, chip), 12 * HOUR);
  assert.equal(m.activeCycleMs, 2 * HOUR);
  assert.equal(m.avgCycleMs, 4 * HOUR);
  assert.equal(m.sampleSize, 2);
  assert.equal(m.lastExecutionAt, 10 * HOUR);
});

test("the reserve series is cumulative and valued at the execution price when known", () => {
  const s = reserveSeries(executions, 200);
  assert.deepEqual(
    s.map((p) => p.cycle),
    [1, 2, 3],
  );
  assert.ok(Math.abs(s[2].nvda - 17.3) < 1e-9);
  assert.ok(Math.abs((s[2].usd as number) - 17.3 * 181.8) < 1e-6);
  const unknown = reserveSeries([{ ...executions[0], executionPrice: null }], null);
  assert.equal(unknown[0].usd, null);
});

test("total routed is only summed when the USD paid is known (LIVE leaves it null)", () => {
  assert.equal(totalRoutedUsd(executions, chip), 3000 + 842.1);
  assert.equal(
    totalRoutedUsd(
      executions.map((e) => ({ ...e, inputUsd: null })),
      chip,
    ),
    null,
  );
  assert.equal(totalRoutedUsd([], chip), 842.1);
});
