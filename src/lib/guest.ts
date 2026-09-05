const KEY = "leo-tree-guest-v1";

export function readGuest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function enterGuest() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "1");
}

export function leaveGuest() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
