"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteFocus() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    // Skip focus management if there is a hash fragment
    if (window.location.hash) {
      return;
    }

    // Focus the main content container or a heading inside it
    // Use requestAnimationFrame to let DOM update after navigation
    requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      if (!main) return;
      
      const heading = main.querySelector("h1, h2, h3") as HTMLElement;
      if (heading) {
        if (!heading.hasAttribute("tabindex")) {
          heading.setAttribute("tabindex", "-1");
        }
        heading.focus({ preventScroll: true });
      } else {
        main.focus({ preventScroll: true });
      }
    });
  }, [pathname, searchParams]);

  return null;
}
