import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** Third-party tokens (Hevy key, Strava tokens) are stored encrypted with AES-256-GCM. */
function key(): Buffer {
  const secret = process.env.APP_SECRET || process.env.CLERK_SECRET_KEY || (process.env.NODE_ENV === "development" ? "dev-secret" : "");
  if (!secret) throw new Error("Falta APP_SECRET");
  return createHash("sha256").update("fit:" + secret).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(token: string): string | null {
  try {
    const [iv, tag, body] = token.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(body), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(24).toString("base64url");
export const newId = () => randomBytes(12).toString("base64url");
