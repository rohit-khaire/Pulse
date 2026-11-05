'use client';

/**
 * Accessible dialog shell for every modal and bottom sheet:
 *  - role="dialog" + aria-modal + accessible name
 *  - focus moves in, Tab is trapped, focus returns to the opener on close
 *  - Escape and backdrop tap close it
 *  - background scroll is locked while open
 * React only, no other dependency.
 */
import React, { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let scrollLocks = 0;

function lockScroll() {
  if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
}
function unlockScroll() {
  if (--scrollLocks <= 0) {
    scrollLocks = 0;
    document.body.style.overflow = '';
  }
}

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0
  );
}

/** Pure Tab-wrap decision, exported for tests. */
export function wrapTarget(
  index: number,
  count: number,
  shift: boolean
): 'first' | 'last' | null {
  if (count === 0) return 'first';
  if (shift && index <= 0) return 'last';
  if (!shift && index === count - 1) return 'first';
  return null;
}

export function useDialogA11y(
  ref: React.RefObject<HTMLElement | null>,
  onClose?: () => void,
  opts: { lockBody?: boolean } = { lockBody: true }
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const opener = document.activeElement as HTMLElement | null;
    if (opts.lockBody !== false) lockScroll();

    const raf = requestAnimationFrame(() => {
      const items = getFocusable(node);
      (items[0] ?? node).focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable(node);
      const idx = items.indexOf(document.activeElement as HTMLElement);
      const w = wrapTarget(idx, items.length, e.shiftKey);
      if (w) {
        e.preventDefault();
        (w === 'first' ? items[0] ?? node : items[items.length - 1]).focus();
      }
    };
    node.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(raf);
      node.removeEventListener('keydown', onKey);
      if (opts.lockBody !== false) unlockScroll();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

interface DialogShellProps {
  onClose: () => void;
  label: string;
  /** classes for the backdrop (positioning, blur, colour) */
  className?: string;
  children: ReactNode;
}

export function DialogShell({ onClose, label, className = '', children }: DialogShellProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useDialogA11y(ref, onClose);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className={className}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
