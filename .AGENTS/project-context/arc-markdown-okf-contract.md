# Arc Markdown And OKF Contract

This document is the implementation contract for Character Arc records created
by the Goals and Paths tool. It explains which data is canonical in the cloud,
how rich text is stored, and how an Arc becomes a portable local LLM-wiki file.

## Decision

An Arc has a short identity plus structured narrative content:

- `Block.title` is the short Arc name shown in navigation, cards, and search.
- `properties.objective` is the main outcome, stored as Markdown.
- `properties.currentReality` is the starting context, stored as Markdown.
- `properties.why` is optional supporting context, stored as Markdown.
- `properties.targetDate` is a typed date or `null`.
- `properties.constraints` is a strict array of short plain-text limits.
- `Block.body` is a deterministic Markdown projection of those fields.

Do not use a long answer as `Block.title`. Do not store the entire Arc only as
an opaque Markdown or YAML string. The strict fields are needed for validation,
tool actions, analytics, permissions, and focused frontend views.

## Canonical Cloud Mapping

| User concept | Cloud field | Format |
| --- | --- | --- |
| Arc name | `Block.title` | Plain text, 1-120 characters |
| What are you moving toward? | `properties.objective` | `text/markdown`, 1-4000 characters |
| Where are you now? | `properties.currentReality` | `text/markdown`, 1-8000 characters |
| Why does this matter? | `properties.why` | Optional `text/markdown`, up to 4000 characters |
| Target date | `properties.targetDate` | ISO `YYYY-MM-DD` or `null` |
| Constraints | `properties.constraints` | Up to 20 plain-text items, 1-300 characters each |
| Combined document | `Block.body` | Derived Markdown |
| Content marker | `properties.contentFormat` | `text/markdown` |
| Profile marker | `properties.okf` | `{ type, profile, profileVersion }` |

Writes must go through the versioned tool action so `properties`, `Block.body`,
the tool run receipt, and schema version cannot drift apart. Treat the
individual strict fields as canonical cloud state. `Block.body` is a portable
projection and search/read fallback, not a second independently editable copy.

## Stable Markdown Body

The v2 action generates headings in this order:

```markdown
# Objective

<objective Markdown>

# Current Reality

<current reality Markdown>

# Why This Matters

<optional why Markdown>

# Constraints

- <optional constraint>
```

Heading names and order are part of the Character Arc profile. Consumers should
preserve unknown content when possible, but producers must not silently rename
these sections in the same profile version.

## OKF Export

Google Cloud Open Knowledge Format (OKF) v0.1 requires each concept Markdown
file to have parseable YAML frontmatter with a non-empty `type`. Recommended
metadata includes `title`, `description`, `resource`, `tags`, and `timestamp`.
OKF also permits producer-specific fields, which consumers should preserve.

Character Arc exports a cloud Arc as one UTF-8 Markdown concept file:

```markdown
---
type: Character Arc
title: Ship the Character Arc release demo
description: Deliver one complete agent-to-outcome loop.
tags:
  - release
  - product
timestamp: 2026-07-17T10:30:00Z
schema_version: 1
target_date: 2026-07-31
privacy: synced-private
cloud_block_id: 00000000-0000-0000-0000-000000000000
---

# Objective

Ship a polished demo with **real stored outcomes**.

# Current Reality

The tool foundation exists. The flagship loop is incomplete.
```

`schema_version`, `target_date`, `privacy`, and `cloud_block_id` are Character
Arc producer extensions, not fields required by OKF itself. The product must
keep that standards boundary explicit.

Authoritative references:

- [Google Cloud OKF repository](https://github.com/GoogleCloudPlatform/open-knowledge-format)
- [OKF v0.1 specification](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/specification/v0.1/README.md)

## Editor Contract

The reusable editor uses BlockNote with the Character Arc shadcn theme. Forms
show compact field summaries; activating a field opens one centered editor so
the creation canvas remains minimal.

Only Markdown-compatible blocks and styles are enabled:

- paragraphs and headings;
- bullet, numbered, and task lists;
- quotes, code blocks, tables, and dividers;
- links, bold, italic, strikethrough, and inline code.

Media uploads, colors, underlines, and toggle blocks are excluded because they
do not reliably round-trip through the Markdown serializer. BlockNote's
Markdown conversion is intentionally treated as lossy outside this supported
subset.

## Versioning And Compatibility

- Goals and Paths release `2.0.0` owns Arc schema version `2`.
- The handler is `goals-paths.arc.create.v2`.
- Existing v1 blocks remain readable by tolerant projections.
- Active installations are upgraded to the immutable v2 release by running the `lib/tools/sync-registry.ts` seed script; v1 release rows and the v1 logic remain available for history.
- A future body structure or required field needs a new tool release and block
  schema version. Do not mutate the published v2 snapshot.

## Implementation Map

| Location | Responsibility |
| --- | --- |
| `lib/tools/definitions/goals-paths/manifest.ts` | v2 input and block schemas |
| `lib/wiki/okf.ts` | strict YAML frontmatter parse and deterministic serialization |
| `lib/wiki/arc.ts` | Arc body and OKF document projection |
| `components/editor/markdown-field-editor.tsx` | compact field and centered editor dialog |
| `components/editor/markdown-block-editor.tsx` | Markdown-compatible BlockNote configuration |
| `lib/tools/registry.ts` & `lib/tools/sync-registry.ts` | immutable release, install upgrade, and atomic v2 execution logic |

## Sync Boundary

Local-only notes and private daily context do not need to enter the cloud Arc.
An authorized agent may use those local files to propose a cloud update, but
the strict action input remains visible, reviewable, and user-approved. Export
may add sync metadata to YAML; import must preserve unknown YAML keys and must
not broaden privacy or agent access implicitly.
