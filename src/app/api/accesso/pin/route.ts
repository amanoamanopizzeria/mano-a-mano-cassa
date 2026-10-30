// Accesso col PIN di 4 cifre per rider e postazioni (Edoardo, 30/10/2026, risposta B). POST { nome, pin }.
// Il PIN lo controlla il database (pin_entra: impronta bcrypt, fermo dopo 5 e dopo 10 errori), chiamabile
// solo con la chiave service_role, quindi solo da qui. Se va bene si crea un link di accesso monouso per
// quell'utenza e si rende al browser solo il suo token: è il browser a chiudere l'accesso con verifyOtp.
// Nessuna email parte. L'admin non entra col PIN.
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { nome, pin } = (await req.json().catch(() => ({}))) as { nome?: string; pin?: string };
  if (!nome || !/^[a-z0-9_-]{2,20}$/i.test(nome.trim()) || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ errore: "Nome o PIN non validi." }, { status: 422 });
  }
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc("pin_entra", { p_nome: nome.trim().toLowerCase(), p_pin: pin });
  if (error) {
    const spento = /pin_entra/.test(error.message);
    return NextResponse.json({ errore: spento ? "L'accesso col PIN non è ancora acceso." : "Accesso non riuscito." }, { status: spento ? 503 : 500 });
  }
  const r = data as { esito: string; email?: string; messaggio?: string };
  if (r.esito === "fermo") return NextResponse.json({ errore: r.messaggio }, { status: 429 });
  if (r.esito !== "ok" || !r.email) return NextResponse.json({ errore: "Nome o PIN sbagliati." }, { status: 401 });
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email: r.email });
  const token = link.data?.properties?.hashed_token;
  if (link.error || !token) return NextResponse.json({ errore: "Accesso non riuscito." }, { status: 500 });
  return NextResponse.json({ token });
}
