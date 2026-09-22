"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

type TooltipContextValue = {
  delayDuration: number;
};

const TooltipContext = createContext<TooltipContextValue>({ delayDuration: 200 });

export function TooltipProvider({
  children,
  delayDuration = 200,
}: {
  children: ReactNode;
  delayDuration?: number;
}) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  );
}

type TooltipProps = {
  content?: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  strategy?: "portal" | "css";
  disabled?: boolean;
  children: ReactNode;
  className?: string;
};

/* [A11y & SVG Enhancement] Accessible floating tooltip primitive with Portal & CSS strategy options. */
export function Tooltip({
  content,
  side = "top",
  sideOffset = 5,
  strategy = "portal",
  disabled = false,
  children,
  className,
}: TooltipProps) {
  const { delayDuration } = useContext(TooltipContext);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = 0;
    let left = 0;

    if (side === "top") {
      top = rect.top - sideOffset + window.scrollY;
      left = rect.left + rect.width / 2 + window.scrollX;
    } else if (side === "bottom") {
      top = rect.bottom + sideOffset + window.scrollY;
      left = rect.left + rect.width / 2 + window.scrollX;
    } else if (side === "left") {
      top = rect.top + rect.height / 2 + window.scrollY;
      left = rect.left - sideOffset + window.scrollX;
    } else if (side === "right") {
      top = rect.top + rect.height / 2 + window.scrollY;
      left = rect.right + sideOffset + window.scrollX;
    }

    setCoords({ top, left });
  };

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    updateCoords();
    timerRef.current = setTimeout(() => {
      updateCoords();
      setOpen(true);
    }, delayDuration);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  const handleFocus = () => {
    if (disabled || !content) return;
    updateCoords();
    setOpen(true);
  };

  const handleBlur = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => {
      updateCoords();
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!content || disabled) {
    return <>{children}</>;
  }

  if (strategy === "css") {
    return (
      <span className="group relative inline-flex items-center">
        {children}
        <span
          role="tooltip"
          id={tooltipId}
          className={cn(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded bg-surface2 px-2 py-0.5 font-sans text-nano font-medium leading-snug text-ink shadow-md transition-opacity duration-150 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            side === "top" && "-top-6 left-1/2 -translate-x-1/2",
            side === "bottom" && "-bottom-6 left-1/2 -translate-x-1/2",
            side === "left" && "right-full top-1/2 -translate-y-1/2 mr-1.5",
            side === "right" && "left-full top-1/2 -translate-y-1/2 ml-1.5",
            className,
          )}
        >
          {content}
        </span>
      </span>
    );
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              id={tooltipId}
              style={{
                position: "absolute",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform:
                  side === "top"
                    ? "translate(-50%, -100%)"
                    : side === "bottom"
                    ? "translate(-50%, 0)"
                    : side === "left"
                    ? "translate(-100%, -50%)"
                    : "translate(0, -50%)",
              }}
              className={cn(
                "pointer-events-none z-50 max-w-56 rounded bg-surface2 px-2 py-0.5 text-nano font-medium leading-snug text-ink shadow-md border border-line animate-rise select-none",
                className,
              )}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
