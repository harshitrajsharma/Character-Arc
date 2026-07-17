# Project Context

Detailed implementation choices and build order are documented in [TECH_STACK_AND_ROADMAP.md](./TECH_STACK_AND_ROADMAP.md). The current reusable entity and relationship architecture is documented in [GENERIC_BLOCK_MODEL.md](./GENERIC_BLOCK_MODEL.md); it supersedes the earlier page-model draft.

Frontend color decisions are governed by the agent-facing
[CSS color context](./css-color-context.md). Read it before choosing, adding, or
changing colors.

## Working Name

Character Arc is a platform of AI-operable tools that help people make progress and retain the outcomes.

## One-Line Pitch

Install the tools you need, use them yourself or through any AI agent, and see your plans, practice, decisions, skills, and progress in one trustworthy place.

Power-user version:

Bring your own AI. Character Arc gives ChatGPT, Claude, Antigravity, and local agents strict tools, durable context, and a visual outcome layer while the most private context can remain in a local LLM-wiki.

## Core Problem

People are overwhelmed because their life context is scattered across notes, chats, calendars, task apps, documents, and memory. AI chats help in the moment, but they often lose the bigger picture.

Power users can maintain a local LLM-wiki in Markdown and use it as a long-term memory layer for AI agents, but that workflow is too technical for normal users. Normal users need the same benefits through a simple app and clear workflows.

## Product Thesis

The app should become the structured memory and outcome layer between humans and AI assistants.

Character Arc is not primarily an AI chatbot, a notes application, or a collection of API integrations. It is a platform of strict, installable tools that turn AI-generated content and human activity into durable, measurable outcomes.

Users should not need to pay for AI in every app. They should be able to use the AI assistant they already trust, while Character Arc provides centralized structured context, safe sync, and tools that the assistant can call.

The app itself should not feel strict or rigid. The app should feel flexible, useful, and human-friendly. The strictness should live inside the tools.

Each tool should manage a specific domain with:

- A strict data model.
- Clear actions.
- Validation rules.
- Permission boundaries.
- A memory/context slice for that domain.
- Computed outcomes that can be shown in the UI.

The frontend is the beautiful view layer for the outcomes of those tools. The database is the centralized outcome store. The agent layer is how ChatGPT, Claude, local agents, MCP clients, APIs, and CLIs operate on those tools.

## Target Users

- Initial wedge: students preparing for competitive exams and managing long-term goals.
- Professionals managing personal productivity and life admin.
- Founders, freelancers, and creators who need a durable operating system for decisions, tasks, plans, and reflections.
- Power users who want local Markdown/Obsidian workflows plus cloud sync.
- Normal users who only want a browser app and AI-chat tool access.

The product should be designed for everyone even though the hackathon demo focuses on students. Exam preparation is the first complete use case, not the permanent boundary of the product.

## User-Facing Promise

Chat with AI about your life. Character Arc turns messy thoughts into goals, plans, tasks, reflections, and memory you can actually use.

## Important Framing

Lead with the human benefit, not the infrastructure.

Good framing:

- "The memory and action layer for your AI life."
- "A private operating system for your goals, tasks, decisions, and reflections."
- "Use ChatGPT, Claude, or any AI assistant with structured context you control."

Avoid leading with:

- "An LLM-wiki sync platform."
- "An MCP server with JSON inference."
- "A local Markdown context database."

Those are important implementation and power-user features, but they should not be the first thing normal users hear.

## Product Mental Model

Character Arc has three things that users can understand independently:

1. Tools
   - Add structured capabilities to Character Arc.
   - Examples: Exam Prep, Quiz, Flashcards, Career Compass, Skill Graph, Daily Planning.
   - Each installed tool gets its own working pages, data model, actions, analytics, and agent interface.

2. Connectors
   - Connect external services and data sources.
   - Examples: Google Calendar, Todoist, Notion, Obsidian workflows, email, cloud storage.
   - Connectors move permitted data between services. They do not define the user's life model.

3. AI agents
   - Create, read, and update content through a tool's strict actions.
   - The agent can be Character Arc AI on a paid plan or an external agent such as ChatGPT, Claude, Antigravity, or another MCP/API client.
   - The agent supplies intelligence and generated content. Character Arc supplies structure, permissions, memory, analytics, and presentation.

