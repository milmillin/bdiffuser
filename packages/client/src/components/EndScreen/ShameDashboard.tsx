import { useMemo } from "react";
import { renderLogDetail } from "@bomb-busters/shared";
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

const SHAME_TITLES: { test: (s: PlayerStats) => boolean; title: string; roasts: string[] }[] = [
  {
    test: (s) => s.explosions > 0,
    title: "THE SABOTEUR",
    roasts: [
      "Single-handedly murdered everyone. Impressive.",
      "They didn't defuse the bomb. They WERE the bomb.",
      "Congratulations, you played yourself. And everyone else.",
      "Task failed successfully... at killing the whole team.",
      "Born to cut wires. Forced to cut the wrong one.",
      "Some people just want to watch the world burn.",
    ],
  },
  {
    test: (s) => s.failedCuts >= 3,
    title: "BUTTER FINGERS",
    roasts: [
      "Couldn't cut a wire if their life depended on it. It did.",
      "Has the precision of a blindfolded toddler with scissors.",
      "Three strikes and everyone's out. Permanently.",
      "Wire cutting accuracy: thoughts and prayers.",
      "Their hands were shaking. Their team was crying.",
      "Statistically, a coin flip would've been better.",
    ],
  },
  {
    test: (s) => s.detonatorAdvances >= 2,
    title: "DETONATOR'S BEST FRIEND",
    roasts: [
      "Kept feeding the thing that kills everyone. Bold strategy.",
      "The detonator sends its thanks and regards.",
      "Speedrunning the team's death, one tick at a time.",
      "If the detonator had a fan club, they'd be president.",
      "Tick. Tick. Tick. That's the sound of their contributions.",
      "They didn't just let the detonator win — they cheered it on.",
    ],
  },
  {
    test: (s) => s.totalActions > 0 && s.failedCuts === 0 && s.explosions === 0,
    title: "LUCKY GUESSER",
    roasts: [
      "Got carried. Hard.",
      "Clean record, zero credit. The team did the work.",
      "Peaked in luck, not in skill.",
      "Even a broken clock cuts the right wire twice.",
      "Survived on vibes alone.",
      "Their strategy was 'hope' and somehow it worked.",
    ],
  },
  {
    test: (s) => s.totalActions === 0,
    title: "AFK LEGEND",
    roasts: [
      "Contributed nothing. Somehow still not the worst.",
      "Was technically 'in the game.' Technically.",
      "Their best move was not making one.",
      "Went to get snacks. Never came back.",
      "Present in body, absent in spirit and usefulness.",
      "The team had a passenger. First class, no luggage.",
    ],
  },
  {
    test: () => true,
    title: "COULD BE WORSE",
    roasts: [
      "Mediocrity is its own punishment.",
      "Not the worst, not the best. Just... there.",
      "The human equivalent of a participation trophy.",
      "Did enough to not be last. What a legacy.",
      "Average performance. Below average entertainment.",
      "They showed up. That's... something, I guess.",
    ],
  },
];

