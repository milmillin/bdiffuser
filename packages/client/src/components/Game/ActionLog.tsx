import { useEffect, useRef } from "react";
import { renderLogDetail } from "@bomb-busters/shared";
import type { GameLogEntry, ClientPlayer, GameResult } from "@bomb-busters/shared";

const UUID_PATTERN =
  /(^|[^A-Za-z0-9_-])[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=$|[^A-Za-z0-9_-])/i;

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

  const playerName = (id: string) => {
    const matchedPlayer = players.find((p) => p.id === id);
    if (matchedPlayer) return matchedPlayer.name;
    return UUID_PATTERN.test(id) ? "unknown" : id;
  };

  const sanitizeLogDetail = (detail: string) => {
    let sanitized = detail;
    for (const player of players) {
      const trimmedName = player.name.trim();
      const replacement = trimmedName.length > 0 ? trimmedName : "unknown";
      const escapedId = player.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const idPattern = new RegExp(`(^|[^A-Za-z0-9_-])${escapedId}(?=$|[^A-Za-z0-9_-])`, "g");
      sanitized = sanitized.replace(idPattern, (_match, boundary: string) => `${boundary}${replacement}`);
    }
    return sanitized.replace(new RegExp(UUID_PATTERN.source, "gi"), (_match, boundary: string) => `${boundary}unknown`);
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-none p-2 space-y-1 min-h-0"
      >
        {log.length === 0 && (
          <div className="text-xs text-gray-600 italic">No actions yet.</div>
        )}
        {log.map((entry, i) => (
          <div key={i} className="text-xs text-gray-300 leading-snug">
            <span className="text-gray-500 font-mono mr-1">T{entry.turn}</span>
            <span className="text-gray-400">{playerName(entry.playerId)}:</span>{" "}
            <FormattedDetail detail={sanitizeLogDetail(renderLogDetail(entry.detail, playerName))} />
          </div>
        ))}
        {result && (
          <div className={`text-xs font-bold mt-1 pt-1 border-t border-gray-700 ${result === "win" ? "text-green-400" : "text-red-400"}`}>
            {result === "win" && "MISSION COMPLETE — all wires safely cut!"}
            {result === "loss_red_wire" && "BOOM — a red wire was cut!"}
            {result === "loss_detonator" && "BOOM — detonator reached the end!"}
            {result === "loss_timer" && "TIME'S UP — mission timer expired!"}
            {result === "loss_surrender" && "MISSION ABORTED — team surrendered."}
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
