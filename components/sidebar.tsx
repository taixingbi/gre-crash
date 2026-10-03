"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/lib/actions";

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

export function Sidebar({
  email,
  dayLabel,
  note,
  modules,
}: {
  email: string;
  dayLabel: string;
  note: string;
  modules: SidebarModule[];
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpanded(window.localStorage.getItem("gre-nav") !== "hidden");
  }, []);

  function setBar(next: boolean) {
    setExpanded(next);
    window.localStorage.setItem("gre-nav", next ? "shown" : "hidden");
  }

  function toggleModule(id: string) {
    setOpenModules((current) => ({ ...current, [id]: current[id] === false }));
  }

  if (!expanded) {
    return (
      <aside className="flex h-fit w-full items-center justify-between border-b border-line bg-white px-3 py-3 lg:sticky lg:top-0 lg:h-screen lg:w-16 lg:flex-col lg:items-center lg:justify-start lg:gap-3 lg:border-r lg:border-b-0 lg:px-2 lg:py-4">
        <button type="button" onClick={() => setBar(true)} aria-label="Expand menu" className="rounded-md p-2 text-muted hover:text-ink">
          <Chevron open={false} />
        </button>
        <Link href="/today" className="text-sm font-semibold lg:sr-only">
          {dayLabel}
        </Link>
      </aside>
    );
  }

  return (
    <aside className="flex h-fit w-full flex-col border-b border-line bg-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-r lg:border-b-0">
      <Link href="/today" className="flex items-center gap-2 px-4 pt-5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet text-white">
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M3 4.5h10M3 8h10M3 11.5h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-lg font-semibold tracking-tight">GREMastery</span>
      </Link>
      <button type="button" onClick={() => setBar(false)} aria-label="Collapse menu" className="mx-4 mt-4 flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-left text-sm">
        <span>
          <span className="text-muted">GRE Crash </span>
          <span className="font-semibold">{dayLabel}</span>
        </span>
        <Chevron open />
      </button>
      <nav className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
        {modules.map((module) => {
          const open = openModules[module.id] !== false;
          return (
            <section key={module.id} className="border-t border-line">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggleModule(module.id)}
                className="flex w-full items-start justify-between gap-3 px-2 py-3 text-left"
              >
                <span>
                  <span className="text-xs font-semibold tracking-wide text-muted">{module.kicker}</span>
                  <span className="mt-0.5 block text-base font-semibold">{module.title}</span>
                </span>
                <Chevron open={open} />
              </button>
              {open ? (
                <ul className="space-y-1 pb-3">
                  {module.lessons.map((lesson) => {
                    const current = pathname === `/practice/${lesson.id}`;
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={lesson.href}
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

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`mt-1 h-4 w-4 shrink-0 text-muted ${open ? "" : "-rotate-90"}`}>
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