The user should never need to understand every capability. A central Tools page shows available and installed tools, similar to how AI applications present connectors. Users install only what is relevant to them, and uninstalled tools stay out of their daily experience.

### Relationship Between the Three Systems

- Character Arc is the structured action, outcome, analytics, and view layer.
- The LLM-wiki is the optional local memory and private-context layer.
- ChatGPT, Claude, Antigravity, Character Arc AI, and other agentic applications are the reasoning and content-generation layer.

Character Arc remains useful without an LLM-wiki and without an external AI connection. Normal users can use installed tools directly in the web app. Power users can combine all three systems for deeper context and automation.

## Core Architecture

Character Arc has four layers:

1. Cloud app for normal users
   - Browser-friendly dashboard.
   - Goals, tasks, habits, notes, reflections, memories, and plans.
   - Structured database for synced operational context.
   - Beautiful visual components for users who do not want to read raw Markdown.

2. AI tool layer
   - MCP server.
   - REST API.
   - CLI.
   - Tool endpoints for ChatGPT, Claude, local agents, and future integrations.
   - Lets users bring their own AI instead of paying for another bundled AI assistant everywhere.
   - Tools are not just wrappers around external APIs. A Character Arc tool owns structured context and progress state for a domain in the user's life.

3. Agentic application layer
   - Character Arc AI for paid users and the hackathon demonstration.
   - External AI applications such as ChatGPT, Claude, Antigravity, and other MCP-capable agents.
   - Agents use explicit tool actions instead of writing arbitrary data directly to the database.
   - Users can bring their existing AI subscription instead of paying for intelligence in every application.

4. Local LLM-wiki layer for power users
   - Local Markdown files viewable in Obsidian or any editor.
   - Stores highly personal context that may never be synced.
   - Agents can infer structured data from selected Markdown sections.
   - User controls what is synced to the centralized app.
   - A Character Arc CLI creates, validates, indexes, upgrades, and selectively syncs the wiki so users do not need to design it manually.

## Local Wiki Setup and CLI

Normal users cannot be expected to understand Markdown schemas, YAML frontmatter, agent instruction files, folder conventions, cross-links, or sync policies. Character Arc must provide a CLI that creates and maintains a usable LLM-wiki for them.

The CLI is one optional bridge to local ownership, not a prerequisite for using Character Arc. A normal user can use the cloud app without a local wiki. A user who wants local files should be able to obtain a working wiki without designing the system or manually entering terminal commands.

### Setup paths

The app should present three setup paths, ordered from simplest to most advanced:

1. Download my wiki
   - The user selects the areas they care about, such as Exam Prep, Goals, Skills, or Career.
   - Character Arc generates an OKF-conformant starter folder as a ZIP.
   - The user extracts it and can open it immediately in Obsidian or any file editor.
   - The bundle includes plain-language guidance and agent rules, but no account secrets or long-lived access tokens.

2. Set up with my AI agent
   - The app generates a copyable prompt tailored to the user's operating system, selected tools, and desired folder location.
   - The user runs the prompt in an agentic application that has local file and terminal access.
   - The agent installs or invokes the verified Character Arc CLI, initializes the bundle, validates it, and reports the created files.
   - The agent must ask before replacing existing files, connecting an account, or syncing any data.

3. Use the CLI
   - Technical users run the commands directly and can customize the profile, templates, agent connections, and sync rules.

The same generator and validation library should power all three paths so downloaded, agent-created, and CLI-created wikis behave consistently.

### Standards boundary

The generated wiki should conform to Google Cloud's Open Knowledge Format (OKF). OKF defines a portable structural format rather than a complete personal knowledge schema:

- Knowledge is stored as a directory of Markdown concept documents.
- Every non-reserved concept document has parseable YAML frontmatter.
- Every concept document has a non-empty `type` field.
- `index.md` and `log.md` are reserved files with defined roles.
- Concepts use normal Markdown links to form a navigable graph.
- Files remain readable by humans and consumable by different agents without a proprietary SDK.

Character Arc adds a versioned personal-wiki profile on top of OKF. This profile defines the recommended folders, concept types, body templates, privacy metadata, agent rules, and mappings to installed Character Arc tools. The app must not imply that these Character Arc-specific personal-life conventions are required by the OKF specification.

The concrete Goals and Paths mapping is defined in
[`arc-markdown-okf-contract.md`](arc-markdown-okf-contract.md). It is the source
of truth for Arc names, Markdown fields, stable body sections, YAML export, and
schema compatibility.

