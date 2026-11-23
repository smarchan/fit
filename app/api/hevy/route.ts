import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { encrypt } from "@/lib/server/crypto";
import { removeSource, updateProfile } from "@/lib/server/repo";
import { readJson, withUser } from "@/lib/server/session";
import { hevyFetch, syncAll } from "@/lib/server/sync";

/** Saves the user's Hevy API key (hevy.com/settings?developer, needs Hevy Pro) after checking it works. */
export const PUT = withUser(async (userId, req: Request) => {
  const key = String((await readJson(req)).key ?? "").trim();
  if (!/^[0-9a-f-]{32,40}$/i.test(key)) return NextResponse.json({ error: "La clave no tiene el formato de Hevy" }, { status: 400 });
  let r: Response;
  try {
    r = await hevyFetch(key, "/v1/user/info");
  } catch {
    return NextResponse.json({ error: "Hevy no responde. Prueba otra vez." }, { status: 502 });
  }
  if (r.status === 401 || r.status === 403) return NextResponse.json({ error: "Clave no válida o cuenta sin Hevy Pro" }, { status: 400 });
  if (!r.ok) return NextResponse.json({ error: "Hevy no responde. Prueba otra vez." }, { status: 502 });
  const db = await getDb();
  await updateProfile(db, userId, { hevyKeyEnc: encrypt(key), syncedAt: null });
  const sync = await syncAll(db, userId, true);
  return NextResponse.json({ ok: true, sync });
});

export const DELETE = withUser(async (userId) => {
  const db = await getDb();
  await updateProfile(db, userId, { hevyKeyEnc: null });
  await removeSource(db, userId, "hevy");
  return NextResponse.json({ ok: true });
});
