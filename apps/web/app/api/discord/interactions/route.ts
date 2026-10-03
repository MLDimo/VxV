import { getInteractionHandler } from "@/server/bot";

/** Discord's interactions endpoint, registered on the Developer Portal ("Interactions Endpoint URL"). */
export async function POST(request: Request): Promise<Response> {
  const reply = await getInteractionHandler()({
    body: await request.text(),
    signature: request.headers.get("x-signature-ed25519"),
    timestamp: request.headers.get("x-signature-timestamp"),
  });
  return Response.json(reply.body, { status: reply.status });
}