### Generated starter bundle

A starter wiki may look like:

```text
progress-wiki/
|-- index.md
|-- log.md
|-- profile/
|   |-- index.md
|   `-- current-reality.md
|-- goals/
|   `-- index.md
|-- skills/
|   `-- index.md
|-- learning/
|   `-- index.md
|-- plans/
|   `-- index.md
|-- decisions/
|   `-- index.md
|-- reflections/
|   `-- index.md
|-- private/
|   `-- index.md
`-- .Character Arc/
    |-- manifest.json
    |-- permissions.json
    `-- sync-state.json
```

Only relevant folders should be created during guided setup. Installing the Exam Prep tool can add exam and learning templates later; installing Career Compass can add career-path and decision templates. The wiki should grow with the user's installed tools instead of overwhelming them with an empty universal taxonomy.

### CLI responsibilities

The CLI should:

- Ask a small set of plain-language onboarding questions.
- Create an OKF-conformant bundle and Character Arc profile.
- Generate index files, logs, cross-links, templates, and agent instructions.
- Add or remove local template packs when Character Arc tools are installed or removed.
- Validate OKF conformance and Character Arc-specific schemas.
- Detect broken links, malformed frontmatter, duplicate identities, and unsupported profile versions.
- Preview exactly which fields and concepts will sync before uploading anything.
- Keep local-only paths excluded by default.
- Connect authorized MCP clients or print the configuration needed for supported agents.
- Upgrade templates through explicit, reversible migrations without overwriting user-authored content.
- Export or disconnect without making the local wiki unusable.

Suggested command surface:

- `Character Arc init` - guided creation of a local wiki.
- `Character Arc add <type>` - create a concept from a safe template.
- `Character Arc install-tool <tool>` - add local schemas and instructions for an installed tool.
- `Character Arc validate` - validate OKF and Character Arc profile rules.
- `Character Arc index` - rebuild indexes and check cross-links.
- `Character Arc status` - show local changes, sync state, and privacy classification.
- `Character Arc sync --preview` - show what would leave the device.
- `Character Arc sync` - sync only approved structured outcomes.
- `Character Arc connect <agent>` - configure or explain agent access.
- `Character Arc doctor` - diagnose setup and compatibility problems.

### Normal-user experience

The default action in the web app should be `Download my wiki`. `Set up with AI` and `CLI setup` can appear as alternative options. Users should not have to understand the terms CLI, YAML, schema, or OKF to complete the default flow.

The downloadable folder should work locally before the user connects it to a Character Arc account. If the user later enables synchronization, the CLI should use a browser or device-authorization flow rather than placing credentials inside the downloaded archive or AI prompt.

The generated AI setup prompt should be transparent and inspectable. It should state:

- Which directory will be created or modified.
- Which Character Arc tool templates will be installed.
- Which commands the agent is expected to run.
- That existing files must not be overwritten without approval.
- That private content must remain local by default.
- That `Character Arc validate` must pass before setup is considered complete.
- That `Character Arc sync --preview` must be shown before the first sync.

A production version can add a desktop companion for automatic updates, filesystem watching, and sync. This should improve convenience without turning the local Markdown bundle into a proprietary format.

### Local tools versus cloud tools

The CLI includes deterministic local utilities for creating, validating, linking, searching, migrating, and syncing files. These are maintenance tools, distinct from installable Character Arc domain tools such as Exam Prep and Career Compass.

An AI agent may propose or update knowledge through declared actions, but deterministic rules such as validation, privacy filtering, schema migration, and sync selection must be enforced by code rather than left to model judgment.

## Tool Philosophy

Character Arc is a set of domain tools plus a shared context/outcome store.

A tool is not merely code that calls another service. In Character Arc, a tool is a structured system for managing one part of a user's life. It can expose MCP/API/CLI actions, but it also owns the context model, progress model, state transitions, and UI outcomes for that domain.

Examples:

- A subject-progress tool manages subjects, chapters, topics, learning status, revision count, practice count, test count, weightage, and study analytics.
- A career-map tool manages possible future paths, fit reasons, eligibility, timelines, risks, required skills, and next actions.
- A skill-graph tool manages current skills, desired skills, evidence, ratings, roadmaps, practice sessions, and review plans.
- A daily-planning tool manages today's commitments, time blocks, plan changes, execution results, and reflections.

