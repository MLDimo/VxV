import { ValidationError } from "@vxv/server";
import { z } from "zod";
import { getApplication } from "@/server/application";
import { asCompanion, bearerToken, errorResponse } from "@/server/companionApi";

const linkSchema = z.object({ code: z.string().min(1), verifier: z.string().min(1) });

/** The companion exchanges the link code the browser gave it, with its PKCE verifier, for its token. */
export async function POST(request: Request): Promise<Response> {
  const body = linkSchema.safeParse(await request.json().catch(() => undefined));
  if (!body.success) {
    return errorResponse("Demande de liaison illisible.");
  }
  try {
    const { token, member } = await getApplication().companion.finishLink(body.data.code, body.data.verifier);
    return Response.json({ token, member: { name: member.discordName, roles: member.roles } });
  } catch (error) {
    if (error instanceof ValidationError) {
      return errorResponse(error.message);
    }
    throw error;
  }
}

/** The companion forgets the member: its token stops working. */
export async function DELETE(request: Request): Promise<Response> {
  return asCompanion(request, async () => {
    await getApplication().companion.unlink(bearerToken(request) ?? "");
    return new Response(null, { status: 204 });
  });
}
