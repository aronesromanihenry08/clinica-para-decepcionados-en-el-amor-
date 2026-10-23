import { NextResponse } from "next/server";
import { retrieveKnowledge } from "@/lib/knowledge";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const retrieval = await retrieveKnowledge(query);
  return NextResponse.json(retrieval);
}
