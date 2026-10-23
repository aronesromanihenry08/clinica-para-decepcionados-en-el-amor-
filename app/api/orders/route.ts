import { NextResponse } from "next/server";
import { createOrder, DraftOrder } from "@/lib/orders";
import { saveOrder, listOrders } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ orders: listOrders() });
}

export async function POST(request: Request) {
  try {
    const draft = await request.json() as DraftOrder;
    if (!draft?.lines?.length) return NextResponse.json({ error: "No se puede registrar un pedido vacío." }, { status: 400 });
    const order = saveOrder(createOrder(draft));
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("Dominga order error", error);
    return NextResponse.json({ error: "No pude registrar el pedido." }, { status: 500 });
  }
}
