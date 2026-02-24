export type MobileTab = "game" | "mission" | "log" | "chat";

const TABS: { id: MobileTab; label: string }[] = [
  { id: "game", label: "Game" },
  { id: "mission", label: "Mission" },
  { id: "log", label: "Log" },
  { id: "chat", label: "Chat" },
];

export function MobileTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 flex border-t border-gray-700 bg-[var(--color-bomb-surface)] pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
            activeTab === tab.id
              ? "text-amber-300 border-t-2 border-amber-400"
              : "text-gray-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
