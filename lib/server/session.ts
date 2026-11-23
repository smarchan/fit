import "server-only";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Invalid } from "../validate";

/** Local testing without Clerk keys: `DEV_FAKE_AUTH=1 next dev`. Impossible in production builds. */
export const devAuth = () => process.env.NODE_ENV === "development" && process.env.DEV_FAKE_AUTH === "1";

/** userId of the signed-in user, or a 401 response. Never trust a user id sent by the client. */
export async function requireUser(): Promise<string | NextResponse> {
  if (devAuth()) return "dev-user";
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  return userId;
}

export { Invalid as BadRequest } from "../validate";

export function fail(e: unknown) {
  if (e instanceof Invalid) return NextResponse.json({ error: e.message }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: "Algo ha fallado. Inténtalo de nuevo." }, { status: 500 });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Wraps a handler with auth + error handling. */
export function withUser<A extends unknown[]>(fn: (userId: string, ...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const u = await requireUser();
    if (typeof u !== "string") return u;
    try {
      return await fn(u, ...args);
    } catch (e) {
      return fail(e);
    }
  };
}
