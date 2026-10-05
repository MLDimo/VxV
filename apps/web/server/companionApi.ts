import "server-only";
import { ApplicationError, type Member } from "@vxv/server";
import { getApplication } from "./application";

const BEARER = /^Bearer (\S+)$/;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;

/** The token the companion sends in the Authorization header. */
export function bearerToken(request: Request): string | undefined {
  return BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
}

/** An error the companion shows as is (in French). */
export function errorResponse(message: string, status = HTTP_BAD_REQUEST): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Runs the work for the member the companion acts for. Without a valid token, the companion is told to link again;
 * a refusal of the application becomes its message.
 */
export async function asCompanion(request: Request, work: (member: Member) => Promise<Response>): Promise<Response> {
  const token = bearerToken(request);
  const member = token === undefined ? undefined : await getApplication().companion.authenticate(token);
  if (member === undefined) {
    return errorResponse("Le compagnon n'est plus relié à ton compte : relie-le de nouveau.", HTTP_UNAUTHORIZED);
  }
  try {
    return await work(member);
  } catch (error) {
    if (error instanceof ApplicationError) {
      return errorResponse(error.message);
    }
    throw error;
  }
}
