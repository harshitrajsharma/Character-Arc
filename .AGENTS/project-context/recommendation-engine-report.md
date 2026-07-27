# Exam Prep Recommendations — Implementation Report

## 1. Legacy Workflow Findings

### Architecture
The Progressapp recommendation system lives in two layers:
- **Engine**: `src/lib/recommendations/smart-recommendations.ts` — computes categories (Revise, Priority Focus, Start Next, Test Progress) based on subject-level aggregate percentages and weightage
- **UI**: `src/app/components/recommendations/smart-recommendations.tsx` → `RecommendationSection` → `SubjectCard`

### Inputs
Recommendations use **subject-level aggregate metrics** only: `learningProgress`, `revisionProgress`, `testProgress`, and `weightage`. They do **not** examine individual topic data like `nextRevision`, revision counts, or practice counts.

### Ranking Rules
- **Revise**: subjects with `learningProgress > 70` and `revisionProgress < 70`, sorted by `weightage × (100 - revisionProgress)`
- **Priority Focus**: subjects with `0 < learningProgress < 100`, sorted by `learningProgress` (lowest first); Math/non-Math split enforced
- **Start Next**: subjects with `learningProgress === 0`, sorted by `weightage`
- **Test Progress**: only shown when Start Next is empty

### Weaknesses
1. **No topic-level granularity** — can't tell the user *which* topic to revise
2. **Calls `new Date()` directly** — not testable
3. **Hardcoded `MATH_SUBJECTS`** — unscalable
4. **Conflicting sort logic** — library and UI component sort differently
5. **No maximum limit** on recommendations
6. **No completed state** — always tries to find something
7. **No skeleton loader** — uses spinner instead of stable geometry
8. **No keyboard navigation**
9. **Broken "Test Progress" visibility** — hidden when Start Next has items
10. **Actions sometimes link to non-existent routes**
11. **Duplicates not eliminated** across categories

---

## 2. Improvements Over Legacy

| Aspect | Legacy | Character Arc |
|---|---|---|
| **Granularity** | Subject-level aggregates only | Topic-level analysis with chapter/topic names |
| **Determinism** | Calls `new Date()` | Accepts `now: Date` as explicit parameter |
| **Ranking** | 4 categories with sorting conflicts | 9 priority bands with stable sub-priority tie-breaking |
| **Deduplication** | None — duplicates across categories | One recommendation per chapter+type |
| **Maximum display** | Unlimited | 3 primary, expandable to all |
| **Completed state** | None | Explicit "All caught up" with congratulatory message |
| **Evidence** | None — unexplained percentages | "1/5 revisions", "Overdue by 3 days", "Scored 30%" |
| **Policy respect** | Hidden thresholds | Uses `SubjectProgressPolicy` targets exclusively |
| **Date safety** | No handling | Invalid dates → `null` (no crash, no false overdue) |
| **Accessibility** | No keyboard support | Visible focus, aria labels, 44px touch targets |
| **Mobile** | Overflow-prone carousel | Compact rows, no horizontal overflow |
| **Loading state** | Spinner | Stable-geometry skeleton with matching heights |
| **Architecture** | Mixed logic/UI | Pure engine (no React/Prisma) + thin UI layer |
| **Testing** | None | 21 focused tests |

---

## 3. Recommendation Ranking Rules

| Priority | Type | Condition | Urgency |
|---|---|---|---|
| **1** | Overdue high-yield revision | `important && nextRevision < now` | Critical |
| **2** | Unlearned high-yield topic | `important && !learningStatus` | Critical |
| **3** | Weak test outcome | `marksObtained/totalMarks < 50%` | Warning |
| **4** | Overdue standard revision | `!important && nextRevision < now` | Warning |
| **5** | High-yield practice gap | `important && practiceCount < highYieldPracticeTarget` | Warning |
| **6** | High-yield revision gap | `important && revisionCount < highYieldRevisionTarget` | Suggestion |
| **7** | Standard revision/practice gap | Below `revisionTarget` or `practiceTarget` | Suggestion |
| **8** | Unlearned standard topic | `!important && !learningStatus` | Suggestion |
| **9** | Missing chapter/subject test | `testRecords.length < testTarget` | Suggestion |

