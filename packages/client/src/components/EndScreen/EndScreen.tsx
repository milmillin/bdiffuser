import type { ClientGameState } from "@bomb-busters/shared";

export function EndScreen({
  gameState,
  onPlayAgain,
}: {
  gameState: ClientGameState;
  onPlayAgain: () => void;
}) {
  const isWin = gameState.result === "win";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" data-testid="end-screen">
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className={`text-8xl ${isWin ? "animate-bounce" : "animate-pulse"}`}
        >
          {isWin ? "🎉" : "💥"}
        </div>

        <h1
          data-testid="result-title"
          className={`text-4xl font-black ${
            isWin ? "text-green-400" : "text-red-500"
          }`}
        >
          {isWin ? "MISSION COMPLETE!" : "BOOM!"}
        </h1>

        <p className="text-gray-300 text-lg">
          {gameState.result === "win" && "All wires have been safely cut!"}
          {gameState.result === "loss_red_wire" &&
            "A red wire was cut and the bomb exploded!"}
          {gameState.result === "loss_detonator" &&
            "The detonator reached the end!"}
        </p>

        <div className="bg-[var(--color-bomb-surface)] rounded-xl p-4 text-left">
          <h2 className="text-sm font-bold text-gray-400 uppercase mb-2">
            Game Summary
          </h2>
          <div className="space-y-1 text-sm">
            <div>
              Mission: <span className="text-white">#{gameState.mission}</span>
            </div>
            <div>
              Turns played:{" "}
              <span className="text-white">{gameState.turnNumber}</span>
            </div>
            <div>
              Players:{" "}
              <span className="text-white">
                {gameState.players.map((p) => p.name).join(", ")}
              </span>
            </div>
            <div>
              Detonator:{" "}
              <span className="text-white">
                {gameState.board.detonatorPosition}/{gameState.board.detonatorMax}
              </span>
            </div>
          </div>
        </div>

        {/* Game log */}
        {gameState.log.length > 0 && (
          <div className="bg-[var(--color-bomb-surface)] rounded-xl p-4 text-left max-h-48 overflow-y-auto">
            <h2 className="text-sm font-bold text-gray-400 uppercase mb-2">
              Action Log
            </h2>
            <div className="space-y-1 text-xs text-gray-400">
              {gameState.log.slice(-20).map((entry, i) => (
                <div key={i}>
                  <span className="text-gray-500">T{entry.turn}:</span>{" "}
                  {entry.detail}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onPlayAgain}
          data-testid="play-again"
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-lg transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
