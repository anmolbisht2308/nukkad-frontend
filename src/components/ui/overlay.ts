"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/* One set of rules for every dropdown and popup in the app:
   - opening a popup (modal) closes any open dropdown behind it
   - Esc closes the top-most thing
   - dropdowns close on a tap outside and when the page changes
   - the page behind a popup doesn't scroll */

const CLOSE_MENUS = "nukkad:close-menus";
export const closeMenus = () => window.dispatchEvent(new Event(CLOSE_MENUS));

let openModals = 0;

/** For dropdown menus. Attach the returned ref to the element wrapping the button and the menu. */
export function useMenu<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  const path = usePathname();
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  // close when the route changes
  useEffect(() => {
    closeRef.current();
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const shut = () => closeRef.current();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) shut();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals === 0) shut();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener(CLOSE_MENUS, shut);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(CLOSE_MENUS, shut);
    };
  }, [open]);

  return ref;
}

/** For popups (modals and bottom sheets). Call it inside the component that only renders while open. */
export function useModal(onClose?: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    closeMenus();
    openModals++;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      openModals--;
      if (openModals === 0) html.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);
}

/** Drop inside a popup's open branch: <ModalEffects onClose={…} /> */
export function ModalEffects({ onClose }: { onClose?: () => void }) {
  useModal(onClose);
  return null;
}
