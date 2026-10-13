"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function RouteFocus() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousRoute = useRef(`${pathname}?${searchParams.toString()}`);

  useEffect(() => {
    const route = `${pathname}?${searchParams.toString()}`;
    if (previousRoute.current === route) return;
    previousRoute.current = route;

    // Skip focus management if there is a hash fragment
    if (window.location.hash) {
      return;
    }

    // Move focus into the destination after the route has committed. A heading
    // gives the visitor context; main remains the fallback for sparse pages.
    const frame = requestAnimationFrame(() => {
      // A modal or studio return mount owns its focus until dismissal.
      if (document.querySelector('dialog[open]') || new URLSearchParams(window.location.search).get("studio") === "return") return;
      const main = document.getElementById("main-content");
      if (!main) return;
      
      const heading = main.querySelector("h1, h2, h3") as HTMLElement | null;
      if (heading) {
        if (!heading.hasAttribute("tabindex")) {
          heading.setAttribute("tabindex", "-1");
        }
        heading.focus({ preventScroll: true });
      } else {
        if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  return null;
}
