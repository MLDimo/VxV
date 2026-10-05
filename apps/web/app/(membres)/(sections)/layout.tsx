import type { ReactNode } from "react";

/** The inner screens: a centered column under the header. */
export default function SectionsLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>;
}
