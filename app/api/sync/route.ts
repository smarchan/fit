import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { readJson, withUser } from "@/lib/server/session";
import { syncAll } from "@/lib/server/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const POST = withUser(async (userId, req: Request) => {
  const force = Boolean((await readJson(req)).force);
  return NextResponse.json(await syncAll(await getDb(), userId, force));
});
