import { describe, expect, it } from "vitest";
import {
  cloneFailureCounters,
  incrementFailureCounter,
  isFailureReason,
  normalizeFailureCounters,
  ZERO_FAILURE_COUNTERS,
} from "../failureCounters";

describe("failureCounters", () => {
  it("normalizes missing counters to zero", () => {
    expect(normalizeFailureCounters(undefined)).toEqual({
      loss_red_wire: 0,
      loss_detonator: 0,
      loss_timer: 0,
    });
  });

  it("preserves valid finite counters", () => {
    expect(
      normalizeFailureCounters({
        loss_red_wire: 3,
        loss_detonator: 1,
        loss_timer: 0,
      }),
    ).toEqual({
      loss_red_wire: 3,
      loss_detonator: 1,
      loss_timer: 0,
    });
  });

  it("clamps invalid counters to zero", () => {
    expect(
      normalizeFailureCounters({
        loss_red_wire: Number.NaN,
        loss_detonator: -3,
        loss_timer: "oops",
      }),
    ).toEqual({
      loss_red_wire: 0,
      loss_detonator: 0,
      loss_timer: 0,
    });
  });

  it("truncates fractional counters to integers", () => {
    expect(
      normalizeFailureCounters({
        loss_red_wire: 1.9,
        loss_detonator: 2.1,
        loss_timer: 3.8,
      }),
    ).toEqual({
      loss_red_wire: 1,
      loss_detonator: 2,
      loss_timer: 3,
    });
  });

  it("increments the requested failure reason", () => {
    const counters = cloneFailureCounters(ZERO_FAILURE_COUNTERS);
    incrementFailureCounter(counters, "loss_red_wire");
    incrementFailureCounter(counters, "loss_timer");
    expect(counters).toEqual({
      loss_red_wire: 1,
      loss_detonator: 0,
      loss_timer: 1,
    });
  });

  it("narrowing helper recognizes only failure results", () => {
    expect(isFailureReason("loss_red_wire")).toBe(true);
    expect(isFailureReason("loss_detonator")).toBe(true);
    expect(isFailureReason("loss_timer")).toBe(true);
    expect(isFailureReason("win")).toBe(false);
    expect(isFailureReason(null)).toBe(false);
  });
});
