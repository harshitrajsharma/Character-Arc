function canCelebrate() {
  return (
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

export function celebrateTopicCompletion() {
  if (!canCelebrate()) return

  void import("canvas-confetti")
    .then(({ default: confetti }) => {
      confetti({
        particleCount: 28,
        spread: 52,
        startVelocity: 24,
        gravity: 1.15,
        scalar: 0.75,
        origin: { y: 0.72 },
      })
    })
    .catch(() => undefined)
}

export function celebrateChapterCompletion() {
  if (!canCelebrate()) return

  void import("canvas-confetti")
    .then(({ default: confetti }) => {
      confetti({
        particleCount: 90,
        spread: 85,
        startVelocity: 42,
        origin: { x: 0.5, y: 0.68 },
      })
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.72 },
      })
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.72 },
      })
    })
    .catch(() => undefined)
}
