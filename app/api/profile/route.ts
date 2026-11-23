import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/lib/server/db";
import { deleteAccount, getProfile, publicProfile, updateProfile } from "@/lib/server/repo";
import { devAuth, readJson, withUser } from "@/lib/server/session";
import { profileInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const GET = withUser(async (userId) => {
  return NextResponse.json({ profile: publicProfile(await getProfile(await getDb(), userId)) });
});

export const PUT = withUser(async (userId, req: Request) => {
  const db = await getDb();
  await updateProfile(db, userId, profileInput(await readJson(req)));
  return NextResponse.json({ profile: publicProfile(await getProfile(db, userId)) });
});

/** Deletes every row of the user and the Clerk account. */
export const DELETE = withUser(async (userId) => {
  await deleteAccount(await getDb(), userId);
  if (!devAuth()) await (await clerkClient()).users.deleteUser(userId);
  return NextResponse.json({ ok: true });
});
