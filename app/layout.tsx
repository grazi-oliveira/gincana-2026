import "./globals.css";

export const metadata = {
  title: "Gincana 2026",
  description: "Plataforma da Gincana 2026",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
