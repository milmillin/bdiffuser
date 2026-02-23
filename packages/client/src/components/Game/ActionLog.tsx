import { useEffect, useRef } from "react";
import type { GameLogEntry, ClientPlayer, GameResult } from "@bomb-busters/shared";

export function ActionLog({
  log,
  players,
  result,
}: {
  log: GameLogEntry[];
  players: ClientPlayer[];
  result?: GameResult | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log.length, result]);

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
        {result && (
          <div className={`text-xs font-bold mt-1 pt-1 border-t border-gray-700 ${result === "win" ? "text-green-400" : "text-red-400"}`}>
            {result === "win" && "MISSION COMPLETE — all wires safely cut!"}
            {result === "loss_red_wire" && "BOOM — a red wire was cut!"}
            {result === "loss_detonator" && "BOOM — detonator reached the end!"}
            {result === "loss_timer" && "TIME'S UP — mission timer expired!"}
          </div>
        )}
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
