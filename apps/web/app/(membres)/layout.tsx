import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireMember } from "@/server/session";

/** Every page of this group is reserved to signed-in guild members. */
export default async function MembersLayout({ children }: { children: ReactNode }) {
  const member = await requireMember();
  return (
    <>
      <SiteHeader member={member} />
      <main>{children}</main>
    </>
  );
}
