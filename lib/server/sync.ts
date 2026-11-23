import "server-only";
import type { Db } from "./db";
import { decrypt, encrypt } from "./crypto";
import { getProfile, importedRanges, updateProfile, upsertExternal, type ProfileRow } from "./repo";
import { mapHevy, mapStrava, overlaps, type StravaActivity } from "../integrations";
import { weightOf } from "../energy";

const MIN_INTERVAL_MS = 10 * 60 * 1000;
const FIRST_SYNC_DAYS = 30;

export interface SyncResult {
  hevy: number;
  strava: number;
  errors: string[];
  skipped?: boolean;
}

export async function syncAll(db: Db, userId: string, force = false): Promise<SyncResult> {
  const p = await getProfile(db, userId);
  const res: SyncResult = { hevy: 0, strava: 0, errors: [] };
  if (!p.hevy && !p.strava) return res;
  if (!force && p.syncedAt && Date.now() - Date.parse(p.syncedAt) < MIN_INTERVAL_MS) return { ...res, skipped: true };
  // Claim the slot first so parallel tabs don't sync twice.
  await updateProfile(db, userId, { syncedAt: new Date().toISOString() });
  const since = p.syncedAt ? Date.parse(p.syncedAt) - 3 * 86400000 : Date.now() - FIRST_SYNC_DAYS * 86400000;

  if (p.hevyKeyEnc) {
    try {
      res.hevy = await syncHevy(db, userId, p, since);
    } catch (e) {
      res.errors.push(e instanceof Error ? e.message : "Hevy no responde");
    }
  }
  if (p.stravaRefreshEnc) {
    try {
      res.strava = await syncStrava(db, userId, p, since);
    } catch (e) {
      res.errors.push(e instanceof Error ? e.message : "Strava no responde");
    }
  }
  return res;
}

/* ---------------- Hevy ---------------- */

export async function hevyFetch(key: string, path: string): Promise<Response> {
  return fetch(`https://api.hevyapp.com${path}`, {
    headers: { "api-key": key, accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
}

async function syncHevy(db: Db, userId: string, p: ProfileRow, since: number): Promise<number> {
  const key = decrypt(p.hevyKeyEnc!);
  if (!key) throw new Error("Vuelve a vincular Hevy");
  const kg = weightOf(p);
  let count = 0;
  for (let page = 1; page <= 5; page++) {
    const r = await hevyFetch(key, `/v1/workouts?page=${page}&pageSize=10`);
    if (r.status === 401 || r.status === 403) throw new Error("Hevy rechazó la clave (¿sigues con Hevy Pro?)");
    if (r.status === 404) break; // page beyond the last one
    if (!r.ok) throw new Error("Hevy no responde");
    const data = (await r.json()) as { workouts?: Parameters<typeof mapHevy>[0][]; page_count?: number };
    const list = data.workouts ?? [];
    let older = false;
    for (const w of list) {
      if (Date.parse(w.start_time) < since) {
        older = true;
        continue;
      }
      const m = mapHevy(w, kg, p.tz);
      if (m) {
        await upsertExternal(db, userId, m);
        count++;
      }
    }
    if (older || !list.length || page >= (data.page_count ?? 1)) break;
  }
  return count;
}

/* ---------------- Strava ---------------- */

export function stravaConfigured() {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

export async function stravaToken(params: Record<string, string>): Promise<StravaTokens> {
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.STRAVA_CLIENT_ID!, client_secret: process.env.STRAVA_CLIENT_SECRET!, ...params }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const err = new Error(r.status === 400 || r.status === 401 ? "Strava revocó el acceso: vuelve a vincularlo" : "Strava no responde");
    (err as Error & { status?: number }).status = r.status;
    throw err;
  }
  return (await r.json()) as StravaTokens;
}

export async function saveStravaTokens(db: Db, userId: string, t: StravaTokens) {
  const patch: Record<string, unknown> = {
    stravaAccessEnc: encrypt(t.access_token),
    stravaRefreshEnc: encrypt(t.refresh_token),
    stravaExpiresAt: t.expires_at,
  };
  if (t.athlete) {
    patch.stravaAthleteId = t.athlete.id;
    patch.stravaName = [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(" ") || "Strava";
  }
  await updateProfile(db, userId, patch);
}

async function freshAccess(db: Db, userId: string, p: ProfileRow): Promise<string> {
  const access = p.stravaAccessEnc ? decrypt(p.stravaAccessEnc) : null;
  if (access && p.stravaExpiresAt && p.stravaExpiresAt * 1000 > Date.now() + 120000) return access;
  const refresh = decrypt(p.stravaRefreshEnc!);
  if (!refresh) throw new Error("Vuelve a vincular Strava");
  try {
    const t = await stravaToken({ grant_type: "refresh_token", refresh_token: refresh });
    await saveStravaTokens(db, userId, t);
    return t.access_token;
  } catch (e) {
    if ((e as { status?: number }).status === 400 || (e as { status?: number }).status === 401) {
      await clearStrava(db, userId);
    }
    throw e;
  }
}

export async function clearStrava(db: Db, userId: string) {
  await updateProfile(db, userId, { stravaAccessEnc: null, stravaRefreshEnc: null, stravaExpiresAt: null, stravaAthleteId: null, stravaName: null });
}

async function stravaGet<T>(token: string, path: string): Promise<T> {
  const r = await fetch(`https://www.strava.com/api/v3${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (r.status === 429) throw new Error("Strava: demasiadas peticiones, prueba en un rato");
  if (!r.ok) throw new Error("Strava no responde");
  return (await r.json()) as T;
}

async function syncStrava(db: Db, userId: string, p: ProfileRow, since: number): Promise<number> {
  if (!stravaConfigured()) return 0;
  const token = await freshAccess(db, userId, p);
  const kg = weightOf(p);
  const list = await stravaGet<StravaActivity[]>(token, `/athlete/activities?after=${Math.floor(since / 1000)}&per_page=60`);
  const known = new Set(
    (await db.query("SELECT external_id FROM workouts WHERE user_id = $1 AND source = 'strava'", [userId])).map((r) => String(r.external_id)),
  );
  const hevyRanges = await importedRanges(db, userId, "hevy", new Date(since - 86400000).toISOString());
  let details = 0;
  let count = 0;
  for (let a of list) {
    // The summary has no calories: the detail does. Fetch it once, for new activities, within a small budget.
    if (!known.has(String(a.id)) && !a.kilojoules && details < 8) {
      try {
        a = { ...a, ...(await stravaGet<StravaActivity>(token, `/activities/${a.id}`)) };
        details++;
      } catch {
        /* keep the summary */
      }
    }
    const m = mapStrava(a, kg);
    if (!m) continue;
    // A gym session already imported from Hevy (e.g. also recorded on a watch) is not counted twice.
    if (m.type === "gimnasio" && m.startAt && overlaps(m.startAt, m.minutes, hevyRanges)) continue;
    await upsertExternal(db, userId, m);
    count++;
  }
  return count;
}
