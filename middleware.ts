import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/privacidad", "/robots.txt", "/manifest.webmanifest", "/icon(.*)", "/apple-icon(.*)", "/api/ingest(.*)"]);
const isApi = createRouteMatcher(["/api(.*)"]);

/** Local testing without Clerk keys (`DEV_FAKE_AUTH=1 next dev`). Never active in production builds. */
const fakeAuth = process.env.NODE_ENV === "development" && process.env.DEV_FAKE_AUTH === "1";

export default fakeAuth
  ? () => NextResponse.next()
  : clerkMiddleware(
      async (auth, req) => {
        if (isPublic(req)) return;
        if (isApi(req)) {
          const { userId } = await auth();
          if (!userId) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
          return;
        }
        await auth.protect();
      },
      { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
    );

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
