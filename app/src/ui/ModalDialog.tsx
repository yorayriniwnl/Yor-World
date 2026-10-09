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

/** Native top-layer modal: background exclusion and focus containment are owned by the browser. */
export function ModalDialog({ children, label, className, testId, onClose, onEscape, returnFocus, initialFocus }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const latest = useRef({ onClose, onEscape, returnFocus, initialFocus });
  useLayoutEffect(() => { latest.current = { onClose, onEscape, returnFocus, initialFocus }; });
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const invoker = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    latest.current.initialFocus?.current?.focus();
    return () => {
      dialog?.close();
      const usableInvoker = invoker?.isConnected && invoker.tagName !== "BODY" && invoker.tagName !== "CANVAS" && !invoker.hasAttribute("data-studio-focus-root") ? invoker : null;
      const fallbackHost = document.querySelector<HTMLElement>('[data-testid="world-stage-container"]') || document.querySelector<HTMLElement>('canvas') || null;
      const target = usableInvoker ?? latest.current.returnFocus?.() ?? fallbackHost;
      if (target?.isConnected) target.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialogRef} className={className} aria-label={label} aria-modal="true" data-testid={testId} onCancel={(event) => {
    event.preventDefault();
    (latest.current.onEscape ?? latest.current.onClose)();
  }}>{children}</dialog>;
}
