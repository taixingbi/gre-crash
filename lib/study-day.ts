import { cookies } from "next/headers";
import { addDays, dateKey, daysBetween, todayKey } from "./dates";

const COOKIE = "gre-plan-date";

export type StudyDay = {
  day: number;
  planDate: string;
};

const COURSE_DAYS = 10;

export function studyDates(createdAt: string, through = todayKey()): StudyDay[] {
  const start = dateKey(createdAt);
  const courseEnd = addDays(start, COURSE_DAYS - 1);
  let end = daysBetween(start, through) >= 0 ? through : start;
  if (end > courseEnd) end = courseEnd;
  const count = Math.max(1, daysBetween(start, end) + 1);
  return Array.from({ length: count }, (_, index) => ({
    day: index + 1,
    planDate: addDays(start, index),
  }));
}

export function courseDates(createdAt: string, testDate: string | null) {
  void testDate;
  const start = dateKey(createdAt);
  return studyDates(createdAt, addDays(start, COURSE_DAYS - 1));
}

export async function selectedPlanDate(createdAt: string, dates = studyDates(createdAt)) {
  const today = todayKey();
  const saved = (await cookies()).get(COOKIE)?.value;
  if (saved && dates.some((item) => item.planDate === saved)) return saved;
  return dates.some((item) => item.planDate === today) ? today : (dates.at(-1)?.planDate ?? today);
}
