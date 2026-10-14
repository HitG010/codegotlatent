import { OAuth2Client } from "google-auth-library";

export interface GoogleIdentity {
  googleId: string;
  email: string;
  name: string | null;
}

/** Checks a Google ID token and returns who it belongs to; throws if it isn't valid for us. */
export type VerifyGoogleToken = (idToken: string) => Promise<GoogleIdentity>;

export function createGoogleVerifier(clientId: string): VerifyGoogleToken {
  const client = new OAuth2Client(clientId);
  return async (idToken) => {
    // Checks signature, expiry, issuer, and that the token was minted for our client ID
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error("Google token carries no account");
    if (!payload.email_verified) throw new Error("Google account email isn't verified");
    return { googleId: payload.sub, email: payload.email.toLowerCase(), name: payload.name ?? null };
  };
}
