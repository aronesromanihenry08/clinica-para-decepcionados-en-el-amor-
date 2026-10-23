import { Order } from "@/lib/orders";

const orders: Order[] = [
  {
    id: "DOM-1042",
    customerName: "Ana Torres",
    lines: [{ itemId: "combo-classic", name: "Combo clásica", quantity: 1, unitPrice: 22 }],
    total: 22,
    fulfillment: "Recojo en tienda",
    status: "En preparación",
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString()
  }
];

export function listOrders() {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveOrder(order: Order) {
  orders.unshift(order);
  return order;
}
