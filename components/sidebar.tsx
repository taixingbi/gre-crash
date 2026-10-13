"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { selectStudyDayAction, signOutAction } from "@/lib/actions";

const NAV_SCROLL_KEY = "gre-nav-scroll";
let navScroll = 0;
let navScrollLoaded = false;
let openModuleMemory: Record<string, boolean> = {};

function loadNavScroll() {
  if (navScrollLoaded || typeof window === "undefined") return;
  navScrollLoaded = true;
  const raw = window.sessionStorage.getItem(NAV_SCROLL_KEY);
  const value = raw == null ? 0 : Number(raw);
  if (Number.isFinite(value) && value >= 0) navScroll = value;
}

function saveNavScroll(value: number) {
  navScroll = value;
  try {
    window.sessionStorage.setItem(NAV_SCROLL_KEY, String(value));
  } catch {
    // Private mode can block storage. The in-memory value still covers this visit.
  }
}

function keepClickFromScrolling(event: { preventDefault: () => void }) {
  event.preventDefault();
}

export type SidebarLesson = {
  id: string;
  href: string;
  title: string;
  meta: string;
  done: boolean;
  bookmarked?: boolean;
};

export type SidebarModule = {
  id: string;
  kicker: string;
  title: string;
  lessons: SidebarLesson[];
};

export type SidebarDay = {
  day: number;
  planDate: string;
};

function readNavExpanded() {
  return window.localStorage.getItem("gre-nav") !== "hidden";
}

function subscribeNav(onChange: () => void) {
  window.addEventListener("gre-nav", onChange);
  return () => window.removeEventListener("gre-nav", onChange);
}

