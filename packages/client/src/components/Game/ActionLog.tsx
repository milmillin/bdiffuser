import { useEffect, useRef } from "react";
import type { GameLogEntry, ClientPlayer } from "@bomb-busters/shared";

export function ActionLog({
  log,
  players,
}: {
  log: GameLogEntry[];
  players: ClientPlayer[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length]);

  const playerName = (id: string) =>
    players.find((p) => p.id === id)?.name ?? id;

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-bomb-surface)] rounded-xl border border-gray-700">
      <div className="px-3 py-2 border-b border-gray-700 text-xs font-bold text-gray-400 uppercase tracking-wide flex-shrink-0">
        Action Log
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0"
      >
        {log.length === 0 && (
          <div className="text-xs text-gray-600 italic">No actions yet.</div>
        )}
        {log.map((entry, i) => (
          <div key={i} className="text-xs text-gray-300 leading-snug">
            <span className="text-gray-500 font-mono mr-1">T{entry.turn}</span>
            <span className="text-gray-400">{playerName(entry.playerId)}:</span>{" "}
            <FormattedDetail detail={entry.detail} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FormattedDetail({ detail }: { detail: string }) {
  if (detail.endsWith(" ✗")) {
    return <>{detail.slice(0, -1)}<span className="text-red-400 font-bold">✗</span></>;
  }
  if (detail.endsWith(" ✓")) {
    return <>{detail.slice(0, -1)}<span className="text-green-400 font-bold">✓</span></>;
  }
  return <>{detail}</>;
}
