import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const user = (body.username ?? "").trim().toLowerCase();
    const pass = (body.password ?? "").trim();

    // Credenciales autorizadas para el Doctor / Auditor Médico
    const isValid =
      (user === "doctor@salud.pe" || user === "doctor" || user === "admin") &&
      (pass === "medico2026" || pass === "admin123");

    if (!isValid) {
      return NextResponse.json({ error: "Credenciales de acceso médico incorrectas. Acceso restringido a personal de salud colegiado." }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      doctor: {
        name: "Dr. Alejandro Valdivia M.",
        cmp: "CMP 58291 · RNE 24102",
        role: "Médico Auditor & Especialista en Triaje",
        hospital: "Centro Clínico SaludAI"
      }
    });
  } catch {
    return NextResponse.json({ error: "Error en la autenticación" }, { status: 500 });
  }
}
