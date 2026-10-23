import { CatalogItem } from "@/lib/catalog";

export type OrderLine = {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  customerName?: string;
  lines: OrderLine[];
  total: number;
  fulfillment: "Recojo en tienda" | "Delivery";
  status: "Confirmado" | "En preparación" | "Listo";
  createdAt: string;
};

export type DraftOrder = {
  customerName?: string;
  lines: OrderLine[];
  fulfillment: "Recojo en tienda" | "Delivery";
};

export function createLine(item: CatalogItem, quantity = 1): OrderLine {
  return { itemId: item.id, name: item.name, quantity, unitPrice: item.price };
}

export function calculateTotal(lines: OrderLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

export function createOrder(draft: DraftOrder): Order {
  return {
    id: `DOM-${String(Date.now()).slice(-6)}`,
    ...draft,
    total: calculateTotal(draft.lines),
    status: "Confirmado",
    createdAt: new Date().toISOString()
  };
}