Within each band, items are sub-sorted by deficit magnitude (most behind first).

---

## 4. Changed Files

### New files created:
| File | Purpose |
|---|---|
| `lib/tools/exam-prep/recommendations/types.ts` | Engine types (React/Prisma-free) |
| `lib/tools/exam-prep/recommendations/engine.ts` | Pure deterministic recommendation engine |
| `lib/tools/exam-prep/recommendations/index.ts` | Barrel exports |
| `components/tools/exam-prep/subjects/recommendations/recommendations-section.tsx` | UI component with rows, skeleton, completed state |
| `components/tools/exam-prep/subjects/recommendations/index.ts` | UI barrel exports |
| `tests/tools/recommendations-engine.test.ts` | 21 focused test cases |

### Modified files:
| File | Change |
|---|---|
| `components/tools/exam-prep/subjects/subject-detail-page.tsx` | Added `RecommendationsSection` between progress overview and syllabus |

---

## 5. Integration Behavior

The `RecommendationsSection` is placed between the progress overview grid and the syllabus section on the subject detail page:

```
SubjectHeader
├── ProgressOverview | SubjectStats  (grid)
├── RecommendationsSection            ← NEW
├── SubjectSyllabus
└── SubjectTestView
```

**Actions**: Each recommendation row has an action button (e.g. "Start Revision", "Learn Topic", "Practice") that calls `onNavigate(stage, chapterId?)`. Currently this is wired as a prop — the parent can connect it to the syllabus's `setStage` function to switch the syllabus view.

**Visual design**:
- No enclosing card — open canvas layout
- Compact rows with 3px left-border colored by urgency
- Top recommendation gets subtle card treatment (shadow + ring)
- Brand tokens: violet for suggestions, amber for warnings, destructive for critical, neon for completed
- Non-color status: icon + text label badge per urgency level
- "View all" expansion when > 3 recommendations exist

---

## 6. Validation Output

### `bun test` (99/99 pass)
```
99 pass | 0 fail | 249 expect() calls
Ran 99 tests across 14 files. [756ms]
```

### `npm run typecheck` — ✅ Clean
```
tsc --noEmit (exit 0)
```

### `npm run lint` — ✅ Clean (all 7 changed files)
```
eslint ... (exit 0)
```

### `npm run build` — ✅ Clean
```
▲ Next.js 16.2.6 (Turbopack)
Creating an optimized production build ...
✓ Compiled successfully in 19.3s
Running TypeScript ... Finished in 27.1s
✓ Generating static pages (13/13) in 697ms
```

---

## 7. Remaining Manual Browser Checks

1. **Visual review**: Open a subject detail page with varied topic states and verify:
   - Top recommendation is visually prominent vs. subsequent rows
   - Urgency badges render with correct colors (destructive/amber/violet/neon)
   - "View all" button expands and collapses correctly
   - Completed state shows when all policy targets are met

2. **Mobile layout**: Test at 320px–428px viewport:
   - No horizontal overflow
   - Touch targets are at least 44px
   - Text wraps cleanly

3. **Keyboard navigation**: Tab through recommendation rows and action buttons:
   - Focus rings visible on buttons
   - Action buttons are keyboard-activatable

4. **Reduced motion**: Enable `prefers-reduced-motion: reduce`:
   - Expand/collapse transitions should be instant

5. **Action integration**: Click action buttons and verify:
   - Currently logs to console via `onNavigate` (wiring to syllabus `setStage` requires connecting the callback through shared state — can be done in a follow-up if the syllabus exposes a ref or context setter)

6. **Dark mode**: Toggle theme and verify:
   - All brand tokens switch correctly
   - Border and badge colors remain readable
