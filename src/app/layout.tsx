import type { Metadata, Viewport } from "next"
import { Inter, Oswald, JetBrains_Mono } from "next/font/google"
import { ToastProvider } from "@/lib/toast-context"
import { AuthProvider } from "@/lib/auth-context"
import { PWAInstall } from "@/components/pwa-install"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

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
  title: "Espetinhos 1000K - Sistema de Comandas",
  description: "Sistema de comandas e controle de caixa para Espetinhos 1000K",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Espetinhos 1000K",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
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
      <body className={`${inter.variable} ${oswald.variable} ${jetbrains.variable} antialiased bg-bg-page text-text-white`}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <PWAInstall />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
