import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Safe class composition (logic-freeze instruction #5): clsx handles
 * conditionals, tailwind-merge resolves conflicting utilities so a
 * prop-passed override wins without ever colliding.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