export function Sidebar({
  email,
  dayLabel,
  planDate,
  days,
  note,
  modules,
}: {
  email: string;
  dayLabel: string;
  planDate: string;
  days: SidebarDay[];
  note: string;
  modules: SidebarModule[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const [pending, startTransition] = useTransition();
  const [currentDay, setCurrentDay] = useState(planDate);
  loadNavScroll();
  const expanded = useSyncExternalStore(subscribeNav, readNavExpanded, () => true);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(openModuleMemory);

  useLayoutEffect(() => {
    setCurrentDay(planDate);
  }, [planDate]);

  function changeDay(next: string) {
    setCurrentDay(next);
    startTransition(async () => {
      await selectStudyDayAction(next);
      router.refresh();
    });
  }

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollTop = navScroll;
    const frame = requestAnimationFrame(() => {
      if (navRef.current) navRef.current.scrollTop = navScroll;
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, openModules]);

  function setBar(next: boolean) {
    window.localStorage.setItem("gre-nav", next ? "shown" : "hidden");
    window.dispatchEvent(new Event("gre-nav"));
  }

  function toggleModule(id: string) {
    setOpenModules((current) => {
      const next = { ...current, [id]: current[id] === false };
      openModuleMemory = next;
      return next;
    });
  }

  if (!expanded) {
    return (
      <aside className="flex h-fit w-full items-center justify-between border-b border-line bg-white px-3 py-3 lg:h-full lg:w-16 lg:shrink-0 lg:flex-col lg:items-center lg:justify-start lg:gap-3 lg:border-r lg:border-b-0 lg:px-2 lg:py-4">
        <button type="button" onClick={() => setBar(true)} aria-label="Show sidebar" className="rounded-md p-2 text-muted hover:bg-paper hover:text-ink">
          <SidebarToggle hidden />
        </button>
        <Link href="/today" className="text-sm font-semibold lg:sr-only">
          {dayLabel}
        </Link>
      </aside>
    );
  }

  return (
    <aside className="flex h-fit w-full flex-col border-b border-line bg-white lg:h-full lg:w-72 lg:shrink-0 lg:overflow-hidden lg:border-r lg:border-b-0">
      <div className="flex items-center gap-2 px-4 pt-5">
        <Link href="/today" className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet text-white">
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="M3 4.5h10M3 8h10M3 11.5h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">GREMastery</span>
        </Link>
        <button type="button" onMouseDown={keepClickFromScrolling} onClick={() => setBar(false)} aria-label="Hide sidebar" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-paper hover:text-ink">
          <SidebarToggle />
        </button>
      </div>
      <label className="relative mx-4 mt-4 flex cursor-pointer items-center gap-2 rounded-xl bg-paper py-2 pr-3 pl-3 text-sm">
        <span className="text-muted">GRE Crash</span>
        {days.length > 0 ? (
          <select
            aria-label="Study day"
            value={days.some((day) => day.planDate === currentDay) ? currentDay : planDate}
            disabled={pending}
            onChange={(event) => changeDay(event.target.value)}
            className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-0 pr-5 font-semibold outline-none disabled:cursor-wait"
          >
            {days.map((day) => (
              <option key={day.planDate} value={day.planDate}>
                Day {day.day}
              </option>
            ))}
          </select>
        ) : (
          <span className="font-semibold">{dayLabel}</span>
        )}
        {days.length > 0 ? <Chevron open className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" /> : null}
      </label>
      <nav
        ref={navRef}
        onScroll={(event) => {
          saveNavScroll(event.currentTarget.scrollTop);
        }}
        className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3"
      >
        {modules.map((module) => {
          const open = openModules[module.id] !== false;
          return (
            <section key={module.id} className="border-t border-line">
              <button
                type="button"
                aria-expanded={open}
                onMouseDown={keepClickFromScrolling}
                onClick={() => toggleModule(module.id)}
                className="flex w-full items-start justify-between gap-3 px-2 py-3 text-left"
              >
                <span>
                  <span className="text-xs font-semibold tracking-wide text-muted">{module.kicker}</span>
                  <span className="mt-0.5 block text-base font-semibold">{module.title}</span>
                </span>
                <Chevron open={open} className="mt-1" />
              </button>
              {open ? (
                <ul className="space-y-1 pb-3">
                  {module.lessons.map((lesson) => {
                    const current = pathname === lesson.href || pathname === `/practice/${lesson.id}`;
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={lesson.href}
                          scroll={false}
                          onMouseDown={keepClickFromScrolling}
                          className={`flex gap-3 rounded-xl px-2 py-2 ${current ? "bg-[#ecebff]" : "hover:bg-paper"}`}
                          aria-current={current ? "page" : undefined}
                        >
                          <StatusDot done={lesson.done} current={current} />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm font-medium ${lesson.done ? "text-muted" : ""}`}>{lesson.title}</span>
                            <span className="block text-xs text-muted">{lesson.meta}</span>
                          </span>
                          {lesson.bookmarked ? <BookmarkMark /> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 border-t border-line px-4 py-4">
        <div className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet text-sm font-semibold text-white">
            {email.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{email}</span>
            <span className="block truncate text-xs text-muted">{note}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/dashboard" className="rounded-lg border border-line px-3 py-1.5 hover:bg-paper">
            Dashboard
          </Link>
          <Link href="/pay" className="rounded-lg border border-line px-3 py-1.5 hover:bg-paper">
            Pay
          </Link>
          <form action={signOutAction}>
            <button className="rounded-lg px-2 py-1.5 text-muted hover:text-ink" type="submit">
              Log out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function StatusDot({ done, current }: { done: boolean; current: boolean }) {
  if (done) {
    return (
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#c8c4d2] text-[10px] text-white" aria-label="Done">
        ✓
      </span>
    );
  }
  return <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${current ? "border-violet" : "border-[#d9d6e2]"}`} aria-hidden="true" />;
}

function BookmarkMark() {
  return (
    <svg viewBox="0 0 16 16" aria-label="Bookmarked" className="mt-0.5 h-4 w-4 shrink-0 text-[#8d8a96]">
      <path d="M4 2.5h8v11l-4-2.4-4 2.4v-11z" fill="currentColor" />
    </svg>
  );
}

function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-4 w-4 shrink-0 text-muted ${open ? "" : "-rotate-90"} ${className}`}>
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SidebarToggle({ hidden = false }: { hidden?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.4" />
      <path
        d={hidden ? "M8.2 6.2 10.5 8l-2.3 1.8" : "M10.3 6.2 8 8l2.3 1.8"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
