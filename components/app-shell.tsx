import { Sidebar } from "@/components/sidebar";
import { tierLabel } from "@/lib/access";
import { usingSupabase } from "@/lib/data";
import type { Tier } from "@/lib/types";

export function AppShell({
  email,
  tier,
  dayLabel,
  children,
}: {
  email: string;
  tier: Tier;
  dayLabel: string;
  children: React.ReactNode;
}) {
  const note = `${tierLabel(tier)}${process.env.DEV_UNLOCK ? " · dev unlock" : ""} · ${usingSupabase() ? "Supabase" : "Local dev data"}`;
  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar email={email} dayLabel={dayLabel} note={note} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
