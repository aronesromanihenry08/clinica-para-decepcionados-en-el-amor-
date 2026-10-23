export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "Hamburguesas" | "Combos" | "Bebidas" | "Postres";
  available: boolean;
};

export const catalog: CatalogItem[] = [
  { id: "classic", name: "Clásica Bocado", description: "Carne, queso, lechuga, tomate y salsa especial", price: 15, category: "Hamburguesas", available: true },
  { id: "crispy", name: "Crispy Bocado", description: "Pollo crispy, queso y salsa de la casa", price: 17, category: "Hamburguesas", available: true },
  { id: "double", name: "Doble Bocado", description: "Doble carne, doble queso y salsa especial", price: 21, category: "Hamburguesas", available: true },
  { id: "combo-classic", name: "Combo Clásico", description: "Clásica Bocado, papas y bebida", price: 22, category: "Combos", available: true },
  { id: "combo-crispy", name: "Combo Crispy", description: "Crispy Bocado, papas y bebida", price: 24, category: "Combos", available: true },
  { id: "fries", name: "Papas fritas", description: "Papas doradas con sal de la casa", price: 7, category: "Combos", available: true },
  { id: "cola", name: "Inca Kola", description: "Bebida personal", price: 5, category: "Bebidas", available: true },
  { id: "cola-zero", name: "Inca Kola Zero", description: "Bebida personal sin azúcar", price: 5, category: "Bebidas", available: true },
  { id: "brownie", name: "Brownie", description: "Brownie de chocolate", price: 8, category: "Postres", available: true }
];

export function findCatalogItem(text: string) {
  const normalized = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return catalog.find((item) => normalized.includes(item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) ??
    (normalized.includes("combo") && (normalized.includes("clásic") || normalized.includes("classic")) ? catalog.find((item) => item.id === "combo-classic") : undefined) ??
    (normalized.includes("combo") && normalized.includes("crispy") ? catalog.find((item) => item.id === "combo-crispy") : undefined) ??
    (normalized.includes("hamburguesa") && normalized.includes("crispy") ? catalog[1] : undefined) ??
    (normalized.includes("hamburguesa") && (normalized.includes("clásic") || normalized.includes("classic")) ? catalog[0] : undefined) ??
    (normalized.includes("hamburguesa") ? catalog[0] : undefined) ??
    (normalized.includes("papas") ? catalog.find((item) => item.id === "fries") : undefined) ??
    (normalized.includes("inca") || normalized.includes("gaseosa") || normalized.includes("bebida") ? catalog.find((item) => item.id === "cola") : undefined) ??
    (normalized.includes("brownie") ? catalog.find((item) => item.id === "brownie") : undefined);
}
