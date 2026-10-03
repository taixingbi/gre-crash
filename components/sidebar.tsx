"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOutAction } from "@/lib/actions";

export function Sidebar({ email, dayLabel, note }: { email: string; dayLabel: string; note: string }) {
  const pathname = usePathname();
  const onDay = pathname === "/today";
  const practicing = pathname.startsWith("/practice");
  const onDashboard = pathname.startsWith("/dashboard");
  const onPay = pathname.startsWith("/pay");
  const dayActive = onDay || practicing;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const read = () => setHidden(window.localStorage.getItem("gre-nav") === "hidden");
    read();
  }, []);

  function toggle(next: boolean) {
    setHidden(next);
    window.localStorage.setItem("gre-nav", next ? "hidden" : "shown");
  }

  if (hidden) {
    return (
      <aside className="flex items-center border-b border-line bg-card px-3 py-3 lg:w-14 lg:flex-col lg:border-r lg:border-b-0 lg:px-2 lg:py-4">
        <button type="button" onClick={() => toggle(false)} aria-label="Show menu" className="rounded-md border border-line px-3 py-2 text-sm font-semibold">
          Menu
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex items-center gap-3 border-b border-line bg-card px-4 py-3 lg:w-56 lg:flex-col lg:items-stretch lg:justify-between lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:flex-col lg:items-stretch lg:gap-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/today" className="font-serif text-xl tracking-tight">
            GRE Crash
          </Link>
          <button type="button" onClick={() => toggle(true)} aria-label="Hide menu" className="text-sm text-muted hover:text-ink">
            Hide
          </button>
        </div>
        <nav className="flex flex-1 items-center gap-2 lg:flex-col lg:items-stretch">
          <Link
            href="/today"
            className={`rounded-md px-3 py-2 text-sm font-semibold ${dayActive ? "bg-pine text-paper" : "text-muted hover:text-ink"}`}
          >
            {practicing ? `← ${dayLabel}` : dayLabel}
          </Link>
          <Link
            href="/dashboard"
            className={`rounded-md px-3 py-2 text-sm font-semibold ${onDashboard ? "bg-pine text-paper" : "text-muted hover:text-ink"}`}
          >
            Dashboard
          </Link>
          <Link href="/pay" className={`rounded-md px-3 py-2 text-sm font-semibold ${onPay ? "bg-pine text-paper" : "text-muted hover:text-ink"}`}>
            Pay
          </Link>
        </nav>
      </div>
      <div className="hidden space-y-3 lg:block">
        <p className="text-xs leading-5 text-muted">
          {email}
          <br />
          {note}
        </p>
        <form action={signOutAction}>
          <button className="text-sm text-muted hover:text-ink" type="submit">
            Log out
          </button>
        </form>
      </div>
      <form action={signOutAction} className="lg:hidden">
        <button className="text-sm text-muted" type="submit">
          Log out
        </button>
      </form>
    </aside>
  );
}
