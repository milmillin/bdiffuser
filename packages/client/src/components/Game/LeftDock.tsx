import { useState } from "react";
import {
  EQUIPMENT_DEFS,
  getEquipmentCardText,
  MISSION_IMAGES,
  CHARACTER_CARD_TEXT,
  CHARACTER_IMAGES,
  type BoardState,
  type CharacterId,
  type MissionId,
} from "@bomb-busters/shared";

const EQUIPMENT_DEFS_BY_ID = new Map(EQUIPMENT_DEFS.map((def) => [def.id, def]));

function getIconInfo(eq: BoardState["equipment"][number]) {
  if (eq.used) return {
    icon: "\u2014", textColor: "text-gray-500", locked: false,
    gradient: "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
    activeGradient: "linear-gradient(135deg, #4b5563 0%, #374151 100%)",
  };
  if (eq.faceDown && !eq.unlocked) return {
    icon: "?", textColor: "text-slate-400", locked: true,
    gradient: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
    activeGradient: "linear-gradient(135deg, #334155 0%, #1e293b 100%)",
  };
  if (eq.unlocked && eq.secondaryLockValue !== undefined) return {
    icon: `${eq.secondaryLockValue}`, textColor: "text-amber-300", locked: true,
    gradient: "linear-gradient(135deg, #78350f 0%, #451a03 100%)",
    activeGradient: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
  };
  if (eq.unlocked) return {
    icon: "\u2713", textColor: "text-white", locked: false,
    gradient: "linear-gradient(135deg, #14532d 0%, #0f291a 100%)",
    activeGradient: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
  };
  return {
    icon: `${eq.unlockValue}`, textColor: "text-yellow-300", locked: true,
    gradient: "linear-gradient(135deg, #713f12 0%, #422006 100%)",
    activeGradient: "linear-gradient(135deg, #ca8a04 0%, #a16207 100%)",
  };
}

function getStatusLabel(eq: BoardState["equipment"][number]) {
  if (eq.used) return { label: "Used", className: "bg-black/70 text-gray-200" };
  if (eq.faceDown && !eq.unlocked) return { label: "Face Down", className: "bg-black/70 text-slate-200" };
  if (eq.unlocked && eq.secondaryLockValue !== undefined) {
    return {
      label: `2nd Lock ${eq.secondaryLockValue}x${eq.secondaryLockCutsRequired ?? 2}`,
      className: "bg-black/70 text-amber-200",
    };
  }
  if (eq.unlocked) return { label: "Available", className: "bg-green-700/80 text-white" };
  return { label: `Lock ${eq.unlockValue}x2`, className: "bg-black/70 text-yellow-200" };
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM14 5.586v12.828l2.293-2.293A1 1 0 0017 15.414V5.414a1 1 0 00-.293-.707L14 2.414v3.172z" clipRule="evenodd" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
    </svg>
  );
}

type TabId = "mission_front" | "mission_back" | `equip_personal` | `equip_${string}` | "rules";

