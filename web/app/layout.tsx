import type { Metadata, Viewport } from "next"
import { Inter, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Orby — Visão Geral",
  description:
    "Painel de rotina e finanças pessoais. Visão geral consolidada de finanças, agenda e treino.",
  applicationName: "Orby",
}

export const viewport: Viewport = {
  themeColor: "#0c0d10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${plexMono.variable} bg-background`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
