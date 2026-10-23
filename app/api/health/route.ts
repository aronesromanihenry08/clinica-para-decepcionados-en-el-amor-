import { NextResponse } from "next/server";

export async function GET() {
  const provider = process.env.AI_PROVIDER ?? "demo";
  if (provider !== "ollama") {
    return NextResponse.json({ provider, connected: provider === "demo", model: null });
  }

  const baseUrl = (process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1").replace(/\/v1\/?$/, "");
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ provider, connected: false, model: process.env.OLLAMA_MODEL });
    const data = await response.json() as { models?: Array<{ name: string }> };
    const model = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
    const connected = Boolean(data.models?.some((entry) => entry.name === model));
    return NextResponse.json({ provider, connected, model });
  } catch {
    return NextResponse.json({ provider, connected: false, model: process.env.OLLAMA_MODEL });
  }
}
