"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function MainPane({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const id = window.location.hash.replace(/^#/, "");
    const target = id ? root.querySelector(`#${CSS.escape(id)}`) : null;
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ block: "start" });
      return;
    }
    root.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div ref={ref} className="min-w-0 flex-1 lg:overflow-y-auto">
      {children}
    </div>
  );
}
