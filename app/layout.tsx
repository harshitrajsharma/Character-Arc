import type { Metadata } from "next"
import { DM_Sans, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const dmSansHeading = DM_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
})

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: {
    default: "Character Arc",
    template: "%s | Character Arc",
  },
  description: "Build your lore, skills, goals and next moves with AI.",
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
        <TooltipProvider delay={300}>
          <ThemeProvider>{children}</ThemeProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
