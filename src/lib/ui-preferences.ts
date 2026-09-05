import { useSyncExternalStore } from "react";

export const INTRO_KEY = "leo-tree-intro-v1";
export const LOCAL_HINT_KEY = "leo-tree-local-hint-v1";
export const BACKUP_TIME_KEY = "leo-tree-last-full-backup-v1";
const changed = "leo-tree-ui-preference";
export function readPreference(key: string): string | null {
  try { return typeof window === "undefined" ? null : window.localStorage.getItem(key); }
  catch { return null; }
}
export function writePreference(key: string, value: string): boolean {
  try { window.localStorage.setItem(key,value); window.dispatchEvent(new Event(changed)); return true; }
  catch { return false; }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage",callback); window.addEventListener(changed,callback);
  return () => { window.removeEventListener("storage",callback); window.removeEventListener(changed,callback); };
}
export function usePreference(key: string) {
  return useSyncExternalStore(subscribe,()=>readPreference(key),()=>null);
}
export function backupAge(value: string | null, now = Date.now()): string {
  const at = value ? Date.parse(value) : NaN;
  if (!Number.isFinite(at) || at > now + 60000) return "从未";
  const days = Math.max(0,Math.floor((now-at)/86400000));
  return days === 0 ? "今天" : `${days} 天前`;
}
