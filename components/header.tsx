import Link from "next/link";
import { tierLabel } from "@/lib/access";
import { signOutAction } from "@/lib/actions";
import { usingDynamo } from "@/lib/data";
import type { Tier } from "@/lib/types";

export function Header({ email, tier, dayLabel = "Today" }: { email?: string; tier?: Tier; dayLabel?: string }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-4">
        <Link href={email ? "/today" : "/"} className="font-serif text-xl tracking-tight">
          GREMastery
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {email ? (
            <>
              <Link href="/today" className="text-muted hover:text-ink">
                {dayLabel}
              </Link>
              <Link href="/dashboard" className="text-muted hover:text-ink">
                Dashboard
              </Link>
            </>
          ) : null}
          {email ? (
            <form action={signOutAction}>
              <button className="text-muted hover:text-ink" type="submit">
                Log out
              </button>
            </form>
          ) : (
            <Link href="/login" className="text-muted hover:text-ink">
              Log in
            </Link>
          )}
        </nav>
      </div>
      {email && tier ? (
        <div className="mx-auto flex max-w-5xl justify-between px-6 pb-3 text-xs text-muted">
          <span>
            {email} · {tierLabel(tier)}
            {process.env.DEV_UNLOCK ? " · dev unlock" : ""}
          </span>
          <span>{usingDynamo() ? "DynamoDB" : "Local"}</span>
        </div>
      ) : null}
    </header>
  );
}
