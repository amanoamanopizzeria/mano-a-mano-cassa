import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    app: "mano-a-mano-cassa",
    ora: new Date().toISOString(),
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
