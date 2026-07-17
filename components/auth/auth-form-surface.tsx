import { AuthReveal } from "@/components/auth/auth-reveal"
import { cn } from "@/lib/utils"

type AuthFormSurfaceProps = {
  eyebrow: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function AuthFormSurface({
  eyebrow,
  title,
  description,
  children,
  className,
}: AuthFormSurfaceProps) {
  return (
    <section className={cn("w-full text-foreground", className)}>
      <AuthReveal delay={0.04}>
        <header className="mb-8">
          <p className="mb-3 text-sm font-medium text-brand-neon-ink">
            {eyebrow}
          </p>
          <h1 className="font-heading text-3xl leading-tight font-semibold sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>
      </AuthReveal>
      <AuthReveal delay={0.1}>{children}</AuthReveal>
    </section>
  )
}
