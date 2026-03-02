import { describe, expect, it } from "vitest";
import {
  getServerSyncedNowMs,
  resolveServerClockOffsetMs,
} from "./serverClock.js";

describe("server clock synchronization", () => {
  it("derives client offset from server and local receive times", () => {
    const serverNowMs = 1_000_000;
    const clientReceivedAtMs = 1_008_250;

    expect(
      resolveServerClockOffsetMs(serverNowMs, clientReceivedAtMs),
    ).toBe(-8_250);
  });

  it("keeps countdown displays aligned across skewed client clocks", () => {
    const serverSnapshotMs = 2_000_000;
    const timerDeadlineMs = serverSnapshotMs + 60_000;

    const clientAReceivedAtMs = 2_012_300; // 12.3s fast local clock
    const clientBReceivedAtMs = 1_992_100; // 7.9s slow local clock
    const offsetA = resolveServerClockOffsetMs(serverSnapshotMs, clientAReceivedAtMs);
    const offsetB = resolveServerClockOffsetMs(serverSnapshotMs, clientBReceivedAtMs);

    const clientANowMs = 2_046_850;
    const clientBNowMs = 2_026_600;
    const syncedNowA = getServerSyncedNowMs(offsetA, clientANowMs);
    const syncedNowB = getServerSyncedNowMs(offsetB, clientBNowMs);

    const remainingSecondsA = Math.floor(
      Math.max(0, timerDeadlineMs - syncedNowA) / 1000,
    );
    const remainingSecondsB = Math.floor(
      Math.max(0, timerDeadlineMs - syncedNowB) / 1000,
    );

    expect(Math.abs(remainingSecondsA - remainingSecondsB)).toBeLessThanOrEqual(1);
  });
});
