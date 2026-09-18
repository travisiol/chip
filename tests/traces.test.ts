import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTraceNetwork, cumulativeLengths, litFraction, pointAt } from "@/lib/chip/traces";

test("the network is deterministic and complete: 27 fee traces, a ring, 12 leads, 5 bus traces, 36 pins", () => {
  const a = buildTraceNetwork();
  const b = buildTraceNetwork();
  assert.deepEqual(
    a.traces.map((t) => t.points),
    b.traces.map((t) => t.points),
  );
  assert.equal(a.traces.filter((t) => t.kind === 0).length, 27);
  assert.equal(a.traces.filter((t) => t.kind === 1).length, 1);
  assert.equal(a.traces.filter((t) => t.kind === 2).length, 12);
  assert.equal(a.traces.filter((t) => t.kind === 3).length, 5);
  assert.equal(a.pins.length, 36);
  assert.equal(a.signalPaths.length, 27);
  assert.equal(a.executionPaths.length, 5);
});

test("every fee trace runs from the die edge to the ring bus with 45° or axis-aligned segments only", () => {
  const net = buildTraceNetwork();
  for (const t of net.traces.filter((x) => x.kind === 0)) {
    const first = t.points[0];
    const last = t.points[t.points.length - 1];
    assert.ok(Math.abs(Math.max(Math.abs(first.x), Math.abs(first.y)) - 1) < 1e-9, "starts on the die edge");
    assert.ok(Math.abs(Math.max(Math.abs(last.x), Math.abs(last.y)) - net.ring) < 1e-9, "ends on the ring");
    for (let i = 1; i < t.points.length; i++) {
      const dx = Math.abs(t.points[i].x - t.points[i - 1].x);
      const dy = Math.abs(t.points[i].y - t.points[i - 1].y);
      assert.ok(dx < 1e-9 || dy < 1e-9 || Math.abs(dx - dy) < 1e-9, `segment ${i} of trace ${t.id} is not axis-aligned or 45°`);
    }
  }
  // Every signal route ends inside the core.
  for (const p of net.signalPaths) {
    const end = p.points[p.points.length - 1];
    assert.ok(Math.max(Math.abs(end.x), Math.abs(end.y)) < net.core, "signal route ends inside the core");
  }
  // The execution bus runs from the core edge to the right edge.
  for (const t of net.traces.filter((x) => x.kind === 3)) {
    assert.ok(Math.abs(t.points[0].x - net.core) < 1e-9, "bus starts at the core's right edge");
    assert.ok(Math.abs(t.points[t.points.length - 1].x - 1) < 1e-9, "bus ends at the right edge");
  }
});

test("power lights the layers in order: outer traces, then the ring, then the leads; the bus never lights from power", () => {
  const net = buildTraceNetwork();
  const fee = net.traces.filter((t) => t.kind === 0);
  const ring = net.traces.find((t) => t.kind === 1)!;
  const lead = net.traces.find((t) => t.kind === 2)!;
  const bus = net.traces.find((t) => t.kind === 3)!;
  const litAt = (p: number) => fee.filter((t) => litFraction(t, p) > 0).length;
  assert.equal(litAt(0), 0);
  assert.ok(litAt(0.25) > 0 && litAt(0.25) < fee.length, "at 25 % some outer circuits are active");
  assert.ok(litAt(0.5) > litAt(0.25), "more traces at 50 %");
  assert.equal(litFraction(ring, 0.25), 0);
  assert.ok(litFraction(ring, 0.6) > 0 && litFraction(ring, 0.6) < 1, "the ring is mid-way at 60 %");
  assert.equal(litFraction(lead, 0.6), 0);
  assert.ok(litFraction(lead, 0.9) > 0, "the leads start pulsing toward the core at 90 %");
  assert.equal(litFraction(lead, 1), 1);
  assert.equal(litFraction(ring, 1), 1);
  assert.ok(
    fee.every((t) => litFraction(t, 1) === 1),
    "everything converges at 100 %",
  );
  assert.equal(litFraction(bus, 1), 0);
});

test("pointAt walks a polyline by arc length and reports the direction", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
  ];
  const cumulative = cumulativeLengths(points);
  assert.deepEqual(cumulative, [0, 2, 4]);
  const a = pointAt({ points, cumulative }, 0.25);
  assert.deepEqual([a.x, a.y, a.dx, a.dy], [1, 0, 1, 0]);
  const b = pointAt({ points, cumulative }, 0.75);
  assert.deepEqual([b.x, b.y, b.dx, b.dy], [2, 1, 0, 1]);
  const end = pointAt({ points, cumulative }, 1.5);
  assert.deepEqual([end.x, end.y], [2, 2]);
});

test("a low-density network (phones) keeps the same structure", () => {
  const net = buildTraceNetwork({ pinsPerSide: 6 });
  assert.equal(net.traces.filter((t) => t.kind === 0).length, 18);
  assert.equal(net.traces.filter((t) => t.kind === 3).length, 3);
  assert.equal(net.pins.length, 24);
});
