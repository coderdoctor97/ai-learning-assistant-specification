"use client";

import { useOffscreenPause } from "@/lib/motion";
import type { ReactNode } from "react";

/*
 * Gate wrapper: pauses every infinite animation inside its subtree while it
 * is scrolled out of the viewport (see useOffscreenPause / globals.css).
 */
export function MotionGate({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useOffscreenPause<HTMLDivElement>();
  return (
    <div ref={ref} className={className} data-offscreen="false">
      {children}
    </div>
  );
}
