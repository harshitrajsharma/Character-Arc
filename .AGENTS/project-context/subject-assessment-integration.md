# Exam Prep and Assessment integration

## Intended workflow

Exam Prep supplies the study context. Assessments remains the canonical owner
of reusable questions, papers, publication and attempts. A learner should create,
find, take, resume and review a subject's papers from that subject's Tests view.
They should only need the global assessment library for cross-subject management
and community discovery.

## Problems found

- The old subject Tests list discovered papers only through QuestionTarget
  records. An empty draft could never appear, and a paper with a matching title
  but no coverage records remained invisible.
- Full-subject views excluded all chapter-targeted papers. Browse mock tests
  navigated to the global library and dropped the subject/chapter context.
- Each past attempt was another paper row, so repeated attempts obscured the
  available paper and offered no direct Take test action.
- New assessment authoring did not inherit real study context. Ordinary builder
  metadata saves also normalized an omitted examBlockId to null, which would
  detach any context assigned by another workflow.

## Implemented contract (2026-11-10)

The existing typed `Assessment.examBlockId` FK already documents an Exam Prep
exam, subject, chapter or topic. It is used as the paper's explicit study
context, rather than introducing another relation, JSON copy or duplicate
assessment. A subject can be shared by several exams; a subject/chapter context
follows that shared syllabus and is visible from each valid owning exam.
An exam-only paper still requires an actual question-target match before
appearing in a particular subject. No title matching is used.

Create assessment from a subject/chapter validates the active same-workspace
exam→subject→chapter graph and prepopulates labels/type. The contextual ID is
saved with the canonical create action. Ordinary saves preserve omitted context;
explicit null removes it. The transactional create/update boundary validates
every active typed ancestor in the same active Exam Prep installation. MCP and
agent calls additionally require agent access on the context and ancestors.

Link existing assessment is an authorized, title-searchable server query with
20 lean rows per page. It lists only active unassigned papers from the current
Mock Tests installation. Linking or unlinking reuses the existing audited,
revision/idempotency-aware assessment.update action while retaining metadata,
questions and results. Another subject/exam's context is never silently moved.
Removing a direct link is reversible; the paper can remain visible as an
independently labeled syllabus match if its questions cover that area.

Subject Tests aggregates full-subject and chapter papers, preserving explicit
chapter coverage labels. Each paper has one actionable row: Edit for a draft,
Take for a populated published paper, Resume for an unfinished attempt and the
latest recorded result/review link. Current-user attempts remain in their own
canonical tables. Ten papers are shown per local page; the server projection is
bounded to the latest 100 papers plus a truncation signal, latest 20 personal
attempts per paper and the exact personal attempt count. No answer keys or
question bodies are hydrated into the subject page.

Scheduling and manually recorded results keep their separate domain semantics.
They remain clearly labeled and are not duplicated from CBT attempts or counted
as a combined completion measure. No subject progress-policy formula changed.

### Subject Tests presentation refinement — 2026-11-11

The section's job is to find a suitable assessment, continue saved work and
inspect the latest personal outcome. Its header has title/counts and commands,
followed by one responsive toolbar: labeled search, Source and Status. The
toolbar reuses FilterSelectField. Source distinguishes explicitly linked tests
from syllabus matches, which can cover other subjects too; status is an
independent filter. All three filters combine and reset local paging.
Unfinished attempts sort first, then explicit links, preserving the original
ordering within each group. Search remains within the bounded loaded set and
the existing 100-paper truncation notice stays visible.

Rows separate the title, relationship/coverage/status, recognizable question /
mark / time metadata, primary Take/Resume/Edit action and a quiet latest-result
band. Only evaluated results link to analysis. External schedules/manual
results stay under their own heading. Pagination now composes the shared
PaginationControls with range text, numeric pages, mobile Prev/Next and focus /
scroll recovery at the section heading; no second paging primitive is created.
Reading a subject does not install/reactivate Assessments; the UI offers Enable
assessments when the tool is unavailable, while external plans/results remain
usable. Viewer actions follow workspace capabilities.

## Navigation and display policy

Canonical subject Tests destinations use `?stage=test` and optional
`chapterId=...&type=chapter-test`. A validated same-workspace subject return
destination travels through assessment creation/building, new/shared question
editing, Take/Resume, completed-result analysis and retakes. The server checks
the full active graph before displaying a return destination. External hosts,
other workspaces and malformed IDs are ignored; query/focus anchors survive.

The live player retains its TCS iON question presentation, scoring, answer
persistence and 1024×600 viewport requirement. Subject-page Take uses the same
StartAttemptButton gate; phones can browse, manage and review without creating
an unusable attempt. A resized/unsupported attempt offers a subject return link
when entered from that context, without pausing its deadline.

## Verification

Focused unit tests cover same-workspace return destinations, query/hash
preservation, subject/chapter aggregation, typed ancestor boundaries and
agent-access constraints, metadata limits and omitted-context preservation.
Evidence and integrated browser/typecheck/build results are recorded by the
release coordinator in PROJECT_LOGS.md. No assessment fixture or user-data edit
is required by these checks; the existing Linear Algebra assessment is the
primary paper used to verify unchanged authoring state. Existing DBMS subject
records also support non-mutating navigation/filter and responsive inspection.
