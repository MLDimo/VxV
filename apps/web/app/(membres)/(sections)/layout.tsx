import type { ReactNode } from "react";
import { PlaceBackdrop } from "@/components/PlaceBackdrop";
import { tavernPicture } from "@/components/tavernPicture";

/** The inner screens: a centered column under the header, over their place's background. */
export default function SectionsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PlaceBackdrop picture={tavernPicture(new Date())} />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </>
  );
}
