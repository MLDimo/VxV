import type { ReactNode } from "react";
import { MemberNav } from "@/components/MemberNav";
import { requireMember } from "@/server/session";

/** Every page of this group is reserved to signed-in guild members. */
export default async function MembersLayout({ children }: { children: ReactNode }) {
  const member = await requireMember();
  return (
    <>
      <MemberNav member={member} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </>
  );
}
