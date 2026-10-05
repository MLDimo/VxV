import type { ReactNode } from "react";

/** The head of a screen (§2.5): kicker in the place's color, title, then the state badges on the right. */
export function ScreenHeader({
  kicker,
  kickerClassName = "text-sakura",
  title,
  children,
}: {
  kicker?: string;
  kickerClassName?: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <p className={`kicker ${kickerClassName}`}>{kicker}</p>}
        <h1 className="mt-1 font-pixel text-[30px] leading-none font-bold text-ivory">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