const MVP_TITLES: { test: (s: PlayerStats) => boolean; title: string; cheers: string[] }[] = [
  {
    test: (s) => s.successfulCuts >= 5 && s.failedCuts === 0,
    title: "THE SURGEON",
    cheers: [
      "Flawless precision. Not a single wrong cut.",
      "Steady hands, nerves of steel, zero mistakes.",
      "They could defuse a bomb blindfolded.",
      "Wire whisperer. Every cut was perfect.",
      "Surgical precision under pressure. Legendary.",
      "The bomb never stood a chance.",
    ],
  },
  {
    test: (s) => s.successfulCuts >= 3,
    title: "WIRE WIZARD",
    cheers: [
      "Cut after cut, they just kept delivering.",
      "The team's backbone. Carried when it mattered.",
      "When in doubt, they cut it out. Correctly.",
      "A natural-born defuser.",
      "Put them on any bomb squad, instant upgrade.",
      "Three cuts, three wins. That's efficiency.",
    ],
  },
  {
    test: (s) => s.totalActions > 0 && s.failedCuts === 0,
    title: "CLEAN HANDS",
    cheers: [
      "Never made a mistake. Clutch player.",
      "Zero errors. The team's lucky charm.",
      "Did their job perfectly. No drama, just results.",
      "Consistency is a superpower and they have it.",
      "Quiet confidence, flawless execution.",
      "The definition of reliable.",
    ],
  },
  {
    test: (s) => s.totalActions > 0,
    title: "TEAM PLAYER",
    cheers: [
      "Showed up and contributed. That's what counts.",
      "Every cut mattered, even the risky ones.",
      "Brave enough to cut when others hesitated.",
      "Not every hero has a perfect record.",
      "Took risks for the team. Respect.",
      "Heart of a champion, hands of a... well, they tried.",
    ],
  },
  {
    test: () => true,
    title: "MORAL SUPPORT",
    cheers: [
      "Didn't cut any wires but the vibes were immaculate.",
      "Cheered from the sidelines. Important work.",
      "Emotional support teammate.",
      "Their presence was a gift. Allegedly.",
      "Sometimes the best cut is no cut at all.",
      "Watched the pros work. Took notes.",
    ],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getShameInfo(stats: PlayerStats): { title: string; roast: string } {
  const match = SHAME_TITLES.find((t) => t.test(stats))!;
  return { title: match.title, roast: pick(match.roasts) };
}

function getMvpInfo(stats: PlayerStats): { title: string; cheer: string } {
  const match = MVP_TITLES.find((t) => t.test(stats))!;
  return { title: match.title, cheer: pick(match.cheers) };
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
    const detailText = renderLogDetail(entry.detail);
    const s = ensure(entry.playerId);
    s.totalActions++;

    if (detailText.includes("BOOM!")) {
      s.explosions++;
    }
    if (detailText.includes("✗")) {
      s.failedCuts++;
    }
    if (detailText.includes("detonator triggered")) {
      s.detonatorAdvances++;
    }
    if (detailText.includes("✓")) {
      s.successfulCuts++;
      if (detailText.includes("detonator triggered")) {
        s.detonatorAdvances++;
      }
    }
  }

  return stats;
}

const SHAME_RANK_STYLES = [
  { card: "from-red-600/30 to-red-950/40 border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.3)]", badge: "bg-red-600 shadow-[0_0_15px_rgba(239,68,68,0.6)]", label: "WORST" },
  { card: "from-orange-600/25 to-orange-950/30 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]", badge: "bg-orange-600 shadow-[0_0_12px_rgba(249,115,22,0.5)]", label: "" },
  { card: "from-yellow-600/20 to-yellow-950/20 border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.15)]", badge: "bg-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.4)]", label: "" },
  { card: "from-emerald-600/20 to-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]", badge: "bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.4)]", label: "LEAST BAD" },
];

const MVP_RANK_STYLES = [
  { card: "from-yellow-400/30 to-yellow-700/20 border-yellow-400/60 shadow-[0_0_30px_rgba(250,204,21,0.3)]", badge: "bg-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.6)]", label: "MVP" },
  { card: "from-lime-500/25 to-lime-800/20 border-lime-400/50 shadow-[0_0_20px_rgba(132,204,22,0.2)]", badge: "bg-lime-500 shadow-[0_0_12px_rgba(132,204,22,0.5)]", label: "" },
  { card: "from-green-500/20 to-green-800/20 border-green-400/40 shadow-[0_0_15px_rgba(34,197,94,0.15)]", badge: "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]", label: "" },
  { card: "from-emerald-500/15 to-emerald-800/15 border-emerald-400/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]", badge: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]", label: "" },
];

const btnBase =
  "px-4 py-2.5 sm:px-7 sm:py-3.5 min-h-11 sm:min-h-0 rounded-xl font-extrabold text-sm sm:text-base leading-tight tracking-wide sm:tracking-wider uppercase cursor-pointer transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-1";

export function ShameDashboard({
  gameState,
  isWin,
  onBack,
}: {
  gameState: ClientGameState;
  isWin: boolean;
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

    if (isWin) {
      // Sort best-to-worst for MVP board
      playerStats.sort((a, b) => {
        if (a.successfulCuts !== b.successfulCuts) return b.successfulCuts - a.successfulCuts;
        if (a.failedCuts !== b.failedCuts) return a.failedCuts - b.failedCuts;
        return getSuccessRate(b) - getSuccessRate(a);
      });
    } else {
      // Sort worst-to-best for shame board
      playerStats.sort((a, b) => {
        if (a.explosions !== b.explosions) return b.explosions - a.explosions;
        if (a.failedCuts !== b.failedCuts) return b.failedCuts - a.failedCuts;
        return getSuccessRate(a) - getSuccessRate(b);
      });
    }

    return playerStats;
  }, [gameState, isWin]);

  const rankStyles = isWin ? MVP_RANK_STYLES : SHAME_RANK_STYLES;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-none"
      style={{
        background: isWin
          ? "radial-gradient(ellipse at 50% 30%, #4d7c0f 0%, #1a2e05 50%, #0a1204 100%)"
          : "radial-gradient(ellipse at 50% 30%, #4c0519 0%, #1c0a12 50%, #0a0406 100%)",
      }}
    >
      <div className="max-w-lg w-full text-center space-y-4 sm:space-y-6 py-4 sm:py-8 my-auto">
        <div className={`text-5xl sm:text-7xl ${isWin ? "drop-shadow-[0_0_30px_rgba(250,204,21,0.5)]" : "drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]"}`}>
          {isWin ? "🏆" : "💀"}
        </div>

        <h1 className={`text-2xl sm:text-4xl font-black uppercase tracking-widest text-white ${isWin ? "drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" : "drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]"}`}>
          {isWin ? "MVP Board" : "Wall of Shame"}
        </h1>
        <p className={`text-sm sm:text-lg font-bold uppercase tracking-wide ${isWin ? "text-lime-300/80" : "text-rose-300/80"}`}>
          {isWin ? "Ranked by who carried the hardest" : "Ranked by who ruined it the most"}
        </p>

        <div className="space-y-3 sm:space-y-4 mt-2 sm:mt-4">
          {rankings.map((player, i) => {
            const style = rankStyles[Math.min(i, rankStyles.length - 1)];
            const rate = getSuccessRate(player);
            const isTop = i === 0;

            const info = isWin ? getMvpInfo(player) : getShameInfo(player);
            const title = info.title;
            const quote = isWin ? (info as { cheer: string }).cheer : (info as { roast: string }).roast;

            return (
              <div
                key={player.id}
                className={`bg-gradient-to-r ${style.card} border-2 rounded-2xl p-3 sm:p-5 text-left flex gap-3 sm:gap-4 items-start ${isTop ? "sm:scale-105" : ""}`}
              >
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`${style.badge} text-white font-black text-lg w-10 h-10 rounded-full flex items-center justify-center`}
                  >
                    {i + 1}
                  </div>
                  {style.label && (
                    <span className="text-[10px] font-black tracking-widest text-white/60 uppercase">
                      {style.label}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`font-black text-xl truncate ${isTop ? (isWin ? "text-yellow-300" : "text-red-400") : "text-white"}`}>
                      {player.name}
                    </span>
                  </div>
                  <div className={`text-sm font-bold tracking-wide mt-0.5 ${isTop ? (isWin ? "text-yellow-200/90" : "text-red-300/90") : "text-white/70"}`}>
                    {title}
                  </div>
                  <p className="text-xs text-white/40 italic mt-1">
                    &ldquo;{quote}&rdquo;
                  </p>

                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs font-semibold">
                    {!isWin && player.explosions > 0 && (
                      <span className="text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">
                        💥 {player.explosions} kill{player.explosions !== 1 ? "s" : ""}
                      </span>
                    )}
                    {player.failedCuts > 0 && (
                      <span className="text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full">
                        ✗ {player.failedCuts} botched
                      </span>
                    )}
                    {!isWin && player.detonatorAdvances > 0 && (
                      <span className="text-yellow-400 bg-yellow-500/15 px-2 py-0.5 rounded-full">
                        ⚡ {player.detonatorAdvances} ticks
                      </span>
                    )}
                    <span className="text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                      ✓ {player.successfulCuts} clean
                    </span>
                    <span className="text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                      {Math.round(rate * 100)}% accuracy
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4">
          <button
            onClick={onBack}
            className={`w-full sm:w-auto ${btnBase} ${isWin ? "bg-green-800 border-green-950 text-green-100 shadow-[0_4px_15px_rgba(22,101,52,0.5)] hover:bg-green-700 hover:shadow-[0_6px_20px_rgba(22,101,52,0.6)]" : "bg-gray-700 border-gray-900 text-white shadow-[0_4px_15px_rgba(0,0,0,0.4)] hover:bg-gray-600 hover:shadow-[0_6px_20px_rgba(0,0,0,0.5)]"}`}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
