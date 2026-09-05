export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  x.setHours(0, 0, 0, 0);
  return x;
}

export function weekIdFromDate(d = new Date()): string {
  const x = startOfWeek(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export function parseISODate(id: string): Date {
  const [y, m, da] = id.split("-").map(Number);
  return new Date(y, (m || 1) - 1, da || 1);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function fmtDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function inRange(iso: string | null | undefined, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function weekBounds(id: string): {
  start: Date;
  end: Date;
  cap: Date;
  isFuture: boolean;
  isCurrent: boolean;
} {
  const start = parseISODate(id);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 7);
  const now = new Date();
  const isFuture = start.getTime() > now.getTime();
  const cap = end.getTime() > now.getTime() ? now : end;
  return { start, end, cap, isFuture, isCurrent: start <= now && now < end };
}
