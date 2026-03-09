"use client";

export type TabKey = "all" | "mine" | "featured";

interface TabBarProps {
  tabs: { key: TabKey; label: string }[];
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex gap-0 flex-1 border-b border-border/40">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-3 min-h-[44px] text-sm font-medium transition-all duration-200 relative ${
            activeTab === tab.key
              ? "text-foreground after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:bg-primary after:rounded-full"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
