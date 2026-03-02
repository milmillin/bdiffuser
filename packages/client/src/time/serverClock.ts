export function resolveServerClockOffsetMs(
  serverNowMs: number,
  clientReceivedAtMs: number,
): number {
  if (!Number.isFinite(serverNowMs) || !Number.isFinite(clientReceivedAtMs)) {
    return 0;
  }
  return Math.round(serverNowMs - clientReceivedAtMs);
}

export function getServerSyncedNowMs(
  serverClockOffsetMs: number,
  clientNowMs = Date.now(),
): number {
  if (!Number.isFinite(clientNowMs)) {
    return Date.now();
  }
  if (!Number.isFinite(serverClockOffsetMs)) {
    return clientNowMs;
  }
  return clientNowMs + serverClockOffsetMs;
}