The tool should be strict so agents have reliable rails. The app should be approachable so normal users can understand the outcomes without needing to understand the tool internals.

### Definition of a Character Arc Tool

Every Character Arc tool must include:

1. Purpose and description
   - A concise explanation of the real-world outcome the tool helps produce.
   - Clear boundaries for what the tool does and does not manage.

2. Structured domain model
   - Typed entities, relationships, status values, validation, and state transitions.
   - A dedicated context slice that agents can read only with user permission.

3. Agent actions
   - MCP, API, and CLI operations with strict inputs and outputs.
   - Actions for creating content, recording activity, updating state, and retrieving context.
   - Agents generate content through these actions; they do not bypass the tool's rules.

4. Complete user experience
   - Purpose-built frontend pages and components for using the capability.
   - Review and editing states so users stay in control of agent-generated content.
   - Empty, loading, error, permission, and historical states.

5. Outcome and analytical storage
   - Stores attempts, decisions, activity, progress, evidence, and results over time.
   - Computes useful outcomes such as readiness, weak areas, trends, recommendations, and next actions.

6. Privacy and permissions
   - Declares what data it reads, writes, syncs, and exposes to an agent.
   - Respects local-only, synced-private, and share-with-AI boundaries.

This is the product's most important technical contract:

> AI creates and reasons. Tools constrain and record. The frontend explains and visualizes. The user approves and owns.

### Tools Page

The Tools page is the central capability catalog.

It should support:

- Browsing available tools by category.
- Seeing a short purpose, permissions, and example outcome before installation.
- Installing, configuring, opening, disabling, or removing a tool.
- Showing only installed tools in the main navigation and dashboard.
- Separating student, career, productivity, health, finance, and general-life categories without forcing any category on the user.
- Displaying which agents and connectors can access each tool.

### Connectors Page

The Connectors page is separate from the Tools page because the concepts have different responsibilities.

It should support:

- Connecting services such as Todoist, Google Calendar, Notion, email, and storage providers.
- Selecting the permissions and data scopes granted to each connector.
- Showing sync status, last sync, errors, and disconnect controls.
- Letting installed tools use connector data only after explicit authorization.

A calendar connector can provide events to Daily Planning or Exam Prep. It is not itself the planning system. A Todoist connector can import or publish tasks, while Character Arc tools retain their structured outcomes and analytics.

Future direction:

- Users should eventually be able to create their own tools.
- Users should eventually be able to publish tools.
- Other users should eventually be able to install those tools.
- Published tools need more than code. They need schemas, UI views, permissions, memory rules, sync behavior, and agent instructions.
- For the hackathon, tools are developer-provided only.

Reference pattern:

`C:\Users\sharm\Desktop\Projects\Character Arc` is a small example of the pattern. It is a single exam-preparation progress tool with a structured model for subjects, chapters, topics, learning, revision, practice, tests, exam metadata, dashboard progress, analytics, and MCP tool access. Character Arc should generalize this pattern into many life tools while keeping each tool's domain state strict and inspectable.

## Privacy Model

The product must treat personal context as sensitive by default.

Suggested privacy levels:

- Local only: remains in the local LLM-wiki and is never uploaded.
- Synced private: stored in the cloud app but not exposed to external AI tools by default.
- Share with AI: available through MCP/API/tool calls when the user authorizes it.

The demo and product should make this control obvious.

## Hackathon MVP

The hackathon version should prove one magical loop through the Exam Prep tool:

1. A student selects an exam and provides or imports its syllabus and pattern.
2. Character Arc stores the exam, subjects, chapters, topics, question pattern, and preparation state in a strict model.
3. An AI agent uses Character Arc tool actions to generate a quiz, flashcard set, or exam-pattern mock test.
4. The student attempts the content in a purpose-built frontend.
5. Character Arc stores the attempt, evaluates performance, updates topic mastery, and identifies weak areas.
6. The dashboard and Skill Graph reflect the outcome and recommend the next action.
7. The same context and outcomes are available to an authorized external AI agent through MCP/API.

Recommended hackathon surfaces:

