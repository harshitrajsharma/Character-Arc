# UI QA Checklist

## Product

- The screen supports a real task without feature marketing.
- One primary action is visually dominant.
- Every metric has a label and a reason to exist.
- AI-derived information is labeled and correctable.
- Privacy and sync state are explicit where personal context is involved.

## System

- Existing shadcn components and semantic variants are reused.
- One contextual tint sits on a neutral foundation.
- Semantic statuses are not confused with the tint.
- Cards are reserved for repeated entities or contained tools and are never nested decoratively.
- Icons come from Lucide and unfamiliar icon-only buttons have tooltips.

## States

- Loading, empty, error, disabled, pending, success, focus, and selected states exist.
- Pending actions keep width and prevent duplicate submission.
- Errors explain recovery without leaking backend details.
- Long names, unbroken words, large numbers, and zero states fit.

## Responsive

Capture and inspect at least mobile 390 x 844, tablet 768 x 1024, and desktop 1440 x 900. Verify no overlap, horizontal overflow, clipped menus, hidden commands, or layout shifts. Confirm fixed-format controls use stable dimensions.

## Accessibility

- Text contrast meets WCAG AA: 4.5:1 normal and 3:1 large.
- Controls have accessible names and visible keyboard focus.
- Touch targets are at least 44px on mobile.
- Status and progress work without color.
- Forms use labels, descriptions, errors, autocomplete, and correct input types.
- Motion respects `prefers-reduced-motion`.

## Engineering

- Run formatting, typecheck, lint, relevant tests, and production build where practical.
- Inspect browser console errors and keyboard flow through the primary workflow.
- Scan CSS colors to ensure one accent family does not dominate unintentionally.
- Verify light and dark modes when the changed surface supports both.
