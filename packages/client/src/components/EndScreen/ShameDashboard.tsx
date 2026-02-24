import { useMemo } from "react";
import type { ClientGameState, GameLogEntry } from "@bomb-busters/shared";

interface PlayerStats {
  id: string;
  name: string;
  explosions: number;
  failedCuts: number;
  detonatorAdvances: number;
  successfulCuts: number;
  totalActions: number;
}

const SHAME_TITLES: { test: (s: PlayerStats) => boolean; title: string }[] = [
  { test: (s) => s.explosions > 0, title: "The Saboteur" },
  { test: (s) => s.failedCuts >= 3, title: "Butter Fingers" },
  { test: (s) => s.detonatorAdvances >= 2, title: "Detonator's Best Friend" },
  { test: (s) => s.totalActions > 0 && s.failedCuts === 0 && s.explosions === 0, title: "Lucky Guesser" },
  { test: (s) => s.totalActions === 0, title: "AFK" },
  { test: () => true, title: "Could Be Worse" },
];

function getShameTitle(stats: PlayerStats): string {
  return SHAME_TITLES.find((t) => t.test(stats))!.title;
}

function getSuccessRate(stats: PlayerStats): number {
  const cuts = stats.successfulCuts + stats.failedCuts;
  if (cuts === 0) return 0;
  return stats.successfulCuts / cuts;
}

function analyzeLog(log: GameLogEntry[]): Map<string, Omit<PlayerStats, "id" | "name">> {
  const stats = new Map<string, Omit<PlayerStats, "id" | "name">>();

  const ensure = (pid: string) => {
    if (!stats.has(pid))
      stats.set(pid, { explosions: 0, failedCuts: 0, detonatorAdvances: 0, successfulCuts: 0, totalActions: 0 });
    return stats.get(pid)!;
  };

  for (const entry of log) {
    const s = ensure(entry.playerId);
    s.totalActions++;

    if (entry.detail.includes("BOOM!")) {
      s.explosions++;
    }
    if (entry.detail.includes("✗")) {
      s.failedCuts++;
    }
    if (entry.detail.includes("detonator triggered")) {
      s.detonatorAdvances++;
    }
    if (entry.detail.includes("✓")) {
      s.successfulCuts++;
      if (entry.detail.includes("detonator triggered")) {
        s.detonatorAdvances++;
      }
    }
  }

  return stats;
}

const RANK_COLORS = [
  "from-red-500/20 to-red-900/10 border-red-500/40",
  "from-orange-500/20 to-orange-900/10 border-orange-500/40",
  "from-yellow-500/20 to-yellow-900/10 border-yellow-500/40",
  "from-green-500/20 to-green-900/10 border-green-500/40",
];

const RANK_BADGE_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-green-500",
];

export function ShameDashboard({
  gameState,
  onBack,
}: {
  gameState: ClientGameState;
  onBack: () => void;
}) {
  const rankings = useMemo(() => {
    const logStats = analyzeLog(gameState.log);

    const playerStats: PlayerStats[] = gameState.players.map((p) => {
      const s = logStats.get(p.id) ?? {
        explosions: 0,
        failedCuts: 0,
        detonatorAdvances: 0,
        successfulCuts: 0,
        totalActions: 0,
      };
      return { id: p.id, name: p.name, ...s };
    });

    // Sort worst-to-best
    playerStats.sort((a, b) => {
      // 1. Explosions (descending)
      if (a.explosions !== b.explosions) return b.explosions - a.explosions;
      // 2. Failed cuts (descending)
      if (a.failedCuts !== b.failedCuts) return b.failedCuts - a.failedCuts;
      // 3. Success rate (ascending — lower = worse)
      return getSuccessRate(a) - getSuccessRate(b);
    });

    return playerStats;
  }, [gameState]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="text-6xl">🏆</div>

        <h1 className="text-3xl font-black text-red-400">
          Wall of Shame
        </h1>
        <p className="text-gray-400 text-sm">Ranked worst to best</p>

        <div className="space-y-3">
          {rankings.map((player, i) => {
            const colorIdx = Math.min(i, RANK_COLORS.length - 1);
            const rate = getSuccessRate(player);
            const title = getShameTitle(player);

            return (
              <div
                key={player.id}
                className={`bg-gradient-to-r ${RANK_COLORS[colorIdx]} border rounded-xl p-4 text-left flex gap-3 items-start`}
              >
                <div
                  className={`${RANK_BADGE_COLORS[colorIdx]} text-white font-black text-sm w-7 h-7 rounded-full flex items-center justify-center shrink-0`}
                >
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-white truncate">
                      {player.name}
                    </span>
                    <span className="text-xs text-gray-400 italic shrink-0">
                      {title}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                    {player.explosions > 0 && (
                      <span className="text-red-400">
                        💥 {player.explosions} explosion{player.explosions !== 1 ? "s" : ""}
                      </span>
                    )}
                    {player.failedCuts > 0 && (
                      <span className="text-orange-400">
                        ✗ {player.failedCuts} failed
                      </span>
                    )}
                    {player.detonatorAdvances > 0 && (
                      <span className="text-yellow-400">
                        ⚡ {player.detonatorAdvances} detonator
                      </span>
                    )}
                    <span className="text-green-400">
                      ✓ {player.successfulCuts} success
                    </span>
                    <span>
                      {player.totalActions} total · {Math.round(rate * 100)}% rate
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onBack}
          className="px-6 py-2 bg-[var(--color-bomb-surface)] hover:bg-[var(--color-bomb-dark)] rounded-xl font-bold text-sm transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}
