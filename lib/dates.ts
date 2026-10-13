export function todayKey(timeZone = process.env.PLAN_TIMEZONE || "America/New_York") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateKey(iso: string, timeZone = process.env.PLAN_TIMEZONE || "America/New_York") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function addDays(from: string, days: number) {
  const start = Date.parse(`${from}T00:00:00Z`);
  return new Date(start + days * 86_400_000).toISOString().slice(0, 10);
}

export function studyDayLabel(createdAt: string, planDate = todayKey()) {
  const day = Math.max(1, daysBetween(dateKey(createdAt), planDate) + 1);
  return `Day ${day}`;
}

export function daysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}
