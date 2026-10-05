/** Short-lived cookies holding the OAuth state and PKCE verifier between the two halves of the sign-in. */
export const OAUTH_STATE_COOKIE = "vxv_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "vxv_oauth_verifier";
/** The page to show once signed in, when the sign-in interrupted the way to it. */
export const OAUTH_NEXT_COOKIE = "vxv_oauth_next";
export const OAUTH_COOKIE_SECONDS = 10 * 60;
