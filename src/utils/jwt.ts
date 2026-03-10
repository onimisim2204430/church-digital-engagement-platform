/**
 * JWT utility helpers.
 *
 * Decodes the payload of a JWT access token WITHOUT verifying the signature
 * (signature verification is the server's job).  Used purely to read the
 * custom claims (role, permissions) from the token on the client side.
 */

import { JwtPayload } from '../types/auth.types';

/**
 * Base64url-decode a JWT segment into a plain string.
 */
function base64UrlDecode(input: string): string {
  // Replace URL-safe chars and add padding
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Decode the payload of a JWT string.
 *
 * Returns `null` if the token is malformed.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const raw = base64UrlDecode(parts[1]);
    return JSON.parse(raw) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extract the ``permissions`` list from an access token.
 *
 * Returns an empty array if:
 * - The token is missing / malformed
 * - The token does not carry a ``permissions`` claim (older tokens)
 */
export function getPermissionsFromToken(accessToken: string | null | undefined): string[] {
  if (!accessToken) return [];
  const payload = decodeJwt(accessToken);
  if (!payload) return [];
  return Array.isArray(payload.permissions) ? payload.permissions : [];
}

/**
 * Extract the ``role`` string from an access token.  Returns
 * ``undefined`` if the claim is absent.
 */
export function getRoleFromToken(accessToken: string | null | undefined): string | undefined {
  if (!accessToken) return undefined;
  return decodeJwt(accessToken)?.role;
}
