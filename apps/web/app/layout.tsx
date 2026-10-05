import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "VXV",
  description: "Raids, soft reserves et loot de la guilde VXV.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-night font-sans text-lavender antialiased">{children}</body>
    </html>
  );
}
