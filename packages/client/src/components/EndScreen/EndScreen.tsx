import { useState } from "react";
import type { ClientGameState } from "@bomb-busters/shared";
import { ShameDashboard } from "./ShameDashboard";
import { ExplosionEffect } from "./ExplosionEffect";

const btnBase =
  "px-4 py-2.5 sm:px-7 sm:py-3.5 min-h-11 sm:min-h-0 rounded-xl font-extrabold text-sm sm:text-base leading-tight tracking-wide sm:tracking-wider uppercase cursor-pointer transition-all duration-200 border-b-4 active:border-b-0 active:translate-y-1";

export function EndScreen({
  gameState,
  onPlayAgain,
}: {
  gameState: ClientGameState;
  onPlayAgain: () => void;
}) {
  const [showShame, setShowShame] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const isWin = gameState.result === "win";
  const isSurrender = gameState.result === "loss_surrender";

  if (showShame) {
    return (
      <ShameDashboard
        gameState={gameState}
        isWin={isWin}
        onBack={() => setShowShame(false)}
      />
    );
  }

  if (showBoard) {
    return (
      <div className="fixed inset-0 z-40">
        <button
          onClick={() => setShowBoard(false)}
          className={`fixed top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-auto z-50 text-center ${btnBase} bg-gray-800 border-gray-950 text-white shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:bg-gray-700 hover:shadow-[0_6px_20px_rgba(0,0,0,0.6)]`}
        >
          Back to Results
        </button>
      </div>
    );
  }

  const bg = isWin
    ? "radial-gradient(ellipse at 50% 40%, #d4e157 0%, #9ccc65 35%, #558b2f 70%, #33691e 100%)"
    : isSurrender
      ? "radial-gradient(ellipse at 50% 40%, #fde68a 0%, #d97706 35%, #7c2d12 70%, #431407 100%)"
      : "radial-gradient(ellipse at 50% 40%, #fb7185 0%, #e11d48 35%, #9f1239 65%, #4c0519 100%)";

  const canRestartMission = !gameState.isSpectator;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: bg }}
      data-testid="end-screen"
    >
      <div className="w-full h-full flex flex-col items-center justify-center">
        {isWin ? (
          <>
            <div className="text-6xl sm:text-8xl animate-bounce">🎉</div>
            <h1
              data-testid="result-title"
              className="text-3xl sm:text-4xl font-black text-green-950 mt-6 px-4 text-center drop-shadow-[0_0_20px_rgba(255,255,200,0.4)]"
            >
              MISSION COMPLETE!
            </h1>
          </>
        ) : isSurrender ? (
          <>
            <h1
              data-testid="result-title"
              className="text-3xl sm:text-4xl font-black text-amber-100 mt-6 px-4 text-center drop-shadow-[0_0_20px_rgba(120,53,15,0.7)]"
            >
              MISSION ABORTED
            </h1>
          </>
        ) : (
          <>
            <ExplosionEffect />
            <h1
              data-testid="result-title"
              className="text-3xl sm:text-4xl font-black text-red-500 sr-only"
            >
              {gameState.result === "loss_timer" ? "TIME'S UP!" : "BOOM!"}
            </h1>
          </>
        )}

        <p className={`text-lg sm:text-2xl font-black mt-6 px-4 text-center uppercase tracking-wide ${isWin ? "text-green-950 drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]" : "text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"}`}>
          {gameState.result === "win" && "All wires have been safely cut!"}
          {gameState.result === "loss_red_wire" &&
            "A red wire was cut and the bomb exploded!"}
          {gameState.result === "loss_detonator" &&
            "The detonator hit zero. No survivors."}
          {gameState.result === "loss_timer" &&
            "The mission timer expired!"}
          {gameState.result === "loss_surrender" &&
            "The team surrendered."}
        </p>

        <div className="w-full max-w-sm sm:max-w-none flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-10 px-4 sm:px-0 sm:justify-center">
          <button
            onClick={() => setShowBoard(true)}
            className={`w-full sm:w-auto ${btnBase} ${isWin ? "bg-green-800 border-green-950 text-green-100 shadow-[0_4px_15px_rgba(22,101,52,0.5)] hover:bg-green-700 hover:shadow-[0_6px_20px_rgba(22,101,52,0.6)]" : "bg-gray-700 border-gray-900 text-white shadow-[0_4px_15px_rgba(0,0,0,0.4)] hover:bg-gray-600 hover:shadow-[0_6px_20px_rgba(0,0,0,0.5)]"}`}
          >
            View Board
          </button>
          <button
            onClick={() => setShowShame(true)}
            className={`w-full sm:w-auto ${btnBase} ${isWin ? "bg-lime-600 border-lime-800 text-white shadow-[0_4px_15px_rgba(101,163,13,0.5)] hover:bg-lime-500 hover:shadow-[0_6px_20px_rgba(101,163,13,0.6)]" : "bg-rose-900 border-rose-950 text-white shadow-[0_4px_15px_rgba(136,19,55,0.5)] hover:bg-rose-800 hover:shadow-[0_6px_20px_rgba(136,19,55,0.6)]"}`}
          >
            {isWin ? "MVP Board" : "Who Blew It?"}
          </button>
          {canRestartMission && (
            <button
              onClick={onPlayAgain}
              data-testid="play-again"
              className={`w-full sm:w-auto ${btnBase} ${isWin ? "bg-yellow-400 border-yellow-600 text-green-950 shadow-[0_4px_15px_rgba(250,204,21,0.5)] hover:bg-yellow-300 hover:shadow-[0_6px_20px_rgba(250,204,21,0.6)]" : "bg-amber-500 border-amber-800 text-gray-900 shadow-[0_4px_15px_rgba(245,158,11,0.5)] hover:bg-amber-400 hover:shadow-[0_6px_20px_rgba(245,158,11,0.6)]"}`}
            >
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
