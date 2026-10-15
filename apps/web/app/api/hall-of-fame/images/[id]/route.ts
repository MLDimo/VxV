import { getApplication } from "@/server/application";
import { getCurrentMember } from "@/server/session";

/** A capture of the Hall of Fame, for a signed-in member who may see its painting. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  const image = member && (await getApplication().legend.image(member, (await params).id));
  if (image === undefined) {
    return new Response("Introuvable", { status: 404 });
  }
  return new Response(Buffer.from(image.bytes), {
    headers: { "Content-Type": image.contentType, "Cache-Control": "private, max-age=86400, immutable" },
  });
}
