"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

/**
 * The burger menu under 1,400 px. The header stays on screen from one page to the next: the menu closes itself once
 * one of its links is chosen.
 */
export function BurgerMenu({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const closeOnLink = (event: MouseEvent<HTMLDivElement>) => {
    if (menu.current !== null && event.target instanceof Element && event.target.closest("a") !== null) {
      menu.current.open = false;
    }
  };
  return (
    <details ref={menu} className="group ml-auto min-[1400px]:hidden">
      <summary
        className="flex size-12 cursor-pointer list-none items-center justify-center bg-wood ring-pixel"
        aria-label="Menu"
      >
        <svg viewBox="0 0 15 15" className="size-5 fill-parchment group-open:fill-gold" aria-hidden="true">
          <rect className="group-open:hidden" x="0" y="1" width="15" height="3" />
          <rect className="group-open:hidden" x="0" y="6" width="15" height="3" />
          <rect className="group-open:hidden" x="0" y="11" width="15" height="3" />
          <rect className="hidden group-open:block" x="6" y="6" width="3" height="3" />
          <rect className="hidden group-open:block" x="0" y="0" width="3" height="3" />
          <rect className="hidden group-open:block" x="12" y="0" width="3" height="3" />
          <rect className="hidden group-open:block" x="0" y="12" width="3" height="3" />
          <rect className="hidden group-open:block" x="12" y="12" width="3" height="3" />
          <rect className="hidden group-open:block" x="3" y="3" width="3" height="3" />
          <rect className="hidden group-open:block" x="9" y="3" width="3" height="3" />
          <rect className="hidden group-open:block" x="3" y="9" width="3" height="3" />
          <rect className="hidden group-open:block" x="9" y="9" width="3" height="3" />
        </svg>
      </summary>
      <div
        onClick={closeOnLink}
        className="absolute inset-x-0 top-[72px] z-20 flex flex-col gap-4 bg-[#24160d] p-6 [&>a]:border-b-2 [&>a]:border-dashed [&>a]:border-beam [&>a]:pb-3 [&>a]:text-[22px]"
      >
        {children}
      </div>
    </details>
  );
}
