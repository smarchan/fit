import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { lookupBarcode } from "@/lib/server/off";
import { withUser } from "@/lib/server/session";
import { GENERIC } from "@/lib/generic";
import { isBarcode } from "@/lib/off";

type Ctx = { params: Promise<{ code: string }> };

export const GET = withUser(async (_userId, _req: Request, ctx: Ctx) => {
  const { code } = await ctx.params;
  const id = decodeURIComponent(code);
  if (id.startsWith("g:")) {
    const f = GENERIC.find((g) => g.id === id);
    return f ? NextResponse.json({ food: f }) : NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (!isBarcode(id)) return NextResponse.json({ error: "Código no válido" }, { status: 400 });
  const food = await lookupBarcode(await getDb(), id);
  if (food === "error") return NextResponse.json({ error: "Open Food Facts no responde. Prueba otra vez." }, { status: 502 });
  if (!food) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  return NextResponse.json({ food });
});
