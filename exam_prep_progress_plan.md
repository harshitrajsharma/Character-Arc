# Exam Prep Progress & Testing Architecture Plan (V2)

Based on your feedback and the real-world GATE 2027 test schedule, we are upgrading the architecture to support a full **Test Series Planner**. This goes beyond just setting numeric targets; it allows users to explicitly define their test schedules (or use smart defaults) while keeping the flexible incrementing for revision and practice.

## 1. Data Model Updates (The "Schedule & Target" System)

We will use the `properties` JSONB column on our `Block` records to store these customizations, keeping our Prisma schema clean and dynamic.

*   **Topics (`properties`)**:
    *   `targetRevisions` (number): Defaults to 3 (normal) or 5 (important).
    *   `targetPractices` (number): Defaults to 3 (normal) or 5 (important).
*   **Chapters (`properties`)**:
    *   `scheduledTests`: An array of objects defining planned tests (e.g., `[{ id, title: "Topic Tests 1-5 (Logic, Sets...)" }]`). 
    *   The "Target Count" will automatically equal `scheduledTests.length` (defaulting to 1 if empty).
*   **Subjects (`properties`)**:
    *   `scheduledTests`: An array for planned subject tests (e.g., `[{ id, title: "Subject Test 1", date: "May 8, 2026" }]`).
    *   Target equals `scheduledTests.length` (defaulting to 2 if empty).
*   **Exams (`properties`)**:
    *   `scheduledTests`: An array for full-length mock tests (e.g., `[{ id, title: "Mock Test 1", date: "Nov 12, 2026" }]`).
    *   Target equals `scheduledTests.length` (defaulting to 5 if empty).

## 2. Algorithm Updates (`syllabus-model.ts`)

*   **Learning**: `(status === true ? 100% : 0%)`.
*   **Revision & Practice**: 
    *   Progress formula: `Math.min((currentCount / targetCount), 1) * 100`
    *   Users can increment beyond the target (e.g., `7/5`), but we will implement a hard cap (max 100) so the app doesn't break if spammed.
*   **Test Progress (Schedule Adherence)**:
    *   Progress is calculated as: `Math.min((completedTestsCount / scheduledTests.length), 1) * 100`
    *   When a user adds a `TestRecord`, they will ideally mark *which* scheduled test they are completing (or just log an ad-hoc test that adds to the completed count).

## 3. UI and UX Improvements

### A. The "Overachiever" Incrementers
*   **Update**: We will remove the `disabled` state from the `+` buttons on topics. Users can click up to 100.
*   **Visuals**: Once they pass the target (e.g., `4/3`), the badge will turn a distinct "overachiever" gold/neon color to reward the extra effort!

### B. The Test Series Planner (New Dialogs)
Users need a place to input their bought test series schedule (like the GO Classes CSIT/DA series you shared).
*   **Schedule Manager**: A new UI tab or dialog at the Exam, Subject, and Chapter levels.
*   Users can rapidly add scheduled tests (e.g., "Subject Test 1 - May 8", "Subject Test 2 - May 13").
*   We can even add a "Bulk Add" feature later where they can paste text (like the markdown you shared) and it parses it into scheduled tests!

### C. Test Views (`ChapterTestView` & `SubjectTestView`)
*   **Two-Part View**:
    1.  **The Schedule (To-Do)**: A list of the scheduled tests with empty checkboxes.
    2.  **The Records (Done)**: The actual `TestRecord` cards showing the marks obtained and average score.
*   **Metrics**: We will split the progress bar (Schedule Adherence, e.g., 2/4 Tests) from the Performance Badge (e.g., 85% Average).

## 4. Execution Strategy

To execute this, I recommend the following step-by-step implementation order:
1.  **Step 1**: Update `curriculum.ts` domain types and `syllabus-model.ts` algorithms to support `scheduledTests` arrays and the new target logic. Implement the 100 cap for revisions.
2.  **Step 2**: Update `SyllabusTopicRow` to allow counting past the limit and add the "gold" overachiever visual state.
3.  **Step 3**: Build the **Test Series Planner** UI (a component to add/edit `scheduledTests` on a chapter/subject).
4.  **Step 4**: Finalize the `ChapterTestView` so it displays the planned schedule alongside the actual `TestRecords`.
