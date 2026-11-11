export const MIN_ASSESSMENT_WIDTH = 1024
export const MIN_ASSESSMENT_HEIGHT = 600
export const ASSESSMENT_DISPLAY_QUERY = `(min-width: ${MIN_ASSESSMENT_WIDTH}px) and (min-height: ${MIN_ASSESSMENT_HEIGHT}px)`

export function supportsAssessmentDisplay(width: number, height: number) {
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width >= MIN_ASSESSMENT_WIDTH &&
    height >= MIN_ASSESSMENT_HEIGHT
  )
}

export function canUseAssessmentDisplayNow() {
  return (
    typeof window !== "undefined" &&
    supportsAssessmentDisplay(window.innerWidth, window.innerHeight)
  )
}
