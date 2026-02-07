import type { Metadata, Viewport } from "next"
import { Oswald, JetBrains_Mono } from "next/font/google"
import { ToastProvider } from "@/lib/toast-context"
import "./globals.css"

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Espetinhos Milk - Sistema de Comandas",
  description: "Sistema de comandas e controle de caixa para Espetinhos Milk",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
}

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${oswald.variable} ${jetbrains.variable} antialiased bg-bg-page text-text-white`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
