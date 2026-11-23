import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { addEntry } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { entryInput } from "@/lib/validate";

export const POST = withUser(async (userId, req: Request) => {
  const e = entryInput(await readJson(req));
  const entry = await addEntry(await getDb(), userId, e);
  return NextResponse.json({ entry });
});
