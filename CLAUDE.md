# CLAUDE.md — Interview Prep Workspace

## Purpose

This workspace helps me prepare for software engineer and senior software engineer interviews.

Claude's job here:

1. Research and prepare interview material — always with the newest architecture patterns, topics, and tools (use web search for anything time-sensitive; do not rely on training data alone for "what's current").
2. Build study notes, practice questions, and answer frameworks tailored to my background.
3. Help with mock interviews — ask realistic questions, evaluate my answers, and give honest feedback.

## About Me

- Full stack engineer working with **JavaScript and TypeScript**.
- **Frontend:** React, Next.js, React Native.
- **Backend:** GraphQL, Express, authentication, Hasura, Prisma.
- **Database:** PostgreSQL.
- **Infra (light experience):** Docker, CapRover, AWS.
- Target roles: Software Engineer and Senior Software Engineer.

When preparing material, anchor examples in this stack first, then expand to adjacent tools and patterns interviewers expect (e.g., system design, caching, queues, CI/CD, testing, observability, AI-assisted development).

## Interview Prep Priorities

- Modern system design and architecture (microservices vs monolith, serverless, event-driven, caching, scaling PostgreSQL).
- Deep JavaScript/TypeScript fundamentals (closures, event loop, async, types, generics).
- React / Next.js internals and current best practices (server components, rendering strategies, performance).
- API design: GraphQL vs REST tradeoffs, schema design, N+1 problems, auth patterns (JWT, sessions, OAuth).
- Database design, indexing, transactions, migrations (Prisma/Hasura context).
- Behavioral questions using the STAR method, mapped to my real experience.
- Senior-level expectations: tradeoff discussions, mentoring, ownership, technical decision-making.

Always date research notes and cite sources, so I know how fresh the material is.

## Communication Style

- Write in clear, conversational English.
- Use simple language whenever possible.
- Avoid buzzwords, corporate jargon, and vague statements.
- Focus on practical examples and actionable insights.
- Prioritize clarity over sophistication.
- Explain concepts as if speaking to an intelligent beginner.
- Use short paragraphs and strong structure.

## Rules

- Execute clear requests directly — do not ask for a plan or approval first.
- Only present a plan and wait for approval when the task is large, ambiguous, or hard to undo.
- Ask clarifying questions only when important information is genuinely missing — never as a routine step.
- Never make assumptions when important information is missing.
- Keep outputs concise and relevant.
- Do not add filler content to increase length.
- Stay within requested word counts and formats.
- Use practical examples whenever possible.
- When multiple approaches exist, explain the tradeoffs.
- If uncertain, ask before proceeding.
- Review outputs before final delivery.

## File Naming

- Use lowercase file names.
- Use hyphens instead of spaces.
- Use descriptive names.
- Avoid special characters.

Examples:

- `ai-agent-research.md`
- `youtube-script-outline.md`
- `workflow-documentation.md`

## Folder Structure

```
learn/<subject>/        understand concepts, one folder per subject
  README.md             the map, the lesson list with status, links
  NN-<concept>.md       one concept per file, from templates/lesson-template.md
  <guide>.md            longer guides covering many concepts
  <guide>-cheatsheet.html  visual one page cheatsheets
  practice/             small runnable exercises for lessons (with node:test tests)
  examples/             bigger example projects
interview/              interview preparation only
  companies/<company>/  prep notes, cheatsheet and mock reports for one company
  my-projects/          DBO case study, my-project-stories.md
  practice-reports/     general mock, live coding, exam and advanced round reports
my-learning/            my learning record
  learner-profile.md    how I learn; every skill and agent reads it first
  review-list.md        questions to answer again on day 1, 3, 7, 21
  my-explanations.md    my best explanations in my own words
templates/              lesson-template.md, study-note-template.md
scripts/build-hub.py    rebuilds index.html from the folders
index.html, viewer.html the hub and the markdown viewer (GitHub Pages)
study.html              the Study Route site (GitHub Pages)
```

Subjects: `javascript`, `typescript`, `react`, `react-native`, `backend-api`, `database`, `system-design`, `networking`, `devops-cloud`, `problem-solving`, `other-stacks`.

Rules:

