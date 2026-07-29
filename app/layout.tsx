import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://aude-conectar-instagram.lopeshpl.chatgpt.site",
  ),
  title: "AUDE Conectar",
  description: "Portal seguro de autorização da AUDE Gestão.",
  openGraph: {
    title: "AUDE Gestão · Conexão segura",
    description:
      "Autorize a conexão do Instagram do seu negócio sem compartilhar sua senha.",
    images: ["/aude-conexao-segura.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AUDE Gestão · Conexão segura",
    description:
      "Autorize a conexão do Instagram do seu negócio sem compartilhar sua senha.",
    images: ["/aude-conexao-segura.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
