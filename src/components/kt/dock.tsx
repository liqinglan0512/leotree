import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export type ShellTab = "mine" | "community" | "settings";

function Plum() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <circle cx="16" cy="16" r="3.2" fill="currentColor" opacity=".9" />
      <path
        d="M16 6c2.2 2.4 2.4 5.4 1.1 7.4C15.4 11.6 13 10 10.4 10.6 12.2 8.2 14.4 6.6 16 6zm10 10c-2.4 2.2-5.4 2.4-7.4 1.1 1.8-1.7 3.4-4.1 2.8-6.7 2.4 1.8 4 4 4.6 5.6zM16 26c-2.2-2.4-2.4-5.4-1.1-7.4 1.7 1.8 4.1 3.4 6.7 2.8-1.8 2.4-4 4-5.6 4.6zM6 16c2.4-2.2 5.4-2.4 7.4-1.1C11.6 16.6 10 19 10.6 21.6 8.2 19.8 6.6 17.6 6 16z"
        fill="currentColor"
        opacity=".75"
      />
    </svg>
  );
}

function Mountain() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <path d="M4 24 L12 10 L18 18 L15 24 Z" fill="currentColor" opacity=".28" />
      <path d="M10 24 L20 8 L28 24 Z" fill="currentColor" opacity=".55" />
      <path d="M3 25 H29" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".7" />
    </svg>
  );
}

function Seal() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <rect x="6" y="6" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 11 h8 M11 16 h10 M13 21 h6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function InkDock({ tab, onChange }: { tab: ShellTab; onChange: (t: ShellTab) => void }) {
  const { t } = useI18n();
  const items: { id: ShellTab; label: string; icon: ReactNode }[] = [
    { id: "mine", label: t("navMine"), icon: <Plum /> },
    { id: "community", label: t("navCommunity"), icon: <Mountain /> },
    { id: "settings", label: t("navSettings"), icon: <Seal /> },
  ];
  return (
    <nav className="ink-dock" aria-label="LEO TREE">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`ink-mod ${tab === item.id ? "on" : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
