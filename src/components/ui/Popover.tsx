"use client";

/*
 * Compound popover primitive family.
 *
 *   <Popover.Root onOpenChange={…}>
 *     <Popover.Trigger aria-haspopup="listbox">…</Popover.Trigger>
 *     <Popover.Content className="…" role="listbox">…</Popover.Content>
 *   </Popover.Root>
 *
 * Behavior contract (shared by the model picker, the session ⋯ menu and any
 * future overlay):
 *   • Outside pointer-down dismisses (useOutsideClick).
 *   • Escape closes and restores focus to the trigger.
 *   • `aria-expanded` / `aria-controls` are wired automatically.
 *   • `role="menu"` content autofocuses its first item on open.
 *   • Rendering stays SSR-safe: content is simply not mounted while closed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Close and restore focus to the trigger (Escape/select semantics). */
  dismiss: () => void;
  triggerId: string;
  contentId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext(component: string): PopoverContextValue {
  const context = useContext(PopoverContext);
  if (!context) throw new Error(`${component} must be used inside <Popover.Root>`);
  return context;
}

/** Access the surrounding popover state (open, dismiss, refs, ids). */
export function usePopover(): PopoverContextValue {
  return usePopoverContext("usePopover");
}

/** Dismiss when a pointer-down lands outside the listed elements. */
export function useOutsideClick(
  onOutside: () => void,
  refs: React.RefObject<HTMLElement | null>[],
  active: boolean = true,
) {
  const onOutsideRef = useRef(onOutside);
  useEffect(() => {
    onOutsideRef.current = onOutside;
  }, [onOutside]);
  useEffect(() => {
    if (!active) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      onOutsideRef.current();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

export function PopoverRoot({
  children,
  onOpenChange,
}: {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const triggerId = useId();
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  const dismiss = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, [setOpen]);

  // Global Escape capture: close and return focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, setOpen]);

  useOutsideClick(() => setOpen(false), [triggerRef, contentRef], open);

  return (
    <PopoverContext.Provider
      value={{ open, setOpen, toggle, dismiss, triggerId, contentId, triggerRef, contentRef }}
    >
      {children}
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  className,
  disabled,
  title,
  hasPopup,
  onClick,
  onKeyDown,
  onContextMenu,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
  hasPopup?: "menu" | "listbox" | "dialog" | "true";
  /** Runs before the built-in toggle (e.g. stopPropagation in rows). */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLButtonElement>;
  onContextMenu?: React.MouseEventHandler<HTMLButtonElement>;
}) {
  const { open, toggle, triggerId, contentId, triggerRef } = usePopoverContext("Popover.Trigger");
  return (
    <button
      ref={triggerRef}
      id={triggerId}
      type="button"
      className={className}
      disabled={disabled}
      title={title}
      aria-haspopup={hasPopup}
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggle();
      }}
      onKeyDown={onKeyDown}
      onContextMenu={onContextMenu}
      data-state={open ? "open" : "closed"}
    >
      {children}
    </button>
  );
}

export function PopoverContent({
  children,
  className = "",
  role,
  ariaLabel,
  onKeyDown,
}: {
  children: ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}) {
  const { open, contentId, triggerId, contentRef } = usePopoverContext("Popover.Content");

  // Menu role: move focus into the first menu item when the menu opens.
  useEffect(() => {
    if (!open || role !== "menu") return;
    const container = contentRef.current;
    if (!container) return;
    const firstItem = container.querySelector<HTMLElement>('[role^="menuitem"]:not([disabled])');
    firstItem?.focus();
  }, [open, role, contentRef]);

  if (!open) return null;
  return (
    <div
      ref={contentRef}
      id={contentId}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={role && !ariaLabel ? triggerId : undefined}
      tabIndex={-1}
      className={className}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}

/**
 * Keyboard support for list/menu semantics inside a popover body:
 * ArrowUp/ArrowDown move focus among items (wrapping), Home/End jump to the
 * ends. Attach via `onKeyDown` on the `Popover.Content`.
 */
export function handleMenuItemKeys(event: React.KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const container = event.currentTarget;
  const items = Array.from(
    container.querySelectorAll<HTMLElement>('[role^="menuitem"], [role="option"]'),
  ).filter((item) => !item.hasAttribute("disabled"));
  if (!items.length) return;
  event.preventDefault();
  const current = items.indexOf(document.activeElement as HTMLElement);
  let next = current;
  switch (event.key) {
    case "Home":
      next = 0;
      break;
    case "End":
      next = items.length - 1;
      break;
    case "ArrowDown":
      next = current === -1 || current === items.length - 1 ? 0 : current + 1;
      break;
    case "ArrowUp":
      next = current <= 0 ? items.length - 1 : current - 1;
      break;
  }
  items[next]?.focus();
}

export const Popover = {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
};
