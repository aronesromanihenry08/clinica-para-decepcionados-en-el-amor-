import { NextResponse } from "next/server";
import { handleMedicalConversation, ChatMessage } from "@/lib/conversation";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { messages?: ChatMessage[]; model?: string };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "La conversación debe contener al menos un mensaje." }, { status: 400 });
    }
    return NextResponse.json(await handleMedicalConversation(body.messages, body.model));
  } catch (error) {
    console.error("Clinical chat error", error);
    const message = error instanceof Error ? error.message : "Error desconocido en el asistente";
    return NextResponse.json({ error: `Error en la asistencia clínica: ${message}` }, { status: 502 });
  }
}