export function LeftDock({
  equipment,
  character,
  characterUsed,
  missionId,
  playerCount,
  onOpenRules,
}: {
  equipment: BoardState["equipment"];
  character?: CharacterId | null;
  characterUsed?: boolean;
  missionId: MissionId;
  playerCount: number;
  onOpenRules: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const toggleCard = (key: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleTab = (id: TabId) => {
    setActiveTab((prev) => (prev === id ? null : id));
  };

  const charText = character ? CHARACTER_CARD_TEXT[character] : null;
  const charImage = character ? CHARACTER_IMAGES[character] : null;

  const isOpen = activeTab !== null;

  return (
    <div className="hidden lg:block relative flex-shrink-0 w-9 z-20">
      <div className="absolute inset-y-0 left-0 flex">
        {/* Tab strip — transparent, no border */}
        <div className="flex flex-col w-9 py-1 gap-1.5 overflow-y-auto flex-shrink-0">
          {/* Mission front tab */}
          <TabButton
            active={activeTab === "mission_front"}
            onClick={() => toggleTab("mission_front")}
            title="Mission card (front)"
            gradient="linear-gradient(135deg, #1e3a5f 0%, #1a2744 100%)"
            activeGradient="linear-gradient(135deg, #2563eb 0%, #1e40af 100%)"
          >
            <MapIcon className="text-blue-300" />
            <span className="text-[9px] leading-none mt-0.5 font-semibold text-blue-300">F</span>
          </TabButton>

          {/* Mission back tab */}
          <TabButton
            active={activeTab === "mission_back"}
            onClick={() => toggleTab("mission_back")}
            title="Mission card (back)"
            gradient="linear-gradient(135deg, #1e3a5f 0%, #1a2744 100%)"
            activeGradient="linear-gradient(135deg, #2563eb 0%, #1e40af 100%)"
          >
            <MapIcon className="text-blue-300" />
            <span className="text-[9px] leading-none mt-0.5 font-semibold text-blue-300">B</span>
          </TabButton>

          {/* Divider */}
          {(equipment.length > 0 || character) && (
            <div className="mx-2 my-1.5 border-t border-gray-600/50" />
          )}

          {/* Personal equipment tab */}
          {character && charText && (
            <TabButton
              active={activeTab === "equip_personal"}
              onClick={() => toggleTab("equip_personal")}
              title={`${charText.name} – ${characterUsed ? "Used" : "Ready"}`}
              gradient={characterUsed
                ? "linear-gradient(135deg, #4c1d1d 0%, #2a1215 100%)"
                : "linear-gradient(135deg, #14532d 0%, #0f291a 100%)"
              }
              activeGradient={characterUsed
                ? "linear-gradient(135deg, #be123c 0%, #881337 100%)"
                : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"
              }
            >
              <WrenchIcon className={characterUsed ? "text-gray-400" : "text-emerald-300"} />
              <span className={`text-[9px] leading-none mt-0.5 font-bold ${characterUsed ? "text-gray-400" : "text-emerald-300"}`}>{characterUsed ? "\u2716" : "\u2713"}</span>
            </TabButton>
          )}

          {/* Equipment tabs */}
          {equipment.map((eq) => {
            const info = getIconInfo(eq);
            const tabId: TabId = `equip_${eq.id}`;
            return (
              <TabButton
                key={eq.id}
                active={activeTab === tabId}
                onClick={() => toggleTab(tabId)}
                title={`${eq.name} – ${getStatusLabel(eq).label}`}
                gradient={info.gradient}
                activeGradient={info.activeGradient}
              >
                {info.locked ? <LockIcon className={info.textColor} /> : <WrenchIcon className={info.textColor} />}
                <span className={`text-[9px] leading-none mt-0.5 font-bold ${info.textColor}`}>{info.icon}</span>
              </TabButton>
            );
          })}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Version label — rotated vertically */}
          <div className="relative h-20 flex items-center justify-center">
            <span
              className="absolute text-[9px] font-mono text-gray-600 whitespace-nowrap select-none"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {`${__APP_COMMIT_ID__} | v${__APP_VERSION__}`}
            </span>
          </div>

          {/* Gap before rules */}
          <div className="h-2" />

          {/* Rules tab */}
          <TabButton
            active={false}
            onClick={onOpenRules}
            title="Game Rules"
            gradient="linear-gradient(135deg, #1f2937 0%, #111827 100%)"
            activeGradient="linear-gradient(135deg, #374151 0%, #1f2937 100%)"
          >
            <BookIcon className="text-gray-400" />
          </TabButton>
        </div>

        {/* Expanded panel */}
        {isOpen && (
          <div
            className="w-72 rounded-r-xl overflow-y-auto shadow-[4px_0_20px_rgba(0,0,0,0.6)]"
            style={{ background: "linear-gradient(180deg, #1e2235 0%, #131720 40%, #171c28 100%)" }}
          >
            <div className="p-3">
              {activeTab === "mission_front" && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Mission {missionId} — Front</div>
                  <img
                    src={`/images/${MISSION_IMAGES[missionId]}`}
                    alt={`Mission ${missionId} (front)`}
                    className="w-full h-auto rounded-lg shadow-lg shadow-black/30"
                  />
                </div>
              )}

              {activeTab === "mission_back" && (
                <div className="space-y-2">
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wide">Mission {missionId} — Back</div>
                  <img
                    src={`/images/mission_${missionId}_back.jpg`}
                    alt={`Mission ${missionId} (back)`}
                    className="w-full h-auto rounded-lg shadow-lg shadow-black/30"
                  />
                </div>
              )}

              {activeTab === "equip_personal" && character && charText && (() => {
                const showPersonalImage = !flippedCards.has(`personal-${character}`);
                return (
                  <button
                    type="button"
                    onClick={() => toggleCard(`personal-${character}`)}
                    className={`relative w-full rounded-lg border shadow-lg shadow-black/30 h-96 text-left overflow-hidden ${
                      characterUsed
                        ? "border-gray-700 opacity-60 bg-gray-900"
                        : "border-violet-500 bg-violet-950/80"
                    }`}
                  >
                    <div
                      className={`absolute left-1 top-1 z-10 px-1 py-0.5 rounded text-[10px] font-bold ${
                        characterUsed ? "bg-rose-700/80 text-white" : "bg-emerald-700/80 text-white"
                      }`}
                    >
                      {characterUsed ? "Skill Used" : "Skill Ready"}
                    </div>
                    <div className="absolute right-1 top-1 z-10 px-1 py-0.5 rounded bg-violet-700/80 text-[10px] font-bold text-violet-100">
                      Personal
                    </div>

                    {showPersonalImage && charImage ? (
                      <div className="flex flex-col h-full w-full bg-slate-900">
                        <div className="flex-1 min-h-0">
                          <img
                            src={`/images/${charImage}`}
                            alt={charText.name}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="flex-shrink-0 px-2.5 py-1.5 bg-black/80">
                          <div className="text-sm font-bold text-white leading-tight">{charText.name}</div>
                          <div className="text-[10px] text-violet-200">{charText.abilityName}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto px-2.5 py-2.5 pt-7 space-y-2">
                        <div className="space-y-0.5">
                          <div className="text-[10px] uppercase tracking-wide text-violet-300">Personal Equipment</div>
                          <div className="text-sm font-bold text-white leading-tight">{charText.abilityName}</div>
                          <div className="text-[10px] text-violet-300/80">{charText.name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Timing</div>
                          <p className="text-[11px] leading-snug text-gray-100">{charText.timing}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Effect</div>
                          <p className="text-[11px] leading-snug text-gray-100">{charText.effect}</p>
                        </div>
                        {charText.reminders.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">Reminder</div>
                            <ul className="space-y-1">
                              {charText.reminders.map((reminder) => (
                                <li key={reminder} className="text-[11px] leading-snug text-gray-300">- {reminder}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })()}

              {equipment.map((eq) => {
                const tabId: TabId = `equip_${eq.id}`;
                if (activeTab !== tabId) return null;
                const def = EQUIPMENT_DEFS_BY_ID.get(eq.id);
                const rulesText = getEquipmentCardText(eq.id, def);
                const status = getStatusLabel(eq);
                const showImage = !flippedCards.has(eq.id);

                return (
                  <button
                    type="button"
                    key={eq.id}
                    onClick={() => toggleCard(eq.id)}
                    className={`relative w-full rounded-lg border shadow-lg shadow-black/30 h-96 text-left overflow-hidden ${
                      eq.used
                        ? "border-gray-700 opacity-60 bg-gray-900"
                        : eq.unlocked
                          ? "border-green-500 bg-slate-900"
                          : "border-gray-700 bg-slate-950"
                    }`}
                  >
                    <div className={`absolute left-1 top-1 z-10 px-1 py-0.5 rounded text-[10px] font-bold ${status.className}`}>
                      {status.label}
                    </div>

                    {showImage ? (
                      <div className="flex flex-col h-full w-full bg-slate-900">
                        <div className="flex-1 min-h-0">
                          <img src={`/images/${eq.image}`} alt={eq.name} className="h-full w-full object-contain" />
                        </div>
                        <div className="flex-shrink-0 px-2.5 py-1.5 bg-black/80">
                          <div className="text-sm font-bold text-white leading-tight">{eq.name}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto px-2.5 py-2.5 pt-7 space-y-2">
                        <div className="space-y-0.5">
                          <div className="text-[10px] uppercase tracking-wide text-gray-400">
                            {eq.faceDown && !eq.unlocked ? "Face-down equipment" : `Equipment ${eq.unlockValue}`}
                          </div>
                          <div className="text-sm font-bold text-white leading-tight">{eq.name}</div>
                          <div className="text-[10px] text-gray-400">
                            {eq.faceDown && !eq.unlocked
                              ? "This card will be revealed by mission progression"
                              : `Unlocks after 2 cuts of value ${eq.unlockValue}`}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300">Timing</div>
                          <p className="text-[11px] leading-snug text-gray-100">{rulesText.timing}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-amber-300">Effect</div>
                          <p className="text-[11px] leading-snug text-gray-100">{rulesText.effect}</p>
                        </div>
                        {rulesText.reminders.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">Reminder</div>
                            <ul className="space-y-1">
                              {rulesText.reminders.map((reminder) => (
                                <li key={reminder} className="text-[11px] leading-snug text-gray-300">- {reminder}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  title,
  gradient,
  activeGradient,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  gradient: string;
  activeGradient: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        w-[34px] h-14 rounded-r-lg
        flex flex-col items-center justify-center
        transition-all duration-150 cursor-pointer
        ${active
          ? "shadow-[2px_2px_8px_rgba(0,0,0,0.6)] brightness-110 scale-x-105 origin-left"
          : "shadow-[1px_1px_4px_rgba(0,0,0,0.4)] hover:brightness-125 hover:shadow-[2px_2px_6px_rgba(0,0,0,0.5)]"
        }
      `}
      style={{ background: active ? activeGradient : gradient }}
    >
      {children}
    </button>
  );
}
