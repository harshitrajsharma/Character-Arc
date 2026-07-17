import { Navbar } from "@/components/navigation/navbar"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="app-backdrop grid min-h-svh grid-rows-[1fr_auto] pt-15 text-foreground">
      <Navbar />

      <section className="flex items-center justify-center px-5 py-6 sm:px-8">
        <div className="w-full max-w-100">{children}</div>
      </section>

      <footer className="px-5 pb-6 text-center sm:px-8">
        <p className="text-xs text-muted-foreground">Your story stays yours.</p>
      </footer>
    </main>
  )
}
