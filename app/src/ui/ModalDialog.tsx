"use client";
import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

export interface ModalDialogProps {
  children: ReactNode;
  label: string;
  className?: string | undefined;
  testId?: string | undefined;
  onClose: () => void;
  onEscape?: (() => void) | undefined;
  returnFocus?: (() => HTMLElement | null) | undefined;
  initialFocus?: RefObject<HTMLElement | null> | undefined;
}

function canReceiveFocus(target: HTMLElement | null | undefined): target is HTMLElement {
  if (!target?.isConnected || target.matches(":disabled") || target.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(target);
  return style.display !== "none" && style.visibility !== "hidden";
}

/** Native top-layer modal with an explicit tab loop for consistent focus containment. */
export function ModalDialog({ children, label, className, testId, onClose, onEscape, returnFocus, initialFocus }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const latest = useRef({ onClose, onEscape, returnFocus, initialFocus });
  useLayoutEffect(() => { latest.current = { onClose, onEscape, returnFocus, initialFocus }; });
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    const preferred = latest.current.initialFocus?.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(
      '[autofocus], [data-dialog-initial-focus], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    const focusTarget = canReceiveFocus(preferred) ? preferred : canReceiveFocus(firstFocusable) ? firstFocusable : dialog;
    focusTarget?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      const usableInvoker = canReceiveFocus(invoker) && invoker.tagName !== "BODY" && invoker.tagName !== "CANVAS"
        && !invoker.hasAttribute("data-studio-focus-root") ? invoker : null;
      const requested = latest.current.returnFocus?.() ?? null;
      const fallbackHost = document.querySelector<HTMLElement>('[data-testid="world-stage-container"]')
        ?? document.querySelector<HTMLElement>("main") ?? null;
      const target = usableInvoker ?? (canReceiveFocus(requested) ? requested : null)
        ?? (canReceiveFocus(fallbackHost) ? fallbackHost : null);
      target?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialogRef} className={className} tabIndex={-1} aria-label={label} aria-modal="true" data-testid={testId} onCancel={(event) => {
    event.preventDefault();
    (latest.current.onEscape ?? latest.current.onClose)();
  }} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter(canReceiveFocus);
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }}>{children}</dialog>;
}
