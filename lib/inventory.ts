export type InventoryItem = {
  productId: string;
  name: string;
  stock: number;
  minimumStock: number;
};

export const initialInventory: InventoryItem[] = [
  { productId: "classic", name: "Clásica Bocado", stock: 25, minimumStock: 5 },
  { productId: "crispy", name: "Crispy Bocado", stock: 20, minimumStock: 5 },
  { productId: "double", name: "Doble Bocado", stock: 12, minimumStock: 3 },
  { productId: "combo-classic", name: "Combo Clásico", stock: 18, minimumStock: 5 },
  { productId: "combo-crispy", name: "Combo Crispy", stock: 15, minimumStock: 5 },
  { productId: "fries", name: "Papas fritas", stock: 30, minimumStock: 8 },
  { productId: "cola", name: "Inca Kola", stock: 40, minimumStock: 10 },
  { productId: "cola-zero", name: "Inca Kola Zero", stock: 25, minimumStock: 8 },
  { productId: "brownie", name: "Brownie", stock: 15, minimumStock: 4 }
];
