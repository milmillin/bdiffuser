import { useState } from "react";
import type { ReactNode } from "react";
import type {
  MissionId,
  GameLogEntry,
  ClientPlayer,
  GameResult,
  ChatMessage,
  ClientMessage,
} from "@bomb-busters/shared";
import { MISSION_IMAGES, RULE_STICKER_IMAGES } from "@bomb-busters/shared";
import { ActionLog } from "./ActionLog.js";
import { ChatPanel } from "./Chat/ChatPanel.js";

type BottomTab = "log" | "chat";

export function RightPanel({
  missionId,
  log,
  players,
  result,
  chatMessages,
  send,
  playerId,
  missionExtras,
}: {
  missionId: MissionId;
  log: GameLogEntry[];
  players: ClientPlayer[];
  result?: GameResult | null;
  chatMessages: ChatMessage[];
  send: (msg: ClientMessage) => void;
  playerId: string;
  missionExtras?: ReactNode;
}) {
  const [isBottomPanelExpanded, setIsBottomPanelExpanded] = useState(false);

  return (
    <div
      className="hidden w-48 md:grid md:w-60 lg:w-72 xl:w-80 flex-shrink-0 gap-3 overflow-hidden"
      style={{
        gridTemplateRows: isBottomPanelExpanded ? "1fr" : "1fr auto",
      }}
      data-testid="right-panel"
    >
      {/* Top: scrollable info area */}
      {!isBottomPanelExpanded && (
        <div className="min-h-0 overflow-y-auto overscroll-none space-y-3">
          <MissionCard missionId={missionId} />
          <RuleStickerBanner mission={missionId} />
          {missionExtras}
        </div>
      )}

      {/* Bottom: action log / chat */}
      <LogChatTabs
        log={log}
        players={players}
        result={result}
        chatMessages={chatMessages}
        send={send}
        playerId={playerId}
        isExpanded={isBottomPanelExpanded}
        onToggleExpanded={() =>
          setIsBottomPanelExpanded((prev) => !prev)
        }
      />
    </div>
  );
}

export function MissionCard({ missionId }: { missionId: MissionId }) {
  const [showBack, setShowBack] = useState(true);

  const frontSrc = `/images/${MISSION_IMAGES[missionId]}`;
  const backSrc = `/images/mission_${missionId}_back.jpg`;

  return (
    <button
      type="button"
      onClick={() => setShowBack((prev) => !prev)}
      className="bg-[var(--color-bomb-surface)] rounded-[1.15rem] border border-gray-700 overflow-hidden cursor-pointer"
    >
      <img
        src={showBack ? backSrc : frontSrc}
        alt={`Mission ${missionId} ${showBack ? "back" : "front"}`}
        className="w-full"
      />
    </button>
  );
}

function LogChatTabs({
  log,
  players,
  result,
  chatMessages,
  send,
  playerId,
  isExpanded,
  onToggleExpanded,
}: {
  log: GameLogEntry[];
  players: ClientPlayer[];
  result?: GameResult | null;
  chatMessages: ChatMessage[];
  send: (msg: ClientMessage) => void;
  playerId: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}) {
  const [tab, setTab] = useState<BottomTab>("log");

  return (
    <div
      className={`group relative flex flex-col bg-[var(--color-bomb-surface)] rounded-lg border border-gray-700 overflow-hidden ${
        isExpanded ? "h-full min-h-0" : "max-h-[300px]"
      }`}
      data-testid="right-panel-log-chat"
      data-expanded={isExpanded ? "true" : "false"}
    >
      <button
        type="button"
        onClick={onToggleExpanded}
        className="absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-500/80 bg-[var(--color-bomb-dark)] text-[10px] text-gray-300 opacity-0 transition-opacity hover:border-gray-300 hover:text-gray-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 group-hover:opacity-100 group-focus-within:opacity-100"
        aria-label={isExpanded ? "Collapse right panel" : "Expand right panel"}
        title={isExpanded ? "Collapse right panel" : "Expand right panel"}
        data-testid="right-panel-expand-toggle"
      >
        <span aria-hidden="true">{isExpanded ? "-" : "+"}</span>
      </button>
      <div className="flex border-b border-gray-700 flex-shrink-0">
        <button
          type="button"
          onClick={() => setTab("log")}
          className={`flex-1 px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
            tab === "log"
              ? "text-amber-300 border-b-2 border-amber-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Action Log
        </button>
        <button
          type="button"
          onClick={() => setTab("chat")}
          className={`flex-1 px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
            tab === "chat"
              ? "text-amber-300 border-b-2 border-amber-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Chat
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === "log" ? (
          <ActionLog log={log} players={players} result={result} />
        ) : (
          <ChatPanel messages={chatMessages} send={send} playerId={playerId} />
        )}
      </div>
    </div>
  );
}

function RuleStickerBanner({ mission }: { mission: MissionId }) {
  const stickers = [
    { key: "a", image: RULE_STICKER_IMAGES.a, label: "Rule Sticker A", threshold: 9 },
    { key: "b", image: RULE_STICKER_IMAGES.b, label: "Rule Sticker B", threshold: 31 },
    { key: "c", image: RULE_STICKER_IMAGES.c, label: "Rule Sticker C", threshold: 55 },
  ].filter((s) => mission >= s.threshold);

  if (stickers.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-bold uppercase text-gray-400">Rule Stickers</div>
      {stickers.map((s) => (
        <img key={s.key} src={`/images/${s.image}`} alt={s.label} className="w-full rounded" />
      ))}
    </div>
  );
}