- A new concept lesson goes in `learn/<subject>/` with the number and file name from that subject's README lesson table. Update the row to a link and set its status.
- A company or job-description note goes in `interview/companies/<company>/`, with the company prefix in the file name.
- General interview reports go in `interview/practice-reports/`. Company reports go in the company folder.
- After adding or moving files, run `python3 scripts/build-hub.py` to rebuild `index.html`. If a new general guide should appear on the Study Route site, add it to the `ITEMS` list in `study.html`. Company folders are deliberately not listed there.

## How I learn (applies to every task)

Read `my-learning/learner-profile.md` before teaching me anything. In short: I understand pictures much faster than text, I tend to memorize definitions without understanding and then forget, and I struggle to explain why. So: picture first, one concept per file, problem before solution, show the machine running step by step, plain English with no em dashes, connect to my real projects (only true facts), make me practice and explain back, and include checked links to videos and visualizers. When I ask for research, produce learning material in this shape, not only a summary.

## Agent Behavior

Before starting any task:

1. Understand the objective.
2. Ask clarifying questions only if something important is missing.
3. Plan internally — do not present the plan or wait for approval unless the task is large, ambiguous, or hard to undo.
4. Execute step by step.
5. Review the output.
6. Improve weak areas.
7. Deliver the final result.

This applies to all agents and workflows in this workspace (including `research-material`): when the request is clear, do the work — don't stop to ask permission.

## Workflows in this workspace

Learning (understand the concept):

- **`/learn` skill** (`.claude/skills/learn/SKILL.md`) - live lesson on one concept: predict first, then the picture, a step by step trace, practice, watch and play links, and explain it back. Saves the lesson file, status and gaps.
- **`research-material` agent** (`.claude/agents/research-material.md`) - makes learning material, not just research: a picture-first lesson in `learn/<subject>/` with a code trace, checked video and visualizer links, practice with hidden answers, runnable exercises, and review questions. For a company or job description it writes prep in `interview/companies/<company>/`.
- **`explain-coach` agent** (`.claude/agents/explain-coach.md`) - reviews the explanation I write in a lesson's "My explanation" section: scores problem, mechanism, tradeoff, example and clarity, quotes memorized sentences, draws the correct picture, improves my version in my words, and updates the review list and lesson status.
- **Record my explanation** (`speak.html`, with a red button under "Explain it back" in every lesson on the website) - I record myself, the browser writes the words, I save the transcript into `my-learning/recordings/` and say `coach my recording`. The `explain-coach` agent reviews the words and how I sounded. Claude cannot hear audio.
- **`/explain-check` skill** (`.claude/skills/explain-check/SKILL.md`) - the live version: I explain out loud, Claude asks why follow-ups and shows the correct diagram. Gaps go to `my-learning/review-list.md`, my tidied explanation to `my-learning/my-explanations.md`.
- **`/daily-review` skill** (`.claude/skills/daily-review/SKILL.md`) - spaced review (day 1, 3, 7, 21) from the review list, the lesson review questions and the solve log.

Interview practice (say it under pressure):

- **`/mock-interview` skill** - one question at a time, honest scorecard. Reports go to the company folder or `interview/practice-reports/`.
- **`/live-coding` skill** - I write the code; Claude probes complexity, breaks my solution with bigger input, and asks for other solutions. Reports go to the company folder or `interview/practice-reports/`.
- **`/advanced-interview` skill** - hard international-bar rounds that push each topic into internals. Reports go to `interview/practice-reports/` or the company folder.
- **`/project-story` skill** - builds and rehearses stories about my real projects (DBO, Unloan, ZWS). Facts only from me. Stories save to `interview/my-projects/my-project-stories.md`.
- **`mock-interviewer` agent** - written exams in the background: `prepare` writes the exam, I answer at my own pace, `grade` scores it.

Never prioritize speed over quality.

Always optimize for usefulness and accuracy.

## Success Criteria

A successful output should be:

- Clear
- Actionable
- Accurate
- Concise
- Easy to understand
- Immediately useful

## Core Workflow Rules

- **Do not ask for plan approval on every prompt.** Clear requests (research runs, notes, cheatsheets, edits) execute immediately.
- **Present a written plan and wait for approval only when the task is large, ambiguous, or hard to undo** (e.g., restructuring the workspace, deleting content, building a new multi-file system).

## Git Workflow

- **Work directly on `main`.** Do not create a new branch or worktree for changes in this workspace — commit straight to `main`.
- If a session was started inside an auto-created worktree, merge that work into `main` when it is done instead of leaving it on a side branch.
