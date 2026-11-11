import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/components/query-provider"
import { SwRegister } from "@/components/pwa/sw-register"
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt"
import { cn } from "@/lib/utils"

// Keep compilation independent of Google Fonts availability.
const dmSansHeading = localFont({
  src: "./fonts/dm-sans-latin-variable.woff2",
  weight: "100 1000",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  variable: "--font-heading",
})

const inter = localFont({
  src: "./fonts/inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
  variable: "--font-sans",
})

const fontMono = localFont({
  src: "./fonts/geist-mono-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "Consolas", "monospace"],
  variable: "--font-mono",
})

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0F17" },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "Character Arc",
    template: "%s | Character Arc",
  },
  description: "Build your lore, skills, goals and next moves with AI.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Character Arc",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        fontMono.variable,
        inter.variable,
        dmSansHeading.variable
      )}
    >
      <body>
        <QueryProvider>
          <TooltipProvider delay={300}>
            <ThemeProvider>
              {children}
              <Toaster position="top-center" />
              <SwRegister />
              <PwaInstallPrompt variant="banner" />
            </ThemeProvider>
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