- Home dashboard with exam readiness, recent activity, weak areas, and next action.
- Tools catalog with Exam Prep installed and other tools visible as previews.
- Exam Prep workspace for syllabus, subject, chapter, and topic progress.
- Quiz and Flashcards as focused learning modes inside Exam Prep.
- Mock Test builder and attempt experience.
- Test analysis with topic-level progress updates.
- Skill Graph view derived from real attempts and study activity.
- Agent access/setup area demonstrating MCP/API tool calls.
- Simple privacy controls and a downloadable, OKF-conformant LLM-wiki template generated from the user's installed tools.
- A copyable AI-agent setup prompt plus the CLI path as alternative setup methods.
- A `sync --preview` step showing that private local concepts remain on the device while approved outcomes reach the app.

Career Compass is strategically important but should be a polished preview or lightweight secondary flow if implementation time is limited. The judged demo should prioritize one end-to-end system with real stored outcomes over many shallow modules.

## Flagship Tool: Exam Prep

Exam Prep generalizes the working ideas in Character Arc into a complete Character Arc tool for competitive-exam preparation.

### Structured context

The tool stores:

- Exam name, date, eligibility context, target score or rank, and preparation timeline.
- Official or user-provided syllabus.
- Exam pattern, sections, duration, marking scheme, negative marking, and question types.
- Subjects, chapters, topics, prerequisites, importance, and expected weightage.
- Past question papers and extracted question metadata when legally and technically permitted.
- Learning, revision, practice, test, and confidence state per topic.
- User attempts, answers, time taken, hints used, accuracy, and error type.

### Agent responsibilities

An authorized AI agent can:

- Parse a syllabus or exam notification into the strict curriculum model.
- Classify past questions by subject, topic, difficulty, and question pattern.
- Generate practice questions that match selected topics and constraints.
- Generate full mock tests that follow the stored exam blueprint.
- Explain answers and diagnose conceptual, calculation, recall, or time-management errors.
- Recommend the next topic, revision, quiz, or test from stored evidence.

Generated questions must record their source type. Past-paper questions, user-provided questions, and AI-generated questions must be visually distinguishable. AI-generated content should be reviewable and should not be presented as an official past question.

### User experience

The Exam Prep frontend should include:

- Exam overview and readiness dashboard.
- Syllabus explorer with subject, chapter, and topic progress.
- Practice setup with topic, difficulty, count, duration, and question-type controls.
- Focused quiz player with navigation, timer, answer review, and explanations.
- Mock-test player that respects the selected exam pattern.
- Results analysis by subject, topic, difficulty, accuracy, time, and error type.
- Weak-area queue and suggested next actions.
- Test and practice history so progress remains inspectable.

### Outcome model

The tool should compute outcomes from evidence rather than relying only on self-ratings:

- Topic mastery and confidence.
- Coverage of the syllabus.
- Revision freshness.
- Practice volume and accuracy.
- Test readiness.
- Speed versus accuracy.
- Repeated error patterns.
- Predicted score as an explicitly labeled estimate with confidence and supporting evidence.

The Character Arc model for subject, chapter, topic, learning, revision, practice, tests, dashboard progress, and MCP actions is the starting reference. Character Arc should add richer attempt evidence, generated-content provenance, exam-blueprint enforcement, and tool installation/permission behavior.

## Learning Modes

### Quiz

Quiz is a focused mode inside the Exam Prep tool and may later be installable independently.

The user or agent chooses a topic, difficulty, question count, duration, and optional exam pattern. The agent generates structured MCQ or supported question types. Character Arc validates the output, presents the quiz, saves the attempt, explains answers, and updates analytics.

Suggested actions:

- `create_quiz`
- `get_quiz`
- `start_quiz_attempt`
- `submit_quiz_answer`
- `finish_quiz_attempt`
- `get_quiz_analysis`

### Flashcards

Flashcards are generated for a topic, document, syllabus section, weak area, or set of mistakes.

Generated flashcards first exist as a preview. The user decides whether to discard them, save selected cards, or save the complete deck. Saved cards retain topic links and source provenance and can later support spaced review.

Suggested actions:

- `generate_flashcard_preview`
- `save_flashcards`
- `discard_flashcard_preview`
- `get_due_flashcards`
- `record_flashcard_review`

### Mock Tests

Mock Tests are the strongest hackathon demonstration because they combine strict context, AI generation, a complete frontend, and analytical outcomes.

The tool uses a stored exam blueprint to enforce section counts, marks, duration, question types, difficulty distribution, and negative marking. The agent fills that structure with content. Character Arc validates the generated test before it can be attempted, then stores responses and updates preparation evidence after submission.

Suggested actions:

