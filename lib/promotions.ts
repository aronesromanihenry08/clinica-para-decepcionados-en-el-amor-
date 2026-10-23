export type Promotion = {
  id: string;
  name: string;
  description: string;
  price: number;
  days: string;
  image: string;
  badge: string;
};

export const promotions: Promotion[] = [
  { id: "student", name: "Combo Universitario", description: "Clásica, papas medianas y bebida personal.", price: 19.9, days: "Lunes a viernes", image: "/images/promo-student.svg", badge: "Favorito" },
  { id: "tuesday", name: "Martes 2x1", description: "Lleva dos hamburguesas clásicas por el precio de una.", price: 25, days: "Solo martes", image: "/images/promo-2x1.svg", badge: "2 × 1" },
  { id: "sunday", name: "Domingo Familiar", description: "2 clásicas, 2 papas, 2 bebidas y 1 brownie.", price: 42.9, days: "Solo domingos", image: "/images/promo-sunday.svg", badge: "Para compartir" }
];
