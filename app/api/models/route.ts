import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1").replace(/\/v1\/?$/, "");
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ models: [], error: "Ollama no disponible" }, { status: 503 });
    const data = await response.json() as { models?: Array<{ name: string }> };
    return NextResponse.json({ models: data.models?.map((model) => model.name) ?? [] });
  } catch {
    return NextResponse.json({ models: [], error: "No se pudo consultar Ollama" }, { status: 503 });
  }
}