- `get_exam_blueprint`
- `generate_mock_test`
- `validate_mock_test`
- `publish_mock_test`
- `start_mock_attempt`
- `submit_mock_response`
- `finish_mock_attempt`
- `get_mock_analysis`
- `update_progress_from_attempt`

## Flagship Feature: Career Compass / Future Map

Career Compass is both a frontend page and a tool/API surface.

It helps users see the future paths open to them based on who they are, where they are in life, what they are studying, what skills they have, what constraints they face, and what goals they care about.

Primary audience:

- Indian students after college who are preparing for government exams, entrance exams, higher studies, or private jobs.
- Students who feel directionless because they do not know the full map of available career roads.
- People who need a personalized opportunity map instead of searching across many different websites and videos.

The page should show personalized future options grouped by category:

- Competitive exams.
- Government jobs.
- PSU opportunities.
- Private job roles.
- Higher studies in India.
- Higher studies abroad.
- Scholarships and fellowships.
- Internships and apprenticeships.
- Skill-based career paths.
- Freelance or remote work paths.
- Short-term income options.
- Long-term career options.
- Backup paths.

Each opportunity should include:

- Why this fits the user.
- Eligibility.
- Preparation effort.
- Timeline and deadlines.
- Cost.
- Risk level.
- Competition level.
- Expected outcome.
- Required skills and documents.
- Roadmap.
- Next actions.
- Official sources or verification links when available.
- Last checked date and confidence level.

Agent/tool use cases:

- `get_career_options`
- `rank_career_paths`
- `compare_career_paths`
- `create_career_roadmap`
- `save_career_decision`
- `create_tasks_from_career_path`

The production version must be careful with changing information such as exam dates, eligibility, application deadlines, job listings, and official notifications. AI-generated opportunity data should show sources, confidence, and verification status.

## Flagship Feature: Skill Graph

Skill Graph is both a frontend page and a tool/API surface.

It shows what skills a user currently has, how strong each skill is, what skills they need to acquire, and what concrete steps will improve them.

The word "skill" should be broad. It can mean:

- A degree or academic credential.
- A subject.
- A course.
- A tool.
- A framework.
- A job skill.
- An exam-preparation competency.
- A life-management skill.
- A habit or self-regulation ability.

Examples:

- Exam prep skills: mathematics, reasoning, computer science fundamentals, revision discipline, mock test analysis.
- Job prep skills: resume writing, interview communication, DSA, projects, system design, workplace communication.
- Life skills: sleep consistency, wake-up routine, timetable execution, money management, emotional regulation, planning, follow-through.
- Tool/framework skills: React, Next.js, SQL, Excel, Git, Notion, Obsidian.

The page should show:

- Current skills.
- Skill rating out of 10.
- Evidence used for the rating.
- Skills needed for selected goals or career paths.
- Missing prerequisites.
- Suggested learning roadmap.
- Current progress.
- Practice plan.
- Review schedule.
- Related goals, tasks, reflections, and career paths.

Skill data can come from:

- User profile and onboarding.
- Goals and career paths.
- Tasks completed.
- Reflections and daily logs.
- Exam prep pages.
- Imported LLM-wiki Markdown.
- Agent analysis of local notes when the user permits it.
- External integrations such as Notion or Obsidian workflows.

Important product boundary:

Character Arc should not primarily become a free-form notes app. Notes can exist in a local LLM-wiki, Obsidian, Notion, or another notes system. Character Arc should provide the strict tools, structured database, progress model, and beautiful view layer that agents and normal users can rely on.

The app may support lightweight structured pages for subjects or skills, but the core value is not raw note-taking. The core value is extracting and maintaining state:

- What the user is trying to do.
- What the user knows.
- What the user lacks.
- What the user is practicing.
- What the user should do next.
- What progress has been made.

Agent/tool use cases:

- `get_skill_graph`
- `assess_skill`
- `update_skill_rating`
- `get_missing_skills`
- `create_skill_roadmap`
- `link_skill_to_goal`
- `link_skill_to_career_path`
- `record_practice_session`
- `create_review_plan`

For highly personal life-management skills, the local LLM-wiki can store private daily logs and reflections. Agents can summarize safe outcomes into the centralized database only when the user allows it.

## Example Demo Scenario

The user is preparing for GATE 2027 and has installed the Exam Prep tool.

Flow:

1. The user imports or selects the GATE syllabus and exam pattern.
2. Character Arc creates the structured subject, chapter, topic, and test blueprint.
3. The user asks ChatGPT or Character Arc AI: "Create a 15-question quiz from Operating Systems based on my weak topics."
4. The agent reads permitted Exam Prep context and calls `create_quiz` with structured questions and answers.
5. The user completes the quiz in Character Arc.
6. Character Arc records accuracy, time, and error types, then updates topic mastery and the Skill Graph.
7. The dashboard shows the changed readiness score, weak areas, and a recommended next action.
8. The agent can now answer "What should I study next?" using evidence from the saved attempt.

Optional second demo beat:

The user opens the Tools catalog, installs Career Compass, and grants it access to selected Skill Graph and Exam Prep outcomes. The tool can then show future paths without exposing private local reflections or unrelated data.

## Initial Tool Concepts

Platform-wide tool endpoints for MCP/API/CLI:

- `get_context`
- `get_goals`
- `create_goal`
- `update_goal`
- `get_tasks`
- `create_task`
- `complete_task`
- `get_today_plan`
- `save_reflection`
- `search_memory`
- `save_memory`
- `get_career_options`
- `rank_career_paths`
- `create_career_roadmap`
- `get_skill_graph`
- `assess_skill`
- `get_missing_skills`
- `create_skill_roadmap`
- `export_wiki`
- `import_wiki`

These platform actions complement the domain-specific Quiz, Flashcard, Mock Test, Career Compass, and Skill Graph actions defined in their respective sections.

## Design Direction

The app should feel calm, practical, and trustworthy.

Avoid a generic AI chatbot interface as the primary product. The first screen should be a useful operating dashboard, not a marketing page and not just a chat box.

Prioritize:

- Dense but readable information.
- Clear status and progress.
- Fast daily planning.
- Privacy controls visible near personal data.
- Beautiful views for structured context.
- A clear "use from your AI app" setup area.

## Product Risks

- The scope can become too large if connectors, local sync, MCP, CLI, API, dashboards, and AI generation are all treated as equally important.
- Calling connectors and Character Arc capabilities both "tools" will confuse users and weaken the architecture. Keep Connectors and Tools as separate product concepts.
- AI-generated assessment content can be incorrect or poorly calibrated. Preserve provenance, validate structure, allow review, and avoid claiming unofficial questions are authentic past questions.
- A universal product can feel generic. Win the hackathon with a specific exam-preparation workflow while showing that the same tool contract expands to other areas of life.
- Normal users may not understand LLM-wiki terminology.
- Power-user infrastructure can overwhelm the emotional pitch.
- Privacy must be handled carefully because the app deals with life context.
- A CLI alone does not make the local-wiki workflow accessible to every normal user. Treat it as the first automated setup path and plan a graphical companion for production.
- Character Arc's personal-wiki profile can accidentally be presented as part of OKF itself. Keep standards conformance and product-specific schemas clearly separated and versioned.

## Current Strategic Recommendation

For the hackathon, position Character Arc as a universal platform but build one deep vertical: competitive-exam preparation.

The winning demonstration is not "we have many AI features." It is:

1. A strict Exam Prep tool knows the user's syllabus, exam pattern, and preparation state.
2. Any authorized AI agent can generate valid content inside that structure.
3. The user completes the generated experience in a polished frontend.
4. Character Arc stores evidence, updates progress and skills, and recommends what comes next.
5. The result remains available across sessions and across AI applications.

Build now:

- Tools catalog and installation model.
- Exam Prep workspace based on the Character Arc domain model.
- Quiz or Mock Test generation, attempt, and analysis as the complete flagship loop.
- Evidence-based progress and Skill Graph outcomes.
- One real or convincingly demonstrated agent integration through MCP/API.
- Visible privacy and provenance controls.
- A downloadable wiki proof, an AI-agent setup prompt, and a small CLI that all produce the same validated local structure and selective-sync preview.

Show as previews or future direction:

- Career Compass.
- General goals, habits, health, finance, and life-management tools.
- Large connector ecosystem.
- Full bidirectional LLM-wiki synchronization.
- User-created and published tools.

Lead with:

"Character Arc gives any AI agent the structured tools and memory to help you make real progress, then shows the outcomes in one place."

Student demo version:

"Your AI can create a study plan or mock test. Character Arc remembers the syllabus, measures the attempt, finds your weak areas, and knows what you should do next."
