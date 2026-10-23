import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaludAI · Triaje Clínico & Auditoría Médica con IA",
  description: "Plataforma de evaluación clínica para pacientes, triaje inteligente y auditoría médica anti-fraude asistida por IA local."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
