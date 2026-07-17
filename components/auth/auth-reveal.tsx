"use client"

import { motion } from "motion/react"

import { cn } from "@/lib/utils"

type AuthRevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: "up" | "down" | "left" | "right"
}

const offsets = {
  up: { x: 0, y: 12 },
  down: { x: 0, y: -10 },
  left: { x: 12, y: 0 },
  right: { x: -12, y: 0 },
}

export function AuthReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: AuthRevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, ...offsets[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: 0.3,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
